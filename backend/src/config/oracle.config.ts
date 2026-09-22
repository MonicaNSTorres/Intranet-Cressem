import "dotenv/config";

export const oracleConfig = {
  user: process.env.ORACLE_USER!,
  password: process.env.ORACLE_PASSWORD!,
  connectString: process.env.ORACLE_CONNECT_STRING!,
  poolMin: Number(process.env.ORACLE_POOL_MIN ?? 1),
  poolMax: Number(process.env.ORACLE_POOL_MAX ?? 10),
  poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT ?? 1),
};