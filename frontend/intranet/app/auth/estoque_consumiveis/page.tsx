"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaBoxes,
    FaClipboardList,
    FaPlus,
    FaSearch,
    FaSyncAlt,
    FaWarehouse,
} from "react-icons/fa";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    buscarBalancoMensalEstoque,
    darBaixaSolicitacaoEstoque,
    lancarEntradaEstoque,
    listarItensEstoqueConsumiveis,
    listarSolicitacoesEstoqueGlpi,
    sincronizarChamadosReaisGlpi,
    responderManualSolicitacaoEstoque,
    criarItemEstoqueConsumiveis,
    importarProdutosExcelEstoque,
    listarAlertasEmailEstoque,
    registrarSaidaManualComGlpi,
} from "@/services/estoque_consumiveis.service";
import Link from "next/link";

type AbaAtiva = "solicitacoes" | "estoque" | "balanco" | "alertas";

const UNIDADES_ESTOQUE = [
    { value: "UNIDADE", label: "Unidade" },
    { value: "PACOTE", label: "Pacote" },
    { value: "CAIXA", label: "Caixa" },
    { value: "ROLO", label: "Rolo" },
    { value: "FRASCO", label: "Frasco" },
    { value: "KG", label: "Quilo" },
    { value: "LITRO", label: "Litro" },
];

export default function EstoqueConsumiveisPage() {
    const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("solicitacoes");
    const [loading, setLoading] = useState(false);
    const [itens, setItens] = useState<any[]>([]);
    const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
    const [balanco, setBalanco] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);

    const [modalBaixaAberta, setModalBaixaAberta] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<any | null>(null);
    const [idItemBaixa, setIdItemBaixa] = useState("");
    const [quantidadeBaixa, setQuantidadeBaixa] = useState("");
    const [observacaoBaixa, setObservacaoBaixa] = useState("");
    const [salvandoBaixa, setSalvandoBaixa] = useState(false);

    const [modalRespostaAberta, setModalRespostaAberta] = useState(false);
    const [respostaManual, setRespostaManual] = useState("");
    const [solicitacaoResposta, setSolicitacaoResposta] = useState<any | null>(null);

    const [statusGlpiResposta, setStatusGlpiResposta] = useState("4");

    const [modalProdutoAberta, setModalProdutoAberta] = useState(false);
    const [salvandoProduto, setSalvandoProduto] = useState(false);
    const [novoProduto, setNovoProduto] = useState({
        nome: "",
        descricao: "",
        unidade: "UNIDADE",
        saldoAtual: "",
        saldoMinimo: "",
    });

    const [modalImportacaoAberta, setModalImportacaoAberta] = useState(false);

    const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
    const [importandoExcel, setImportandoExcel] = useState(false);

    const [alertas, setAlertas] = useState<any[]>([]);

    const [produtoFiltro, setProdutoFiltro] = useState("");

    const [modalRetornoAberta, setModalRetornoAberta] = useState(false);
    const [retornoSelecionado, setRetornoSelecionado] = useState<any | null>(null);

    const [modalSaidaAberta, setModalSaidaAberta] = useState(false);
    const [itemSaidaSelecionado, setItemSaidaSelecionado] = useState<any | null>(null);
    const [quantidadeSaida, setQuantidadeSaida] = useState("");
    const [nomeSolicitanteSaida, setNomeSolicitanteSaida] = useState("");
    const [setorSaida, setSetorSaida] = useState("");
    const [observacaoSaida, setObservacaoSaida] = useState("");
    const [salvandoSaida, setSalvandoSaida] = useState(false);

    function abrirModalImportacao() {
        setArquivoExcel(null);
        setModalImportacaoAberta(true);
    }

    function fecharModalImportacao() {
        setModalImportacaoAberta(false);
        setArquivoExcel(null);
    }

    async function confirmarImportacaoExcel() {
        if (!arquivoExcel) {
            alert("Selecione uma planilha.");
            return;
        }

        try {
            setImportandoExcel(true);

            const result = await importarProdutosExcelEstoque(arquivoExcel);

            fecharModalImportacao();
            await carregarTudo();

            alert(
                `Importação concluída.\n\nInseridos: ${result?.inseridos || 0}\nAtualizados: ${result?.atualizados || 0}\nIgnorados: ${result?.ignorados || 0}`
            );
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.details || "Erro ao importar planilha.");
        } finally {
            setImportandoExcel(false);
        }
    }

    async function carregarTudo() {
        try {
            setLoading(true);

            const [respItens, respSolicitacoes, respBalanco, respAlertas] = await Promise.all([
                listarItensEstoqueConsumiveis(),
                listarSolicitacoesEstoqueGlpi(),
                buscarBalancoMensalEstoque(ano, mes),
                listarAlertasEmailEstoque(),
            ]);

            setItens(Array.isArray(respItens?.items) ? respItens.items : []);
            setSolicitacoes(Array.isArray(respSolicitacoes?.items) ? respSolicitacoes.items : []);
            setBalanco(Array.isArray(respBalanco?.items) ? respBalanco.items : []);
            setAlertas(Array.isArray(respAlertas?.items) ? respAlertas.items : []);
        } catch (error) {
            console.error("Erro ao carregar estoque de consumíveis:", error);
            setItens([]);
            setSolicitacoes([]);
            setBalanco([]);
            setAlertas([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarTudo();
    }, [ano, mes]);

    useEffect(() => {
        if (!itens.length) return;

        const criticos = itens.filter((item) => isAbaixoMinimo(item));

        if (criticos.length > 0) {
            console.warn("Itens com baixo estoque:", criticos);
        }
    }, [itens]);

    const solicitacoesFiltradas = useMemo(() => {
        if (!busca.trim()) return solicitacoes;

        const term = busca.toLowerCase();
        return solicitacoes.filter((item) => {
            return (
                String(item?.NM_ITEM_SOLICITADO || "").toLowerCase().includes(term) ||
                String(item?.NM_SOLICITANTE || "").toLowerCase().includes(term) ||
                String(item?.NM_SETOR || "").toLowerCase().includes(term) ||
                String(item?.ID_CHAMADO_GLPI || "").toLowerCase().includes(term)
            );
        });
    }, [solicitacoes, busca]);

    const itensAbaixoMinimo = useMemo(() => {
        return itens.filter(
            (item) => Number(item?.QT_SALDO_ATUAL || 0) <= Number(item?.QT_SALDO_MINIMO || 0)
        ).length;
    }, [itens]);

    const retornosNegativos = useMemo(() => {
        return solicitacoes.filter((s) => s.ST_SOLICITACAO === "RETORNO_NEGATIVO").length;
    }, [solicitacoes]);

    function isAbaixoMinimo(item: any) {
        return Number(item?.QT_SALDO_ATUAL || 0) <= Number(item?.QT_SALDO_MINIMO || 0);
    }

    async function handleEntrada(idItem: number) {
        const quantidade = window.prompt("Informe a quantidade de entrada:");
        if (!quantidade) return;

        await lancarEntradaEstoque({
            idItem,
            quantidade: Number(quantidade),
            observacao: "Entrada manual via intranet",
            usuario: "monica.torres",
        });

        await carregarTudo();
    }

    function abrirModalBaixa(solicitacao: any) {
        setSolicitacaoSelecionada(solicitacao);
        setIdItemBaixa(solicitacao.ID_ITEM ? String(solicitacao.ID_ITEM) : "");
        setQuantidadeBaixa(String(solicitacao.QT_SOLICITADA || ""));
        setObservacaoBaixa("Baixa realizada via intranet");
        setModalBaixaAberta(true);
    }

    function fecharModalBaixa() {
        setModalBaixaAberta(false);
        setSolicitacaoSelecionada(null);
        setIdItemBaixa("");
        setQuantidadeBaixa("");
        setObservacaoBaixa("");
    }

    async function confirmarBaixa() {
        if (!solicitacaoSelecionada) return;

        if (!idItemBaixa || !quantidadeBaixa) {
            alert("Selecione o item e informe a quantidade.");
            return;
        }

        try {
            setSalvandoBaixa(true);

            await darBaixaSolicitacaoEstoque(solicitacaoSelecionada.ID_SOLICITACAO, {
                idItem: Number(idItemBaixa),
                quantidadeAtendida: Number(quantidadeBaixa),
                observacao: observacaoBaixa,
                usuarioAtendimento: "monica.torres",
            });

            fecharModalBaixa();
            await carregarTudo();
        } catch (error: any) {
            console.error("Erro ao dar baixa:", error);
            alert(error?.response?.data?.details || "Erro ao dar baixa na solicitação.");
        } finally {
            setSalvandoBaixa(false);
        }
    }

    async function handleSincronizarGlpi() {
        try {
            setLoading(true);

            const result = await sincronizarChamadosReaisGlpi();

            await carregarTudo();

            alert(
                `Chamados do GLPI sincronizados com sucesso.\n\n` +
                `Inseridos: ${result?.inseridos || 0}\n` +
                `Atualizados: ${result?.atualizados || 0}\n` +
                `Retornos negativos: ${result?.retornosNegativos || 0}`
            );
        } catch (error) {
            console.error("Erro ao sincronizar GLPI:", error);
            alert("Falha ao sincronizar chamados do GLPI.");
        } finally {
            setLoading(false);
        }
    }

    function abrirModalRespostaManual(solicitacao: any) {
        setSolicitacaoResposta(solicitacao);
        setIdItemBaixa(solicitacao.ID_ITEM ? String(solicitacao.ID_ITEM) : "");
        setQuantidadeBaixa(
            solicitacao.QT_ATENDIDA ? String(solicitacao.QT_ATENDIDA) : ""
        );
        setRespostaManual(solicitacao.DS_ULTIMA_RESPOSTA_MANUAL || "");
        setStatusGlpiResposta(
            solicitacao.NR_ULTIMO_STATUS_GLPI
                ? String(solicitacao.NR_ULTIMO_STATUS_GLPI)
                : "4"
        );
        setModalRespostaAberta(true);
    }

    function fecharModalRespostaManual() {
        setModalRespostaAberta(false);
        setSolicitacaoResposta(null);
        setRespostaManual("");
    }

    async function confirmarRespostaManual() {
        if (!solicitacaoResposta || !respostaManual.trim()) {
            alert("Informe a resposta.");
            return;
        }

        try {
            await responderManualSolicitacaoEstoque(solicitacaoResposta.ID_SOLICITACAO, {
                idItem: idItemBaixa ? Number(idItemBaixa) : null,
                quantidadeAtendida: quantidadeBaixa ? Number(quantidadeBaixa) : 0,
                resposta: respostaManual,
                usuarioAtendimento: "monica.torres",
                statusGlpi: Number(statusGlpiResposta),
            });

            fecharModalRespostaManual();
            await carregarTudo();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.details || "Erro ao enviar resposta manual.");
        }
    }

    function abrirModalProduto() {
        setNovoProduto({
            nome: "",
            descricao: "",
            unidade: "UNIDADE",
            saldoAtual: "",
            saldoMinimo: "",
        });
        setModalProdutoAberta(true);
    }

    function fecharModalProduto() {
        setModalProdutoAberta(false);
    }

    async function confirmarCadastroProduto() {
        if (!novoProduto.nome.trim()) {
            alert("Informe o nome do produto.");
            return;
        }

        if (!novoProduto.unidade.trim()) {
            alert("Informe a unidade.");
            return;
        }

        try {
            setSalvandoProduto(true);

            await criarItemEstoqueConsumiveis({
                nome: novoProduto.nome,
                descricao: novoProduto.descricao,
                unidade: novoProduto.unidade,
                saldoAtual: Number(novoProduto.saldoAtual || 0),
                saldoMinimo: Number(novoProduto.saldoMinimo || 0),
            });

            fecharModalProduto();
            await carregarTudo();
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.details || "Erro ao cadastrar produto.");
        } finally {
            setSalvandoProduto(false);
        }
    }

    function abrirModalRetornoNegativo(solicitacao: any) {
        setRetornoSelecionado(solicitacao);
        setModalRetornoAberta(true);
    }

    function fecharModalRetornoNegativo() {
        setModalRetornoAberta(false);
        setRetornoSelecionado(null);
    }

    function confirmarCorrigirAtendimento() {
        if (!retornoSelecionado) return;

        const solicitacao = retornoSelecionado;

        fecharModalRetornoNegativo();

        setSolicitacaoSelecionada(solicitacao);
        setIdItemBaixa(solicitacao.ID_ITEM ? String(solicitacao.ID_ITEM) : "");
        setQuantidadeBaixa("");
        setObservacaoBaixa(
            `Correção após retorno negativo do GLPI.\n\nRetorno do solicitante:\n${solicitacao.DS_ULTIMO_RETORNO_GLPI || ""}`
        );
        setModalBaixaAberta(true);
    }

    function abrirModalSaida(item: any) {
        setItemSaidaSelecionado(item);
        setQuantidadeSaida("");
        setNomeSolicitanteSaida("");
        setSetorSaida("");
        setObservacaoSaida("Saída registrada manualmente via intranet");
        setModalSaidaAberta(true);
    }

    function fecharModalSaida() {
        setModalSaidaAberta(false);
        setItemSaidaSelecionado(null);
    }

    async function confirmarSaida() {
        if (!itemSaidaSelecionado) return;

        if (!quantidadeSaida || !nomeSolicitanteSaida) {
            alert("Informe quantidade e solicitante.");
            return;
        }

        try {
            setSalvandoSaida(true);

            await registrarSaidaManualComGlpi({
                idItem: itemSaidaSelecionado.ID_ITEM,
                quantidade: Number(quantidadeSaida),
                nomeSolicitante: nomeSolicitanteSaida,
                nomeSetor: setorSaida,
                observacao: observacaoSaida,
                usuarioAtendimento: "monica.torres",
            });

            fecharModalSaida();
            await carregarTudo();

            alert("Saída registrada com sucesso e chamada criada no GLPI.");
        } catch (error: any) {
            console.error(error);
            alert(error?.response?.data?.details || "Erro ao registrar saída.");
        } finally {
            setSalvandoSaida(false);
        }
    }

    const balancoFiltrado = useMemo(() => {
        if (!produtoFiltro.trim()) return balanco;

        return balanco.filter((item) =>
            String(item.NM_ITEM || "")
                .toLowerCase()
                .includes(produtoFiltro.toLowerCase())
        );
    }, [balanco, produtoFiltro]);

    const totalEntradas = balancoFiltrado.reduce(
        (acc, item) => acc + Number(item.TOTAL_ENTRADAS || 0),
        0
    );

    const totalSaidas = balancoFiltrado.reduce(
        (acc, item) => acc + Number(item.TOTAL_SAIDAS || 0),
        0
    );

    const saldoTotal = balancoFiltrado.reduce(
        (acc, item) => acc + Number(item.QT_SALDO_ATUAL || 0),
        0
    );

    const itemMaisConsumido = [...balancoFiltrado].sort(
        (a, b) => Number(b.TOTAL_SAIDAS || 0) - Number(a.TOTAL_SAIDAS || 0)
    )[0];


    return (
        <div className="mx-auto w-full min-w-225 space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,157,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(121,183,41,0.16),_transparent_28%)]" />
                <div className="relative space-y-6 p-5 sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br from-[#00AE9D] to-[#79B729] text-white shadow-xl shadow-[#00AE9D]/20">
                                <FaWarehouse className="text-[26px]" />
                            </div>

                            <div>
                                <div className="inline-flex items-center rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#00AE9D]">
                                    GLPI • Estoque de Consumíveis
                                </div>
                                <h1 className="mt-2 text-3xl font-bold text-slate-800">
                                    Estoque de Consumíveis
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Controle integrado ao GLPI para solicitações, baixas e balanço mensal.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleSincronizarGlpi}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-[#009688]"
                            >
                                <FaSyncAlt />
                                Sincronizar GLPI
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-white/85 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Itens cadastrados
                            </p>
                            <h3 className="mt-2 text-3xl font-bold text-slate-800">{itens.length}</h3>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white/85 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Solicitações abertas
                            </p>
                            <h3 className="mt-2 text-3xl font-bold text-slate-800">
                                {solicitacoes.filter((s) =>
                                    ["ABERTA", "EM_ANALISE", "RETORNO_NEGATIVO"].includes(String(s.ST_SOLICITACAO))
                                ).length}
                            </h3>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white/85 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Atendidas no mês
                            </p>
                            <h3 className="mt-2 text-3xl font-bold text-slate-800">
                                {
                                    solicitacoes.filter((s) =>
                                        ["ATENDIDA", "ATENDIDA_PARCIAL"].includes(String(s.ST_SOLICITACAO))
                                    ).length
                                }
                            </h3>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white/85 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Retornos negativos
                            </p>
                            <h3 className={`mt-2 text-3xl font-bold ${retornosNegativos > 0 ? "text-red-600" : "text-slate-800"}`}>
                                {retornosNegativos}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setAbaAtiva("solicitacoes")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${abaAtiva === "solicitacoes"
                                ? "bg-[#00AE9D] text-white"
                                : "border border-slate-200 text-slate-600"
                                }`}
                        >
                            Solicitações GLPI
                        </button>

                        <button
                            onClick={() => setAbaAtiva("estoque")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${abaAtiva === "estoque"
                                ? "bg-[#00AE9D] text-white"
                                : "border border-slate-200 text-slate-600"
                                }`}
                        >
                            Estoque Atual
                        </button>

                        {/*<button
                            onClick={() => setAbaAtiva("balanco")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${abaAtiva === "balanco"
                                ? "bg-[#00AE9D] text-white"
                                : "border border-slate-200 text-slate-600"
                                }`}
                        >
                            Balanço Mensal
                        </button>*/}

                        <Link
                            href="/auth/balanco"
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#00AE9D] hover:text-white"
                        >
                            Balanço Mensal
                        </Link>

                        <button
                            onClick={() => setAbaAtiva("alertas")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${abaAtiva === "alertas"
                                ? "bg-[#00AE9D] text-white"
                                : "border border-slate-200 text-slate-600"
                                }`}
                        >
                            Alertas
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar..."
                                className="rounded-2xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#00AE9D]"
                            />
                        </div>

                        {abaAtiva === "estoque" && (
                            <>
                                <button
                                    onClick={abrirModalProduto}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-[#00AE9D] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-[#009688]"
                                >
                                    <FaPlus />
                                    Novo produto
                                </button>

                                <button
                                    onClick={abrirModalImportacao}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Importar Excel
                                </button>
                            </>
                        )}

                        {abaAtiva === "balanco" && (
                            <>
                                <input
                                    type="number"
                                    value={mes}
                                    onChange={(e) => setMes(Number(e.target.value))}
                                    className="w-24 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <input
                                    type="number"
                                    value={ano}
                                    onChange={(e) => setAno(Number(e.target.value))}
                                    className="w-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="p-5 sm:p-6">
                    {loading ? (
                        <div className="py-16 text-center text-slate-500">Carregando...</div>
                    ) : abaAtiva === "solicitacoes" ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-slate-600">
                                        <th className="px-4 py-3">Chamado GLPI</th>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Qtd. solicitada</th>
                                        <th className="px-4 py-3">Solicitante</th>
                                        <th className="px-4 py-3">Setor</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {solicitacoesFiltradas.map((item) => (
                                        <tr
                                            key={item.ID_SOLICITACAO}
                                            className={`border-t border-slate-100 ${item.ST_SOLICITACAO === "RETORNO_NEGATIVO" ? "bg-red-50/60" : ""
                                                }`}
                                        >
                                            <td className="px-4 py-3">{item.ID_CHAMADO_GLPI}</td>

                                            <td className="px-4 py-3 font-medium">
                                                {item.NM_ITEM_SOLICITADO}

                                                {/*{item.ST_SOLICITACAO === "RETORNO_NEGATIVO" && item.DS_ULTIMO_RETORNO_GLPI && (
                                                    <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                                        <strong>Retorno do GLPI:</strong> {item.DS_ULTIMO_RETORNO_GLPI}
                                                    </div>
                                                )}*/}
                                            </td>

                                            <td className="px-4 py-3">{item.QT_SOLICITADA}</td>
                                            <td className="px-4 py-3">{item.NM_SOLICITANTE || "-"}</td>
                                            <td className="px-4 py-3">{item.NM_SETOR || "-"}</td>

                                            <td className="px-4 py-3">
                                                {item.ST_SOLICITACAO === "RETORNO_NEGATIVO" ? (
                                                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                                        Retorno negativo GLPI
                                                    </span>
                                                ) : item.ST_SOLICITACAO === "ITEM_NAO_CADASTRADO" ? (
                                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                        Item não cadastrado
                                                    </span>
                                                ) : ["ATENDIDA", "ATENDIDA_PARCIAL", "RECUSADA"].includes(item.ST_SOLICITACAO) ? (
                                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                        {item.ST_SOLICITACAO === "ATENDIDA"
                                                            ? "Atendida"
                                                            : item.ST_SOLICITACAO === "RECUSADA"
                                                                ? "Recusada"
                                                                : "Atendida parcial"}
                                                    </span>
                                                ) : (
                                                    item.ST_SOLICITACAO
                                                )}
                                            </td>

                                            <td className="px-4 py-3 flex gap-2">
                                                {["ABERTA", "EM_ANALISE", "RETORNO_NEGATIVO"].includes(item.ST_SOLICITACAO) && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                item.ST_SOLICITACAO === "RETORNO_NEGATIVO"
                                                                    ? abrirModalRetornoNegativo(item)
                                                                    : abrirModalBaixa(item)
                                                            }
                                                            className={`rounded-2xl px-4 py-2 text-xs font-semibold text-white ${item.ST_SOLICITACAO === "RETORNO_NEGATIVO"
                                                                ? "bg-red-600 hover:bg-red-700"
                                                                : "bg-[#00AE9D] hover:bg-[#009688]"
                                                                }`}
                                                        >
                                                            {item.ST_SOLICITACAO === "RETORNO_NEGATIVO"
                                                                ? "Corrigir atendimento"
                                                                : item.ST_SOLICITACAO === "EM_ANALISE"
                                                                    ? "Responder chamado"
                                                                    : "Dar baixa"}
                                                        </button>

                                                        <button
                                                            onClick={() => abrirModalRespostaManual(item)}
                                                            className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white"
                                                        >
                                                            Resposta manual
                                                        </button>
                                                    </>
                                                )}

                                                {item.ST_SOLICITACAO === "ITEM_NAO_CADASTRADO" && (
                                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                        Item não cadastrado
                                                    </span>
                                                )}

                                                {["ATENDIDA", "ATENDIDA_PARCIAL", "RECUSADA"].includes(item.ST_SOLICITACAO) && (
                                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                        Finalizado
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : abaAtiva === "alertas" ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-left text-slate-600">
                                        <th className="px-4 py-3">Produto</th>
                                        <th className="px-4 py-3">Saldo no alerta</th>
                                        <th className="px-4 py-3">Mínimo no alerta</th>
                                        <th className="px-4 py-3">Saldo atual</th>
                                        <th className="px-4 py-3">Data alerta</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {alertas.map((item) => (
                                        <tr key={item.ID_ALERTA} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium">{item.NM_ITEM}</td>
                                            <td className="px-4 py-3">{item.QT_SALDO_ATUAL}</td>
                                            <td className="px-4 py-3">{item.QT_SALDO_MINIMO}</td>
                                            <td className="px-4 py-3">{item.QT_SALDO_ATUAL_AGORA ?? "-"}</td>
                                            <td className="px-4 py-3">
                                                {item.DT_ALERTA
                                                    ? new Date(item.DT_ALERTA).toLocaleString("pt-BR")
                                                    : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.ST_RESOLVIDO === "S" ? (
                                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                        Resolvido
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                                        Aberto
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : abaAtiva === "estoque" ? (
                        <div className="space-y-4">
                            {itensAbaixoMinimo > 0 && (
                                <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                                    <strong>Atenção:</strong> existem {itensAbaixoMinimo} produto(s) abaixo do estoque mínimo.
                                    Verifique os itens destacados em vermelho e realize a reposição quando necessário.
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-slate-600">
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3">Unidade</th>
                                            <th className="px-4 py-3">Saldo atual</th>
                                            <th className="px-4 py-3">Saldo mínimo</th>
                                            <th className="px-4 py-3">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itens.map((item) => (
                                            <tr
                                                key={item.ID_ITEM}
                                                className={`border-t border-slate-100 ${isAbaixoMinimo(item) ? "bg-red-50" : ""
                                                    }`}
                                            >
                                                <td className="px-4 py-3 font-medium">{item.NM_ITEM}</td>
                                                <td className="px-4 py-3">{item.DS_UNIDADE}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.QT_SALDO_ATUAL}</span>

                                                        {isAbaixoMinimo(item) && (
                                                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                                                Baixo estoque
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{item.QT_SALDO_MINIMO}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleEntrada(item.ID_ITEM)}
                                                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold ${isAbaixoMinimo(item)
                                                            ? "bg-red-500 text-white hover:bg-red-600"
                                                            : "border border-slate-200 text-slate-700"
                                                            }`}
                                                    >
                                                        <FaPlus />
                                                        Entrada
                                                    </button>
                                                    <button
                                                        onClick={() => abrirModalSaida(item)}
                                                        className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600"
                                                    >
                                                        Saída
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Balanço mensal
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Resumo de movimentações do estoque
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Visualize entradas, saídas, saldo atual e os produtos mais consumidos no período selecionado.
                                    </p>
                                </div>

                                <input
                                    value={produtoFiltro}
                                    onChange={(e) => setProdutoFiltro(e.target.value)}
                                    placeholder="Filtrar produto..."
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D] sm:w-72"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                        Total de entradas
                                    </p>
                                    <h3 className="mt-2 text-3xl font-bold text-emerald-700">{totalEntradas}</h3>
                                </div>

                                <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                                        Total de saídas
                                    </p>
                                    <h3 className="mt-2 text-3xl font-bold text-red-700">{totalSaidas}</h3>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Saldo total
                                    </p>
                                    <h3 className="mt-2 text-3xl font-bold text-slate-800">{saldoTotal}</h3>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Mais consumido
                                    </p>
                                    <h3 className="mt-2 truncate text-base font-bold text-slate-800">
                                        {itemMaisConsumido?.NM_ITEM || "-"}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {itemMaisConsumido?.TOTAL_SAIDAS
                                            ? `${itemMaisConsumido.TOTAL_SAIDAS} saída(s)`
                                            : "Sem consumo"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">
                                            Entradas x Saídas por produto
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Comparativo do período selecionado.
                                        </p>
                                    </div>
                                </div>

                                <div className="h-85">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={balancoFiltrado}>
                                            <XAxis dataKey="NM_ITEM" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="TOTAL_ENTRADAS" name="Entradas" />
                                            <Bar dataKey="TOTAL_SAIDAS" name="Saídas" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-slate-600">
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3">Unidade</th>
                                            <th className="px-4 py-3">Entradas</th>
                                            <th className="px-4 py-3">Saídas</th>
                                            <th className="px-4 py-3">Saldo atual</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {balancoFiltrado.map((item) => (
                                            <tr key={item.ID_ITEM} className="border-t border-slate-100">
                                                <td className="px-4 py-3 font-medium">{item.NM_ITEM}</td>
                                                <td className="px-4 py-3">{item.DS_UNIDADE}</td>
                                                <td className="px-4 py-3 font-semibold text-emerald-700">
                                                    {item.TOTAL_ENTRADAS}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-red-700">
                                                    {item.TOTAL_SAIDAS}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-800">
                                                    {item.QT_SALDO_ATUAL}
                                                </td>
                                            </tr>
                                        ))}

                                        {!balancoFiltrado.length && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                                    Nenhum dado encontrado para o filtro selecionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {modalBaixaAberta && solicitacaoSelecionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Baixa de estoque
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Atender solicitação GLPI #{solicitacaoSelecionada.ID_CHAMADO_GLPI}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Confirme o item, a quantidade atendida e registre a movimentação no estoque.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalBaixa}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Item solicitado
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoSelecionada.NM_ITEM_SOLICITADO}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Quantidade solicitada
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoSelecionada.QT_SOLICITADA}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Solicitante
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoSelecionada.NM_SOLICITANTE || "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Status atual
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoSelecionada.ST_SOLICITACAO}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Item do estoque
                                    </label>
                                    <select
                                        value={idItemBaixa}
                                        onChange={(e) => setIdItemBaixa(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    >
                                        <option value="">Selecione o item</option>
                                        {itens.map((item) => (
                                            <option key={item.ID_ITEM} value={item.ID_ITEM}>
                                                {item.NM_ITEM} — saldo: {item.QT_SALDO_ATUAL} {item.DS_UNIDADE}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Quantidade atendida
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={quantidadeBaixa}
                                        onChange={(e) => setQuantidadeBaixa(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Observação
                                </label>
                                <textarea
                                    value={observacaoBaixa}
                                    onChange={(e) => setObservacaoBaixa(e.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalBaixa}
                                    disabled={salvandoBaixa}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarBaixa}
                                    disabled={salvandoBaixa}
                                    className="rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-[#009688] disabled:opacity-60"
                                >
                                    {salvandoBaixa ? "Salvando..." : "Confirmar baixa"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalRespostaAberta && solicitacaoResposta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-amber-500/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                                        Resposta manual
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Responder solicitação GLPI #{solicitacaoResposta.ID_CHAMADO_GLPI}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Use esta opção para informar atendimento parcial, indisponibilidade ou orientação ao solicitante.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalRespostaManual}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Item solicitado
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoResposta.NM_ITEM_SOLICITADO}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Quantidade solicitada
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoResposta.QT_SOLICITADA}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Solicitante
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoResposta.NM_SOLICITANTE || "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Status atual
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {solicitacaoResposta.ST_SOLICITACAO}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Item do estoque
                                    </label>
                                    <select
                                        value={idItemBaixa}
                                        onChange={(e) => setIdItemBaixa(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                                    >
                                        <option value="">Selecione o item</option>
                                        {itens.map((item) => (
                                            <option key={item.ID_ITEM} value={item.ID_ITEM}>
                                                {item.NM_ITEM} — saldo: {item.QT_SALDO_ATUAL} {item.DS_UNIDADE}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Quantidade atendida
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={quantidadeBaixa}
                                        onChange={(e) => setQuantidadeBaixa(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                                        placeholder="Ex: 5"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Status no GLPI
                                    </label>

                                    <select
                                        value={statusGlpiResposta}
                                        onChange={(e) => setStatusGlpiResposta(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                                    >
                                        <option value="4">Pendente</option>
                                        <option value="5">Solucionado</option>
                                        <option value="6">Fechado</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Resposta ao chamado
                                </label>
                                <textarea
                                    value={respostaManual}
                                    onChange={(e) => setRespostaManual(e.target.value)}
                                    rows={5}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                                    placeholder="Ex: Solicitação atendida parcialmente. No momento temos apenas 5 unidades disponíveis em estoque."
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalRespostaManual}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarRespostaManual}
                                    className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600"
                                >
                                    Enviar resposta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {modalProdutoAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Cadastro de produto
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Novo produto de estoque
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Cadastre manualmente um novo item para controle de saldo e baixas.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalProduto}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Nome do produto
                                    </label>
                                    <input
                                        value={novoProduto.nome}
                                        onChange={(e) =>
                                            setNovoProduto((prev) => ({ ...prev, nome: e.target.value }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                        placeholder="Ex: Caneta azul"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Unidade
                                    </label>
                                    <select
                                        value={novoProduto.unidade}
                                        onChange={(e) =>
                                            setNovoProduto((prev) => ({ ...prev, unidade: e.target.value }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    >
                                        {UNIDADES_ESTOQUE.map((unidade) => (
                                            <option key={unidade.value} value={unidade.value}>
                                                {unidade.label}
                                            </option>
                                        ))}
                                    </select>

                                    <p className="mt-2 text-xs text-slate-500">
                                        Informe como esse produto será controlado no estoque. Ex: café pode ser controlado por pacote, caneta por unidade.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Saldo atual
                                    </label>
                                    <input
                                        type="number"
                                        value={novoProduto.saldoAtual}
                                        onChange={(e) =>
                                            setNovoProduto((prev) => ({ ...prev, saldoAtual: e.target.value }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Saldo mínimo
                                    </label>
                                    <input
                                        type="number"
                                        value={novoProduto.saldoMinimo}
                                        onChange={(e) =>
                                            setNovoProduto((prev) => ({ ...prev, saldoMinimo: e.target.value }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Descrição
                                </label>
                                <textarea
                                    value={novoProduto.descricao}
                                    onChange={(e) =>
                                        setNovoProduto((prev) => ({ ...prev, descricao: e.target.value }))
                                    }
                                    rows={4}
                                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                                    placeholder="Descrição do produto..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={fecharModalProduto}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarCadastroProduto}
                                    disabled={salvandoProduto}
                                    className="rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 disabled:opacity-60"
                                >
                                    {salvandoProduto ? "Salvando..." : "Cadastrar produto"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalImportacaoAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                                        Importação em massa
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Importar produtos via Excel
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Envie uma planilha com os produtos para cadastro automático no estoque.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalImportacao}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Arquivo Excel
                                </label>

                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setArquivoExcel(e.target.files?.[0] || null)}
                                    className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                                />

                                <p className="mt-3 text-xs text-slate-500">
                                    Colunas esperadas: <strong>nome</strong>, <strong>unidade</strong>,{" "}
                                    <strong>descricao</strong>, <strong>saldoAtual</strong> e{" "}
                                    <strong>saldoMinimo</strong>.
                                </p>
                            </div>

                            {arquivoExcel && (
                                <div className="rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 px-4 py-3 text-sm text-slate-700">
                                    Arquivo selecionado: <strong>{arquivoExcel.name}</strong>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={fecharModalImportacao}
                                    disabled={importandoExcel}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarImportacaoExcel}
                                    disabled={importandoExcel}
                                    className="rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 disabled:opacity-60"
                                >
                                    {importandoExcel ? "Importando..." : "Importar planilha"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalRetornoAberta && retornoSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-2xl">
                        <div className="bg-linear-to-r from-red-100 via-white to-red-50 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                                        Retorno negativo do GLPI
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Chamado GLPI #{retornoSelecionado.ID_CHAMADO_GLPI}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        O solicitante retornou o chamado no GLPI. Confira a mensagem antes de corrigir o atendimento.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalRetornoNegativo}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-4 rounded-3xl border border-red-200 bg-red-50/70 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
                                        Item solicitado
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {retornoSelecionado.NM_ITEM_SOLICITADO}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
                                        Quantidade solicitada
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {retornoSelecionado.QT_SOLICITADA}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
                                        Solicitante
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {retornoSelecionado.NM_SOLICITANTE || "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
                                        Status
                                    </p>
                                    <p className="mt-1 font-semibold text-red-700">
                                        Retorno negativo GLPI
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                                    Mensagem retornada no GLPI
                                </p>

                                <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-red-700">
                                    {retornoSelecionado.DS_ULTIMO_RETORNO_GLPI || "Chamado retornado/reaberto no GLPI."}
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalRetornoNegativo}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarCorrigirAtendimento}
                                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700"
                                >
                                    Continuar correção
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {modalSaidaAberta && itemSaidaSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">

                        <div className="bg-linear-to-r from-red-500/10 via-white to-orange-400/10 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
                                        Saída manual
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                        Registrar saída com GLPI
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Essa ação irá registrar a saída no estoque e criar automaticamente um chamado no GLPI.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharModalSaida}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </div>
                        </div>


                        <div className="space-y-5 p-6">

                            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Item selecionado
                                    </p>
                                    <p className="mt-1 font-bold text-slate-800">
                                        {itemSaidaSelecionado.NM_ITEM}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Saldo atual
                                    </p>
                                    <p className="mt-1 font-bold text-slate-800">
                                        {itemSaidaSelecionado.QT_SALDO_ATUAL} {itemSaidaSelecionado.DS_UNIDADE}
                                    </p>
                                </div>
                            </div>

                            {/* CAMPOS */}
                            <div className="grid gap-4 sm:grid-cols-2">

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Quantidade
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantidadeSaida}
                                        onChange={(e) => setQuantidadeSaida(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                        placeholder="Ex: 2"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Nome do solicitante
                                    </label>
                                    <input
                                        value={nomeSolicitanteSaida}
                                        onChange={(e) => setNomeSolicitanteSaida(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Setor
                                    </label>
                                    <input
                                        value={setorSaida}
                                        onChange={(e) => setSetorSaida(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                        placeholder="Ex: Financeiro"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Observação
                                </label>
                                <textarea
                                    value={observacaoSaida}
                                    onChange={(e) => setObservacaoSaida(e.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                    placeholder="Descreva o motivo da saída..."
                                />
                            </div>

                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                Essa ação irá:
                                <ul className="mt-2 list-disc pl-5 text-xs">
                                    <li>Registrar saída no estoque</li>
                                    <li>Criar chamado no GLPI</li>
                                    <li>Dar baixa automaticamente</li>
                                    <li>Finalizar o chamado</li>
                                </ul>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={fecharModalSaida}
                                    disabled={salvandoSaida}
                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={confirmarSaida}
                                    disabled={salvandoSaida}
                                    className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-60"
                                >
                                    {salvandoSaida ? "Registrando..." : "Confirmar saída"}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}