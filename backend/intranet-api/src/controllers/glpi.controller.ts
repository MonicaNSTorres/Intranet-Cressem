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

export async function listarEstoqueGlpi(req: Request, res: Response) {
  try {
    const busca = String(req.query.busca || "");
    const data = await glpiService.listComputers(busca);

    return res.status(200).json({
      items: data,
      total: Array.isArray(data) ? data.length : 0,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao listar equipamentos no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}

export async function buscarEquipamentoGlpiPorId(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        error: "ID do equipamento não informado.",
      });
    }

    const data = await glpiService.getComputerById(String(id));

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao buscar equipamento no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}

export async function testarItemtypeGlpi(req: Request, res: Response) {
  try {
    const itemtype = String(req.query.itemtype || "").trim();

    if (!itemtype) {
      return res.status(400).json({
        error: "Informe o itemtype na query string.",
      });
    }

    const data = await glpiService.testItemtype(itemtype);

    return res.status(200).json({
      itemtype,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Falha ao testar itemtype no GLPI.",
      details: error?.response?.data || error?.message || "Erro desconhecido",
    });
  }
}