import { Request, Response } from "express";
import {
  consultarAlertasIdadeConvenioOdontologico,
  enviarAlertaMensalIdadeConvenioOdontologico,
  modoTesteAlertaIdadeAtivo,
  validarReferenciaAlertaIdade,
} from "../services/convenio-odontologico-alerta-idade.service";

let envioTesteEmAndamento = false;

function filtrosEntrada(entrada: Record<string, unknown>) {
  const referencia = validarReferenciaAlertaIdade(entrada.referencia === undefined ? undefined : String(entrada.referencia));
  const idade = entrada.idade === undefined || entrada.idade === "" ? undefined : Number(entrada.idade);
  if (idade !== undefined && idade !== 18 && idade !== 24) throw new Error("Selecione todos os alertas, 18 anos ou 24 anos.");
  return { referencia, idade: idade as 18 | 24 | undefined };
}

export const convenioOdontologicoAlertaIdadeController = {
  async consultar(req: Request, res: Response) {
    let filtros;
    try { filtros = filtrosEntrada(req.query); }
    catch (error: any) { return res.status(400).json({ error: error.message }); }
    try {
      const consulta = await consultarAlertasIdadeConvenioOdontologico(filtros);
      return res.json({ ...consulta, modoTesteAtivo: modoTesteAlertaIdadeAtivo() });
    } catch (error: any) {
      console.error("Erro na consulta dos alertas de idade odontológicos:", error);
      return res.status(500).json({ error: "Não foi possível consultar os alertas de idade.", details: error.message });
    }
  },

  async testarEnvio(req: Request, res: Response) {
    if (!modoTesteAlertaIdadeAtivo()) return res.status(403).json({ error: "O envio de teste está disponível somente com EMAIL_MODO_TESTE=true." });
    let filtros;
    try { filtros = filtrosEntrada(req.body || {}); }
    catch (error: any) { return res.status(400).json({ error: error.message }); }
    if (envioTesteEmAndamento) return res.status(409).json({ error: "Já existe um teste de alerta de idade em andamento." });
    envioTesteEmAndamento = true;
    try {
      const resultado = await enviarAlertaMensalIdadeConvenioOdontologico({ ...filtros, teste: true });
      return res.json({ success: true, ...resultado });
    } catch (error: any) {
      console.error("Erro no teste do alerta de idade odontológico:", error);
      return res.status(422).json({ error: error.message || "Não foi possível enviar o e-mail de teste." });
    } finally { envioTesteEmAndamento = false; }
  },
};
