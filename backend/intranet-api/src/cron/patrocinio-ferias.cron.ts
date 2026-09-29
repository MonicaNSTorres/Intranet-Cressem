import cron from "node-cron";

import { encaminharPatrociniosDeGerentesEmFerias } from "../services/patrocinio-ferias.service";

cron.schedule(
  "10 6 * * *",
  async () => {
    try {
      console.log("[CRON PATROCÍNIO/FÉRIAS] Verificando solicitações pendentes de gerentes em férias...");
      const resultado = await encaminharPatrociniosDeGerentesEmFerias();
      console.log("[CRON PATROCÍNIO/FÉRIAS] Processamento concluído:", resultado);
    } catch (error) {
      console.error("[CRON PATROCÍNIO/FÉRIAS] Erro no processamento:", error);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);
