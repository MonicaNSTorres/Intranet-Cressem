import { BindParameters, ExecuteOptions } from "oracledb";
import { getOraclePool } from "../config/oracle.pool";

export async function oracleExecute<T = any>(
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {}
) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, { autoCommit: false, ...options });
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
    const result = await conn.execute<T>(sql, binds, { autoCommit: true, ...options });
    return result;
  } finally {
    await conn.close();
  }
}