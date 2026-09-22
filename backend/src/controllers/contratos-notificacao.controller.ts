import { Request, Response } from "express";
import { notificarContratosPorVencimento } from "../services/contratos_notificacao.service";

export const contratosNotificacaoController = {
  async executar(req: Request, res: Response) {
    try {
      const result = await notificarContratosPorVencimento();

      return res.json({
        success: true,
        message: "Notificação de contratos executada.",
        result,
      });
    } catch (err: any) {
      console.error("Erro ao executar notificação de contratos:", err);

      return res.status(500).json({
        success: false,
        error: "Falha ao executar notificação de contratos.",
        details: String(err?.message || err),
      });
    }
  },
};