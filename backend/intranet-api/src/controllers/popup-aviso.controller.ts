import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute, oracleExecuteCommit } from "../services/oracle.service";

function onlySN(value: any, fallback: "S" | "N" = "N"): "S" | "N" {
  return String(value || fallback).toUpperCase() === "S" ? "S" : "N";
}

function normalizeDate(value: any) {
  if (!value) return null;
  return value;
}

export async function criarPopupAviso(req: Request, res: Response) {
  try {
    const {
      titulo,
      mensagem,
      botaoAceitar,
      botaoRecusar,
      stAtivo,
      exibirAposLogin,
      dtInicio,
      dtFim,
      obrigatorio,
      imagemBase64,
    } = req.body;

    const usuario = (req as any).user || {};

    if (!titulo || !mensagem) {
      return res.status(400).json({
        error: "Título e mensagem são obrigatórios.",
      });
    }

    const sql = `
      INSERT INTO DBACRESSEM.INTRANET_POPUP_AVISOS (
        TITULO,
        MENSAGEM,
        BOTAO_ACEITAR,
        BOTAO_RECUSAR,
        ST_ATIVO,
        EXIBIR_APOS_LOGIN,
        DT_INICIO,
        DT_FIM,
        OBRIGATORIO,
        IMAGEM_BASE64,
        CRIADO_POR,
        DT_CRIACAO
      ) VALUES (
        :titulo,
        :mensagem,
        :botaoAceitar,
        :botaoRecusar,
        :stAtivo,
        :exibirAposLogin,
        CASE WHEN :dtInicio IS NOT NULL THEN TO_DATE(:dtInicio, 'YYYY-MM-DD') ELSE NULL END,
        CASE WHEN :dtFim IS NOT NULL THEN TO_DATE(:dtFim, 'YYYY-MM-DD') ELSE NULL END,
        :obrigatorio,
        :imagemBase64,
        :criadoPor,
        SYSDATE
      )
    `;

    await oracleExecuteCommit(sql, {
      titulo,
      mensagem,
      botaoAceitar: botaoAceitar || "Aceitar",
      botaoRecusar: botaoRecusar || "Recusar",
      stAtivo: onlySN(stAtivo, "S"),
      exibirAposLogin: onlySN(exibirAposLogin, "S"),
      dtInicio: normalizeDate(dtInicio),
      dtFim: normalizeDate(dtFim),
      obrigatorio: onlySN(obrigatorio, "S"),
      imagemBase64: imagemBase64 || null,
      criadoPor: usuario.sub || "sistema",
    });

    return res.status(201).json({
      message: "Popup cadastrado com sucesso.",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao criar popup.",
      details: error.message,
    });
  }
}

export async function listarPopupsAviso(req: Request, res: Response) {
  try {
    const sql = `
      SELECT
        ID_POPUP,
        TITULO,
        MENSAGEM,
        BOTAO_ACEITAR,
        BOTAO_RECUSAR,
        ST_ATIVO,
        EXIBIR_APOS_LOGIN,
        TO_CHAR(DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
        TO_CHAR(DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
        OBRIGATORIO,
        IMAGEM_BASE64,
        CRIADO_POR,
        TO_CHAR(DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
        TO_CHAR(DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO
      FROM DBACRESSEM.INTRANET_POPUP_AVISOS
      ORDER BY ID_POPUP DESC
    `;

    const result = await oracleExecute(
      sql,
      {},
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          MENSAGEM: { type: oracledb.STRING },
          IMAGEM_BASE64: { type: oracledb.STRING },
        },
      }
    );

    return res.json(result.rows || []);
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao listar popups.",
      details: error.message,
    });
  }
}

export async function buscarPopupAvisoPorId(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        ID_POPUP,
        TITULO,
        MENSAGEM,
        BOTAO_ACEITAR,
        BOTAO_RECUSAR,
        ST_ATIVO,
        EXIBIR_APOS_LOGIN,
        TO_CHAR(DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
        TO_CHAR(DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
        OBRIGATORIO,
        IMAGEM_BASE64,
        CRIADO_POR
      FROM DBACRESSEM.INTRANET_POPUP_AVISOS
      WHERE ID_POPUP = :id
    `;

    const result = await oracleExecute(
      sql,
      { id: Number(id) },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          MENSAGEM: { type: oracledb.STRING },
          IMAGEM_BASE64: { type: oracledb.STRING },
        },
      }
    );

    const item = result.rows?.[0];

    if (!item) {
      return res.status(404).json({ error: "Popup não encontrado." });
    }

    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao buscar popup.",
      details: error.message,
    });
  }
}

export async function editarPopupAviso(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      titulo,
      mensagem,
      botaoAceitar,
      botaoRecusar,
      stAtivo,
      exibirAposLogin,
      dtInicio,
      dtFim,
      obrigatorio,
      imagemBase64,
    } = req.body;

    const sql = `
      UPDATE DBACRESSEM.INTRANET_POPUP_AVISOS
         SET TITULO = :titulo,
             MENSAGEM = :mensagem,
             BOTAO_ACEITAR = :botaoAceitar,
             BOTAO_RECUSAR = :botaoRecusar,
             ST_ATIVO = :stAtivo,
             EXIBIR_APOS_LOGIN = :exibirAposLogin,
             DT_INICIO = CASE WHEN :dtInicio IS NOT NULL THEN TO_DATE(:dtInicio, 'YYYY-MM-DD') ELSE NULL END,
             DT_FIM = CASE WHEN :dtFim IS NOT NULL THEN TO_DATE(:dtFim, 'YYYY-MM-DD') ELSE NULL END,
             OBRIGATORIO = :obrigatorio,
             IMAGEM_BASE64 = :imagemBase64,
             DT_ATUALIZACAO = SYSDATE
       WHERE ID_POPUP = :id
    `;

    await oracleExecuteCommit(sql, {
      id: Number(id),
      titulo,
      mensagem,
      botaoAceitar: botaoAceitar || "Aceitar",
      botaoRecusar: botaoRecusar || "Recusar",
      stAtivo: onlySN(stAtivo, "S"),
      exibirAposLogin: onlySN(exibirAposLogin, "S"),
      dtInicio: normalizeDate(dtInicio),
      dtFim: normalizeDate(dtFim),
      obrigatorio: onlySN(obrigatorio, "S"),
      imagemBase64: imagemBase64 || null,
    });

    return res.json({
      message: "Popup atualizado com sucesso.",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao editar popup.",
      details: error.message,
    });
  }
}

export async function ativarDesativarPopupAviso(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { stAtivo } = req.body;

    const sql = `
      UPDATE DBACRESSEM.INTRANET_POPUP_AVISOS
         SET ST_ATIVO = :stAtivo,
             DT_ATUALIZACAO = SYSDATE
       WHERE ID_POPUP = :id
    `;

    await oracleExecuteCommit(sql, {
      id: Number(id),
      stAtivo: onlySN(stAtivo, "N"),
    });

    return res.json({
      message: "Status do popup atualizado com sucesso.",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao alterar status do popup.",
      details: error.message,
    });
  }
}

export async function obterPopupPendenteDoUsuario(req: Request, res: Response) {
  try {
    const usuario = (req as any).user || {};
    const loginUsuario = usuario.sub;

    if (!loginUsuario) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const sql = `
      SELECT *
      FROM (
        SELECT
          P.ID_POPUP,
          P.TITULO,
          P.MENSAGEM,
          P.BOTAO_ACEITAR,
          P.BOTAO_RECUSAR,
          P.OBRIGATORIO,
          P.IMAGEM_BASE64
        FROM DBACRESSEM.INTRANET_POPUP_AVISOS P
        WHERE P.ST_ATIVO = 'S'
          AND P.EXIBIR_APOS_LOGIN = 'S'
          AND (P.DT_INICIO IS NULL OR TRUNC(SYSDATE) >= TRUNC(P.DT_INICIO))
          AND (P.DT_FIM IS NULL OR TRUNC(SYSDATE) <= TRUNC(P.DT_FIM))
          AND NOT EXISTS (
            SELECT 1
              FROM DBACRESSEM.INTRANET_POPUP_RESPOSTAS R
             WHERE R.ID_POPUP = P.ID_POPUP
               AND UPPER(R.LOGIN_USUARIO) = UPPER(:loginUsuario)
          )
        ORDER BY P.ID_POPUP DESC
      )
      WHERE ROWNUM = 1
    `;

    const result = await oracleExecute(
      sql,
      { loginUsuario },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          MENSAGEM: { type: oracledb.STRING },
          IMAGEM_BASE64: { type: oracledb.STRING },
        },
      }
    );

    const popup = result.rows?.[0] || null;

    return res.json({
      temPopupPendente: !!popup,
      popup,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao consultar popup pendente.",
      details: error.message,
    });
  }
}

export async function responderPopupAviso(req: Request, res: Response) {
  try {
    const usuario = (req as any).user || {};
    const loginUsuario = usuario.sub;
    const nomeUsuario = usuario.nome_completo || "";

    const { idPopup, resposta } = req.body;

    if (!loginUsuario) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    if (!idPopup || !["ACEITO", "RECUSADO"].includes(String(resposta || "").toUpperCase())) {
      return res.status(400).json({
        error: "Dados inválidos para resposta do popup.",
      });
    }

    const sql = `
      INSERT INTO DBACRESSEM.INTRANET_POPUP_RESPOSTAS (
        ID_POPUP,
        LOGIN_USUARIO,
        NOME_USUARIO,
        RESPOSTA,
        DT_RESPOSTA,
        IP_USUARIO
      ) VALUES (
        :idPopup,
        :loginUsuario,
        :nomeUsuario,
        :resposta,
        SYSDATE,
        :ipUsuario
      )
    `;

    await oracleExecuteCommit(sql, {
      idPopup: Number(idPopup),
      loginUsuario,
      nomeUsuario,
      resposta: String(resposta).toUpperCase(),
      ipUsuario: req.ip || "",
    });

    return res.json({
      message: "Resposta registrada com sucesso.",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro ao registrar resposta do popup.",
      details: error.message,
    });
  }
}