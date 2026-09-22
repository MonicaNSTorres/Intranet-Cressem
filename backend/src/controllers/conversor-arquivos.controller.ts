import { Request, Response } from "express";
import archiver from "archiver";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument } from "pdf-lib";
import { pathToFileURL } from "url";

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

function removerExtensao(nome: string) {
    return nome.replace(/\.[^.]+$/i, "");
}

function isPdf(file: Express.Multer.File) {
    const mime = String(file.mimetype || "").toLowerCase().trim();
    return mime === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
}

function isDocx(file: Express.Multer.File) {
    const mime = String(file.mimetype || "").toLowerCase().trim();
    return (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        /\.docx$/i.test(file.originalname || "")
    );
}

function isImagemParaPdf(file: Express.Multer.File) {
    const mime = String(file.mimetype || "").toLowerCase().trim();
    return (
        mime === "image/png" ||
        mime === "image/jpeg" ||
        /\.(png|jpe?g)$/i.test(file.originalname || "")
    );
}

function isImagem(file: Express.Multer.File) {
    return isImagemParaPdf(file);
}

function getPngDimensions(buffer: Buffer) {
    const assinaturaPng = "89504e470d0a1a0a";
    if (buffer.subarray(0, 8).toString("hex") !== assinaturaPng) {
        return { width: 1200, height: 1600 };
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
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

async function getLibreOfficeExecutable(): Promise<string> {
    const candidatos = [
        process.env.LIBREOFFICE_PATH,
        "soffice.com",
        "soffice",
        "libreoffice",
        "C:/Program Files/LibreOffice/program/soffice.com",
        "C:/Program Files/LibreOffice/program/soffice.exe",
        "C:/Program Files (x86)/LibreOffice/program/soffice.com",
        "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
    ].filter(Boolean) as string[];

    for (const candidato of candidatos) {
        try {
            await execFileAsync(candidato, ["--version"], { windowsHide: true });
            return candidato;
        } catch {
        }
    }

    throw new Error(
        "LibreOffice não encontrado. Instale o LibreOffice no servidor ou configure a variável LIBREOFFICE_PATH apontando para o soffice.exe."
    );
}

async function getImageMagickExecutable(): Promise<string> {
    const candidatos = [
        process.env.IMAGEMAGICK_PATH,
        "magick",
    ].filter(Boolean) as string[];

    for (const candidato of candidatos) {
        try {
            await execFileAsync(candidato, ["-version"]);
            return candidato;
        } catch {
        }
    }

    throw new Error(
        "ImageMagick não encontrado. Instale o ImageMagick no servidor ou configure a variável IMAGEMAGICK_PATH apontando para o magick.exe."
    );
}

async function converterPdfParaJpgs(
    gsExec: string,
    inputPdfPath: string,
    outputPattern: string
) {
    await execFileAsync(gsExec, [
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=jpeg",
        "-dJPEGQ=92",
        "-r200",
        `-sOutputFile=${outputPattern}`,
        inputPdfPath,
    ]);
}

async function converterPdfParaTxt(
    gsExec: string,
    inputPdfPath: string,
    outputTxtPath: string
) {
    await execFileAsync(gsExec, [
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=txtwrite",
        `-sOutputFile=${outputTxtPath}`,
        inputPdfPath,
    ]);
}

async function converterPdfParaDocxPorTexto(
    gsExec: string,
    inputPdfPath: string,
    outputDocxPath: string,
    tempDir: string
) {
    const outputTxtPath = path.join(
        tempDir,
        `${removerExtensaoPdf(path.basename(inputPdfPath))}_extraido.txt`
    );

    await converterPdfParaTxt(gsExec, inputPdfPath, outputTxtPath);

    const conteudo = await fsp.readFile(outputTxtPath, "utf8");
    const linhas = conteudo
        .replace(/\f/g, "\n")
        .split(/\r?\n/)
        .map((linha) => linha.trimEnd());

    const linhasComConteudo = linhas.some((linha) => linha.trim().length > 0)
        ? linhas
        : [
            "Não foi possível extrair texto deste PDF.",
            "Se o arquivo for uma imagem digitalizada, será necessário OCR para transformar em texto editável.",
        ];

    const doc = new Document({
        sections: [
            {
                children: linhasComConteudo.map(
                    (linha) =>
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: linha || " ",
                                }),
                            ],
                        })
                ),
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    await fsp.writeFile(outputDocxPath, buffer);

    return outputDocxPath;
}

async function converterPdfParaSvgs(
    gsExec: string,
    inputPdfPath: string,
    outputPattern: string
) {
    try {
        await execFileAsync(gsExec, [
            "-dSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=svg",
            `-sOutputFile=${outputPattern}`,
            inputPdfPath,
        ]);
    } catch {
        const outputDir = path.dirname(outputPattern);
        const pngPattern = outputPattern.replace(/\.svg$/i, ".png");
        const nomePrefixo = path.basename(pngPattern).split("%03d")[0];

        await converterPdfParaPngs(gsExec, inputPdfPath, pngPattern);

        const saidas = await fsp.readdir(outputDir);
        const paginasPng = saidas
            .filter((nome) => nome.startsWith(nomePrefixo) && nome.endsWith(".png"))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        if (!paginasPng.length) {
            throw new Error("Ghostscript não conseguiu gerar SVG nem PNG de fallback para este PDF.");
        }

        for (const nomePng of paginasPng) {
            const pngPath = path.join(outputDir, nomePng);
            const pngBuffer = await fsp.readFile(pngPath);
            const { width, height } = getPngDimensions(pngBuffer);
            const base64 = pngBuffer.toString("base64");
            const svgPath = path.join(outputDir, nomePng.replace(/\.png$/i, ".svg"));
            const svgConteudo = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${base64}" width="${width}" height="${height}" />
</svg>`;

            await fsp.writeFile(svgPath, svgConteudo, "utf8");
        }
    }
}

function adicionarCandidatoIcc(candidatos: string[], caminho?: string | null) {
    const valor = String(caminho || "").trim();
    if (valor && !candidatos.includes(valor)) {
        candidatos.push(valor);
    }
}

function listarPerfisIccEmDiretorio(dir: string, profundidade = 2): string[] {
    if (!dir || profundidade < 0 || !fs.existsSync(dir)) {
        return [];
    }

    try {
        const stat = fs.statSync(dir);
        if (stat.isFile()) {
            return /\.icc$/i.test(dir) ? [dir] : [];
        }

        if (!stat.isDirectory()) {
            return [];
        }

        const encontrados: string[] = [];
        const entradas = fs.readdirSync(dir, { withFileTypes: true });

        for (const entrada of entradas) {
            const caminhoEntrada = path.join(dir, entrada.name);
            if (entrada.isFile() && /\.icc$/i.test(entrada.name)) {
                encontrados.push(caminhoEntrada);
                continue;
            }

            if (entrada.isDirectory()) {
                encontrados.push(...listarPerfisIccEmDiretorio(caminhoEntrada, profundidade - 1));
            }
        }

        const prioridade = ["default_rgb.icc", "srgb.icc", "sRGB.icc"].map((nome) => nome.toLowerCase());
        return encontrados.sort((a, b) => {
            const prioridadeA = prioridade.indexOf(path.basename(a).toLowerCase());
            const prioridadeB = prioridade.indexOf(path.basename(b).toLowerCase());
            const ordemA = prioridadeA === -1 ? 999 : prioridadeA;
            const ordemB = prioridadeB === -1 ? 999 : prioridadeB;
            return ordemA - ordemB || a.localeCompare(b);
        });
    } catch {
        return [];
    }
}

function resolverPerfilIccGhostscript(gsExec: string): { perfil?: string; tentativas: string[] } {
    const candidatos: string[] = [];
    const iccEnv = process.env.GS_ICC_PROFILE;
    const gsLibDir = process.env.GS_LIB_DIR;

    adicionarCandidatoIcc(candidatos, iccEnv);

    if (gsLibDir) {
        adicionarCandidatoIcc(candidatos, path.resolve(gsLibDir, "../iccprofiles/default_rgb.icc"));
        adicionarCandidatoIcc(candidatos, path.resolve(gsLibDir, "../iccprofiles/srgb.icc"));
    }

    if (path.isAbsolute(gsExec)) {
        const gsBinDir = path.dirname(gsExec);
        adicionarCandidatoIcc(candidatos, path.resolve(gsBinDir, "../iccprofiles/default_rgb.icc"));
        adicionarCandidatoIcc(candidatos, path.resolve(gsBinDir, "../iccprofiles/srgb.icc"));
    }

    [
        "C:/Program Files/gs/gs10.07.0/iccprofiles/default_rgb.icc",
        "C:/Program Files/gs/gs10.07.0/iccprofiles/srgb.icc",
        "C:/Program Files (x86)/gs/gs10.07.0/iccprofiles/default_rgb.icc",
        "C:/Program Files (x86)/gs/gs10.07.0/iccprofiles/srgb.icc",
        "/usr/share/color/icc/ghostscript/default_rgb.icc",
        "/usr/share/color/icc/ghostscript/srgb.icc",
        "/usr/share/ghostscript/iccprofiles/default_rgb.icc",
        "/usr/share/ghostscript/iccprofiles/srgb.icc",
        "/usr/local/share/ghostscript/iccprofiles/default_rgb.icc",
        "/usr/local/share/ghostscript/iccprofiles/srgb.icc",
        "/usr/share/color/icc/sRGB.icc",
        "/usr/share/color/icc/colord/sRGB.icc",
        "/usr/local/share/color/icc/sRGB.icc",
    ].forEach((caminho) => adicionarCandidatoIcc(candidatos, caminho));

    [
        "/usr/share/color/icc/ghostscript",
        "/usr/share/ghostscript",
        "/usr/local/share/ghostscript",
    ].forEach((dir) => {
        listarPerfisIccEmDiretorio(dir, 3).forEach((perfil) => adicionarCandidatoIcc(candidatos, perfil));
    });

    return {
        perfil: candidatos.find((iccPath) => fs.existsSync(iccPath)),
        tentativas: candidatos,
    };
}

async function converterPdfParaPdfA(
    gsExec: string,
    inputPdfPath: string,
    outputPdfPath: string,
    tempDir: string
) {
    const { perfil: iccProfile, tentativas } = resolverPerfilIccGhostscript(gsExec);

    if (!iccProfile) {
        const tentativasResumo = tentativas.slice(0, 12).join("; ");
        throw new Error(
            `Perfil ICC não encontrado para gerar PDF/A. Configure GS_ICC_PROFILE para um arquivo válido ou instale os perfis ICC do Ghostscript. Caminhos testados: ${tentativasResumo}`
        );
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

async function converterComLibreOffice(
    libreOfficeExec: string,
    inputPath: string,
    outputDir: string,
    formatoDestino: "pdf"
) {
    const profileDir = path.join(path.dirname(outputDir), "libreoffice-profile");
    await fsp.mkdir(profileDir, { recursive: true });

    await execFileAsync(libreOfficeExec, [
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        "--headless",
        "--invisible",
        "--nologo",
        "--nodefault",
        "--nofirststartwizard",
        "--norestore",
        "--nolockcheck",
        "--convert-to",
        formatoDestino,
        "--outdir",
        outputDir,
        inputPath,
    ], {
        windowsHide: true,
        env: {
            ...process.env,
            SAL_USE_VCLPLUGIN: process.env.SAL_USE_VCLPLUGIN || "gen",
        },
    });

    const nomeSaida = `${removerExtensao(path.basename(inputPath))}.${formatoDestino}`;
    const outputPath = path.join(outputDir, nomeSaida);

    if (!fs.existsSync(outputPath)) {
        throw new Error(
            `LibreOffice não gerou o arquivo ${nomeSaida}. Verifique se o formato de conversão é suportado no servidor.`
        );
    }

    return outputPath;
}

async function converterImagem(
    imageMagickExec: string,
    inputPath: string,
    outputPath: string,
    formatoDestino: "png" | "jpg" | "jpeg"
) {
    const args =
        formatoDestino === "jpg" || formatoDestino === "jpeg"
            ? [inputPath, "-background", "white", "-alpha", "remove", "-alpha", "off", outputPath]
            : [inputPath, outputPath];

    await execFileAsync(imageMagickExec, args);
}

async function converterImagensParaPdf(
    files: Express.Multer.File[],
    outputPdfPath: string
) {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
        const ext = file.originalname.split(".").pop()?.toLowerCase();
        const mime = String(file.mimetype || "").toLowerCase().trim();

        const imagem =
            mime === "image/png" || ext === "png"
                ? await pdfDoc.embedPng(file.buffer)
                : await pdfDoc.embedJpg(file.buffer);

        const { width, height } = imagem.scale(1);
        const page = pdfDoc.addPage([width, height]);

        page.drawImage(imagem, {
            x: 0,
            y: 0,
            width,
            height,
        });
    }

    const pdfBytes = await pdfDoc.save();
    await fsp.writeFile(outputPdfPath, pdfBytes);
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

            const formatoOrigem = String(de).toLowerCase();
            const formatoDestino = String(para).toLowerCase();

            if (!["pdf", "imagem", "image", "docx"].includes(formatoOrigem)) {
                return res.status(400).json({
                    error: "Formato de origem inválido. Use 'pdf', 'imagem' ou 'docx'.",
                });
            }

            if (formatoOrigem === "pdf" && !["pdfa", "png", "jpg", "jpeg", "txt", "svg", "docx"].includes(formatoDestino)) {
                return res.status(400).json({
                    error: "Formato de destino inválido. Use 'pdfa', 'png', 'jpg', 'txt', 'svg' ou 'docx'.",
                });
            }

            if (["imagem", "image"].includes(formatoOrigem) && !["pdf", "png", "jpg", "jpeg"].includes(formatoDestino)) {
                return res.status(400).json({
                    error: "Para imagens, use destino 'pdf', 'png' ou 'jpg'.",
                });
            }

            if (formatoOrigem === "docx" && formatoDestino !== "pdf") {
                return res.status(400).json({
                    error: "Para DOCX, o formato de destino suportado é PDF.",
                });
            }

            for (const file of files) {
                if (formatoOrigem === "pdf" && !isPdf(file)) {
                    return res.status(400).json({
                        error: `Arquivo inválido: ${file.originalname}. Envie apenas PDFs.`,
                    });
                }

                if (["imagem", "image"].includes(formatoOrigem) && !isImagem(file)) {
                    return res.status(400).json({
                        error: `Arquivo inválido: ${file.originalname}. Envie apenas imagens PNG ou JPG.`,
                    });
                }

                if (formatoOrigem === "docx" && !isDocx(file)) {
                    return res.status(400).json({
                        error: `Arquivo inválido: ${file.originalname}. Envie apenas arquivos DOCX.`,
                    });
                }
            }

            const precisaGhostscript =
                formatoOrigem === "pdf" &&
                ["pdfa", "png", "jpg", "jpeg", "txt", "svg", "docx"].includes(formatoDestino);
            const precisaLibreOffice =
                formatoOrigem === "docx" && formatoDestino === "pdf";
            const precisaImageMagick =
                ["imagem", "image"].includes(formatoOrigem) &&
                ["png", "jpg", "jpeg"].includes(formatoDestino);

            const gsExec = precisaGhostscript ? await getGhostscriptExecutable() : "";
            const libreOfficeExec = precisaLibreOffice ? await getLibreOfficeExecutable() : "";
            const imageMagickExec = precisaImageMagick ? await getImageMagickExecutable() : "";

            tempRootDir = await criarDiretorioTemporario("conversor-arquivos-");

            const inputDir = path.join(tempRootDir, "input");
            const outputDir = path.join(tempRootDir, "output");

            await fsp.mkdir(inputDir, { recursive: true });
            await fsp.mkdir(outputDir, { recursive: true });

            const arquivosGerados: Array<{ absPath: string; zipName: string }> = [];

            if (["imagem", "image"].includes(formatoOrigem) && formatoDestino === "pdf") {
                const outputPdfPath = path.join(outputDir, "imagens_convertidas.pdf");

                await converterImagensParaPdf(files, outputPdfPath);

                arquivosGerados.push({
                    absPath: outputPdfPath,
                    zipName: "imagens_convertidas.pdf",
                });
            }

            if (["imagem", "image"].includes(formatoOrigem) && ["png", "jpg", "jpeg"].includes(formatoDestino)) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const nomeOriginalSeguro = nomeSeguro(file.originalname);
                    const nomeBase = removerExtensao(nomeOriginalSeguro);
                    const extensaoDestino = formatoDestino === "jpeg" ? "jpg" : formatoDestino;
                    const inputImagePath = path.join(inputDir, `${i + 1}_${nomeOriginalSeguro}`);
                    const outputImagePath = path.join(outputDir, `${nomeBase}.${extensaoDestino}`);

                    await fsp.writeFile(inputImagePath, file.buffer);
                    await converterImagem(
                        imageMagickExec,
                        inputImagePath,
                        outputImagePath,
                        extensaoDestino as "png" | "jpg"
                    );

                    arquivosGerados.push({
                        absPath: outputImagePath,
                        zipName: `${nomeBase}.${extensaoDestino}`,
                    });
                }
            }

            if (formatoOrigem === "docx" && formatoDestino === "pdf") {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const nomeOriginalSeguro = nomeSeguro(file.originalname);
                    const inputDocxPath = path.join(inputDir, `${i + 1}_${nomeOriginalSeguro}`);

                    await fsp.writeFile(inputDocxPath, file.buffer);

                    const outputPdfPath = await converterComLibreOffice(
                        libreOfficeExec,
                        inputDocxPath,
                        outputDir,
                        "pdf"
                    );

                    arquivosGerados.push({
                        absPath: outputPdfPath,
                        zipName: `${removerExtensao(nomeOriginalSeguro)}.pdf`,
                    });
                }
            }

            for (let i = 0; i < files.length; i++) {
                if (formatoOrigem !== "pdf") {
                    continue;
                }

                const file = files[i];
                const nomeOriginalSeguro = nomeSeguro(file.originalname);
                const nomeBase = removerExtensaoPdf(nomeOriginalSeguro);

                const inputPdfPath = path.join(inputDir, `${i + 1}_${nomeOriginalSeguro}`);
                await fsp.writeFile(inputPdfPath, file.buffer);

                if (formatoDestino === "docx") {
                    const outputDocxPath = path.join(outputDir, `${nomeBase}.docx`);

                    await converterPdfParaDocxPorTexto(
                        gsExec,
                        inputPdfPath,
                        outputDocxPath,
                        tempRootDir
                    );

                    arquivosGerados.push({
                        absPath: outputDocxPath,
                        zipName: `${nomeBase}.docx`,
                    });
                }

                if (formatoDestino === "pdfa") {
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

                if (formatoDestino === "png") {
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

                if (["jpg", "jpeg"].includes(formatoDestino)) {
                    const pattern = path.join(outputDir, `${nomeBase}_pagina_%03d.jpg`);

                    await converterPdfParaJpgs(gsExec, inputPdfPath, pattern);

                    const saidas = await fsp.readdir(outputDir);
                    const paginasGeradas = saidas
                        .filter(
                            (nome) =>
                                nome.startsWith(`${nomeBase}_pagina_`) &&
                                nome.endsWith(".jpg")
                        )
                        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                    if (!paginasGeradas.length) {
                        throw new Error(
                            `Nenhuma imagem JPG foi gerada para o arquivo ${file.originalname}.`
                        );
                    }

                    for (const nomeArquivo of paginasGeradas) {
                        arquivosGerados.push({
                            absPath: path.join(outputDir, nomeArquivo),
                            zipName: nomeArquivo,
                        });
                    }
                }

                if (formatoDestino === "txt") {
                    const outputTxtPath = path.join(outputDir, `${nomeBase}.txt`);

                    await converterPdfParaTxt(gsExec, inputPdfPath, outputTxtPath);

                    arquivosGerados.push({
                        absPath: outputTxtPath,
                        zipName: `${nomeBase}.txt`,
                    });
                }

                if (formatoDestino === "svg") {
                    const pattern = path.join(outputDir, `${nomeBase}_pagina_%03d.svg`);

                    await converterPdfParaSvgs(gsExec, inputPdfPath, pattern);

                    const saidas = await fsp.readdir(outputDir);
                    const paginasGeradas = saidas
                        .filter(
                            (nome) =>
                                nome.startsWith(`${nomeBase}_pagina_`) &&
                                nome.endsWith(".svg")
                        )
                        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                    if (!paginasGeradas.length) {
                        throw new Error(
                            `Nenhum SVG foi gerado para o arquivo ${file.originalname}.`
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
