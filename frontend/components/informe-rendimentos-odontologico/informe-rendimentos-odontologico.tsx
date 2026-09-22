"use client";

import {
    Fragment,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    Printer,
    Search,
    Upload,
    Users,
    WalletCards,
} from "lucide-react";
import {
    buscarInformeConsolidado,
    importarInformeOdontologico,
    type InformeConsolidadoResponse,
    type InformeFamilia,
} from "@/services/convenio_odontologico.service";
import { gerarPdfInformeOdontologico } from "@/lib/pdf/gerarPdfInformeOdontologico";

const MESES = [
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

export default function InformeRendimentosOdontologico() {
    const anoAtual =
        new Date().getFullYear();

    const [
        anoCalendario,
        setAnoCalendario,
    ] = useState(
        anoAtual - 1
    );

    const [
        dados,
        setDados,
    ] =
        useState<InformeConsolidadoResponse | null>(
            null
        );

    const [
        carregando,
        setCarregando,
    ] = useState(false);

    const [
        erro,
        setErro,
    ] =
        useState<string | null>(
            null
        );

    const [
        sucessoImportacao,
        setSucessoImportacao,
    ] = useState("");

    const [
        mesImportacao,
        setMesImportacao,
    ] = useState(1);

    const [
        arquivoImportacao,
        setArquivoImportacao,
    ] =
        useState<File | null>(
            null
        );

    const [
        importando,
        setImportando,
    ] = useState(false);

    const [
        fileInputKey,
        setFileInputKey,
    ] = useState(0);


    const [
        pesquisa,
        setPesquisa,
    ] = useState("");

    const [
        pagina,
        setPagina,
    ] = useState(1);

    const [
        limitePorPagina,
        setLimitePorPagina,
    ] = useState(10);

    const [
        familiaAberta,
        setFamiliaAberta,
    ] =
        useState<string | null>(
            null
        );

    const [
        gerandoCpf,
        setGerandoCpf,
    ] =
        useState<string | null>(
            null
        );

    const anosDisponiveis =
        useMemo(() => {
            const inicio =
                anoAtual - 5;

            return Array.from(
                {
                    length: 7,
                },
                (_, index) =>
                    inicio + index
            ).reverse();
        }, [anoAtual]);

    async function carregar() {
        try {
            setCarregando(
                true
            );

            setErro(
                null
            );

            const resposta =
                await buscarInformeConsolidado(
                    anoCalendario
                );

            setDados(
                resposta
            );
        } catch (
        error: any
        ) {
            console.error(
                "Erro ao carregar informe consolidado:",
                error
            );

            setDados(
                null
            );

            setErro(
                error?.response
                    ?.data
                    ?.error ||
                error?.response
                    ?.data
                    ?.details ||
                "Não foi possível carregar os informes odontológicos."
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    useEffect(() => {
        carregar();
    }, [
        anoCalendario,
    ]);

    async function importarArquivo() {
        if (
            !arquivoImportacao
        ) {
            setErro(
                "Selecione o arquivo CSV."
            );

            return;
        }

        const nomeArquivo =
            arquivoImportacao
                .name
                .toLowerCase();

        if (
            !nomeArquivo.endsWith(
                ".csv"
            )
        ) {
            setErro(
                "Selecione um arquivo no formato CSV."
            );

            return;
        }

        try {
            setImportando(
                true
            );

            setErro(
                null
            );

            setSucessoImportacao(
                ""
            );

            const resposta =
                await importarInformeOdontologico(
                    anoCalendario,
                    mesImportacao,
                    arquivoImportacao
                );

            const quantidade =
                Number(
                    resposta
                        ?.totalRegistros ??
                    resposta
                        ?.nrTotalRegistros ??
                    resposta
                        ?.registrosImportados ??
                    0
                );

            const mesNome =
                MESES[
                mesImportacao -
                1
                ];

            if (
                quantidade >
                0
            ) {
                setSucessoImportacao(
                    `${mesNome}/${anoCalendario} importado com sucesso. ${quantidade} registros processados.`
                );
            } else {
                setSucessoImportacao(
                    resposta?.message ||
                    `${mesNome}/${anoCalendario} importado com sucesso.`
                );
            }

            setArquivoImportacao(
                null
            );

            setFileInputKey(
                (
                    atual
                ) =>
                    atual +
                    1
            );

            await carregar();
        } catch (
        error: any
        ) {
            console.error(
                "Erro ao importar CSV:",
                error
            );

            setErro(
                error?.response
                    ?.data
                    ?.error ||
                error?.response
                    ?.data
                    ?.details ||
                error
                    ?.message ||
                "Não foi possível importar o arquivo."
            );
        } finally {
            setImportando(
                false
            );
        }
    }

    const familiasFiltradas =
        useMemo(() => {
            const familias =
                dados
                    ?.familias ||
                [];

            const filtro =
                pesquisa
                    .trim()
                    .toUpperCase();

            if (
                !filtro
            ) {
                return familias;
            }

            const somenteNumeros =
                filtro.replace(
                    /\D/g,
                    ""
                );

            return familias.filter(
                (
                    familia
                ) => {
                    const nome =
                        String(
                            familia
                                .nomeTitular ||
                            ""
                        ).toUpperCase();

                    const cpf =
                        String(
                            familia
                                .cpfTitular ||
                            ""
                        ).replace(
                            /\D/g,
                            ""
                        );

                    const matricula =
                        String(
                            familia
                                .matricula ||
                            ""
                        ).toUpperCase();

                    return (
                        nome.includes(
                            filtro
                        ) ||
                        matricula.includes(
                            filtro
                        ) ||
                        (
                            somenteNumeros &&
                            cpf.includes(
                                somenteNumeros
                            )
                        )
                    );
                }
            );
        }, [
            dados,
            pesquisa,
        ]);

    const totalFamiliasFiltradas =
        familiasFiltradas.length;

    const totalPaginas =
        Math.max(
            Math.ceil(
                totalFamiliasFiltradas /
                limitePorPagina
            ),
            1
        );

    const familiasPaginadas =
        useMemo(() => {
            const inicio =
                (pagina - 1) *
                limitePorPagina;

            const fim =
                inicio +
                limitePorPagina;

            return familiasFiltradas.slice(
                inicio,
                fim
            );
        }, [
            familiasFiltradas,
            pagina,
            limitePorPagina,
        ]);

    const primeiroRegistro =
        totalFamiliasFiltradas === 0
            ? 0
            : (pagina - 1) *
            limitePorPagina +
            1;

    const ultimoRegistro =
        Math.min(
            pagina *
            limitePorPagina,
            totalFamiliasFiltradas
        );

    const competenciasMap =
        useMemo(() => {
            const map =
                new Map<
                    number,
                    any
                >();

            for (
                const item of
                dados
                    ?.competencias ||
                []
            ) {
                const mes =
                    Number(
                        item
                            .MES_REFERENCIA
                    );

                if (
                    mes
                ) {
                    map.set(
                        mes,
                        item
                    );
                }
            }

            return map;
        }, [dados]);

    const competenciaSelecionadaJaImportada =
        competenciasMap.has(
            mesImportacao
        );

    const totalCompetenciasImportadas =
        Number(
            dados?.totalCompetencias || 0
        );

    const informeDisponivel =
        totalCompetenciasImportadas === 12;

    const competenciasPendentes =
        Math.max(
            12 -
            totalCompetenciasImportadas,
            0
        );

    function formatarCpf(
        valor?:
            | string
            | null
    ) {
        const cpf =
            String(
                valor ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            cpf.length !==
            11
        ) {
            return (
                valor ||
                "—"
            );
        }

        return `${cpf.slice(
            0,
            3
        )}.${cpf.slice(
            3,
            6
        )}.${cpf.slice(
            6,
            9
        )}-${cpf.slice(
            9
        )}`;
    }

    function formatarMoeda(
        valor?:
            | number
            | null
    ) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",
                currency:
                    "BRL",
            }
        );
    }

    function chaveFamilia(
        familia: InformeFamilia
    ) {
        return String(
            familia
                .matricula ||
            familia
                .cpfTitular
        );
    }

    async function gerarPdf(
        familia: InformeFamilia
    ) {
        if (!informeDisponivel) {
            setErro(
                `O Informe de Rendimentos de ${anoCalendario} ainda não está disponível. É necessário importar as 12 competências do ano.`
            );

            return;
        }

        try {
            setErro(
                null
            );

            setGerandoCpf(
                familia
                    .cpfTitular
            );

            await gerarPdfInformeOdontologico(
                {
                    anoCalendario,

                    cpfTitular:
                        familia
                            .cpfTitular,

                    nomeTitular:
                        familia
                            .nomeTitular,

                    valorProprioTitular:
                        familia
                            .valorProprioTitular,

                    valorTotalFamilia:
                        familia
                            .valorTotalFamilia,

                    dependentes:
                        familia
                            .dependentes
                            .map(
                                (
                                    dependente
                                ) => ({
                                    cpf:
                                        dependente
                                            .cpf,

                                    nome:
                                        dependente
                                            .nome,

                                    parentesco:
                                        dependente
                                            .parentesco ||
                                        "",

                                    valorAnual:
                                        dependente
                                            .valorAnual,
                                })
                            ),
                }
            );
        } catch (
        error: any
        ) {
            console.error(
                "Erro ao gerar PDF:",
                error
            );

            setErro(
                error
                    ?.message ||
                "Não foi possível gerar o PDF do informe."
            );
        } finally {
            setGerandoCpf(
                null
            );
        }
    }

    if (
        carregando &&
        !dados
    ) {
        return (
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="px-6 py-14 text-center text-sm font-medium text-slate-500">
                    Carregando informes...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="space-y-5 p-5 md:p-6">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Ano-calendário
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-gray-500">
                                Selecione o ano para consultar as competências
                                importadas e os informes consolidados.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">

                            <CalendarDays
                                size={
                                    18
                                }
                                className="text-slate-500"
                            />

                            <select
                                value={
                                    anoCalendario
                                }
                                onChange={(e) => {
                                    setAnoCalendario(
                                        Number(
                                            e.target.value
                                        )
                                    );

                                    setPagina(1);
                                    setFamiliaAberta(null);

                                    setSucessoImportacao(
                                        ""
                                    );

                                    setArquivoImportacao(
                                        null
                                    );

                                    setFileInputKey(
                                        (atual) =>
                                            atual + 1
                                    );
                                }}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                            >
                                {anosDisponiveis.map(
                                    (
                                        ano
                                    ) => (
                                        <option
                                            key={
                                                ano
                                            }
                                            value={
                                                ano
                                            }
                                        >
                                            {
                                                ano
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="space-y-5 p-5 md:p-6">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div>
                            <div className="flex items-center gap-2">

                                <Upload
                                    size={
                                        18
                                    }
                                    className="text-primary"
                                />

                                <h2 className="text-lg font-semibold text-gray-900">
                                    Importar arquivo mensal
                                </h2>
                            </div>

                            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                                Selecione a competência e envie o arquivo CSV
                                fornecido pela Hapvida / São Francisco. Todas as
                                linhas do arquivo serão processadas de uma única vez.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">

                            Ano:&nbsp;

                            <strong>
                                {
                                    anoCalendario
                                }
                            </strong>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr_auto] md:items-end">

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Competência
                                </label>

                                <select
                                    value={
                                        mesImportacao
                                    }
                                    onChange={(
                                        e
                                    ) => {
                                        setMesImportacao(
                                            Number(
                                                e
                                                    .target
                                                    .value
                                            )
                                        );

                                        setSucessoImportacao(
                                            ""
                                        );

                                        setErro(
                                            null
                                        );
                                    }}
                                    disabled={
                                        importando
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                    {MESES.map(
                                        (
                                            mes,
                                            index
                                        ) => (
                                            <option
                                                key={
                                                    mes
                                                }
                                                value={
                                                    index +
                                                    1
                                                }
                                            >
                                                {
                                                    mes
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Arquivo CSV
                                </label>

                                <input
                                    key={
                                        fileInputKey
                                    }
                                    type="file"
                                    accept=".csv,text/csv"
                                    disabled={
                                        importando
                                    }
                                    onChange={(
                                        e
                                    ) => {
                                        const arquivo =
                                            e
                                                .target
                                                .files?.[0] ||
                                            null;

                                        setArquivoImportacao(
                                            arquivo
                                        );

                                        setErro(
                                            null
                                        );

                                        setSucessoImportacao(
                                            ""
                                        );
                                    }}
                                    className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 transition hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={
                                    importarArquivo
                                }
                                disabled={
                                    importando ||
                                    !arquivoImportacao
                                }
                                className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Upload
                                    size={
                                        17
                                    }
                                />

                                {importando
                                    ? "Importando..."
                                    : "Importar CSV"}
                            </button>
                        </div>

                        {arquivoImportacao && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">

                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Arquivo selecionado
                                </p>

                                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                                        {
                                            arquivoImportacao
                                                .name
                                        }
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {formatarTamanhoArquivo(
                                            arquivoImportacao
                                                .size
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {competenciaSelecionadaJaImportada && (
                            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">

                                <AlertTriangle
                                    size={
                                        18
                                    }
                                    className="mt-0.5 shrink-0 text-amber-700"
                                />

                                <div>
                                    <p className="text-sm font-semibold text-amber-800">
                                        Competência já importada
                                    </p>

                                    <p className="mt-1 text-sm text-amber-700">
                                        {
                                            MESES[
                                            mesImportacao -
                                            1
                                            ]
                                        }
                                        /
                                        {
                                            anoCalendario
                                        }{" "}
                                        já possui uma importação registrada.
                                        O backend poderá impedir uma nova
                                        importação desta mesma competência.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {sucessoImportacao && (
                        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">

                            <CheckCircle2
                                size={
                                    18
                                }
                                className="mt-0.5 shrink-0 text-emerald-700"
                            />

                            <div>
                                <p className="text-sm font-semibold text-emerald-800">
                                    Importação concluída
                                </p>

                                <p className="mt-1 text-sm text-emerald-700">
                                    {
                                        sucessoImportacao
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {erro && (
                        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">

                            <AlertTriangle
                                size={
                                    18
                                }
                                className="mt-0.5 shrink-0 text-red-700"
                            />

                            <div>
                                <p className="text-sm font-semibold text-red-800">
                                    Não foi possível concluir a operação
                                </p>

                                <p className="mt-1 text-sm text-red-700">
                                    {
                                        erro
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="space-y-5 p-5 md:p-6">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Competências
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Acompanhe quais meses já possuem arquivo importado.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">

                            {dados?.totalCompetencias ||
                                0}{" "}
                            de 12 importadas
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

                        {MESES.map(
                            (
                                mes,
                                index
                            ) => {
                                const numeroMes =
                                    index +
                                    1;

                                const competencia =
                                    competenciasMap.get(
                                        numeroMes
                                    );

                                const importado =
                                    Boolean(
                                        competencia
                                    );

                                const quantidade =
                                    Number(
                                        competencia
                                            ?.NR_TOTAL_REGISTROS ??
                                        competencia
                                            ?.nrTotalRegistros ??
                                        0
                                    );

                                return (
                                    <div
                                        key={
                                            mes
                                        }
                                        className={`rounded-2xl border p-4 transition ${importado
                                            ? "border-emerald-200 bg-emerald-50"
                                            : "border-slate-200 bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">

                                            <span className="text-sm font-semibold text-slate-800">
                                                {
                                                    mes
                                                }
                                            </span>

                                            {importado ? (
                                                <CheckCircle2
                                                    size={
                                                        17
                                                    }
                                                    className="text-emerald-600"
                                                />
                                            ) : (
                                                <AlertTriangle
                                                    size={
                                                        17
                                                    }
                                                    className="text-slate-400"
                                                />
                                            )}
                                        </div>

                                        <p
                                            className={`mt-2 text-xs font-semibold ${importado
                                                ? "text-emerald-700"
                                                : "text-slate-500"
                                                }`}
                                        >
                                            {importado
                                                ? "Importado"
                                                : "Pendente"}
                                        </p>

                                        {importado && (
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                {
                                                    quantidade
                                                }{" "}
                                                registros
                                            </p>
                                        )}
                                    </div>
                                );
                            }
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                <ResumoCard
                    titulo="Competências"
                    valor={
                        dados
                            ?.totalCompetencias ||
                        0
                    }
                    texto="meses importados"
                    icon={
                        <CalendarDays
                            size={
                                19
                            }
                        />
                    }
                />

                <ResumoCard
                    titulo="Famílias"
                    valor={
                        dados
                            ?.resumo
                            ?.totalFamiliasComTitular ||
                        0
                    }
                    texto="grupos com titular"
                    icon={
                        <Users
                            size={
                                19
                            }
                        />
                    }
                />

                <ResumoCard
                    titulo="Pessoas"
                    valor={
                        dados
                            ?.resumo
                            ?.totalPessoas ||
                        0
                    }
                    texto="beneficiários no ano"
                    icon={
                        <WalletCards
                            size={
                                19
                            }
                        />
                    }
                />

                <ResumoCard
                    titulo="Inconsistências"
                    valor={
                        dados
                            ?.resumo
                            ?.totalFamiliasSemTitular ||
                        0
                    }
                    texto="famílias sem titular"
                    icon={
                        <AlertTriangle
                            size={
                                19
                            }
                        />
                    }
                />
            </div>

            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="space-y-5 p-5 md:p-6">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Informes disponíveis
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Cada linha representa um titular e seu grupo familiar.
                            </p>
                        </div>

                        <div className="relative w-full lg:w-80">

                            <Search
                                size={
                                    16
                                }
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                value={
                                    pesquisa
                                }
                                onChange={(e) => {
                                    setPesquisa(
                                        e.target.value
                                    );

                                    setPagina(1);

                                    setFamiliaAberta(
                                        null
                                    );
                                }}
                                placeholder="Buscar nome, CPF ou matrícula"
                                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                    </div>

                    {!carregando && !informeDisponivel && (
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">

                            <AlertTriangle
                                size={18}
                                className="mt-0.5 shrink-0 text-amber-700"
                            />

                            <div>
                                <p className="text-sm font-semibold text-amber-800">
                                    Informe de Rendimentos ainda não disponível
                                </p>

                                <p className="mt-1 text-sm leading-6 text-amber-700">
                                    O Informe de Rendimentos referente ao ano-calendário de{" "}
                                    <strong>
                                        {anoCalendario}
                                    </strong>{" "}
                                    estará disponível após a importação das 12 competências do ano.
                                    Atualmente,{" "}
                                    <strong>
                                        {totalCompetenciasImportadas} de 12
                                    </strong>{" "}
                                    competências estão disponíveis.
                                    {competenciasPendentes > 0 && (
                                        <>
                                            {" "}
                                            Faltam{" "}
                                            <strong>
                                                {competenciasPendentes}
                                            </strong>{" "}
                                            competência(s).
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {carregando && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                            Atualizando informações...
                        </div>
                    )}

                    {familiasFiltradas.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">

                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                                <FileText size={21} />
                            </div>

                            <h3 className="mt-4 text-base font-semibold text-slate-800">
                                {pesquisa.trim()
                                    ? "Beneficiário não encontrado"
                                    : "Nenhum informe disponível"}
                            </h3>

                            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                                {pesquisa.trim() ? (
                                    <>
                                        Não foi encontrado nenhum beneficiário correspondente a{" "}
                                        <strong className="font-semibold text-slate-700">
                                            &quot;{pesquisa.trim()}&quot;
                                        </strong>{" "}
                                        no ano-calendário de{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {anoCalendario}
                                        </strong>
                                        .
                                    </>
                                ) : (
                                    <>
                                        Não existem beneficiários consolidados para o ano-calendário de{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {anoCalendario}
                                        </strong>
                                        .
                                    </>
                                )}
                            </p>

                            {pesquisa.trim() && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPesquisa("");
                                        setPagina(1);
                                        setFamiliaAberta(null);
                                    }}
                                    className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary"
                                >
                                    Limpar pesquisa
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-2xl border border-gray-200">

                                <table className="min-w-full text-sm">

                                    <thead className="bg-gray-50">

                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">

                                            <th className="px-4 py-3">
                                                Titular
                                            </th>

                                            <th className="px-4 py-3">
                                                CPF
                                            </th>

                                            <th className="px-4 py-3">
                                                Matrícula
                                            </th>

                                            <th className="px-4 py-3">
                                                Dependentes
                                            </th>

                                            <th className="px-4 py-3">
                                                Valor anual
                                            </th>

                                            <th className="px-4 py-3 text-right">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">

                                        {familiasPaginadas.map(
                                            (
                                                familia
                                            ) => {
                                                const chave =
                                                    chaveFamilia(
                                                        familia
                                                    );

                                                const aberta =
                                                    familiaAberta ===
                                                    chave;

                                                return (
                                                    <Fragment
                                                        key={
                                                            chave
                                                        }
                                                    >
                                                        <tr className="transition hover:bg-gray-50">

                                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                                {
                                                                    familia
                                                                        .nomeTitular
                                                                }
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                {formatarCpf(
                                                                    familia
                                                                        .cpfTitular
                                                                )}
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                {familia
                                                                    .matricula ||
                                                                    "—"}
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                {
                                                                    familia
                                                                        .dependentes
                                                                        .length
                                                                }
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                                                                {formatarMoeda(
                                                                    familia
                                                                        .valorTotalFamilia
                                                                )}
                                                            </td>

                                                            <td className="whitespace-nowrap px-4 py-3">

                                                                <div className="flex justify-end gap-2">

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setFamiliaAberta(
                                                                                aberta
                                                                                    ? null
                                                                                    : chave
                                                                            )
                                                                        }
                                                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-primary"
                                                                    >
                                                                        {aberta ? (
                                                                            <ChevronUp
                                                                                size={
                                                                                    15
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <ChevronDown
                                                                                size={
                                                                                    15
                                                                                }
                                                                            />
                                                                        )}

                                                                        Detalhes
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            gerarPdf(
                                                                                familia
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !informeDisponivel ||
                                                                            gerandoCpf ===
                                                                            familia.cpfTitular
                                                                        }
                                                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        <Printer
                                                                            size={
                                                                                15
                                                                            }
                                                                        />

                                                                        {gerandoCpf === familia.cpfTitular
                                                                            ? "Gerando..."
                                                                            : !informeDisponivel
                                                                                ? "Indisponível"
                                                                                : "Gerar PDF"}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {aberta && (
                                                            <tr>
                                                                <td
                                                                    colSpan={
                                                                        6
                                                                    }
                                                                    className="bg-slate-50/80 px-4 py-4"
                                                                >
                                                                    <DetalhesFamilia
                                                                        familia={
                                                                            familia
                                                                        }
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                                    <p className="text-xs text-slate-500">
                                        Exibindo{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {primeiroRegistro}
                                        </strong>
                                        {" "}a{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {ultimoRegistro}
                                        </strong>
                                        {" "}de{" "}
                                        <strong className="font-semibold text-slate-700">
                                            {totalFamiliasFiltradas}
                                        </strong>
                                        {" "}família(s).
                                    </p>

                                    <div className="flex items-center gap-2">

                                        <span className="text-xs text-slate-500">
                                            Exibir
                                        </span>

                                        <select
                                            value={
                                                limitePorPagina
                                            }
                                            onChange={(e) => {
                                                setLimitePorPagina(
                                                    Number(
                                                        e.target.value
                                                    )
                                                );

                                                setPagina(1);

                                                setFamiliaAberta(
                                                    null
                                                );
                                            }}
                                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        >
                                            <option value={10}>
                                                10
                                            </option>

                                            <option value={20}>
                                                20
                                            </option>

                                            <option value={30}>
                                                30
                                            </option>

                                            <option value={50}>
                                                50
                                            </option>
                                        </select>

                                        <span className="text-xs text-slate-500">
                                            por página
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPagina(
                                                (atual) =>
                                                    Math.max(
                                                        atual - 1,
                                                        1
                                                    )
                                            );

                                            setFamiliaAberta(
                                                null
                                            );
                                        }}
                                        disabled={
                                            pagina <= 1
                                        }
                                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronDown
                                            size={15}
                                            className="rotate-90"
                                        />

                                        Anterior
                                    </button>

                                    <span className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
                                        Página{" "}
                                        {pagina}{" "}
                                        de{" "}
                                        {totalPaginas}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPagina(
                                                (atual) =>
                                                    Math.min(
                                                        atual + 1,
                                                        totalPaginas
                                                    )
                                            );

                                            setFamiliaAberta(
                                                null
                                            );
                                        }}
                                        disabled={
                                            pagina >=
                                            totalPaginas
                                        }
                                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Próxima

                                        <ChevronDown
                                            size={15}
                                            className="-rotate-90"
                                        />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResumoCard({
    titulo,
    valor,
    texto,
    icon,
}: {
    titulo: string;
    valor: number;
    texto: string;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between gap-4">

                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        {
                            titulo
                        }
                    </p>

                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                        {
                            valor
                        }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {
                            texto
                        }
                    </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {
                        icon
                    }
                </div>
            </div>
        </div>
    );
}

function DetalhesFamilia({
    familia,
}: {
    familia: InformeFamilia;
}) {
    function moeda(
        valor: number
    ) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        );
    }

    function cpf(
        valor?: string
    ) {
        const digits =
            String(
                valor || ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            digits.length !==
            11
        ) {
            return (
                valor ||
                "—"
            );
        }

        return `${digits.slice(
            0,
            3
        )}.${digits.slice(
            3,
            6
        )}.${digits.slice(
            6,
            9
        )}-${digits.slice(
            9
        )}`;
    }

    const possuiDependentes =
        familia.dependentes.length > 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">

            <div className="mb-4">

                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {possuiDependentes
                        ? "Resumo do grupo familiar"
                        : "Resumo do titular"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {possuiDependentes
                        ? "Valores consolidados do titular e seus dependentes nas competências importadas."
                        : "Este beneficiário é o próprio titular e não possui dependentes vinculados no período."}
                </p>
            </div>

            <div
                className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${possuiDependentes
                    ? "lg:grid-cols-4"
                    : "lg:grid-cols-3"
                    }`}
            >

                <div>
                    <p className="text-xs font-semibold text-slate-500">
                        Matrícula
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                        {familia.matricula || "—"}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-slate-500">
                        {possuiDependentes
                            ? "Valor do titular"
                            : "Valor anual"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {moeda(
                            familia.valorProprioTitular
                        )}
                    </p>
                </div>

                {possuiDependentes && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500">
                            Valor total da família
                        </p>

                        <p className="mt-1 text-sm font-semibold text-primary">
                            {moeda(
                                familia.valorTotalFamilia
                            )}
                        </p>
                    </div>
                )}

                <div>
                    <p className="text-xs font-semibold text-slate-500">
                        Meses presentes
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {familia.mesesTitular}
                    </p>
                </div>
            </div>

            {!possuiDependentes && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">

                    <p className="text-sm font-semibold text-emerald-800">
                        Titular individual
                    </p>

                    <p className="mt-1 text-sm text-emerald-700">
                        Não há dependentes vinculados a este titular nas competências importadas.
                    </p>
                </div>
            )}

            {possuiDependentes && (
                <div className="mt-5 border-t border-slate-100 pt-4">

                    <div className="mb-3 flex items-center justify-between gap-3">

                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            Dependentes
                        </p>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {familia.dependentes.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">

                        <table className="min-w-full text-sm">

                            <thead>
                                <tr className="text-left text-xs font-semibold text-slate-500">

                                    <th className="pb-2 pr-4">
                                        Nome
                                    </th>

                                    <th className="pb-2 pr-4">
                                        CPF
                                    </th>

                                    <th className="pb-2 pr-4">
                                        Parentesco
                                    </th>

                                    <th className="pb-2 pr-4">
                                        Meses
                                    </th>

                                    <th className="pb-2 text-right">
                                        Valor anual
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {familia.dependentes.map(
                                    (
                                        dependente
                                    ) => (
                                        <tr
                                            key={`${dependente.cpf}-${dependente.nome}`}
                                        >
                                            <td className="py-2 pr-4 font-medium text-slate-800">
                                                {dependente.nome}
                                            </td>

                                            <td className="whitespace-nowrap py-2 pr-4 text-slate-600">
                                                {cpf(
                                                    dependente.cpf
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap py-2 pr-4 text-slate-600">
                                                {dependente.parentesco || "—"}
                                            </td>

                                            <td className="whitespace-nowrap py-2 pr-4 text-slate-600">
                                                {dependente.mesesPresente}
                                            </td>

                                            <td className="whitespace-nowrap py-2 text-right font-medium text-slate-700">
                                                {Number(
                                                    dependente.valorAnual || 0
                                                ) === 0
                                                    ? "—"
                                                    : moeda(
                                                        dependente.valorAnual
                                                    )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatarTamanhoArquivo(
    bytes: number
) {
    if (
        bytes <
        1024
    ) {
        return `${bytes} bytes`;
    }

    if (
        bytes <
        1024 *
        1024
    ) {
        return `${(
            bytes /
            1024
        ).toFixed(
            1
        )} KB`;
    }

    return `${(
        bytes /
        (
            1024 *
            1024
        )
    ).toFixed(
        1
    )} MB`;
}