import { Request, Response } from "express";
import { aplicarMarcaDaguaPdf } from "../services/marca_dagua.service";

function nomeArquivoSeguro(nome: string) {
  return String(nome || "arquivo.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]/g, "_");
}

export const marcaDaguaController = {
  async aplicarMarcaDagua(req: Request, res: Response) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "Arquivo PDF não enviado.",
        });
      }

      const originalName = String(file.originalname || "").trim();
      const mimeType = String(file.mimetype || "").trim().toLowerCase();
      const fileSize = Number(file.size || 0);

      if (!originalName) {
        return res.status(400).json({
          error: "Nome do arquivo não identificado.",
        });
      }

      if (mimeType !== "application/pdf") {
        return res.status(400).json({
          error: "Selecione apenas arquivos PDF.",
        });
      }

      if (!file.buffer || fileSize <= 1024) {
        return res.status(400).json({
          error: "Selecione um PDF válido (maior que 1 KB).",
        });
      }

      const pdfProcessado = await aplicarMarcaDaguaPdf(file.buffer);

      const nomeBase = nomeArquivoSeguro(originalName).replace(/\.pdf$/i, "");
      const nomeFinal = `${nomeBase}_marca_dagua.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nomeFinal}"`
      );

      return res.status(200).send(Buffer.from(pdfProcessado));
    } catch (err: any) {
      console.error("Erro ao aplicar marca d'água no PDF:", err);
      return res.status(500).json({
        error: "Erro ao aplicar marca d'água no PDF.",
        details: String(err?.message || err),
      });
    }
  },
};