import { Request, Response } from "express";
import { PDFDocument } from "pdf-lib";
import { UploadedFile } from "express-fileupload";

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

export async function juntarPdfController(req: Request, res: Response) {
    try {
        const files = normalizeFiles(req.files);

        if (!files.length) {
            return res.status(400).json({
                error: "Nenhum arquivo foi enviado.",
            });
        }

        for (const file of files) {
            const fileName = String(file.name || "").toLowerCase();
            const mimeType = String(file.mimetype || "").toLowerCase();

            if (!fileName.endsWith(".pdf") && mimeType !== "application/pdf") {
                return res.status(400).json({
                    error: `O arquivo "${file.name}" não é um PDF válido.`,
                });
            }

            if (!file.data || file.data.length <= 1024) {
                return res.status(400).json({
                    error: `O arquivo "${file.name}" é inválido ou muito pequeno.`,
                });
            }
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const pdf = await PDFDocument.load(file.data, {
                ignoreEncryption: true,
            });

            const pageIndices = pdf.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        const pdfBytes = await mergedPdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="pdf_junto.pdf"');

        return res.status(200).send(Buffer.from(pdfBytes));
    } catch (error: any) {
        console.error("Erro ao juntar PDFs:", error);

        return res.status(500).json({
            error: "Falha ao processar os PDFs.",
            details: error?.message || "Erro interno do servidor.",
        });
    }
}