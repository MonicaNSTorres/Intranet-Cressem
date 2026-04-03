import { Request, Response } from "express";
import { sendEmail } from "../services/email.service";
import { oracleExecute } from "../services/oracle.service";

function formatarCnpj(cnpj: string) {
  if (!cnpj) return "";
  const n = cnpj.replace(/\D/g, "");

  if (n.length === 11) {
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (n.length === 14) {
    return n.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return cnpj;
}

function getParamAsString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function getParamAsNumber(value: string | string[] | undefined) {
  const parsed = Number(getParamAsString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export const emailController = {
  async emailGerencia(req: Request, res: Response) {
    try {
      const funcionario = getParamAsString(req.params.funcionario);
      const empresa = getParamAsString(req.params.empresa);
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = `
      <p>Prezado Gestor,</p>

      <p>Uma solicitação de participação de marketing está aguardando avaliação.</p>

      <ul>
        <li><b>Empresa:</b> ${empresa}</li>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Funcionário:</b> ${funcionario}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Resumo:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
        <li><b>Cidade:</b> ${patrocinio.NM_CIDADE}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>

      <p>Atenciosamente<br/>Email automático</p>
      `;

      const gerenteEmail = "gerencia@sicoob.com.br";

      await sendEmail(gerenteEmail, subject, body);

      return res.json({ message: "Email enviado para gerência" });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email gerência",
        details: error.message,
      });
    }
  },

  async emailDiretoria(req: Request, res: Response) {
    try {
      const funcionario = getParamAsString(req.params.funcionario);
      const empresa = getParamAsString(req.params.empresa);
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = `
      <p>Prezado Diretor,</p>

      <p>Uma solicitação está aguardando sua avaliação.</p>

      <ul>
        <li><b>Empresa:</b> ${empresa}</li>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Funcionário:</b> ${funcionario}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>
      `;

      const emails = ["diretoria@sicoob.com.br"];

      await sendEmail(emails, subject, body);

      return res.json({ message: "Email enviado para diretoria" });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email diretoria",
        details: error.message,
      });
    }
  },

  async emailConselho(req: Request, res: Response) {
    try {
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado." });
      }

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = `
      <p>Prezada Janaina,</p>

      <p>Uma solicitação está aguardando decisão do conselho.</p>

      <ul>
        <li><b>Empresa:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
      </ul>
      `;

      await sendEmail("janainag@sicoob.com.br", subject, body);

      return res.json({ message: "Email enviado para conselho" });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email conselho",
        details: error.message,
      });
    }
  },

  async emailParecerFinal(req: Request, res: Response) {
    try {
      const id = getParamAsNumber(req.params.id);

      if (id === null) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const patrocinioResult = await oracleExecute(
        `SELECT * FROM DBACRESSEM.PATROCINIO WHERE ID_PATROCINIO = :id`,
        { id }
      );

      const patrocinio: any = patrocinioResult.rows?.[0];

      if (!patrocinio) {
        return res.status(404).json({ error: "Patrocínio não encontrado" });
      }

      const subject = "Solicitação de Participação de Marketing Finalizada";

      const body = `
      <p>Prezados,</p>

      <p>A solicitação abaixo foi finalizada:</p>

      <ul>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>
      `;

      const emails = ["diretoria@sicoob.com.br", "gerencia@sicoob.com.br"];

      await sendEmail(emails, subject, body);

      return res.json({ message: "Email final enviado" });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email final",
        details: error.message,
      });
    }
  },
};