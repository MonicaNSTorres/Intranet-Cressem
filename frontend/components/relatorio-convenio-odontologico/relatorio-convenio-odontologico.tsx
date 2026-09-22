"use client";

import {
    Fragment,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    CalendarDays,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Filter,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Users,
    Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
    buscarRelatorioBeneficiarios,
    buscarValorVigentePlano,
    listarEmpresasOdonto,
    listarOperadoras,
    listarPlanos,
    listarTiposBeneficiario,
    type BeneficiarioOdonto,
    type EmpresaOdonto,
    type Operadora,
    type PlanoOdonto,
    type TipoBeneficiario,
} from "@/services/convenio_odontologico.service";

export default function RelatorioConvenioOdontologico() {
    const [empresas, setEmpresas] =
        useState<EmpresaOdonto[]>([]);

    const [operadoras, setOperadoras] =
        useState<Operadora[]>([]);

    const [planos, setPlanos] =
        useState<PlanoOdonto[]>([]);

    const [
        tiposBeneficiario,
        setTiposBeneficiario,
    ] = useState<TipoBeneficiario[]>([]);

    const [resultados, setResultados] =
        useState<BeneficiarioOdonto[]>([]);

    const [idEmpresa, setIdEmpresa] =
        useState("");

    const [cpf, setCpf] =
        useState("");

    const [
        idTipoBeneficiario,
        setIdTipoBeneficiario,
    ] = useState("");

    const [status, setStatus] =
        useState("");

    const [idOperadora, setIdOperadora] =
        useState("");

    const [idPlano, setIdPlano] =
        useState("");

    const [valor, setValor] =
        useState("");

    const [tipoCobranca, setTipoCobranca] =
        useState("");

    const [
        maisFiltrosAberto,
        setMaisFiltrosAberto,
    ] = useState(false);

    const [matricula, setMatricula] =
        useState("");

    const [titular, setTitular] =
        useState("");

    const [
        dataInclusaoDe,
        setDataInclusaoDe,
    ] = useState("");

    const [
        dataInclusaoAte,
        setDataInclusaoAte,
    ] = useState("");

    const [
        dataExclusaoDe,
        setDataExclusaoDe,
    ] = useState("");

    const [
        dataExclusaoAte,
        setDataExclusaoAte,
    ] = useState("");

    const [
        possuiContaCapital,
        setPossuiContaCapital,
    ] = useState("");

    const [
        integralizacaoIndeterminada,
        setIntegralizacaoIndeterminada,
    ] = useState<"" | "SIM" | "NAO">("");

    const [
        carregandoDados,
        setCarregandoDados,
    ] = useState(true);

    const [
        carregandoPesquisa,
        setCarregandoPesquisa,
    ] = useState(false);

    const [pesquisado, setPesquisado] =
        useState(false);

    const [
        beneficiarioDetalhesAberto,
        setBeneficiarioDetalhesAberto,
    ] = useState<number | null>(null);

    const [
        filtrosResultado,
        setFiltrosResultado,
    ] = useState<string[]>([]);

    const [erro, setErro] =
        useState<string | null>(null);

    useEffect(() => {
        async function carregarDados() {
            try {
                setCarregandoDados(true);
                setErro(null);

                const [
                    empresasData,
                    operadorasData,
                    planosData,
                    tiposData,
                ] = await Promise.all([
                    listarEmpresasOdonto(),
                    listarOperadoras(),
                    listarPlanos(),
                    listarTiposBeneficiario(),
                ]);

                setEmpresas(empresasData);
                setOperadoras(operadorasData);
                setPlanos(planosData);
                setTiposBeneficiario(
                    tiposData
                );
            } catch (error) {
                console.error(
                    "Erro ao carregar filtros do relatório:",
                    error
                );

                setErro(
                    "Não foi possível carregar os dados necessários para o relatório."
                );
            } finally {
                setCarregandoDados(false);
            }
        }

        carregarDados();
    }, []);

    const planosFiltrados =
        useMemo(() => {
            if (!idOperadora) {
                return planos;
            }

            return planos.filter(
                (item) =>
                    Number(
                        item.ID_OPERADORA
                    ) ===
                    Number(
                        idOperadora
                    )
            );
        }, [planos, idOperadora]);

    const quantidadeFiltros =
        useMemo(() => {
            return [
                idEmpresa,
                cpf,
                idTipoBeneficiario,
                status,

                idOperadora,
                idPlano,
                valor,
                tipoCobranca,

                matricula,
                titular,

                dataInclusaoDe,
                dataInclusaoAte,

                dataExclusaoDe,
                dataExclusaoAte,

                possuiContaCapital,
                integralizacaoIndeterminada,
            ].filter(
                (item) =>
                    String(
                        item
                    ).trim() !== ""
            ).length;
        }, [
            idEmpresa,
            cpf,
            idTipoBeneficiario,
            status,

            idOperadora,
            idPlano,
            valor,
            tipoCobranca,

            matricula,
            titular,

            dataInclusaoDe,
            dataInclusaoAte,

            dataExclusaoDe,
            dataExclusaoAte,

            possuiContaCapital,
            integralizacaoIndeterminada,
        ]);

    function limparCpf(
        valor: string
    ) {
        return valor
            .replace(/\D/g, "")
            .slice(0, 11);
    }

    function formatarCpfDigitacao(
        valor: string
    ) {
        const digits =
            limparCpf(valor);

        if (digits.length <= 3) {
            return digits;
        }

        if (digits.length <= 6) {
            return `${digits.slice(
                0,
                3
            )}.${digits.slice(3)}`;
        }

        if (digits.length <= 9) {
            return `${digits.slice(
                0,
                3
            )}.${digits.slice(
                3,
                6
            )}.${digits.slice(6)}`;
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
        )}-${digits.slice(9)}`;
    }

    function formatarCpf(
        valor?: string | null
    ) {
        const digits = String(
            valor || ""
        )
            .replace(/\D/g, "")
            .slice(0, 11);

        if (
            digits.length !== 11
        ) {
            return valor || "—";
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
        )}-${digits.slice(9)}`;
    }

    function formatarMoeda(
        valor?: number | null
    ) {
        if (
            valor === null ||
            valor === undefined
        ) {
            return "—";
        }

        return Number(
            valor
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        );
    }

    function formatarCobranca(
        valor?: string | null
    ) {
        if (
            valor === "POR_PESSOA"
        ) {
            return "Por pessoa";
        }

        if (
            valor === "POR_PLANO"
        ) {
            return "Por plano";
        }

        return "—";
    }

    function formatarDataExcel(
        valor?: string | null
    ) {
        if (!valor) {
            return "";
        }

        const match =
            String(valor).match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }

        const data =
            new Date(valor);

        if (
            Number.isNaN(
                data.getTime()
            )
        ) {
            return "";
        }

        return data.toLocaleDateString(
            "pt-BR"
        );
    }

    function formatarSimNao(
        valor?: string | number | null
    ) {
        if (
            valor === "S" ||
            valor === 1 ||
            valor === "1"
        ) {
            return "Sim";
        }

        if (
            valor === "N" ||
            valor === 0 ||
            valor === "0"
        ) {
            return "Não";
        }

        return valor
            ? String(valor)
            : "";
    }

    function formatarDataFiltro(
        valor: string
    ) {
        if (!valor) return "";

        const [
            ano,
            mes,
            dia,
        ] = valor.split("-");

        if (
            !ano ||
            !mes ||
            !dia
        ) {
            return valor;
        }

        return `${dia}/${mes}/${ano}`;
    }

    const filtrosAplicados =
        useMemo(() => {
            const filtros:
                string[] = [];

            const empresa =
                empresas.find(
                    (item) =>
                        String(
                            item.ID_EMPRESA
                        ) ===
                        idEmpresa
                );

            const operadora =
                operadoras.find(
                    (item) =>
                        String(
                            item.ID_OPERADORA
                        ) ===
                        idOperadora
                );

            const plano =
                planos.find(
                    (item) =>
                        String(
                            item.ID_PLANO
                        ) ===
                        idPlano
                );

            const tipo =
                tiposBeneficiario.find(
                    (item) =>
                        String(
                            item.ID_TIPO_BENEFICIARIO
                        ) ===
                        idTipoBeneficiario
                );

            if (empresa) {
                filtros.push(
                    `Empresa: ${empresa.NM_EMPRESA}`
                );
            }

            if (cpf) {
                filtros.push(
                    `CPF: ${formatarCpf(
                        cpf
                    )}`
                );
            }

            if (tipo) {
                filtros.push(
                    `Tipo: ${tipo.NM_TIPO_BENEFICIARIO}`
                );
            }

            if (
                status === "ATIVO"
            ) {
                filtros.push(
                    "Somente ativos"
                );
            }

            if (
                status ===
                "INATIVO"
            ) {
                filtros.push(
                    "Somente inativos"
                );
            }

            if (operadora) {
                filtros.push(
                    `Operadora: ${operadora.NM_OPERADORA}`
                );
            }

            if (plano) {
                filtros.push(
                    `Plano: ${plano.NM_PLANO}`
                );
            }

            if (valor) {
                filtros.push(
                    `Valor: R$ ${valor}`
                );
            }

            if (
                tipoCobranca ===
                "POR_PESSOA"
            ) {
                filtros.push(
                    "Cobrança por pessoa"
                );
            }

            if (
                tipoCobranca ===
                "POR_PLANO"
            ) {
                filtros.push(
                    "Cobrança por plano"
                );
            }

            if (matricula) {
                filtros.push(
                    `Matrícula: ${matricula}`
                );
            }

            if (titular) {
                filtros.push(
                    `Titular: ${titular}`
                );
            }

            if (
                dataInclusaoDe ||
                dataInclusaoAte
            ) {
                if (
                    dataInclusaoDe &&
                    dataInclusaoAte
                ) {
                    filtros.push(
                        `Inclusão: ${formatarDataFiltro(
                            dataInclusaoDe
                        )} até ${formatarDataFiltro(
                            dataInclusaoAte
                        )}`
                    );
                } else if (
                    dataInclusaoDe
                ) {
                    filtros.push(
                        `Inclusão a partir de ${formatarDataFiltro(
                            dataInclusaoDe
                        )}`
                    );
                } else {
                    filtros.push(
                        `Inclusão até ${formatarDataFiltro(
                            dataInclusaoAte
                        )}`
                    );
                }
            }

            if (
                dataExclusaoDe ||
                dataExclusaoAte
            ) {
                if (
                    dataExclusaoDe &&
                    dataExclusaoAte
                ) {
                    filtros.push(
                        `Exclusão: ${formatarDataFiltro(
                            dataExclusaoDe
                        )} até ${formatarDataFiltro(
                            dataExclusaoAte
                        )}`
                    );
                } else if (
                    dataExclusaoDe
                ) {
                    filtros.push(
                        `Exclusão a partir de ${formatarDataFiltro(
                            dataExclusaoDe
                        )}`
                    );
                } else {
                    filtros.push(
                        `Exclusão até ${formatarDataFiltro(
                            dataExclusaoAte
                        )}`
                    );
                }
            }

            if (
                possuiContaCapital ===
                "SIM"
            ) {
                filtros.push(
                    "Com Conta Capital"
                );
            }

            if (
                possuiContaCapital ===
                "NAO"
            ) {
                filtros.push(
                    "Sem Conta Capital"
                );
            }

            if (
                integralizacaoIndeterminada ===
                "SIM"
            ) {
                filtros.push(
                    "Com integralização indeterminada"
                );
            }

            if (
                integralizacaoIndeterminada ===
                "NAO"
            ) {
                filtros.push(
                    "Sem integralização indeterminada"
                );
            }

            return filtros;
        }, [
            empresas,
            operadoras,
            planos,
            tiposBeneficiario,

            idEmpresa,
            cpf,
            idTipoBeneficiario,
            status,

            idOperadora,
            idPlano,
            valor,
            tipoCobranca,

            matricula,
            titular,

            dataInclusaoDe,
            dataInclusaoAte,

            dataExclusaoDe,
            dataExclusaoAte,

            possuiContaCapital,
            integralizacaoIndeterminada,
        ]);

    async function pesquisar() {
        try {
            setErro(null);
            setCarregandoPesquisa(
                true
            );

            const cpfLimpo =
                limparCpf(cpf);

            if (
                cpfLimpo &&
                cpfLimpo.length !== 11
            ) {
                setErro(
                    "Para pesquisar por CPF, informe os 11 dígitos."
                );

                return;
            }

            if (
                dataInclusaoDe &&
                dataInclusaoAte &&
                dataInclusaoDe >
                dataInclusaoAte
            ) {
                setErro(
                    "A data inicial de inclusão não pode ser maior que a data final."
                );

                return;
            }

            if (
                dataExclusaoDe &&
                dataExclusaoAte &&
                dataExclusaoDe >
                dataExclusaoAte
            ) {
                setErro(
                    "A data inicial de exclusão não pode ser maior que a data final."
                );

                return;
            }

            const valorNumero =
                valor
                    ? Number(
                        valor
                            .replace(
                                /\./g,
                                ""
                            )
                            .replace(
                                ",",
                                "."
                            )
                    )
                    : undefined;

            if (
                valor &&
                (
                    valorNumero ===
                    undefined ||
                    !Number.isFinite(
                        valorNumero
                    ) ||
                    valorNumero < 0
                )
            ) {
                setErro(
                    "Informe um valor de plano válido."
                );

                return;
            }

            const data =
                await buscarRelatorioBeneficiarios(
                    {
                        idEmpresa:
                            idEmpresa
                                ? Number(
                                    idEmpresa
                                )
                                : undefined,

                        cpf:
                            cpfLimpo ||
                            undefined,

                        idTipoBeneficiario:
                            idTipoBeneficiario
                                ? Number(
                                    idTipoBeneficiario
                                )
                                : undefined,

                        status:
                            status
                                ? (status as
                                    | "ATIVO"
                                    | "INATIVO")
                                : undefined,

                        idOperadora:
                            idOperadora
                                ? Number(
                                    idOperadora
                                )
                                : undefined,

                        idPlano:
                            idPlano
                                ? Number(
                                    idPlano
                                )
                                : undefined,

                        valor:
                            valorNumero,

                        tipoCobranca:
                            tipoCobranca
                                ? (tipoCobranca as
                                    | "POR_PESSOA"
                                    | "POR_PLANO")
                                : undefined,

                        matricula:
                            matricula.trim() ||
                            undefined,

                        titular:
                            titular.trim() ||
                            undefined,

                        dataInclusaoDe:
                            dataInclusaoDe ||
                            undefined,

                        dataInclusaoAte:
                            dataInclusaoAte ||
                            undefined,

                        dataExclusaoDe:
                            dataExclusaoDe ||
                            undefined,

                        dataExclusaoAte:
                            dataExclusaoAte ||
                            undefined,

                        possuiContaCapital:
                            possuiContaCapital
                                ? (possuiContaCapital as
                                    | "SIM"
                                    | "NAO")
                                : undefined,

                        integralizacaoIndeterminada:
                            integralizacaoIndeterminada
                                ? (integralizacaoIndeterminada as
                                    | "S"
                                    | "N")
                                : undefined,
                    }
                );

            setResultados(data);

            setFiltrosResultado(
                filtrosAplicados.length > 0
                    ? [...filtrosAplicados]
                    : [
                        "Nenhum filtro aplicado - todos os beneficiários",
                    ]
            );

            setPesquisado(true);
        } catch (error: any) {
            console.error(
                "Erro ao consultar relatório:",
                error
            );

            setResultados([]);
            setPesquisado(true);

            setErro(
                error?.response
                    ?.data?.error ||
                "Não foi possível consultar o relatório."
            );
        } finally {
            setCarregandoPesquisa(
                false
            );
        }
    }

    function limparFiltros() {
        setIdEmpresa("");
        setCpf("");
        setIdTipoBeneficiario("");
        setStatus("");
        setIdOperadora("");
        setIdPlano("");
        setValor("");
        setTipoCobranca("");
        setMatricula("");
        setTitular("");
        setDataInclusaoDe("");
        setDataInclusaoAte("");
        setDataExclusaoDe("");
        setDataExclusaoAte("");
        setPossuiContaCapital("");
        setIntegralizacaoIndeterminada(
            ""
        );
        setResultados([]);
        setPesquisado(false);
        setErro(null);
        setFiltrosResultado([]);
        setBeneficiarioDetalhesAberto(null);
    }

    function exportarExcel() {
        if (resultados.length === 0) {
            return;
        }

        try {
            const agora = new Date();

            const dataGeracao =
                agora.toLocaleDateString(
                    "pt-BR"
                );

            const horaGeracao =
                agora.toLocaleTimeString(
                    "pt-BR",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                    }
                );

            const cabecalho: any[][] = [
                [
                    "RELATÓRIO DO CONVÊNIO ODONTOLÓGICO",
                ],
                [
                    `Gerado em: ${dataGeracao} às ${horaGeracao}`,
                ],
                [
                    `Total de beneficiários: ${resultados.length}`,
                ],
                [],
                [
                    "FILTROS APLICADOS",
                ],
            ];

            filtrosResultado.forEach(
                (filtro) => {
                    cabecalho.push([
                        `• ${filtro}`,
                    ]);
                }
            );

            cabecalho.push([]);
            cabecalho.push([]);

            const colunas = [
                "Nome",
                "CPF",
                "Tipo",
                "Matrícula",
                "Empresa",
                "Operadora",
                "Plano",
                "Forma de cobrança",
                "Valor",
                "Status",
                "Titular",
                "Data de inclusão",
                "Data de exclusão",
                "Conta Capital",
                "Integralização indeterminada",
            ];

            cabecalho.push(colunas);

            const dados =
                resultados.map(
                    (item) => [
                        item.NM_BENEFICIARIO ||
                        "",

                        formatarCpf(
                            item.NR_CPF
                        ),

                        item.NM_TIPO_BENEFICIARIO ||
                        item.CD_TIPO_BENEFICIARIO ||
                        "",

                        item.NR_MATRICULA ||
                        "",

                        item.NM_EMPRESA ||
                        "",

                        item.NM_OPERADORA ||
                        "",

                        item.NM_PLANO ||
                        "",

                        formatarCobranca(
                            item.TP_COBRANCA
                        ),

                        item.VL_MENSALIDADE !==
                            null &&
                            item.VL_MENSALIDADE !==
                            undefined
                            ? Number(
                                item.VL_MENSALIDADE
                            )
                            : "",

                        item.SN_ATIVO === 1
                            ? "Ativo"
                            : "Inativo",

                        item.NM_TITULAR ||
                        "",

                        formatarDataExcel(
                            item.DT_INCLUSAO_PLANO
                        ),

                        formatarDataExcel(
                            item.DT_EXCLUSAO_PLANO
                        ),

                        item.NR_CONTA_CAPITAL ||
                        "",

                        formatarSimNao(
                            item.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA
                        ),
                    ]
                );

            const dadosPlanilha = [
                ...cabecalho,
                ...dados,
            ];

            const worksheet =
                XLSX.utils.aoa_to_sheet(
                    dadosPlanilha
                );

            worksheet["!merges"] = [
                {
                    s: {
                        r: 0,
                        c: 0,
                    },
                    e: {
                        r: 0,
                        c:
                            colunas.length -
                            1,
                    },
                },
            ];

            worksheet["!cols"] = [
                { wch: 32 }, //nome
                { wch: 16 }, //cpf
                { wch: 16 }, //tipo
                { wch: 14 }, //matricula
                { wch: 38 }, //empresa
                { wch: 24 }, //operadora
                { wch: 28 }, //plano
                { wch: 20 }, //cobranca
                { wch: 14 }, //valor
                { wch: 12 }, //status
                { wch: 32 }, //titular
                { wch: 18 }, //inclusao
                { wch: 18 }, //exclusao
                { wch: 18 }, //conta capital
                { wch: 28 }, //integralizacao
            ];

            const linhaCabecalho =
                cabecalho.length;

            for (
                let linha =
                    linhaCabecalho + 1;
                linha <=
                linhaCabecalho +
                resultados.length;
                linha++
            ) {
                const endereco =
                    `I${linha}`;

                if (
                    worksheet[endereco] &&
                    typeof worksheet[
                        endereco
                    ].v === "number"
                ) {
                    worksheet[
                        endereco
                    ].z =
                        'R$ #,##0.00';
                }
            }

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Relatório"
            );

            const dataArquivo = [
                agora
                    .getFullYear(),

                String(
                    agora.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                ),

                String(
                    agora.getDate()
                ).padStart(
                    2,
                    "0"
                ),
            ].join("-");

            const horaArquivo = [
                String(
                    agora.getHours()
                ).padStart(
                    2,
                    "0"
                ),

                String(
                    agora.getMinutes()
                ).padStart(
                    2,
                    "0"
                ),
            ].join("-");

            XLSX.writeFile(
                workbook,
                `relatorio_convenio_odontologico_${dataArquivo}_${horaArquivo}.xlsx`
            );
        } catch (error) {
            console.error(
                "Erro ao exportar relatório:",
                error
            );

            setErro(
                "Não foi possível gerar o arquivo Excel."
            );
        }
    }

    async function handlePlanoChange(
        value: string
    ) {
        setIdPlano(value);

        if (!value) {
            setValor("");
            return;
        }

        try {
            const data =
                await buscarValorVigentePlano(
                    Number(value)
                );

            const valorFormatado =
                Number(
                    data.VL_MENSALIDADE
                ).toLocaleString(
                    "pt-BR",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }
                );

            setValor(
                valorFormatado
            );
        } catch (error) {
            console.error(
                "Erro ao buscar valor vigente do plano:",
                error
            );

            setValor("");
        }
    }

    function handleOperadoraChange(
        value: string
    ) {
        setIdOperadora(value);
        setIdPlano("");
        setValor("");
    }

    function toggleDetalhesBeneficiario(
        idBeneficiario: number
    ) {
        setBeneficiarioDetalhesAberto(
            (atual) =>
                atual === idBeneficiario
                    ? null
                    : idBeneficiario
        );
    }

    if (carregandoDados) {
        return (
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                <div className="px-6 py-14 text-center text-sm font-medium text-slate-500">
                    Carregando opções do relatório...
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
                                Filtros do relatório
                            </h2>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                                Escolha apenas as informações que deseja filtrar.
                                Você pode usar um único filtro ou combinar vários.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                            <Filter size={16} />

                            {quantidadeFiltros ===
                                0
                                ? "Nenhum filtro selecionado"
                                : quantidadeFiltros ===
                                    1
                                    ? "1 filtro selecionado"
                                    : `${quantidadeFiltros} filtros selecionados`}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-fourth-200 bg-blue-50/60 px-4 py-3">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-fourth">
                                <SlidersHorizontal
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-fourth">
                                    Como usar
                                </p>

                                <p className="mt-1 text-sm leading-5 text-fourth">
                                    Para visualizar todos os beneficiários,
                                    deixe os campos como estão e clique em{" "}
                                    <strong>
                                        Pesquisar
                                    </strong>
                                    . Para uma busca específica, preencha somente
                                    os filtros que precisar.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                                <Users
                                    size={
                                        17
                                    }
                                />
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Beneficiário
                                </p>

                                <h3 className="mt-1 text-base font-semibold text-slate-900">
                                    Quem você deseja encontrar?
                                </h3>

                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Filtre por empresa, CPF, tipo ou situação atual
                                    do beneficiário.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Empresa
                                </label>

                                <select
                                    value={
                                        idEmpresa
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setIdEmpresa(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">
                                        Todas as empresas
                                    </option>

                                    {empresas.map(
                                        (
                                            item
                                        ) => (
                                            <option
                                                key={
                                                    item.ID_EMPRESA
                                                }
                                                value={
                                                    item.ID_EMPRESA
                                                }
                                            >
                                                {
                                                    item.NM_EMPRESA
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    CPF do beneficiário
                                </label>

                                <input
                                    value={formatarCpfDigitacao(
                                        cpf
                                    )}
                                    onChange={(
                                        e
                                    ) =>
                                        setCpf(
                                            limparCpf(
                                                e
                                                    .target
                                                    .value
                                            )
                                        )
                                    }
                                    inputMode="numeric"
                                    maxLength={
                                        14
                                    }
                                    placeholder="000.000.000-00"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                />

                                <p className="mt-1 text-xs text-slate-400">
                                    Deixe em branco para pesquisar todos os CPFs.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Tipo de beneficiário
                                </label>

                                <select
                                    value={
                                        idTipoBeneficiario
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setIdTipoBeneficiario(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">
                                        Titulares e dependentes
                                    </option>

                                    {tiposBeneficiario.map(
                                        (
                                            item
                                        ) => (
                                            <option
                                                key={
                                                    item.ID_TIPO_BENEFICIARIO
                                                }
                                                value={
                                                    item.ID_TIPO_BENEFICIARIO
                                                }
                                            >
                                                {
                                                    item.NM_TIPO_BENEFICIARIO
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Status do beneficiário
                                </label>

                                <select
                                    value={
                                        status
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setStatus(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">
                                        Ativos e inativos
                                    </option>

                                    <option value="ATIVO">
                                        Somente ativos
                                    </option>

                                    <option value="INATIVO">
                                        Somente inativos
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary">
                                <CreditCard
                                    size={
                                        17
                                    }
                                />
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                    Convênio
                                </p>

                                <h3 className="mt-1 text-base font-semibold text-slate-900">
                                    Dados do plano odontológico
                                </h3>

                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Utilize estes campos para localizar pessoas de
                                    uma operadora, plano ou valor específico.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Convênio / Operadora
                                </label>

                                <select
                                    value={
                                        idOperadora
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        handleOperadoraChange(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">
                                        Todas as operadoras
                                    </option>

                                    {operadoras.map(
                                        (
                                            item
                                        ) => (
                                            <option
                                                key={
                                                    item.ID_OPERADORA
                                                }
                                                value={
                                                    item.ID_OPERADORA
                                                }
                                            >
                                                {
                                                    item.NM_OPERADORA
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Plano
                                </label>

                                <select
                                    value={
                                        idPlano
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        handlePlanoChange(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    disabled={
                                        !idOperadora
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">
                                        {idOperadora
                                            ? "Todos os planos"
                                            : "Selecione primeiro a operadora"}
                                    </option>

                                    {planosFiltrados.map(
                                        (
                                            item
                                        ) => (
                                            <option
                                                key={
                                                    item.ID_PLANO
                                                }
                                                value={
                                                    item.ID_PLANO
                                                }
                                            >
                                                {
                                                    item.NM_PLANO
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Valor do plano
                                </label>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                                        R$
                                    </span>

                                    <input
                                        value={
                                            valor
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setValor(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        inputMode="decimal"
                                        placeholder="27,47"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>

                                <p className="mt-1 text-xs text-slate-400">
                                    Exemplo: 27,47
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Forma de cobrança
                                </label>

                                <select
                                    value={
                                        tipoCobranca
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setTipoCobranca(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    <option value="">
                                        Todas
                                    </option>

                                    <option value="POR_PESSOA">
                                        Por pessoa
                                    </option>

                                    <option value="POR_PLANO">
                                        Por plano
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                        <button
                            type="button"
                            onClick={() =>
                                setMaisFiltrosAberto(
                                    (
                                        prev
                                    ) =>
                                        !prev
                                )
                            }
                            className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <Filter
                                        size={
                                            16
                                        }
                                        className="text-slate-500"
                                    />

                                    <p className="text-sm font-semibold text-slate-800">
                                        Mais filtros
                                    </p>
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    Matrícula, titular, períodos e informações da
                                    Conta Capital.
                                </p>
                            </div>

                            {maisFiltrosAberto ? (
                                <ChevronUp
                                    size={
                                        19
                                    }
                                    className="shrink-0 text-slate-500"
                                />
                            ) : (
                                <ChevronDown
                                    size={
                                        19
                                    }
                                    className="shrink-0 text-slate-500"
                                />
                            )}
                        </button>

                        {maisFiltrosAberto && (
                            <div className="space-y-5 border-t border-slate-200 bg-slate-50/50 p-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Vínculo
                                    </p>

                                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                                        Matrícula e grupo familiar
                                    </h3>

                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        Use estes campos quando precisar localizar
                                        um cadastro específico ou todo o grupo de um
                                        titular.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Matrícula
                                        </label>

                                        <input
                                            value={
                                                matricula
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setMatricula(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Digite a matrícula"
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Titular / grupo familiar
                                        </label>

                                        <input
                                            value={
                                                titular
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setTitular(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Digite o nome ou CPF do titular"
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        />

                                        <p className="mt-1 text-xs text-slate-400">
                                            Também retorna os dependentes vinculados
                                            ao titular.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                                            <CalendarDays
                                                size={
                                                    17
                                                }
                                            />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                Período
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Consulte quem entrou ou saiu do
                                                convênio em um intervalo específico.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Inclusão - de
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    dataInclusaoDe
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDataInclusaoDe(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Inclusão - até
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    dataInclusaoAte
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDataInclusaoAte(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Exclusão - de
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    dataExclusaoDe
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDataExclusaoDe(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                Exclusão - até
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    dataExclusaoAte
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDataExclusaoAte(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-fourth">
                                        Conta Capital
                                    </p>

                                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                                        Informações financeiras do associado
                                    </h3>

                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        Estes dados são consultados pela integração
                                        com a Conta Capital.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Possui Conta Capital
                                        </label>

                                        <select
                                            value={
                                                possuiContaCapital
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setPossuiContaCapital(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        >
                                            <option value="">
                                                Todos
                                            </option>

                                            <option value="SIM">
                                                Sim
                                            </option>

                                            <option value="NAO">
                                                Não
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                                            Integralização indeterminada
                                        </label>

                                        <select
                                            value={integralizacaoIndeterminada}
                                            onChange={(e) =>
                                                setIntegralizacaoIndeterminada(
                                                    e.target.value as
                                                    | ""
                                                    | "SIM"
                                                    | "NAO"
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        >
                                            <option value="">
                                                Todos
                                            </option>

                                            <option value="SIM">
                                                Sim
                                            </option>

                                            <option value="NAO">
                                                Não
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {erro && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {erro}
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs leading-5 text-slate-500">
                            {quantidadeFiltros ===
                                0
                                ? "A pesquisa mostrará todos os beneficiários cadastrados."
                                : "A pesquisa usará somente os filtros selecionados acima."}
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={
                                    limparFiltros
                                }
                                disabled={
                                    carregandoPesquisa ||
                                    quantidadeFiltros ===
                                    0
                                }
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <RotateCcw
                                    size={
                                        16
                                    }
                                />

                                Limpar filtros
                            </button>

                            <button
                                type="button"
                                onClick={
                                    pesquisar
                                }
                                disabled={
                                    carregandoPesquisa
                                }
                                className="inline-flex min-w-36 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Search
                                    size={
                                        17
                                    }
                                />

                                {carregandoPesquisa
                                    ? "Pesquisando..."
                                    : "Pesquisar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {pesquisado && (
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                    <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

                    <div className="space-y-5 p-5 md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Resultado do relatório
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Confira abaixo os beneficiários encontrados com
                                    os filtros informados.
                                </p>

                                {filtrosResultado.length > 0 && (
                                    <div className="mt-3">
                                        <p className="mb-2 text-xs font-semibold text-slate-500">
                                            Filtros aplicados nesta pesquisa
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {filtrosResultado.map(
                                                (filtro) => (
                                                    <span
                                                        key={filtro}
                                                        className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                                                    >
                                                        {filtro}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                                    <Users
                                        size={17}
                                        className="text-slate-500"
                                    />

                                    <span className="text-sm font-semibold text-slate-700">
                                        {resultados.length}{" "}
                                        {resultados.length === 1
                                            ? "beneficiário"
                                            : "beneficiários"}
                                    </span>
                                </div>

                                {resultados.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={exportarExcel}
                                        disabled={carregandoPesquisa}
                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Download size={17} />

                                        {carregandoPesquisa
                                            ? "Atualizando..."
                                            : "Exportar Excel"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {resultados.length ===
                            0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                                    <Search
                                        size={
                                            21
                                        }
                                    />
                                </div>

                                <h3 className="mt-4 text-base font-semibold text-slate-800">
                                    Nenhum beneficiário encontrado
                                </h3>

                                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                                    Tente remover algum filtro ou clique em{" "}
                                    <strong>
                                        Limpar filtros
                                    </strong>{" "}
                                    para realizar uma pesquisa mais ampla.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <th className="px-4 py-3">
                                                    Nome
                                                </th>

                                                <th className="px-4 py-3">
                                                    CPF
                                                </th>

                                                <th className="px-4 py-3">
                                                    Tipo
                                                </th>

                                                <th className="px-4 py-3">
                                                    Empresa
                                                </th>

                                                <th className="px-4 py-3">
                                                    Operadora
                                                </th>

                                                <th className="px-4 py-3">
                                                    Plano
                                                </th>

                                                <th className="px-4 py-3">
                                                    Cobrança
                                                </th>

                                                <th className="px-4 py-3">
                                                    Valor
                                                </th>

                                                <th className="px-4 py-3">
                                                    Inclusão
                                                </th>

                                                <th className="px-4 py-3">
                                                    Exclusão
                                                </th>

                                                <th className="px-4 py-3">
                                                    Status
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Detalhes
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {resultados.map(
                                                (item) => {
                                                    const detalhesAberto =
                                                        beneficiarioDetalhesAberto ===
                                                        item.ID_BENEFICIARIO;

                                                    return (
                                                        <Fragment
                                                            key={
                                                                item.ID_BENEFICIARIO
                                                            }
                                                        >
                                                            <tr
                                                                key={
                                                                    item.ID_BENEFICIARIO
                                                                }
                                                                className="transition hover:bg-gray-50"
                                                            >
                                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                                    {
                                                                        item.NM_BENEFICIARIO
                                                                    }
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {formatarCpf(
                                                                        item.NR_CPF
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {item.NM_TIPO_BENEFICIARIO ||
                                                                        item.CD_TIPO_BENEFICIARIO ||
                                                                        "—"}
                                                                </td>

                                                                <td className="px-4 py-3 text-gray-600">
                                                                    {item.NM_EMPRESA ||
                                                                        "—"}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {item.NM_OPERADORA ||
                                                                        "—"}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {item.NM_PLANO ||
                                                                        "—"}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {formatarCobranca(
                                                                        item.TP_COBRANCA
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                                                                    {formatarMoeda(
                                                                        item.VL_MENSALIDADE
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {formatarDataExcel(
                                                                        item.DT_INCLUSAO_PLANO
                                                                    ) || "—"}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                                    {formatarDataExcel(
                                                                        item.DT_EXCLUSAO_PLANO
                                                                    ) || "—"}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3">
                                                                    {item.SN_ATIVO ===
                                                                        1 ? (
                                                                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                                            Ativo
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                                            Inativo
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3">
                                                                    <div className="flex justify-end">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                toggleDetalhesBeneficiario(
                                                                                    item.ID_BENEFICIARIO
                                                                                )
                                                                            }
                                                                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-primary"
                                                                        >
                                                                            {detalhesAberto ? (
                                                                                <>
                                                                                    <ChevronUp
                                                                                        size={
                                                                                            15
                                                                                        }
                                                                                    />

                                                                                    Ocultar
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <ChevronDown
                                                                                        size={
                                                                                            15
                                                                                        }
                                                                                    />

                                                                                    Ver detalhes
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {detalhesAberto && (
                                                                <tr
                                                                    key={`detalhes-${item.ID_BENEFICIARIO}`}
                                                                >
                                                                    <td
                                                                        colSpan={
                                                                            12
                                                                        }
                                                                        className="bg-slate-50/80 px-4 py-4"
                                                                    >
                                                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                                            <div className="mb-4">
                                                                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                                                                    Informações adicionais
                                                                                </p>

                                                                                <p className="mt-1 text-xs text-slate-500">
                                                                                    Dados de vínculo e Conta Capital do beneficiário.
                                                                                </p>
                                                                            </div>

                                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Matrícula
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {item.NR_MATRICULA ||
                                                                                            "—"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Titular responsável
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {item.NM_TITULAR ||
                                                                                            (item.CD_TIPO_BENEFICIARIO ===
                                                                                                "TITULAR"
                                                                                                ? "Próprio beneficiário"
                                                                                                : "—")}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Conta Capital
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {item.NR_CONTA_CAPITAL ||
                                                                                            "—"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Situação Conta Capital
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {formatarSimNao(
                                                                                            item.SN_CONTA_CAPITAL
                                                                                        ) || "-"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Integralização indeterminada
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {formatarSimNao(
                                                                                            item.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA
                                                                                        ) ||
                                                                                            "—"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Data de inclusão
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {formatarDataExcel(
                                                                                            item.DT_INCLUSAO_PLANO
                                                                                        ) ||
                                                                                            "—"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Data de exclusão
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                                                        {formatarDataExcel(
                                                                                            item.DT_EXCLUSAO_PLANO
                                                                                        ) ||
                                                                                            "—"}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                                        Status
                                                                                    </p>

                                                                                    <div className="mt-1">
                                                                                        {item.SN_ATIVO ===
                                                                                            1 ? (
                                                                                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                                                                Ativo
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                                                                Inativo
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
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

                                <p className="text-xs text-gray-500">
                                    {
                                        resultados.length
                                    }{" "}
                                    beneficiário(s) encontrado(s).
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}