import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";
import { GlpiService } from "./glpi.service";
import * as XLSX from "xlsx";
import { whatsappService } from "./whatsapp.service";
import { sendEmail } from "./email.service";

type SolicitacaoGlpiItemInput = {
    nomeItemSolicitado: string;
    quantidadeSolicitada: number;
    idItem?: number | null;
};

type SincronizarSolicitacaoInput = {
    idChamadoGlpi: number;
    nomeItemSolicitado: string;
    quantidadeSolicitada: number;
    nomeSolicitante?: string | null;
    nomeSetor?: string | null;
    descricaoGlpi?: string | null;
    dataSolicitacao?: string | Date | null;
    idItem?: number | null;
    status?: string;
    itens?: SolicitacaoGlpiItemInput[];
};

type DarBaixaInput = {
    idSolicitacao: number;
    idItem: number;
    quantidadeAtendida: number;
    observacao?: string;
    usuarioAtendimento: string;
};

type SaidaManualComGlpiInput = {
    idItem: number;
    quantidade: number;
    nomeSolicitante: string;
    nomeSetor?: string | null;
    observacao?: string | null;
    usuarioAtendimento: string;
};

type RespostaManualInput = {
    idSolicitacao: number;
    idItem?: number | null;
    quantidadeAtendida?: number;
    resposta: string;
    usuarioAtendimento: string;
    statusGlpi: number;
};

const glpiService = new GlpiService();

function normalizeNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function decodeHtmlEntities(value: string): string {
    return String(value || "")
        .replace(/&#60;/g, "<")
        .replace(/&#62;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#38;/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/&#160;/g, " ")
        .replace(/&nbsp;/g, " ");
}

function limparHtml(value: string): string {
    return decodeHtmlEntities(value)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/h1>/gi, "\n")
        .replace(/<\/h2>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, "\n")
        .trim();
}

function extrairCampo(texto: string, campo: string): string {
    const clean = limparHtml(texto);
    const regex = new RegExp(`${campo}\\s*:\\s*([^\\n]+)`, "i");
    const match = clean.match(regex);
    return match?.[1]?.trim() || "";
}

function parseQuantidade(value: string): number {
    const quantidade = Number(
        String(value || "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "")
    );

    return Number.isFinite(quantidade) ? quantidade : 0;
}

function parseDescricaoEstoqueGlpi(descricao: string) {
    const textoLimpo = limparHtml(descricao);

    const setor = extrairCampo(textoLimpo, "Setor");
    const observacao = extrairCampo(textoLimpo, "Observação");

    const itens: Array<{
        item: string;
        quantidade: number;
        indice: number;
    }> = [];

    for (let i = 1; i <= 10; i++) {
        const blocoRegex = new RegExp(
            `Solicitação de Insumos\\s*-\\s*Item\\s*${i}([\\s\\S]*?)(?=Solicitação de Insumos\\s*-\\s*Item\\s*${i + 1}|$)`,
            "i"
        );

        const blocoMatch = textoLimpo.match(blocoRegex);
        const bloco = blocoMatch?.[1] || "";

        if (!bloco.trim()) continue;

        const item =
            extrairCampo(bloco, "Selecione o Insumo") ||
            extrairCampo(bloco, "Insumo") ||
            extrairCampo(bloco, "Item");

        const quantidade = parseQuantidade(extrairCampo(bloco, "Quantidade"));

        if (item && quantidade > 0) {
            itens.push({
                item,
                quantidade,
                indice: i,
            });
        }
    }

    if (!itens.length) {
        const item =
            extrairCampo(textoLimpo, "Selecione o Insumo") ||
            extrairCampo(textoLimpo, "Insumo") ||
            extrairCampo(textoLimpo, "Item");

        const quantidade = parseQuantidade(extrairCampo(textoLimpo, "Quantidade"));

        if (item && quantidade > 0) {
            itens.push({
                item,
                quantidade,
                indice: 1,
            });
        }
    }

    return {
        item: itens[0]?.item || "",
        quantidade: itens[0]?.quantidade || 0,
        itens,
        setor,
        observacao,
    };
}

export const estoqueConsumiveisService = {
    async listarItens() {
        const sql = `
      SELECT
        ID_ITEM,
        NM_ITEM,
        DS_ITEM,
        DS_UNIDADE,
        QT_SALDO_ATUAL,
        QT_SALDO_MINIMO,
        ST_ATIVO,
        DT_CADASTRO,
        DT_ATUALIZACAO
      FROM DBACRESSEM.ESTOQUE_ITENS
      WHERE ST_ATIVO = 'S'
      ORDER BY NM_ITEM
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
    },

    async criarItem(data: {
        nome: string;
        descricao?: string;
        unidade: string;
        saldoAtual?: number;
        saldoMinimo?: number;
    }) {
        const existe = await oracleExecute(
            `
  SELECT ID_ITEM
  FROM DBACRESSEM.ESTOQUE_ITENS
  WHERE ST_ATIVO = 'S'
    AND UPPER(TRIM(NM_ITEM)) = UPPER(TRIM(:nome))
  FETCH FIRST 1 ROWS ONLY
`,
            { nome: data.nome },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if ((existe.rows || []).length > 0) {
            throw new Error("Produto já cadastrado no estoque. Use a entrada para somar quantidade ao item existente.");
        }

        const sql = `
  INSERT INTO DBACRESSEM.ESTOQUE_ITENS (
    NM_ITEM,
    DS_ITEM,
    DS_UNIDADE,
    QT_SALDO_ATUAL,
    QT_SALDO_MINIMO,
    DT_ATUALIZACAO
  ) VALUES (
    :nome,
    :descricao,
    :unidade,
    :saldoAtual,
    :saldoMinimo,
    SYSDATE
  )
`;

        await oracleExecute(
            sql,
            {
                nome: data.nome,
                descricao: data.descricao || null,
                unidade: data.unidade,
                saldoAtual: normalizeNumber(data.saldoAtual),
                saldoMinimo: normalizeNumber(data.saldoMinimo),
            },
            { autoCommit: true }
        );

        const saldoInicial = normalizeNumber(data.saldoAtual);

        if (saldoInicial > 0) {
            const itemCriado = await this.buscarItemPorNomeAproximado(data.nome);

            if (itemCriado?.ID_ITEM) {
                await oracleExecute(
                    `
            INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
                ID_ITEM,
                TP_MOVIMENTACAO,
                QT_MOVIMENTACAO,
                QT_SALDO_ANTES,
                QT_SALDO_DEPOIS,
                DS_OBSERVACAO,
                NM_USUARIO_BAIXA
            ) VALUES (
                :idItem,
                'ENTRADA',
                :quantidade,
                0,
                :saldoDepois,
                :observacao,
                :usuario
            )
            `,
                    {
                        idItem: itemCriado.ID_ITEM,
                        quantidade: saldoInicial,
                        saldoDepois: saldoInicial,
                        observacao: "Entrada inicial no cadastro do produto",
                        usuario: "cadastro_produto",
                    },
                    { autoCommit: true }
                );
            }
        }

        let idItemGlpi: number | null = null;

        try {
            const glpiItem = await glpiService.createConsumableItemEstoque({
                nome: data.nome,
                descricao: data.descricao || "",
            });

            idItemGlpi = Number(
                glpiItem?.id ||
                glpiItem?.ID ||
                glpiItem?.data?.id ||
                glpiItem?.data?.ID
            );

            if (idItemGlpi) {
                await oracleExecute(
                    `
      UPDATE DBACRESSEM.ESTOQUE_ITENS
      SET ID_ITEM_GLPI = :idItemGlpi,
          DT_ULTIMA_SINCRONIZACAO_GLPI = SYSDATE
      WHERE UPPER(TRIM(NM_ITEM)) = UPPER(TRIM(:nome))
        AND ST_ATIVO = 'S'
      `,
                    {
                        idItemGlpi,
                        nome: data.nome,
                    },
                    { autoCommit: true }
                );

                const saldoAtual = normalizeNumber(data.saldoAtual);

                if (saldoAtual > 0) {
                    for (let i = 0; i < saldoAtual; i++) {
                        await glpiService.createConsumableEstoque({
                            idItem: idItemGlpi,
                            quantidade: 1,
                        });
                    }
                }
            }
        } catch (error: any) {
            console.error(
                "Produto cadastrado no Oracle, mas falhou ao cadastrar no GLPI:",
                error?.response?.data || error?.message || error
            );
        }

        return { success: true };
    },

    async listarSolicitacoesGlpi() {
        const sqlSolicitacoes = `
      SELECT
        ID_SOLICITACAO,
        ID_CHAMADO_GLPI,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        NM_SOLICITANTE,
        NM_SETOR,
        DS_DESCRICAO_GLPI,
        ST_SOLICITACAO,
        DT_SOLICITACAO,
        DT_ATENDIMENTO,
        DT_RETORNO_NEGATIVO,
        ST_NOTIFICADO_RETORNO,
        NM_USUARIO_ATENDIMENTO,
        DBMS_LOB.SUBSTR(DS_ULTIMA_RESPOSTA_MANUAL, 4000, 1) AS DS_ULTIMA_RESPOSTA_MANUAL,
        DBMS_LOB.SUBSTR(DS_ULTIMO_RETORNO_GLPI, 4000, 1) AS DS_ULTIMO_RETORNO_GLPI,
        NR_ULTIMO_STATUS_GLPI,
        NR_STATUS_ATUAL_GLPI
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
      ORDER BY 
        CASE 
          WHEN ST_SOLICITACAO = 'RETORNO_NEGATIVO' THEN 0
          WHEN ST_SOLICITACAO IN ('ABERTA', 'EM_ANALISE') THEN 1
          ELSE 2
        END,
        NVL(DT_RETORNO_NEGATIVO, NVL(DT_SOLICITACAO, SYSDATE)) DESC,
        ID_SOLICITACAO DESC
    `;

        const solicitacoesResult = await oracleExecute(
            sqlSolicitacoes,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const solicitacoes = solicitacoesResult.rows || [];

        if (!solicitacoes.length) {
            return [];
        }

        const ids = solicitacoes
            .map((item: any) => Number(item.ID_SOLICITACAO))
            .filter((id: number) => Number.isFinite(id) && id > 0);

        const bindIds: any = {};
        const placeholders = ids.map((id: number, index: number) => {
            const key = `id${index}`;
            bindIds[key] = id;
            return `:${key}`;
        });

        const itensResult = await oracleExecute(
            `
      SELECT
        ID_SOLICITACAO_ITEM,
        ID_SOLICITACAO,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        ST_ITEM,
        DS_OBSERVACAO,
        DT_CADASTRO,
        DT_ATENDIMENTO,
        NM_USUARIO_ATENDIMENTO
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
      WHERE ID_SOLICITACAO IN (${placeholders.join(",")})
      ORDER BY ID_SOLICITACAO, ID_SOLICITACAO_ITEM
      `,
            bindIds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const itensPorSolicitacao = new Map<number, any[]>();

        for (const item of itensResult.rows || []) {
            const idSolicitacao = Number((item as any).ID_SOLICITACAO);

            if (!itensPorSolicitacao.has(idSolicitacao)) {
                itensPorSolicitacao.set(idSolicitacao, []);
            }

            itensPorSolicitacao.get(idSolicitacao)?.push(item);
        }

        return solicitacoes.map((solicitacao: any) => {
            const itens = itensPorSolicitacao.get(Number(solicitacao.ID_SOLICITACAO)) || [];

            return {
                ...solicitacao,
                ITENS: itens,
                QTD_ITENS: itens.length || 1,
            };
        });
    },


    async sincronizarChamadosReaisGlpi() {
        const tickets = await glpiService.listTicketsEstoque();

        console.log("Tickets estoque encontrados:", tickets.length);
        console.log(JSON.stringify(tickets.slice(0, 3), null, 2));

        let inseridos = 0;
        let ignorados = 0;
        let semPadrao = 0;
        let retornosNegativos = 0;
        let atualizados = 0;

        for (const ticket of tickets) {
            const idChamadoGlpi = Number(ticket?.id);
            const descricao = String(ticket?.content || ticket?.description || "");
            const parsed = parseDescricaoEstoqueGlpi(descricao);

            console.log("Ticket parseado:", {
                idChamadoGlpi,
                totalItens: parsed.itens.length,
                itens: parsed.itens,
                descricao,
            });

            const atualizacaoExistente = await this.atualizarStatusChamadoExistenteGlpi(ticket);

            if (atualizacaoExistente.updated) {
                atualizados++;

                if (atualizacaoExistente.retornoNegativo) {
                    retornosNegativos++;
                }

                ignorados++;
                continue;
            }

            const nomeSolicitante = String(
                ticket?.users_id_recipient ||
                ticket?.users_id_requester ||
                ticket?.requester ||
                ticket?.name ||
                ""
            );

            if (!idChamadoGlpi || !parsed.itens.length) {
                ignorados++;
                semPadrao++;
                continue;
            }

            const itensComEstoque: SolicitacaoGlpiItemInput[] = [];

            for (const itemSolicitado of parsed.itens) {
                const itemEncontrado = await this.buscarItemPorNomeAproximado(itemSolicitado.item);

                itensComEstoque.push({
                    idItem: itemEncontrado?.ID_ITEM || null,
                    nomeItemSolicitado: itemSolicitado.item,
                    quantidadeSolicitada: itemSolicitado.quantidade,
                });
            }

            const possuiItemNaoCadastrado = itensComEstoque.some((item) => !item.idItem);

            const primeiroItem = itensComEstoque[0];

            const resultado = await this.sincronizarSolicitacaoGlpi({
                idChamadoGlpi,
                idItem: primeiroItem?.idItem || null,
                nomeItemSolicitado: primeiroItem?.nomeItemSolicitado || parsed.item,
                quantidadeSolicitada: primeiroItem?.quantidadeSolicitada || parsed.quantidade,
                nomeSolicitante: nomeSolicitante || null,
                nomeSetor: parsed.setor || null,
                descricaoGlpi: descricao,
                dataSolicitacao: ticket?.date_creation || ticket?.date || null,
                status: possuiItemNaoCadastrado ? "ITEM_NAO_CADASTRADO" : "ABERTA",
                itens: itensComEstoque,
            });

            if (resultado?.duplicated) {
                ignorados++;
            } else {
                inseridos++;
            }
        }

        return {
            success: true,
            totalChamados: tickets.length,
            inseridos,
            ignorados,
            atualizados,
            retornosNegativos,
            semPadrao,
        };
    },


    async sincronizarSolicitacaoGlpi(input: SincronizarSolicitacaoInput) {
        const sqlCheck = `
      SELECT ID_SOLICITACAO
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
      WHERE ID_CHAMADO_GLPI = :idChamadoGlpi
    `;

        const existing = await oracleExecute(
            sqlCheck,
            { idChamadoGlpi: input.idChamadoGlpi },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if ((existing.rows || []).length > 0) {
            return { success: true, duplicated: true };
        }

        const itens = Array.isArray(input.itens) && input.itens.length
            ? input.itens
            : [
                {
                    idItem: input.idItem || null,
                    nomeItemSolicitado: input.nomeItemSolicitado,
                    quantidadeSolicitada: normalizeNumber(input.quantidadeSolicitada),
                },
            ];

        const primeiroItem = itens[0];

        const sqlInsert = `
      INSERT INTO DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI (
        ID_CHAMADO_GLPI,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        NM_SOLICITANTE,
        NM_SETOR,
        DS_DESCRICAO_GLPI,
        DT_SOLICITACAO,
        ST_SOLICITACAO
      ) VALUES (
        :idChamadoGlpi,
        :idItem,
        :nomeItemSolicitado,
        :quantidadeSolicitada,
        0,
        :nomeSolicitante,
        :nomeSetor,
        :descricaoGlpi,
        CASE
          WHEN :dataSolicitacao IS NOT NULL
          THEN TO_DATE(:dataSolicitacao, 'YYYY-MM-DD HH24:MI:SS')
          ELSE SYSDATE
        END,
        :status
      )
      RETURNING ID_SOLICITACAO INTO :idSolicitacao
    `;

        const insertResult = await oracleExecute(
            sqlInsert,
            {
                idChamadoGlpi: input.idChamadoGlpi,
                idItem: primeiroItem?.idItem || null,
                nomeItemSolicitado: primeiroItem?.nomeItemSolicitado || input.nomeItemSolicitado,
                quantidadeSolicitada: normalizeNumber(primeiroItem?.quantidadeSolicitada || input.quantidadeSolicitada),
                nomeSolicitante: input.nomeSolicitante || null,
                nomeSetor: input.nomeSetor || null,
                descricaoGlpi: input.descricaoGlpi || null,
                dataSolicitacao: input.dataSolicitacao || null,
                status: input.status || "ABERTA",
                idSolicitacao: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            },
            { autoCommit: true }
        );

        const idSolicitacao = Number(insertResult.outBinds?.idSolicitacao?.[0]);

        if (!idSolicitacao) {
            throw new Error("Solicitação criada, mas não foi possível recuperar o ID_SOLICITACAO.");
        }

        for (const item of itens.slice(0, 10)) {
            const statusItem = item.idItem ? "ABERTO" : "SEM_SALDO";

            await oracleExecute(
                `
      INSERT INTO DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS (
        ID_SOLICITACAO,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        ST_ITEM
      ) VALUES (
        :idSolicitacao,
        :idItem,
        :nomeItemSolicitado,
        :quantidadeSolicitada,
        0,
        :statusItem
      )
      `,
                {
                    idSolicitacao,
                    idItem: item.idItem || null,
                    nomeItemSolicitado: item.nomeItemSolicitado,
                    quantidadeSolicitada: normalizeNumber(item.quantidadeSolicitada),
                    statusItem,
                },
                { autoCommit: true }
            );
        }

        return {
            success: true,
            duplicated: false,
            idSolicitacao,
            totalItens: itens.length,
        };
    },


    async lancarEntrada(data: {
        idItem: number;
        quantidade: number;
        observacao?: string;
        usuario: string;
    }) {
        const item = await this.buscarItemPorId(data.idItem);
        if (!item) throw new Error("Item não encontrado.");

        const saldoAntes = normalizeNumber(item.QT_SALDO_ATUAL);
        const quantidade = normalizeNumber(data.quantidade);

        if (quantidade <= 0) throw new Error("Quantidade de entrada inválida.");

        const saldoDepois = saldoAntes + quantidade;

        await oracleExecute(
            `
      INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
        ID_ITEM,
        TP_MOVIMENTACAO,
        QT_MOVIMENTACAO,
        QT_SALDO_ANTES,
        QT_SALDO_DEPOIS,
        DS_OBSERVACAO,
        NM_USUARIO_BAIXA
      ) VALUES (
        :idItem,
        'ENTRADA',
        :quantidade,
        :saldoAntes,
        :saldoDepois,
        :observacao,
        :usuario
      )
      `,
            {
                idItem: data.idItem,
                quantidade,
                saldoAntes,
                saldoDepois,
                observacao: data.observacao || null,
                usuario: data.usuario,
            },
            { autoCommit: true }
        );

        await oracleExecute(
            `
      UPDATE DBACRESSEM.ESTOQUE_ITENS
      SET QT_SALDO_ATUAL = :saldoDepois,
          DT_ATUALIZACAO = SYSDATE
      WHERE ID_ITEM = :idItem
      `,
            {
                idItem: data.idItem,
                saldoDepois,
            },
            { autoCommit: true }
        );

        try {
            const idItemGlpi = Number(item.ID_ITEM_GLPI);

            if (idItemGlpi) {
                for (let i = 0; i < quantidade; i++) {
                    await glpiService.createConsumableEstoque({
                        idItem: idItemGlpi,
                        quantidade: 1,
                    });
                }

                await oracleExecute(
                    `
                UPDATE DBACRESSEM.ESTOQUE_ITENS
                SET DT_ULTIMA_SINCRONIZACAO_GLPI = SYSDATE
                WHERE ID_ITEM = :idItem
                `,
                    {
                        idItem: data.idItem,
                    },
                    { autoCommit: true }
                );
            }
        } catch (error: any) {
            console.error(
                "Entrada registrada no Oracle, mas falhou ao enviar para o GLPI:",
                error?.response?.data || error?.message || error
            );
        }

        await this.resolverAlertasNormalizados();

        return { success: true, saldoDepois };
    },

    async darBaixaSolicitacao(data: DarBaixaInput) {
        const solicitacao = await this.buscarSolicitacaoPorId(data.idSolicitacao);
        if (!solicitacao) throw new Error("Solicitação não encontrada.");

        const item = await this.buscarItemPorId(data.idItem);
        if (!item) throw new Error("Item não encontrado.");

        const saldoAntes = normalizeNumber(item.QT_SALDO_ATUAL);
        const quantidadeAtendida = normalizeNumber(data.quantidadeAtendida);

        if (quantidadeAtendida <= 0) throw new Error("Quantidade atendida inválida.");

        if (saldoAntes < quantidadeAtendida) {
            throw new Error("Saldo insuficiente para atender a solicitação.");
        }

        const itemSolicitacaoResult = await oracleExecute(
            `
      SELECT
        ID_SOLICITACAO_ITEM,
        QT_SOLICITADA,
        QT_ATENDIDA
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
      WHERE ID_SOLICITACAO = :idSolicitacao
        AND (
          ID_ITEM = :idItem
          OR (
            ID_ITEM IS NULL
            AND UPPER(TRIM(NM_ITEM_SOLICITADO)) = UPPER(TRIM(:nomeItem))
          )
        )
      ORDER BY ID_SOLICITACAO_ITEM
      FETCH FIRST 1 ROWS ONLY
      `,
            {
                idSolicitacao: data.idSolicitacao,
                idItem: data.idItem,
                nomeItem: item.NM_ITEM,
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const itemSolicitacao = (itemSolicitacaoResult.rows || [])[0] as any;

        const saldoDepois = saldoAntes - quantidadeAtendida;

        await oracleExecute(
            `
      INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
        ID_ITEM,
        TP_MOVIMENTACAO,
        QT_MOVIMENTACAO,
        QT_SALDO_ANTES,
        QT_SALDO_DEPOIS,
        DS_OBSERVACAO,
        NM_SOLICITANTE,
        NM_SETOR,
        ID_CHAMADO_GLPI,
        NM_USUARIO_BAIXA
      ) VALUES (
        :idItem,
        'SAIDA',
        :quantidade,
        :saldoAntes,
        :saldoDepois,
        :observacao,
        :nomeSolicitante,
        :nomeSetor,
        :idChamadoGlpi,
        :usuario
      )
      `,
            {
                idItem: data.idItem,
                quantidade: quantidadeAtendida,
                saldoAntes,
                saldoDepois,
                observacao: data.observacao || null,
                nomeSolicitante: solicitacao.NM_SOLICITANTE || null,
                nomeSetor: solicitacao.NM_SETOR || null,
                idChamadoGlpi: solicitacao.ID_CHAMADO_GLPI,
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: false }
        );

        await oracleExecute(
            `
      UPDATE DBACRESSEM.ESTOQUE_ITENS
      SET QT_SALDO_ATUAL = :saldoDepois,
          DT_ATUALIZACAO = SYSDATE
      WHERE ID_ITEM = :idItem
      `,
            {
                idItem: data.idItem,
                saldoDepois,
            },
            { autoCommit: false }
        );

        if (itemSolicitacao?.ID_SOLICITACAO_ITEM) {
            const qtSolicitadaItem = normalizeNumber(itemSolicitacao.QT_SOLICITADA);
            const qtAtendidaAnteriorItem = normalizeNumber(itemSolicitacao.QT_ATENDIDA);
            const qtAtendidaNovaItem = qtAtendidaAnteriorItem + quantidadeAtendida;

            let statusItem = "ATENDIDO";
            if (qtAtendidaNovaItem < qtSolicitadaItem) statusItem = "ATENDIDO_PARCIAL";

            await oracleExecute(
                `
      UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
      SET ID_ITEM = :idItem,
          QT_ATENDIDA = :qtAtendidaNova,
          ST_ITEM = :statusItem,
          DS_OBSERVACAO = :observacao,
          DT_ATENDIMENTO = SYSDATE,
          NM_USUARIO_ATENDIMENTO = :usuario
      WHERE ID_SOLICITACAO_ITEM = :idSolicitacaoItem
      `,
                {
                    idSolicitacaoItem: itemSolicitacao.ID_SOLICITACAO_ITEM,
                    idItem: data.idItem,
                    qtAtendidaNova: qtAtendidaNovaItem,
                    statusItem,
                    observacao: data.observacao || null,
                    usuario: data.usuarioAtendimento,
                },
                { autoCommit: false }
            );
        }

        const totaisResult = await oracleExecute(
            `
      SELECT
        COUNT(*) AS TOTAL_ITENS,
        SUM(CASE WHEN ST_ITEM = 'ATENDIDO' THEN 1 ELSE 0 END) AS TOTAL_ATENDIDOS,
        SUM(CASE WHEN ST_ITEM = 'ATENDIDO_PARCIAL' THEN 1 ELSE 0 END) AS TOTAL_PARCIAIS,
        SUM(QT_SOLICITADA) AS TOTAL_SOLICITADO,
        SUM(QT_ATENDIDA) AS TOTAL_ATENDIDO
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
      WHERE ID_SOLICITACAO = :idSolicitacao
      `,
            { idSolicitacao: data.idSolicitacao },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const totais = (totaisResult.rows || [])[0] as any;

        const totalItens = normalizeNumber(totais?.TOTAL_ITENS);
        const totalAtendidos = normalizeNumber(totais?.TOTAL_ATENDIDOS);
        const totalParciais = normalizeNumber(totais?.TOTAL_PARCIAIS);
        const totalSolicitado = normalizeNumber(totais?.TOTAL_SOLICITADO);
        const totalAtendido = normalizeNumber(totais?.TOTAL_ATENDIDO);

        let status = "ABERTA";

        if (totalItens > 0 && totalAtendidos === totalItens) {
            status = "ATENDIDA";
        } else if (totalAtendido > 0 || totalParciais > 0) {
            status = "ATENDIDA_PARCIAL";
        }

        await oracleExecute(
            `
      UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
      SET ID_ITEM = NVL(:idItem, ID_ITEM),
          QT_ATENDIDA = :totalAtendido,
          QT_SOLICITADA = CASE
            WHEN :totalSolicitado > 0 THEN :totalSolicitado
            ELSE QT_SOLICITADA
          END,
          ST_SOLICITACAO = :status,
          DT_ATENDIMENTO = CASE
            WHEN :status IN ('ATENDIDA', 'ATENDIDA_PARCIAL') THEN SYSDATE
            ELSE DT_ATENDIMENTO
          END,
          NM_USUARIO_ATENDIMENTO = :usuario,
          DS_ULTIMO_RETORNO_GLPI = NULL,
          DT_RETORNO_NEGATIVO = NULL,
          ST_NOTIFICADO_RETORNO = 'S',
          NR_STATUS_ATUAL_GLPI = 5
      WHERE ID_SOLICITACAO = :idSolicitacao
      `,
            {
                idSolicitacao: data.idSolicitacao,
                idItem: data.idItem,
                totalAtendido,
                totalSolicitado,
                status,
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: false }
        );

        await oracleExecute("COMMIT", {}, { autoCommit: true });

        try {
            const mensagemGlpi = `
Solicitação atendida via Intranet.

Item entregue: ${item.NM_ITEM}
Quantidade atendida: ${quantidadeAtendida}
Status da solicitação: ${status}
Responsável pela baixa: ${data.usuarioAtendimento}
Observação: ${data.observacao || "-"}
  `.trim();

            await glpiService.addTicketFollowup(solicitacao.ID_CHAMADO_GLPI, mensagemGlpi);

            if (status === "ATENDIDA") {
                await glpiService.solveTicket(solicitacao.ID_CHAMADO_GLPI, mensagemGlpi);
            }
        } catch (error) {
            console.error("Baixa registrada no Oracle, mas falhou ao atualizar GLPI:", error);
        }

        return {
            success: true,
            status,
            saldoDepois,
        };
    },


    async listarMovimentacoes() {
        const sql = `
      SELECT
        M.ID_MOVIMENTACAO,
        M.ID_ITEM,
        I.NM_ITEM,
        M.TP_MOVIMENTACAO,
        M.QT_MOVIMENTACAO,
        M.QT_SALDO_ANTES,
        M.QT_SALDO_DEPOIS,
        M.DS_OBSERVACAO,
        M.NM_SOLICITANTE,
        M.NM_SETOR,
        M.ID_CHAMADO_GLPI,
        M.NM_USUARIO_BAIXA,
        M.DT_MOVIMENTACAO
      FROM DBACRESSEM.ESTOQUE_MOVIMENTACOES M
      INNER JOIN DBACRESSEM.ESTOQUE_ITENS I
        ON I.ID_ITEM = M.ID_ITEM
      ORDER BY M.DT_MOVIMENTACAO DESC, M.ID_MOVIMENTACAO DESC
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
    },

    async listarMovimentacoesMensais(ano: number, mes: number) {
        const sql = `
      SELECT
        M.ID_MOVIMENTACAO,
        M.ID_ITEM,
        I.NM_ITEM,
        I.DS_UNIDADE,
        M.TP_MOVIMENTACAO,
        M.QT_MOVIMENTACAO,
        M.QT_SALDO_ANTES,
        M.QT_SALDO_DEPOIS,
        M.DS_OBSERVACAO,
        M.NM_SOLICITANTE,
        M.NM_SETOR,
        M.ID_CHAMADO_GLPI,
        M.NM_USUARIO_BAIXA,
        M.DT_MOVIMENTACAO
      FROM DBACRESSEM.ESTOQUE_MOVIMENTACOES M
      INNER JOIN DBACRESSEM.ESTOQUE_ITENS I
        ON I.ID_ITEM = M.ID_ITEM
      WHERE EXTRACT(YEAR FROM M.DT_MOVIMENTACAO) = :ano
        AND EXTRACT(MONTH FROM M.DT_MOVIMENTACAO) = :mes
      ORDER BY M.DT_MOVIMENTACAO DESC, M.ID_MOVIMENTACAO DESC
    `;

        const result = await oracleExecute(
            sql,
            { ano, mes },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return result.rows || [];
    },

    async buscarBalancoMensal(ano: number, mes: number) {
        const sql = `
      SELECT
        I.ID_ITEM,
        I.NM_ITEM,
        I.DS_UNIDADE,
        NVL(SUM(CASE WHEN M.TP_MOVIMENTACAO = 'ENTRADA' THEN M.QT_MOVIMENTACAO ELSE 0 END), 0) AS TOTAL_ENTRADAS,
        NVL(SUM(CASE WHEN M.TP_MOVIMENTACAO = 'SAIDA' THEN M.QT_MOVIMENTACAO ELSE 0 END), 0) AS TOTAL_SAIDAS,
        I.QT_SALDO_ATUAL
      FROM DBACRESSEM.ESTOQUE_ITENS I
      LEFT JOIN DBACRESSEM.ESTOQUE_MOVIMENTACOES M
        ON M.ID_ITEM = I.ID_ITEM
       AND EXTRACT(YEAR FROM M.DT_MOVIMENTACAO) = :ano
       AND EXTRACT(MONTH FROM M.DT_MOVIMENTACAO) = :mes
      WHERE I.ST_ATIVO = 'S'
      GROUP BY
        I.ID_ITEM,
        I.NM_ITEM,
        I.DS_UNIDADE,
        I.QT_SALDO_ATUAL
      ORDER BY I.NM_ITEM
    `;

        const result = await oracleExecute(
            sql,
            { ano, mes },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return result.rows || [];
    },

    async buscarItemPorId(idItem: number) {
        const sql = `
      SELECT *
      FROM DBACRESSEM.ESTOQUE_ITENS
      WHERE ID_ITEM = :idItem
    `;

        const result = await oracleExecute(
            sql,
            { idItem },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return (result.rows || [])[0] || null;
    },

    async buscarItemPorNomeAproximado(nomeItem: string) {
        const sql = `
      SELECT *
      FROM DBACRESSEM.ESTOQUE_ITENS
      WHERE ST_ATIVO = 'S'
        AND UPPER(NM_ITEM) LIKE UPPER(:nome)
      FETCH FIRST 1 ROWS ONLY
    `;

        const result = await oracleExecute(
            sql,
            { nome: `%${String(nomeItem || "").trim()}%` },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return (result.rows || [])[0] || null;
    },

    async buscarSolicitacaoPorId(idSolicitacao: number) {
        const sql = `
      SELECT *
      FROM DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
      WHERE ID_SOLICITACAO = :idSolicitacao
    `;

        const result = await oracleExecute(
            sql,
            { idSolicitacao },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return (result.rows || [])[0] || null;
    },

    async responderManualGlpi(data: RespostaManualInput) {
        const solicitacao = await this.buscarSolicitacaoPorId(data.idSolicitacao);

        if (!solicitacao) {
            throw new Error("Solicitação não encontrada.");
        }

        const statusGlpi = Number(data.statusGlpi);
        const quantidadeAtendida = normalizeNumber(data.quantidadeAtendida);

        if (![4, 5, 6].includes(statusGlpi)) {
            throw new Error("Status GLPI inválido. Use 4=Pendente, 5=Solucionado ou 6=Fechado.");
        }

        let nomeItem = solicitacao.NM_ITEM_SOLICITADO;
        let saldoDepois: number | null = null;

        if (data.idItem) {
            const item = await this.buscarItemPorId(data.idItem);

            if (!item) {
                throw new Error("Item não encontrado.");
            }

            nomeItem = item.NM_ITEM;

            if (statusGlpi === 5) {
                if (quantidadeAtendida <= 0) {
                    throw new Error("Para solucionar o chamado, informe a quantidade atendida.");
                }

                const saldoAntes = normalizeNumber(item.QT_SALDO_ATUAL);

                if (saldoAntes < quantidadeAtendida) {
                    throw new Error("Saldo insuficiente para solucionar essa solicitação.");
                }

                saldoDepois = saldoAntes - quantidadeAtendida;

                await oracleExecute(
                    `
                INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
                    ID_ITEM,
                    TP_MOVIMENTACAO,
                    QT_MOVIMENTACAO,
                    QT_SALDO_ANTES,
                    QT_SALDO_DEPOIS,
                    DS_OBSERVACAO,
                    NM_SOLICITANTE,
                    NM_SETOR,
                    ID_CHAMADO_GLPI,
                    NM_USUARIO_BAIXA
                ) VALUES (
                    :idItem,
                    'SAIDA',
                    :quantidade,
                    :saldoAntes,
                    :saldoDepois,
                    :observacao,
                    :nomeSolicitante,
                    :nomeSetor,
                    :idChamadoGlpi,
                    :usuario
                )
                `,
                    {
                        idItem: data.idItem,
                        quantidade: quantidadeAtendida,
                        saldoAntes,
                        saldoDepois,
                        observacao: data.resposta || null,
                        nomeSolicitante: solicitacao.NM_SOLICITANTE || null,
                        nomeSetor: solicitacao.NM_SETOR || null,
                        idChamadoGlpi: solicitacao.ID_CHAMADO_GLPI,
                        usuario: data.usuarioAtendimento,
                    },
                    { autoCommit: true }
                );

                await oracleExecute(
                    `
                UPDATE DBACRESSEM.ESTOQUE_ITENS
                SET QT_SALDO_ATUAL = :saldoDepois,
                    DT_ATUALIZACAO = SYSDATE
                WHERE ID_ITEM = :idItem
                `,
                    {
                        idItem: data.idItem,
                        saldoDepois,
                    },
                    { autoCommit: true }
                );
            }
        }

        const totaisItensResult = await oracleExecute(
            `
    SELECT
        COUNT(*) AS TOTAL_ITENS,
        SUM(CASE WHEN ST_ITEM = 'ATENDIDO' THEN 1 ELSE 0 END) AS TOTAL_ATENDIDOS,
        SUM(QT_ATENDIDA) AS TOTAL_ATENDIDO
    FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
    WHERE ID_SOLICITACAO = :idSolicitacao
    `,
            { idSolicitacao: data.idSolicitacao },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const totaisItens = (totaisItensResult.rows || [])[0] as any;

        const totalItens = normalizeNumber(totaisItens?.TOTAL_ITENS);
        const totalAtendidos = normalizeNumber(totaisItens?.TOTAL_ATENDIDOS);
        const totalAtendido = normalizeNumber(totaisItens?.TOTAL_ATENDIDO);

        const todosItensAtendidos = totalItens > 0 && totalItens === totalAtendidos;

        const statusSolicitacao =
            todosItensAtendidos
                ? "ATENDIDA"
                : totalAtendido > 0
                    ? "ATENDIDA_PARCIAL"
                    : "EM_ANALISE";

        const mensagemGlpi = `
Resposta manual registrada via Intranet.

Item solicitado: ${solicitacao.NM_ITEM_SOLICITADO}
Item informado: ${nomeItem || "-"}
Quantidade solicitada: ${solicitacao.QT_SOLICITADA}
Quantidade atendida/informada: ${quantidadeAtendida}
Responsável: ${data.usuarioAtendimento}

Resposta:
${data.resposta}
    `.trim();

        await glpiService.addTicketFollowup(solicitacao.ID_CHAMADO_GLPI, mensagemGlpi);
        await glpiService.updateTicketStatus(solicitacao.ID_CHAMADO_GLPI, statusGlpi);

        await oracleExecute(
            `
    UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
    SET ID_ITEM = NVL(:idItem, ID_ITEM),
        QT_ATENDIDA = :totalAtendido,
        DS_ULTIMA_RESPOSTA_MANUAL = :resposta,
        NR_ULTIMO_STATUS_GLPI = :statusGlpi,
        ST_SOLICITACAO = :statusSolicitacao,
        DT_ATENDIMENTO = CASE
            WHEN :statusSolicitacao = 'ATENDIDA' THEN SYSDATE
            ELSE DT_ATENDIMENTO
        END,
        NM_USUARIO_ATENDIMENTO = :usuario
    WHERE ID_SOLICITACAO = :idSolicitacao
    `,
            {
                idSolicitacao: data.idSolicitacao,
                idItem: data.idItem || null,
                totalAtendido,
                resposta: data.resposta,
                statusGlpi,
                statusSolicitacao,
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: true }
        );

        return {
            success: true,
            statusGlpi,
            statusSolicitacao,
            saldoDepois,
        };
    },

    async importarProdutosExcel(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        let inseridos = 0;
        let atualizados = 0;
        let ignorados = 0;

        for (const row of rows) {
            try {
                const nome = String(row["nome"] || row["NM_ITEM"] || "").trim();
                const unidade = String(row["unidade"] || row["DS_UNIDADE"] || "").trim();

                if (!nome || !unidade) {
                    ignorados++;
                    continue;
                }

                const descricao = row["descricao"] || row["DS_ITEM"] || null;
                const saldoAtual = normalizeNumber(row["saldoAtual"] || row["QT_SALDO_ATUAL"]);
                const saldoMinimo = normalizeNumber(row["saldoMinimo"] || row["QT_SALDO_MINIMO"]);

                const itemExistente = await this.buscarItemPorNomeAproximado(nome);

                if (itemExistente?.ID_ITEM) {
                    const saldoAntes = normalizeNumber(itemExistente.QT_SALDO_ATUAL);
                    const saldoDepois = saldoAntes + saldoAtual;

                    await oracleExecute(
                        `
                UPDATE DBACRESSEM.ESTOQUE_ITENS
                SET QT_SALDO_ATUAL = :saldoDepois,
                    QT_SALDO_MINIMO = CASE
                        WHEN :saldoMinimo > 0 THEN :saldoMinimo
                        ELSE QT_SALDO_MINIMO
                    END,
                    DS_ITEM = NVL(:descricao, DS_ITEM),
                    DS_UNIDADE = NVL(:unidade, DS_UNIDADE),
                    DT_ATUALIZACAO = SYSDATE
                WHERE ID_ITEM = :idItem
                `,
                        {
                            idItem: itemExistente.ID_ITEM,
                            saldoDepois,
                            saldoMinimo,
                            descricao,
                            unidade,
                        },
                        { autoCommit: true }
                    );

                    if (saldoAtual > 0) {
                        await oracleExecute(
                            `
                    INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
                        ID_ITEM,
                        TP_MOVIMENTACAO,
                        QT_MOVIMENTACAO,
                        QT_SALDO_ANTES,
                        QT_SALDO_DEPOIS,
                        DS_OBSERVACAO,
                        NM_USUARIO_BAIXA
                    ) VALUES (
                        :idItem,
                        'ENTRADA',
                        :quantidade,
                        :saldoAntes,
                        :saldoDepois,
                        :observacao,
                        :usuario
                    )
                    `,
                            {
                                idItem: itemExistente.ID_ITEM,
                                quantidade: saldoAtual,
                                saldoAntes,
                                saldoDepois,
                                observacao: "Entrada por importação em massa via Excel",
                                usuario: "importacao_excel",
                            },
                            { autoCommit: true }
                        );
                    }

                    atualizados++;
                    continue;
                }

                await oracleExecute(
                    `
            INSERT INTO DBACRESSEM.ESTOQUE_ITENS (
                NM_ITEM,
                DS_ITEM,
                DS_UNIDADE,
                QT_SALDO_ATUAL,
                QT_SALDO_MINIMO,
                DT_ATUALIZACAO
            ) VALUES (
                :nome,
                :descricao,
                :unidade,
                :saldoAtual,
                :saldoMinimo,
                SYSDATE
            )
            `,
                    {
                        nome,
                        descricao,
                        unidade,
                        saldoAtual,
                        saldoMinimo,
                    },
                    { autoCommit: true }
                );

                const itemCriado = await this.buscarItemPorNomeAproximado(nome);

                if (itemCriado?.ID_ITEM && saldoAtual > 0) {
                    await oracleExecute(
                        `
                INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
                    ID_ITEM,
                    TP_MOVIMENTACAO,
                    QT_MOVIMENTACAO,
                    QT_SALDO_ANTES,
                    QT_SALDO_DEPOIS,
                    DS_OBSERVACAO,
                    NM_USUARIO_BAIXA
                ) VALUES (
                    :idItem,
                    'ENTRADA',
                    :quantidade,
                    0,
                    :saldoDepois,
                    :observacao,
                    :usuario
                )
                `,
                        {
                            idItem: itemCriado.ID_ITEM,
                            quantidade: saldoAtual,
                            saldoDepois: saldoAtual,
                            observacao: "Entrada inicial por importação em massa via Excel",
                            usuario: "importacao_excel",
                        },
                        { autoCommit: true }
                    );
                }

                try {
                    const glpiItem = await glpiService.createConsumableItemEstoque({
                        nome,
                        descricao: descricao || "",
                    });

                    const idItemGlpi = Number(
                        glpiItem?.id ||
                        glpiItem?.ID ||
                        glpiItem?.data?.id ||
                        glpiItem?.data?.ID
                    );

                    if (idItemGlpi) {
                        await oracleExecute(
                            `
                    UPDATE DBACRESSEM.ESTOQUE_ITENS
                    SET ID_ITEM_GLPI = :idItemGlpi,
                        DT_ULTIMA_SINCRONIZACAO_GLPI = SYSDATE
                    WHERE UPPER(TRIM(NM_ITEM)) = UPPER(TRIM(:nome))
                      AND ST_ATIVO = 'S'
                    `,
                            {
                                idItemGlpi,
                                nome,
                            },
                            { autoCommit: true }
                        );

                        if (saldoAtual > 0) {
                            for (let i = 0; i < saldoAtual; i++) {
                                await glpiService.createConsumableEstoque({
                                    idItem: idItemGlpi,
                                    quantidade: 1,
                                });
                            }
                        }
                    }
                } catch (error: any) {
                    console.error(
                        "Produto importado no Oracle, mas falhou ao cadastrar estoque no GLPI:",
                        error?.response?.data || error?.message || error
                    );
                }

                inseridos++;
            } catch (error) {
                console.error("Erro ao importar linha:", row, error);
                ignorados++;
            }
        }

        return {
            success: true,
            total: rows.length,
            inseridos,
            atualizados,
            ignorados,
        };
    },

    async verificarItensAbaixoMinimo() {
        const sql = `
        SELECT
            ID_ITEM,
            NM_ITEM,
            QT_SALDO_ATUAL,
            QT_SALDO_MINIMO
        FROM DBACRESSEM.ESTOQUE_ITENS
        WHERE ST_ATIVO = 'S'
          AND QT_SALDO_ATUAL <= QT_SALDO_MINIMO
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        return result.rows || [];
    },

    async enviarAlertaEmailEstoqueCritico() {
        await this.resolverAlertasNormalizados();

        const itens = await this.verificarItensAbaixoMinimoSemAlertaAberto();

        if (!itens.length) {
            return {
                success: true,
                total: 0,
                message: "Nenhum item abaixo do mínimo.",
            };
        }

        const destinatarios = process.env.ESTOQUE_ALERT_EMAIL_TO;

        if (!destinatarios) {
            throw new Error("Variável ESTOQUE_ALERT_EMAIL_TO não configurada no .env.");
        }

        const linhas = itens
            .map((item: any) => {
                return `
                <tr>
                    <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${item.NM_ITEM}</td>
                    <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.QT_SALDO_ATUAL}</td>
                    <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.QT_SALDO_MINIMO}</td>
                </tr>
            `;
            })
            .join("");

        const dataHoje = new Date().toLocaleDateString("pt-BR");

        const html = `
<div style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table width="720" cellspacing="0" cellpadding="0" style="max-width:720px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbe3ea;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          
          <tr>
            <td style="background:linear-gradient(135deg,#00AE9D 0%,#79B729 100%);padding:28px 32px;color:#ffffff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;opacity:.92;">
                Intranet • Estoque de Consumíveis
              </div>

              <h1 style="margin:10px 0 6px;font-size:26px;line-height:1.2;font-weight:800;color:#64748b;">
                Alerta de estoque baixo
              </h1>

              <p style="margin:0;font-size:14px;line-height:1.6;opacity:.95;color:#64748b;">
                Existem <strong>${itens.length}</strong> item(ns) abaixo do saldo mínimo cadastrado.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 10px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:16px 18px;">
                    <div style="font-size:14px;line-height:1.6;color:#9a3412;">
                      <strong>Atenção:</strong> os produtos abaixo precisam de reposição ou análise do responsável pelo almoxarifado.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
                <thead>
                  <tr>
                    <th align="left" style="background:#f8fafc;padding:14px 16px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;border-bottom:1px solid #e2e8f0;">
                      Produto
                    </th>
                    <th align="center" style="background:#f8fafc;padding:14px 16px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;border-bottom:1px solid #e2e8f0;">
                      Saldo atual
                    </th>
                    <th align="center" style="background:#f8fafc;padding:14px 16px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;border-bottom:1px solid #e2e8f0;">
                      Saldo mínimo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${itens
                .map(
                    (item: any) => `
                        <tr>
                          <td style="padding:15px 16px;border-bottom:1px solid #edf2f7;font-size:14px;font-weight:700;color:#0f172a;">
                            ${item.NM_ITEM}
                          </td>
                          <td align="center" style="padding:15px 16px;border-bottom:1px solid #edf2f7;font-size:14px;">
                            <span style="display:inline-block;min-width:42px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-weight:800;padding:6px 10px;">
                              ${item.QT_SALDO_ATUAL}
                            </span>
                          </td>
                          <td align="center" style="padding:15px 16px;border-bottom:1px solid #edf2f7;font-size:14px;color:#334155;font-weight:700;">
                            ${item.QT_SALDO_MINIMO}
                          </td>
                        </tr>
                      `
                )
                .join("")}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 32px 28px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:1.6;color:#475569;">
                    <strong>Próxima ação sugerida:</strong><br/>
                    Acesse a <strong>Intranet &gt; Estoque de Consumíveis</strong>, confira o item em destaque e registre uma nova entrada quando houver reposição.
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                Alerta automático enviado em ${dataHoje} • Sicoob Cressem
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>
`;
        await sendEmail(
            destinatarios,
            `Alerta de estoque baixo - ${itens.length} item(ns)`,
            html
        );
        await this.registrarAlertasEmailEnviados(itens);

        return {
            success: true,
            total: itens.length,
            message: "Alerta enviado por e-mail.",
            itens,
        };
    },

    async enviarAlertaWhatsappEstoqueCritico() {
        const itens = await this.verificarItensAbaixoMinimo();

        if (!itens.length) {
            return {
                success: true,
                total: 0,
                message: "Nenhum novo item crítico para alertar.",
            };
        }

        const mensagem = `
        ALERTA DE ESTOQUE BAIXO

        Existem ${itens.length} item(ns) abaixo do estoque mínimo:

        ${itens
                .map(
                    (item: any) =>
                        `• ${item.NM_ITEM} — saldo atual: ${item.QT_SALDO_ATUAL} | mínimo: ${item.QT_SALDO_MINIMO}`
                )
                .join("\n")}

                    Acesse a Intranet > Estoque de Consumíveis para realizar a reposição.
        `.trim();

        await whatsappService.enviarMensagem(mensagem);

        return {
            success: true,
            total: itens.length,
            message: "Alerta enviado por WhatsApp.",
            itens,
        };
    },

    async verificarItensAbaixoMinimoSemAlertaAberto() {
        const sql = `
        SELECT
            I.ID_ITEM,
            I.NM_ITEM,
            I.QT_SALDO_ATUAL,
            I.QT_SALDO_MINIMO
        FROM DBACRESSEM.ESTOQUE_ITENS I
        WHERE I.ST_ATIVO = 'S'
          AND I.QT_SALDO_ATUAL <= I.QT_SALDO_MINIMO
          AND NOT EXISTS (
              SELECT 1
              FROM DBACRESSEM.ESTOQUE_ALERTAS_EMAIL A
              WHERE A.ID_ITEM = I.ID_ITEM
                AND A.ST_RESOLVIDO = 'N'
          )
        ORDER BY I.NM_ITEM
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
    },

    async registrarAlertasEmailEnviados(itens: any[]) {
        for (const item of itens) {
            await oracleExecute(
                `
            INSERT INTO DBACRESSEM.ESTOQUE_ALERTAS_EMAIL (
                ID_ITEM,
                NM_ITEM,
                QT_SALDO_ATUAL,
                QT_SALDO_MINIMO,
                DT_ALERTA,
                ST_RESOLVIDO
            ) VALUES (
                :idItem,
                :nomeItem,
                :saldoAtual,
                :saldoMinimo,
                SYSDATE,
                'N'
            )
            `,
                {
                    idItem: item.ID_ITEM,
                    nomeItem: item.NM_ITEM,
                    saldoAtual: item.QT_SALDO_ATUAL,
                    saldoMinimo: item.QT_SALDO_MINIMO,
                },
                { autoCommit: true }
            );
        }
    },

    async resolverAlertasNormalizados() {
        await oracleExecute(
            `
        UPDATE DBACRESSEM.ESTOQUE_ALERTAS_EMAIL A
        SET A.ST_RESOLVIDO = 'S'
        WHERE A.ST_RESOLVIDO = 'N'
          AND EXISTS (
              SELECT 1
              FROM DBACRESSEM.ESTOQUE_ITENS I
              WHERE I.ID_ITEM = A.ID_ITEM
                AND I.QT_SALDO_ATUAL > I.QT_SALDO_MINIMO
          )
        `,
            {},
            { autoCommit: true }
        );
    },

    async listarAlertasEmailEstoque() {
        const sql = `
        SELECT
            A.ID_ALERTA,
            A.ID_ITEM,
            A.NM_ITEM,
            A.QT_SALDO_ATUAL,
            A.QT_SALDO_MINIMO,
            A.DT_ALERTA,
            A.ST_RESOLVIDO,
            I.QT_SALDO_ATUAL AS QT_SALDO_ATUAL_AGORA,
            I.QT_SALDO_MINIMO AS QT_SALDO_MINIMO_AGORA
        FROM DBACRESSEM.ESTOQUE_ALERTAS_EMAIL A
        LEFT JOIN DBACRESSEM.ESTOQUE_ITENS I
          ON I.ID_ITEM = A.ID_ITEM
        ORDER BY A.DT_ALERTA DESC, A.ID_ALERTA DESC
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
    },

    async buscarPainelGlpiEstoque() {
        await this.sincronizarChamadosReaisGlpi();

        const sql = `
        SELECT
            ID_SOLICITACAO,
            ID_CHAMADO_GLPI,
            ID_ITEM,
            NM_ITEM_SOLICITADO,
            QT_SOLICITADA,
            QT_ATENDIDA,
            NM_SOLICITANTE,
            NM_SETOR,
            ST_SOLICITACAO,
            DT_SOLICITACAO,
            DT_ATENDIMENTO,
            NM_USUARIO_ATENDIMENTO,
            DBMS_LOB.SUBSTR(DS_ULTIMA_RESPOSTA_MANUAL, 4000, 1) AS DS_ULTIMA_RESPOSTA_MANUAL,
            NR_ULTIMO_STATUS_GLPI
        FROM DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
        WHERE ST_SOLICITACAO IN (
            'ABERTA',
            'EM_ANALISE',
            'ITEM_NAO_CADASTRADO',
            'RETORNO_NEGATIVO'
        )
        ORDER BY NVL(DT_SOLICITACAO, SYSDATE) DESC, ID_SOLICITACAO DESC
    `;

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const items = result.rows || [];

        return {
            success: true,
            total: items.length,
            ultimaAtualizacao: new Date().toISOString(),
            items,
        };
    },

    async atualizarStatusChamadoExistenteGlpi(ticket: any) {
        const idChamadoGlpi = Number(ticket?.id);
        const statusGlpi = Number(ticket?.status || ticket?.status_id || 0);

        if (!idChamadoGlpi) return { updated: false };

        const existenteResult = await oracleExecute(
            `
        SELECT
            ID_SOLICITACAO,
            ST_SOLICITACAO,
            NR_STATUS_ATUAL_GLPI,
            NR_ULTIMO_STATUS_GLPI
        FROM DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
        WHERE ID_CHAMADO_GLPI = :idChamadoGlpi
        FETCH FIRST 1 ROWS ONLY
        `,
            { idChamadoGlpi },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const solicitacao = (existenteResult.rows || [])[0];

        if (!solicitacao) {
            return { updated: false };
        }

        const statusAtualIntranet = String(solicitacao.ST_SOLICITACAO || "");

        const estavaFinalizadoNaIntranet = [
            "ATENDIDA",
            "ATENDIDA_PARCIAL",
            "RECUSADA",
        ].includes(statusAtualIntranet);

        const voltouNoGlpi = [1, 2, 3, 4].includes(statusGlpi);

        const textoRetorno = limparHtml(
            String(ticket?.content || ticket?.description || ticket?.name || "")
        );

        if (estavaFinalizadoNaIntranet && voltouNoGlpi) {
            await oracleExecute(
                `
            UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
            SET ST_SOLICITACAO = 'RETORNO_NEGATIVO',
                NR_STATUS_ATUAL_GLPI = :statusGlpi,
                DS_ULTIMO_RETORNO_GLPI = :retorno,
                DT_RETORNO_NEGATIVO = SYSDATE,
                ST_NOTIFICADO_RETORNO = 'N'
            WHERE ID_SOLICITACAO = :idSolicitacao
            `,
                {
                    idSolicitacao: solicitacao.ID_SOLICITACAO,
                    statusGlpi,
                    retorno: textoRetorno || "Chamado retornado/reaberto no GLPI.",
                },
                { autoCommit: true }
            );

            return {
                updated: true,
                retornoNegativo: true,
                idChamadoGlpi,
            };
        }

        await oracleExecute(
            `
        UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
        SET NR_STATUS_ATUAL_GLPI = :statusGlpi
        WHERE ID_SOLICITACAO = :idSolicitacao
        `,
            {
                idSolicitacao: solicitacao.ID_SOLICITACAO,
                statusGlpi,
            },
            { autoCommit: true }
        );

        return {
            updated: true,
            retornoNegativo: false,
            idChamadoGlpi,
        };
    },

    async registrarSaidaManualComGlpi(data: SaidaManualComGlpiInput) {
        const item = await this.buscarItemPorId(data.idItem);
        if (!item) throw new Error("Item não encontrado.");

        const quantidade = normalizeNumber(data.quantidade);
        const saldoAntes = normalizeNumber(item.QT_SALDO_ATUAL);

        if (quantidade <= 0) {
            throw new Error("Quantidade inválida.");
        }

        if (!String(data.nomeSolicitante || "").trim()) {
            throw new Error("Informe o nome do solicitante.");
        }

        if (saldoAntes < quantidade) {
            throw new Error("Saldo insuficiente para registrar a saída.");
        }

        const chamadoGlpi = await glpiService.createTicketEstoqueManual({
            nomeSolicitante: data.nomeSolicitante,
            setor: data.nomeSetor || "",
            item: item.NM_ITEM,
            quantidade,
            observacao: data.observacao || "",
            usuarioAtendimento: data.usuarioAtendimento,
        });

        console.log("RETORNO CRIAÇÃO CHAMADO GLPI:", JSON.stringify(chamadoGlpi, null, 2));

        const idChamadoGlpi = Number(
            chamadoGlpi?.id ||
            chamadoGlpi?.ID ||
            chamadoGlpi?.data?.id ||
            chamadoGlpi?.data?.ID ||
            chamadoGlpi?.[0]?.id ||
            chamadoGlpi?.[0]?.ID
        );

        if (!idChamadoGlpi) {
            throw new Error("Chamado criado no GLPI, mas não foi possível identificar o ID retornado.");
        }

        const chamadoConfirmado = await glpiService.getTicketById(idChamadoGlpi);

        console.log(
            "CHAMADO CONFIRMADO NO GLPI:",
            JSON.stringify(chamadoConfirmado, null, 2)
        );

        const saldoDepois = saldoAntes - quantidade;

        const statusFinalGlpi = 6;

        const insertSolicitacaoResult = await oracleExecute(
            `
    INSERT INTO DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI (
        ID_CHAMADO_GLPI,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        NM_SOLICITANTE,
        NM_SETOR,
        DS_DESCRICAO_GLPI,
        DT_SOLICITACAO,
        ST_SOLICITACAO,
        DT_ATENDIMENTO,
        NM_USUARIO_ATENDIMENTO,
        NR_ULTIMO_STATUS_GLPI,
        NR_STATUS_ATUAL_GLPI,
        ST_NOTIFICADO_RETORNO
    ) VALUES (
        :idChamadoGlpi,
        :idItem,
        :nomeItem,
        :quantidade,
        :quantidade,
        :nomeSolicitante,
        :nomeSetor,
        :descricaoGlpi,
        SYSDATE,
        'ATENDIDA',
        SYSDATE,
        :usuario,
        :statusFinalGlpi,
        :statusFinalGlpi,
        'S'
    )
    RETURNING ID_SOLICITACAO INTO :idSolicitacao
    `,
            {
                idChamadoGlpi,
                idItem: data.idItem,
                nomeItem: item.NM_ITEM,
                quantidade,
                nomeSolicitante: data.nomeSolicitante,
                nomeSetor: data.nomeSetor || null,
                descricaoGlpi: data.observacao || "Saída manual registrada pela Intranet.",
                usuario: data.usuarioAtendimento,
                statusFinalGlpi,
                idSolicitacao: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            },
            { autoCommit: false }
        );

        const idSolicitacao = Number(insertSolicitacaoResult.outBinds?.idSolicitacao?.[0]);

        await oracleExecute(
            `
    INSERT INTO DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS (
        ID_SOLICITACAO,
        ID_ITEM,
        NM_ITEM_SOLICITADO,
        QT_SOLICITADA,
        QT_ATENDIDA,
        ST_ITEM,
        DS_OBSERVACAO,
        DT_ATENDIMENTO,
        NM_USUARIO_ATENDIMENTO
    ) VALUES (
        :idSolicitacao,
        :idItem,
        :nomeItem,
        :quantidade,
        :quantidade,
        'ATENDIDO',
        :observacao,
        SYSDATE,
        :usuario
    )
    `,
            {
                idSolicitacao,
                idItem: data.idItem,
                nomeItem: item.NM_ITEM,
                quantidade,
                observacao: data.observacao || "Saída manual com chamado GLPI.",
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: false }
        );

        await oracleExecute(
            `
    INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
        ID_ITEM,
        TP_MOVIMENTACAO,
        QT_MOVIMENTACAO,
        QT_SALDO_ANTES,
        QT_SALDO_DEPOIS,
        DS_OBSERVACAO,
        NM_SOLICITANTE,
        NM_SETOR,
        ID_CHAMADO_GLPI,
        NM_USUARIO_BAIXA
    ) VALUES (
        :idItem,
        'SAIDA',
        :quantidade,
        :saldoAntes,
        :saldoDepois,
        :observacao,
        :nomeSolicitante,
        :nomeSetor,
        :idChamadoGlpi,
        :usuario
    )
    `,
            {
                idItem: data.idItem,
                quantidade,
                saldoAntes,
                saldoDepois,
                observacao: data.observacao || "Saída manual com chamado GLPI.",
                nomeSolicitante: data.nomeSolicitante,
                nomeSetor: data.nomeSetor || null,
                idChamadoGlpi,
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: false }
        );

        await oracleExecute(
            `
    UPDATE DBACRESSEM.ESTOQUE_ITENS
    SET QT_SALDO_ATUAL = :saldoDepois,
        DT_ATUALIZACAO = SYSDATE
    WHERE ID_ITEM = :idItem
    `,
            {
                idItem: data.idItem,
                saldoDepois,
            },
            { autoCommit: false }
        );

        await oracleExecute("COMMIT", {}, { autoCommit: true });

        const mensagemGlpi = `
    Solicitação manual atendida via Intranet.

    Item entregue: ${item.NM_ITEM}
    Quantidade atendida: ${quantidade}
    Solicitante: ${data.nomeSolicitante}
    Setor: ${data.nomeSetor || "-"}
    Responsável pela baixa: ${data.usuarioAtendimento}
    Observação: ${data.observacao || "-"}
        `.trim();

        try {
            console.log("Enviando followup...");
            await glpiService.addTicketFollowup(idChamadoGlpi, mensagemGlpi);

            console.log("Enviando solução...");
            await glpiService.solveTicket(idChamadoGlpi, mensagemGlpi);

            console.log("Atualizando status para FECHADO...");
            await glpiService.updateTicketStatus(idChamadoGlpi, statusFinalGlpi);

            console.log("Chamado finalizado com sucesso no GLPI!");
        } catch (error: any) {
            console.error(
                "Saída registrada no Oracle, mas falhou ao atualizar GLPI:",
                error?.response?.data || error?.message || error
            );
        }

        await this.resolverAlertasNormalizados();

        return {
            success: true,
            idChamadoGlpi,
            saldoAntes,
            saldoDepois,
        };
    },

    async darBaixaItemSolicitacao(data: {
        idSolicitacaoItem: number;
        idItem: number;
        quantidadeAtendida: number;
        observacao?: string;
        usuarioAtendimento: string;
    }) {
        const itemSolicitacaoResult = await oracleExecute(
            `
        SELECT
            SI.ID_SOLICITACAO_ITEM,
            SI.ID_SOLICITACAO,
            SI.QT_SOLICITADA,
            SI.QT_ATENDIDA,
            S.ID_CHAMADO_GLPI,
            S.NM_SOLICITANTE,
            S.NM_SETOR
        FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS SI
        INNER JOIN DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI S
            ON S.ID_SOLICITACAO = SI.ID_SOLICITACAO
        WHERE SI.ID_SOLICITACAO_ITEM = :idSolicitacaoItem
        `,
            { idSolicitacaoItem: data.idSolicitacaoItem },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const itemSolicitacao = (itemSolicitacaoResult.rows || [])[0] as any;

        if (!itemSolicitacao) {
            throw new Error("Item da solicitação não encontrado.");
        }

        const itemEstoque = await this.buscarItemPorId(data.idItem);

        if (!itemEstoque) {
            throw new Error("Item de estoque não encontrado.");
        }

        const saldoAntes = normalizeNumber(itemEstoque.QT_SALDO_ATUAL);
        const quantidadeAtendida = normalizeNumber(data.quantidadeAtendida);

        if (quantidadeAtendida <= 0) {
            throw new Error("Quantidade atendida deve ser maior que zero.");
        }

        if (quantidadeAtendida > saldoAntes) {
            throw new Error("Saldo insuficiente para atender este item.");
        }

        const novaQtdAtendida =
            normalizeNumber(itemSolicitacao.QT_ATENDIDA) + quantidadeAtendida;

        const qtdSolicitada = normalizeNumber(itemSolicitacao.QT_SOLICITADA);

        const statusItem =
            novaQtdAtendida >= qtdSolicitada
                ? "ATENDIDO"
                : "ATENDIDO_PARCIAL";

        const saldoDepois = saldoAntes - quantidadeAtendida;

        await oracleExecute(
            `
        UPDATE DBACRESSEM.ESTOQUE_ITENS
        SET QT_SALDO_ATUAL = :saldoDepois,
            DT_ATUALIZACAO = SYSDATE
        WHERE ID_ITEM = :idItem
        `,
            {
                saldoDepois,
                idItem: data.idItem,
            },
            { autoCommit: true }
        );

        await oracleExecute(
            `
        UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS
        SET ID_ITEM = :idItem,
            QT_ATENDIDA = :novaQtdAtendida,
            ST_ITEM = :statusItem,
            DS_OBSERVACAO = :observacao,
            DT_ATENDIMENTO = SYSDATE,
            NM_USUARIO_ATENDIMENTO = :usuarioAtendimento
        WHERE ID_SOLICITACAO_ITEM = :idSolicitacaoItem
        `,
            {
                idItem: data.idItem,
                novaQtdAtendida,
                statusItem,
                observacao: data.observacao || null,
                usuarioAtendimento: data.usuarioAtendimento,
                idSolicitacaoItem: data.idSolicitacaoItem,
            },
            { autoCommit: true }
        );

        await oracleExecute(
            `
        INSERT INTO DBACRESSEM.ESTOQUE_MOVIMENTACOES (
            ID_ITEM,
            TP_MOVIMENTACAO,
            QT_MOVIMENTACAO,
            QT_SALDO_ANTES,
            QT_SALDO_DEPOIS,
            DS_OBSERVACAO,
            NM_SOLICITANTE,
            NM_SETOR,
            ID_CHAMADO_GLPI,
            NM_USUARIO_BAIXA
        ) VALUES (
            :idItem,
            'SAIDA',
            :quantidadeAtendida,
            :saldoAntes,
            :saldoDepois,
            :observacao,
            :nomeSolicitante,
            :nomeSetor,
            :idChamadoGlpi,
            :usuarioAtendimento
        )
        `,
            {
                idItem: data.idItem,
                quantidadeAtendida,
                saldoAntes,
                saldoDepois,
                observacao: data.observacao || "Baixa de item da solicitação GLPI",
                nomeSolicitante: itemSolicitacao.NM_SOLICITANTE || null,
                nomeSetor: itemSolicitacao.NM_SETOR || null,
                idChamadoGlpi: itemSolicitacao.ID_CHAMADO_GLPI,
                usuarioAtendimento: data.usuarioAtendimento,
            },
            { autoCommit: true }
        );

        await oracleExecute(
            `
        UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI S
        SET S.ST_SOLICITACAO = (
            SELECT
                CASE
                    WHEN COUNT(*) = SUM(CASE WHEN I.ST_ITEM = 'ATENDIDO' THEN 1 ELSE 0 END)
                        THEN 'ATENDIDA'
                    WHEN SUM(CASE WHEN I.ST_ITEM IN ('ATENDIDO', 'ATENDIDO_PARCIAL') THEN 1 ELSE 0 END) > 0
                        THEN 'ATENDIDA_PARCIAL'
                    ELSE 'ABERTA'
                END
            FROM DBACRESSEM.ESTOQUE_SOLICITACOES_ITENS I
            WHERE I.ID_SOLICITACAO = S.ID_SOLICITACAO
        ),
        S.DT_ATENDIMENTO = SYSDATE,
        S.NM_USUARIO_ATENDIMENTO = :usuarioAtendimento
        WHERE S.ID_SOLICITACAO = :idSolicitacao
        `,
            {
                usuarioAtendimento: data.usuarioAtendimento,
                idSolicitacao: itemSolicitacao.ID_SOLICITACAO,
            },
            { autoCommit: true }
        );

        return {
            success: true,
            message: "Baixa do item realizada com sucesso.",
            saldoAntes,
            saldoDepois,
            quantidadeAtendida,
            statusItem,
        };
    },

};