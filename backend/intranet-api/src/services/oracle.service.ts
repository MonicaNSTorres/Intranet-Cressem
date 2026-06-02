import { Request } from "express";
import oracledb, {
  BindParameters,
  ExecuteManyOptions,
  ExecuteOptions,
} from "oracledb";
import { getOraclePool } from "../config/oracle.pool";

function getAuditoriaInfo(req: Request) {
  const usuario =
    (req as any).user?.sub ||
    (req as any).user?.username ||
    (req as any).user?.nome_completo ||
    (req as any).user?.email ||
    "USUARIO_NAO_IDENTIFICADO";

  const tela =
    req.headers["x-tela-origem"] ||
    req.headers.referer ||
    req.headers.origin ||
    req.originalUrl ||
    req.url ||
    "TELA_NAO_IDENTIFICADA";

  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "IP_NAO_IDENTIFICADO";

  return {
    usuario: String(usuario),
    tela: String(tela),
    ip: String(ip),
  };
}

export async function setAuditoriaContext(conn: oracledb.Connection, req: Request) {
  const { usuario, tela, ip } = getAuditoriaInfo(req);

  console.log("AUDITORIA CONTEXTO:", {
    usuario,
    tela,
    ip,
  });


  await conn.execute(
    `
    BEGIN
      DBMS_APPLICATION_INFO.SET_MODULE(
        module_name => 'INTRANET',
        action_name => :tela
      );

      DBMS_SESSION.SET_IDENTIFIER(:usuario);

      DBMS_APPLICATION_INFO.SET_CLIENT_INFO(:ip);
    END;
    `,
    {
      tela,
      usuario,
      ip,
    }
  );
}

export async function oracleExecute<T = any>(
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {}
) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      autoCommit: false,
      ...options,
    });

    return result;
  } finally {
    await conn.close();
  }
}

export async function oracleExecuteCommit<T = any>(
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {}
) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      autoCommit: true,
      ...options,
    });

    return result;
  } finally {
    await conn.close();
  }
}

export async function oracleExecuteManyCommit<T = any>(
  sql: string,
  binds: BindParameters[] = [],
  options: ExecuteManyOptions = {}
) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.executeMany<T>(
      sql,
      binds as oracledb.BindParameters[],
      {
        autoCommit: true,
        ...options,
      }
    );

    return result;
  } finally {
    await conn.close();
  }
}

export async function oracleExecuteWithAudit<T = any>(
  req: Request,
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {}
) {
  const conn = await getOraclePool().getConnection();

  try {
    await setAuditoriaContext(conn, req);

    const result = await conn.execute<T>(sql, binds, {
      autoCommit: false,
      ...options,
    });

    return result;
  } finally {
    await conn.close();
  }
}

export async function oracleExecuteCommitWithAudit<T = any>(
  req: Request,
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {}
) {
  const conn = await getOraclePool().getConnection();

  try {
    await setAuditoriaContext(conn, req);

    const result = await conn.execute<T>(sql, binds, {
      autoCommit: true,
      ...options,
    });

    return result;
  } finally {
    await conn.close();
  }
}