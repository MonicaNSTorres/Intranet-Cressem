import cron from "node-cron";
import { competenciaAnterior, gerarEEnviarFolhaOdontologica } from "../services/convenio-odontologico-folha.service";

// O Cadastro conclui as movimentações antes do dia 7. A folha enviada no dia
// 7 representa a competência anterior, com a situação vigente no disparo.
cron.schedule("0 8 7 * *", async () => {
  try {
    const resultado = await gerarEEnviarFolhaOdontologica({
      origem: "cron",
      competencia: competenciaAnterior(),
    });
    console.log("[CRON FOLHA ODONTOLOGICO] Folha enviada:", resultado);
  } catch (error) {
    console.error("[CRON FOLHA ODONTOLOGICO] Falha no envio:", error);
  }
}, { timezone: "America/Sao_Paulo" });
