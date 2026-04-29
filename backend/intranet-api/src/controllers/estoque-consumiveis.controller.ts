import { Request, Response } from "express";
import { estoqueConsumiveisService } from "../services/estoque_consumiveis.service";

export const estoqueConsumiveisController = {
    async listarItens(req: Request, res: Response) {
        try {
            const data = await estoqueConsumiveisService.listarItens();
            return res.status(200).json({
                items: data,
                total: data.length,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar itens do estoque.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async criarItem(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.criarItem(req.body);
            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao criar item de estoque.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async listarSolicitacoesGlpi(req: Request, res: Response) {
        try {
            const data = await estoqueConsumiveisService.listarSolicitacoesGlpi();
            return res.status(200).json({
                items: data,
                total: data.length,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar solicitações integradas.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async sincronizarChamadoManual(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.sincronizarSolicitacaoGlpi(req.body);
            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao sincronizar solicitação do GLPI.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async lancarEntrada(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.lancarEntrada(req.body);
            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao lançar entrada.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async darBaixaSolicitacao(req: Request, res: Response) {
        try {
            const idSolicitacao = Number(req.params.idSolicitacao);

            const result = await estoqueConsumiveisService.darBaixaSolicitacao({
                idSolicitacao,
                idItem: Number(req.body.idItem),
                quantidadeAtendida: Number(req.body.quantidadeAtendida),
                observacao: req.body.observacao,
                usuarioAtendimento: String(req.body.usuarioAtendimento || ""),
            });

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao dar baixa na solicitação.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async listarMovimentacoes(req: Request, res: Response) {
        try {
            const data = await estoqueConsumiveisService.listarMovimentacoes();
            return res.status(200).json({
                items: data,
                total: data.length,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar movimentações.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarBalancoMensal(req: Request, res: Response) {
        try {
            const ano = Number(req.query.ano);
            const mes = Number(req.query.mes);

            const data = await estoqueConsumiveisService.buscarBalancoMensal(ano, mes);

            return res.status(200).json({
                items: data,
                total: data.length,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar balanço mensal.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async sincronizarChamadosReaisGlpi(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.sincronizarChamadosReaisGlpi();

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao sincronizar chamados reais do GLPI.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async responderManualGlpi(req: Request, res: Response) {
        try {
            const idSolicitacao = Number(req.params.idSolicitacao);

            const result = await estoqueConsumiveisService.responderManualGlpi({
                idSolicitacao,
                idItem: req.body.idItem ? Number(req.body.idItem) : null,
                quantidadeAtendida: req.body.quantidadeAtendida
                    ? Number(req.body.quantidadeAtendida)
                    : 0,
                resposta: String(req.body.resposta || ""),
                usuarioAtendimento: String(req.body.usuarioAtendimento || ""),
                statusGlpi: Number(req.body.statusGlpi || 2),
            });

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao registrar resposta manual no GLPI.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async importarExcel(req: Request, res: Response) {
        try {
            if (!req.file?.buffer) {
                return res.status(400).json({
                    error: "Nenhum arquivo enviado.",
                });
            }

            const result = await estoqueConsumiveisService.importarProdutosExcel(req.file.buffer);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao importar produtos via Excel.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async verificarEstoqueCritico(req: Request, res: Response) {
        try {
            const itens = await estoqueConsumiveisService.verificarItensAbaixoMinimo();

            return res.json({
                success: true,
                total: itens.length,
                itens
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Erro ao verificar estoque crítico"
            });
        }
    },

    async enviarAlertaWhatsapp(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.enviarAlertaWhatsappEstoqueCritico();
            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao enviar alerta por WhatsApp.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async enviarAlertaEmail(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.enviarAlertaEmailEstoqueCritico();

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao enviar alerta de estoque por e-mail.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async listarAlertasEmail(req: Request, res: Response) {
        try {
            const data = await estoqueConsumiveisService.listarAlertasEmailEstoque();

            return res.status(200).json({
                items: data,
                total: data.length,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao listar alertas de estoque.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async buscarPainelGlpiEstoque(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.buscarPainelGlpiEstoque();

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao buscar painel de chamados GLPI.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },

    async registrarSaidaManualComGlpi(req: Request, res: Response) {
        try {
            const result = await estoqueConsumiveisService.registrarSaidaManualComGlpi({
                idItem: Number(req.body.idItem),
                quantidade: Number(req.body.quantidade),
                nomeSolicitante: String(req.body.nomeSolicitante || ""),
                nomeSetor: req.body.nomeSetor ? String(req.body.nomeSetor) : null,
                observacao: req.body.observacao ? String(req.body.observacao) : null,
                usuarioAtendimento: String(req.body.usuarioAtendimento || ""),
            });

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: "Falha ao registrar saída manual com chamado GLPI.",
                details: error?.message || "Erro desconhecido",
            });
        }
    },
};