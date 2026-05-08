import cron from "node-cron";

import {
  enviarEmailRhDiretoria,
  enviarEmailGerencias,
  enviarEmailTiFerias,
} from "../services/ferias_notificacao.service";

cron.schedule(
  "0 8 1 * *",
  async () => {
    try {
      console.log("[CRON FÉRIAS] Executando RH/Diretoria...");

      await enviarEmailRhDiretoria();

      console.log("[CRON FÉRIAS] RH/Diretoria finalizado.");
    } catch (err) {
      console.error("[CRON FÉRIAS] Erro RH/Diretoria:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "5 8 1 * *",
  async () => {
    try {
      console.log("[CRON FÉRIAS] Executando Gerências...");

      await enviarEmailGerencias();

      console.log("[CRON FÉRIAS] Gerências finalizado.");
    } catch (err) {
      console.error("[CRON FÉRIAS] Erro Gerências:", err);
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

      await enviarEmailTiFerias();

      console.log("[CRON FÉRIAS] TI finalizado.");
    } catch (err) {
      console.error("[CRON FÉRIAS] Erro TI:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);