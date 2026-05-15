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

function simNao(value: any) {
  return Number(value || 0) === 1 ? "SIM" : "NÃO";
}

function fmtMoney(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-BR");
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

      const diasResult = await oracleExecute(
        `
        SELECT
          TO_CHAR(DT_DIA, 'DD/MM/YYYY') AS DT_DIA,
          HR_INICIO,
          HR_FIM
        FROM DBACRESSEM.DATA_HORA_PATROCINIO
        WHERE ID_PATROCINIO = :id
        ORDER BY DT_DIA, HR_INICIO
      `,
        { id }
      );

      const diasHtml = (diasResult.rows || [])
        .map((row: any) => {
          const dtDia = String(row?.DT_DIA || "");
          const hrInicio = String(row?.HR_INICIO || "");
          const hrFim = String(row?.HR_FIM || "");
          return `<li><b>Dia:</b> ${dtDia}, <b>Início:</b> ${hrInicio}, <b>Fim:</b> ${hrFim}</li>`;
        })
        .join("");

      const subject = "Nova Solicitação de Participação de Marketing Recebida";

      const body = `
      <p>Prezado(a) Gestor(a),</p>

      <p>Uma solicitação de participação de marketing está aguardando sua avaliação.</p>

      <ul>
        <li><b>Empresa:</b> ${empresa}</li>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Funcionário:</b> ${funcionario}</li>
        ${diasHtml}
        <li><b>Precisa de Valor Monetário?</b> ${simNao(
        patrocinio.VL_MONETARIO
      )}</li>
        <li><b>Valor Solicitado:</b> R$ ${fmtMoney(
        patrocinio.VL_PATROCINIO
      )}</li>
        <li><b>É insumo?</b> ${simNao(patrocinio.QTD_INSUMO)}</li>
        <li><b>Estimativa de Valor:</b> R$ ${fmtMoney(
        patrocinio.VL_ESTIMATIVA
      )}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Resumo:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
        <li><b>Precisa de Motorista?</b> ${simNao(
        patrocinio.CD_MOTORISTA
      )}</li>
        <li><b>Precisa de Funcionários?</b> ${simNao(
        patrocinio.CD_FUNCIONARIOS
      )}</li>
        <li><b>Data da Solicitação:</b> ${fmtDate(
        patrocinio.DT_SOLICITACAO
      )}</li>
        <li><b>Cidade:</b> ${patrocinio.NM_CIDADE}</li>
        <li><b>Reserva Auditório Sede:</b> ${simNao(
        patrocinio.CD_AUDITORIO_SEDE
      )}</li>
        <li><b>Reserva Centro de Convivência:</b> ${simNao(
        patrocinio.CD_AUDITORIO_CENTRO
      )}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>

      <p>Por favor, acesse a Intranet para visualizar os detalhes completos da solicitação e registrar seu parecer.</p>

      <p>Atenciosamente<br/>E-mail automático</p>
      `;

      const funcionarioResult = await oracleExecute(
        `
        SELECT
          f.ID_FUNCIONARIO,
          f.CD_GERENCIA
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
        FETCH FIRST 1 ROWS ONLY
      `,
        { nome: patrocinio.NM_FUNCIONARIO || funcionario }
      );

      const funcionarioRow: any = funcionarioResult.rows?.[0];

      if (!funcionarioRow) {
        return res.status(404).json({
          error: "Funcionário solicitante não encontrado para identificar a gerência.",
        });
      }

      const codigoGerencia = String(funcionarioRow.CD_GERENCIA || "").trim();

      if (!codigoGerencia) {
        return res.status(400).json({
          error: "Funcionário solicitante sem gerência vinculada.",
        });
      }

      const gerenciaResult = await oracleExecute(
        `
        SELECT
          f.EMAIL,
          f.NM_FUNCIONARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
        WHERE TRIM(TO_CHAR(f.ID_FUNCIONARIO)) = TRIM(:codigoGerencia)
        FETCH FIRST 1 ROWS ONLY
      `,
        { codigoGerencia }
      );

      const gerenciaRow: any = gerenciaResult.rows?.[0];
      const gerenteEmail = String(gerenciaRow?.EMAIL || "").trim();

      if (!gerenteEmail) {
        return res.status(404).json({
          error: "E-mail da gerência do solicitante não encontrado.",
        });
      }

      await sendEmail(gerenteEmail, subject, body);

      if (Number(patrocinio.CD_AUDITORIO_SEDE || 0) === 1) {
        const auditorioResult = await oracleExecute(
          `
          SELECT
            QTD_ESTIMATIVA_CONVIDADOS,
            SN_USO_MICROFONE,
            QNTD_MICROFONE,
            SN_USO_PROJETOR,
            NM_APRESENTACAO,
            SN_AUDIO_EXTERNO,
            SN_OPERADOR,
            SN_AO_VIVO,
            NM_PLATAFORMA,
            SN_INTERNET,
            DESC_JUSTIFICATIVA,
            OBS_AUDITORIO_SICOOB_SEDE
          FROM DBACRESSEM.AUDITORIO_SICOOB_SEDE
          WHERE ID_PATROCINIO = :id
          ORDER BY ID_AUDITORIO_SICOOB_SEDE DESC
        `,
          { id }
        );

        const auditorio: any = auditorioResult.rows?.[0] || {};

        const microfoneHtml =
          Number(auditorio.SN_USO_MICROFONE || 0) === 1
            ? `<li><b>Uso de microfone?</b> SIM, <b>Quantidade:</b> ${auditorio.QNTD_MICROFONE || 0
            }</li>`
            : `<li><b>Uso de microfone?</b> NÃO</li>`;

        const projetorHtml =
          Number(auditorio.SN_USO_PROJETOR || 0) === 1
            ? `<li><b>Uso de projeção?</b> SIM, <b>Apresentação via:</b> ${auditorio.NM_APRESENTACAO || "-"
            }</li>`
            : `<li><b>Uso de projeção?</b> NÃO</li>`;

        const transmissaoHtml =
          Number(auditorio.SN_AO_VIVO || 0) === 1
            ? `<li><b>Haverá transmissão ao vivo?</b> SIM, <b>Plataforma(s):</b> ${auditorio.NM_PLATAFORMA || "-"
            }</li>`
            : `<li><b>Haverá transmissão ao vivo?</b> NÃO</li>`;

        const internetHtml =
          Number(auditorio.SN_INTERNET || 0) === 1
            ? `<li><b>Uso de Internet dedicada?</b> SIM, <b>Justificativa:</b> ${auditorio.DESC_JUSTIFICATIVA || "-"
            }</li>`
            : `<li><b>Uso de Internet dedicada?</b> NÃO</li>`;

        const bodyAuditorio = `
        <p>Prezada Equipe de TI,</p>

        <p>Informamos que uma <b>solicitação de Participação de Marketing Sicoob</b> solicitou a reserva do Auditório Sede.</p>

        <ul>
          <li><b>Empresa:</b> ${empresa}</li>
          <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
          <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
          <li><b>Funcionário:</b> ${funcionario}</li>
          ${diasHtml}
          <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
          <li><b>Resumo do Evento:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
          <li><b>Precisa de Funcionários?</b> ${simNao(
          patrocinio.CD_FUNCIONARIOS
        )}</li>
          <li><b>Data da Solicitação:</b> ${fmtDate(
          patrocinio.DT_SOLICITACAO
        )}</li>
          <li><b>Cidade:</b> ${patrocinio.NM_CIDADE}</li>
          <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
        </ul>

        <p><b>Informações da reserva do Auditório:</b></p>
        <ul>
          <li><b>Estimativa de Convidados:</b> ${auditorio.QTD_ESTIMATIVA_CONVIDADOS || 0
          }</li>
          ${microfoneHtml}
          ${projetorHtml}
          <li><b>Uso de áudio externo via notebook?</b> ${simNao(
            auditorio.SN_AUDIO_EXTERNO
          )}</li>
          <li><b>Tem operador do som e apresentação?</b> ${simNao(
            auditorio.SN_OPERADOR
          )}</li>
          ${transmissaoHtml}
          ${internetHtml}
          <li><b>Observações:</b> ${auditorio.OBS_AUDITORIO_SICOOB_SEDE || "-"
          }</li>
        </ul>

        <p>Por favor, acesse a Intranet para acompanhar os detalhes da reserva e tratar as providências necessárias.</p>

        <p>Atenciosamente<br/>E-mail Automático</p>
        `;

        const subjectAuditorio =
          "Nova Solicitação de Reserva do Auditório Sede Recebida";

        await sendEmail(
          ["informatica.cressem@sicoob.com.br", "luiz.gerhard@sicoob.com.br", "fabio.sprado@sicoob.com.br"],
          subjectAuditorio,
          bodyAuditorio
        );
      }

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
      <p>Prezado(a) Diretor(a),</p>

      <p>Uma solicitação de participação de marketing está aguardando sua avaliação.</p>

      <ul>
        <li><b>Empresa:</b> ${empresa}</li>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Funcionário:</b> ${funcionario}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Resumo:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>

      <p>Por favor, acesse a Intranet para visualizar os detalhes completos e registrar seu parecer.</p>

      <p>Atenciosamente<br/>E-mail automático</p>
      `;

      const emails = ["paulo.tarso@sicoob.com.br"];

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
      <p>Prezados(as) Conselheiros(as),</p>

      <p>Uma solicitação de participação de marketing está aguardando decisão do conselho.</p>

      <ul>
        <li><b>Empresa:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Resumo:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>

      <p>Por favor, acesse a Intranet para visualizar os detalhes completos e registrar a decisão final.</p>

      <p>Atenciosamente<br/>E-mail automático</p>
      `;

      const emailsConselho = [
        "janainag@sicoob.com.br",
        "isabeli.cmartins@sicoob.com.br"
      ];

      await sendEmail(emailsConselho, subject, body);

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
      <p>Prezados(as),</p>

      <p>A solicitação abaixo foi finalizada:</p>

      <ul>
        <li><b>Solicitante:</b> ${patrocinio.NM_SOLICITANTE}</li>
        <li><b>CNPJ/CPF:</b> ${formatarCnpj(patrocinio.NR_CPF_CNPJ)}</li>
        <li><b>Solicitação:</b> ${patrocinio.DESC_SOLICITACAO}</li>
        <li><b>Resumo:</b> ${patrocinio.DESC_RESUMO_EVENTO}</li>
        <li><b>Status:</b> ${patrocinio.NM_ANDAMENTO}</li>
      </ul>

      <p>Para histórico e consulta completa, acesse a Intranet.</p>

      <p>Atenciosamente<br/>E-mail automático</p>
      `;

      const destinatarios = new Set<string>();

      const addEmail = (email: any) => {
        const e = String(email || "").trim().toLowerCase();
        if (e) destinatarios.add(e);
      };

      const buscarEmailPorNome = async (nome: string) => {
        const nomeLimpo = String(nome || "").trim();
        if (!nomeLimpo) return "";

        const result = await oracleExecute(
          `
          SELECT
            TRIM(f.EMAIL) AS EMAIL
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
          FETCH FIRST 1 ROWS ONLY
        `,
          { nome: nomeLimpo }
        );

        return String((result.rows?.[0] as any)?.EMAIL || "").trim();
      };

      const buscarEmailGerenciaDoFuncionario = async (nomeFuncionario: string) => {
        const nomeLimpo = String(nomeFuncionario || "").trim();
        if (!nomeLimpo) return "";

        const funcionarioResult = await oracleExecute(
          `
          SELECT
            f.CD_GERENCIA
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nome))
          FETCH FIRST 1 ROWS ONLY
        `,
          { nome: nomeLimpo }
        );

        const funcionarioRow: any = funcionarioResult.rows?.[0];
        const codigoGerencia = String(funcionarioRow?.CD_GERENCIA || "").trim();
        if (!codigoGerencia) return "";

        const gerenciaResult = await oracleExecute(
          `
          SELECT
            TRIM(f.EMAIL) AS EMAIL
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE TRIM(TO_CHAR(f.ID_FUNCIONARIO)) = TRIM(:codigoGerencia)
          FETCH FIRST 1 ROWS ONLY
        `,
          { codigoGerencia }
        );

        return String((gerenciaResult.rows?.[0] as any)?.EMAIL || "").trim();
      };

      // 1) Pessoa que solicitou (funcionário)
      addEmail(await buscarEmailPorNome(String(patrocinio.NM_FUNCIONARIO || "")));

      // 2) Gerente da pessoa que solicitou
      addEmail(
        await buscarEmailGerenciaDoFuncionario(String(patrocinio.NM_FUNCIONARIO || ""))
      );

      // 3) Diretoria (preferência: diretoria registrada no patrocínio)
      addEmail(await buscarEmailPorNome(String(patrocinio.NM_DIRETORIA || "")));
      // fallback atual caso não encontre diretoria no cadastro
      addEmail("paulo.tarso@sicoob.com.br");

      // 4) Se tiver auditório, incluir TI no envio final também
      const temAuditorio =
        Number(patrocinio.CD_AUDITORIO_SEDE || 0) === 1 ||
        Number(patrocinio.CD_AUDITORIO_CENTRO || 0) === 1;

      if (temAuditorio) {
        addEmail("luiz.gerhard@sicoob.com.br");
        addEmail("fabio.sprado@sicoob.com.br");
      }

      const emails = Array.from(destinatarios);

      if (!emails.length) {
        return res.status(404).json({
          error: "Nenhum destinatário encontrado para envio do parecer final.",
        });
      }

      await sendEmail(emails, subject, body);

      return res.json({
        message: "Email final enviado",
        destinatarios: emails,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao enviar email final",
        details: error.message,
      });
    }
  },
};
