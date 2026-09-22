import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { oracleExecute } from "../services/oracle.service";

export const errorLogController = {
  async criar(req: Request, res: Response) {
    try {
      const {
        USERNAME,
        NOME_COMPLETO,
        EMAIL,
        DEPARTMENT,
        PAGE_URL,
        ERROR_MESSAGE,
        ERROR_STACK,
        ERROR_DETAIL,
        SOURCE,
      } = req.body || {};

      if (!ERROR_MESSAGE || !String(ERROR_MESSAGE).trim()) {
        return res.status(400).json({
          error: "O campo ERROR_MESSAGE é obrigatório.",
        });
      }

      const ipAddress =
        req.headers["x-forwarded-for"]?.toString() ||
        req.socket.remoteAddress ||
        null;

      const userAgent = req.headers["user-agent"] || null;

      const sql = `
        INSERT INTO DBACRESSEM.INTRANET_ERROR_LOGS (
          USERNAME,
          NOME_COMPLETO,
          EMAIL,
          DEPARTMENT,
          PAGE_URL,
          ERROR_MESSAGE,
          ERROR_STACK,
          ERROR_DETAIL,
          USER_AGENT,
          SOURCE,
          IP_ADDRESS
        ) VALUES (
          :USERNAME,
          :NOME_COMPLETO,
          :EMAIL,
          :DEPARTMENT,
          :PAGE_URL,
          :ERROR_MESSAGE,
          :ERROR_STACK,
          :ERROR_DETAIL,
          :USER_AGENT,
          :SOURCE,
          :IP_ADDRESS
        )
      `;

      await oracleExecute(
        sql,
        {
          USERNAME: USERNAME ? String(USERNAME).trim() : null,
          NOME_COMPLETO: NOME_COMPLETO ? String(NOME_COMPLETO).trim() : null,
          EMAIL: EMAIL ? String(EMAIL).trim() : null,
          DEPARTMENT: DEPARTMENT ? String(DEPARTMENT).trim() : null,
          PAGE_URL: PAGE_URL ? String(PAGE_URL).trim() : null,
          ERROR_MESSAGE: ERROR_MESSAGE ? String(ERROR_MESSAGE).trim() : null,
          ERROR_STACK: ERROR_STACK ? String(ERROR_STACK) : null,
          ERROR_DETAIL:
            ERROR_DETAIL !== null && ERROR_DETAIL !== undefined
              ? typeof ERROR_DETAIL === "string"
                ? ERROR_DETAIL
                : JSON.stringify(ERROR_DETAIL)
              : null,
          USER_AGENT: userAgent ? String(userAgent) : null,
          SOURCE: SOURCE ? String(SOURCE).trim() : "FRONTEND",
          IP_ADDRESS: ipAddress ? String(ipAddress) : null,
        },
        { autoCommit: true }
      );

      return res.status(201).json({
        success: true,
        message: "Erro registrado com sucesso.",
      });
    } catch (err: any) {
      console.error("error log erro:", err);

      try {
        const logDir = path.join(process.cwd(), "logs");

        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        const filePath = path.join(logDir, "intranet-errors.txt");

        const txt = `
==============================
DATA: ${new Date().toISOString()}
USERNAME: ${req.body?.USERNAME || "NÃO IDENTIFICADO"}
NOME: ${req.body?.NOME_COMPLETO || "NÃO IDENTIFICADO"}
EMAIL: ${req.body?.EMAIL || "NÃO IDENTIFICADO"}
DEPARTAMENTO: ${req.body?.DEPARTMENT || "NÃO IDENTIFICADO"}
TELA: ${req.body?.PAGE_URL || "NÃO INFORMADA"}
ORIGEM: ${req.body?.SOURCE || "FRONTEND"}
IP: ${
          req.headers["x-forwarded-for"]?.toString() ||
          req.socket.remoteAddress ||
          "NÃO IDENTIFICADO"
        }
NAVEGADOR: ${req.headers["user-agent"] || "NÃO IDENTIFICADO"}
ERRO: ${req.body?.ERROR_MESSAGE || "SEM MENSAGEM"}
STACK:
${req.body?.ERROR_STACK || "SEM STACK"}

ERRO AO SALVAR NO ORACLE:
${String(err?.message || err)}
==============================

`;

        fs.appendFileSync(filePath, txt, "utf8");
      } catch (fileErr) {
        console.error("erro ao salvar log em TXT:", fileErr);
      }

      return res.status(500).json({
        error: "Falha ao registrar erro da intranet.",
        details: String(err?.message || err),
      });
    }
  },
};