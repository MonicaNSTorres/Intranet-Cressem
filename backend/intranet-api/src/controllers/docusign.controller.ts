import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

const PDF_OUTPUT_BASE_DIR = process.env.PDF_STORAGE_PATH
  ? path.resolve(process.env.PDF_STORAGE_PATH)
  : "C:\\inetpub\\wwwroot\\docusign\\docusign_exported_pdfs\\pdfs";

type EnvelopeRow = {
  ENVELOPE_ID: string;
  ANO: string;
  MES: string;
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
          SELECT
            ENVELOPE_ID,
            TO_CHAR(CREATED_AT, 'YYYY') AS ANO,
            TO_CHAR(CREATED_AT, 'MM') AS MES
          FROM DBACRESSEM.DOCUSIGN_ENVELOPES_RESOLVIDO
          WHERE ENVELOPE_ID = :envelopeId
        `,
        { envelopeId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (result.rows || []) as EnvelopeRow[];

      if (!rows.length) {
        return res.status(404).json({
          error: "Envelope não encontrado no banco.",
        });
      }

      const row = rows[0];

      if (!row?.ENVELOPE_ID || !row?.ANO || !row?.MES) {
        return res.status(404).json({
          error: "Dados insuficientes para localizar o PDF.",
          row,
        });
      }

      const pdfPath = path.join(
        PDF_OUTPUT_BASE_DIR,
        row.ANO,
        row.MES,
        `${row.ENVELOPE_ID}.pdf`
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
          ? `inline; filename="${row.ENVELOPE_ID}.pdf"`
          : `attachment; filename="${row.ENVELOPE_ID}.pdf"`
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