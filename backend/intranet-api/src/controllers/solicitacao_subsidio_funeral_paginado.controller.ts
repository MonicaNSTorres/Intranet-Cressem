import { Response } from "express";
import oracledb from "oracledb";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
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

function toUpperTrim(value: any) {
  return String(value || "").trim().toUpperCase();
}

function hasGroup(grupos: string[], target: string) {
  const alvo = toUpperTrim(target);
  return grupos.some((grupo) => toUpperTrim(grupo) === alvo);
}

const AD_GROUP_SUPORTE = "GG_USERS_SUPORTE";
const AD_GROUP_FINANCEIRO = "GG_USERS_FIN";
const AD_GROUP_FINANCEIRO_CADASTRO = "GG_INTRANET_CADASTRO_FIN";
const AD_GROUP_GERENCIA_DIRETORIA = "GG_USERS_GERENCIA_DIRETORIA";

export const solicitacaoSubsidioFuneralPaginadoController = {
  async listar(req: AuthenticatedRequest, res: Response) {
    try {
      const pesquisa = String(req.query.pesquisa || "").trim().toUpperCase();
      const status = String(req.query.status || "").trim().toUpperCase();
      const cpfSolicitante = onlyDigits(String(req.query.cpfSolicitante || ""));
      const cpfAssociado = onlyDigits(String(req.query.cpfAssociado || ""));
      const page = parsePage(req.query.page, 1);
      const limit = parseLimit(req.query.limit, 10);
      const offset = (page - 1) * limit;
      const loginUsuario = String(req.user?.sub || "").trim();
      const grupos = Array.isArray(req.user?.grupos) ? req.user!.grupos! : [];

      const usuarioEhSuporte = hasGroup(grupos, AD_GROUP_SUPORTE);
      const usuarioEhFinanceiro =
        hasGroup(grupos, AD_GROUP_FINANCEIRO) ||
        hasGroup(grupos, AD_GROUP_FINANCEIRO_CADASTRO);
      const usuarioEhDiretoria = hasGroup(grupos, AD_GROUP_GERENCIA_DIRETORIA);

      const bindsBase: Record<string, any> = {
        pesquisaVazia: pesquisa ? 0 : 1,
        pesquisa1: normalizeLike(pesquisa || " "),
        pesquisa2: normalizeLike(pesquisa || " "),
        pesquisa3: normalizeLike(pesquisa || " "),
        status1: status || " ",
        status2: status || " ",
        cpfSolicitante1: cpfSolicitante || " ",
        cpfAssociado1: cpfAssociado || " ",
      };

      let wherePerfilSql = "";

      if (!usuarioEhSuporte && !usuarioEhFinanceiro && !usuarioEhDiretoria) {
        if (!loginUsuario) {
          return res.status(401).json({
            error: "Não foi possível identificar o usuário logado para listar as solicitações.",
          });
        }

        wherePerfilSql = `
          AND UPPER(TRIM(NVL(s.LOGIN_USUARIO_ABERTURA, ' '))) = UPPER(TRIM(:loginUsuario))
        `;
        bindsBase.loginUsuario = loginUsuario;
      }

      const whereSql = `
        WHERE NVL(s.SN_ATIVO, 1) = 1
          AND (
            :pesquisaVazia = 1
            OR UPPER(NVL(s.NM_SOLICITANTE, ' ')) LIKE :pesquisa1
            OR UPPER(NVL(s.NM_ASSOCIADO, ' ')) LIKE :pesquisa2
            OR UPPER(NVL(s.NM_PRESTADOR_SERVICO, ' ')) LIKE :pesquisa3
          )
          AND (
            :status1 = ' '
            OR UPPER(NVL(s.ST_SOLICITACAO, ' ')) = :status2
          )
          AND (
            :cpfSolicitante1 = ' '
            OR REGEXP_REPLACE(NVL(s.NR_CPF_SOLICITANTE, ' '), '[^0-9]', '') = :cpfSolicitante1
          )
          AND (
            :cpfAssociado1 = ' '
            OR REGEXP_REPLACE(NVL(s.NR_CPF_ASSOCIADO, ' '), '[^0-9]', '') = :cpfAssociado1
          )
          ${wherePerfilSql}
      `;

      const countSql = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.SOLICITACAO_SUBSIDIO_FUNERAL s
        ${whereSql}
      `;

      const countResult = await oracleExecute(countSql, bindsBase, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const rows = await oracleExecute(
        `
          SELECT
            s.ID_SUBSIDIO_FUNERAL,
            s.ST_SOLICITACAO,
            TO_CHAR(s.DT_SOLICITACAO, 'YYYY-MM-DD') AS DT_SOLICITACAO,
            TO_CHAR(s.DT_OBITO, 'YYYY-MM-DD') AS DT_OBITO,
            s.NM_SOLICITANTE,
            s.LOGIN_USUARIO_ABERTURA,
            s.NR_CPF_SOLICITANTE,
            s.TP_PARENTESCO,
            s.NM_ASSOCIADO,
            s.NR_CPF_ASSOCIADO,
            s.NM_LOCAL_TRABALHO,
            s.DS_CARGO_ASSOCIADO,
            s.VL_CUSTO_SERVICO,
            s.VL_SUBSIDIO_APROVADO,
            s.NM_PRESTADOR_SERVICO,
            s.NM_TITULAR_CONTA,
            s.NM_RESP_DIRETORIA,
            s.NM_RESP_FINANCEIRO,
            TO_CHAR(s.DT_APROVACAO_DIRETORIA, 'YYYY-MM-DD') AS DT_APROVACAO_DIRETORIA,
            s.DS_MOTIVO_DEVOLUCAO
          FROM DBACRESSEM.SOLICITACAO_SUBSIDIO_FUNERAL s
          ${whereSql}
          ORDER BY s.ID_SUBSIDIO_FUNERAL DESC
          OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        {
          ...bindsBase,
          offset,
          limit,
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      return res.json({
        rows: rows.rows || [],
        page,
        limit,
        total,
        totalPages,
      });
    } catch (error: any) {
      console.error("listar subsidio funeral paginado erro:", error);
      return res.status(500).json({
        error: "Falha ao listar solicitações de subsídio funeral.",
        details: String(error?.message || error),
      });
    }
  },
};
