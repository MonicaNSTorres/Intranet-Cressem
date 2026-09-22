import { Request, Response } from "express";
import { listarCalendarioFolha, salvarCalendarioFolha } from "../services/convenio-odontologico-calendario.service";

export const convenioOdontologicoCalendarioController = {
  async listar(req: Request, res: Response) {
    try {
      return res.json(await listarCalendarioFolha(String(req.query.competencia || "").trim() || undefined));
    } catch (error: any) {
      return res.status(500).json({ error: "Não foi possível listar o calendário da folha odontológica.", details: error?.message });
    }
  },

  async salvar(req: Request, res: Response) {
    try {
      const resultado = await salvarCalendarioFolha({
        competencia: String(req.body?.competencia || "").trim(),
        idEmpresa: Number(req.body?.idEmpresa),
        dataCorte: String(req.body?.dataCorte || "").trim(),
        dataEnvioAviso: String(req.body?.dataEnvioAviso || "").trim(),
      });
      return res.status(201).json({ success: true, ...resultado });
    } catch (error: any) {
      return res.status(422).json({ error: error?.message || "Não foi possível salvar o calendário." });
    }
  },
};
