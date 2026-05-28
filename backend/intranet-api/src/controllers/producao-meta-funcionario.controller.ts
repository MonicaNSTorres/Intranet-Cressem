import { Request, Response } from "express";
import oracledb from "oracledb";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { oracleExecute } from "../services/oracle.service";
import { registrarMonitorMeta } from "../services/monitor-meta.service";
import { parsePeriodo } from "../services/producao-meta-funcionario/periodo";
import { getSql, TemaFuncionario } from "../services/producao-meta-funcionario/queries";

const TEMAS_VALIDOS: TemaFuncionario[] = [
    "consorcio",
    "seguro_gerais_novo",
    "entrada_cooperados",
    "conta_corrente_abertas",
    "seguro_venda_nova",
    "seguro_rural",
    "saldo_previdencia_mi",
    "saldo_previdencia_vgbl",
];

function isTema(value: string): value is TemaFuncionario {
    return TEMAS_VALIDOS.includes(value as TemaFuncionario);
}

function normalizeKeys(row: any) {
    const normalized: any = {};

    Object.keys(row || {}).forEach((key) => {
        normalized[String(key).toLowerCase()] = row[key];
    });

    return normalized;
}

const AD_GROUP_SUPORTE = "GG_USERS_SUPORTE";
const DEBUG_FORCAR_GESTOR_NOME = String(
    process.env.META_FUNC_DEBUG_GESTOR_NOME ||
    process.env.META_PA_DEBUG_GERENTE_NOME ||
    ""
).trim();

const SQL_USUARIO_NIVEL = `
SELECT
  f.ID_FUNCIONARIO,
  UPPER(TRIM(NVL(c.NM_NIVEL, ''))) AS NM_NIVEL,
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
LEFT JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
  ON c.ID_CARGO = f.ID_CARGO
WHERE UPPER(TRIM(NVL(f.NM_LOGIN, ''))) = UPPER(TRIM(:login))
FETCH FIRST 1 ROWS ONLY
`;

const SQL_FUNCIONARIO_POR_NOME = `
SELECT
  f.ID_FUNCIONARIO,
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
WHERE UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) = UPPER(TRIM(:nome_funcionario))
FETCH FIRST 1 ROWS ONLY
`;

const SQL_SUBORDINADOS_POR_GESTOR = `
SELECT DISTINCT
  UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) AS NM_FUNCIONARIO
FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
WHERE f.ID_FUNCIONARIO IS NOT NULL
  AND UPPER(TRIM(NVL(f.NM_FUNCIONARIO, ''))) IS NOT NULL
START WITH f.CD_GERENCIA = :id_gestor
CONNECT BY NOCYCLE PRIOR f.ID_FUNCIONARIO = f.CD_GERENCIA
`;

function toUpperTrim(value: any) {
    return String(value || "").trim().toUpperCase();
}

function normalizeNomePessoa(value: any) {
    return toUpperTrim(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function hasGroup(grupos: string[], target: string) {
    const alvo = toUpperTrim(target);
    return grupos.some((g) => toUpperTrim(g) === alvo);
}

async function buscarNomesSubordinadosPorId(idGestor: number) {
    if (!idGestor) return new Set<string>();

    const subordinadosResult = await oracleExecute(
        SQL_SUBORDINADOS_POR_GESTOR,
        { id_gestor: idGestor },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return new Set<string>(
        (subordinadosResult.rows || [])
            .map((row: any) => normalizeNomePessoa(row.NM_FUNCIONARIO))
            .filter((nome: string) => Boolean(nome))
    );
}

function rowNomeFuncionario(row: any) {
    return (
        row?.nm_funcionario_nome ||
        row?.nm_funcionario ||
        row?.cpf_funcionario ||
        ""
    );
}

async function buscarNomesPermitidosSomenteGestor(nomeGestor: string) {
    const nome = String(nomeGestor || "").trim();
    if (!nome) return new Set<string>();

    const funcionarioResult = await oracleExecute(
        SQL_FUNCIONARIO_POR_NOME,
        { nome_funcionario: nome },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const funcionario: any = funcionarioResult.rows?.[0] || {};
    const idFuncionario = Number(funcionario.ID_FUNCIONARIO || 0);

    const nomesPermitidos = new Set<string>([normalizeNomePessoa(nome)]);

    if (funcionario.NM_FUNCIONARIO) {
        nomesPermitidos.add(normalizeNomePessoa(funcionario.NM_FUNCIONARIO));
    }

    if (idFuncionario) {
        const nomesSubordinados = await buscarNomesSubordinadosPorId(idFuncionario);
        nomesSubordinados.forEach((nm) => nomesPermitidos.add(nm));
    }

    return nomesPermitidos;
}

async function buscarPerfilAcessoMetaFuncionario(user?: AuthenticatedRequest["user"]) {
    const login = String(user?.sub || "").trim();
    const nomeAd = String(user?.nome_completo || "").trim();
    const grupos = Array.isArray(user?.grupos) ? user!.grupos! : [];

    if (!login && !nomeAd) {
        return {
            verTudo: false,
            nomesPermitidos: new Set<string>(),
        };
    }

    if (hasGroup(grupos, AD_GROUP_SUPORTE)) {
        return {
            verTudo: true,
            nomesPermitidos: new Set<string>(),
        };
    }

    let nomeFuncionario = "";
    let idFuncionario = 0;

    if (login) {
        const perfilResult = await oracleExecute(
            SQL_USUARIO_NIVEL,
            { login },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const perfil: any = perfilResult.rows?.[0] || {};
        const nmNivel = toUpperTrim(perfil.NM_NIVEL);
        idFuncionario = Number(perfil.ID_FUNCIONARIO || 0);
        nomeFuncionario = String(perfil.NM_FUNCIONARIO || "").trim();

        if (nmNivel === "DIRETORIA") {
            return {
                verTudo: true,
                nomesPermitidos: new Set<string>(),
            };
        }
    }

    const nomesPermitidos = new Set<string>();
    if (nomeAd) nomesPermitidos.add(normalizeNomePessoa(nomeAd));
    if (nomeFuncionario) nomesPermitidos.add(normalizeNomePessoa(nomeFuncionario));

    if (idFuncionario) {
        const nomesSubordinados = await buscarNomesSubordinadosPorId(idFuncionario);
        nomesSubordinados.forEach((nm) => nomesPermitidos.add(nm));
    }

    return {
        verTudo: false,
        nomesPermitidos,
    };
}

export const producaoMetaFuncionarioController = {
    async listar(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const forcarNomeGestor = String(
                req.query.forcar_nome_gestor || DEBUG_FORCAR_GESTOR_NOME || ""
            ).trim();
            const tema = String(req.query.tema || "").trim();
            const data = String(req.query.data || "").trim();

            console.log("Tema recebido:", tema);
            console.log("Data recebida:", data);

            if (!tema || !isTema(tema)) {
                return res.status(400).json({ error: "Tema inválido." });
            }

            const periodo = parsePeriodo(data);

            console.log("Período parseado:", periodo);

            if (!periodo?.dt_inicio || !periodo?.dt_fim) {
                return res.status(400).json({ error: "Período inválido." });
            }

            const sql = getSql(tema);

            console.log("Executando SQL do tema:", tema);

            const result = await oracleExecute(
                sql,
                {
                    dt_inicio: periodo.dt_inicio,
                    dt_fim: periodo.dt_fim,
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            console.log("Quantidade de linhas:", result.rows?.length || 0);
            console.log("Primeira linha:", result.rows?.[0]);

            const rows = (result.rows || []).map((row: any) => normalizeKeys(row));

            let rowsFiltradas = rows;

            if (forcarNomeGestor) {
                const nomesPermitidos = await buscarNomesPermitidosSomenteGestor(forcarNomeGestor);
                rowsFiltradas = rows.filter((row: any) =>
                    nomesPermitidos.has(normalizeNomePessoa(rowNomeFuncionario(row)))
                );
            } else {
                const perfilAcesso = await buscarPerfilAcessoMetaFuncionario(authReq.user);
                rowsFiltradas = perfilAcesso.verTudo
                    ? rows
                    : rows.filter((row: any) =>
                        perfilAcesso.nomesPermitidos.has(
                            normalizeNomePessoa(rowNomeFuncionario(row))
                        )
                    );
            }

            try {
                await registrarMonitorMeta({
                    tela: "producao_meta_funcionario",
                    tema,
                    periodo: `${periodo.dt_inicio}|${periodo.dt_fim}`,
                    fonte: "API_PRODUCAO_META_FUNCIONARIO",
                    dtFimPeriodo: periodo.dt_fim,
                    rows: rowsFiltradas,
                });
            } catch (monitorErr: any) {
                console.error("Erro ao registrar monitor meta funcionario:", monitorErr);
            }

            return res.json(rowsFiltradas);
        } catch (err: any) {
            console.error("producaoMetaFuncionarioController.listar erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar relatório.",
                details: String(err?.message || err),
            });
        }
    },

    async datas(_req: Request, res: Response) {
        try {
            return res.json([]);
        } catch (err: any) {
            console.error("producaoMetaFuncionarioController.datas erro:", err);
            return res.status(500).json({
                error: "Falha ao consultar datas do relatório.",
                details: String(err?.message || err),
            });
        }
    },
};
