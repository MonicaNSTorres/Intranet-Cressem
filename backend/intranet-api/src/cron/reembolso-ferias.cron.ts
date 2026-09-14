import cron from "node-cron";

import { encaminharReembolsosDeAprovadoresEmFerias } from "../services/reembolso-ferias.service";

cron.schedule(
  "0 11 * * *",
  async () => {
    try {
      console.log("[CRON REEMBOLSO/FÉRIAS] Verificando solicitações pendentes de aprovadores em férias...");
      const resultado = await encaminharReembolsosDeAprovadoresEmFerias();
      console.log("[CRON REEMBOLSO/FÉRIAS] Processamento concluído:", resultado);
    } catch (error) {
      console.error("[CRON REEMBOLSO/FÉRIAS] Erro no processamento:", error);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);
