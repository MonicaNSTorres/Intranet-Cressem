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
const USUARIOS_PERFIL_TESTE = [
  "MARCELO.BUENO",
  "MARCELO.BUENO@SICOOB.COM.BR",
];

function getPerfilTeste(req: AuthenticatedRequest) {
  const perfil = toUpperTrim(req.headers["x-subsidio-auditivo-perfil-teste"]);
  if (!["FINANCEIRO", "DIRETORIA"].includes(perfil)) {
    return null;
  }

  const identificadores = [
    toUpperTrim(req.user?.sub),
    toUpperTrim(req.user?.email),
  ].filter(Boolean);

  return identificadores.some((valor) => USUARIOS_PERFIL_TESTE.includes(valor))
    ? perfil
    : null;
}

export const solicitacaoSubsidioAuditivoPaginadoController = {
  async listar(req: AuthenticatedRequest, res: Response) {
    try {
      const pesquisa = String(req.query.pesquisa || "").trim().toUpperCase();
      const status = String(req.query.status || "").trim().toUpperCase();
      const cpfAssociado = onlyDigits(String(req.query.cpfAssociado || ""));
      const page = parsePage(req.query.page, 1);
      const limit = parseLimit(req.query.limit, 10);
      const offset = (page - 1) * limit;
      const loginUsuario = String(req.user?.sub || "").trim();
      const emailUsuario = String(req.user?.email || "").trim();
      const nomeUsuario = String(req.user?.nome_completo || "").trim();
      const grupos = Array.isArray(req.user?.grupos) ? req.user!.grupos! : [];
      const perfilTeste = getPerfilTeste(req);

      const usuarioEhSuporte = hasGroup(grupos, AD_GROUP_SUPORTE);
      const usuarioEhFinanceiro =
        perfilTeste === "FINANCEIRO" ||
        hasGroup(grupos, AD_GROUP_FINANCEIRO) ||
        hasGroup(grupos, AD_GROUP_FINANCEIRO_CADASTRO);
      const usuarioEhDiretoria =
        perfilTeste === "DIRETORIA" ||
        hasGroup(grupos, AD_GROUP_GERENCIA_DIRETORIA);

      const bindsBase: Record<string, any> = {
        pesquisaVazia: pesquisa ? 0 : 1,
        pesquisa1: normalizeLike(pesquisa || " "),
        pesquisa2: normalizeLike(pesquisa || " "),
        pesquisa3: normalizeLike(pesquisa || " "),
        status1: status || " ",
        status2: status || " ",
        cpfAssociado1: cpfAssociado || " ",
      };

      let wherePerfilSql = "";

      if (!usuarioEhSuporte && !usuarioEhFinanceiro && !usuarioEhDiretoria) {
        if (!loginUsuario && !emailUsuario && !nomeUsuario) {
          return res.status(401).json({
            error:
              "Não foi possível identificar o usuário logado para listar as solicitações.",
          });
        }

        wherePerfilSql = `
          AND (
            UPPER(TRIM(NVL(s.LOGIN_USUARIO_ABERTURA, ' '))) = UPPER(TRIM(:loginUsuario))
            OR UPPER(TRIM(NVL(s.LOGIN_USUARIO_ABERTURA, ' '))) = UPPER(TRIM(:emailUsuario))
            OR UPPER(TRIM(NVL(s.NM_USUARIO_ABERTURA, ' '))) = UPPER(TRIM(:nomeUsuario))
          )
        `;
        bindsBase.loginUsuario = loginUsuario;
        bindsBase.emailUsuario = emailUsuario;
        bindsBase.nomeUsuario = nomeUsuario;
      }

      const whereSql = `
        WHERE NVL(s.SN_ATIVO, 1) = 1
          AND (
            :pesquisaVazia = 1
            OR UPPER(NVL(s.NM_ASSOCIADO, ' ')) LIKE :pesquisa1
            OR UPPER(NVL(s.NM_PRESTADOR_SERVICO, ' ')) LIKE :pesquisa2
            OR UPPER(NVL(s.NM_ORGAO_ASSOCIADO, ' ')) LIKE :pesquisa3
          )
          AND (
            :status1 = ' '
            OR UPPER(NVL(s.ST_SOLICITACAO, ' ')) = :status2
          )
          AND (
            :cpfAssociado1 = ' '
            OR REGEXP_REPLACE(NVL(s.NR_CPF_ASSOCIADO, ' '), '[^0-9]', '') = :cpfAssociado1
          )
          ${wherePerfilSql}
      `;

      const countSql = `
        SELECT COUNT(*) AS TOTAL
        FROM DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO s
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
            s.ID_SUBSIDIO_AUDITIVO,
            s.ST_SOLICITACAO,
            TO_CHAR(s.DT_SOLICITACAO, 'YYYY-MM-DD') AS DT_SOLICITACAO,
            s.NM_ASSOCIADO,
            s.NM_USUARIO_ABERTURA,
            s.LOGIN_USUARIO_ABERTURA,
            s.NR_CPF_ASSOCIADO,
            s.NR_MATRICULA_ASSOCIADO,
            s.DS_FUNCAO_ASSOCIADO,
            s.NM_ORGAO_ASSOCIADO,
            s.NR_CELULAR,
            s.VL_CUSTO_APARELHO,
            s.VL_SUBSIDIO_APROVADO,
            s.NM_PRESTADOR_SERVICO,
            s.NM_RESP_DIRETORIA,
            s.NM_RESP_FINANCEIRO,
            TO_CHAR(s.DT_APROVACAO_DIRETORIA, 'YYYY-MM-DD') AS DT_APROVACAO_DIRETORIA,
            s.DS_MOTIVO_DEVOLUCAO
          FROM DBACRESSEM.SOLICITACAO_SUBSIDIO_AUDITIVO s
          ${whereSql}
          ORDER BY s.ID_SUBSIDIO_AUDITIVO DESC
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
      console.error("listar subsidio auditivo paginado erro:", error);
      return res.status(500).json({
        error: "Falha ao listar solicitações de subsídio auditivo.",
        details: String(error?.message || error),
      });
    }
  },
};
