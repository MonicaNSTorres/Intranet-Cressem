import { Request, Response } from "express";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";

export async function buscarAcessosSemana(req: Request, res: Response) {
  let connection: oracledb.Connection | undefined;

  try {
    const pool = getOraclePool();
    connection = await pool.getConnection();

    const result = await connection.execute(
      `
        SELECT
          TO_CHAR(DT_ACESSO, 'DY', 'NLS_DATE_LANGUAGE=PORTUGUESE') AS DIA,
          COUNT(*) AS ACESSOS
        FROM DBACRESSEM.ACESSOS_INTRANET
        WHERE DT_ACESSO >= TRUNC(SYSDATE) - 6
        GROUP BY TO_CHAR(DT_ACESSO, 'DY', 'NLS_DATE_LANGUAGE=PORTUGUESE')
        ORDER BY MIN(DT_ACESSO)
      `,
      {},
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(result.rows || []);
  } catch (error) {
    console.error("[buscarAcessosSemana] erro:", error);

    return res.status(500).json({
      message: "Erro ao buscar acessos da semana.",
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}