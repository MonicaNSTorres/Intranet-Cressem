import { Request, Response } from "express";
import { competenciaAnterior, gerarEEnviarFolhaOdontologica } from "../services/convenio-odontologico-folha.service";

let testeEnvioEmAndamento = false;

function emailModoTesteAtivo() {
  return ["1", "true", "yes", "sim"].includes(String(process.env.EMAIL_MODO_TESTE || "").trim().toLowerCase());
}

export const convenioOdontologicoFolhaController = {
  async testarEnvio(_req: Request, res: Response) {
    if (!emailModoTesteAtivo()) {
      return res.status(403).json({
        success: false,
        error: "O disparo de teste está disponível somente com EMAIL_MODO_TESTE=true.",
      });
    }

    if (testeEnvioEmAndamento) {
      return res.status(409).json({
        success: false,
        error: "Já existe um teste de envio da folha odontológica em andamento.",
      });
    }

    testeEnvioEmAndamento = true;
    try {
      const resultado = await gerarEEnviarFolhaOdontologica({
        origem: "manual",
        competencia: competenciaAnterior(),
      });
      return res.status(200).json({ success: true, ...resultado });
    } catch (error: any) {
      console.error("Erro no teste de envio da folha odontológica:", error);
      return res.status(422).json({
        success: false,
        error: error?.message || "Não foi possível testar o envio da folha odontológica.",
      });
    } finally {
      testeEnvioEmAndamento = false;
    }
  },
};
