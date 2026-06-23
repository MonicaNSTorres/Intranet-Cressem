import { Request, Response } from "express";
import {
    cnab240AgenciasService,
    CnabAgenciaInput,
} from "../services/cnab240_agencias.service";

export const cnab240AgenciasController = {
    async listar(req: Request, res: Response) {
        try {
            const result = await cnab240AgenciasService.listar({
                busca: String(req.query.busca || ""),
                page: Number(req.query.page || 1),
                limit: Number(req.query.limit || 20),
            });

            return res.json(result);
        } catch (error: any) {
            console.error(error);

            return res.status(500).json({
                error: error.message || "Erro ao listar agências.",
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const agencia = await cnab240AgenciasService.buscarPorId(id);

            if (!agencia) {
                return res.status(404).json({
                    error: "Agência não encontrada.",
                });
            }

            return res.json(agencia);
        } catch (error: any) {
            console.error(error);

            return res.status(500).json({
                error: error.message || "Erro ao buscar agência.",
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const body = req.body as CnabAgenciaInput;

            const result = await cnab240AgenciasService.criar(body);

            return res.status(201).json(result);
        } catch (error: any) {
            console.error(error);

            return res.status(400).json({
                error: error.message || "Erro ao cadastrar agência.",
            });
        }
    },

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const body = req.body as CnabAgenciaInput;

            const result = await cnab240AgenciasService.atualizar(id, body);

            return res.json(result);
        } catch (error: any) {
            console.error(error);

            return res.status(400).json({
                error: error.message || "Erro ao atualizar agência.",
            });
        }
    },

    async excluir(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await cnab240AgenciasService.excluir(id);

            return res.json(result);
        } catch (error: any) {
            console.error(error);

            return res.status(400).json({
                error: error.message || "Erro ao excluir agência.",
            });
        }
    },

    async importarEmMassa(req: Request, res: Response) {
        try {
            const linhas = req.body;

            const result = await cnab240AgenciasService.importarEmMassa(linhas);

            return res.json(result);
        } catch (error: any) {
            console.error(error);

            return res.status(400).json({
                error: error.message || "Erro ao importar agências.",
            });
        }
    },
};