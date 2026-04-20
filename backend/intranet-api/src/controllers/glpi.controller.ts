import { Request, Response } from "express";
import { GlpiService } from "../services/glpi.service";

const glpiService = new GlpiService();

export async function glpiHealth(req: Request, res: Response) {
  try {
    const data = await glpiService.health();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao conectar no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}

export async function listarConsumiveisGlpi(req: Request, res: Response) {
  try {
    const busca = String(req.query.busca || "");
    const data = await glpiService.listConsumables(busca);

    return res.status(200).json({
      items: data,
      total: Array.isArray(data) ? data.length : 0,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao listar consumíveis no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}

export async function buscarConsumivelGlpiPorId(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await glpiService.getConsumableById(id as any);

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao buscar consumível no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}