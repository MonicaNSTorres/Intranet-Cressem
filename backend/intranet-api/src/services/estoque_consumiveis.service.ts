import oracledb from "oracledb";
import { oracleExecute } from "./oracle.service";
import { GlpiService } from "./glpi.service";
import * as XLSX from "xlsx";
import { whatsappService } from "./whatsapp.service";
import { sendEmail } from "./email.service";

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

function parseDescricaoEstoqueGlpi(descricao: string) {
    const textoLimpo = limparHtml(descricao);

    const item =
        extrairCampo(textoLimpo, "Selecione o Insumo") ||
        extrairCampo(textoLimpo, "Insumo") ||
        extrairCampo(textoLimpo, "Item");

    const quantidadeTexto = extrairCampo(textoLimpo, "Quantidade");

    const quantidade = Number(
        String(quantidadeTexto || "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "")
    );

    const setor = extrairCampo(textoLimpo, "Setor");
    const observacao = extrairCampo(textoLimpo, "Observação");

    return {
        item,
        quantidade: Number.isFinite(quantidade) ? quantidade : 0,
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

        return { success: true };
    },

    async listarSolicitacoesGlpi() {
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

        const result = await oracleExecute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
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
                item: parsed.item,
                quantidade: parsed.quantidade,
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

            if (!idChamadoGlpi || !parsed.item || !parsed.quantidade) {
                ignorados++;
                semPadrao++;
                continue;
            }

            const itemEncontrado = await this.buscarItemPorNomeAproximado(parsed.item);

            const resultado = await this.sincronizarSolicitacaoGlpi({
                idChamadoGlpi,
                idItem: itemEncontrado?.ID_ITEM || null,
                nomeItemSolicitado: parsed.item,
                quantidadeSolicitada: parsed.quantidade,
                nomeSolicitante: nomeSolicitante || null,
                nomeSetor: parsed.setor || null,
                descricaoGlpi: descricao,
                dataSolicitacao: ticket?.date_creation || ticket?.date || null,
                status: itemEncontrado?.ID_ITEM ? "ABERTA" : "ITEM_NAO_CADASTRADO",
            });

            if (!resultado?.duplicated && itemEncontrado?.ID_ITEM) {
                await oracleExecute(
                    `
          UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
          SET ID_ITEM = :idItem
          WHERE ID_CHAMADO_GLPI = :idChamadoGlpi
          `,
                    {
                        idItem: itemEncontrado.ID_ITEM,
                        idChamadoGlpi,
                    },
                    { autoCommit: true }
                );
            }

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

        const sqlInsert = `
      INSERT INTO DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI (
  ID_CHAMADO_GLPI,
  ID_ITEM,
  NM_ITEM_SOLICITADO,
  QT_SOLICITADA,
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
    `;

        await oracleExecute(
            sqlInsert,
            {
                idChamadoGlpi: input.idChamadoGlpi,
                idItem: input.idItem || null,
                nomeItemSolicitado: input.nomeItemSolicitado,
                quantidadeSolicitada: normalizeNumber(input.quantidadeSolicitada),
                nomeSolicitante: input.nomeSolicitante || null,
                nomeSetor: input.nomeSetor || null,
                descricaoGlpi: input.descricaoGlpi || null,
                dataSolicitacao: input.dataSolicitacao || null,
                status: input.status || "ABERTA",
            },
            { autoCommit: true }
        );

        return { success: true, duplicated: false };
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

        const saldoDepois = saldoAntes - quantidadeAtendida;
        const qtSolicitada = normalizeNumber(solicitacao.QT_SOLICITADA);
        const qtAtendidaAnterior = normalizeNumber(solicitacao.QT_ATENDIDA);
        const qtAtendidaNova = qtAtendidaAnterior + quantidadeAtendida;

        let status = "ATENDIDA";
        if (qtAtendidaNova < qtSolicitada) status = "ATENDIDA_PARCIAL";

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

        await oracleExecute(
            `
      UPDATE DBACRESSEM.ESTOQUE_SOLICITACOES_GLPI
      SET ID_ITEM = :idItem,
          QT_ATENDIDA = :qtAtendidaNova,
          ST_SOLICITACAO = :status,
          DT_ATENDIMENTO = SYSDATE,
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
                qtAtendidaNova,
                status,
                usuario: data.usuarioAtendimento,
            },
            { autoCommit: true }
        );

        try {
            const mensagemGlpi = `
Solicitação atendida via Intranet.

Item entregue: ${item.NM_ITEM}
Quantidade atendida: ${quantidadeAtendida}
Responsável pela baixa: ${data.usuarioAtendimento}
Observação: ${data.observacao || "-"}
  `.trim();

            await glpiService.addTicketFollowup(solicitacao.ID_CHAMADO_GLPI, mensagemGlpi);
            await glpiService.solveTicket(solicitacao.ID_CHAMADO_GLPI, mensagemGlpi);
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

        const statusSolicitacao =
            statusGlpi === 5 ? "ATENDIDA" :
                statusGlpi === 6 ? "RECUSADA" :
                    "EM_ANALISE";

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
            QT_ATENDIDA = :quantidadeAtendida,
            DS_ULTIMA_RESPOSTA_MANUAL = :resposta,
            NR_ULTIMO_STATUS_GLPI = :statusGlpi,
            ST_SOLICITACAO = :statusSolicitacao,
            DT_ATENDIMENTO = SYSDATE,
            NM_USUARIO_ATENDIMENTO = :usuario
        WHERE ID_SOLICITACAO = :idSolicitacao
        `,
            {
                idSolicitacao: data.idSolicitacao,
                idItem: data.idItem || null,
                quantidadeAtendida,
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

        await oracleExecute(
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
            5,
            5,
            'S'
        )
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
            await glpiService.addTicketFollowup(idChamadoGlpi, mensagemGlpi);
            await glpiService.solveTicket(idChamadoGlpi, mensagemGlpi);
        } catch (error: any) {
            console.error(
                "Saída registrada no Oracle, mas falhou ao solucionar GLPI:",
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
};