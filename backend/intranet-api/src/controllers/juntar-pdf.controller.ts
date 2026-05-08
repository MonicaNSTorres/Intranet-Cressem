import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { UploadedFile } from "express-fileupload";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function normalizeFiles(files: any): UploadedFile[] {
    if (!files) return [];

    if (Array.isArray(files)) {
        return files as UploadedFile[];
    }

    if (files.files) {
        if (Array.isArray(files.files)) {
            return files.files as UploadedFile[];
        }
        return [files.files as UploadedFile];
    }

    const firstKey = Object.keys(files)[0];
    const value = files[firstKey];

    if (Array.isArray(value)) {
        return value as UploadedFile[];
    }

    return [value as UploadedFile];
}

async function getGhostscriptExecutable(): Promise<string> {
    const candidates = [
        process.env.GHOSTSCRIPT_PATH,
        "gswin64c",
        "gswin32c",
        "gs",
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
        try {
            await execFileAsync(candidate, ["-version"]);
            return candidate;
        } catch {
        }
    }

    throw new Error("Ghostscript nao encontrado para compressao de PDF.");
}

async function mergeAndCompressWithGhostscript(inputPaths: string[], outputPath: string) {
    const gsExec = await getGhostscriptExecutable();

    const pdfSettings = process.env.GS_PDFSETTINGS || "/ebook";
    const colorDpi = Number(process.env.GS_COLOR_DPI || 150);
    const grayDpi = Number(process.env.GS_GRAY_DPI || 150);
    const monoDpi = Number(process.env.GS_MONO_DPI || 300);

    const args = [
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-dQUIET",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=${pdfSettings}`,
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dAutoRotatePages=/None",
        "-dDownsampleColorImages=true",
        "-dColorImageDownsampleType=/Bicubic",
        `-dColorImageResolution=${colorDpi}`,
        "-dDownsampleGrayImages=true",
        "-dGrayImageDownsampleType=/Bicubic",
        `-dGrayImageResolution=${grayDpi}`,
        "-dDownsampleMonoImages=true",
        "-dMonoImageDownsampleType=/Subsample",
        `-dMonoImageResolution=${monoDpi}`,
        `-sOutputFile=${outputPath}`,
        ...inputPaths,
    ];

    await execFileAsync(gsExec, args, {
        maxBuffer: 10 * 1024 * 1024,
    });
}

async function mergeWithPdfLib(files: UploadedFile[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const buffer = file.tempFilePath
            ? await fs.readFile(file.tempFilePath)
            : Buffer.from(file.data);

        const pdf = await PDFDocument.load(buffer, {
            ignoreEncryption: true,
        });

        const pageIndices = pdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return Buffer.from(
        await mergedPdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
        })
    );
}

export async function juntarPdfController(req: Request, res: Response) {
    const tempWorkDir = await fs.mkdtemp(path.join(os.tmpdir(), "juntar-pdf-"));

    try {
        const files = normalizeFiles(req.files);
        const maxUploadMb = Number(process.env.MAX_PDF_UPLOAD_MB || 50);

        if (!files.length) {
            return res.status(400).json({
                error: "Nenhum arquivo foi enviado.",
            });
        }

        let totalSizeBytes = 0;
        const inputPaths: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = String(file.name || "").toLowerCase();
            const mimeType = String(file.mimetype || "").toLowerCase();
            const isTruncated = Boolean((file as any)?.truncated);
            const size = Number(file.size || file.data?.length || 0);

            if (!fileName.endsWith(".pdf") && mimeType !== "application/pdf") {
                return res.status(400).json({
                    error: `O arquivo "${file.name}" nao e um PDF valido.`,
                });
            }

            if (isTruncated) {
                return res.status(413).json({
                    error: `O arquivo "${file.name}" excede o limite de ${maxUploadMb} MB.`,
                });
            }

            if (size <= 1024) {
                return res.status(400).json({
                    error: `O arquivo "${file.name}" e invalido ou muito pequeno.`,
                });
            }

            totalSizeBytes += size;

            if (file.tempFilePath) {
                inputPaths.push(file.tempFilePath);
                continue;
            }

            const tempPath = path.join(tempWorkDir, `input_${i + 1}.pdf`);
            await fs.writeFile(tempPath, file.data);
            inputPaths.push(tempPath);
        }

        const outputPath = path.join(tempWorkDir, "pdf_junto.pdf");

        try {
            await mergeAndCompressWithGhostscript(inputPaths, outputPath);

            const outputBytes = await fs.readFile(outputPath);

            res.setHeader("X-Compression", "applied_gs");
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'attachment; filename="pdf_junto.pdf"');

            return res.status(200).send(outputBytes);
        } catch (gsError: any) {
            console.warn("Ghostscript indisponivel ou falhou. Fallback pdf-lib:", gsError?.message || gsError);

            const maxFallbackMb = Number(process.env.PDFLIB_FALLBACK_MAX_MB || 40);
            if (totalSizeBytes > maxFallbackMb * 1024 * 1024) {
                return res.status(503).json({
                    error: `Arquivos grandes exigem Ghostscript no servidor. Limite atual sem Ghostscript: ${maxFallbackMb} MB no total.`,
                });
            }

            const mergedBytes = await mergeWithPdfLib(files);

            res.setHeader("X-Compression", "fallback_pdf_lib");
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'attachment; filename="pdf_junto.pdf"');

            return res.status(200).send(mergedBytes);
        }
    } catch (error: any) {
        console.error("Erro ao juntar PDFs:", error);

        return res.status(500).json({
            error: "Falha ao processar os PDFs.",
            details: error?.message || "Erro interno do servidor.",
        });
    } finally {
        try {
            await fs.rm(tempWorkDir, { recursive: true, force: true });
        } catch {
        }
    }
}
