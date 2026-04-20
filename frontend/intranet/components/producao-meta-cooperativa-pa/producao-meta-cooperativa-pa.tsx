"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
    FaCalendarAlt,
    FaChartLine,
    FaDatabase,
    FaFilter,
    FaInfoCircle,
    FaLayerGroup,
} from "react-icons/fa";
import {
    buscarDatasRelatorioMetaPA,
    buscarProducaoMetaRelatorioPA,
    buscarUltimaAtualizacaoMetaPA,
} from "@/services/producao_meta_cooperativa_pa.service";
import {
    CAMPOS_COLORIR,
    MAPA_TEMA_PARA_TABELA,
    TEMAS_SOMENTE_ANO,
    TIPOS_RELATORIO_OPTIONS,
    getConfigAjustadaPorPeriodo,
    parseNumeroBR,
    type ChaveRelatorioPA,
    type ModoPeriodoPA,
    type RelatorioDataInfo,
    type RelatorioItem,
} from "@/config/producao_meta_cooperativa_pa";

function inicioDoDia(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatarISO(d: Date) {
    return d.toISOString().split("T")[0];
}

function formatarBR(d: Date) {
    return d.toLocaleDateString("pt-BR");
}

function formatarDataHoraBR(valor?: string | Date | null) {
    if (!valor) return "-";

    const dt =
        valor instanceof Date ? valor : new Date(String(valor).replace(" ", "T"));

    if (Number.isNaN(dt.getTime())) return String(valor);

    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, "0");
    const min = String(dt.getMinutes()).padStart(2, "0");

    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function aplicarClasseCor(campo: string, valorOriginal: unknown) {
    if (!CAMPOS_COLORIR.has(campo)) return "";

    const n = parseNumeroBR(valorOriginal);
    if (Number.isNaN(n)) return "";

    return n <= 0
        ? "text-red-600 bg-red-50/60"
        : "text-emerald-700 bg-emerald-50/60";
}

function getSemanasDoMes(ano: number, mesIndex: number) {
    const semanas: { inicio: Date; fim: Date }[] = [];

    const mesInicio = new Date(ano, mesIndex, 1);
    const mesFim = new Date(ano, mesIndex + 1, 0);

    let cursor = new Date(mesInicio);

    while (cursor <= mesFim) {
        if (cursor.getDay() === 0 || cursor.getDay() === 6) {
            cursor.setDate(cursor.getDate() + 1);
            continue;
        }

        const inicioSemana = new Date(cursor);
        let fimSemana = new Date(cursor);

        while (fimSemana.getDay() !== 5 && fimSemana <= mesFim) {
            fimSemana.setDate(fimSemana.getDate() + 1);

            if (fimSemana.getDay() === 6) {
                fimSemana.setDate(fimSemana.getDate() - 1);
                break;
            }
        }

        semanas.push({
            inicio: new Date(inicioSemana),
            fim: new Date(fimSemana),
        });

        cursor = new Date(fimSemana);
        cursor.setDate(cursor.getDate() + 1);
    }

    return semanas;
}

function gerarMesesAteAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    const nomesMes = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];

    return Array.from({ length: mesAtual + 1 }, (_, index) => ({
        value: String(index),
        label: `${nomesMes[index]} / ${ano}`,
    }));
}

type PeriodoOption = {
    value: string;
    label: string;
    tipo: "semana" | "mes_inteiro";
};

function gerarSemanasDoMes(mesIndex: number): PeriodoOption[] {
    const hoje = new Date();
    const ano = hoje.getFullYear();

    const semanas = getSemanasDoMes(ano, mesIndex);
    const ehMesAtual = ano === hoje.getFullYear() && mesIndex === hoje.getMonth();

    const semanasFiltradas = ehMesAtual
        ? semanas.filter((w) => w.inicio <= inicioDoDia(hoje))
        : semanas;

    const listaFinal = semanasFiltradas.length ? semanasFiltradas : semanas.slice(0, 1);

    const options: PeriodoOption[] = listaFinal.map((w, idx) => ({
        value: `${formatarISO(w.inicio)}|${formatarISO(w.fim)}`,
        label: `Semana ${idx + 1} (${formatarBR(w.inicio)} à ${formatarBR(w.fim)})`,
        tipo: "semana",
    }));

    const inicioMes = new Date(ano, mesIndex, 1);
    const fimMes = new Date(ano, mesIndex + 1, 0);
    const fimEfetivo = ehMesAtual ? inicioDoDia(hoje) : fimMes;

    options.push({
        value: `${formatarISO(inicioMes)}|${formatarISO(fimEfetivo)}`,
        label: `Mês inteiro (${formatarBR(inicioMes)} à ${formatarBR(fimEfetivo)})`,
        tipo: "mes_inteiro",
    });

    return options;
}

function gerarOpcaoProducaoAno() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const inicioAno = new Date(ano, 0, 1);

    return {
        value: `${formatarISO(inicioAno)}|${formatarISO(inicioDoDia(hoje))}`,
        label: "Produção Ano",
        tipo: "producao_total" as const,
    };
}

export function ProducaoMetaCooperativaPAForm() {
    const [tema, setTema] = useState<ChaveRelatorioPA | "">("");
    const [mesSelecionado, setMesSelecionado] = useState("");
    const [periodoSelecionado, setPeriodoSelecionado] = useState("");
    const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodoPA>("semana");

    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState<RelatorioItem[]>([]);
    const [erro, setErro] = useState("");

    const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");
    const [infoTema, setInfoTema] = useState<RelatorioDataInfo | null>(null);

    const mesesOptions = useMemo(() => gerarMesesAteAtual(), []);
    const opcaoProducaoAno = useMemo(() => gerarOpcaoProducaoAno(), []);

    const semanasOptions = useMemo(() => {
        if (!mesSelecionado || mesSelecionado === "__ANO__") return [];
        return gerarSemanasDoMes(Number(mesSelecionado));
    }, [mesSelecionado]);

    const configAtual = useMemo(() => {
        if (!tema) return null;
        return getConfigAjustadaPorPeriodo(tema, modoPeriodo);
    }, [tema, modoPeriodo]);

    const temaLabel = useMemo(() => {
        return TIPOS_RELATORIO_OPTIONS.flatMap((grupo) => grupo.options).find(
            (item) => item.value === tema
        )?.label;
    }, [tema]);

    async function carregarUltimaAtualizacao() {
        try {
            const lista = await buscarUltimaAtualizacaoMetaPA();

            if (!Array.isArray(lista) || !lista.length) {
                setUltimaAtualizacao("-");
                return;
            }

            const datasValidas = lista
                .flatMap((item) => [item?.dt_carga, item?.dt_movimento])
                .filter(Boolean)
                .map((valor) => new Date(String(valor).replace(" ", "T")))
                .filter((dt) => !Number.isNaN(dt.getTime()));

            if (!datasValidas.length) {
                setUltimaAtualizacao("-");
                return;
            }

            const maisRecente = new Date(
                Math.max(...datasValidas.map((dt) => dt.getTime()))
            );

            setUltimaAtualizacao(formatarDataHoraBR(maisRecente));
        } catch {
            setUltimaAtualizacao("-");
        }
    }
    async function carregarInfoTema(chaveTema: ChaveRelatorioPA) {
        try {
            const nmTabela = MAPA_TEMA_PARA_TABELA[chaveTema];
            if (!nmTabela) {
                setInfoTema(null);
                return;
            }

            const lista = await buscarDatasRelatorioMetaPA();
            const item = Array.isArray(lista)
                ? lista.find((row) => row?.nm_tabela === nmTabela)
                : null;

            setInfoTema(item ?? null);
        } catch {
            setInfoTema(null);
        }
    }

    async function carregarRelatorio(params?: {
        temaAtual?: ChaveRelatorioPA;
        periodoAtual?: string;
        modoAtual?: ModoPeriodoPA;
    }) {
        const temaBusca = params?.temaAtual ?? tema;
        const periodoBusca = params?.periodoAtual ?? periodoSelecionado;
        const modoBusca = params?.modoAtual ?? modoPeriodo;

        if (!temaBusca || !periodoBusca) {
            setDados([]);
            return;
        }

        try {
            setLoading(true);
            setErro("");

            const resp = await buscarProducaoMetaRelatorioPA({
                tema: temaBusca,
                periodo: periodoBusca,
            });

            const lista = Array.isArray(resp) ? resp : resp ? [resp] : [];

            const ordenado = [...lista].sort((a, b) => {
                const na = Number(a?.numero_pa ?? a?.nr_pa ?? 0);
                const nb = Number(b?.numero_pa ?? b?.nr_pa ?? 0);

                if (na === 4317 && nb !== 4317) return -1;
                if (nb === 4317 && na !== 4317) return 1;

                return na - nb;
            });

            setModoPeriodo(modoBusca);
            setDados(ordenado);
        } catch (error) {
            console.error(error);
            setErro("Não foi possível carregar o relatório.");
            setDados([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarUltimaAtualizacao();
    }, []);

    useEffect(() => {
        if (!tema) {
            setInfoTema(null);
            return;
        }

        carregarInfoTema(tema);
    }, [tema]);

    async function handleChangeTema(value: string) {
        const novoTema = value as ChaveRelatorioPA | "";

        setTema(novoTema);
        setDados([]);
        setErro("");
        setMesSelecionado("");
        setPeriodoSelecionado("");
        setModoPeriodo("semana");

        if (!novoTema) return;

        if (TEMAS_SOMENTE_ANO.has(novoTema)) {
            const valorAno = opcaoProducaoAno.value;
            setPeriodoSelecionado(valorAno);
            setModoPeriodo("ano");

            await carregarRelatorio({
                temaAtual: novoTema,
                periodoAtual: valorAno,
                modoAtual: "ano",
            });
        }
    }

    function handleChangeMes(value: string) {
        setMesSelecionado(value);
        setDados([]);
        setErro("");

        if (!value) {
            setPeriodoSelecionado("");
            return;
        }

        if (value === "__ANO__") {
            setPeriodoSelecionado(opcaoProducaoAno.value);
            setModoPeriodo("ano");
            if (tema) {
                carregarRelatorio({
                    temaAtual: tema,
                    periodoAtual: opcaoProducaoAno.value,
                    modoAtual: "ano",
                });
            }
            return;
        }

        setPeriodoSelecionado("");
    }

    async function handleChangePeriodo(value: string) {
        setPeriodoSelecionado(value);

        if (!tema || !value) {
            setDados([]);
            return;
        }

        const opt = semanasOptions.find((item) => item.value === value);

        const novoModo: ModoPeriodoPA =
            opt?.tipo === "mes_inteiro"
                ? "mes"
                : opt?.tipo === "semana"
                    ? "semana"
                    : "ano";

        setModoPeriodo(novoModo);

        await carregarRelatorio({
            temaAtual: tema,
            periodoAtual: value,
            modoAtual: novoModo,
        });
    }

    const avisoTema =
        tema === "consorcio"
            ? "Este relatório de consórcio possui atualização mensal."
            : "";

    const mostrarMes = !!tema && !TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA);
    const mostrarPeriodo =
        !!tema &&
        (TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA) ||
            (!!mesSelecionado && mesSelecionado !== "__ANO__"));

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                <div className="border-b border-gray-100 bg-[linear-gradient(135deg,#f8fffa_0%,#ffffff_45%,#f5fbff_100%)] p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C7D300]/40 bg-[#C7D300]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E6B00]">
                                Painel analítico por PA
                            </div>

                            <h2 className="text-xl font-semibold text-gray-900">
                                Filtros de consulta
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Selecione o tipo de relatório e o período desejado para visualizar
                                os indicadores consolidados de produção e meta por ponto de atendimento.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                    <FaDatabase />
                                    Última atualização
                                </div>
                                <p className="text-sm font-semibold text-emerald-900">
                                    {ultimaAtualizacao}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <FaLayerGroup />
                                    Relatório
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {temaLabel || "Nenhum selecionado"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <FaFilter className="text-[#79B729]" />
                                Tipo de relatório
                            </label>

                            <select
                                value={tema}
                                onChange={(e) => handleChangeTema(e.target.value)}
                                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm outline-none transition-all focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                            >
                                <option value="">Selecione</option>

                                {TIPOS_RELATORIO_OPTIONS.map((grupo) => (
                                    <optgroup key={grupo.label} label={grupo.label}>
                                        {grupo.options.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <FaCalendarAlt className="text-[#00AE9D]" />
                                Mês
                            </label>

                            <select
                                value={mesSelecionado}
                                onChange={(e) => handleChangeMes(e.target.value)}
                                disabled={!mostrarMes}
                                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                            >
                                <option value="">Selecione o mês</option>

                                {mesesOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}

                                <option value="__ANO__">{opcaoProducaoAno.label}</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                <FaChartLine className="text-[#C7D300]" />
                                Semana / período
                            </label>

                            <select
                                value={
                                    TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA)
                                        ? opcaoProducaoAno.value
                                        : periodoSelecionado
                                }
                                onChange={(e) => {
                                    if (TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA)) return;
                                    handleChangePeriodo(e.target.value);
                                }}
                                disabled={!mostrarPeriodo || TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA)}
                                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                            >
                                {!TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA) && (
                                    <option value="">Selecione a semana</option>
                                )}

                                {TEMAS_SOMENTE_ANO.has(tema as ChaveRelatorioPA) ? (
                                    <option value={opcaoProducaoAno.value}>
                                        {opcaoProducaoAno.label}
                                    </option>
                                ) : (
                                    semanasOptions.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    {(infoTema || avisoTema) && (
                        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <FaDatabase className="text-[#00AE9D]" />
                                    Informações do relatório
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            Data de inserção no banco
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-gray-800">
                                            {formatarDataHoraBR(infoTema?.dt_carga)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            Data do Sisbr Analítico
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-gray-800">
                                            {formatarDataHoraBR(infoTema?.dt_movimento)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                                    <FaInfoCircle />
                                    Observação
                                </div>
                                <p className="text-sm text-amber-800">
                                    {avisoTema || "Os dados exibidos variam conforme o relatório e o período selecionados."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Resultado consolidado
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                            Visualização dinâmica dos dados conforme o relatório selecionado.
                        </p>
                    </div>

                    {temaLabel && (
                        <div className="inline-flex w-fit items-center rounded-full border border-[#00AE9D]/20 bg-[#00AE9D]/10 px-3 py-1 text-xs font-semibold text-[#00796B]">
                            {temaLabel}
                        </div>
                    )}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                            Carregando relatório...
                        </div>
                    ) : erro ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 text-center text-sm text-red-700">
                            {erro}
                        </div>
                    ) : !tema ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-500">
                            Selecione um tipo de relatório para iniciar a consulta.
                        </div>
                    ) : !dados.length ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-500">
                            Sem dados para exibir.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                                            {configAtual?.colunas.map((coluna, index) => (
                                                <th
                                                    key={`${coluna}-${index}`}
                                                    className={`border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 ${index <= 1 ? "text-left" : "text-center"
                                                        }`}
                                                >
                                                    {coluna}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {dados.map((item, rowIndex) => {
                                            const isTotal = Number(item?.numero_pa ?? item?.nr_pa) === 4317;

                                            return (
                                                <tr
                                                    key={`${item?.numero_pa ?? item?.nr_pa ?? rowIndex}-${rowIndex}`}
                                                    className={`transition ${isTotal
                                                            ? "bg-[#79B729]/10"
                                                            : rowIndex % 2 === 0
                                                                ? "bg-white"
                                                                : "bg-slate-50/50"
                                                        } hover:bg-[#00AE9D]/[0.04]`}
                                                >
                                                    {configAtual?.campos.map((campo, index) => {
                                                        const valor = item?.[campo] ?? "-";
                                                        const corClasse = aplicarClasseCor(campo, valor);

                                                        return (
                                                            <td
                                                                key={`${campo}-${index}-${rowIndex}`}
                                                                className={`border-b border-gray-100 px-4 py-3 text-sm ${index <= 1 ? "text-left" : "text-center"
                                                                    } ${isTotal
                                                                        ? "font-semibold text-gray-900"
                                                                        : "text-gray-700"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block rounded-lg px-2 py-1 ${corClasse || ""
                                                                        }`}
                                                                >
                                                                    {String(valor)}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}