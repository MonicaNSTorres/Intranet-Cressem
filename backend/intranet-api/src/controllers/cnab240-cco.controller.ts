import { Request, Response } from "express";
import { cnab240CcoService } from "../services/cnab240_cco.service";

export const cnab240CcoController = {
    async listar(req: Request, res: Response) {
        try {
            const busca = String(req.query.busca || "");
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);

            const data = await cnab240CcoService.listar({
                busca,
                page,
                limit,
            });

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar contas CCO CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const data = await cnab240CcoService.buscarPorId(id);

            if (!data) {
                return res.status(404).json({
                    error: "Conta CCO não encontrada.",
                });
            }

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar conta CCO CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const result = await cnab240CcoService.criar(req.body);

            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao cadastrar conta CCO CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await cnab240CcoService.atualizar(id, req.body);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao atualizar conta CCO CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async excluir(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await cnab240CcoService.excluir(id);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao excluir conta CCO CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async importarEmMassa(req: Request, res: Response) {
        try {
            const linhas = req.body?.linhas;

            const result = await cnab240CcoService.importarEmMassa(linhas);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao importar contas CCO em massa.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },
};