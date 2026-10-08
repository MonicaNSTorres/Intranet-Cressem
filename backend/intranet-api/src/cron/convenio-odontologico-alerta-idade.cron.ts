import cron from "./cron-email-protegido";
import { ehPrimeiroDiaUtil } from "../services/convenio-odontologico-folha.service";
import { enviarAlertaMensalIdadeConvenioOdontologico } from "../services/convenio-odontologico-alerta-idade.service";

cron.schedule("0 8 * * *", async () => {
  if (!ehPrimeiroDiaUtil()) return;
  try {
    const resultado = await enviarAlertaMensalIdadeConvenioOdontologico();
    console.log("[CRON CONVÊNIO ODONTOLÓGICO - IDADE] Resultado:", resultado);
  } catch (error) {
    console.error("[CRON CONVÊNIO ODONTOLÓGICO - IDADE] Falha no alerta mensal:", error);
  }
}, { timezone: "America/Sao_Paulo" });
