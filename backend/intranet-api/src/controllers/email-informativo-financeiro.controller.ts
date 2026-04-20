import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import { sendEmail } from "../services/email.service";

function getMailList(envName: string) {
  return String(process.env[envName] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const emailInformativoFinanceiroController = {
  async enviar(req: Request, res: Response) {
    try {
      const funcionario = decodeURIComponent(String(req.params.funcionario || "")).trim();
      const idSolicitacao = Number(req.params.id);

      if (!funcionario) {
        return res.status(400).json({ error: "Funcionário não informado." });
      }

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({ error: "ID da solicitação inválido." });
      }

      const sql = `
        SELECT
          ID_SOLICITACAO_REEMBOLSO_DESPESA,
          NM_FUNCIONARIO,
          NR_CPF_FUNCIONARIO,
          TO_CHAR(DT_IDA, 'DD/MM/YYYY') AS DT_IDA,
          TO_CHAR(DT_VOLTA, 'DD/MM/YYYY') AS DT_VOLTA,
          DESC_JTF_EVENTO,
          NM_CIDADE,
          NR_BANCO,
          CD_AGENCIA,
          NR_CONTA,
          DESC_ANDAMENTO
        FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
        WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
      `;

      const result = await oracleExecute(
        sql,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const row: any = result.rows[0];

      const destinatarios = getMailList("MAIL_TO");

      if (!destinatarios.length) {
        return res.status(500).json({
          error: "Nenhum destinatário configurado para o envio de email.",
        });
      }

      const subject = `Nova solicitação de reembolso de despesas #${row.ID_SOLICITACAO_REEMBOLSO_DESPESA}`;

      const html = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222;">
          <h2 style="margin-bottom: 16px;">Solicitação de Reembolso de Despesas</h2>

          <p>Uma nova solicitação foi cadastrada no sistema.</p>

          <table style="border-collapse: collapse; width: 100%; max-width: 700px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>ID Solicitação</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.ID_SOLICITACAO_REEMBOLSO_DESPESA}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Funcionário</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.NM_FUNCIONARIO || funcionario}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>CPF</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.NR_CPF_FUNCIONARIO || ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Período</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.DT_IDA || ""} até ${row.DT_VOLTA || ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Cidade</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.NM_CIDADE || ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Justificativa</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.DESC_JTF_EVENTO || ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${row.DESC_ANDAMENTO || ""}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">
            Este email foi enviado automaticamente pelo sistema.
          </p>
        </div>
      `;

      await sendEmail(destinatarios, subject, html);

      return res.json({
        success: true,
        message: "Email enviado com sucesso.",
      });
    } catch (err: any) {
      console.error("enviar email informativo financeiro erro:", err);
      return res.status(500).json({
        error: "Falha ao enviar email informativo.",
        details: String(err?.message || err),
      });
    }
  },
};