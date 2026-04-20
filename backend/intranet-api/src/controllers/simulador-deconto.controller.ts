import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

function somenteNumeros(valor: string) {
    return String(valor || "").replace(/\D/g, "");
}

function toNumberOrNull(value: any) {
    if (value === undefined || value === null || value === "") return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const raw = String(value).trim();

    if (!raw) return null;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    let normalized = raw;

    if (hasComma && hasDot) {
        normalized = raw.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
        normalized = raw.replace(",", ".");
    } else {
        normalized = raw;
    }

    normalized = normalized.replace(/[^\d.-]/g, "");

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
}

function toStringOrEmpty(value: any) {
    return String(value ?? "").trim();
}

export const simuladorDescontoController = {
    async buscarAssociadoAnalitico(req: Request, res: Response) {
        try {
            const cpf = somenteNumeros(String(req.params.cpf || ""));

            if (!cpf) {
                return res.status(400).json({
                    error: "CPF não informado.",
                });
            }

            const sql = `
        SELECT
          ID_CLIENTE,
          NM_CLIENTE,
          REGEXP_REPLACE(NR_CPF_CNPJ, '[^0-9]', '') AS NR_CPF_CNPJ,
          NR_MATRICULA,
          NM_EMPRESA,
          REGEXP_REPLACE(NR_CPF_CNPJ_EMPREGADOR, '[^0-9]', '') AS NR_CPF_CNPJ_EMPREGADOR,
          NM_CARGO,
          SL_CONTA_CAPITAL,
          NR_CONTA_CAPITAL,
          TO_CHAR(DT_NASCIMENTO, 'YYYY-MM-DD') AS DT_NASCIMENTO,
          DS_ENDERECO,
          NM_BAIRRO,
          NM_CIDADE,
          SG_ESTADO,
          REGEXP_REPLACE(NR_CEP, '[^0-9]', '') AS NR_CEP,
          NR_DOCUMENTO,
          NM_ORGAO,
          DS_EMAIL,
          NR_IAP,
          NR_CONSORCIO,
          NR_ANO_ASSOCIADO,
          NR_ANO_CORRENTISTA,
          NR_MESES_PORTABILIDADE,
          SL_DEVEDOR_DIA,
          NR_SEGUROS,
          NR_CARTAO,
          SL_HONRA_SAVAIS,
          SL_PREJUIZO,
          SL_LIMITE_CHEQUE,
          NR_LIMITE_CARTAO,
          ST_INTEGRALIZACAO,
          REGEXP_REPLACE(NR_TELEFONE, '[^0-9]', '') AS NR_TELEFONE,
          NM_MAE,
          TO_CHAR(DT_ADMISSA, 'YYYY-MM-DD') AS DT_ADMISSA,
          VL_RENDA_BRUTA,
          SN_VINCULO_EMPREGATICIO
        FROM DBACRESSEM.ASSOCIADO_ANALITICO
        WHERE REGEXP_REPLACE(NR_CPF_CNPJ, '[^0-9]', '') = :cpf
        FETCH FIRST 1 ROWS ONLY
      `;

            const result = await oracleExecute(
                sql,
                { cpf },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row: any = result.rows?.[0];

            if (!row) {
                return res.status(404).json({
                    error: "Associado não encontrado.",
                });
            }

            return res.json({
                ID_CLIENTE: row.ID_CLIENTE ?? null,
                NM_CLIENTE: row.NM_CLIENTE || "",
                NR_CPF_CNPJ: row.NR_CPF_CNPJ || "",
                NR_MATRICULA: row.NR_MATRICULA || "",
                NM_EMPRESA: row.NM_EMPRESA || "",
                NR_CPF_CNPJ_EMPREGADOR: row.NR_CPF_CNPJ_EMPREGADOR || "",
                NM_CARGO: row.NM_CARGO || "",
                SL_CONTA_CAPITAL: row.SL_CONTA_CAPITAL ?? 0,
                NR_CONTA_CAPITAL: row.NR_CONTA_CAPITAL || "",
                DT_NASCIMENTO: row.DT_NASCIMENTO || "",
                DS_ENDERECO: row.DS_ENDERECO || "",
                NM_BAIRRO: row.NM_BAIRRO || "",
                NM_CIDADE: row.NM_CIDADE || "",
                SG_ESTADO: row.SG_ESTADO || "",
                NR_CEP: row.NR_CEP || "",
                NR_DOCUMENTO: row.NR_DOCUMENTO || "",
                NM_ORGAO: row.NM_ORGAO || "",
                DS_EMAIL: row.DS_EMAIL || "",
                NR_IAP: row.NR_IAP ?? 0,
                NR_CONSORCIO: row.NR_CONSORCIO ?? 0,
                NR_ANO_ASSOCIADO: row.NR_ANO_ASSOCIADO ?? 0,
                NR_ANO_CORRENTISTA: row.NR_ANO_CORRENTISTA ?? 0,
                NR_MESES_PORTABILIDADE: row.NR_MESES_PORTABILIDADE ?? 0,
                SL_DEVEDOR_DIA: row.SL_DEVEDOR_DIA ?? 0,
                NR_SEGUROS: row.NR_SEGUROS ?? 0,
                NR_CARTAO: row.NR_CARTAO ?? 0,
                SL_HONRA_SAVAIS: row.SL_HONRA_SAVAIS ?? 0,
                SL_PREJUIZO: row.SL_PREJUIZO ?? 0,
                SL_LIMITE_CHEQUE: row.SL_LIMITE_CHEQUE ?? 0,
                NR_LIMITE_CARTAO: row.NR_LIMITE_CARTAO ?? 0,
                ST_INTEGRALIZACAO: row.ST_INTEGRALIZACAO || "",
                NR_TELEFONE: row.NR_TELEFONE || "",
                NM_MAE: row.NM_MAE || "",
                DT_ADMISSA: row.DT_ADMISSA || "",
                VL_RENDA_BRUTA: row.VL_RENDA_BRUTA ?? 0,
                SN_VINCULO_EMPREGATICIO: row.SN_VINCULO_EMPREGATICIO ?? 0,
            });
        } catch (err: any) {
            console.error("Erro ao buscar associado analítico do simulador:", err);
            return res.status(500).json({
                error: "Erro ao buscar associado analítico.",
                details: String(err?.message || err),
            });
        }
    },

    async listarAnosAssociado(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_ANOS_ASSOCIADO,
          DESC_ANOS_ASSOCIADO,
          VL_ANOS_ASSOCIADO
        FROM DBACRESSEM.ANOS_ASSOCIADO
        ORDER BY ID_ANOS_ASSOCIADO
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar anos de associado:", err);
            return res.status(500).json({
                error: "Erro ao listar anos de associado.",
                details: String(err?.message || err),
            });
        }
    },

    async listarAnosCorrentista(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_ANOS_CORRENTISTA,
          DESC_CORRENTISTA,
          VL_CORRENTISTA
        FROM DBACRESSEM.ANOS_CORRENTISTA
        ORDER BY ID_ANOS_CORRENTISTA
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar anos de correntista:", err);
            return res.status(500).json({
                error: "Erro ao listar anos de correntista.",
                details: String(err?.message || err),
            });
        }
    },

    async listarCidades(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_CIDADES,
          ID_UF,
          NM_CIDADE
        FROM DBACRESSEM.CIDADES
        ORDER BY NM_CIDADE
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar cidades:", err);
            return res.status(500).json({
                error: "Erro ao listar cidades.",
                details: String(err?.message || err),
            });
        }
    },

    async listarClassificacaoRisco(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_CLASSIFICACAO_RISCO,
          DESC_CLASSIFICACAO,
          VL_CLASSIFICACAO_RISCO
        FROM DBACRESSEM.CLASSIFICACAO_RISCO
        ORDER BY ID_CLASSIFICACAO_RISCO
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar classificação de risco:", err);
            return res.status(500).json({
                error: "Erro ao listar classificação de risco.",
                details: String(err?.message || err),
            });
        }
    },

    async listarCorrentista(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_CORRENTISTA,
          DESC_TEXTO,
          VL_CORRENTISTA
        FROM DBACRESSEM.CORRENTISTA
        ORDER BY ID_CORRENTISTA
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar correntista:", err);
            return res.status(500).json({
                error: "Erro ao listar correntista.",
                details: String(err?.message || err),
            });
        }
    },

    async listarOutrosProdutos(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_OUTROS_PRODUTOS,
          NM_PRODUTO,
          VL_PRODUTO
        FROM DBACRESSEM.OUTROS_PRODUTOS
        ORDER BY ID_OUTROS_PRODUTOS
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar outros produtos:", err);
            return res.status(500).json({
                error: "Erro ao listar outros produtos.",
                details: String(err?.message || err),
            });
        }
    },

    async listarPortabilidadeSalario(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_PORTABILIDADE_SALARIO,
          DESC_PORTABILIDADE_SALARIO,
          VL_PORTABILIDADE_SALARIO
        FROM DBACRESSEM.PORTABILIDADE_SALARIO
        ORDER BY ID_PORTABILIDADE_SALARIO
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar portabilidade salário:", err);
            return res.status(500).json({
                error: "Erro ao listar portabilidade salário.",
                details: String(err?.message || err),
            });
        }
    },

    async listarTaxaTrabalhador(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_TAXA,
          NR_PARCELA,
          TX_PARCELA
        FROM DBACRESSEM.TAXA_TRABALHADOR_SIMULADOR
        ORDER BY TO_NUMBER(REGEXP_SUBSTR(NR_PARCELA, '[0-9]+'))
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar taxa trabalhador:", err);
            return res.status(500).json({
                error: "Erro ao listar taxa trabalhador.",
                details: String(err?.message || err),
            });
        }
    },

    async listarTaxaParcela(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_TAXA_PARCELA_SIMULADOR,
          NR_PARCELA,
          PERC_TAXA_PARCELA
        FROM DBACRESSEM.TAXA_PARCELA_SIMULADOR
        ORDER BY TO_NUMBER(REGEXP_SUBSTR(NR_PARCELA, '[0-9]+'))
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar taxa por parcela:", err);
            return res.status(500).json({
                error: "Erro ao listar taxa por parcela.",
                details: String(err?.message || err),
            });
        }
    },

    async buscarTaxaParcelaPorNumero(req: Request, res: Response) {
        try {
            const parcela = String(req.params.parcela || "").trim();

            if (!parcela) {
                return res.status(400).json({
                    error: "Parcela não informada.",
                });
            }

            const sql = `
        SELECT
          ID_TAXA_PARCELA_SIMULADOR,
          NR_PARCELA,
          PERC_TAXA_PARCELA
        FROM DBACRESSEM.TAXA_PARCELA_SIMULADOR
        WHERE TRIM(NR_PARCELA) = :parcela
        FETCH FIRST 1 ROWS ONLY
      `;

            const result = await oracleExecute(
                sql,
                { parcela },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const row: any = result.rows?.[0];

            if (!row) {
                return res.status(404).json({
                    error: "Taxa da parcela não encontrada.",
                });
            }

            return res.json(row);
        } catch (err: any) {
            console.error("Erro ao buscar taxa da parcela:", err);
            return res.status(500).json({
                error: "Erro ao buscar taxa da parcela.",
                details: String(err?.message || err),
            });
        }
    },

    async listarTempoRegime(req: Request, res: Response) {
        try {
            const sql = `
        SELECT
          ID_TEMPO_REGIME,
          DESC_TEMPO_REGIME,
          VL_TEMPO_REGIME
        FROM DBACRESSEM.TEMPO_REGIME
        ORDER BY ID_TEMPO_REGIME
      `;

            const result = await oracleExecute(sql, {}, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            return res.json(result.rows || []);
        } catch (err: any) {
            console.error("Erro ao listar tempo de regime:", err);
            return res.status(500).json({
                error: "Erro ao listar tempo de regime.",
                details: String(err?.message || err),
            });
        }
    },

    async salvarSimulacao(req: Request, res: Response) {
        try {
            const {
                NM_TIPO_EMPRESTIMO,
                VL_EMPRESTIMO,
                VL_DIVIDA,
                VL_CAPITAL,
                VL_DESCONTO_TOTAL,
                PERC_TAXA_PARCELA,
                DESC_NUMERO_PARCELA,
                NR_TAXA_FINAL,
                NM_CLASSIFICACAO_RISCO,
                SN_SEGURO,
                SN_AVALISTA,
                SN_OUTRAS_GARANTIAS,
                NM_CIDADE,
                NM_ATENDENTE,
                NM_ASSOCIADO,
                NR_CPF_CNPJ,
            } = req.body || {};

            if (!NM_TIPO_EMPRESTIMO || !NM_ASSOCIADO || !NR_CPF_CNPJ) {
                return res.status(400).json({
                    error: "Campos obrigatórios não informados para salvar a simulação.",
                });
            }

            const bindVL_EMPRESTIMO = toNumberOrNull(VL_EMPRESTIMO);
            const bindVL_DIVIDA = toNumberOrNull(VL_DIVIDA);
            const bindVL_CAPITAL = toNumberOrNull(VL_CAPITAL);
            const bindVL_DESCONTO_TOTAL = toNumberOrNull(VL_DESCONTO_TOTAL);
            const bindPERC_TAXA_PARCELA = toNumberOrNull(PERC_TAXA_PARCELA);
            const bindNR_TAXA_FINAL = toNumberOrNull(NR_TAXA_FINAL);

            if (bindVL_DESCONTO_TOTAL !== null && bindVL_DESCONTO_TOTAL > 999.999) {
                return res.status(400).json({
                    error: "VL_DESCONTO_TOTAL excede o limite permitido pela coluna NUMBER(6,3).",
                });
            }

            if (bindPERC_TAXA_PARCELA !== null && bindPERC_TAXA_PARCELA > 99.99) {
                return res.status(400).json({
                    error: "PERC_TAXA_PARCELA excede o limite permitido pela coluna.",
                });
            }

            const sql = `
        INSERT INTO DBACRESSEM.SIMULADOR_DESCONTO
        (
          NM_TIPO_EMPRESTIMO,
          VL_EMPRESTIMO,
          VL_DIVIDA,
          VL_CAPITAL,
          VL_DESCONTO_TOTAL,
          PERC_TAXA_PARCELA,
          DESC_NUMERO_PARCELA,
          NR_TAXA_FINAL,
          NM_CLASSIFICACAO_RISCO,
          SN_SEGURO,
          SN_AVALISTA,
          SN_OUTRAS_GARANTIAS,
          NM_CIDADE,
          NM_ATENDENTE,
          NM_ASSOCIADO,
          NR_CPF_CNPJ,
          DT_DIA_DESCONTO
        )
        VALUES
        (
          :NM_TIPO_EMPRESTIMO,
          :VL_EMPRESTIMO,
          :VL_DIVIDA,
          :VL_CAPITAL,
          :VL_DESCONTO_TOTAL,
          :PERC_TAXA_PARCELA,
          :DESC_NUMERO_PARCELA,
          :NR_TAXA_FINAL,
          :NM_CLASSIFICACAO_RISCO,
          :SN_SEGURO,
          :SN_AVALISTA,
          :SN_OUTRAS_GARANTIAS,
          :NM_CIDADE,
          :NM_ATENDENTE,
          :NM_ASSOCIADO,
          :NR_CPF_CNPJ,
          SYSDATE
        )
      `;

            const binds = {
                NM_TIPO_EMPRESTIMO: toStringOrEmpty(NM_TIPO_EMPRESTIMO).slice(0, 10),
                VL_EMPRESTIMO: bindVL_EMPRESTIMO,
                VL_DIVIDA: bindVL_DIVIDA,
                VL_CAPITAL: bindVL_CAPITAL,
                VL_DESCONTO_TOTAL: bindVL_DESCONTO_TOTAL,
                PERC_TAXA_PARCELA: bindPERC_TAXA_PARCELA,
                DESC_NUMERO_PARCELA: toStringOrEmpty(DESC_NUMERO_PARCELA).slice(0, 10),
                NR_TAXA_FINAL: bindNR_TAXA_FINAL,
                NM_CLASSIFICACAO_RISCO: toStringOrEmpty(NM_CLASSIFICACAO_RISCO).slice(0, 2),
                SN_SEGURO: toStringOrEmpty(SN_SEGURO).slice(0, 3),
                SN_AVALISTA: toStringOrEmpty(SN_AVALISTA).slice(0, 3),
                SN_OUTRAS_GARANTIAS: toStringOrEmpty(SN_OUTRAS_GARANTIAS).slice(0, 70),
                NM_CIDADE: toStringOrEmpty(NM_CIDADE).slice(0, 30),
                NM_ATENDENTE: toStringOrEmpty(NM_ATENDENTE).slice(0, 150),
                NM_ASSOCIADO: toStringOrEmpty(NM_ASSOCIADO).slice(0, 150),
                NR_CPF_CNPJ: somenteNumeros(NR_CPF_CNPJ).slice(0, 15),
            };

            await oracleExecute(sql, binds, { autoCommit: true });

            return res.json({
                success: true,
                message: "Simulação salva com sucesso.",
            });
        } catch (err: any) {
            console.error("Erro ao salvar simulação:", err);
            return res.status(500).json({
                error: "Erro ao salvar simulação.",
                details: String(err?.message || err),
            });
        }
    },
};