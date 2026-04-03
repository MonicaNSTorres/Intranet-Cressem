import { Request, Response } from "express";
import archiver from "archiver";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function nomeSeguro(nome: string) {
    return String(nome || "arquivo")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.\-]/g, "_");
}

function removerExtensaoPdf(nome: string) {
    return nome.replace(/\.pdf$/i, "");
}

function isPdf(file: Express.Multer.File) {
    const mime = String(file.mimetype || "").toLowerCase().trim();
    return mime === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
}

async function criarPdfaDefTemporario(
    dir: string,
    iccProfilePath: string
): Promise<string> {
    const iccPathPs = iccProfilePath.replace(/\\/g, "/");

    const conteudo = `%!
% Arquivo temporário gerado pela API para conversão PDF/A

[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA}
<<
  /N 3
>> /PUT pdfmark
[{icc_PDFA} (${iccPathPs}) /PUTFILE pdfmark

[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA}
<<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {icc_PDFA}
  /OutputConditionIdentifier (sRGB)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[{Catalog} << /OutputIntents [ {OutputIntent_PDFA} ] >> /PUT pdfmark
`;

    const arquivoPath = path.join(dir, "PDFA_def_temp.ps");
    await fsp.writeFile(arquivoPath, conteudo, "utf8");
    return arquivoPath;
}

async function getGhostscriptExecutable(): Promise<string> {
    const candidatos = [
        process.env.GHOSTSCRIPT_PATH,
        "gswin64c",
        "gswin32c",
        "gs",
    ].filter(Boolean) as string[];

    for (const candidato of candidatos) {
        try {
            await execFileAsync(candidato, ["-version"]);
            return candidato;
        } catch {
        }
    }

    throw new Error(
        "Ghostscript não encontrado. Instale o Ghostscript no servidor e configure a variável GHOSTSCRIPT_PATH se necessário."
    );
}

async function criarDiretorioTemporario(prefixo: string) {
    return await fsp.mkdtemp(path.join(os.tmpdir(), prefixo));
}

async function limparDiretorio(dir: string) {
    try {
        await fsp.rm(dir, { recursive: true, force: true });
    } catch {
    }
}

async function converterPdfParaPngs(
    gsExec: string,
    inputPdfPath: string,
    outputPattern: string
) {
    await execFileAsync(gsExec, [
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=png16m",
        "-r200",
        `-sOutputFile=${outputPattern}`,
        inputPdfPath,
    ]);
}

async function converterPdfParaPdfA(
    gsExec: string,
    inputPdfPath: string,
    outputPdfPath: string,
    tempDir: string
) {
    const iccProfile = process.env.GS_ICC_PROFILE;

    if (!iccProfile) {
        throw new Error(
            "Variável GS_ICC_PROFILE não configurada. Informe o caminho completo de um perfil ICC, por exemplo sRGB.icc."
        );
    }

    if (!fs.existsSync(iccProfile)) {
        throw new Error(`Perfil ICC não encontrado em: ${iccProfile}`);
    }

    const pdfaDefPath = await criarPdfaDefTemporario(tempDir, iccProfile);

    await execFileAsync(gsExec, [
        "-dPDFA=2",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=pdfwrite",
        "-sColorConversionStrategy=RGB",
        "-dPDFACompatibilityPolicy=1",
        `-sOutputFile=${outputPdfPath}`,
        pdfaDefPath,
        inputPdfPath,
    ]);
}

export const conversorArquivosController = {
    async converter(req: Request, res: Response) {
        let tempRootDir = "";

        try {
            const files = req.files as Express.Multer.File[];
            const { de, para } = req.body;

            if (!files || files.length === 0) {
                return res.status(400).json({
                    error: "Nenhum arquivo enviado.",
                });
            }

            if (!de || !para) {
                return res.status(400).json({
                    error: "Formato de conversão não informado.",
                });
            }

            if (String(de).toLowerCase() !== "pdf") {
                return res.status(400).json({
                    error: "No momento, o formato de origem suportado é apenas PDF.",
                });
            }

            if (!["pdfa", "png"].includes(String(para).toLowerCase())) {
                return res.status(400).json({
                    error: "Formato de destino inválido. Use 'pdfa' ou 'png'.",
                });
            }

            for (const file of files) {
                if (!isPdf(file)) {
                    return res.status(400).json({
                        error: `Arquivo inválido: ${file.originalname}. Envie apenas PDFs.`,
                    });
                }
            }

            const gsExec = await getGhostscriptExecutable();

            tempRootDir = await criarDiretorioTemporario("conversor-arquivos-");

            const inputDir = path.join(tempRootDir, "input");
            const outputDir = path.join(tempRootDir, "output");

            await fsp.mkdir(inputDir, { recursive: true });
            await fsp.mkdir(outputDir, { recursive: true });

            const arquivosGerados: Array<{ absPath: string; zipName: string }> = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const nomeOriginalSeguro = nomeSeguro(file.originalname);
                const nomeBase = removerExtensaoPdf(nomeOriginalSeguro);

                const inputPdfPath = path.join(inputDir, `${i + 1}_${nomeOriginalSeguro}`);
                await fsp.writeFile(inputPdfPath, file.buffer);

                if (String(para).toLowerCase() === "pdfa") {
                    const outputPdfPath = path.join(outputDir, `${nomeBase}_pdfa.pdf`);

                    await converterPdfParaPdfA(
                        gsExec,
                        inputPdfPath,
                        outputPdfPath,
                        tempRootDir
                    );

                    arquivosGerados.push({
                        absPath: outputPdfPath,
                        zipName: `${nomeBase}_pdfa.pdf`,
                    });
                }

                if (String(para).toLowerCase() === "png") {
                    const pattern = path.join(outputDir, `${nomeBase}_pagina_%03d.png`);

                    await converterPdfParaPngs(gsExec, inputPdfPath, pattern);

                    const saidas = await fsp.readdir(outputDir);
                    const paginasGeradas = saidas
                        .filter(
                            (nome) =>
                                nome.startsWith(`${nomeBase}_pagina_`) &&
                                nome.endsWith(".png")
                        )
                        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                    if (!paginasGeradas.length) {
                        throw new Error(
                            `Nenhuma imagem PNG foi gerada para o arquivo ${file.originalname}.`
                        );
                    }

                    for (const nomeArquivo of paginasGeradas) {
                        arquivosGerados.push({
                            absPath: path.join(outputDir, nomeArquivo),
                            zipName: nomeArquivo,
                        });
                    }
                }
            }

            if (!arquivosGerados.length) {
                return res.status(500).json({
                    error: "Nenhum arquivo convertido foi gerado.",
                });
            }

            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="arquivos_convertidos.zip"'
            );

            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.on("error", (err) => {
                throw err;
            });

            archive.pipe(res);

            for (const item of arquivosGerados) {
                archive.file(item.absPath, { name: item.zipName });
            }

            await archive.finalize();
        } catch (err: any) {
            console.error("Erro conversor arquivos:", err);

            if (!res.headersSent) {
                return res.status(500).json({
                    error: "Erro ao converter arquivos.",
                    details: String(err?.message || err),
                });
            }
        } finally {
            if (tempRootDir) {
                setTimeout(() => {
                    limparDiretorio(tempRootDir);
                }, 5000);
            }
        }
    },
};