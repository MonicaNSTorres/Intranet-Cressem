import { Request, Response } from "express";
import { buscarDadosFuncionarioParaAssinatura } from "../services/assinatura-email.service";

export const assinaturaEmailController = {
  async dadosUsuario(req: Request, res: Response) {
    try {
      const authReq = req as any;
      const dadosFuncionario = await buscarDadosFuncionarioParaAssinatura(
        authReq.user?.nome_completo || "",
        authReq.user?.email || ""
      );

      res.set("Cache-Control", "no-store");

      return res.json({
        username: authReq.user?.sub || "",
        nome_completo: authReq.user?.nome_completo || "",
        department: authReq.user?.department || "",
        physicalDeliveryOfficeName:
          authReq.user?.physicalDeliveryOfficeName || "",
        email: authReq.user?.email || "",
        ramal: authReq.user?.ramal || "",
        grupos: authReq.user?.grupos || [],
        funcionario: dadosFuncionario,
        id_funcionario: dadosFuncionario?.ID_FUNCIONARIO || null,
        nm_funcionario: dadosFuncionario?.NM_FUNCIONARIO || "",
        nm_setor: dadosFuncionario?.NM_SETOR || "",
        nm_cargo: dadosFuncionario?.NM_CARGO || "",
        nm_nivel: dadosFuncionario?.NM_NIVEL || "",
        cargo_nivel: dadosFuncionario?.NM_NIVEL || "",
        endereco_setor: dadosFuncionario?.NM_ENDERECO || "",
        ramal_banco: dadosFuncionario?.NR_RAMAL || "",
        celular_banco: dadosFuncionario?.NR_CELULAR || "",
      });
    } catch (error) {
      console.error("Erro ao buscar dados para assinatura de e-mail:", error);
      return res.status(500).json({
        error: "Falha ao carregar dados para assinatura de e-mail.",
      });
    }
  },
};
