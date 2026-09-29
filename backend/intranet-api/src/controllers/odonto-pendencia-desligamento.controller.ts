import { Request, Response } from "express";
import { processarPendenciasOdontoDesligamento } from "../services/odonto-pendencia-desligamento.service";

function modoTesteAtivo() {
  return ["1", "true", "sim", "yes"].includes(String(process.env.EMAIL_MODO_TESTE || "").trim().toLowerCase());
}

export const odontoPendenciaDesligamentoController = {
  async executarTeste(req: Request, res: Response) {
    if (!modoTesteAtivo()) {
      return res.status(400).json({ error: "O teste só pode ser executado com EMAIL_MODO_TESTE=true." });
    }
    const nivel = Number(req.body?.nivel);
    if (nivel !== 1 && nivel !== 2 && nivel !== 3) {
      return res.status(400).json({ error: "Informe o nível de teste: 1, 2 ou 3." });
    }
    try {
      const resultado = await processarPendenciasOdontoDesligamento({ teste: true, nivelTeste: nivel as 1 | 2 | 3 });
      return res.json({ success: true, ...resultado });
    } catch (error: any) {
      return res.status(500).json({ error: "Falha ao executar teste das pendências odontológicas.", details: error?.message });
    }
  },
};
