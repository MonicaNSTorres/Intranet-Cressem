import oracledb, { Pool } from "oracledb";
import { oracleConfig } from "./oracle.config";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool: Pool | null = null;

export async function initOraclePool() {
  if (pool) return pool;

  pool = await oracledb.createPool({
    user: oracleConfig.user,
    password: oracleConfig.password,
    connectString: oracleConfig.connectString,
    poolMin: oracleConfig.poolMin,
    poolMax: oracleConfig.poolMax,
    poolIncrement: oracleConfig.poolIncrement,
  });

  console.log("[Oracle] Pool criado");
  return pool;
}

export function getOraclePool(): Pool {
  if (!pool) throw new Error("Oracle pool não inicializado. Chame initOraclePool() no start.");
  return pool;
}

export async function closeOraclePool() {
  if (!pool) return;
  await pool.close(10);
  pool = null;
  console.log("[Oracle] Pool encerrado");
}