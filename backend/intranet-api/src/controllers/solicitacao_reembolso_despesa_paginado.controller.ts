import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeLike(value: string) {
    return `%${String(value || "").trim().toUpperCase()}%`;
}

function parsePage(value: any, fallback = 1) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseLimit(value: any, fallback = 10) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const solicitacaoReembolsoDespesaPaginadoController = {
    async listar(req: Request, res: Response) {
        try {
            const pesquisa = String(req.query.pesquisa || "").trim();
            const nome = String(req.query.nome || "").trim().toUpperCase();
            const page = parsePage(req.query.page, 1);
            const limit = parseLimit(req.query.limit, 10);
            const offset = (page - 1) * limit;

            const pesquisaUpper = pesquisa.toUpperCase();
            const pesquisaCpf = onlyDigits(pesquisa);

            const countBinds: Record<string, any> = {
                nome1: nome || " ",
                nome2: nome || " ",
                nome3: nome || " ",
                nome4: nome || " ",
                nome5: nome || " ",
                nome6: nome || " ",
                pesq1: normalizeLike(pesquisaUpper || " "),
                pesq2: normalizeLike(pesquisaUpper || " "),
                pesq3: normalizeLike(pesquisaUpper || " "),
                pesq4: normalizeLike(pesquisaUpper || " "),
                cpf1: pesquisaCpf || "00000000000",
            };

            const whereSql = `
      WHERE (
        :nome1 = ' '
        OR UPPER(s.NM_FUNCIONARIO) = :nome2
        OR UPPER(NVL(s.NM_FNC_FINANCEIRO, ' ')) = :nome3
        OR UPPER(NVL(s.NM_FNC_GERENCIA, ' ')) = :nome4
        OR UPPER(NVL(s.NM_FNC_GERENCIA_SUP, ' ')) = :nome5
        OR UPPER(NVL(s.NM_FNC_DIRETORIA, ' ')) = :nome6
      )
      AND (
        :pesq1 = '% %'
        OR UPPER(NVL(s.NM_FUNCIONARIO, ' ')) LIKE :pesq2
        OR UPPER(NVL(s.DESC_ANDAMENTO, ' ')) LIKE :pesq3
        OR UPPER(NVL(s.NM_CIDADE, ' ')) LIKE :pesq4
        OR REGEXP_REPLACE(NVL(s.NR_CPF_FUNCIONARIO, ' '), '[^0-9]', '') LIKE '%' || :cpf1 || '%'
      )
    `;

            const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA s
      ${whereSql}
    `;

            const countResult = await oracleExecute(
                countSql,
                countBinds,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
            const totalPages = Math.max(1, Math.ceil(total / limit));

            const listBinds: Record<string, any> = {
                nome1: nome || " ",
                nome2: nome || " ",
                nome3: nome || " ",
                nome4: nome || " ",
                nome5: nome || " ",
                nome6: nome || " ",
                nome7: nome || " ",
                nome8: nome || " ",
                nome9: nome || " ",
                nome10: nome || " ",
                pesq1: normalizeLike(pesquisaUpper || " "),
                pesq2: normalizeLike(pesquisaUpper || " "),
                pesq3: normalizeLike(pesquisaUpper || " "),
                pesq4: normalizeLike(pesquisaUpper || " "),
                cpf1: pesquisaCpf || "00000000000",
                offset,
                limit,
            };

            const listSql = `
      SELECT
        s.ID_SOLICITACAO_REEMBOLSO_DESPESA,
        s.NM_FUNCIONARIO,
        s.NR_CPF_FUNCIONARIO,
        TO_CHAR(s.DT_IDA, 'YYYY-MM-DD') AS DT_IDA,
        TO_CHAR(s.DT_VOLTA, 'YYYY-MM-DD') AS DT_VOLTA,
        s.DESC_JTF_EVENTO,
        s.NM_CIDADE,
        s.NR_BANCO,
        s.CD_AGENCIA,
        s.NR_CONTA,
        s.DESC_ANDAMENTO,
        s.SN_FINALIZADO,

        s.DESC_PRC_FINANCEIRO,
        s.NM_FNC_FINANCEIRO,
        s.DESC_PRC_GERENCIA,
        s.NM_FNC_GERENCIA,
        s.DESC_PRC_GERENCIA_SUP,
        s.NM_FNC_GERENCIA_SUP,
        s.DESC_PRC_DIRETORIA,
        s.NM_FNC_DIRETORIA,

        s.ID_SOLICITANTE,
        s.ID_APROV_GERENCIA,
        s.ID_APROV_GERENCIA_SUP,
        s.ID_APROV_DIRETORIA,

        CASE
          WHEN s.ID_APROV_GERENCIA IS NOT NULL THEN 1
          ELSE 0
        END AS HAS_GERENCIA,

        CASE
          WHEN s.ID_APROV_GERENCIA_SUP IS NOT NULL THEN 1
          ELSE 0
        END AS HAS_GERENCIA_SUP,

        s.NM_FNC_GERENCIA AS APROV_GERENCIA_NOME,
        s.NM_FNC_GERENCIA_SUP AS APROV_GERENCIA_SUP_NOME,
        s.NM_FNC_DIRETORIA AS APROV_DIRETORIA_NOME,

        CASE
          WHEN UPPER(NVL(s.NM_FNC_FINANCEIRO, ' ')) = :nome7 THEN 'financeiro'
          WHEN UPPER(NVL(s.NM_FNC_GERENCIA, ' ')) = :nome8 THEN 'gerencia'
          WHEN UPPER(NVL(s.NM_FNC_GERENCIA_SUP, ' ')) = :nome9 THEN 'gerencia superior'
          WHEN UPPER(NVL(s.NM_FNC_DIRETORIA, ' ')) = :nome10 THEN 'diretoria'
          ELSE 'funcionario'
        END AS TIPO_USUARIO
      FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA s
      ${whereSql}
      ORDER BY s.ID_SOLICITACAO_REEMBOLSO_DESPESA DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

            const result = await oracleExecute(
                listSql,
                listBinds,
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const itemsRaw = (result.rows || []) as any[];
            const ids = itemsRaw.map((item) => item.ID_SOLICITACAO_REEMBOLSO_DESPESA);

            let despesasMap = new Map<number, any[]>();

            if (ids.length) {
                const placeholders = ids.map((_, idx) => `:id${idx}`).join(", ");
                const despesaBinds: Record<string, any> = {};

                ids.forEach((id, idx) => {
                    despesaBinds[`id${idx}`] = id;
                });

                const despesasSql = `
        SELECT
          d.ID_DESPESA_SOLICITADA,
          d.ID_SOLICITACAO,
          d.TP_DESPESA,
          d.DESC_DESPESA,
          d.VALOR,
          d.COMPROVANTE
        FROM DBACRESSEM.DESPESA_SOLICITADA d
        WHERE d.ID_SOLICITACAO IN (${placeholders})
        ORDER BY d.ID_DESPESA_SOLICITADA
      `;

                const despesasResult = await oracleExecute(
                    despesasSql,
                    despesaBinds,
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );

                const despesasRows = (despesasResult.rows || []) as any[];

                despesasMap = despesasRows.reduce((map, row) => {
                    const idSolicitacao = Number(row.ID_SOLICITACAO);
                    const atual = map.get(idSolicitacao) || [];

                    atual.push({
                        ID_DESPESA_SOLICITADA: row.ID_DESPESA_SOLICITADA,
                        TP_DESPESA: row.TP_DESPESA || "",
                        DESC_DESPESA: row.DESC_DESPESA || "",
                        VALOR: Number(row.VALOR || 0),
                        COMPROVANTE: row.COMPROVANTE || null,
                    });

                    map.set(idSolicitacao, atual);
                    return map;
                }, new Map<number, any[]>());
            }

            const items = itemsRaw.map((item) => {
                const idSolicitacao = Number(item.ID_SOLICITACAO_REEMBOLSO_DESPESA);
                const despesas = despesasMap.get(idSolicitacao) || [];

                return {
                    ID_SOLICITACAO_REEMBOLSO_DESPESA: item.ID_SOLICITACAO_REEMBOLSO_DESPESA,
                    NM_FUNCIONARIO: item.NM_FUNCIONARIO || "",
                    NR_CPF_FUNCIONARIO: item.NR_CPF_FUNCIONARIO || "",
                    DT_IDA: item.DT_IDA || "",
                    DT_VOLTA: item.DT_VOLTA || "",
                    DESC_JTF_EVENTO: item.DESC_JTF_EVENTO || "",
                    NM_CIDADE: item.NM_CIDADE || "",
                    NR_BANCO: item.NR_BANCO || "",
                    CD_AGENCIA: item.CD_AGENCIA || "",
                    NR_CONTA: item.NR_CONTA || "",
                    DESC_ANDAMENTO: item.DESC_ANDAMENTO || "",
                    SN_FINALIZADO: Number(item.SN_FINALIZADO || 0),

                    DESC_PRC_FINANCEIRO: item.DESC_PRC_FINANCEIRO || "",
                    NM_FNC_FINANCEIRO: item.NM_FNC_FINANCEIRO || "",
                    DESC_PRC_GERENCIA: item.DESC_PRC_GERENCIA || "",
                    NM_FNC_GERENCIA: item.NM_FNC_GERENCIA || "",
                    DESC_PRC_GERENCIA_SUP: item.DESC_PRC_GERENCIA_SUP || "",
                    NM_FNC_GERENCIA_SUP: item.NM_FNC_GERENCIA_SUP || "",
                    DESC_PRC_DIRETORIA: item.DESC_PRC_DIRETORIA || "",
                    NM_FNC_DIRETORIA: item.NM_FNC_DIRETORIA || "",

                    HAS_GERENCIA: Number(item.HAS_GERENCIA || 0),
                    HAS_GERENCIA_SUP: Number(item.HAS_GERENCIA_SUP || 0),

                    APROV_GERENCIA_NOME: item.APROV_GERENCIA_NOME || "",
                    APROV_GERENCIA_SUP_NOME: item.APROV_GERENCIA_SUP_NOME || "",
                    APROV_DIRETORIA_NOME: item.APROV_DIRETORIA_NOME || "",

                    TIPO_USUARIO: item.TIPO_USUARIO || "funcionario",

                    DESPESAS: despesas,
                    despesas,
                };
            });

            return res.json({
                items,
                page,
                limit,
                total,
                total_pages: totalPages,
            });
        } catch (err: any) {
            console.error("listar solicitacao_reembolso_despesa_paginado erro:", err);
            return res.status(500).json({
                error: "Falha ao listar solicitações de reembolso.",
                details: String(err?.message || err),
            });
        }
    },
};