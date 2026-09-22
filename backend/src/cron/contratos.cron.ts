import cron from "node-cron";
import { notificarContratosPorVencimento } from "../services/contratos_notificacao.service";

cron.schedule(
  "0 8 * * 1-5",
  async () => {
    try {
      console.log("[CRON CONTRATOS] Verificando contratos próximos do vencimento...");

      const result = await notificarContratosPorVencimento();

      console.log("[CRON CONTRATOS] Resultado:", result);
    } catch (err) {
      console.error("[CRON CONTRATOS] Erro:", err);
    }
  },
  {
    timezone: "America/Sao_Paulo",
  }
);