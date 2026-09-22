import { Request, Response } from "express";
import oracledb from "oracledb";
import {
  oracleExecute,
  oracleExecuteCommitWithAudit,
} from "../services/oracle.service";
import { sendEmail } from "../services/email.service";
import { criarPendenciaOdontoDesligamento } from "../services/odonto-pendencia-desligamento.service";

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}


function documentoValido(documento: string) {
  return documento.length === 11 || documento.length === 14;
}

function dataParaIso(valor: unknown) {
  const texto = String(valor || "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (iso) return texto;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function valorNaoNegativo(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Number(numero.toFixed(2)) : null;
}

function escaparHtml(valor: unknown) {
  return String(valor || "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[caractere] || caractere));
}

function formatarDocumento(valor: unknown) {
  const documento = somenteNumeros(String(valor || ""));
  if (documento.length === 11) {
    return `${documento.slice(0, 3)}.${documento.slice(3, 6)}.${documento.slice(6, 9)}-${documento.slice(9)}`;
  }
  if (documento.length === 14) {
    return `${documento.slice(0, 2)}.${documento.slice(2, 5)}.${documento.slice(5, 8)}/${documento.slice(8, 12)}-${documento.slice(12)}`;
  }
  return documento || "-";
}

function valorVerdadeiro(valor: unknown) {
  return ["1", "true", "sim", "yes"].includes(String(valor || "").trim().toLowerCase());
}

function modoTesteEmailAtivo() {
  return valorVerdadeiro(process.env.EMAIL_MODO_TESTE);
}

function listaEmails(valor: unknown) {
  return String(valor || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function montarEmailDemissaoComConvenioAtivo(params: {
  nome: string;
  cpf: string;
  matricula: string;
  empresa: string;
  dataDemissao: string;
  solicitante: string;
  operadora: string;
  plano: string;
  tipoBeneficiario: string;
  valorMensalidade: unknown;
}) {
  const valor = Number(params.valorMensalidade || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const linhas = [
    ["Associado", params.nome],
    ["CPF/CNPJ", formatarDocumento(params.cpf)],
    ["Matrícula", params.matricula || "-"],
    ["Empresa", params.empresa || "-"],
    ["Data da demissão", params.dataDemissao],
    ["Operadora", params.operadora || "-"],
    ["Plano", params.plano || "-"],
    ["Tipo de beneficiário", params.tipoBeneficiario || "-"],
    ["Valor vigente", valor],
  ]
    .map(([rotulo, conteudo]) => `<tr><td style="padding:9px 10px;border-bottom:1px solid #E2E8F0;width:38%;font-size:12px;font-weight:bold;color:#475569;">${escaparHtml(rotulo)}</td><td style="padding:9px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#0F172A;">${escaparHtml(conteudo)}</td></tr>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6FBFA;font-family:Arial,Helvetica,sans-serif;color:#0F172A;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" width="760" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;border-collapse:separate;"><tr><td style="padding:20px 24px;background:#DC2626;color:#FFFFFF;"><div style="font-size:10px;line-height:14px;font-weight:bold;letter-spacing:.8px;">INTRANET CRESSEM</div><div style="font-size:18px;line-height:24px;font-weight:bold;margin-top:2px;">Atenção: convênio odontológico permanece ativo</div></td></tr><tr><td style="padding:22px 24px 18px;"><p style="margin:0 0 13px;font-size:13px;line-height:20px;">O desligamento foi registrado, mas o benefício odontológico <strong>não foi inativado</strong>.</p><p style="margin:0 0 16px;font-size:12px;line-height:18px;color:#475569;">Ação realizada por: <strong>${escaparHtml(params.solicitante)}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #E2E8F0;">${linhas}</table><div style="margin-top:16px;padding:12px 14px;border-left:4px solid #DC2626;background:#FEF2F2;color:#991B1B;font-size:12px;line-height:18px;"><strong>Ação necessária:</strong> o Financeiro deve avaliar o impacto do benefício ativo e providenciar o tratamento adequado.</div></td></tr><tr><td style="padding:0 24px 21px;color:#64748B;font-size:11px;line-height:16px;">Mensagem automática da Intranet Cressem.</td></tr></table></td></tr></table></body></html>`;
}

async function buscarConvenioOdontologicoAtivo(documento: string) {
  const resultado = await oracleExecute(
    `SELECT B.NM_BENEFICIARIO, TB.NM_TIPO_BENEFICIARIO, O.NM_OPERADORA, P.NM_PLANO, PV.VL_MENSALIDADE
       FROM DBACRESSEM.ODONTO_BENEFICIARIO B
       INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO
       INNER JOIN DBACRESSEM.ODONTO_PLANO P ON P.ID_PLANO = B.ID_PLANO
       INNER JOIN DBACRESSEM.ODONTO_OPERADORA O ON O.ID_OPERADORA = P.ID_OPERADORA
       LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV ON PV.ID_PLANO = P.ID_PLANO
         AND PV.SN_ATIVO = 1
         AND TRUNC(PV.DT_VIGENCIA_INICIO) <= TRUNC(SYSDATE)
         AND (PV.DT_VIGENCIA_FIM IS NULL OR TRUNC(PV.DT_VIGENCIA_FIM) >= TRUNC(SYSDATE))
      WHERE REGEXP_REPLACE(B.NR_CPF, '[^0-9]', '') = :documento
        AND B.SN_ATIVO = 1
        AND P.SN_ATIVO = 1
        AND O.SN_ATIVO = 1
      FETCH FIRST 1 ROWS ONLY`,
    { documento },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return resultado.rows?.[0] as any;
}

async function enviarNotificacaoConvenioOdontologicoAtivo(params: {
  req: Request;
  cpf: string;
  associado: any;
  atendente: string;
}) {
  try {
    const convenioAtivo = await buscarConvenioOdontologicoAtivo(params.cpf);
    if (!convenioAtivo) {
      return { enviado: false, erro: "", possuiConvenioAtivo: false };
    }

    const usuarioAutenticado = (params.req as any).user || {};
    const emailSolicitante = String(usuarioAutenticado.email || "").trim();
    const emailsFinanceiro = listaEmails(
      process.env.REEMBOLSO_FINANCEIRO_EMAIL || process.env.FINANCEIRO_EMAIL
    );

    if (!emailsFinanceiro.length && !modoTesteEmailAtivo()) {
      throw new Error(
        "REEMBOLSO_FINANCEIRO_EMAIL ou FINANCEIRO_EMAIL não configurado."
      );
    }

    const destinatarios = Array.from(
      new Set([...listaEmails(emailSolicitante), ...emailsFinanceiro])
    );

    if (!destinatarios.length) {
      throw new Error(
        "Não foi possível identificar o e-mail do solicitante para a notificação."
      );
    }

    await sendEmail(
      destinatarios,
      `SICOOB CRESSEM - Atenção: desligamento com convênio odontológico ativo - ${params.associado.NM_CLIENTE}`,
      montarEmailDemissaoComConvenioAtivo({
        nome: String(params.req.body?.nome || params.associado.NM_CLIENTE || ""),
        cpf: params.cpf,
        matricula: String(params.req.body?.matricula || params.associado.NR_MATRICULA || ""),
        empresa: String(params.req.body?.empresa || params.associado.NM_EMPRESA || ""),
        dataDemissao: new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(new Date()),
        solicitante: String(
          usuarioAutenticado.nome_completo || params.atendente || "Solicitante"
        ),
        operadora: String(convenioAtivo.NM_OPERADORA || ""),
        plano: String(convenioAtivo.NM_PLANO || ""),
        tipoBeneficiario: String(convenioAtivo.NM_TIPO_BENEFICIARIO || ""),
        valorMensalidade: convenioAtivo.VL_MENSALIDADE,
      })
    );
    return { enviado: true, erro: "", possuiConvenioAtivo: true };
  } catch (emailError: any) {
    const erro = String(
      emailError?.message || emailError || "Falha ao enviar a notificação."
    );
    console.error(
      "Demissão registrada, mas a notificação de convênio odontológico ativo falhou:",
      emailError
    );
    return { enviado: false, erro, possuiConvenioAtivo: true };
  }
}

function montarEmailConvenioHtml(documentoTitular: string, pessoas: any[]) {
  const linhas = pessoas
    .map(
      (p) => `
        <tr>
          <td>${p.NM_USUARIO || ""}</td>
          <td>${p.NR_CPF_USUARIO || ""}</td>
          <td>${p.DESC_PARENTESCO || p.NM_PARENTESCO || ""}</td>
          <td>${p.DT_EXCLUSAO || ""}</td>
        </tr>
      `
    )
    .join("");

  return `
    <h3>Desativação realizada via formulário de Demissão</h3>
    <p>CPF/CNPJ do titular: <b>${documentoTitular}</b></p>
    <p>Total desativados: <b>${pessoas.length}</b></p>

    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF/CNPJ</th>
          <th>Parentesco</th>
          <th>Data Exclusão</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}

export const demissaoController = {
  async registrarDemissao(req: Request, res: Response) {
    try {
      const cpf = somenteNumeros(String(req.body?.cpf || ""));
      const dataCarencia = dataParaIso(req.body?.dataCarencia);
      const dataDemissao = dataParaIso(req.body?.dataDemissao);
      const credito = valorNaoNegativo(req.body?.credito);
      const debito = valorNaoNegativo(req.body?.debito);
      const total = valorNaoNegativo(req.body?.total);
      const tipo = String(req.body?.tipo || "").trim().toUpperCase();
      const motivo = String(req.body?.motivo || "").trim();
      const atendente = String(req.body?.atendente || "").trim();
      const cidade = String(req.body?.cidade || "").trim();
      const inativarConvenioOdontologico = valorVerdadeiro(
        req.body?.inativarConvenioOdontologico
      );

      if (!documentoValido(cpf)) {
        return res.status(400).json({ error: "CPF/CNPJ inválido ou não informado." });
      }
      if (!dataCarencia || !dataDemissao) {
        return res.status(400).json({ error: "Datas de carência e demissão são obrigatórias." });
      }
      if (credito === null || debito === null || total === null) {
        return res.status(400).json({ error: "Valores da demissão inválidos." });
      }
      if (tipo !== "CREDOR" && tipo !== "DEVEDOR") {
        return res.status(400).json({ error: "Tipo de demissão inválido." });
      }
      if (!motivo || !atendente || !cidade) {
        return res.status(400).json({ error: "Motivo, atendente e cidade são obrigatórios." });
      }

      const associadoResult = await oracleExecute(
        `SELECT ID_CLIENTE, NM_CLIENTE, NR_MATRICULA, NM_EMPRESA, NR_TELEFONE
           FROM DBACRESSEM.ASSOCIADO_ANALITICO
          WHERE REGEXP_REPLACE(NR_CPF_CNPJ, '[^0-9]', '') = :cpf
          FETCH FIRST 1 ROWS ONLY`,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const associado: any = associadoResult.rows?.[0];
      if (!associado) {
        return res.status(404).json({ error: "Associado não encontrado para registrar a demissão." });
      }

      const telefone = somenteNumeros(String(req.body?.telefone || associado.NR_TELEFONE || ""));
      const insert = await oracleExecuteCommitWithAudit(
        req,
        `INSERT INTO DBACRESSEM.DEMISSAO (
           ID_CLIENTE, NR_CPF_CNPJ, NM_CLIENTE, CD_MATRICULA, NM_EMPRESA,
           NR_TELEFONE, VL_CREDITO, VL_DEBITO, VL_TOTAL, NM_TIPO,
           DESC_MOTIVO, DT_CARENCIA, DT_DEMISSAO, NM_ATENDENTE, NM_CIDADE
         ) VALUES (
           :idCliente, :cpf, :nome, :matricula, :empresa,
           :telefone, :credito, :debito, :total, :tipo,
           :motivo, TO_DATE(:dataCarencia, 'YYYY-MM-DD'), TO_DATE(:dataDemissao, 'YYYY-MM-DD'), :atendente, :cidade
         ) RETURNING ID_DEMISSAO INTO :idDemissao`,
        {
          idCliente: associado.ID_CLIENTE || null,
          cpf,
          nome: String(req.body?.nome || associado.NM_CLIENTE || "").trim() || null,
          matricula: String(req.body?.matricula || associado.NR_MATRICULA || "").trim() || null,
          empresa: String(req.body?.empresa || associado.NM_EMPRESA || "").trim() || null,
          telefone: telefone ? Number(telefone) : null,
          credito,
          debito,
          total,
          tipo,
          motivo,
          dataCarencia,
          dataDemissao,
          atendente,
          cidade,
          idDemissao: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        {} as any
      );
      const idDemissao = Array.isArray((insert.outBinds as any)?.idDemissao)
        ? (insert.outBinds as any).idDemissao[0]
        : (insert.outBinds as any)?.idDemissao;
      await criarPendenciaOdontoDesligamento({
        origem: "DEMISSAO",
        idOrigem: Number(idDemissao),
        cpf,
        nomeAssociado: String(req.body?.nome || associado.NM_CLIENTE || "").trim(),
        usuario: {
          nome: (req as any).user?.nome_completo,
          login: (req as any).user?.sub,
          email: (req as any).user?.email,
        },
      });

      let notificacaoConvenioAtivoEnviada = false;
      let erroNotificacaoConvenioAtivo = "";

      if (!inativarConvenioOdontologico) {
        const notificacao = await enviarNotificacaoConvenioOdontologicoAtivo({
          req,
          cpf,
          associado,
          atendente,
        });
        notificacaoConvenioAtivoEnviada = notificacao.enviado;
        erroNotificacaoConvenioAtivo = notificacao.erro;
      }

      return res.status(201).json({
        success: true,
        idDemissao: Number(idDemissao),
        notificacaoConvenioAtivoEnviada,
        erroNotificacaoConvenioAtivo,
      });
    } catch (error: any) {
      console.error("Erro ao registrar demissão:", error);
      return res.status(500).json({ error: "Não foi possível registrar a demissão.", details: error?.message });
    }
  },

  async buscarAssociado(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(String(req.params.cpf || ""));

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE AS NOME,
          a.NR_MATRICULA AS MATRICULA,
          a.NM_EMPRESA AS EMPRESA,
          a.NM_CIDADE AS CIDADE,
          a.NR_TELEFONE AS TELEFONE,
          a.SL_CONTA_CAPITAL AS SL_CONTA_CAPITAL
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ,'[^0-9]','') = :documento
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { documento },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Associado não encontrado",
        });
      }

      return res.json(row);
    } catch (error: any) {
      console.error("Erro ao buscar associado demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar associado",
        details: error.message,
      });
    }
  },

  async buscarConvenio(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(
        String(req.params.cpf || "")
      );

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const ativoSql = `
      SELECT
        B.ID_BENEFICIARIO,
        B.NM_BENEFICIARIO,
        B.NR_CPF,
        B.ID_TITULAR,
        B.DT_INCLUSAO_PLANO,
        B.DT_EXCLUSAO_PLANO,

        TB.CD_TIPO_BENEFICIARIO,
        TB.NM_TIPO_BENEFICIARIO,

        P.ID_PLANO,
        P.NM_PLANO,
        P.TP_COBRANCA,

        O.ID_OPERADORA,
        O.NM_OPERADORA,

        PV.ID_PLANO_VALOR,
        PV.VL_MENSALIDADE,
        PV.DT_VIGENCIA_INICIO,
        PV.DT_VIGENCIA_FIM

      FROM DBACRESSEM.ODONTO_BENEFICIARIO B

      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
        ON TB.ID_TIPO_BENEFICIARIO =
           B.ID_TIPO_BENEFICIARIO

      INNER JOIN DBACRESSEM.ODONTO_PLANO P
        ON P.ID_PLANO =
           B.ID_PLANO

      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
        ON O.ID_OPERADORA =
           P.ID_OPERADORA

      LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
        ON PV.ID_PLANO =
           P.ID_PLANO

       AND TRUNC(SYSDATE) >=
           TRUNC(PV.DT_VIGENCIA_INICIO)

       AND (
         PV.DT_VIGENCIA_FIM IS NULL
         OR SYSDATE <= PV.DT_VIGENCIA_FIM
       )

      WHERE REGEXP_REPLACE(
        B.NR_CPF,
        '[^0-9]',
        ''
      ) = :documento

        AND B.SN_ATIVO = 1
        AND P.SN_ATIVO = 1
        AND O.SN_ATIVO = 1

      FETCH FIRST 1 ROWS ONLY
    `;

      const ativoResult = await oracleExecute(
        ativoSql,
        { documento },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      const ativo: any =
        ativoResult.rows?.[0];

      if (ativo) {
        const ehTitular =
          ativo.CD_TIPO_BENEFICIARIO ===
          "TITULAR";

        return res.json({
          situacao: "ATIVO",

          titular_ativo: true,

          eh_titular: ehTitular,

          total_custo:
            Number(
              ativo.VL_MENSALIDADE || 0
            ),

          idBeneficiario:
            ativo.ID_BENEFICIARIO,

          tipoBeneficiario:
            ativo.CD_TIPO_BENEFICIARIO,

          nomeTipoBeneficiario:
            ativo.NM_TIPO_BENEFICIARIO,

          idOperadora:
            ativo.ID_OPERADORA,

          operadora:
            ativo.NM_OPERADORA,

          idPlano:
            ativo.ID_PLANO,

          plano:
            ativo.NM_PLANO,

          tipoCobranca:
            ativo.TP_COBRANCA,

          valorMensalidade:
            Number(
              ativo.VL_MENSALIDADE || 0
            ),

          dataInicioVigenciaValor:
            ativo.DT_VIGENCIA_INICIO,

          dataFimVigenciaValor:
            ativo.DT_VIGENCIA_FIM,
        });
      }

      const historicoSql = `
      SELECT
        B.ID_BENEFICIARIO,
        B.NM_BENEFICIARIO,
        B.NR_CPF,
        B.DT_INCLUSAO_PLANO,
        B.DT_EXCLUSAO_PLANO,

        TB.CD_TIPO_BENEFICIARIO,
        TB.NM_TIPO_BENEFICIARIO,

        P.ID_PLANO,
        P.NM_PLANO,
        P.TP_COBRANCA,

        O.ID_OPERADORA,
        O.NM_OPERADORA

      FROM DBACRESSEM.ODONTO_BENEFICIARIO B

      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
        ON TB.ID_TIPO_BENEFICIARIO =
           B.ID_TIPO_BENEFICIARIO

      INNER JOIN DBACRESSEM.ODONTO_PLANO P
        ON P.ID_PLANO =
           B.ID_PLANO

      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
        ON O.ID_OPERADORA =
           P.ID_OPERADORA

      WHERE REGEXP_REPLACE(
        B.NR_CPF,
        '[^0-9]',
        ''
      ) = :documento

        AND B.SN_ATIVO = 0

      ORDER BY
        B.DT_EXCLUSAO_PLANO DESC NULLS LAST,
        B.ID_BENEFICIARIO DESC

      FETCH FIRST 1 ROWS ONLY
    `;

      const historicoResult =
        await oracleExecute(
          historicoSql,
          { documento },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      const historico: any =
        historicoResult.rows?.[0];

      if (historico) {
        return res.json({
          situacao: "INATIVO",

          titular_ativo: false,

          total_custo: 0,

          idBeneficiario:
            historico.ID_BENEFICIARIO,

          tipoBeneficiario:
            historico.CD_TIPO_BENEFICIARIO,

          nomeTipoBeneficiario:
            historico.NM_TIPO_BENEFICIARIO,

          operadora:
            historico.NM_OPERADORA,

          plano:
            historico.NM_PLANO,

          tipoCobranca:
            historico.TP_COBRANCA,

          dataInclusaoPlano:
            historico.DT_INCLUSAO_PLANO,

          dataExclusaoPlano:
            historico.DT_EXCLUSAO_PLANO,
        });
      }

      return res.json({
        situacao: "NAO_ENCONTRADO",
        titular_ativo: false,
        total_custo: 0,
      });
    } catch (error: any) {
      console.error(
        "Erro ao buscar convênio demissão:",
        error
      );

      return res.status(500).json({
        error:
          "Erro ao consultar convênio odontológico",
        details:
          error.message,
      });
    }
  },

  async desativarConvenio(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(String(req.params.cpf || ""));
      const atendente = String(req.body?.atendente || "Atendente");

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const buscarSql = `
        SELECT
          p.ID_CONVENIO_PESSOAS,
          p.NM_USUARIO,
          p.NR_CPF_USUARIO,
          p.NR_CPF_TITULAR,
          p.DESC_PARENTESCO
        FROM DBACRESSEM.CONVENIO_PESSOAS p
        WHERE p.SN_ATIVO = 1
          AND (
            REGEXP_REPLACE(p.NR_CPF_TITULAR, '[^0-9]', '') = :documento
            OR REGEXP_REPLACE(p.NR_CPF_USUARIO, '[^0-9]', '') = :documento
          )
      `;

      const busca = await oracleExecute(
        buscarSql,
        { documento },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const pessoas: any[] = busca.rows || [];

      if (!pessoas.length) {
        return res.status(404).json({
          error: "Nenhum convênio ativo encontrado para desativação.",
          desativados: 0,
          email_enviado: false,
        });
      }

      const documentoTitular =
        pessoas.find((p) => p.NR_CPF_TITULAR)?.NR_CPF_TITULAR || documento;

      const ids = pessoas.map((p) => p.ID_CONVENIO_PESSOAS);

      const updateSql = `
        UPDATE DBACRESSEM.CONVENIO_PESSOAS
        SET
          SN_ATIVO = 0,
          DT_EXCLUSAO = SYSDATE,
          NM_ATENDENTE_EDICAO = :atendente
        WHERE ID_CONVENIO_PESSOAS IN (${ids.map((_, i) => `:id${i}`).join(",")})
      `;

      const binds: any = { atendente };

      ids.forEach((id, index) => {
        binds[`id${index}`] = id;
      });

      await oracleExecuteCommitWithAudit(
        req,
        updateSql,
        binds,
        {} as any
      );

      const pessoasComExclusao = pessoas.map((p) => ({
        ...p,
        DT_EXCLUSAO: new Date().toLocaleDateString("pt-BR"),
      }));

      const destinatarios = [
        "lucio.guska@sicoob.com.br",
        "cleandiza.santos@sicoob.com.br",
        "diego.adriano@sicoob.com.br",
        "cadastro.cressem@sicoob.com.br",
        "misael.oliveira@sicoob.com.br",
        "marcelo.bueno@sicoob.com.br",
        "monica.torres@sicoob.com.br",
      ];

      const assunto = `[Odonto] Desativação via Demissão concluída - CPF/CNPJ Titular ${documentoTitular}`;

      const html = montarEmailConvenioHtml(documentoTitular, pessoasComExclusao);

      await sendEmail(destinatarios, assunto, html);

      return res.json({
        desativados: pessoasComExclusao.length,
        email_enviado: true,
        atendente,
        cpf_titular: documentoTitular,
        pessoas: pessoasComExclusao,
      });
    } catch (error: any) {
      console.error("Erro ao desativar convênio demissão:", error);

      return res.status(500).json({
        error: "Erro ao desativar convênio odontológico",
        details: error.message,
        email_enviado: false,
      });
    }
  },

  async buscarMotivos(req: Request, res: Response) {
    try {
      const sql = `
      SELECT
        NM_MOTIVO AS VALUE,
        NM_MOTIVO AS LABEL
      FROM DBACRESSEM.MOTIVO_DEMISSAO
      WHERE SN_ATIVO = 1
      ORDER BY NM_MOTIVO
    `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao buscar motivos demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar motivos da demissão",
        details: error.message,
      });
    }
  },

  async buscarCidades(req: Request, res: Response) {
    try {
      const sql = `
      SELECT
        NM_CIDADE AS VALUE,
        NM_CIDADE AS LABEL
      FROM DBACRESSEM.CIDADES
      ORDER BY NM_CIDADE
    `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao buscar cidades demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar cidades",
        details: error.message,
      });
    }
  },
};
