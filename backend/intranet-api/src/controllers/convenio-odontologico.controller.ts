import { Request, Response } from "express";
import oracledb from "oracledb";
import {
    oracleExecute,
    setAuditoriaContext,
} from "../services/oracle.service";

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
    });
}

function somenteNumeros(valor: unknown): string {
    return String(valor || "").replace(/\D/g, "");
}

export const convenioOdontologicoController = {
    async listarTiposBeneficiario(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_TIPO_BENEFICIARIO,
          CD_TIPO_BENEFICIARIO,
          NM_TIPO_BENEFICIARIO
        FROM DBACRESSEM.ODONTO_TIPO_BENEFICIARIO
        WHERE SN_ATIVO = 1
        ORDER BY NM_TIPO_BENEFICIARIO
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar tipos de beneficiário:", error);

            return res.status(500).json({
                error: "Erro ao listar tipos de beneficiário.",
                details: error.message,
            });
        }
    },

    async listarOperadoras(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_OPERADORA,
          NM_OPERADORA,
          NR_CNPJ
        FROM DBACRESSEM.ODONTO_OPERADORA
        WHERE SN_ATIVO = 1
        ORDER BY NM_OPERADORA
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar operadoras:", error);

            return res.status(500).json({
                error: "Erro ao listar operadoras.",
                details: error.message,
            });
        }
    },

    async listarEmpresas(_req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_EMPRESA,
          NM_EMPRESA,
          NR_CNPJ
        FROM DBACRESSEM.ODONTO_EMPRESA
        WHERE SN_ATIVO = 1
        ORDER BY NM_EMPRESA
      `;

            const result = await oracleExecute(
                sql,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar empresas:", error);

            return res.status(500).json({
                error: "Erro ao listar empresas.",
                details: error.message,
            });
        }
    },

    async listarPlanos(req: Request, res: Response) {
        try {
            const idOperadora = req.query.idOperadora
                ? Number(req.query.idOperadora)
                : null;

            const sql = `
        SELECT
          P.ID_PLANO,
          P.ID_OPERADORA,
          O.NM_OPERADORA,
          P.NM_PLANO,
          P.DS_PLANO,
          P.TP_COBRANCA,
          P.NR_IDADE_MINIMA,
          P.NR_IDADE_MAXIMA,
          P.DT_VIGENCIA_INICIO,
          P.DT_VIGENCIA_FIM
        FROM DBACRESSEM.ODONTO_PLANO P

        INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
          ON O.ID_OPERADORA = P.ID_OPERADORA

        WHERE P.SN_ATIVO = 1
          AND (:idOperadora IS NULL OR P.ID_OPERADORA = :idOperadora)

        ORDER BY
          O.NM_OPERADORA,
          P.NM_PLANO
      `;

            const result = await oracleExecute(
                sql,
                {
                    idOperadora,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar planos:", error);

            return res.status(500).json({
                error: "Erro ao listar planos.",
                details: error.message,
            });
        }
    },

    async buscarValorVigentePlano(req: Request, res: Response) {
        try {
            const idPlano = Number(req.params.id);

            if (!Number.isInteger(idPlano) || idPlano <= 0) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            const sql = `
        SELECT
          PV.ID_PLANO_VALOR,
          PV.ID_PLANO,
          P.NM_PLANO,
          P.TP_COBRANCA,
          PV.VL_MENSALIDADE,
          PV.DT_VIGENCIA_INICIO,
          PV.DT_VIGENCIA_FIM
        FROM DBACRESSEM.ODONTO_PLANO_VALOR PV

        INNER JOIN DBACRESSEM.ODONTO_PLANO P
          ON P.ID_PLANO = PV.ID_PLANO

        WHERE PV.ID_PLANO = :idPlano
          AND PV.SN_ATIVO = 1
      `;

            const result = await oracleExecute(
                sql,
                { idPlano },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row = result.rows?.[0];

            if (!row) {
                return res.status(404).json({
                    error: "Valor vigente não encontrado para o plano.",
                });
            }

            return res.json(row);
        } catch (error: any) {
            console.error("Erro ao buscar valor vigente do plano:", error);

            return res.status(500).json({
                error: "Erro ao buscar valor vigente do plano.",
                details: error.message,
            });
        }
    },

    async listarBeneficiarios(req: Request, res: Response) {
        try {
            const somenteAtivos =
                String(req.query.somenteAtivos || "1") === "1";

            const sql = `
        SELECT
          B.ID_BENEFICIARIO,
          B.NM_BENEFICIARIO,
          B.NR_CPF,
          B.DT_NASCIMENTO,

          TB.ID_TIPO_BENEFICIARIO,
          TB.CD_TIPO_BENEFICIARIO,
          TB.NM_TIPO_BENEFICIARIO,

          E.ID_EMPRESA,
          E.NM_EMPRESA,

          P.ID_PLANO,
          P.NM_PLANO,
          P.TP_COBRANCA,

          O.ID_OPERADORA,
          O.NM_OPERADORA,

          B.ID_TITULAR,
          T.NM_BENEFICIARIO AS NM_TITULAR,

          B.NR_MATRICULA,
          B.DT_INCLUSAO_PLANO,
          B.DT_EXCLUSAO_PLANO,
          B.SN_ATIVO,

          PV.VL_MENSALIDADE,

          CC.NR_CONTA_CAPITAL,
          CC.SN_CONTA_CAPITAL,
          CC.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA

        FROM DBACRESSEM.ODONTO_BENEFICIARIO B

        INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
          ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO

        INNER JOIN DBACRESSEM.ODONTO_EMPRESA E
          ON E.ID_EMPRESA = B.ID_EMPRESA

        INNER JOIN DBACRESSEM.ODONTO_PLANO P
          ON P.ID_PLANO = B.ID_PLANO

        INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
          ON O.ID_OPERADORA = P.ID_OPERADORA

        LEFT JOIN DBACRESSEM.ODONTO_BENEFICIARIO T
          ON T.ID_BENEFICIARIO = B.ID_TITULAR

        LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
          ON PV.ID_PLANO = B.ID_PLANO
         AND PV.SN_ATIVO = 1

        LEFT JOIN DBACRESSEM.VW_ODONTO_BENEF_CONTA_CAPITAL CC
          ON CC.ID_BENEFICIARIO = B.ID_BENEFICIARIO

        WHERE (:somenteAtivos = 0 OR B.SN_ATIVO = 1)

        ORDER BY B.NM_BENEFICIARIO
      `;

            const result = await oracleExecute(
                sql,
                {
                    somenteAtivos: somenteAtivos ? 1 : 0,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar beneficiários:", error);

            return res.status(500).json({
                error: "Erro ao listar beneficiários.",
                details: error.message,
            });
        }
    },

    async buscarBeneficiarioPorCpf(req: Request, res: Response) {
        try {
            const cpf = somenteNumeros(req.params.cpf);

            if (cpf.length !== 11) {
                return res.status(400).json({
                    error: "CPF inválido. Informe 11 dígitos.",
                });
            }

            const sql = `
        SELECT
          B.ID_BENEFICIARIO,
          B.NM_BENEFICIARIO,
          B.NR_CPF,
          B.DT_NASCIMENTO,
          B.ID_TIPO_BENEFICIARIO,
          B.ID_EMPRESA,
          B.ID_PLANO,
          B.ID_TITULAR,
          B.NR_MATRICULA,
          B.DT_INCLUSAO_PLANO,
          B.DT_EXCLUSAO_PLANO,
          B.DS_OBSERVACAO,
          B.SN_ATIVO,

          CC.NR_CONTA_CAPITAL,
          CC.DT_MATRICULA_CONTA_CAPITAL,
          CC.DT_SAIDA_CONTA_CAPITAL,
          CC.SN_CONTA_CAPITAL,
          CC.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA,
          CC.DT_MOVIMENTO_CONTA_CAPITAL,
          CC.DT_ATUALIZACAO_CONTA_CAPITAL

        FROM DBACRESSEM.ODONTO_BENEFICIARIO B

        LEFT JOIN DBACRESSEM.VW_ODONTO_BENEF_CONTA_CAPITAL CC
          ON CC.ID_BENEFICIARIO = B.ID_BENEFICIARIO

        WHERE B.NR_CPF = :cpf
          AND B.SN_ATIVO = 1
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row = result.rows?.[0];

            if (!row) {
                return res.status(404).json({
                    error: "Beneficiário ativo não encontrado.",
                });
            }

            return res.json(row);
        } catch (error: any) {
            console.error("Erro ao buscar beneficiário por CPF:", error);

            return res.status(500).json({
                error: "Erro ao buscar beneficiário por CPF.",
                details: error.message,
            });
        }
    },

    async buscarBeneficiarioPorId(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    error: "ID do beneficiário inválido.",
                });
            }

            const sql = `
        SELECT
          B.ID_BENEFICIARIO,
          B.NM_BENEFICIARIO,
          B.NR_CPF,
          B.DT_NASCIMENTO,

          B.ID_TIPO_BENEFICIARIO,
          TB.CD_TIPO_BENEFICIARIO,
          TB.NM_TIPO_BENEFICIARIO,

          B.ID_EMPRESA,
          E.NM_EMPRESA,

          B.ID_PLANO,
          P.NM_PLANO,
          P.TP_COBRANCA,

          O.ID_OPERADORA,
          O.NM_OPERADORA,

          B.ID_TITULAR,
          T.NM_BENEFICIARIO AS NM_TITULAR,

          B.NR_MATRICULA,
          B.DT_INCLUSAO_PLANO,
          B.DT_EXCLUSAO_PLANO,
          B.DS_OBSERVACAO,
          B.SN_ATIVO,

          PV.VL_MENSALIDADE,

          CC.NR_CONTA_CAPITAL,
          CC.DT_MATRICULA_CONTA_CAPITAL,
          CC.DT_SAIDA_CONTA_CAPITAL,
          CC.SN_CONTA_CAPITAL,
          CC.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA,
          CC.DT_MOVIMENTO_CONTA_CAPITAL,
          CC.DT_ATUALIZACAO_CONTA_CAPITAL

        FROM DBACRESSEM.ODONTO_BENEFICIARIO B

        INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
          ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO

        INNER JOIN DBACRESSEM.ODONTO_EMPRESA E
          ON E.ID_EMPRESA = B.ID_EMPRESA

        INNER JOIN DBACRESSEM.ODONTO_PLANO P
          ON P.ID_PLANO = B.ID_PLANO

        INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
          ON O.ID_OPERADORA = P.ID_OPERADORA

        LEFT JOIN DBACRESSEM.ODONTO_BENEFICIARIO T
          ON T.ID_BENEFICIARIO = B.ID_TITULAR

        LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
          ON PV.ID_PLANO = B.ID_PLANO
         AND PV.SN_ATIVO = 1

        LEFT JOIN DBACRESSEM.VW_ODONTO_BENEF_CONTA_CAPITAL CC
          ON CC.ID_BENEFICIARIO = B.ID_BENEFICIARIO

        WHERE B.ID_BENEFICIARIO = :id
      `;

            const result = await oracleExecute(
                sql,
                { id },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row = result.rows?.[0];

            if (!row) {
                return res.status(404).json({
                    error: "Beneficiário não encontrado.",
                });
            }

            return res.json(row);
        } catch (error: any) {
            console.error("Erro ao buscar beneficiário por ID:", error);

            return res.status(500).json({
                error: "Erro ao buscar beneficiário por ID.",
                details: error.message,
            });
        }
    },

    async listarDependentes(req: Request, res: Response) {
        try {
            const idTitular = Number(req.params.id);

            if (!Number.isInteger(idTitular) || idTitular <= 0) {
                return res.status(400).json({
                    error: "ID do titular inválido.",
                });
            }

            const sql = `
        SELECT
          B.ID_BENEFICIARIO,
          B.NM_BENEFICIARIO,
          B.NR_CPF,
          B.DT_NASCIMENTO,
          B.ID_TIPO_BENEFICIARIO,
          B.ID_EMPRESA,
          B.ID_PLANO,
          P.NM_PLANO,
          B.ID_TITULAR,
          B.NR_MATRICULA,
          B.DT_INCLUSAO_PLANO,
          B.DT_EXCLUSAO_PLANO,
          B.SN_ATIVO
        FROM DBACRESSEM.ODONTO_BENEFICIARIO B

        INNER JOIN DBACRESSEM.ODONTO_PLANO P
          ON P.ID_PLANO = B.ID_PLANO

        WHERE B.ID_TITULAR = :idTitular

        ORDER BY B.NM_BENEFICIARIO
      `;

            const result = await oracleExecute(
                sql,
                { idTitular },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error("Erro ao listar dependentes:", error);

            return res.status(500).json({
                error: "Erro ao listar dependentes.",
                details: error.message,
            });
        }
    },

    async criarBeneficiario(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const {
                nome,
                cpf,
                dataNascimento,
                idTipoBeneficiario,
                idEmpresa,
                idPlano,
                idTitular,
                nrMatricula,
                observacao,
                nomeUsuario,
                loginUsuario,
            } = req.body;

            const cpfLimpo = somenteNumeros(cpf);

            if (!nome || String(nome).trim() === "") {
                return res.status(400).json({
                    error: "Nome do beneficiário é obrigatório.",
                });
            }

            if (cpfLimpo.length !== 11) {
                return res.status(400).json({
                    error: "CPF inválido. Informe 11 dígitos.",
                });
            }

            if (!dataNascimento) {
                return res.status(400).json({
                    error: "Data de nascimento é obrigatória.",
                });
            }

            if (!Number.isInteger(Number(idTipoBeneficiario))) {
                return res.status(400).json({
                    error: "Tipo de beneficiário inválido.",
                });
            }

            if (!Number.isInteger(Number(idEmpresa))) {
                return res.status(400).json({
                    error: "Empresa inválida.",
                });
            }

            if (!Number.isInteger(Number(idPlano))) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            const beneficiarioExistente = await conn.execute(
                `
          SELECT
            ID_BENEFICIARIO
          FROM DBACRESSEM.ODONTO_BENEFICIARIO
          WHERE NR_CPF = :cpf
            AND SN_ATIVO = 1
          FETCH FIRST 1 ROWS ONLY
        `,
                {
                    cpf: cpfLimpo,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (beneficiarioExistente.rows?.length) {
                return res.status(409).json({
                    error: "Já existe um beneficiário ativo cadastrado com este CPF.",
                });
            }

            const tipoResult = await conn.execute(
                `
          SELECT
            ID_TIPO_BENEFICIARIO,
            CD_TIPO_BENEFICIARIO,
            NM_TIPO_BENEFICIARIO
          FROM DBACRESSEM.ODONTO_TIPO_BENEFICIARIO
          WHERE ID_TIPO_BENEFICIARIO = :idTipoBeneficiario
            AND SN_ATIVO = 1
        `,
                {
                    idTipoBeneficiario: Number(idTipoBeneficiario),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const tipo: any = tipoResult.rows?.[0];

            if (!tipo) {
                return res.status(400).json({
                    error: "Tipo de beneficiário não encontrado ou inativo.",
                });
            }

            const empresaResult = await conn.execute(
                `
          SELECT
            ID_EMPRESA
          FROM DBACRESSEM.ODONTO_EMPRESA
          WHERE ID_EMPRESA = :idEmpresa
            AND SN_ATIVO = 1
        `,
                {
                    idEmpresa: Number(idEmpresa),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (!empresaResult.rows?.length) {
                return res.status(400).json({
                    error: "Empresa não encontrada ou inativa.",
                });
            }

            const planoResult = await conn.execute(
                `
          SELECT
            ID_PLANO,
            ID_OPERADORA,
            NM_PLANO,
            TP_COBRANCA,
            NR_IDADE_MINIMA,
            NR_IDADE_MAXIMA
          FROM DBACRESSEM.ODONTO_PLANO
          WHERE ID_PLANO = :idPlano
            AND SN_ATIVO = 1
        `,
                {
                    idPlano: Number(idPlano),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const plano: any = planoResult.rows?.[0];

            if (!plano) {
                return res.status(400).json({
                    error: "Plano não encontrado ou inativo.",
                });
            }

            const valorPlanoResult = await conn.execute(
                `
          SELECT
            ID_PLANO_VALOR,
            VL_MENSALIDADE,
            DT_VIGENCIA_INICIO,
            DT_VIGENCIA_FIM
          FROM DBACRESSEM.ODONTO_PLANO_VALOR
          WHERE ID_PLANO = :idPlano
            AND SN_ATIVO = 1
          FETCH FIRST 1 ROWS ONLY
        `,
                {
                    idPlano: Number(idPlano),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (!valorPlanoResult.rows?.length) {
                return res.status(400).json({
                    error: "O plano selecionado não possui valor vigente cadastrado.",
                });
            }

            let idTitularFinal: number | null = null;

            if (tipo.CD_TIPO_BENEFICIARIO === "TITULAR") {
                idTitularFinal = null;
            }

            if (tipo.CD_TIPO_BENEFICIARIO === "DEPENDENTE") {
                const idTitularNumero = Number(idTitular);

                if (!Number.isInteger(idTitularNumero) || idTitularNumero <= 0) {
                    return res.status(400).json({
                        error:
                            "Beneficiário dependente deve possuir um titular vinculado.",
                    });
                }

                const titularResult = await conn.execute(
                    `
            SELECT
              B.ID_BENEFICIARIO,
              B.NM_BENEFICIARIO,
              B.SN_ATIVO,
              TB.CD_TIPO_BENEFICIARIO
            FROM DBACRESSEM.ODONTO_BENEFICIARIO B

            INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
              ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO

            WHERE B.ID_BENEFICIARIO = :idTitular
              AND B.SN_ATIVO = 1
          `,
                    {
                        idTitular: idTitularNumero,
                    },
                    {
                        outFormat: oracledb.OUT_FORMAT_OBJECT,
                    }
                );

                const titular: any = titularResult.rows?.[0];

                if (!titular) {
                    return res.status(400).json({
                        error: "Titular informado não foi encontrado ou está inativo.",
                    });
                }

                if (titular.CD_TIPO_BENEFICIARIO !== "TITULAR") {
                    return res.status(400).json({
                        error:
                            "O beneficiário informado como titular não possui o tipo TITULAR.",
                    });
                }

                idTitularFinal = idTitularNumero;
            }

            const result = await conn.execute(
                `
          INSERT INTO DBACRESSEM.ODONTO_BENEFICIARIO (
            NM_BENEFICIARIO,
            NR_CPF,
            DT_NASCIMENTO,
            ID_TIPO_BENEFICIARIO,
            ID_EMPRESA,
            ID_PLANO,
            ID_TITULAR,
            NR_MATRICULA,
            DT_INCLUSAO_PLANO,
            DS_OBSERVACAO,
            NM_USUARIO_CRIACAO,
            LOGIN_USUARIO_CRIACAO,
            DT_CRIACAO,
            SN_ATIVO
          )
          VALUES (
            :nome,
            :cpf,
            TO_DATE(:dataNascimento, 'YYYY-MM-DD'),
            :idTipoBeneficiario,
            :idEmpresa,
            :idPlano,
            :idTitular,
            :nrMatricula,
            SYSDATE,
            :observacao,
            :nomeUsuario,
            :loginUsuario,
            SYSDATE,
            1
          )
          RETURNING ID_BENEFICIARIO
          INTO :idBeneficiario
        `,
                {
                    nome: String(nome).trim(),
                    cpf: cpfLimpo,
                    dataNascimento,
                    idTipoBeneficiario: Number(idTipoBeneficiario),
                    idEmpresa: Number(idEmpresa),
                    idPlano: Number(idPlano),
                    idTitular: idTitularFinal,
                    nrMatricula: nrMatricula || null,
                    observacao: observacao || null,
                    nomeUsuario: nomeUsuario || null,
                    loginUsuario: loginUsuario || null,

                    idBeneficiario: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                {
                    autoCommit: false,
                }
            );

            await conn.commit();

            const outBinds: any = result.outBinds;

            const idBeneficiario =
                Array.isArray(outBinds?.idBeneficiario)
                    ? outBinds.idBeneficiario[0]
                    : outBinds?.idBeneficiario;

            return res.status(201).json({
                success: true,
                message: "Beneficiário cadastrado com sucesso.",
                idBeneficiario,
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error("Erro ao criar beneficiário:", error);

            if (error?.errorNum === 1) {
                return res.status(409).json({
                    error: "Já existe um beneficiário ativo cadastrado com este CPF.",
                });
            }

            return res.status(500).json({
                error: "Erro ao cadastrar beneficiário.",
                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async editarBeneficiario(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    error: "ID do beneficiário inválido.",
                });
            }

            const {
                nome,
                cpf,
                dataNascimento,
                idTipoBeneficiario,
                idEmpresa,
                idPlano,
                idTitular,
                nrMatricula,
                observacao,
                nomeUsuario,
                loginUsuario,
            } = req.body;

            const cpfLimpo = somenteNumeros(cpf);

            if (!nome || String(nome).trim() === "") {
                return res.status(400).json({
                    error: "Nome do beneficiário é obrigatório.",
                });
            }

            if (cpfLimpo.length !== 11) {
                return res.status(400).json({
                    error: "CPF inválido. Informe 11 dígitos.",
                });
            }

            if (!dataNascimento) {
                return res.status(400).json({
                    error: "Data de nascimento é obrigatória.",
                });
            }

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            //verifica se o beneficiario existe
            const existenteResult = await conn.execute(
                `
        SELECT
          ID_BENEFICIARIO,
          SN_ATIVO
        FROM DBACRESSEM.ODONTO_BENEFICIARIO
        WHERE ID_BENEFICIARIO = :id
      `,
                { id },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const existente: any = existenteResult.rows?.[0];

            if (!existente) {
                return res.status(404).json({
                    error: "Beneficiário não encontrado.",
                });
            }

            //verifica conflito de CPF com outro beneficiario ativo
            const cpfResult = await conn.execute(
                `
        SELECT ID_BENEFICIARIO
        FROM DBACRESSEM.ODONTO_BENEFICIARIO
        WHERE NR_CPF = :cpf
          AND SN_ATIVO = 1
          AND ID_BENEFICIARIO <> :id
        FETCH FIRST 1 ROWS ONLY
      `,
                {
                    cpf: cpfLimpo,
                    id,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (cpfResult.rows?.length) {
                return res.status(409).json({
                    error: "Já existe outro beneficiário ativo cadastrado com este CPF.",
                });
            }

            //valida o tipo
            const tipoResult = await conn.execute(
                `
        SELECT
          ID_TIPO_BENEFICIARIO,
          CD_TIPO_BENEFICIARIO
        FROM DBACRESSEM.ODONTO_TIPO_BENEFICIARIO
        WHERE ID_TIPO_BENEFICIARIO = :idTipoBeneficiario
          AND SN_ATIVO = 1
      `,
                {
                    idTipoBeneficiario: Number(idTipoBeneficiario),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const tipo: any = tipoResult.rows?.[0];

            if (!tipo) {
                return res.status(400).json({
                    error: "Tipo de beneficiário não encontrado ou inativo.",
                });
            }

            //valida a empresa
            const empresaResult = await conn.execute(
                `
        SELECT ID_EMPRESA
        FROM DBACRESSEM.ODONTO_EMPRESA
        WHERE ID_EMPRESA = :idEmpresa
          AND SN_ATIVO = 1
      `,
                {
                    idEmpresa: Number(idEmpresa),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (!empresaResult.rows?.length) {
                return res.status(400).json({
                    error: "Empresa não encontrada ou inativa.",
                });
            }

            //valida o plano
            const planoResult = await conn.execute(
                `
        SELECT ID_PLANO
        FROM DBACRESSEM.ODONTO_PLANO
        WHERE ID_PLANO = :idPlano
          AND SN_ATIVO = 1
      `,
                {
                    idPlano: Number(idPlano),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (!planoResult.rows?.length) {
                return res.status(400).json({
                    error: "Plano não encontrado ou inativo.",
                });
            }

            //valida o valor vigente
            const valorResult = await conn.execute(
                `
        SELECT ID_PLANO_VALOR
        FROM DBACRESSEM.ODONTO_PLANO_VALOR
        WHERE ID_PLANO = :idPlano
          AND SN_ATIVO = 1
        FETCH FIRST 1 ROWS ONLY
      `,
                {
                    idPlano: Number(idPlano),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (!valorResult.rows?.length) {
                return res.status(400).json({
                    error: "O plano selecionado não possui valor vigente cadastrado.",
                });
            }

            let idTitularFinal: number | null = null;

            if (tipo.CD_TIPO_BENEFICIARIO === "DEPENDENTE") {
                const idTitularNumero = Number(idTitular);

                if (!Number.isInteger(idTitularNumero) || idTitularNumero <= 0) {
                    return res.status(400).json({
                        error: "Beneficiário dependente deve possuir um titular vinculado.",
                    });
                }

                if (idTitularNumero === id) {
                    return res.status(400).json({
                        error: "O beneficiário não pode ser titular de si mesmo.",
                    });
                }

                const titularResult = await conn.execute(
                    `
          SELECT
            B.ID_BENEFICIARIO,
            B.SN_ATIVO,
            TB.CD_TIPO_BENEFICIARIO
          FROM DBACRESSEM.ODONTO_BENEFICIARIO B

          INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
            ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO

          WHERE B.ID_BENEFICIARIO = :idTitular
            AND B.SN_ATIVO = 1
        `,
                    {
                        idTitular: idTitularNumero,
                    },
                    {
                        outFormat: oracledb.OUT_FORMAT_OBJECT,
                    }
                );

                const titular: any = titularResult.rows?.[0];

                if (!titular) {
                    return res.status(400).json({
                        error: "Titular informado não foi encontrado ou está inativo.",
                    });
                }

                if (titular.CD_TIPO_BENEFICIARIO !== "TITULAR") {
                    return res.status(400).json({
                        error: "O beneficiário informado não possui o tipo TITULAR.",
                    });
                }

                idTitularFinal = idTitularNumero;
            }

            await conn.execute(
                `
        UPDATE DBACRESSEM.ODONTO_BENEFICIARIO
        SET
          NM_BENEFICIARIO = :nome,
          NR_CPF = :cpf,
          DT_NASCIMENTO = TO_DATE(:dataNascimento, 'YYYY-MM-DD'),
          ID_TIPO_BENEFICIARIO = :idTipoBeneficiario,
          ID_EMPRESA = :idEmpresa,
          ID_PLANO = :idPlano,
          ID_TITULAR = :idTitular,
          NR_MATRICULA = :nrMatricula,
          DS_OBSERVACAO = :observacao,
          NM_USUARIO_ATUALIZACAO = :nomeUsuario,
          LOGIN_USUARIO_ATUALIZACAO = :loginUsuario,
          DT_ATUALIZACAO = SYSDATE
        WHERE ID_BENEFICIARIO = :id
      `,
                {
                    id,
                    nome: String(nome).trim(),
                    cpf: cpfLimpo,
                    dataNascimento,
                    idTipoBeneficiario: Number(idTipoBeneficiario),
                    idEmpresa: Number(idEmpresa),
                    idPlano: Number(idPlano),
                    idTitular: idTitularFinal,
                    nrMatricula: nrMatricula || null,
                    observacao: observacao || null,
                    nomeUsuario: nomeUsuario || null,
                    loginUsuario: loginUsuario || null,
                }
            );

            await conn.commit();

            return res.json({
                success: true,
                message: "Beneficiário atualizado com sucesso.",
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error("Erro ao editar beneficiário:", error);

            if (error?.errorNum === 1) {
                return res.status(409).json({
                    error: "Já existe outro beneficiário ativo cadastrado com este CPF.",
                });
            }

            return res.status(500).json({
                error: "Erro ao atualizar beneficiário.",
                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async inativarBeneficiario(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    error: "ID do beneficiário inválido.",
                });
            }

            const {
                nomeUsuario,
                loginUsuario,
                observacao,
            } = req.body || {};

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            const beneficiarioResult = await conn.execute(
                `
        SELECT
          B.ID_BENEFICIARIO,
          B.NM_BENEFICIARIO,
          B.NR_CPF,
          B.SN_ATIVO,
          TB.CD_TIPO_BENEFICIARIO
        FROM DBACRESSEM.ODONTO_BENEFICIARIO B

        INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
          ON TB.ID_TIPO_BENEFICIARIO = B.ID_TIPO_BENEFICIARIO

        WHERE B.ID_BENEFICIARIO = :id
      `,
                { id },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const beneficiario: any = beneficiarioResult.rows?.[0];

            if (!beneficiario) {
                return res.status(404).json({
                    error: "Beneficiário não encontrado.",
                });
            }

            if (beneficiario.SN_ATIVO !== 1) {
                return res.status(400).json({
                    error: "Beneficiário já está inativo.",
                });
            }

            await conn.execute(
                `
        UPDATE DBACRESSEM.ODONTO_BENEFICIARIO
        SET
          SN_ATIVO = 0,
          DT_EXCLUSAO_PLANO = SYSDATE,
          DT_ATUALIZACAO = SYSDATE,
          NM_USUARIO_ATUALIZACAO = :nomeUsuario,
          LOGIN_USUARIO_ATUALIZACAO = :loginUsuario,
          DS_OBSERVACAO =
            CASE
              WHEN :observacao IS NOT NULL
                THEN :observacao
              ELSE DS_OBSERVACAO
            END
        WHERE ID_BENEFICIARIO = :id
          AND SN_ATIVO = 1
      `,
                {
                    id,
                    nomeUsuario: nomeUsuario || null,
                    loginUsuario: loginUsuario || null,
                    observacao: observacao || null,
                }
            );

            let dependentesInativados = 0;

            if (beneficiario.CD_TIPO_BENEFICIARIO === "TITULAR") {
                const dependentesResult = await conn.execute(
                    `
          UPDATE DBACRESSEM.ODONTO_BENEFICIARIO
          SET
            SN_ATIVO = 0,
            DT_EXCLUSAO_PLANO = SYSDATE,
            DT_ATUALIZACAO = SYSDATE,
            NM_USUARIO_ATUALIZACAO = :nomeUsuario,
            LOGIN_USUARIO_ATUALIZACAO = :loginUsuario
          WHERE ID_TITULAR = :idTitular
            AND SN_ATIVO = 1
        `,
                    {
                        idTitular: id,
                        nomeUsuario: nomeUsuario || null,
                        loginUsuario: loginUsuario || null,
                    }
                );

                dependentesInativados = Number(
                    dependentesResult.rowsAffected || 0
                );
            }

            await conn.commit();

            return res.json({
                success: true,
                message:
                    beneficiario.CD_TIPO_BENEFICIARIO === "TITULAR"
                        ? "Titular e dependentes vinculados foram inativados com sucesso."
                        : "Beneficiário inativado com sucesso.",
                idBeneficiario: id,
                tipoBeneficiario: beneficiario.CD_TIPO_BENEFICIARIO,
                dependentesInativados,
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error("Erro ao inativar beneficiário:", error);

            return res.status(500).json({
                error: "Erro ao inativar beneficiário.",
                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async listarPlanosGestao(_req: Request, res: Response) {
        try {
            const sql = `
      SELECT
        P.ID_PLANO,
        P.ID_OPERADORA,
        O.NM_OPERADORA,
        O.NR_CNPJ AS NR_CNPJ_OPERADORA,
        P.NM_PLANO,
        P.DS_PLANO,
        P.TP_COBRANCA,
        P.NR_IDADE_MINIMA,
        P.NR_IDADE_MAXIMA,
        P.DT_VIGENCIA_INICIO AS DT_VIGENCIA_INICIO_PLANO,
        P.DT_VIGENCIA_FIM AS DT_VIGENCIA_FIM_PLANO,
        P.SN_ATIVO AS SN_PLANO_ATIVO,
        PV.ID_PLANO_VALOR,
        PV.VL_MENSALIDADE,
        PV.DT_VIGENCIA_INICIO AS DT_VIGENCIA_INICIO_VALOR,
        PV.DT_VIGENCIA_FIM AS DT_VIGENCIA_FIM_VALOR,
        PV.SN_ATIVO AS SN_VALOR_ATIVO

      FROM DBACRESSEM.ODONTO_PLANO P

      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
        ON O.ID_OPERADORA = P.ID_OPERADORA

      LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
        ON PV.ID_PLANO = P.ID_PLANO
       AND PV.SN_ATIVO = 1

      ORDER BY
        O.NM_OPERADORA,
        P.NM_PLANO
    `;

            const result = await oracleExecute(
                sql,
                {},
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            return res.json(result.rows || []);
        } catch (error: any) {
            console.error(
                "Erro ao listar planos para gestão:",
                error
            );

            return res.status(500).json({
                error: "Erro ao listar planos odontológicos.",
                details: error.message,
            });
        }
    },

    async listarHistoricoValoresPlano(req: Request, res: Response) {
        try {
            const idPlano = Number(req.params.id);

            if (!Number.isInteger(idPlano) || idPlano <= 0) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            const planoResult = await oracleExecute(
                `
            SELECT
                P.ID_PLANO,
                P.NM_PLANO,
                P.ID_OPERADORA,
                O.NM_OPERADORA,
                P.TP_COBRANCA,
                P.SN_ATIVO
            FROM DBACRESSEM.ODONTO_PLANO P

            INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
                ON O.ID_OPERADORA = P.ID_OPERADORA

            WHERE P.ID_PLANO = :idPlano
            `,
                {
                    idPlano,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const plano = planoResult.rows?.[0];

            if (!plano) {
                return res.status(404).json({
                    error: "Plano não encontrado.",
                });
            }

            const valoresResult = await oracleExecute(
                `
            SELECT
                ID_PLANO_VALOR,
                ID_PLANO,
                VL_MENSALIDADE,
                DT_VIGENCIA_INICIO,
                DT_VIGENCIA_FIM,
                DT_CRIACAO,
                NM_USUARIO_CRIACAO,
                LOGIN_USUARIO_CRIACAO,
                SN_ATIVO,

                CASE
                    WHEN TRUNC(DT_VIGENCIA_INICIO) > TRUNC(SYSDATE)
                    THEN 'AGENDADO'

                    WHEN TRUNC(SYSDATE) >= TRUNC(DT_VIGENCIA_INICIO)
                         AND (
                             DT_VIGENCIA_FIM IS NULL
                             OR SYSDATE <= DT_VIGENCIA_FIM
                         )
                    THEN 'VIGENTE'

                    ELSE 'ENCERRADO'
                END AS STATUS_VIGENCIA

            FROM DBACRESSEM.ODONTO_PLANO_VALOR

            WHERE ID_PLANO = :idPlano

            ORDER BY
                DT_VIGENCIA_INICIO DESC,
                ID_PLANO_VALOR DESC
            `,
                {
                    idPlano,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            return res.json({
                plano,
                valores: valoresResult.rows || [],
            });
        } catch (error: any) {
            console.error(
                "Erro ao listar histórico de valores:",
                error
            );

            return res.status(500).json({
                error: "Erro ao consultar histórico de valores do plano.",
                details: error.message,
            });
        }
    },

    async reajustarValorPlano(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const idPlano = Number(req.params.id);

            if (!Number.isInteger(idPlano) || idPlano <= 0) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            const {
                novoValor,
                dataInicioVigencia,
                nomeUsuario,
                loginUsuario,
            } = req.body || {};

            const valorNumero = Number(novoValor);

            if (
                !Number.isFinite(valorNumero) ||
                valorNumero <= 0
            ) {
                return res.status(400).json({
                    error: "Informe um novo valor válido.",
                });
            }

            if (
                !dataInicioVigencia ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(dataInicioVigencia)
                )
            ) {
                return res.status(400).json({
                    error:
                        "Informe uma data de início de vigência válida.",
                });
            }

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            const planoResult = await conn.execute(
                `
            SELECT
                P.ID_PLANO,
                P.NM_PLANO,
                P.ID_OPERADORA,
                P.TP_COBRANCA,
                P.SN_ATIVO,
                O.NM_OPERADORA
            FROM DBACRESSEM.ODONTO_PLANO P

            INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
                ON O.ID_OPERADORA = P.ID_OPERADORA

            WHERE P.ID_PLANO = :idPlano

            FOR UPDATE
            `,
                {
                    idPlano,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const plano: any =
                planoResult.rows?.[0];

            if (!plano) {
                return res.status(404).json({
                    error: "Plano não encontrado.",
                });
            }

            if (plano.SN_ATIVO !== 1) {
                return res.status(400).json({
                    error:
                        "Não é possível reajustar um plano inativo.",
                });
            }

            const valorAtualResult = await conn.execute(
                `
            SELECT
                ID_PLANO_VALOR,
                ID_PLANO,
                VL_MENSALIDADE,
                DT_VIGENCIA_INICIO,
                DT_VIGENCIA_FIM,
                SN_ATIVO
            FROM DBACRESSEM.ODONTO_PLANO_VALOR
            WHERE ID_PLANO = :idPlano
              AND SN_ATIVO = 1
            FOR UPDATE
            `,
                {
                    idPlano,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const valorAtual: any =
                valorAtualResult.rows?.[0];

            if (!valorAtual) {
                return res.status(400).json({
                    error:
                        "O plano não possui valor vigente para ser reajustado.",
                });
            }

            const dataResult = await conn.execute(
                `
            SELECT
                TO_DATE(
                    :dataInicioVigencia,
                    'YYYY-MM-DD'
                ) AS NOVA_VIGENCIA
            FROM DUAL
            `,
                {
                    dataInicioVigencia:
                        String(dataInicioVigencia),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const dataRow: any =
                dataResult.rows?.[0];

            const novaVigencia =
                dataRow?.NOVA_VIGENCIA;

            if (!novaVigencia) {
                return res.status(400).json({
                    error:
                        "Data de início de vigência inválida.",
                });
            }

            const validacaoDataResult =
                await conn.execute(
                    `
                SELECT
                    CASE
                        WHEN TO_DATE(
                            :dataInicioVigencia,
                            'YYYY-MM-DD'
                        ) > TRUNC(:dataVigenciaAtual)
                        THEN 1
                        ELSE 0
                    END AS DATA_VALIDA
                FROM DUAL
                `,
                    {
                        dataInicioVigencia:
                            String(dataInicioVigencia),

                        dataVigenciaAtual:
                            valorAtual.DT_VIGENCIA_INICIO,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const validacaoData: any =
                validacaoDataResult.rows?.[0];

            if (validacaoData?.DATA_VALIDA !== 1) {
                return res.status(400).json({
                    error:
                        "A nova vigência deve ser posterior à vigência do valor atual.",
                });
            }

            const dataFimResult =
                await conn.execute(
                    `
                SELECT
                    TO_DATE(
                        :dataInicioVigencia,
                        'YYYY-MM-DD'
                    ) - (1 / 86400) AS DATA_FIM_ANTERIOR
                FROM DUAL
                `,
                    {
                        dataInicioVigencia:
                            String(dataInicioVigencia),
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const dataFimRow: any =
                dataFimResult.rows?.[0];

            const dataFimAnterior =
                dataFimRow?.DATA_FIM_ANTERIOR;

            await conn.execute(
                `
            UPDATE DBACRESSEM.ODONTO_PLANO_VALOR
            SET
                DT_VIGENCIA_FIM = :dataFimAnterior,
                SN_ATIVO = 0
            WHERE ID_PLANO_VALOR = :idPlanoValor
              AND SN_ATIVO = 1
            `,
                {
                    dataFimAnterior,
                    idPlanoValor:
                        valorAtual.ID_PLANO_VALOR,
                },
                {
                    autoCommit: false,
                }
            );

            const novoValorResult =
                await conn.execute(
                    `
                INSERT INTO DBACRESSEM.ODONTO_PLANO_VALOR (
                    ID_PLANO,
                    VL_MENSALIDADE,
                    DT_VIGENCIA_INICIO,
                    DT_VIGENCIA_FIM,
                    DT_CRIACAO,
                    NM_USUARIO_CRIACAO,
                    LOGIN_USUARIO_CRIACAO,
                    SN_ATIVO
                )
                VALUES (
                    :idPlano,
                    :novoValor,
                    TO_DATE(
                        :dataInicioVigencia,
                        'YYYY-MM-DD'
                    ),
                    NULL,
                    SYSDATE,
                    :nomeUsuario,
                    :loginUsuario,
                    1
                )
                RETURNING ID_PLANO_VALOR
                INTO :idPlanoValor
                `,
                    {
                        idPlano,
                        novoValor: valorNumero,

                        dataInicioVigencia:
                            String(dataInicioVigencia),

                        nomeUsuario:
                            nomeUsuario || null,

                        loginUsuario:
                            loginUsuario || null,

                        idPlanoValor: {
                            dir: oracledb.BIND_OUT,
                            type: oracledb.NUMBER,
                        },
                    },
                    {
                        autoCommit: false,
                    }
                );

            await conn.commit();

            const outBinds: any =
                novoValorResult.outBinds;

            const idNovoPlanoValor =
                Array.isArray(
                    outBinds?.idPlanoValor
                )
                    ? outBinds.idPlanoValor[0]
                    : outBinds?.idPlanoValor;

            return res.status(201).json({
                success: true,

                message:
                    "Reajuste cadastrado com sucesso.",

                plano: {
                    idPlano:
                        plano.ID_PLANO,

                    nomePlano:
                        plano.NM_PLANO,

                    operadora:
                        plano.NM_OPERADORA,
                },

                valorAnterior: {
                    idPlanoValor:
                        valorAtual.ID_PLANO_VALOR,

                    valor:
                        valorAtual.VL_MENSALIDADE,

                    dataInicio:
                        valorAtual.DT_VIGENCIA_INICIO,

                    dataFim:
                        dataFimAnterior,
                },

                novoValor: {
                    idPlanoValor:
                        idNovoPlanoValor,

                    valor:
                        valorNumero,

                    dataInicio:
                        novaVigencia,
                },
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error(
                "Erro ao reajustar valor do plano:",
                error
            );

            if (error?.errorNum === 1) {
                return res.status(409).json({
                    error:
                        "O plano já possui outro valor vigente.",
                });
            }

            return res.status(500).json({
                error:
                    "Erro ao cadastrar reajuste do plano.",

                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async criarPlano(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const {
                idOperadora,
                nomePlano,
                descricao,
                tipoCobranca,
                dataVigenciaInicioPlano,
                valorInicial,
                dataVigenciaInicioValor,
                nomeUsuario,
                loginUsuario,
            } = req.body || {};

            const operadora = Number(idOperadora);
            const valor = Number(valorInicial);

            if (
                !Number.isInteger(operadora) ||
                operadora <= 0
            ) {
                return res.status(400).json({
                    error: "Informe uma operadora válida.",
                });
            }

            if (!String(nomePlano || "").trim()) {
                return res.status(400).json({
                    error: "Informe o nome do plano.",
                });
            }

            if (
                tipoCobranca !== "POR_PESSOA" &&
                tipoCobranca !== "POR_PLANO"
            ) {
                return res.status(400).json({
                    error: "Informe um tipo de cobrança válido.",
                });
            }

            if (
                !Number.isFinite(valor) ||
                valor <= 0
            ) {
                return res.status(400).json({
                    error: "Informe um valor inicial válido.",
                });
            }

            if (
                !dataVigenciaInicioValor ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(dataVigenciaInicioValor)
                )
            ) {
                return res.status(400).json({
                    error:
                        "Informe uma data de início de vigência válida para o valor.",
                });
            }

            if (
                dataVigenciaInicioPlano &&
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(dataVigenciaInicioPlano)
                )
            ) {
                return res.status(400).json({
                    error:
                        "A data de início da vigência do plano é inválida.",
                });
            }

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            const operadoraResult = await conn.execute(
                `
            SELECT
                ID_OPERADORA,
                NM_OPERADORA,
                SN_ATIVO
            FROM DBACRESSEM.ODONTO_OPERADORA
            WHERE ID_OPERADORA = :idOperadora
            `,
                {
                    idOperadora: operadora,
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const operadoraEncontrada: any =
                operadoraResult.rows?.[0];

            if (!operadoraEncontrada) {
                return res.status(404).json({
                    error: "Operadora não encontrada.",
                });
            }

            if (operadoraEncontrada.SN_ATIVO !== 1) {
                return res.status(400).json({
                    error:
                        "Não é possível cadastrar um plano para uma operadora inativa.",
                });
            }

            const planoExistenteResult = await conn.execute(
                `
            SELECT
                ID_PLANO
            FROM DBACRESSEM.ODONTO_PLANO
            WHERE ID_OPERADORA = :idOperadora
              AND UPPER(TRIM(NM_PLANO)) =
                  UPPER(TRIM(:nomePlano))
              AND SN_ATIVO = 1
            `,
                {
                    idOperadora: operadora,
                    nomePlano: String(nomePlano).trim(),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            if (planoExistenteResult.rows?.length) {
                return res.status(409).json({
                    error:
                        "Já existe um plano ativo com este nome para a operadora selecionada.",
                });
            }

            const planoResult = await conn.execute(
                `
            INSERT INTO DBACRESSEM.ODONTO_PLANO (
                ID_OPERADORA,
                NM_PLANO,
                DS_PLANO,
                TP_COBRANCA,
                NR_IDADE_MINIMA,
                NR_IDADE_MAXIMA,
                DT_VIGENCIA_INICIO,
                DT_VIGENCIA_FIM,
                DT_CRIACAO,
                DT_ATUALIZACAO,
                SN_ATIVO
            )
            VALUES (
                :idOperadora,
                :nomePlano,
                :descricao,
                :tipoCobranca,
                NULL,
                NULL,
                CASE
                    WHEN :dataVigenciaInicioPlano IS NOT NULL
                    THEN TO_DATE(
                        :dataVigenciaInicioPlano,
                        'YYYY-MM-DD'
                    )
                    ELSE SYSDATE
                END,
                NULL,
                SYSDATE,
                NULL,
                1
            )
            RETURNING ID_PLANO
            INTO :idPlano
            `,
                {
                    idOperadora: operadora,

                    nomePlano:
                        String(nomePlano).trim(),

                    descricao:
                        String(descricao || "").trim() ||
                        null,

                    tipoCobranca,

                    dataVigenciaInicioPlano:
                        dataVigenciaInicioPlano || null,

                    idPlano: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                {
                    autoCommit: false,
                }
            );

            const outBindsPlano: any =
                planoResult.outBinds;

            const idPlano =
                Array.isArray(outBindsPlano?.idPlano)
                    ? outBindsPlano.idPlano[0]
                    : outBindsPlano?.idPlano;

            if (!idPlano) {
                throw new Error(
                    "Não foi possível obter o ID do plano criado."
                );
            }

            const valorResult = await conn.execute(
                `
            INSERT INTO DBACRESSEM.ODONTO_PLANO_VALOR (
                ID_PLANO,
                VL_MENSALIDADE,
                DT_VIGENCIA_INICIO,
                DT_VIGENCIA_FIM,
                DT_CRIACAO,
                NM_USUARIO_CRIACAO,
                LOGIN_USUARIO_CRIACAO,
                SN_ATIVO
            )
            VALUES (
                :idPlano,
                :valorInicial,
                TO_DATE(
                    :dataVigenciaInicioValor,
                    'YYYY-MM-DD'
                ),
                NULL,
                SYSDATE,
                :nomeUsuario,
                :loginUsuario,
                1
            )
            RETURNING ID_PLANO_VALOR
            INTO :idPlanoValor
            `,
                {
                    idPlano,
                    valorInicial: valor,

                    dataVigenciaInicioValor:
                        String(dataVigenciaInicioValor),

                    nomeUsuario:
                        nomeUsuario || null,

                    loginUsuario:
                        loginUsuario || null,

                    idPlanoValor: {
                        dir: oracledb.BIND_OUT,
                        type: oracledb.NUMBER,
                    },
                },
                {
                    autoCommit: false,
                }
            );

            const outBindsValor: any =
                valorResult.outBinds;

            const idPlanoValor =
                Array.isArray(outBindsValor?.idPlanoValor)
                    ? outBindsValor.idPlanoValor[0]
                    : outBindsValor?.idPlanoValor;

            await conn.commit();

            return res.status(201).json({
                success: true,
                message:
                    "Plano odontológico cadastrado com sucesso.",

                plano: {
                    idPlano,
                    nomePlano:
                        String(nomePlano).trim(),

                    idOperadora: operadora,

                    operadora:
                        operadoraEncontrada.NM_OPERADORA,

                    tipoCobranca,
                },

                valorInicial: {
                    idPlanoValor,
                    valor,
                    dataInicio:
                        dataVigenciaInicioValor,
                },
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error(
                "Erro ao cadastrar plano odontológico:",
                error
            );

            return res.status(500).json({
                error:
                    "Erro ao cadastrar plano odontológico.",
                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async atualizarPlano(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const idPlano = Number(req.params.id);

            if (
                !Number.isInteger(idPlano) ||
                idPlano <= 0
            ) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            const {
                nomePlano,
                descricao,
                tipoCobranca,
                dataVigenciaInicioPlano,
                nomeUsuario,
                loginUsuario,
            } = req.body || {};

            if (!String(nomePlano || "").trim()) {
                return res.status(400).json({
                    error: "Informe o nome do plano.",
                });
            }

            if (
                tipoCobranca !== "POR_PESSOA" &&
                tipoCobranca !== "POR_PLANO"
            ) {
                return res.status(400).json({
                    error:
                        "Informe um tipo de cobrança válido.",
                });
            }

            if (
                dataVigenciaInicioPlano &&
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(dataVigenciaInicioPlano)
                )
            ) {
                return res.status(400).json({
                    error:
                        "A data de início da vigência do plano é inválida.",
                });
            }

            conn = await getConnection();

            await setAuditoriaContext(conn, req);

            const planoResult = await conn.execute(
                `
                SELECT
                    P.ID_PLANO,
                    P.ID_OPERADORA,
                    P.NM_PLANO,
                    P.DS_PLANO,
                    P.TP_COBRANCA,
                    P.DT_VIGENCIA_INICIO,
                    P.SN_ATIVO,
                    O.NM_OPERADORA

                FROM DBACRESSEM.ODONTO_PLANO P

                INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
                    ON O.ID_OPERADORA = P.ID_OPERADORA

                WHERE P.ID_PLANO = :idPlano

                FOR UPDATE
                `,
                {
                    idPlano,
                },
                {
                    outFormat:
                        oracledb.OUT_FORMAT_OBJECT,
                }
            );

            const plano: any =
                planoResult.rows?.[0];

            if (!plano) {
                return res.status(404).json({
                    error: "Plano não encontrado.",
                });
            }

            if (plano.SN_ATIVO !== 1) {
                return res.status(400).json({
                    error:
                        "Não é possível editar um plano inativo.",
                });
            }

            const duplicadoResult =
                await conn.execute(
                    `
                    SELECT
                        ID_PLANO

                    FROM DBACRESSEM.ODONTO_PLANO

                    WHERE ID_OPERADORA = :idOperadora

                      AND UPPER(TRIM(NM_PLANO)) =
                          UPPER(TRIM(:nomePlano))

                      AND ID_PLANO <> :idPlano

                      AND SN_ATIVO = 1

                    FETCH FIRST 1 ROWS ONLY
                    `,
                    {
                        idOperadora:
                            plano.ID_OPERADORA,

                        nomePlano:
                            String(nomePlano).trim(),

                        idPlano,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            if (duplicadoResult.rows?.length) {
                return res.status(409).json({
                    error:
                        "Já existe outro plano ativo com este nome para a mesma operadora.",
                });
            }

            await conn.execute(
                `
                UPDATE DBACRESSEM.ODONTO_PLANO

                SET
                    NM_PLANO = :nomePlano,

                    DS_PLANO = :descricao,

                    TP_COBRANCA = :tipoCobranca,

                    DT_VIGENCIA_INICIO =
                        CASE
                            WHEN :dataVigenciaInicioPlano IS NOT NULL
                            THEN TO_DATE(
                                :dataVigenciaInicioPlano,
                                'YYYY-MM-DD'
                            )
                            ELSE DT_VIGENCIA_INICIO
                        END,

                    DT_ATUALIZACAO = SYSDATE

                WHERE ID_PLANO = :idPlano
                `,
                {
                    nomePlano:
                        String(nomePlano).trim(),

                    descricao:
                        String(descricao || "").trim() ||
                        null,

                    tipoCobranca,

                    dataVigenciaInicioPlano:
                        dataVigenciaInicioPlano ||
                        null,

                    idPlano,
                },
                {
                    autoCommit: false,
                }
            );

            await conn.commit();

            return res.status(200).json({
                success: true,

                message:
                    "Plano odontológico atualizado com sucesso.",

                plano: {
                    idPlano,

                    nomePlano:
                        String(nomePlano).trim(),

                    idOperadora:
                        plano.ID_OPERADORA,

                    operadora:
                        plano.NM_OPERADORA,

                    tipoCobranca,

                    dataVigenciaInicioPlano:
                        dataVigenciaInicioPlano ||
                        plano.DT_VIGENCIA_INICIO,
                },
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error(
                "Erro ao atualizar plano odontológico:",
                error
            );

            return res.status(500).json({
                error:
                    "Erro ao atualizar plano odontológico.",

                details: error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async alterarStatusPlano(req: Request, res: Response) {
        let conn: oracledb.Connection | undefined;

        try {
            const idPlano = Number(req.params.id);

            if (
                !Number.isInteger(idPlano) ||
                idPlano <= 0
            ) {
                return res.status(400).json({
                    error: "Plano inválido.",
                });
            }

            const {
                ativo,
            } = req.body || {};

            if (typeof ativo !== "boolean") {
                return res.status(400).json({
                    error:
                        "Informe o status do plano através do campo ativo.",
                });
            }

            const novoStatus =
                ativo ? 1 : 0;

            conn = await getConnection();

            await setAuditoriaContext(
                conn,
                req
            );

            const planoResult =
                await conn.execute(
                    `
                SELECT
                    P.ID_PLANO,
                    P.ID_OPERADORA,
                    P.NM_PLANO,
                    P.SN_ATIVO,
                    O.NM_OPERADORA,
                    O.SN_ATIVO AS SN_OPERADORA_ATIVA

                FROM DBACRESSEM.ODONTO_PLANO P

                INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
                    ON O.ID_OPERADORA =
                       P.ID_OPERADORA

                WHERE P.ID_PLANO = :idPlano

                FOR UPDATE
                `,
                    {
                        idPlano,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const plano: any =
                planoResult.rows?.[0];

            if (!plano) {
                return res.status(404).json({
                    error:
                        "Plano odontológico não encontrado.",
                });
            }

            if (
                Number(plano.SN_ATIVO) ===
                novoStatus
            ) {
                return res.status(400).json({
                    error: ativo
                        ? "O plano já está ativo."
                        : "O plano já está inativo.",
                });
            }

            if (!ativo) {
                const beneficiariosResult =
                    await conn.execute(
                        `
                    SELECT
                        COUNT(*) AS TOTAL

                    FROM DBACRESSEM.ODONTO_BENEFICIARIO

                    WHERE ID_PLANO = :idPlano
                      AND SN_ATIVO = 1
                    `,
                        {
                            idPlano,
                        },
                        {
                            outFormat:
                                oracledb.OUT_FORMAT_OBJECT,
                        }
                    );

                const beneficiarios: any =
                    beneficiariosResult
                        .rows?.[0];

                const totalBeneficiarios =
                    Number(
                        beneficiarios?.TOTAL ||
                        0
                    );

                if (
                    totalBeneficiarios > 0
                ) {
                    return res
                        .status(409)
                        .json({
                            error:
                                "Não é possível inativar este plano porque existem beneficiários ativos vinculados a ele.",

                            beneficiariosAtivos:
                                totalBeneficiarios,
                        });
                }
            }

            if (ativo) {
                if (
                    Number(
                        plano.SN_OPERADORA_ATIVA
                    ) !== 1
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "Não é possível reativar o plano porque a operadora está inativa.",
                        });
                }

                //verifica se existe pelo menos um valor cadastrado
                const valorResult =
                    await conn.execute(
                        `
                    SELECT
                        ID_PLANO_VALOR

                    FROM DBACRESSEM.ODONTO_PLANO_VALOR

                    WHERE ID_PLANO =
                          :idPlano

                    FETCH FIRST 1 ROWS ONLY
                    `,
                        {
                            idPlano,
                        },
                        {
                            outFormat:
                                oracledb.OUT_FORMAT_OBJECT,
                        }
                    );

                if (
                    !valorResult.rows?.length
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "Não é possível reativar o plano porque ele não possui valor cadastrado.",
                        });
                }
            }

            await conn.execute(
                `
            UPDATE DBACRESSEM.ODONTO_PLANO

            SET
                SN_ATIVO = :novoStatus,
                DT_ATUALIZACAO = SYSDATE

            WHERE ID_PLANO = :idPlano
            `,
                {
                    novoStatus,
                    idPlano,
                },
                {
                    autoCommit: false,
                }
            );

            await conn.commit();

            return res.status(200).json({
                success: true,

                message: ativo
                    ? "Plano odontológico reativado com sucesso."
                    : "Plano odontológico inativado com sucesso.",

                plano: {
                    idPlano:
                        plano.ID_PLANO,

                    nomePlano:
                        plano.NM_PLANO,

                    operadora:
                        plano.NM_OPERADORA,

                    ativo,
                },
            });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error(
                "Erro ao alterar status do plano odontológico:",
                error
            );

            return res.status(500).json({
                error:
                    "Erro ao alterar status do plano odontológico.",

                details:
                    error.message,
            });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },
};