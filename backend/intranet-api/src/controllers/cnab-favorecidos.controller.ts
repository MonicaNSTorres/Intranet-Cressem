import { Request, Response } from "express";
import { cnab240FavorecidosService } from "../services/cnab240_favorecidos.service";

export const cnab240FavorecidosController = {
    async listar(req: Request, res: Response) {
        try {
            const busca = String(req.query.busca || "");
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);

            const data = await cnab240FavorecidosService.listar({
                busca,
                page,
                limit,
            });

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar favorecidos CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarPorCpf(req: Request, res: Response) {
        try {
            const cpf = String(req.params.cpf || "");

            const data = await cnab240FavorecidosService.buscarPorCpf(cpf);

            if (!data) {
                return res.status(404).json({
                    error: "Favorecido não encontrado para o CPF informado.",
                });
            }

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar favorecido CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const data = await cnab240FavorecidosService.buscarPorId(id);

            if (!data) {
                return res.status(404).json({
                    error: "Favorecido não encontrado.",
                });
            }

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar favorecido CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const result = await cnab240FavorecidosService.criar(req.body);

            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao cadastrar favorecido CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await cnab240FavorecidosService.atualizar(
                id,
                req.body
            );

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao atualizar favorecido CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async excluir(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await cnab240FavorecidosService.excluir(id);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao excluir favorecido CNAB240.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },
};