import { Request, Response } from "express";

import {
  enviarEmailRhDiretoria,
  enviarEmailGerencias,
  enviarEmailTiFerias,
  executarNotificacoesPreviaDia17,
  executarTodasNotificacoesFerias,
} from "../services/ferias_notificacao.service";

export const feriasNotificacaoController = {
  async executarTodas(_req: Request, res: Response) {
    try {
      const result = await executarTodasNotificacoesFerias();

      return res.json({
        success: true,
        message: "Todas as notificações de férias foram executadas.",
        result,
      });
    } catch (err: any) {
      console.error("Erro ao executar notificações de férias:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar notificações de férias.",
        details: String(err?.message || err),
      });
    }
  },

  async executarRhDiretoria(_req: Request, res: Response) {
    try {
      const result = await enviarEmailRhDiretoria();

      return res.json({
        success: true,
        message: "Notificação de férias para RH/Diretoria executada.",
        result,
      });
    } catch (err: any) {
      console.error("Erro RH/Diretoria férias:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar notificação para RH/Diretoria.",
        details: String(err?.message || err),
      });
    }
  },

  async executarGerencias(_req: Request, res: Response) {
    try {
      const result = await enviarEmailGerencias();

      return res.json({
        success: true,
        message: "Notificação de férias para Gerências executada.",
        result,
      });
    } catch (err: any) {
      console.error("Erro Gerências férias:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar notificação para Gerências.",
        details: String(err?.message || err),
      });
    }
  },

  async executarTi(_req: Request, res: Response) {
    try {
      const result = await enviarEmailTiFerias();

      return res.json({
        success: true,
        message: "Notificação de férias para TI executada.",
        result,
      });
    } catch (err: any) {
      console.error("Erro TI férias:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar notificação para TI.",
        details: String(err?.message || err),
      });
    }
  },

  async executarPreviaDia17(_req: Request, res: Response) {
    try {
      const result = await executarNotificacoesPreviaDia17({
        force: true,
        origem: "manual",
      });

      return res.json({
        success: true,
        message: "Prévia de férias (regra dia 18) executada.",
        result,
      });
    } catch (err: any) {
      console.error("Erro prévia dia 18 férias:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar prévia de férias do dia 18.",
        details: String(err?.message || err),
      });
    }
  },
};
