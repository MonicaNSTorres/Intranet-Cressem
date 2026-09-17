import { Request, Response } from "express";
import fs from "fs";
import oracledb from "oracledb";
import { setAuditoriaContext } from "../services/oracle.service";

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
    });
}

type LinhaCsv = {
    [key: string]: string;
};

const CABECALHOS_ESPERADOS = [
    "empresa",
    "unidade",
    "nome_unidade",
    "credencial",
    "matricula",
    "cpf",
    "beneficiario",
    "nome_mae",
    "nascimento",
    "inicio",
    "idade",
    "parentesco",
    "plano",
    "ac",
    "mensalidade",
    "adicional",
    "taxa_adesao",
    "desconto",
    "cobrado",
];

function removerAcentos(valor: string) {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function somenteNumeros(valor: unknown): string {
    return String(valor || "").replace(/\D/g, "");
}

function normalizarCabecalho(valor: string) {
    let resultado = removerAcentos(
        String(valor || "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toLowerCase()
    )
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "");

    const aliases: Record<string, string> = {
        empa: "empresa",
        mae: "nome_mae",
    };

    resultado =
        aliases[resultado] ||
        resultado;

    return resultado;
}

function limparValorCsv(valor: unknown) {
    let texto = String(valor ?? "").trim();

    if (
        texto.startsWith('="') &&
        texto.endsWith('"')
    ) {
        texto = texto.substring(
            2,
            texto.length - 1
        );
    } else if (
        texto.startsWith('"') &&
        texto.endsWith('"')
    ) {
        texto = texto.substring(
            1,
            texto.length - 1
        );
    }

    return texto.trim();
}

function converterCentavos(
    valor: unknown
): number {
    const texto =
        limparValorCsv(valor);

    if (!texto) {
        return 0;
    }

    const valorLimpo =
        texto.replace(/[^\d-]/g, "");

    if (!valorLimpo) {
        return 0;
    }

    const numero =
        Number(valorLimpo);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return numero / 100;
}

function converterData(
    valor: unknown
): Date | null {
    const texto =
        limparValorCsv(valor);

    if (!texto) {
        return null;
    }

    const match = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!match) {
        return null;
    }

    const dia =
        Number(match[1]);

    const mes =
        Number(match[2]);

    const ano =
        Number(match[3]);

    if (
        dia < 1 ||
        dia > 31 ||
        mes < 1 ||
        mes > 12 ||
        ano < 1900
    ) {
        return null;
    }

    return new Date(
        ano,
        mes - 1,
        dia,
        12,
        0,
        0
    );
}

function extrairAnoGeracao(
    conteudo: string
): number | null {
    const match = conteudo.match(
        /Geracao\s+em\s+\d{2}\/\d{2}\/(\d{4})/i
    );

    if (!match) {
        return null;
    }

    return Number(match[1]);
}

function encontrarCabecalho(
    linhas: string[]
): number {
    return linhas.findIndex(
        (linha) => {
            const normalizada =
                removerAcentos(
                    linha
                        .toLowerCase()
                        .trim()
                );

            return (
                normalizada.includes(
                    "empresa;"
                ) &&
                normalizada.includes(
                    "cpf;"
                ) &&
                normalizada.includes(
                    "beneficiario;"
                ) &&
                normalizada.includes(
                    "cobrado"
                )
            );
        }
    );
}

function validarCabecalho(
    cabecalhos: string[]
) {
    const faltantes =
        CABECALHOS_ESPERADOS.filter(
            (coluna) =>
                !cabecalhos.includes(
                    coluna
                )
        );

    if (faltantes.length) {
        throw new Error(
            `O CSV não possui todas as colunas esperadas. Colunas ausentes: ${faltantes.join(
                ", "
            )}.`
        );
    }
}

function interpretarCsv(
    buffer: Buffer
) {
    let conteudo =
        buffer.toString("utf8");

    conteudo =
        conteudo.replace(
            /^\uFEFF/,
            ""
        );

    const linhas =
        conteudo.split(/\r?\n/);

    const indiceCabecalho =
        encontrarCabecalho(
            linhas
        );

    if (indiceCabecalho < 0) {
        throw new Error(
            "Não foi possível localizar o cabeçalho da tabela de beneficiários no CSV."
        );
    }

    const cabecalhos =
        linhas[indiceCabecalho]
            .split(";")
            .map(
                normalizarCabecalho
            );

    validarCabecalho(
        cabecalhos
    );

    const totalColunas =
        cabecalhos.length;

    const registros: LinhaCsv[] =
        [];

    let iniciouBeneficiarios =
        false;

    for (
        let indice =
            indiceCabecalho + 1;
        indice < linhas.length;
        indice++
    ) {
        const linhaOriginal =
            linhas[indice];

        const linha =
            linhaOriginal.trim();

        if (!linha) {
            if (
                iniciouBeneficiarios
            ) {
                break;
            }

            continue;
        }

        const valores =
            linhaOriginal.split(";");

        if (
            valores.length !==
            totalColunas
        ) {
            if (
                iniciouBeneficiarios
            ) {
                break;
            }

            continue;
        }

        const registro: LinhaCsv =
            {};

        cabecalhos.forEach(
            (
                cabecalho,
                indiceColuna
            ) => {
                registro[
                    cabecalho
                ] =
                    limparValorCsv(
                        valores[
                        indiceColuna
                        ]
                    );
            }
        );

        const cpf =
            somenteNumeros(
                registro.cpf
            );

        const beneficiario =
            limparValorCsv(
                registro.beneficiario
            );

        if (
            !cpf &&
            !beneficiario
        ) {
            if (
                iniciouBeneficiarios
            ) {
                break;
            }

            continue;
        }

        iniciouBeneficiarios =
            true;

        registros.push(
            registro
        );
    }

    if (!registros.length) {
        throw new Error(
            "Nenhum beneficiário foi encontrado no CSV."
        );
    }

    return {
        conteudo,
        registros,
        cabecalhos,
    };
}

function obterUsuario(
    req: Request
) {
    const user =
        (req as any).user ||
        {};

    const nomeBody =
        String(
            req.body
                ?.nomeUsuario ||
            ""
        ).trim();

    const loginBody =
        String(
            req.body
                ?.loginUsuario ||
            ""
        ).trim();

    const nome =
        nomeBody ||
        user.nome_completo ||
        user.name ||
        user.displayName ||
        user.username ||
        user.sub ||
        "USUARIO_NAO_IDENTIFICADO";

    const login =
        loginBody ||
        user.username ||
        user.login ||
        user.sub ||
        user.email ||
        "USUARIO_NAO_IDENTIFICADO";

    return {
        nome: String(nome),
        login: String(login),
    };
}

export const odontoInformeRendimentosController = {
    async importar(
        req: Request,
        res: Response
    ) {
        let conn:
            | oracledb.Connection
            | undefined;

        try {
            const arquivoRecebido =
                (req as any).files?.file;

            if (!arquivoRecebido) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Selecione um arquivo CSV para importar.",
                    });
            }

            if (
                Array.isArray(
                    arquivoRecebido
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Envie apenas um arquivo por competência.",
                    });
            }

            const arquivo =
                arquivoRecebido as any;

            const nomeArquivo =
                String(
                    arquivo.name ||
                    ""
                ).trim();

            if (!nomeArquivo) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Não foi possível identificar o nome do arquivo enviado.",
                    });
            }

            if (
                !nomeArquivo
                    .toLowerCase()
                    .endsWith(".csv")
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "O arquivo deve possuir a extensão .CSV.",
                    });
            }

            let bufferArquivo: Buffer;

            if (
                arquivo.tempFilePath &&
                fs.existsSync(
                    arquivo.tempFilePath
                )
            ) {
                bufferArquivo =
                    fs.readFileSync(
                        arquivo.tempFilePath
                    );
            } else if (
                Buffer.isBuffer(
                    arquivo.data
                )
            ) {
                bufferArquivo =
                    arquivo.data;
            } else {
                return res
                    .status(400)
                    .json({
                        error:
                            "Não foi possível acessar o conteúdo do arquivo enviado.",
                    });
            }

            const anoCalendario =
                Number(
                    req.body
                        ?.anoCalendario
                );

            const mesReferencia =
                Number(
                    req.body
                        ?.mesReferencia
                );

            if (
                !Number.isInteger(
                    anoCalendario
                ) ||
                anoCalendario < 2000 ||
                anoCalendario > 2100
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Informe um ano-calendário válido.",
                    });
            }

            if (
                !Number.isInteger(
                    mesReferencia
                ) ||
                mesReferencia < 1 ||
                mesReferencia > 12
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Informe um mês de referência válido, entre 1 e 12.",
                    });
            }

            const {
                conteudo,
                registros,
            } =
                interpretarCsv(
                    bufferArquivo
                );

            const anoGeracao =
                extrairAnoGeracao(
                    conteudo
                );

            if (
                anoGeracao &&
                anoGeracao !==
                anoCalendario
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            `O arquivo parece pertencer ao ano ${anoGeracao}, mas o ano-calendário informado foi ${anoCalendario}.`,
                    });
            }

            const registrosPreparados =
                registros.map(
                    (
                        registro,
                        indice
                    ) => {
                        const cpf =
                            somenteNumeros(
                                registro.cpf
                            );

                        const nome =
                            limparValorCsv(
                                registro
                                    .beneficiario
                            );

                        if (
                            cpf.length !==
                            11
                        ) {
                            throw new Error(
                                `CPF inválido na linha ${indice +
                                1
                                } da tabela de beneficiários: "${registro.cpf
                                }".`
                            );
                        }

                        if (!nome) {
                            throw new Error(
                                `Beneficiário sem nome na linha ${indice +
                                1
                                } da tabela.`
                            );
                        }

                        return {
                            empresa:
                                limparValorCsv(
                                    registro
                                        .empresa
                                ) ||
                                null,

                            unidade:
                                limparValorCsv(
                                    registro
                                        .unidade
                                ) ||
                                null,

                            nomeUnidade:
                                limparValorCsv(
                                    registro
                                        .nome_unidade
                                ) ||
                                null,

                            credencial:
                                limparValorCsv(
                                    registro
                                        .credencial
                                ) ||
                                null,

                            matricula:
                                limparValorCsv(
                                    registro
                                        .matricula
                                ) ||
                                null,

                            cpf,

                            beneficiario:
                                nome,

                            nomeMae:
                                limparValorCsv(
                                    registro
                                        .nome_mae
                                ) ||
                                null,

                            nascimento:
                                converterData(
                                    registro
                                        .nascimento
                                ),

                            inicio:
                                converterData(
                                    registro
                                        .inicio
                                ),

                            idade:
                                registro
                                    .idade
                                    ? Number(
                                        registro
                                            .idade
                                    )
                                    : null,

                            parentesco:
                                limparValorCsv(
                                    registro
                                        .parentesco
                                ) ||
                                null,

                            plano:
                                limparValorCsv(
                                    registro
                                        .plano
                                ) ||
                                null,

                            mensalidade:
                                converterCentavos(
                                    registro
                                        .mensalidade
                                ),

                            adicional:
                                converterCentavos(
                                    registro
                                        .adicional
                                ),

                            taxaAdesao:
                                converterCentavos(
                                    registro
                                        .taxa_adesao
                                ),

                            desconto:
                                converterCentavos(
                                    registro
                                        .desconto
                                ),

                            cobrado:
                                converterCentavos(
                                    registro
                                        .cobrado
                                ),
                        };
                    }
                );

            for (
                const registro of registrosPreparados
            ) {
                if (
                    registro.idade !==
                    null &&
                    !Number.isFinite(
                        registro.idade
                    )
                ) {
                    throw new Error(
                        `Idade inválida para o beneficiário "${registro.beneficiario}".`
                    );
                }
            }

            conn =
                await getConnection();

            await setAuditoriaContext(
                conn,
                req
            );

            const existenteResult =
                await conn.execute(
                    `
                    SELECT
                        ID_IMPORTACAO,
                        ANO_CALENDARIO,
                        MES_REFERENCIA,
                        NM_ARQUIVO,
                        DT_IMPORTACAO

                    FROM
                        DBACRESSEM.ODONTO_INFORME_IMPORTACAO

                    WHERE
                        ANO_CALENDARIO =
                        :anoCalendario

                        AND
                        MES_REFERENCIA =
                        :mesReferencia
                    `,
                    {
                        anoCalendario,
                        mesReferencia,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const existente: any =
                existenteResult
                    .rows?.[0];

            if (existente) {
                return res
                    .status(409)
                    .json({
                        error:
                            "Esta competência já foi importada.",

                        competencia: {
                            ano:
                                existente.ANO_CALENDARIO,

                            mes:
                                existente.MES_REFERENCIA,

                            arquivo:
                                existente.NM_ARQUIVO,

                            dataImportacao:
                                existente.DT_IMPORTACAO,
                        },
                    });
            }

            const usuario =
                obterUsuario(req);

            const importacaoResult =
                await conn.execute(
                    `
                    INSERT INTO
                        DBACRESSEM.ODONTO_INFORME_IMPORTACAO
                    (
                        ANO_CALENDARIO,
                        MES_REFERENCIA,
                        NM_ARQUIVO,
                        NR_TOTAL_REGISTROS,
                        DT_IMPORTACAO,
                        NM_USUARIO_IMPORTACAO,
                        LOGIN_USUARIO_IMPORTACAO,
                        SN_PROCESSADO
                    )
                    VALUES
                    (
                        :anoCalendario,
                        :mesReferencia,
                        :nomeArquivo,
                        :totalRegistros,
                        SYSDATE,
                        :nomeUsuario,
                        :loginUsuario,
                        0
                    )

                    RETURNING
                        ID_IMPORTACAO

                    INTO
                        :idImportacao
                    `,
                    {
                        anoCalendario,

                        mesReferencia,

                        nomeArquivo:
                            nomeArquivo,

                        totalRegistros:
                            registrosPreparados.length,

                        nomeUsuario:
                            usuario.nome,

                        loginUsuario:
                            usuario.login,

                        idImportacao: {
                            dir:
                                oracledb.BIND_OUT,

                            type:
                                oracledb.NUMBER,
                        },
                    },
                    {
                        autoCommit:
                            false,
                    }
                );

            const outBinds: any =
                importacaoResult.outBinds;

            const idImportacao =
                Array.isArray(
                    outBinds
                        ?.idImportacao
                )
                    ? outBinds
                        .idImportacao[0]
                    : outBinds
                        ?.idImportacao;

            if (!idImportacao) {
                throw new Error(
                    "Não foi possível obter o ID da importação criada."
                );
            }

            const bindsItens =
                registrosPreparados.map(
                    (registro) => ({
                        idImportacao:
                            Number(
                                idImportacao
                            ),

                        ...registro,
                    })
                );

            await conn.executeMany(
                `
                INSERT INTO
                    DBACRESSEM.ODONTO_INFORME_ITEM
                (
                    ID_IMPORTACAO,
                    NR_EMPRESA,
                    NR_UNIDADE,
                    NM_UNIDADE,
                    NR_CREDENCIAL,
                    NR_MATRICULA,
                    NR_CPF,
                    NM_BENEFICIARIO,
                    NM_MAE,
                    DT_NASCIMENTO,
                    DT_INICIO,
                    NR_IDADE,
                    DS_PARENTESCO,
                    NM_PLANO,
                    VL_MENSALIDADE,
                    VL_ADICIONAL,
                    VL_TAXA_ADESAO,
                    VL_DESCONTO,
                    VL_COBRADO,
                    DT_CRIACAO
                )
                VALUES
                (
                    :idImportacao,
                    :empresa,
                    :unidade,
                    :nomeUnidade,
                    :credencial,
                    :matricula,
                    :cpf,
                    :beneficiario,
                    :nomeMae,
                    :nascimento,
                    :inicio,
                    :idade,
                    :parentesco,
                    :plano,
                    :mensalidade,
                    :adicional,
                    :taxaAdesao,
                    :desconto,
                    :cobrado,
                    SYSDATE
                )
                `,
                bindsItens,
                {
                    autoCommit:
                        false,

                    bindDefs: {
                        idImportacao: {
                            type:
                                oracledb.NUMBER,
                        },

                        empresa: {
                            type:
                                oracledb.STRING,
                            maxSize: 100,
                        },

                        unidade: {
                            type:
                                oracledb.STRING,
                            maxSize: 100,
                        },

                        nomeUnidade: {
                            type:
                                oracledb.STRING,
                            maxSize: 255,
                        },

                        credencial: {
                            type:
                                oracledb.STRING,
                            maxSize: 100,
                        },

                        matricula: {
                            type:
                                oracledb.STRING,
                            maxSize: 100,
                        },

                        cpf: {
                            type:
                                oracledb.STRING,
                            maxSize: 20,
                        },

                        beneficiario: {
                            type:
                                oracledb.STRING,
                            maxSize: 255,
                        },

                        nomeMae: {
                            type:
                                oracledb.STRING,
                            maxSize: 255,
                        },

                        nascimento: {
                            type:
                                oracledb.DATE,
                        },

                        inicio: {
                            type:
                                oracledb.DATE,
                        },

                        idade: {
                            type:
                                oracledb.NUMBER,
                        },

                        parentesco: {
                            type:
                                oracledb.STRING,
                            maxSize: 100,
                        },

                        plano: {
                            type:
                                oracledb.STRING,
                            maxSize: 255,
                        },

                        mensalidade: {
                            type:
                                oracledb.NUMBER,
                        },

                        adicional: {
                            type:
                                oracledb.NUMBER,
                        },

                        taxaAdesao: {
                            type:
                                oracledb.NUMBER,
                        },

                        desconto: {
                            type:
                                oracledb.NUMBER,
                        },

                        cobrado: {
                            type:
                                oracledb.NUMBER,
                        },
                    },
                }
            );
            await conn.execute(
                `
                UPDATE
                    DBACRESSEM.ODONTO_INFORME_IMPORTACAO

                SET
                    SN_PROCESSADO = 1

                WHERE
                    ID_IMPORTACAO =
                    :idImportacao
                `,
                {
                    idImportacao:
                        Number(
                            idImportacao
                        ),
                },
                {
                    autoCommit:
                        false,
                }
            );

            await conn.commit();

            const totalTitulares =
                registrosPreparados.filter(
                    (registro) =>
                        String(
                            registro.parentesco ||
                            ""
                        )
                            .trim()
                            .toUpperCase() ===
                        "TITULAR"
                ).length;

            const totalDependentes =
                registrosPreparados.length -
                totalTitulares;

            const totalCobrado =
                registrosPreparados.reduce(
                    (
                        total,
                        registro
                    ) =>
                        total +
                        Number(
                            registro.cobrado ||
                            0
                        ),
                    0
                );

            return res
                .status(201)
                .json({
                    success:
                        true,

                    message:
                        "Arquivo importado com sucesso.",

                    importacao: {
                        idImportacao:
                            Number(
                                idImportacao
                            ),

                        anoCalendario,

                        mesReferencia,

                        arquivo:
                            nomeArquivo,

                        totalRegistros:
                            registrosPreparados.length,

                        totalTitulares,

                        totalDependentes,

                        totalCobrado:
                            Number(
                                totalCobrado.toFixed(
                                    2
                                )
                            ),
                    },
                });
        } catch (error: any) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch { }
            }

            console.error(
                "Erro ao importar CSV do informe odontológico:",
                error
            );

            if (
                error?.errorNum ===
                1
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "Esta competência já foi importada.",
                    });
            }

            return res
                .status(400)
                .json({
                    error:
                        "Não foi possível importar o arquivo.",

                    details:
                        error?.message ||
                        String(
                            error
                        ),
                });
        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch { }
            }
        }
    },

    async listarImportacoes(
        req: Request,
        res: Response
    ) {
        let conn:
            | oracledb.Connection
            | undefined;

        try {
            const ano =
                Number(
                    req.query.ano
                );

            if (
                !Number.isInteger(
                    ano
                ) ||
                ano < 2000 ||
                ano > 2100
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Informe um ano-calendário válido.",
                    });
            }

            conn =
                await getConnection();

            const result =
                await conn.execute(
                    `
                    SELECT
                        I.ID_IMPORTACAO,
                        I.ANO_CALENDARIO,
                        I.MES_REFERENCIA,
                        I.NM_ARQUIVO,
                        I.NR_TOTAL_REGISTROS,
                        I.DT_IMPORTACAO,
                        I.NM_USUARIO_IMPORTACAO,
                        I.LOGIN_USUARIO_IMPORTACAO,
                        I.SN_PROCESSADO,

                        (
                            SELECT COUNT(*)
                            FROM
                                DBACRESSEM.ODONTO_INFORME_ITEM X

                            WHERE
                                X.ID_IMPORTACAO =
                                I.ID_IMPORTACAO

                            AND
                                UPPER(
                                    TRIM(
                                        X.DS_PARENTESCO
                                    )
                                ) =
                                'TITULAR'
                        ) AS TOTAL_TITULARES,

                        (
                            SELECT COUNT(*)
                            FROM
                                DBACRESSEM.ODONTO_INFORME_ITEM X

                            WHERE
                                X.ID_IMPORTACAO =
                                I.ID_IMPORTACAO

                            AND
                                UPPER(
                                    TRIM(
                                        NVL(
                                            X.DS_PARENTESCO,
                                            ''
                                        )
                                    )
                                ) <>
                                'TITULAR'
                        ) AS TOTAL_DEPENDENTES,

                        (
                            SELECT
                                NVL(
                                    SUM(
                                        X.VL_COBRADO
                                    ),
                                    0
                                )

                            FROM
                                DBACRESSEM.ODONTO_INFORME_ITEM X

                            WHERE
                                X.ID_IMPORTACAO =
                                I.ID_IMPORTACAO
                        ) AS VL_TOTAL_COBRADO

                    FROM
                        DBACRESSEM.ODONTO_INFORME_IMPORTACAO I

                    WHERE
                        I.ANO_CALENDARIO =
                        :ano

                    ORDER BY
                        I.MES_REFERENCIA
                    `,
                    {
                        ano,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            return res
                .status(200)
                .json(
                    result.rows ||
                    []
                );
        } catch (error: any) {
            console.error(
                "Erro ao listar importações do informe odontológico:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Erro ao listar importações.",

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

    async buscarImportacaoPorId(
        req: Request,
        res: Response
    ) {
        let conn:
            | oracledb.Connection
            | undefined;

        try {
            const id =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    id
                ) ||
                id <= 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Importação inválida.",
                    });
            }

            conn =
                await getConnection();

            const importacaoResult =
                await conn.execute(
                    `
                    SELECT
                        ID_IMPORTACAO,
                        ANO_CALENDARIO,
                        MES_REFERENCIA,
                        NM_ARQUIVO,
                        NR_TOTAL_REGISTROS,
                        DT_IMPORTACAO,
                        NM_USUARIO_IMPORTACAO,
                        LOGIN_USUARIO_IMPORTACAO,
                        SN_PROCESSADO

                    FROM
                        DBACRESSEM.ODONTO_INFORME_IMPORTACAO

                    WHERE
                        ID_IMPORTACAO =
                        :id
                    `,
                    {
                        id,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const importacao: any =
                importacaoResult
                    .rows?.[0];

            if (!importacao) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Importação não encontrada.",
                    });
            }

            const resumoResult =
                await conn.execute(
                    `
                    SELECT
                        COUNT(*) AS TOTAL_REGISTROS,

                        COUNT(
                            DISTINCT NR_CPF
                        ) AS TOTAL_CPFS,

                        SUM(
                            CASE
                                WHEN
                                    UPPER(
                                        TRIM(
                                            DS_PARENTESCO
                                        )
                                    ) =
                                    'TITULAR'
                                THEN 1
                                ELSE 0
                            END
                        ) AS TOTAL_TITULARES,

                        SUM(
                            CASE
                                WHEN
                                    UPPER(
                                        TRIM(
                                            NVL(
                                                DS_PARENTESCO,
                                                ''
                                            )
                                        )
                                    ) <>
                                    'TITULAR'
                                THEN 1
                                ELSE 0
                            END
                        ) AS TOTAL_DEPENDENTES,

                        NVL(
                            SUM(
                                VL_MENSALIDADE
                            ),
                            0
                        ) AS VL_TOTAL_MENSALIDADE,

                        NVL(
                            SUM(
                                VL_DESCONTO
                            ),
                            0
                        ) AS VL_TOTAL_DESCONTO,

                        NVL(
                            SUM(
                                VL_COBRADO
                            ),
                            0
                        ) AS VL_TOTAL_COBRADO

                    FROM
                        DBACRESSEM.ODONTO_INFORME_ITEM

                    WHERE
                        ID_IMPORTACAO =
                        :id
                    `,
                    {
                        id,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            return res
                .status(200)
                .json({
                    importacao,

                    resumo:
                        resumoResult
                            .rows?.[0] ||
                        null,
                });
        } catch (error: any) {
            console.error(
                "Erro ao consultar importação do informe odontológico:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Erro ao consultar importação.",

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

    async consolidarAno(
        req: Request,
        res: Response
    ) {
        let conn:
            | oracledb.Connection
            | undefined;

        try {
            const ano = Number(
                req.query.ano
            );

            if (
                !Number.isInteger(ano) ||
                ano < 2000 ||
                ano > 2100
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Informe um ano-calendário válido.",
                    });
            }

            conn =
                await getConnection();

            const competenciasResult =
                await conn.execute(
                    `
                SELECT
                    MES_REFERENCIA,
                    NM_ARQUIVO,
                    NR_TOTAL_REGISTROS,
                    SN_PROCESSADO
                FROM
                    DBACRESSEM.ODONTO_INFORME_IMPORTACAO
                WHERE
                    ANO_CALENDARIO = :ano
                ORDER BY
                    MES_REFERENCIA
                `,
                    {
                        ano,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const competencias =
                competenciasResult.rows || [];

            const pessoasResult =
                await conn.execute(
                    `
                SELECT
                    X.NR_MATRICULA,
                    X.NR_CPF,
                    X.NM_BENEFICIARIO,
                    X.DS_PARENTESCO,

                    SUM(
                        NVL(
                            X.VL_COBRADO,
                            0
                        )
                    ) AS VL_ANUAL_COBRADO,

                    COUNT(
                        DISTINCT I.MES_REFERENCIA
                    ) AS NR_MESES_PRESENTE

                FROM
                    DBACRESSEM.ODONTO_INFORME_ITEM X

                INNER JOIN
                    DBACRESSEM.ODONTO_INFORME_IMPORTACAO I
                    ON I.ID_IMPORTACAO =
                       X.ID_IMPORTACAO

                WHERE
                    I.ANO_CALENDARIO =
                    :ano

                    AND
                    I.SN_PROCESSADO = 1

                GROUP BY
                    X.NR_MATRICULA,
                    X.NR_CPF,
                    X.NM_BENEFICIARIO,
                    X.DS_PARENTESCO

                ORDER BY
                    X.NR_MATRICULA,
                    CASE
                        WHEN UPPER(
                            TRIM(
                                X.DS_PARENTESCO
                            )
                        ) = 'TITULAR'
                        THEN 0
                        ELSE 1
                    END,
                    X.NM_BENEFICIARIO
                `,
                    {
                        ano,
                    },
                    {
                        outFormat:
                            oracledb.OUT_FORMAT_OBJECT,
                    }
                );

            const pessoas: any[] =
                (pessoasResult.rows ||
                    []) as any[];

            const familiasMap =
                new Map<string, any>();

            for (const pessoa of pessoas) {
                const matricula =
                    String(
                        pessoa.NR_MATRICULA ||
                        ""
                    ).trim();

                const chaveFamilia =
                    matricula ||
                    `SEM_MATRICULA_${pessoa.NR_CPF}`;

                if (
                    !familiasMap.has(
                        chaveFamilia
                    )
                ) {
                    familiasMap.set(
                        chaveFamilia,
                        {
                            matricula:
                                matricula ||
                                null,

                            titular: null,

                            dependentes:
                                [],

                            valorTotalFamilia:
                                0,
                        }
                    );
                }

                const familia =
                    familiasMap.get(
                        chaveFamilia
                    );

                const registro = {
                    cpf:
                        pessoa.NR_CPF,

                    nome:
                        pessoa.NM_BENEFICIARIO,

                    parentesco:
                        pessoa.DS_PARENTESCO,

                    valorAnual:
                        Number(
                            pessoa.VL_ANUAL_COBRADO ||
                            0
                        ),

                    mesesPresente:
                        Number(
                            pessoa.NR_MESES_PRESENTE ||
                            0
                        ),
                };

                familia.valorTotalFamilia +=
                    registro.valorAnual;

                const parentesco =
                    String(
                        pessoa.DS_PARENTESCO ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                if (
                    parentesco ===
                    "TITULAR"
                ) {
                    familia.titular =
                        registro;
                } else {
                    familia.dependentes.push(
                        registro
                    );
                }
            }

            const familias =
                Array.from(
                    familiasMap.values()
                ).map((familia) => {
                    const valorTotal =
                        Number(
                            Number(
                                familia
                                    .valorTotalFamilia
                            ).toFixed(2)
                        );

                    return {
                        matricula:
                            familia.matricula,

                        cpfTitular:
                            familia.titular
                                ?.cpf ||
                            null,

                        nomeTitular:
                            familia.titular
                                ?.nome ||
                            null,

                        valorProprioTitular:
                            familia.titular
                                ? Number(
                                    Number(
                                        familia
                                            .titular
                                            .valorAnual
                                    ).toFixed(
                                        2
                                    )
                                )
                                : 0,

                        valorTotalFamilia:
                            valorTotal,

                        mesesTitular:
                            familia.titular
                                ?.mesesPresente ||
                            0,

                        dependentes:
                            familia.dependentes.map(
                                (
                                    dependente: any
                                ) => ({
                                    ...dependente,

                                    valorAnual:
                                        Number(
                                            Number(
                                                dependente
                                                    .valorAnual
                                            ).toFixed(
                                                2
                                            )
                                        ),
                                })
                            ),
                    };
                });

            const familiasComTitular =
                familias.filter(
                    (familia) =>
                        Boolean(
                            familia.cpfTitular
                        )
                );

            const familiasSemTitular =
                familias.filter(
                    (familia) =>
                        !familia.cpfTitular
                );

            return res
                .status(200)
                .json({
                    anoCalendario:
                        ano,

                    totalCompetencias:
                        competencias.length,

                    competencias,

                    resumo: {
                        totalFamilias:
                            familias.length,

                        totalFamiliasComTitular:
                            familiasComTitular.length,

                        totalFamiliasSemTitular:
                            familiasSemTitular.length,

                        totalPessoas:
                            pessoas.length,
                    },

                    familias:
                        familiasComTitular,

                    inconsistencias: {
                        familiasSemTitular,
                    },
                });
        } catch (error: any) {
            console.error(
                "Erro ao consolidar informe odontológico anual:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Erro ao consolidar o informe odontológico anual.",

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