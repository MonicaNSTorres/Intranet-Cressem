import oracledb, {
  BindParameters,
  ExecuteManyOptions,
  ExecuteOptions,
} from "oracledb";
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

export async function oracleExecuteManyCommit<T = any>(
  sql: string,
  binds: BindParameters[] = [],
  options: ExecuteManyOptions = {}
) {
  const conn = await getOraclePool().getConnection();
  try {
    const result = await conn.executeMany<T>(sql, binds as oracledb.BindParameters[], {
      autoCommit: true,
      ...options,
    });
    return result;
  } finally {
    await conn.close();
  }
}
