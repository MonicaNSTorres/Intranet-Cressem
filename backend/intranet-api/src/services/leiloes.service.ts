import oracledb from "oracledb";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";
import { sendEmail } from "./email.service";

export type LeilaoInput = {
    NM_PRODUTO: string;
    DS_PRODUTO?: string | null;
    VL_INICIAL: number | string;
    VL_INCREMENTO_MINIMO?: number | string | null;
    DT_INICIO: string;
    DT_FIM: string;
    ST_STATUS?: string | null;
    DS_REGRAS?: string | null;
    IMAGEM_BASE64?: string | null;
    NM_USUARIO_CRIACAO?: string | null;
};

export type LanceInput = {
    ID_LEILAO: number;
    VL_LANCE: number | string;
    NM_USUARIO: string;
    DS_LOGIN?: string | null;
    DS_EMAIL?: string | null;
    NR_IP?: string | null;
};

export type ListarLeiloesParams = {
    busca?: string;
    status?: string;
    page?: number;
    limit?: number;
};

function toNumber(value: unknown) {
    if (typeof value === "number") return value;

    const str = String(value ?? "")
        .replace(/\./g, "")
        .replace(",", ".");

    const n = Number(str);
    return Number.isFinite(n) ? n : 0;
}

function normalizarTexto(value: unknown) {
    return String(value ?? "").trim();
}

function normalizarStatus(value: unknown) {
    return String(value ?? "RASCUNHO").trim().toUpperCase();
}

function normalizarBusca(value: unknown) {
    const str = String(value ?? "").trim();
    return str ? str.toUpperCase() : null;
}

function firstRow(result: any) {
    return result?.rows?.[0] || null;
}

function extrairImagens(value: unknown): string[] {
    if (!value) return [];

    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [String(value)];
    }
}

function montarImagensPorChunks(rows: any[]) {
    const map = new Map<number, { ordem: number; chunks: string[] }>();

    for (const row of rows || []) {
        const id = Number(row.ID_IMAGEM);
        const ordem = Number(row.ORDEM || 1);
        const chunk = String(row.CHUNK || "");

        if (!map.has(id)) {
            map.set(id, { ordem, chunks: [] });
        }

        map.get(id)?.chunks.push(chunk);
    }

    return Array.from(map.values())
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => item.chunks.join(""));
}

const SQL_LISTAR = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.DS_PRODUTO,
        L.VL_INICIAL,
        L.VL_INCREMENTO_MINIMO,
        TO_CHAR(L.DT_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DT_INICIO,
        TO_CHAR(L.DT_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DT_FIM,
        L.ST_STATUS,
        L.DS_REGRAS,
        NULL AS IMAGEM_BASE64,
        L.NM_USUARIO_CRIACAO,
        TO_CHAR(L.DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
        TO_CHAR(L.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,

        NVL((
            SELECT MAX(LL.VL_LANCE)
            FROM DBACRESSEM.LEILAO_LANCE LL
            WHERE LL.ID_LEILAO = L.ID_LEILAO
        ), L.VL_INICIAL) AS VL_LANCE_ATUAL,

        (
            SELECT LL.NM_USUARIO
            FROM DBACRESSEM.LEILAO_LANCE LL
            WHERE LL.ID_LEILAO = L.ID_LEILAO
            ORDER BY LL.VL_LANCE DESC, LL.DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
        ) AS NM_USUARIO_GANHANDO

    FROM DBACRESSEM.LEILAO L
    WHERE
        (:busca IS NULL OR
            UPPER(L.NM_PRODUTO) LIKE '%' || :busca || '%' OR
            UPPER(L.DS_PRODUTO) LIKE '%' || :busca || '%'
        )
        AND (:status IS NULL OR L.ST_STATUS = :status)
    ORDER BY L.DT_CRIACAO DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const SQL_TOTAL = `
    SELECT COUNT(*) AS TOTAL
    FROM DBACRESSEM.LEILAO L
    WHERE
        (:busca IS NULL OR
            UPPER(L.NM_PRODUTO) LIKE '%' || :busca || '%' OR
            UPPER(L.DS_PRODUTO) LIKE '%' || :busca || '%'
        )
        AND (:status IS NULL OR L.ST_STATUS = :status)
`;

const SQL_RESUMO = `
    SELECT
        COUNT(*) AS TOTAL_LEILOES,
        SUM(CASE WHEN ST_STATUS = 'EM_ANDAMENTO' THEN 1 ELSE 0 END) AS TOTAL_EM_ANDAMENTO,
        SUM(CASE WHEN ST_STATUS = 'AGENDADO' THEN 1 ELSE 0 END) AS TOTAL_AGENDADOS,
        SUM(CASE WHEN ST_STATUS = 'FINALIZADO' THEN 1 ELSE 0 END) AS TOTAL_FINALIZADOS
    FROM DBACRESSEM.LEILAO
`;

const SQL_BUSCAR_POR_ID = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.DS_PRODUTO,
        L.VL_INICIAL,
        L.VL_INCREMENTO_MINIMO,
        TO_CHAR(L.DT_INICIO, 'YYYY-MM-DD HH24:MI:SS') AS DT_INICIO,
        TO_CHAR(L.DT_FIM, 'YYYY-MM-DD HH24:MI:SS') AS DT_FIM,
        L.ST_STATUS,
        L.DS_REGRAS,
        NULL AS IMAGEM_BASE64,
        L.NM_USUARIO_CRIACAO,
        TO_CHAR(L.DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
        TO_CHAR(L.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,

        NVL((
            SELECT MAX(LL.VL_LANCE)
            FROM DBACRESSEM.LEILAO_LANCE LL
            WHERE LL.ID_LEILAO = L.ID_LEILAO
        ), L.VL_INICIAL) AS VL_LANCE_ATUAL,

        (
            SELECT LL.NM_USUARIO
            FROM DBACRESSEM.LEILAO_LANCE LL
            WHERE LL.ID_LEILAO = L.ID_LEILAO
            ORDER BY LL.VL_LANCE DESC, LL.DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
        ) AS NM_USUARIO_GANHANDO

    FROM DBACRESSEM.LEILAO L
    WHERE L.ID_LEILAO = :id
`;

const SQL_LISTAR_IMAGENS_CHUNKS = `
    SELECT
        I.ID_IMAGEM,
        I.ORDEM,
        N.LVL AS PARTE,
        DBMS_LOB.SUBSTR(I.IMAGEM_BASE64, 4000, ((N.LVL - 1) * 4000) + 1) AS CHUNK
    FROM DBACRESSEM.LEILAO_IMAGEM I
    JOIN (
        SELECT LEVEL AS LVL
        FROM DUAL
        CONNECT BY LEVEL <= 1000
    ) N
        ON N.LVL <= CEIL(DBMS_LOB.GETLENGTH(I.IMAGEM_BASE64) / 4000)
    WHERE I.ID_LEILAO = :id
    ORDER BY I.ORDEM, I.ID_IMAGEM, N.LVL
`;

const SQL_INSERIR = `
    INSERT INTO DBACRESSEM.LEILAO (
        NM_PRODUTO,
        DS_PRODUTO,
        VL_INICIAL,
        VL_INCREMENTO_MINIMO,
        DT_INICIO,
        DT_FIM,
        ST_STATUS,
        DS_REGRAS,
        IMAGEM_BASE64,
        NM_USUARIO_CRIACAO,
        DT_CRIACAO
    ) VALUES (
        :nm_produto,
        :ds_produto,
        :vl_inicial,
        :vl_incremento_minimo,
        TO_DATE(:dt_inicio, 'YYYY-MM-DD HH24:MI:SS'),
        TO_DATE(:dt_fim, 'YYYY-MM-DD HH24:MI:SS'),
        :st_status,
        :ds_regras,
        NULL,
        :nm_usuario_criacao,
        SYSDATE
    )
    RETURNING ID_LEILAO INTO :id_leilao
`;

const SQL_ATUALIZAR = `
    UPDATE DBACRESSEM.LEILAO
    SET
        NM_PRODUTO = :nm_produto,
        DS_PRODUTO = :ds_produto,
        VL_INICIAL = :vl_inicial,
        VL_INCREMENTO_MINIMO = :vl_incremento_minimo,
        DT_INICIO = TO_DATE(:dt_inicio, 'YYYY-MM-DD HH24:MI:SS'),
        DT_FIM = TO_DATE(:dt_fim, 'YYYY-MM-DD HH24:MI:SS'),
        ST_STATUS = :st_status,
        DS_REGRAS = :ds_regras,
        NM_USUARIO_CRIACAO = :nm_usuario_criacao,
        DT_ATUALIZACAO = SYSDATE
    WHERE ID_LEILAO = :id
`;

const SQL_EXCLUIR_IMAGENS = `
    DELETE FROM DBACRESSEM.LEILAO_IMAGEM
    WHERE ID_LEILAO = :id
`;

const SQL_INSERIR_IMAGEM = `
    INSERT INTO DBACRESSEM.LEILAO_IMAGEM (
        ID_LEILAO,
        IMAGEM_BASE64,
        ORDEM,
        DT_CRIACAO
    ) VALUES (
        :id_leilao,
        :imagem_base64,
        :ordem,
        SYSDATE
    )
`;

const SQL_EXCLUIR_LANCES = `
    DELETE FROM DBACRESSEM.LEILAO_LANCE
    WHERE ID_LEILAO = :id
`;

const SQL_EXCLUIR = `
    DELETE FROM DBACRESSEM.LEILAO
    WHERE ID_LEILAO = :id
`;

const SQL_LISTAR_LANCES = `
    SELECT
        ID_LANCE,
        ID_LEILAO,
        VL_LANCE,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        NR_IP,
        TO_CHAR(DT_LANCE, 'DD/MM/YYYY HH24:MI:SS') AS DT_LANCE
    FROM DBACRESSEM.LEILAO_LANCE
    WHERE ID_LEILAO = :id
    ORDER BY VL_LANCE DESC, DT_LANCE ASC
`;

const SQL_LANCE_ATUAL = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.VL_INICIAL,
        L.VL_INCREMENTO_MINIMO,
        L.ST_STATUS,
        L.DT_INICIO,
        L.DT_FIM,
        CASE
            WHEN SYSDATE < L.DT_INICIO THEN 'S'
            ELSE 'N'
        END AS SN_NAO_INICIOU,
        CASE
            WHEN SYSDATE > L.DT_FIM THEN 'S'
            ELSE 'N'
        END AS SN_ENCERRADO,
        NVL((
            SELECT MAX(LL.VL_LANCE)
            FROM DBACRESSEM.LEILAO_LANCE LL
            WHERE LL.ID_LEILAO = L.ID_LEILAO
        ), L.VL_INICIAL) AS VL_LANCE_ATUAL
    FROM DBACRESSEM.LEILAO L
    WHERE L.ID_LEILAO = :id
`;

const SQL_LIDER_ATUAL = `
    SELECT
        ID_LANCE,
        ID_LEILAO,
        VL_LANCE,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        TO_CHAR(DT_LANCE, 'DD/MM/YYYY HH24:MI:SS') AS DT_LANCE
    FROM DBACRESSEM.LEILAO_LANCE
    WHERE ID_LEILAO = :id
    ORDER BY VL_LANCE DESC, DT_LANCE ASC
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_FINALIZAR_LEILAO = `
    UPDATE DBACRESSEM.LEILAO
    SET
        ST_STATUS = 'FINALIZADO',
        DT_ATUALIZACAO = SYSDATE
    WHERE ID_LEILAO = :id
`;

const SQL_INSERIR_LANCE = `
    INSERT INTO DBACRESSEM.LEILAO_LANCE (
        ID_LEILAO,
        VL_LANCE,
        NM_USUARIO,
        DS_LOGIN,
        DS_EMAIL,
        NR_IP,
        DT_LANCE
    ) VALUES (
        :id_leilao,
        :vl_lance,
        :nm_usuario,
        :ds_login,
        :ds_email,
        :nr_ip,
        SYSDATE
    )
`;

const SQL_BUSCAR_VENCEDOR = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.ST_STATUS,
        TO_CHAR(L.DT_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DT_FIM,

        LL.ID_LANCE,
        LL.VL_LANCE,
        LL.NM_USUARIO,
        LL.DS_LOGIN,
        LL.DS_EMAIL,
        LL.NR_IP,
        TO_CHAR(LL.DT_LANCE, 'DD/MM/YYYY HH24:MI:SS') AS DT_LANCE
    FROM DBACRESSEM.LEILAO L
    LEFT JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
       AND LL.ID_LANCE = (
            SELECT ID_LANCE
            FROM DBACRESSEM.LEILAO_LANCE
            WHERE ID_LEILAO = L.ID_LEILAO
            ORDER BY VL_LANCE DESC, DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
       )
    WHERE L.ID_LEILAO = :id
`;

const SQL_LISTAR_FINALIZADOS = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.DS_PRODUTO,
        L.VL_INICIAL,
        L.VL_INCREMENTO_MINIMO,
        TO_CHAR(L.DT_INICIO, 'DD/MM/YYYY HH24:MI:SS') AS DT_INICIO,
        TO_CHAR(L.DT_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DT_FIM,
        L.ST_STATUS,
        TO_CHAR(L.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,

        LL.ID_LANCE,
        LL.VL_LANCE AS VL_LANCE_VENCEDOR,
        LL.NM_USUARIO AS NM_USUARIO_VENCEDOR,
        LL.DS_LOGIN AS DS_LOGIN_VENCEDOR,
        LL.DS_EMAIL AS DS_EMAIL_VENCEDOR,
        TO_CHAR(LL.DT_LANCE, 'DD/MM/YYYY HH24:MI:SS') AS DT_LANCE_VENCEDOR,

        (
            SELECT COUNT(*)
            FROM DBACRESSEM.LEILAO_LANCE LX
            WHERE LX.ID_LEILAO = L.ID_LEILAO
        ) AS TOTAL_LANCES

    FROM DBACRESSEM.LEILAO L
    LEFT JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
       AND LL.ID_LANCE = (
            SELECT ID_LANCE
            FROM DBACRESSEM.LEILAO_LANCE
            WHERE ID_LEILAO = L.ID_LEILAO
            ORDER BY VL_LANCE DESC, DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
       )
    WHERE L.ST_STATUS = 'FINALIZADO'
      AND (
        :busca IS NULL OR
        UPPER(L.NM_PRODUTO) LIKE '%' || :busca || '%' OR
        UPPER(L.DS_PRODUTO) LIKE '%' || :busca || '%'
      )
    ORDER BY L.DT_FIM DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const SQL_TOTAL_FINALIZADOS = `
    SELECT COUNT(*) AS TOTAL
    FROM DBACRESSEM.LEILAO L
    WHERE L.ST_STATUS = 'FINALIZADO'
      AND (
        :busca IS NULL OR
        UPPER(L.NM_PRODUTO) LIKE '%' || :busca || '%' OR
        UPPER(L.DS_PRODUTO) LIKE '%' || :busca || '%'
      )
`;

const SQL_DASHBOARD_RESUMO = `
    SELECT
        COUNT(*) AS TOTAL_LEILOES,
        SUM(CASE WHEN ST_STATUS = 'EM_ANDAMENTO' THEN 1 ELSE 0 END) AS TOTAL_EM_ANDAMENTO,
        SUM(CASE WHEN ST_STATUS = 'AGENDADO' THEN 1 ELSE 0 END) AS TOTAL_AGENDADOS,
        SUM(CASE WHEN ST_STATUS = 'FINALIZADO' THEN 1 ELSE 0 END) AS TOTAL_FINALIZADOS
    FROM DBACRESSEM.LEILAO
`;

const SQL_DASHBOARD_LANCES = `
    SELECT
        COUNT(*) AS TOTAL_LANCES,
        COUNT(DISTINCT NVL(DS_LOGIN, NM_USUARIO)) AS PARTICIPANTES_UNICOS,
        NVL(SUM(VL_LANCE), 0) AS VALOR_TOTAL_LANCES,
        NVL(MAX(VL_LANCE), 0) AS MAIOR_LANCE
    FROM DBACRESSEM.LEILAO_LANCE
`;

const SQL_DASHBOARD_VALOR_MOVIMENTADO = `
    SELECT
        NVL(SUM(VL_LANCE), 0) AS VALOR_MOVIMENTADO
    FROM (
        SELECT
            LL.VL_LANCE
        FROM DBACRESSEM.LEILAO L
        JOIN DBACRESSEM.LEILAO_LANCE LL
            ON LL.ID_LEILAO = L.ID_LEILAO
           AND LL.ID_LANCE = (
                SELECT ID_LANCE
                FROM DBACRESSEM.LEILAO_LANCE
                WHERE ID_LEILAO = L.ID_LEILAO
                ORDER BY VL_LANCE DESC, DT_LANCE ASC
                FETCH FIRST 1 ROWS ONLY
           )
        WHERE L.ST_STATUS = 'FINALIZADO'
    )
`;

const SQL_DASHBOARD_PRODUTO_MAIS_DISPUTADO = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        COUNT(LL.ID_LANCE) AS TOTAL_LANCES,
        NVL(MAX(LL.VL_LANCE), L.VL_INICIAL) AS MAIOR_LANCE
    FROM DBACRESSEM.LEILAO L
    LEFT JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
    GROUP BY
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.VL_INICIAL
    ORDER BY COUNT(LL.ID_LANCE) DESC, MAX(LL.VL_LANCE) DESC NULLS LAST
    FETCH FIRST 1 ROWS ONLY
`;

const SQL_DASHBOARD_ULTIMOS_FINALIZADOS = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        TO_CHAR(L.DT_FIM, 'DD/MM/YYYY HH24:MI:SS') AS DT_FIM,
        LL.NM_USUARIO AS NM_USUARIO_VENCEDOR,
        LL.DS_EMAIL AS DS_EMAIL_VENCEDOR,
        LL.VL_LANCE AS VL_LANCE_VENCEDOR
    FROM DBACRESSEM.LEILAO L
    LEFT JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
       AND LL.ID_LANCE = (
            SELECT ID_LANCE
            FROM DBACRESSEM.LEILAO_LANCE
            WHERE ID_LEILAO = L.ID_LEILAO
            ORDER BY VL_LANCE DESC, DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
       )
    WHERE L.ST_STATUS = 'FINALIZADO'
    ORDER BY L.DT_ATUALIZACAO DESC NULLS LAST, L.DT_FIM DESC
    FETCH FIRST 5 ROWS ONLY
`;

const SQL_DASHBOARD_LANCES_POR_DIA = `
    SELECT
        TO_CHAR(TRUNC(DT_LANCE), 'DD/MM') AS DIA,
        COUNT(*) AS TOTAL_LANCES
    FROM DBACRESSEM.LEILAO_LANCE
    WHERE DT_LANCE >= TRUNC(SYSDATE) - 30
    GROUP BY TRUNC(DT_LANCE)
    ORDER BY TRUNC(DT_LANCE)
`;

const SQL_DASHBOARD_TOP_PRODUTOS = `
    SELECT
        L.ID_LEILAO,
        L.NM_PRODUTO,
        COUNT(LL.ID_LANCE) AS TOTAL_LANCES,
        NVL(MAX(LL.VL_LANCE), L.VL_INICIAL) AS MAIOR_LANCE
    FROM DBACRESSEM.LEILAO L
    LEFT JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
    GROUP BY
        L.ID_LEILAO,
        L.NM_PRODUTO,
        L.VL_INICIAL
    ORDER BY COUNT(LL.ID_LANCE) DESC, NVL(MAX(LL.VL_LANCE), L.VL_INICIAL) DESC
    FETCH FIRST 10 ROWS ONLY
`;

const SQL_DASHBOARD_VALOR_POR_MES = `
    SELECT
        TO_CHAR(TRUNC(L.DT_FIM, 'MM'), 'MM/YYYY') AS MES,
        NVL(SUM(LL.VL_LANCE), 0) AS VALOR_MOVIMENTADO
    FROM DBACRESSEM.LEILAO L
    JOIN DBACRESSEM.LEILAO_LANCE LL
        ON LL.ID_LEILAO = L.ID_LEILAO
       AND LL.ID_LANCE = (
            SELECT ID_LANCE
            FROM DBACRESSEM.LEILAO_LANCE
            WHERE ID_LEILAO = L.ID_LEILAO
            ORDER BY VL_LANCE DESC, DT_LANCE ASC
            FETCH FIRST 1 ROWS ONLY
       )
    WHERE L.ST_STATUS = 'FINALIZADO'
    GROUP BY TRUNC(L.DT_FIM, 'MM')
    ORDER BY TRUNC(L.DT_FIM, 'MM')
`;

function normalizarPayload(data: LeilaoInput) {
    return {
        nm_produto: normalizarTexto(data.NM_PRODUTO).toUpperCase(),
        ds_produto: normalizarTexto(data.DS_PRODUTO) || null,
        vl_inicial: toNumber(data.VL_INICIAL),
        vl_incremento_minimo: toNumber(data.VL_INCREMENTO_MINIMO || 1),
        dt_inicio: normalizarTexto(data.DT_INICIO),
        dt_fim: normalizarTexto(data.DT_FIM),
        st_status: normalizarStatus(data.ST_STATUS),
        ds_regras: normalizarTexto(data.DS_REGRAS) || null,
        nm_usuario_criacao: normalizarTexto(data.NM_USUARIO_CRIACAO) || null,
    };
}

function validarPayload(data: ReturnType<typeof normalizarPayload>) {
    if (!data.nm_produto) throw new Error("Nome do produto é obrigatório.");
    if (data.vl_inicial <= 0) throw new Error("Valor inicial deve ser maior que zero.");
    if (data.vl_incremento_minimo <= 0) throw new Error("Incremento mínimo deve ser maior que zero.");
    if (!data.dt_inicio) throw new Error("Data de início é obrigatória.");
    if (!data.dt_fim) throw new Error("Data de fim é obrigatória.");
}

async function salvarImagens(idLeilao: number, imagens: string[]) {
    await oracleExecuteCommit(SQL_EXCLUIR_IMAGENS, { id: idLeilao });

    for (let i = 0; i < imagens.length; i++) {
        await oracleExecuteCommit(SQL_INSERIR_IMAGEM, {
            id_leilao: idLeilao,
            imagem_base64: imagens[i],
            ordem: i + 1,
        });
    }
}

function formatCurrencyBR(value: any) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function emailsIguais(a: any, b: any) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function montarHtmlPerdeuLideranca(params: {
    nomeUsuario: string;
    nomeProduto: string;
    lanceAnterior: number;
    novoLance: number;
}) {
    return `
        <div style="background:#f3f4f6;padding:32px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
            <table width="100%" cellpadding="0" cellspacing="0"
                style="max-width:700px;margin:auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 24px rgba(15,23,42,.08);">
                
                <tr>
                    <td style="background:linear-gradient(135deg,#f97316,#ef4444);padding:28px;color:white;text-align:center;">
                        <div style="font-size:42px;margin-bottom:8px;">⚠️</div>
                        <h1 style="margin:0;font-size:26px;">Seu lance foi ultrapassado</h1>
                        <p style="margin:8px 0 0;font-size:14px;opacity:.95;">
                            Outro participante assumiu a liderança do leilão.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:30px;">
                        <p style="font-size:16px;margin-top:0;">
                            Olá, <strong>${params.nomeUsuario || "participante"}</strong>.
                        </p>

                        <p style="font-size:15px;line-height:1.6;">
                            Você não está mais liderando o leilão abaixo.
                        </p>

                        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:20px;margin:22px 0;">
                            <p style="margin:0 0 10px;">
                                <strong>Produto:</strong> ${params.nomeProduto}
                            </p>

                            <p style="margin:0 0 10px;">
                                <strong>Seu lance anterior:</strong> ${formatCurrencyBR(params.lanceAnterior)}
                            </p>

                            <p style="margin:0;color:#b91c1c;font-size:22px;font-weight:800;">
                                Novo lance: ${formatCurrencyBR(params.novoLance)}
                            </p>
                        </div>

                        <div style="background:#ecfdf5;border-left:5px solid #00AE9D;padding:16px;border-radius:10px;">
                            Acesse a Intranet para acompanhar o leilão e enviar uma nova oferta.
                        </div>

                        <p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;">
                            Este e-mail foi enviado automaticamente pela Intranet Sicoob Cressem.
                        </p>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

async function enviarEmailPerdeuLideranca(params: {
    liderAnterior: any;
    leilao: any;
    novoLance: number;
    novoEmail?: string | null;
}) {
    const emailAnterior = normalizarTexto(params.liderAnterior?.DS_EMAIL);
    const emailNovo = normalizarTexto(params.novoEmail);

    console.log("[LEILÃO EMAIL] Lider anterior:", params.liderAnterior);
    console.log("[LEILÃO EMAIL] Email anterior:", emailAnterior);
    console.log("[LEILÃO EMAIL] Email novo:", emailNovo);

    if (!emailAnterior) {
        console.log("[LEILÃO EMAIL] Não enviou: líder anterior sem e-mail.");
        return;
    }

    if (emailsIguais(emailAnterior, emailNovo)) {
        console.log("[LEILÃO EMAIL] Não enviou: mesmo usuário/e-mail.");
        return;
    }

    const subject = `⚠️ Seu lance foi ultrapassado: ${params.leilao.NM_PRODUTO}`;

    const html = montarHtmlPerdeuLideranca({
        nomeUsuario: params.liderAnterior?.NM_USUARIO,
        nomeProduto: params.leilao.NM_PRODUTO,
        lanceAnterior: Number(params.liderAnterior?.VL_LANCE || 0),
        novoLance: params.novoLance,
    });

    try {
        await sendEmail([emailAnterior], subject, html);

        console.log(
            `[LEILÃO] Email de perda de liderança enviado para ${emailAnterior}.`
        );
    } catch (error) {
        console.error("[LEILÃO] Erro ao enviar email de perda de liderança:", error);
    }
}

export const leiloesService = {
    async listar(params: ListarLeiloesParams = {}) {
        const busca = normalizarBusca(params.busca);
        const status = normalizarBusca(params.status);

        const page = Math.max(Number(params.page || 1), 1);
        const limitRaw = Number(params.limit || 20);
        const limit = Math.min(Math.max(limitRaw, 5), 100);
        const offset = (page - 1) * limit;

        const [dataResult, totalResult, resumoResult] = await Promise.all([
            oracleExecute(SQL_LISTAR, { busca, status, offset, limit }),
            oracleExecute(SQL_TOTAL, { busca, status }),
            oracleExecute(SQL_RESUMO, {}),
        ]);

        const total = Number(firstRow(totalResult)?.TOTAL || 0);
        const resumo = firstRow(resumoResult) || {};

        return {
            data: dataResult.rows || [],
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            resumo: {
                totalLeiloes: Number(resumo.TOTAL_LEILOES || 0),
                totalEmAndamento: Number(resumo.TOTAL_EM_ANDAMENTO || 0),
                totalAgendados: Number(resumo.TOTAL_AGENDADOS || 0),
                totalFinalizados: Number(resumo.TOTAL_FINALIZADOS || 0),
            },
        };
    },

    async buscarPorId(id: number) {
        const result = await oracleExecute(SQL_BUSCAR_POR_ID, { id });
        const leilao = firstRow(result);

        if (!leilao) return null;

        const imagensResult = await oracleExecute(SQL_LISTAR_IMAGENS_CHUNKS, { id });
        const imagens = montarImagensPorChunks(imagensResult.rows || []);

        return {
            ...leilao,
            IMAGEM_BASE64: JSON.stringify(imagens),
        };
    },

    async criar(data: LeilaoInput) {
        const payload = normalizarPayload(data);
        validarPayload(payload);

        const imagens = extrairImagens(data.IMAGEM_BASE64);

        const result = await oracleExecuteCommit(SQL_INSERIR, {
            ...payload,
            id_leilao: {
                dir: oracledb.BIND_OUT,
                type: oracledb.NUMBER,
            },
        });

        const idLeilao = Number((result as any)?.outBinds?.id_leilao?.[0]);

        if (idLeilao && imagens.length) {
            await salvarImagens(idLeilao, imagens);
        }

        return {
            success: true,
            id: idLeilao,
            message: "Leilão cadastrado com sucesso.",
        };
    },

    async atualizar(id: number, data: LeilaoInput) {
        if (!id) throw new Error("ID do leilão não informado.");

        const payload = normalizarPayload(data);
        validarPayload(payload);

        await oracleExecuteCommit(SQL_ATUALIZAR, {
            ...payload,
            id,
        });

        const imagens = extrairImagens(data.IMAGEM_BASE64);

        if (imagens.length > 0) {
            await salvarImagens(id, imagens);
        }

        return {
            success: true,
            message: "Leilão atualizado com sucesso.",
        };
    },

    async excluir(id: number) {
        if (!id) throw new Error("ID do leilão não informado.");

        await oracleExecuteCommit(SQL_EXCLUIR_IMAGENS, { id });
        await oracleExecuteCommit(SQL_EXCLUIR_LANCES, { id });
        await oracleExecuteCommit(SQL_EXCLUIR, { id });

        return {
            success: true,
            message: "Leilão excluído com sucesso.",
        };
    },

    async listarLances(id: number) {
        if (!id) throw new Error("ID do leilão não informado.");

        const result = await oracleExecute(SQL_LISTAR_LANCES, { id });

        return result.rows || [];
    },

    async dashboard() {
        const [
            resumoResult,
            lancesResult,
            valorMovimentadoResult,
            produtoMaisDisputadoResult,
            ultimosFinalizadosResult,
            lancesPorDiaResult,
            topProdutosResult,
            valorPorMesResult,
        ] = await Promise.all([
            oracleExecute(SQL_DASHBOARD_RESUMO, {}),
            oracleExecute(SQL_DASHBOARD_LANCES, {}),
            oracleExecute(SQL_DASHBOARD_VALOR_MOVIMENTADO, {}),
            oracleExecute(SQL_DASHBOARD_PRODUTO_MAIS_DISPUTADO, {}),
            oracleExecute(SQL_DASHBOARD_ULTIMOS_FINALIZADOS, {}),
            oracleExecute(SQL_DASHBOARD_LANCES_POR_DIA, {}),
            oracleExecute(SQL_DASHBOARD_TOP_PRODUTOS, {}),
            oracleExecute(SQL_DASHBOARD_VALOR_POR_MES, {}),
        ]);

        const resumo = firstRow(resumoResult) || {};
        const lances = firstRow(lancesResult) || {};
        const valorMovimentado = firstRow(valorMovimentadoResult) || {};
        const produtoMaisDisputado = firstRow(produtoMaisDisputadoResult) || null;

        const totalLeiloes = Number(resumo.TOTAL_LEILOES || 0);
        const totalEmAndamento = Number(resumo.TOTAL_EM_ANDAMENTO || 0);
        const totalAgendados = Number(resumo.TOTAL_AGENDADOS || 0);
        const totalFinalizados = Number(resumo.TOTAL_FINALIZADOS || 0);

        return {
            resumo: {
                totalLeiloes,
                totalEmAndamento,
                totalAgendados,
                totalFinalizados,
            },
            indicadores: {
                totalLances: Number(lances.TOTAL_LANCES || 0),
                participantesUnicos: Number(lances.PARTICIPANTES_UNICOS || 0),
                valorTotalLances: Number(lances.VALOR_TOTAL_LANCES || 0),
                maiorLance: Number(lances.MAIOR_LANCE || 0),
                valorMovimentado: Number(valorMovimentado.VALOR_MOVIMENTADO || 0),
            },
            graficos: {
                status: [
                    {
                        name: "Em andamento",
                        value: totalEmAndamento,
                    },
                    {
                        name: "Agendados",
                        value: totalAgendados,
                    },
                    {
                        name: "Finalizados",
                        value: totalFinalizados,
                    },
                ],
                lancesPorDia: lancesPorDiaResult.rows || [],
                topProdutos: topProdutosResult.rows || [],
                valorPorMes: valorPorMesResult.rows || [],
            },
            produtoMaisDisputado,
            ultimosFinalizados: ultimosFinalizadosResult.rows || [],
        };
    },

    async listarFinalizados(params: ListarLeiloesParams = {}) {
        const busca = normalizarBusca(params.busca);

        const page = Math.max(Number(params.page || 1), 1);
        const limitRaw = Number(params.limit || 20);
        const limit = Math.min(Math.max(limitRaw, 5), 100);
        const offset = (page - 1) * limit;

        const [dataResult, totalResult] = await Promise.all([
            oracleExecute(SQL_LISTAR_FINALIZADOS, { busca, offset, limit }),
            oracleExecute(SQL_TOTAL_FINALIZADOS, { busca }),
        ]);

        const total = Number(firstRow(totalResult)?.TOTAL || 0);

        return {
            data: dataResult.rows || [],
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1),
        };
    },

    async buscarVencedor(id: number) {
        if (!id) throw new Error("ID do leilão não informado.");

        const result = await oracleExecute(SQL_BUSCAR_VENCEDOR, { id });
        const row = firstRow(result);

        if (!row) {
            throw new Error("Leilão não encontrado.");
        }

        if (!row.ID_LANCE) {
            return {
                ID_LEILAO: row.ID_LEILAO,
                NM_PRODUTO: row.NM_PRODUTO,
                ST_STATUS: row.ST_STATUS,
                DT_FIM: row.DT_FIM,
                possuiVencedor: false,
                vencedor: null,
                message: "Leilão encerrado sem lances.",
            };
        }

        return {
            ID_LEILAO: row.ID_LEILAO,
            NM_PRODUTO: row.NM_PRODUTO,
            ST_STATUS: row.ST_STATUS,
            DT_FIM: row.DT_FIM,
            possuiVencedor: true,
            vencedor: {
                ID_LANCE: row.ID_LANCE,
                NM_USUARIO: row.NM_USUARIO,
                DS_LOGIN: row.DS_LOGIN,
                DS_EMAIL: row.DS_EMAIL,
                VL_LANCE: row.VL_LANCE,
                DT_LANCE: row.DT_LANCE,
            },
            message: "Vencedor encontrado com sucesso.",
        };
    },

    async darLance(data: LanceInput) {
        const id = Number(data.ID_LEILAO);
        const valorLance = toNumber(data.VL_LANCE);

        if (!id) throw new Error("ID do leilão não informado.");
        if (valorLance <= 0) throw new Error("Valor do lance inválido.");

        const leilaoResult = await oracleExecute(SQL_LANCE_ATUAL, { id });
        const leilao = firstRow(leilaoResult);

        if (!leilao) throw new Error("Leilão não encontrado.");

        const liderAnteriorResult = await oracleExecute(SQL_LIDER_ATUAL, { id });
        const liderAnterior = firstRow(liderAnteriorResult);

        if (leilao.SN_NAO_INICIOU === "S") {
            throw new Error("Este leilão ainda não iniciou.");
        }

        if (leilao.SN_ENCERRADO === "S") {
            await oracleExecuteCommit(SQL_FINALIZAR_LEILAO, { id });
            throw new Error("Este leilão já foi encerrado.");
        }

        if (leilao.ST_STATUS !== "EM_ANDAMENTO") {
            throw new Error("Este leilão não está em andamento.");
        }

        const lanceAtual = Number(leilao.VL_LANCE_ATUAL || leilao.VL_INICIAL || 0);
        const incrementoMinimo = Number(leilao.VL_INCREMENTO_MINIMO || 1);
        const valorMinimo = lanceAtual + incrementoMinimo;

        if (valorLance < valorMinimo) {
            throw new Error(
                `O lance mínimo permitido é R$ ${valorMinimo.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}.`
            );
        }

        const payload = {
            id_leilao: id,
            vl_lance: valorLance,
            nm_usuario: normalizarTexto(data.NM_USUARIO).toUpperCase(),
            ds_login: normalizarTexto(data.DS_LOGIN) || null,
            ds_email: normalizarTexto(data.DS_EMAIL) || null,
            nr_ip: normalizarTexto(data.NR_IP) || null,
        };

        if (!payload.nm_usuario) {
            throw new Error("Usuário do lance não informado.");
        }

        await oracleExecuteCommit(SQL_INSERIR_LANCE, payload);

        if (
            liderAnterior &&
            Number(liderAnterior.VL_LANCE || 0) < valorLance
        ) {
            await enviarEmailPerdeuLideranca({
                liderAnterior,
                leilao,
                novoLance: valorLance,
                novoEmail: payload.ds_email,
            });
        }

        return {
            success: true,
            message: "Lance registrado com sucesso.",
            lance: {
                ID_LEILAO: id,
                VL_LANCE: valorLance,
                NM_USUARIO: payload.nm_usuario,
                DS_LOGIN: payload.ds_login,
                DS_EMAIL: payload.ds_email,
                NR_IP: payload.nr_ip,
            },
        };
    },
};