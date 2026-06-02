import { Request, Response } from "express";
import oracledb from "oracledb";
import * as XLSX from "xlsx";
import { setAuditoriaContext } from "../services/oracle.service";

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

function normalizarTexto(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseExcelDateToIso(value: any): string {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      const y = String(parsed.y).padStart(4, "0");
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();
  if (!str) return "";

  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    const y = br[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

function extrairValorLinha(
  row: Record<string, any>,
  alternativas: string[]
): any {
  const mapa = new Map<string, any>();
  Object.entries(row || {}).forEach(([k, v]) => {
    mapa.set(normalizarTexto(k), v);
  });

  for (const alt of alternativas) {
    const valor = mapa.get(normalizarTexto(alt));
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      return valor;
    }
  }

  return "";
}

export const gerenciamentoFeriasController = {
  async importarExcel(req: Request, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;

      if (!file?.buffer) {
        return res.status(400).json({
          error: "Nenhum arquivo enviado.",
        });
      }

      const workbook = XLSX.read(file.buffer, {
        type: "buffer",
        cellDates: true,
      });

      const nomeAba = workbook.SheetNames[0];
      const aba = workbook.Sheets[nomeAba];

      if (!aba) {
        return res.status(400).json({
          error: "Planilha inválida.",
        });
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(aba, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        return res.status(400).json({
          error: "A planilha está vazia.",
        });
      }

      const erros: Array<{ linha: number; motivo: string; nome?: string }> = [];
      const registros: Array<{
        NM_FUNCIONARIO: string;
        DT_DIA_INICIO: string;
        DT_DIA_FIM: string;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || {};
        const linha = i + 2;

        const nomeBruto = extrairValorLinha(row, [
          "nome",
          "nm_funcionario",
          "funcionario",
        ]);
        const inicioBruto = extrairValorLinha(row, [
          "inicio programa",
          "inicio programada",
          "início programada",
          "inicio programado",
          "início programado",
          "inicial programada",
          "periodo inicial",
          "período inicial",
          "inicio_programa",
          "inicio_programada",
          "dt_inicio",
          "data inicio",
        ]);
        const fimBruto = extrairValorLinha(row, [
          "fim programa",
          "fim programada",
          "fim programado",
          "final programada",
          "periodo final",
          "período final",
          "fim_programa",
          "fim_programada",
          "dt_fim",
          "data fim",
        ]);

        const nome = String(nomeBruto || "").trim();
        const inicio = parseExcelDateToIso(inicioBruto);
        const fim = parseExcelDateToIso(fimBruto);

        if (!nome) {
          erros.push({ linha, motivo: "Nome não informado." });
          continue;
        }

        if (!inicio) {
          erros.push({ linha, motivo: "Data de início inválida.", nome });
          continue;
        }

        if (!fim) {
          erros.push({ linha, motivo: "Data de fim inválida.", nome });
          continue;
        }

        const diasTotais = calcularDiasTotais(inicio, fim);
        if (diasTotais <= 0) {
          erros.push({
            linha,
            nome,
            motivo: "Período inválido (fim anterior ao início).",
          });
          continue;
        }

        registros.push({
          NM_FUNCIONARIO: nome,
          DT_DIA_INICIO: inicio,
          DT_DIA_FIM: fim,
        });
      }

      return res.status(200).json({
        success: true,
        total_linhas: rows.length,
        carregados: registros.length,
        registros,
        erros,
        message:
          erros.length > 0
            ? "Planilha carregada com alertas. Revise antes de salvar."
            : "Planilha carregada com sucesso. Revise e salve para gravar.",
      });
    } catch (err: any) {
      console.error("importarExcel ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao importar planilha de férias.",
        details: String(err?.message || err),
      });
    }
  },

  async cadastrarLote(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const lista = Array.isArray(req.body) ? req.body : [];

      if (!lista.length) {
        return res.status(400).json({
          error: "Nenhum registro informado para salvar em lote.",
        });
      }

      connection = await oracledb.getConnection();

      const erros: Array<{ linha: number; motivo: string; nome?: string }> = [];
      const registrosValidos: Array<{
        linha: number;
        nome: string;
        dtInicio: string;
        dtFim: string;
        diasTotais: number;
        idFuncionario: number;
      }> = [];

      for (let i = 0; i < lista.length; i++) {
        const item = lista[i] || {};
        const linha = i + 1;

        const nome = String(item.NM_FUNCIONARIO || "").trim();
        const dtInicio = toDateOnly(item.DT_DIA_INICIO);
        const dtFim = toDateOnly(item.DT_DIA_FIM);

        if (!nome) {
          erros.push({ linha, motivo: "Nome não informado." });
          continue;
        }

        if (!dtInicio) {
          erros.push({ linha, nome, motivo: "Data de início inválida." });
          continue;
        }

        if (!dtFim) {
          erros.push({ linha, nome, motivo: "Data de fim inválida." });
          continue;
        }

        const diasTotais = calcularDiasTotais(dtInicio, dtFim);
        if (diasTotais <= 0) {
          erros.push({
            linha,
            nome,
            motivo: "Período inválido (fim anterior ao início).",
          });
          continue;
        }

        const resultFuncionario = await connection.execute(
          `
            SELECT
              f.ID_FUNCIONARIO,
              f.NM_FUNCIONARIO
            FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
            WHERE UPPER(TRIM(f.NM_FUNCIONARIO)) LIKE UPPER(:nomeLike)
            ORDER BY
              CASE
                WHEN UPPER(TRIM(f.NM_FUNCIONARIO)) = UPPER(TRIM(:nomeExato)) THEN 0
                ELSE 1
              END,
              f.ID_FUNCIONARIO DESC
          `,
          {
            nomeLike: `%${nome}%`,
            nomeExato: nome,
          },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const candidatos = (resultFuncionario.rows || []) as Array<{
          ID_FUNCIONARIO: number;
          NM_FUNCIONARIO: string;
        }>;

        if (!candidatos.length) {
          erros.push({
            linha,
            nome,
            motivo: "Funcionário não encontrado pelo nome.",
          });
          continue;
        }

        const nomeNormalizado = normalizarTexto(nome);
        const exatos = candidatos.filter(
          (c) => normalizarTexto(c.NM_FUNCIONARIO) === nomeNormalizado
        );

        const escolhido =
          exatos.length === 1
            ? exatos[0]
            : candidatos.length === 1
            ? candidatos[0]
            : null;

        if (!escolhido) {
          erros.push({
            linha,
            nome,
            motivo: "Mais de um funcionário encontrado para esse nome.",
          });
          continue;
        }

        registrosValidos.push({
          linha,
          nome,
          dtInicio,
          dtFim,
          diasTotais,
          idFuncionario: Number(escolhido.ID_FUNCIONARIO),
        });
      }

      if (erros.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Existem inconsistências no lote. Corrija e tente novamente.",
          erros,
        });
      }

      for (const item of registrosValidos) {
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
            DT_DIA_INICIO: item.dtInicio,
            DT_DIA_FIM: item.dtFim,
            DT_DIAS_TOTAIS: item.diasTotais,
            ID_FUNCIONARIO: item.idFuncionario,
          }
        );
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        inseridos: registrosValidos.length,
        message: "Lote de férias salvo com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("cadastrarLote ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao salvar lote de férias.",
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
  async buscarFuncionarioPorCpf(req: Request, res: Response) {
    let connection: oracledb.Connection | undefined;

    try {
      const cpfParam = String(req.params.cpf || "");
      const cpf = onlyDigits(cpfParam);

      if (cpf.length !== 11) {
        return res.status(400).json({
          error: "CPF invÃ¡lido.",
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
          error: "FuncionÃ¡rio nÃ£o encontrado.",
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
        error: "Falha ao buscar funcionÃ¡rio por CPF.",
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
          error: "ID do funcionÃ¡rio invÃ¡lido.",
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
          error: "FuncionÃ¡rio nÃ£o encontrado.",
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
        error: "Falha ao buscar funcionÃ¡rio com fÃ©rias.",
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
        error: "Falha ao listar fÃ©rias paginadas.",
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
          error: "Nenhum perÃ­odo de fÃ©rias informado.",
        });
      }

      connection = await oracledb.getConnection();

      await setAuditoriaContext(connection, req);

      for (const item of lista) {
        const DT_DIA_INICIO = toDateOnly(item.DT_DIA_INICIO);
        const DT_DIA_FIM = toDateOnly(item.DT_DIA_FIM);
        const ID_FUNCIONARIO = Number(item.ID_FUNCIONARIO || 0);

        if (!DT_DIA_INICIO) {
          return res.status(400).json({
            error: "Preencha a data de inÃ­cio das fÃ©rias.",
          });
        }

        if (!DT_DIA_FIM) {
          return res.status(400).json({
            error: "Preencha a data final das fÃ©rias.",
          });
        }

        if (!ID_FUNCIONARIO) {
          return res.status(400).json({
            error: "FuncionÃ¡rio invÃ¡lido para cadastro de fÃ©rias.",
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
        message: "FÃ©rias cadastradas com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("cadastrar ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao cadastrar fÃ©rias.",
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
          error: "ID do funcionÃ¡rio invÃ¡lido.",
        });
      }

      if (!lista.length) {
        return res.status(400).json({
          error: "Nenhum perÃ­odo de fÃ©rias informado para ediÃ§Ã£o.",
        });
      }

      connection = await oracledb.getConnection();

      await setAuditoriaContext(connection, req);

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
            error: "Preencha a data de inÃ­cio das fÃ©rias.",
          });
        }

        if (!DT_DIA_FIM) {
          return res.status(400).json({
            error: "Preencha a data final das fÃ©rias.",
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
        message: "FÃ©rias atualizadas com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("editar ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar fÃ©rias.",
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
          error: "ID do perÃ­odo de fÃ©rias invÃ¡lido.",
        });
      }

      connection = await oracledb.getConnection();

      await setAuditoriaContext(connection, req);

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
          error: "PerÃ­odo de fÃ©rias nÃ£o encontrado.",
        });
      }

      if (Number(row.SN_EFETUADO) === 1) {
        return res.status(400).json({
          error: "NÃ£o Ã© possÃ­vel excluir fÃ©rias jÃ¡ efetuadas.",
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
          error: "PerÃ­odo de fÃ©rias nÃ£o encontrado para exclusÃ£o.",
        });
      }

      await connection.commit();

      return res.json({
        success: true,
        message: "PerÃ­odo de fÃ©rias excluÃ­do com sucesso.",
      });
    } catch (err: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error("excluirPeriodo ferias erro:", err);
      return res.status(500).json({
        error: "Falha ao excluir perÃ­odo de fÃ©rias.",
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

