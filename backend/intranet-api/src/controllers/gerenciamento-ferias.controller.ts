import { Request, Response } from "express";
import oracledb from "oracledb";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function toDateOnly(value: any): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function calcularDiasTotais(inicio: string, fim: string) {
  const d1 = new Date(`${inicio}T12:00:00`);
  const d2 = new Date(`${fim}T12:00:00`);

  const diff = d2.getTime() - d1.getTime();
  if (diff < 0) return 0;

  const msDia = 1000 * 60 * 60 * 24;
  return Math.floor(diff / msDia) + 1;
}

export const gerenciamentoFeriasController = {
  async buscarFuncionarioPorCpf(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const cpfParam = String(req.params.cpf || "");
      const cpf = onlyDigits(cpfParam);

      if (cpf.length !== 11) {
        return res.status(400).json({
          error: "CPF inválido.",
        });
      }

      connection = await oracledb.getConnection();

      const result = await connection.execute(
        `
          SELECT
            f.ID_FUNCIONARIO,
            f.NM_FUNCIONARIO,
            f.NR_CPF,
            f.DT_ADMISSAO
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE REGEXP_REPLACE(f.NR_CPF, '[^0-9]', '') = :cpf
            AND ROWNUM = 1
        `,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row = result.rows?.[0] as any;

      if (!row) {
        return res.status(404).json({
          error: "Funcionário não encontrado.",
        });
      }

      return res.json({
        ID_FUNCIONARIO: row.ID_FUNCIONARIO,
        NM_FUNCIONARIO: row.NM_FUNCIONARIO,
        NR_CPF: row.NR_CPF,
        DT_ADMISSAO: row.DT_ADMISSAO,
        FERIAS: [],
      });
    } catch (err: any) {
      console.error("buscarFuncionarioPorCpf ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar funcionário por CPF.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async buscarFuncionarioComFerias(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id || 0);

      if (!id) {
        return res.status(400).json({
          error: "ID do funcionário inválido.",
        });
      }

      connection = await oracledb.getConnection();

      const resultFuncionario = await connection.execute(
        `
          SELECT
            f.ID_FUNCIONARIO,
            f.NM_FUNCIONARIO,
            f.NR_CPF,
            f.DT_ADMISSAO
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          WHERE f.ID_FUNCIONARIO = :id
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const funcionario = resultFuncionario.rows?.[0] as any;

      if (!funcionario) {
        return res.status(404).json({
          error: "Funcionário não encontrado.",
        });
      }

      const resultFerias = await connection.execute(
        `
          SELECT
            ff.ID_FERIAS_FUNCIONARIOS,
            TO_CHAR(ff.DT_DIA_INICIO, 'DD/MM/YYYY') AS DT_DIA_INICIO,
            TO_CHAR(ff.DT_DIA_FIM, 'DD/MM/YYYY') AS DT_DIA_FIM,
            ff.DT_DIAS_TOTAIS,
            ff.SN_EFETUADO,
            ff.ID_FUNCIONARIO
          FROM DBACRESSEM.FERIAS_FUNCIONARIOS ff
          WHERE ff.ID_FUNCIONARIO = :id
          ORDER BY ff.DT_DIA_INICIO
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({
        ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO,
        NM_FUNCIONARIO: funcionario.NM_FUNCIONARIO,
        NR_CPF: funcionario.NR_CPF,
        DT_ADMISSAO: funcionario.DT_ADMISSAO,
        FERIAS: resultFerias.rows || [],
      });
    } catch (err: any) {
      console.error("buscarFuncionarioComFerias erro:", err);
      return res.status(500).json({
        error: "Falha ao buscar funcionário com férias.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async listarPaginado(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const nome = String(req.query.nome || "").trim();
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.max(Number(req.query.limit || 10), 1);
      const offset = (page - 1) * limit;

      connection = await oracledb.getConnection();

      const bindsCount = {
        nome: `%${nome.toUpperCase()}%`,
      };

      const resultCount = await connection.execute(
        `
          SELECT COUNT(DISTINCT f.ID_FUNCIONARIO) AS TOTAL
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
            ON s.ID_SETOR = f.ID_SETOR
          LEFT JOIN DBACRESSEM.FERIAS_FUNCIONARIOS ff
            ON ff.ID_FUNCIONARIO = f.ID_FUNCIONARIO
          WHERE (
            :nome = '%%'
            OR UPPER(f.NM_FUNCIONARIO) LIKE :nome
          )
            AND EXISTS (
              SELECT 1
              FROM DBACRESSEM.FERIAS_FUNCIONARIOS fx
              WHERE fx.ID_FUNCIONARIO = f.ID_FUNCIONARIO
            )
        `,
        bindsCount,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const total = Number((resultCount.rows?.[0] as any)?.TOTAL || 0);
      const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

      const resultFuncionarios = await connection.execute(
        `
          SELECT *
          FROM (
            SELECT
              f.ID_FUNCIONARIO,
              f.NM_FUNCIONARIO,
              f.NR_CPF,
              s.ID_SETOR,
              s.NM_SETOR,
              ROW_NUMBER() OVER (ORDER BY UPPER(f.NM_FUNCIONARIO)) AS RN
            FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
            LEFT JOIN DBACRESSEM.SETOR_SICOOB_CRESSEM s
              ON s.ID_SETOR = f.ID_SETOR
            WHERE (
              :nome = '%%'
              OR UPPER(f.NM_FUNCIONARIO) LIKE :nome
            )
              AND EXISTS (
                SELECT 1
                FROM DBACRESSEM.FERIAS_FUNCIONARIOS fx
                WHERE fx.ID_FUNCIONARIO = f.ID_FUNCIONARIO
              )
          )
          WHERE RN > :offset
            AND RN <= (:offset + :limit)
          ORDER BY RN
        `,
        {
          nome: `%${nome.toUpperCase()}%`,
          offset,
          limit,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const funcionariosBase = (resultFuncionarios.rows || []) as any[];

      const items = [];

      for (const funcionario of funcionariosBase) {
        const resultFerias = await connection.execute(
          `
            SELECT
              ff.ID_FERIAS_FUNCIONARIOS,
              TO_CHAR(ff.DT_DIA_INICIO, 'DD/MM/YYYY') AS DT_DIA_INICIO,
              TO_CHAR(ff.DT_DIA_FIM, 'DD/MM/YYYY') AS DT_DIA_FIM,
              ff.DT_DIAS_TOTAIS,
              ff.SN_EFETUADO,
              ff.ID_FUNCIONARIO
            FROM DBACRESSEM.FERIAS_FUNCIONARIOS ff
            WHERE ff.ID_FUNCIONARIO = :id
            ORDER BY ff.DT_DIA_INICIO
          `,
          { id: funcionario.ID_FUNCIONARIO },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        items.push({
          ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO,
          NM_FUNCIONARIO: funcionario.NM_FUNCIONARIO,
          NR_CPF: funcionario.NR_CPF,
          SETOR: funcionario.ID_SETOR
            ? {
                ID_SETOR: funcionario.ID_SETOR,
                NM_SETOR: funcionario.NM_SETOR,
              }
            : null,
          FERIAS: resultFerias.rows || [],
        });
      }

      return res.json({
        items,
        total_items: total,
        total_pages,
        current_page: page,
      });
    } catch (err: any) {
      console.error("listarPaginado ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao listar férias paginadas.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async cadastrar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const lista = Array.isArray(req.body) ? req.body : [];

      if (!lista.length) {
        return res.status(400).json({
          error: "Nenhum período de férias informado.",
        });
      }

      connection = await oracledb.getConnection();

      for (const item of lista) {
        const DT_DIA_INICIO = toDateOnly(item.DT_DIA_INICIO);
        const DT_DIA_FIM = toDateOnly(item.DT_DIA_FIM);
        const ID_FUNCIONARIO = Number(item.ID_FUNCIONARIO || 0);

        if (!DT_DIA_INICIO) {
          return res.status(400).json({
            error: "Preencha a data de início das férias.",
          });
        }

        if (!DT_DIA_FIM) {
          return res.status(400).json({
            error: "Preencha a data final das férias.",
          });
        }

        if (!ID_FUNCIONARIO) {
          return res.status(400).json({
            error: "Funcionário inválido para cadastro de férias.",
          });
        }

        const diasTotais = calcularDiasTotais(DT_DIA_INICIO, DT_DIA_FIM);

        await connection.execute(
          `
            INSERT INTO DBACRESSEM.FERIAS_FUNCIONARIOS (
              DT_DIA_INICIO,
              DT_DIA_FIM,
              DT_DIAS_TOTAIS,
              SN_EFETUADO,
              ID_FUNCIONARIO
            ) VALUES (
              TO_DATE(:DT_DIA_INICIO, 'YYYY-MM-DD'),
              TO_DATE(:DT_DIA_FIM, 'YYYY-MM-DD'),
              :DT_DIAS_TOTAIS,
              0,
              :ID_FUNCIONARIO
            )
          `,
          {
            DT_DIA_INICIO,
            DT_DIA_FIM,
            DT_DIAS_TOTAIS: diasTotais,
            ID_FUNCIONARIO,
          }
        );
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Férias cadastradas com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("cadastrar ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar férias.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async editar(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const idFuncionario = Number(req.params.id || 0);
      const lista = Array.isArray(req.body) ? req.body : [];

      if (!idFuncionario) {
        return res.status(400).json({
          error: "ID do funcionário inválido.",
        });
      }

      if (!lista.length) {
        return res.status(400).json({
          error: "Nenhum período de férias informado para edição.",
        });
      }

      connection = await oracledb.getConnection();

      const idsRecebidos = lista
        .map((item) => Number(item.ID_FERIAS_FUNCIONARIOS || 0))
        .filter((id) => id > 0);

      if (idsRecebidos.length > 0) {
        const placeholders = idsRecebidos
          .map((_, index) => `:id${index}`)
          .join(", ");

        const bindsDelete: Record<string, any> = {
          ID_FUNCIONARIO: idFuncionario,
        };

        idsRecebidos.forEach((id, index) => {
          bindsDelete[`id${index}`] = id;
        });

        await connection.execute(
          `
            DELETE FROM DBACRESSEM.FERIAS_FUNCIONARIOS
            WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
              AND ID_FERIAS_FUNCIONARIOS NOT IN (${placeholders})
          `,
          bindsDelete
        );
      } else {
        await connection.execute(
          `
            DELETE FROM DBACRESSEM.FERIAS_FUNCIONARIOS
            WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
          `,
          { ID_FUNCIONARIO: idFuncionario }
        );
      }

      for (const item of lista) {
        const DT_DIA_INICIO = toDateOnly(item.DT_DIA_INICIO);
        const DT_DIA_FIM = toDateOnly(item.DT_DIA_FIM);
        const ID_FERIAS_FUNCIONARIOS = Number(
          item.ID_FERIAS_FUNCIONARIOS || 0
        );

        if (!DT_DIA_INICIO) {
          return res.status(400).json({
            error: "Preencha a data de início das férias.",
          });
        }

        if (!DT_DIA_FIM) {
          return res.status(400).json({
            error: "Preencha a data final das férias.",
          });
        }

        const diasTotais = calcularDiasTotais(DT_DIA_INICIO, DT_DIA_FIM);

        if (ID_FERIAS_FUNCIONARIOS) {
          await connection.execute(
            `
              UPDATE DBACRESSEM.FERIAS_FUNCIONARIOS
              SET
                DT_DIA_INICIO = TO_DATE(:DT_DIA_INICIO, 'YYYY-MM-DD'),
                DT_DIA_FIM = TO_DATE(:DT_DIA_FIM, 'YYYY-MM-DD'),
                DT_DIAS_TOTAIS = :DT_DIAS_TOTAIS,
                ID_FUNCIONARIO = :ID_FUNCIONARIO
              WHERE ID_FERIAS_FUNCIONARIOS = :ID_FERIAS_FUNCIONARIOS
            `,
            {
              DT_DIA_INICIO,
              DT_DIA_FIM,
              DT_DIAS_TOTAIS: diasTotais,
              ID_FUNCIONARIO: idFuncionario,
              ID_FERIAS_FUNCIONARIOS,
            }
          );
        } else {
          await connection.execute(
            `
              INSERT INTO DBACRESSEM.FERIAS_FUNCIONARIOS (
                DT_DIA_INICIO,
                DT_DIA_FIM,
                DT_DIAS_TOTAIS,
                SN_EFETUADO,
                ID_FUNCIONARIO
              ) VALUES (
                TO_DATE(:DT_DIA_INICIO, 'YYYY-MM-DD'),
                TO_DATE(:DT_DIA_FIM, 'YYYY-MM-DD'),
                :DT_DIAS_TOTAIS,
                0,
                :ID_FUNCIONARIO
              )
            `,
            {
              DT_DIA_INICIO,
              DT_DIA_FIM,
              DT_DIAS_TOTAIS: diasTotais,
              ID_FUNCIONARIO: idFuncionario,
            }
          );
        }
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Férias atualizadas com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("editar ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar férias.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },

  async excluirPeriodo(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const id = Number(req.params.id || 0);

      if (!id) {
        return res.status(400).json({
          error: "ID do período de férias inválido.",
        });
      }

      connection = await oracledb.getConnection();

      const resultCheck = await connection.execute(
        `
          SELECT
            ID_FERIAS_FUNCIONARIOS,
            SN_EFETUADO
          FROM DBACRESSEM.FERIAS_FUNCIONARIOS
          WHERE ID_FERIAS_FUNCIONARIOS = :id
        `,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row = resultCheck.rows?.[0] as any;

      if (!row) {
        return res.status(404).json({
          error: "Período de férias não encontrado.",
        });
      }

      if (Number(row.SN_EFETUADO) === 1) {
        return res.status(400).json({
          error: "Não é possível excluir férias já efetuadas.",
        });
      }

      const resultDelete = await connection.execute(
        `
          DELETE FROM DBACRESSEM.FERIAS_FUNCIONARIOS
          WHERE ID_FERIAS_FUNCIONARIOS = :id
        `,
        { id }
      );

      if (!resultDelete.rowsAffected) {
        return res.status(404).json({
          error: "Período de férias não encontrado para exclusão.",
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "Período de férias excluído com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("excluirPeriodo ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao excluir período de férias.",
        details: String(err?.message || err),
      });
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  },
};