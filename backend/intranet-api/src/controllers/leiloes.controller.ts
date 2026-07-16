import { Request, Response } from "express";
import { leiloesService } from "../services/leiloes.service";
import { ioGlobal } from "../../index";

function getClientIp(req: Request) {
    return (
        String(req.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() ||
        req.socket.remoteAddress ||
        null
    );
}

export const leiloesController = {
    async listar(req: Request, res: Response) {
        try {
            const busca = String(req.query.busca || "");
            const status = String(req.query.status || "");
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);

            const data = await leiloesService.listar({
                busca,
                status,
                page,
                limit,
            });

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar leilões.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const data = await leiloesService.buscarPorId(id);

            if (!data) {
                return res.status(404).json({
                    error: "Leilão não encontrado.",
                });
            }

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async criar(req: Request, res: Response) {
        try {
            const result = await leiloesService.criar(req.body);

            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao cadastrar leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async atualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await leiloesService.atualizar(id, req.body);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao atualizar leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async excluir(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const result = await leiloesService.excluir(id);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao excluir leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async listarLances(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const data = await leiloesService.listarLances(id);

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar lances do leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async darLance(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const authReq = req as any;
            const user = authReq.user || {};

            const result = await leiloesService.darLance({
                ID_LEILAO: id,
                VL_LANCE: req.body.VL_LANCE,
                NM_USUARIO:
                    user.nome_completo ||
                    req.body.NM_USUARIO,
                DS_LOGIN:
                    user.sub ||
                    req.body.DS_LOGIN,
                DS_EMAIL:
                    user.email ||
                    req.body.DS_EMAIL,
                NR_IP: getClientIp(req),
            });

            ioGlobal?.to(`leilao:${id}`).emit("leilao:lance", {
                idLeilao: id,
                lance: result.lance,
            });

            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(400).json({
                error: "Falha ao registrar lance.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarVencedor(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            const data = await leiloesService.buscarVencedor(id);

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar vencedor do leilão.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async listarFinalizados(req: Request, res: Response) {
        try {
            const busca = String(req.query.busca || "");
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);

            const data = await leiloesService.listarFinalizados({
                busca,
                page,
                limit,
            });

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar leilões finalizados.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async dashboard(req: Request, res: Response) {
        try {
            const data = await leiloesService.dashboard();

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao carregar dashboard de leilões.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },
};