import { Request, Response, NextFunction } from "express";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";

export async function registrarAcesso(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let connection: oracledb.Connection | undefined;

  try {
    // Ignora preflight
    if (req.method === "OPTIONS") {
      return next();
    }

    const url = req.originalUrl || "";

    // Ignora algumas rotas
    if (
      url.includes("/dashboard/acessos") ||
      url.includes("/login") ||
      url.includes("/health")
    ) {
      return next();
    }

    // Dados do usuário
    const user = (req as any).user;

    const NM_USUARIO =
      user?.username ||
      user?.login ||
      "ANONIMO";

    const NM_COMPLETO =
      user?.nome_completo ||
      user?.nome ||
      null;

    // Dados da requisição
    const DS_TELA = url;

    const DS_METODO = req.method;

    const DS_IP =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      null;

    const DS_USER_AGENT =
      req.headers["user-agent"] || null;

    // PEGA CONEXÃO DO POOL
    const pool = getOraclePool();

    connection = await pool.getConnection();

    // INSERT
    await connection.execute(
      `
        INSERT INTO DBACRESSEM.ACESSOS_INTRANET (
          NM_USUARIO,
          NM_COMPLETO,
          DS_TELA,
          DS_METODO,
          DS_IP,
          DS_USER_AGENT,
          DT_ACESSO
        ) VALUES (
          :NM_USUARIO,
          :NM_COMPLETO,
          :DS_TELA,
          :DS_METODO,
          :DS_IP,
          :DS_USER_AGENT,
          CURRENT_TIMESTAMP
        )
      `,
      {
        NM_USUARIO,
        NM_COMPLETO,
        DS_TELA,
        DS_METODO,
        DS_IP,
        DS_USER_AGENT,
      },
      {
        autoCommit: true,
      }
    );
  } catch (error) {
    console.error(
      "[registrarAcesso] erro:",
      error
    );
  } finally {
    // FECHA A CONEXÃO
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "[registrarAcesso] erro ao fechar conexão:",
          error
        );
      }
    }
  }

  next();
}