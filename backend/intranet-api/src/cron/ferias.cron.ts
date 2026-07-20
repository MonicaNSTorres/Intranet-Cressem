import cron from "node-cron";

import {
  executarNotificacoesMensaisFerias,
  executarNotificacoesPreviaDia17,
  enviarEmailTiFerias,
} from "../services/ferias_notificacao.service";

cron.schedule(
  "0 8 * * *",
  async () => {
    try {
      console.log("[CRON FÉRIAS] Executando fluxo mensal RH/Gerências...");

      const result = await executarNotificacoesMensaisFerias({
        origem: "cron",
      });

      console.log("[CRON FÉRIAS] Resultado mensal:", result);

      const previa = await executarNotificacoesPreviaDia17({
        origem: "cron",
      });

      console.log("[CRON FÉRIAS] Resultado prévia dia 17:", previa);
    } catch (err) {
      console.error("[CRON FÉRIAS] Erro no fluxo mensal:", err);
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
      console.log("[CRON FÉRIAS] Executando TI...");

      const resultadoTi = await enviarEmailTiFerias();

      console.log("[CRON FÉRIAS] TI finalizado:", resultadoTi);
    } catch (err) {
      console.error("[CRON FÉRIAS] Erro TI:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);

{/*setTimeout(async () => {
  try {
    console.log("[CRON FÉRIAS] Startup catch-up mensal...");

    const result = await executarNotificacoesMensaisFerias({
      origem: "startup",
    });

    console.log("[CRON FÉRIAS] Startup catch-up resultado:", result);
  } catch (err) {
    console.error("[CRON FÉRIAS] Erro no startup catch-up mensal:", err);
  }
}, 20_000);*/}

{/*setTimeout(async () => {
  try {
    console.log("[CRON FÉRIAS] Startup catch-up mensal...");

    const result = await executarNotificacoesMensaisFerias({
      origem: "startup",
    });

    console.log("[CRON FÉRIAS] Startup catch-up mensal resultado:", result);
  } catch (err) {
    console.error("[CRON FÉRIAS] Erro no startup catch-up mensal:", err);
  }

  try {
    console.log("[CRON FÉRIAS] Startup catch-up TI...");

    const resultadoTi = await enviarEmailTiFerias();

    console.log(
      "[CRON FÉRIAS] Startup catch-up TI resultado:",
      resultadoTi
    );
  } catch (err) {
    console.error("[CRON FÉRIAS] Erro no startup catch-up TI:", err);
  }
}, 20_000);*/}