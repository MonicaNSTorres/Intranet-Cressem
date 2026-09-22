import cron from "node-cron";
import { ehPrimeiroDiaUtil } from "../services/convenio-odontologico-folha.service";
import { processarPendenciasOdontoDesligamento } from "../services/odonto-pendencia-desligamento.service";

cron.schedule("0 8 * * *", async () => {
  if (!ehPrimeiroDiaUtil()) return;
  try {
    console.log("[CRON ODONTO PENDÊNCIA] Iniciando processamento mensal.");
    console.log("[CRON ODONTO PENDÊNCIA] Resultado:", await processarPendenciasOdontoDesligamento());
  } catch (error) {
    console.error("[CRON ODONTO PENDÊNCIA] Falha:", error);
  }
}, { timezone: "America/Sao_Paulo" });
