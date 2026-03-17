import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

const PDF_OUTPUT_BASE_DIR = process.env.PDF_STORAGE_PATH
  ? path.resolve(process.env.PDF_STORAGE_PATH)
  : path.join(process.cwd(), "docusign_exported_pdfs");

type EnvelopeRow = {
  CREATED_AT: Date | string;
};

export const docusignController = {
  async downloadFromDb(req: Request, res: Response) {
    try {
      const envelopeId = String(req.query.envelopeId || "").trim();
      const inline = String(req.query.inline || "false") === "true";

      if (!envelopeId) {
        return res.status(400).json({
          error: "envelopeId é obrigatório",
        });
      }

      const result = await oracleExecute(
        `
          SELECT CREATED_AT
          FROM DBACRESSEM.DOCUSIGN_ENVELOPES_RESOLVIDO
          WHERE ENVELOPE_ID = :envelopeId
        `,
        { envelopeId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (result.rows || []) as EnvelopeRow[];

      if (!rows.length || !rows[0]?.CREATED_AT) {
        return res.status(404).json({
          error: "Envelope não encontrado no banco.",
        });
      }

      const createdAtRaw = rows[0].CREATED_AT;
      const createdAt =
        createdAtRaw instanceof Date ? createdAtRaw : new Date(createdAtRaw);

      if (Number.isNaN(createdAt.getTime())) {
        return res.status(500).json({
          error: "Data CREATED_AT inválida para o envelope.",
          createdAt: createdAtRaw,
        });
      }

      const year = String(createdAt.getFullYear());
      const month = String(createdAt.getMonth() + 1).padStart(2, "0");

      const pdfPath = path.join(
        PDF_OUTPUT_BASE_DIR,
        year,
        month,
        `${envelopeId}.pdf`
      );

      let pdfBuffer: Buffer;

      try {
        pdfBuffer = await fs.readFile(pdfPath);
      } catch (err: any) {
        console.error("Erro ao ler PDF no disco:", err);

        return res.status(404).json({
          error: "PDF não encontrado no servidor de arquivos.",
          path: pdfPath,
          details: err?.message,
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        inline
          ? `inline; filename="${envelopeId}.pdf"`
          : `attachment; filename="${envelopeId}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length.toString());
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(pdfBuffer);
    } catch (error: any) {
      console.error("Erro ao buscar/enviar PDF:", error);

      return res.status(500).json({
        error: "Erro interno do servidor ao buscar o PDF.",
        details: error?.message,
        oracleErrorCode: error?.errorNum ?? null,
      });
    }
  },
};