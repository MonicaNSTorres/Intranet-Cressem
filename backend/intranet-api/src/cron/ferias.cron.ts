import cron from "node-cron";

import {
  executarNotificacoesMensaisFerias,
  enviarEmailTiFerias,
} from "../services/ferias_notificacao.service";

cron.schedule(
  "0 8 * * *",
  async () => {
    try {
      console.log("[CRON FERIAS] Executando fluxo mensal RH/Gerencias...");
      const result = await executarNotificacoesMensaisFerias({
        origem: "cron",
      });
      console.log("[CRON FERIAS] Resultado mensal:", result);
    } catch (err) {
      console.error("[CRON FERIAS] Erro fluxo mensal:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "0 8 * * *",
  async () => {
    try {
      console.log("[CRON FERIAS] Executando TI...");

      await enviarEmailTiFerias();

      console.log("[CRON FERIAS] TI finalizado.");
    } catch (err) {
      console.error("[CRON FERIAS] Erro TI:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);

setTimeout(async () => {
  try {
    console.log("[CRON FERIAS] Startup catch-up mensal...");
    const result = await executarNotificacoesMensaisFerias({
      origem: "startup",
    });
    console.log("[CRON FERIAS] Startup catch-up resultado:", result);
  } catch (err) {
    console.error("[CRON FERIAS] Erro startup catch-up mensal:", err);
  }
}, 20_000);
