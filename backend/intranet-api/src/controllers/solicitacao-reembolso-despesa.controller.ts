import { Request, Response } from "express";
import oracledb from "oracledb";
import fs from "fs/promises";
import path from "path";
import { getOraclePool } from "../config/oracle.pool";
import { sendEmail } from "../services/email.service";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function toNumber(v: any, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;

  if (typeof v === "string") {
    const normalized = v.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonIfNeeded<T = any>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
  };

  return map[mime] || "";
}

function sanitizeFileName(name: string) {
  return String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "_");
}

function parseBase64File(dataUrl: string | null, nomeOriginal?: string | null) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  let ext = path.extname(nomeOriginal || "");
  if (!ext) ext = extFromMime(mime) || ".bin";

  return {
    buffer,
    mime,
    ext,
    nomeOriginal: sanitizeFileName(nomeOriginal || `arquivo${ext}`),
  };
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removeFileIfExists(filePath: string | null | undefined) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // ignora se não existir
  }
}

async function salvarComprovante(
  dataUrl: string | null,
  nomeOriginal: string | null | undefined,
  idSolicitacao: number,
  indice: number
) {
  const parsed = parseBase64File(dataUrl, nomeOriginal);
  if (!parsed) return null;

  const uploadDir = path.resolve(process.cwd(), "uploads", "reembolso_despesa");
  await ensureDir(uploadDir);

  const timestamp = Date.now();
  const finalName = `${idSolicitacao}_${indice}_${timestamp}_${sanitizeFileName(
    parsed.nomeOriginal
  )}`;

  const finalPath = path.join(uploadDir, finalName);

  await fs.writeFile(finalPath, parsed.buffer);

  return finalPath;
}

function validarCamposPrincipais(body: any) {
  const cpf = onlyDigits(body.NR_CPF_FUNCIONARIO);

  if (!body.NM_FUNCIONARIO) return "Preencha NM_FUNCIONARIO.";
  if (cpf.length !== 11) return "NR_CPF_FUNCIONARIO inválido.";
  if (!body.DT_IDA) return "Preencha DT_IDA.";
  if (!body.DT_VOLTA) return "Preencha DT_VOLTA.";
  if (!body.DESC_JTF_EVENTO) return "Preencha DESC_JTF_EVENTO.";
  if (!body.NM_CIDADE) return "Preencha NM_CIDADE.";
  if (!body.NR_BANCO) return "Preencha NR_BANCO.";
  if (!body.CD_AGENCIA) return "Preencha CD_AGENCIA.";
  if (!body.NR_CONTA) return "Preencha NR_CONTA.";

  const despesas = parseJsonIfNeeded<any[]>(body.DESPESAS, []);
  if (!Array.isArray(despesas) || !despesas.length) {
    return "Informe ao menos uma despesa em DESPESAS.";
  }

  return null;
}

async function getNextSolicitacaoId(connection: oracledb.Connection) {
  const result = await connection.execute(
    `
      SELECT NVL(MAX(ID_SOLICITACAO_REEMBOLSO_DESPESA), 0) + 1 AS NEXT_ID
      FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  return Number(row?.NEXT_ID || 1);
}

async function getNextDespesaId(connection: oracledb.Connection) {
  const result = await connection.execute(
    `
      SELECT NVL(MAX(ID_DESPESA_SOLICITADA), 0) + 1 AS NEXT_ID
      FROM DBACRESSEM.DESPESA_SOLICITADA
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row: any = result.rows?.[0];
  return Number(row?.NEXT_ID || 1);
}

function getEmailFinanceiro() {
  return process.env.REEMBOLSO_FINANCEIRO_EMAIL || process.env.FINANCEIRO_EMAIL || "";
}

function formatDateBR(value?: string) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function formatCurrencyBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function montarHtmlEmailReembolso(params: {
  idSolicitacao: number;
  nomeFuncionario: string;
  cpfFuncionario: string;
  cidade: string;
  dtIda: string;
  dtVolta: string;
  justificativa: string;
  despesas: any[];
}) {
  const total = (params.despesas || []).reduce(
    (acc, item) => acc + Number(toNumber(item?.VALOR, 0)),
    0
  );

  const despesasHtml = (params.despesas || [])
    .map((despesa, index) => {
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${despesa?.TP_DESPESA || ""}</td>
          <td style="padding:8px;border:1px solid #ddd;">${despesa?.DESC_DESPESA || ""}</td>
          <td style="padding:8px;border:1px solid #ddd;">${formatCurrencyBRL(
        toNumber(despesa?.VALOR, 0)
      )}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h2 style="margin-bottom:16px;">Nova solicitação de reembolso de despesa</h2>

      <p>
        Uma nova solicitação foi cadastrada no sistema e está aguardando análise do financeiro.
      </p>

      <table style="border-collapse:collapse;width:100%;margin-top:16px;margin-bottom:20px;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>ID da Solicitação</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${params.idSolicitacao}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Funcionário</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${params.nomeFuncionario}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>CPF</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${params.cpfFuncionario}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Cidade</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${params.cidade}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Data Ida</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${formatDateBR(params.dtIda)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Data Volta</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${formatDateBR(params.dtVolta)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Justificativa</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${params.justificativa}</td>
        </tr>
      </table>

      <h3 style="margin:16px 0 8px;">Despesas informadas</h3>

      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">#</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Tipo</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Descrição</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${despesasHtml}
          <tr>
            <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;"><strong>Total</strong></td>
            <td style="padding:8px;border:1px solid #ddd;"><strong>${formatCurrencyBRL(total)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

export const solicitacaoReembolsoDespesaController = {
  async cadastrar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const erroValidacao = validarCamposPrincipais(req.body);
      if (erroValidacao) {
        return res.status(400).json({ error: erroValidacao });
      }

      const despesas = parseJsonIfNeeded<any[]>(req.body.DESPESAS, []);
      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const idSolicitacao = await getNextSolicitacaoId(connection);

      const insertSolicitacaoSql = `
        INSERT INTO DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA (
          ID_SOLICITACAO_REEMBOLSO_DESPESA,
          NM_FUNCIONARIO,
          NR_CPF_FUNCIONARIO,
          DT_IDA,
          DT_VOLTA,
          DESC_JTF_EVENTO,
          NM_CIDADE,
          NR_BANCO,
          CD_AGENCIA,
          NR_CONTA,
          DESC_ANDAMENTO
        ) VALUES (
          :ID_SOLICITACAO_REEMBOLSO_DESPESA,
          :NM_FUNCIONARIO,
          :NR_CPF_FUNCIONARIO,
          TO_DATE(:DT_IDA, 'YYYY-MM-DD'),
          TO_DATE(:DT_VOLTA, 'YYYY-MM-DD'),
          :DESC_JTF_EVENTO,
          :NM_CIDADE,
          :NR_BANCO,
          :CD_AGENCIA,
          :NR_CONTA,
          :DESC_ANDAMENTO
        )
      `;

      await connection.execute(insertSolicitacaoSql, {
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
        NM_FUNCIONARIO: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
        NR_CPF_FUNCIONARIO: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
        DT_IDA: req.body.DT_IDA,
        DT_VOLTA: req.body.DT_VOLTA,
        DESC_JTF_EVENTO: req.body.DESC_JTF_EVENTO,
        NM_CIDADE: req.body.NM_CIDADE,
        NR_BANCO: req.body.NR_BANCO,
        CD_AGENCIA: req.body.CD_AGENCIA,
        NR_CONTA: req.body.NR_CONTA,
        DESC_ANDAMENTO: req.body.DESC_ANDAMENTO || "Pendente Financeiro",
      });

      const insertDespesaSql = `
        INSERT INTO DBACRESSEM.DESPESA_SOLICITADA (
          ID_DESPESA_SOLICITADA,
          ID_SOLICITACAO,
          TP_DESPESA,
          DESC_DESPESA,
          VALOR,
          COMPROVANTE
        ) VALUES (
          :ID_DESPESA_SOLICITADA,
          :ID_SOLICITACAO,
          :TP_DESPESA,
          :DESC_DESPESA,
          :VALOR,
          :COMPROVANTE
        )
      `;

      let nextDespesaId = await getNextDespesaId(connection);

      for (let i = 0; i < despesas.length; i++) {
        const despesa = despesas[i];

        const comprovantePath = await salvarComprovante(
          despesa?.COMPROVANTE || null,
          despesa?.COMPROVANTE_NOME || null,
          idSolicitacao,
          i + 1
        );

        await connection.execute(insertDespesaSql, {
          ID_DESPESA_SOLICITADA: nextDespesaId,
          ID_SOLICITACAO: idSolicitacao,
          TP_DESPESA: despesa?.TP_DESPESA || "",
          DESC_DESPESA: despesa?.DESC_DESPESA || "",
          VALOR: toNumber(despesa?.VALOR, 0),
          COMPROVANTE: comprovantePath,
        });

        nextDespesaId += 1;
      }

      await connection.commit();

      let emailEnviado = false;
      let emailErro = "";

      try {
        const emailFinanceiro = getEmailFinanceiro();

        if (!emailFinanceiro) {
          throw new Error(
            "Configure REEMBOLSO_FINANCEIRO_EMAIL ou FINANCEIRO_EMAIL no ambiente."
          );
        }

        const subject = `Nova solicitação de reembolso #${idSolicitacao} - ${String(
          req.body.NM_FUNCIONARIO || ""
        ).toUpperCase()}`;

        const html = montarHtmlEmailReembolso({
          idSolicitacao,
          nomeFuncionario: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
          cpfFuncionario: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
          cidade: String(req.body.NM_CIDADE || ""),
          dtIda: String(req.body.DT_IDA || ""),
          dtVolta: String(req.body.DT_VOLTA || ""),
          justificativa: String(req.body.DESC_JTF_EVENTO || ""),
          despesas,
        });

        console.log("[REEMBOLSO] Iniciando envio de email para o financeiro...");
        console.log("[REEMBOLSO] Destinatário(s):", emailFinanceiro);

        await sendEmail(emailFinanceiro, subject, html);

        emailEnviado = true;
        console.log("[REEMBOLSO] Email enviado com sucesso.");
      } catch (emailErr: any) {
        emailErro = String(emailErr?.message || emailErr);
        console.error("[REEMBOLSO] Erro ao enviar email:", emailErr);
      }

      return res.status(201).json({
        success: true,
        message: emailEnviado
          ? "Solicitação cadastrada com sucesso e email enviado ao financeiro."
          : "Solicitação cadastrada com sucesso, mas o email não pôde ser enviado.",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
        emailEnviado,
        ...(emailErro ? { emailErro } : {}),
      });
    } catch (err: any) {
      console.error("cadastrar reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao cadastrar solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async editar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.body.ID_SOLICITACAO_REEMBOLSO_DESPESA);

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({
          error: "ID_SOLICITACAO_REEMBOLSO_DESPESA inválido.",
        });
      }

      const erroValidacao = validarCamposPrincipais(req.body);
      if (erroValidacao) {
        return res.status(400).json({ error: erroValidacao });
      }

      const despesas = parseJsonIfNeeded<any[]>(req.body.DESPESAS, []);
      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const despesasAntigas = await connection.execute(
        `
          SELECT COMPROVANTE
          FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
        `,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const updateSolicitacaoSql = `
        UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
           SET NM_FUNCIONARIO      = :NM_FUNCIONARIO,
               NR_CPF_FUNCIONARIO  = :NR_CPF_FUNCIONARIO,
               DT_IDA              = TO_DATE(:DT_IDA, 'YYYY-MM-DD'),
               DT_VOLTA            = TO_DATE(:DT_VOLTA, 'YYYY-MM-DD'),
               DESC_JTF_EVENTO     = :DESC_JTF_EVENTO,
               NM_CIDADE           = :NM_CIDADE,
               NR_BANCO            = :NR_BANCO,
               CD_AGENCIA          = :CD_AGENCIA,
               NR_CONTA            = :NR_CONTA,
               DESC_ANDAMENTO      = :DESC_ANDAMENTO
         WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :ID_SOLICITACAO_REEMBOLSO_DESPESA
      `;

      const resultUpdate = await connection.execute(updateSolicitacaoSql, {
        NM_FUNCIONARIO: String(req.body.NM_FUNCIONARIO || "").toUpperCase(),
        NR_CPF_FUNCIONARIO: onlyDigits(req.body.NR_CPF_FUNCIONARIO),
        DT_IDA: req.body.DT_IDA,
        DT_VOLTA: req.body.DT_VOLTA,
        DESC_JTF_EVENTO: req.body.DESC_JTF_EVENTO,
        NM_CIDADE: req.body.NM_CIDADE,
        NR_BANCO: req.body.NR_BANCO,
        CD_AGENCIA: req.body.CD_AGENCIA,
        NR_CONTA: req.body.NR_CONTA,
        DESC_ANDAMENTO: req.body.DESC_ANDAMENTO || "Pendente Financeiro",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
      });

      if (!resultUpdate.rowsAffected) {
        await connection.rollback();
        return res.status(404).json({
          error: "Solicitação não encontrada para edição.",
        });
      }

      await connection.execute(
        `
          DELETE FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
        `,
        { id: idSolicitacao }
      );

      const linhasAntigas = (despesasAntigas.rows || []) as any[];
      for (const row of linhasAntigas) {
        await removeFileIfExists(row.COMPROVANTE);
      }

      const insertDespesaSql = `
        INSERT INTO DBACRESSEM.DESPESA_SOLICITADA (
          ID_DESPESA_SOLICITADA,
          ID_SOLICITACAO,
          TP_DESPESA,
          DESC_DESPESA,
          VALOR,
          COMPROVANTE
        ) VALUES (
          :ID_DESPESA_SOLICITADA,
          :ID_SOLICITACAO,
          :TP_DESPESA,
          :DESC_DESPESA,
          :VALOR,
          :COMPROVANTE
        )
      `;

      let nextDespesaId = await getNextDespesaId(connection);

      for (let i = 0; i < despesas.length; i++) {
        const despesa = despesas[i];

        const comprovantePath = await salvarComprovante(
          despesa?.COMPROVANTE || null,
          despesa?.COMPROVANTE_NOME || null,
          idSolicitacao,
          i + 1
        );

        await connection.execute(insertDespesaSql, {
          ID_DESPESA_SOLICITADA: nextDespesaId,
          ID_SOLICITACAO: idSolicitacao,
          TP_DESPESA: despesa?.TP_DESPESA || "",
          DESC_DESPESA: despesa?.DESC_DESPESA || "",
          VALOR: toNumber(despesa?.VALOR, 0),
          COMPROVANTE: comprovantePath,
        });

        nextDespesaId += 1;
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Solicitação atualizada com sucesso.",
        ID_SOLICITACAO_REEMBOLSO_DESPESA: idSolicitacao,
      });
    } catch (err: any) {
      console.error("editar reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao atualizar solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async decidir(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.params.id);
      const nomeResponsavel = decodeURIComponent(
        String(req.params.nomeResponsavel || "")
      ).trim();
      const acao = String(req.body?.acao || "").trim().toLowerCase();
      const parecer = String(req.body?.parecer || "").trim();

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({ error: "ID da solicitação inválido." });
      }

      if (!nomeResponsavel) {
        return res.status(400).json({ error: "Nome do responsável não informado." });
      }

      if (!acao || !["aprovar", "reprovar", "devolver"].includes(acao)) {
        return res.status(400).json({
          error: "Ação inválida. Use aprovar, reprovar ou devolver.",
        });
      }

      if (!parecer) {
        return res.status(400).json({ error: "Parecer não informado." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const resultAtual = await connection.execute(
        `
        SELECT
          ID_SOLICITACAO_REEMBOLSO_DESPESA,
          DESC_ANDAMENTO
        FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
        WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
      `,
        { id: idSolicitacao },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!resultAtual.rows?.length) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const atual: any = resultAtual.rows[0];
      const andamentoAtual = String(atual.DESC_ANDAMENTO || "");

      let sql = "";
      let binds: Record<string, any> = {
        id: idSolicitacao,
        parecer,
        nomeResponsavel,
      };

      if (andamentoAtual === "Pendente Financeiro") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_FINANCEIRO = :parecer,
                 NM_FNC_FINANCEIRO = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Gerencia'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else if (acao === "devolver") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_FINANCEIRO = :parecer,
                 NM_FNC_FINANCEIRO = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Funcionario'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Financeiro. Use aprovar ou devolver.",
          });
        }
      } else if (andamentoAtual === "Pendente Gerencia") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA = :parecer,
                 NM_FNC_GERENCIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Gerencia Superior'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA = :parecer,
                 NM_FNC_GERENCIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Gerencia. Use aprovar ou reprovar.",
          });
        }
      } else if (andamentoAtual === "Pendente Gerencia Superior") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA_SUP = :parecer,
                 NM_FNC_GERENCIA_SUP = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Pendente Diretoria'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_GERENCIA_SUP = :parecer,
                 NM_FNC_GERENCIA_SUP = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Gerencia Superior. Use aprovar ou reprovar.",
          });
        }
      } else if (andamentoAtual === "Pendente Diretoria") {
        if (acao === "aprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_DIRETORIA = :parecer,
                 NM_FNC_DIRETORIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Aprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else if (acao === "reprovar") {
          sql = `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_PRC_DIRETORIA = :parecer,
                 NM_FNC_DIRETORIA = :nomeResponsavel,
                 DESC_ANDAMENTO = 'Reprovado'
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `;
        } else {
          return res.status(400).json({
            error: "Ação inválida para Pendente Diretoria. Use aprovar ou reprovar.",
          });
        }
      } else {
        return res.status(400).json({
          error: `Não é possível decidir uma solicitação com status "${andamentoAtual}".`,
        });
      }

      const resultUpdate = await connection.execute(sql, binds);

      if (!resultUpdate.rowsAffected) {
        await connection.rollback();
        return res.status(404).json({ error: "Solicitação não encontrada para atualização." });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Solicitação atualizada com sucesso.",
        id: idSolicitacao,
        acao,
      });
    } catch (err: any) {
      console.error("decidir reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao decidir solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async concluir(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idSolicitacao = Number(req.params.id);

      if (!Number.isFinite(idSolicitacao) || idSolicitacao <= 0) {
        return res.status(400).json({ error: "ID da solicitação inválido." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const result = await connection.execute(
        `
        UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
           SET SN_FINALIZADO = 'S'
         WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
           AND DESC_ANDAMENTO = 'Aprovado'
      `,
        { id: idSolicitacao }
      );

      if (!result.rowsAffected) {
        await connection.rollback();
        return res.status(400).json({
          error: "Só é possível concluir solicitações aprovadas e ainda não finalizadas.",
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Solicitação concluída com sucesso.",
        id: idSolicitacao,
      });
    } catch (err: any) {
      console.error("concluir reembolso despesa erro:", err);

      if (connection) {
        try {
          await connection.rollback();
        } catch { }
      }

      return res.status(500).json({
        error: "Falha ao concluir solicitação de reembolso.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async buscarPorId(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const pool = await getOraclePool();
      connection = await pool.getConnection();

      const resultSolicitacao = await connection.execute(
        `
          SELECT
            ID_SOLICITACAO_REEMBOLSO_DESPESA,
            NM_FUNCIONARIO,
            NR_CPF_FUNCIONARIO,
            TO_CHAR(DT_IDA, 'YYYY-MM-DD') AS DT_IDA,
            TO_CHAR(DT_VOLTA, 'YYYY-MM-DD') AS DT_VOLTA,
            DESC_JTF_EVENTO,
            NM_CIDADE,
            NR_BANCO,
            CD_AGENCIA,
            NR_CONTA,
            DESC_ANDAMENTO
          FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
          WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!resultSolicitacao.rows?.length) {
        return res.status(404).json({ error: "Solicitação não encontrada." });
      }

      const solicitacao: any = resultSolicitacao.rows[0];

      const resultDespesas = await connection.execute(
        `
          SELECT
            ID_DESPESA_SOLICITADA,
            TP_DESPESA,
            DESC_DESPESA,
            VALOR,
            COMPROVANTE
          FROM DBACRESSEM.DESPESA_SOLICITADA
          WHERE ID_SOLICITACAO = :id
          ORDER BY ID_DESPESA_SOLICITADA
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const despesas = (resultDespesas.rows || []).map((row: any) => ({
        ID_DESPESA_SOLICITADA: row.ID_DESPESA_SOLICITADA,
        TP_DESPESA: row.TP_DESPESA || "",
        DESC_DESPESA: row.DESC_DESPESA || "",
        VALOR: Number(row.VALOR || 0),
        COMPROVANTE: row.COMPROVANTE || null,
        COMPROVANTE_NOME: row.COMPROVANTE
          ? path.basename(String(row.COMPROVANTE))
          : null,
      }));

      return res.json({
        ...solicitacao,
        DESPESAS: despesas,
      });
    } catch (err: any) {
      console.error("buscarPorId reembolso despesa erro:", err);

      return res.status(500).json({
        error: "Falha ao buscar solicitação.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch { }
      }
    }
  },

  async downloadComprovante(req: Request, res: Response) {
    try {
      const oficio = String(req.body?.oficio || req.query?.oficio || "");

      if (!oficio) {
        return res.status(400).json({ error: "Arquivo não informado." });
      }

      const filePath = path.isAbsolute(oficio)
        ? oficio
        : path.resolve(process.cwd(), oficio);

      await fs.access(filePath);

      return res.download(filePath, path.basename(filePath));
    } catch (err: any) {
      console.error("downloadComprovante erro:", err);
      return res.status(404).json({
        error: "Arquivo não encontrado.",
        details: String(err?.message || err),
      });
    }
  },
};