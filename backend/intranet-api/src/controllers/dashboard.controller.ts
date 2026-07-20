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
          TO_CHAR(
            TRUNC(DT_ACESSO),
            'DY',
            'NLS_DATE_LANGUAGE=PORTUGUESE'
          ) AS DIA,
          COUNT(DISTINCT DS_IP) AS ACESSOS
        FROM DBACRESSEM.ACESSOS_INTRANET
        WHERE DT_ACESSO >= TRUNC(SYSDATE) - 6
          AND DS_TELA IN ('/v1/me')
          AND DS_IP <> '::ffff:127.0.0.1'
        GROUP BY TRUNC(DT_ACESSO)
        ORDER BY TRUNC(DT_ACESSO)
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

export async function registrarPaginaAcessada(
  req: Request,
  res: Response
) {
  let connection: oracledb.Connection | undefined;

  try {
    const user = (req as any).user;

    const usuario = String(user?.sub || "").trim();

    const nomeCompleto =
      String(user?.nome_completo || "").trim() || null;

    const pagina = String(req.body?.pagina || "").trim();

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não identificado.",
      });
    }

    if (!pagina) {
      return res.status(400).json({
        success: false,
        message: "Página não informada.",
      });
    }

    if (!pagina.startsWith("/auth/")) {
      return res.status(400).json({
        success: false,
        message: "Página inválida.",
      });
    }

    if (
      pagina === "/auth" ||
      pagina === "/auth/home"
    ) {
      return res.status(204).send();
    }

    const pool = getOraclePool();
    connection = await pool.getConnection();

    const result = await connection.execute(
      `
        INSERT INTO DBACRESSEM.ACESSOS_PAGINAS_INTRANET (
          NM_USUARIO,
          NM_COMPLETO,
          DS_PAGINA,
          DT_ACESSO
        )
        SELECT
          :usuario,
          :nomeCompleto,
          :pagina,
          SYSDATE
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1
          FROM DBACRESSEM.ACESSOS_PAGINAS_INTRANET
          WHERE UPPER(NM_USUARIO) = UPPER(:usuario)
            AND DS_PAGINA = :pagina
            AND DT_ACESSO >= SYSDATE - (5 / 1440)
        )
      `,
      {
        usuario,
        nomeCompleto,
        pagina,
      },
      {
        autoCommit: true,
      }
    );

    const acessoRegistrado =
      Number(result.rowsAffected || 0) > 0;

    if (!acessoRegistrado) {
      return res.status(200).json({
        success: true,
        registrado: false,
        ignorado: true,
        message:
          "Acesso não registrado porque esta página já foi acessada nos últimos 5 minutos.",
      });
    }

    return res.status(201).json({
      success: true,
      registrado: true,
      ignorado: false,
      message: "Acesso à página registrado.",
    });
  } catch (error) {
    console.error(
      "[registrarPaginaAcessada] erro:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro ao registrar acesso à página.",
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "[registrarPaginaAcessada] erro ao fechar conexão:",
          error
        );
      }
    }
  }
}

export async function buscarPaginasMaisAcessadas(
  req: Request,
  res: Response
) {
  let connection: oracledb.Connection | undefined;

  try {
    const user = (req as any).user;

    const usuario = String(user?.sub || "").trim();

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuário não identificado.",
      });
    }

    const limitRecebido = Number(req.query.limit || 6);

    const limit =
      Number.isInteger(limitRecebido) &&
      limitRecebido >= 1 &&
      limitRecebido <= 12
        ? limitRecebido
        : 6;

    const pool = getOraclePool();
    connection = await pool.getConnection();

    const result = await connection.execute(
      `
        SELECT
          DS_PAGINA,
          QUANTIDADE_ACESSOS
        FROM (
          SELECT
            DS_PAGINA,
            COUNT(*) AS QUANTIDADE_ACESSOS,
            MAX(DT_ACESSO) AS ULTIMO_ACESSO
          FROM DBACRESSEM.ACESSOS_PAGINAS_INTRANET
          WHERE UPPER(NM_USUARIO) = UPPER(:usuario)
            AND DT_ACESSO >= SYSDATE - 90
          GROUP BY DS_PAGINA
          ORDER BY
            COUNT(*) DESC,
            MAX(DT_ACESSO) DESC
        )
        WHERE ROWNUM <= :limit
      `,
      {
        usuario,
        limit,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const paginas = (result.rows || []).map(
      (row: any) => ({
        href: String(row.DS_PAGINA || ""),
        quantidadeAcessos: Number(
          row.QUANTIDADE_ACESSOS || 0
        ),
      })
    );

    return res.json({
      success: true,
      data: paginas,
    });
  } catch (error) {
    console.error(
      "[buscarPaginasMaisAcessadas] erro:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro ao buscar páginas mais acessadas.",
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error(
          "[buscarPaginasMaisAcessadas] erro ao fechar conexão:",
          error
        );
      }
    }
  }
}