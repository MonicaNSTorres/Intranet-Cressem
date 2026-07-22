import { Request, Response } from "express";
import { cnab240Service } from "../services/cnab240.service";

export const cnab240Controller = {
  async listarRemessas(req: Request, res: Response) {
    try {
      const data = await cnab240Service.listarRemessas();

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        error: "Falha ao listar remessas CNAB240.",
        details: error?.message || "Erro desconhecido",
      });
    }
  },

  async buscarFavorecidoPorCpf(req: Request, res: Response) {
    try {
      const cpf =
        String(
          req.params.cpf || ""
        );

      const tipoLayout =
        String(
          req.query.tipoLayout ||
          "SANTANDER"
        )
          .trim()
          .toUpperCase();

      const data =
        await cnab240Service
          .buscarFavorecidoPorCpf(
            cpf,
            tipoLayout
          );

      if (!data) {
        return res.status(404).json({
          error:
            "Favorecido não encontrado para o CPF informado.",
        });
      }

      return res
        .status(200)
        .json(data);
    } catch (error: any) {
      return res.status(500).json({
        error:
          "Falha ao buscar favorecido CNAB240.",
        details:
          error?.message ||
          "Erro desconhecido",
      });
    }
  },

  async gerarCnab240(req: Request, res: Response) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({
          error: "Nenhum arquivo Excel enviado.",
        });
      }

      const tipoLayout = req.body?.tipoLayout || "SANTANDER";

      const result = await cnab240Service.gerarCnab240({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        tipoLayout,
      });

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.nomeArquivo}"`
      );

      return res.status(200).send(result.conteudo);
    } catch (error: any) {
      return res.status(500).json({
        error: "Falha ao gerar CNAB240.",
        details: error?.message || "Erro desconhecido",
      });
    }
  },

  async importarRetorno(req: Request, res: Response) {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({
          error: "Nenhum arquivo enviado.",
        });
      }

      const result = await cnab240Service.importarRetorno({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: "Falha ao importar extrato/retorno CNAB240.",
        details: error?.message || "Erro desconhecido",
      });
    }
  },

  async gerarCnab240PorTransferencias(req: Request, res: Response) {
    try {
      const registros =
        req.body?.registros ??
        req.body?.transferencias;

      const tipoLayout = req.body?.tipoLayout;

      if (
        !Array.isArray(registros) ||
        registros.length === 0
      ) {
        return res.status(400).json({
          error: "Nenhum registro foi enviado.",
        });
      }

      if (!tipoLayout) {
        return res.status(400).json({
          error: "Tipo de layout CNAB240 não informado.",
        });
      }

      const result =
        await cnab240Service.gerarCnab240PorRegistros(
          registros,
          tipoLayout
        );

      res.setHeader(
        "Content-Type",
        "text/plain; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.nomeArquivo}"`
      );

      return res.status(200).send(result.conteudo);
    } catch (error: any) {
      return res.status(500).json({
        error: "Falha ao gerar CNAB240.",
        details:
          error?.message ||
          "Erro desconhecido",
      });
    }
  },

  async listarDetalhesRemessa(req: Request, res: Response) {
    try {
      const idLote = Number(req.params.id);

      const data = await cnab240Service.listarDetalhesRemessa(idLote);

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        error: "Falha ao listar detalhes da remessa CNAB240.",
        details: error?.message || "Erro desconhecido",
      });
    }
  },

  async listarBoletosRemessa(
    req: Request,
    res: Response
  ) {
    try {
      const idLote =
        Number(req.params.id);

      if (!idLote) {
        return res.status(400).json({
          error:
            "ID do lote inválido.",
        });
      }

      const boletos =
        await cnab240Service
          .listarBoletosRemessa(
            idLote
          );

      return res.json(boletos);
    } catch (error: any) {
      console.error(
        "Erro ao listar boletos da remessa:",
        error
      );

      return res.status(500).json({
        error:
          "Falha ao listar boletos da remessa.",
        details: String(
          error?.message || error
        ),
      });
    }
  },
};