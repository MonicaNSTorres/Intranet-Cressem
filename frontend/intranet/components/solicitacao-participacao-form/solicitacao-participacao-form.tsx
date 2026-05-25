"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { FaCalendarPlus, FaSearch, FaTrash } from "react-icons/fa";
import {
    cadastrarSolicitacaoParticipacao,
    dispararEmailGerencia,
    listarCidades,
    type CidadeResponse,
} from "@/services/solicitacao_participacao.service";
import { formatCpfView, monetizarDigitacao, onlyDigits } from "@/utils/br";
import { useRouter } from "next/navigation";
import { getMeAdUser } from "@/services/auth.service";

type DiaEvento = {
    id: string;
    DT_DIA: string;
    HR_INICIO: string;
    HR_FIM: string;
};

type AuditorioData = {
    QTD_ESTIMATIVA_CONVIDADOS: string;
    SN_USO_MICROFONE: string;
    QNTD_MICROFONE: string;
    SN_USO_PROJETOR: string;
    NM_APRESENTACAO: string;
    SN_OPERADOR: string;
    SN_AO_VIVO: string;
    NM_PLATAFORMA: string;
    SN_INTERNET: string;
    DESC_JUSTIFICATIVA: string;
    OBS_AUDITORIO_SICOOB_SEDE: string;
    SN_AUDIO_EXTERNO: string;
};

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hojeISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function converterReaisParaNumero(valorFormatado: string) {
    if (!valorFormatado) return 0;

    let valorLimpo = valorFormatado.replace(/[^0-9,-]/g, "");
    valorLimpo = valorLimpo.replace(",", ".");

    const valorNumerico = parseFloat(valorLimpo);
    return Number.isNaN(valorNumerico) ? 0 : valorNumerico;
}

function formatCpfOuCnpj(value: string) {
    const digits = onlyDigits(value);

    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2")
            .slice(0, 14);
    }

    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 18);
}

const ORACLE_BYTE_BUFFER = 2;
const ORACLE_LIMITS = {
    NM_SOLICITANTE: 100,
    NM_CIDADE: 30,
    NM_FUNCIONARIO: 70,
    DESC_SOLICITACAO: 400,
    DESC_SERVICOS: 200,
    DESC_VINCULO: 200,
    DESC_RETORNO_ULTIMO_EVENTO: 300,
    DESC_RESUMO_EVENTO: 2000,
} as const;

const utf8Encoder = new TextEncoder();

function limitarTextoPorBytesOracle(value: string, limiteBanco: number) {
    const limiteSeguro = Math.max(1, limiteBanco - ORACLE_BYTE_BUFFER);
    let saida = "";
    let totalBytes = 0;

    for (const ch of String(value || "")) {
        const bytesChar = utf8Encoder.encode(ch).length;
        if (totalBytes + bytesChar > limiteSeguro) break;
        saida += ch;
        totalBytes += bytesChar;
    }

    return saida;
}

function normalizarOracleUpper(value: string, limiteBanco: number) {
    return limitarTextoPorBytesOracle(
        String(value || "").trim().toUpperCase(),
        limiteBanco
    );
}

export function SolicitacaoParticipacaoForm() {
    const router = useRouter();

    const handleClick = () => {
        router.push("/auth/gerenciamento_participacao");
    };

    const [loading, setLoading] = useState(false);
    const submitLockRef = useRef(false);
    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");
    const alertRef = useRef<HTMLDivElement | null>(null);
    const oficioInputRef = useRef<HTMLInputElement | null>(null);
    const subirParaAlerta = () => {
        window.requestAnimationFrame(() => {
            alertRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const mostrarErro = (mensagem: string) => {
        setInfo("");
        setErro(mensagem);
        subirParaAlerta();
    };

    const [cidades, setCidades] = useState<CidadeResponse[]>([]);

    const [nomeFantasia, setNomeFantasia] = useState("");
    const [cpfCnpj, setCpfCnpj] = useState("");
    const [cidade, setCidade] = useState("");

    const [semFinsLucrativos, setSemFinsLucrativos] = useState("0");
    const [docSemFins, setDocSemFins] = useState<File | null>(null);

    const [dias, setDias] = useState<DiaEvento[]>([]);

    const [precisaValorMonetario, setPrecisaValorMonetario] = useState("0");
    const [valorSolicitado, setValorSolicitado] = useState("");

    const [precisaInsumo, setPrecisaInsumo] = useState("0");
    const [estimativaInsumo, setEstimativaInsumo] = useState("");

    const [precisaAuditorio, setPrecisaAuditorio] = useState("0");
    const [auditorioCentro, setAuditorioCentro] = useState(false);
    const [auditorioSede, setAuditorioSede] = useState(false);

    const [precisaMotorista, setPrecisaMotorista] = useState("0");
    const [precisaFuncionarios, setPrecisaFuncionarios] = useState("0");

    const [solicitacao, setSolicitacao] = useState("");
    const [resumoEvento, setResumoEvento] = useState("");

    const [contaCooperativa, setContaCooperativa] = useState("");
    const [vinculo, setVinculo] = useState("");
    const [servicos, setServicos] = useState("");
    const [saldoMedio, setSaldoMedio] = useState("");
    const [rentMaq, setRentMaq] = useState("");

    const [eventoAnterior, setEventoAnterior] = useState("0");
    const [retornoUltimoEvento, setRetornoUltimoEvento] = useState("");

    const [funcionario, setFuncionario] = useState("");
    const [oficio, setOficio] = useState<File | null>(null);
    const [diaSolicitacao, setDiaSolicitacao] = useState(hojeISO());

    const [openAuditorioModal, setOpenAuditorioModal] = useState(false);

    const [auditorio, setAuditorio] = useState<AuditorioData>({
        QTD_ESTIMATIVA_CONVIDADOS: "",
        SN_USO_MICROFONE: "",
        QNTD_MICROFONE: "",
        SN_USO_PROJETOR: "",
        NM_APRESENTACAO: "",
        SN_AUDIO_EXTERNO: "",
        SN_OPERADOR: "",
        SN_AO_VIVO: "",
        NM_PLATAFORMA: "",
        SN_INTERNET: "",
        DESC_JUSTIFICATIVA: "",
        OBS_AUDITORIO_SICOOB_SEDE: "",
    });

    useEffect(() => {
        async function carregarDadosIniciais() {
            try {
                setDiaSolicitacao(hojeISO());

                const me = await getMeAdUser();
                setFuncionario(me?.nome_completo || "");
            } catch (err: any) {
                console.error("Erro ao buscar usuário logado:", err);
                setErro(err?.message || "Falha ao carregar o usuário logado.");
            }
        }

        carregarDadosIniciais();
    }, []);

    useEffect(() => {
        setDiaSolicitacao(hojeISO());

        const nome =
            typeof window !== "undefined"
                ? localStorage.getItem("nome_completo") ||
                localStorage.getItem("user_name") ||
                ""
                : "";

        setFuncionario(nome);
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const data = await listarCidades();
                setCidades(data);
            } catch (err: any) {
                setErro(err?.message || "Falha ao carregar cidades.");
            }
        }

        load();
    }, []);

    useEffect(() => {
        if (precisaAuditorio === "0") {
            setAuditorioCentro(false);
            setAuditorioSede(false);
        }
    }, [precisaAuditorio]);

    useEffect(() => {
        if ((erro || info) && alertRef.current) {
            alertRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [erro, info]);

    const cidadesOrdenadas = useMemo(() => {
        const nomes = cidades
            .map((item) => {
                if (typeof item === "string") return item.trim();
                return String(item?.NM_CIDADE || item?.nome || "").trim();
            })
            .filter(Boolean);

        return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
    }, [cidades]);

    const adicionarDiaEvento = () => {
        setDias((prev) => [
            ...prev,
            {
                id: generateId(),
                DT_DIA: "",
                HR_INICIO: "",
                HR_FIM: "",
            },
        ]);
    };

    const removerDiaEvento = (id: string) => {
        setDias((prev) => prev.filter((item) => item.id !== id));
    };

    const updateDiaEvento = (
        id: string,
        field: keyof Omit<DiaEvento, "id">,
        value: string
    ) => {
        setDias((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item
            )
        );
    };

    const updateAuditorio = (field: keyof AuditorioData, value: string) => {
        setAuditorio((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const getPlataformaString = () => {
        return auditorio.NM_PLATAFORMA.trim();
    };

    const validaCamposAuditorio = () => {
        if (!auditorio.QTD_ESTIMATIVA_CONVIDADOS) {
            mostrarErro("Preencha a estimativa de convidados.");
            return false;
        }

        if (!auditorio.SN_USO_MICROFONE) {
            mostrarErro("Selecione o uso de microfone.");
            return false;
        }

        if (
            auditorio.SN_USO_MICROFONE === "1" &&
            !auditorio.QNTD_MICROFONE.trim()
        ) {
            mostrarErro("Preencha a quantidade de microfones.");
            return false;
        }

        if (!auditorio.SN_USO_PROJETOR) {
            mostrarErro("Selecione o uso do projetor.");
            return false;
        }

        if (
            auditorio.SN_USO_PROJETOR === "1" &&
            !auditorio.NM_APRESENTACAO.trim()
        ) {
            mostrarErro("Selecione o tipo de apresentação.");
            return false;
        }

        if (!auditorio.SN_AUDIO_EXTERNO) {
            mostrarErro("Selecione o uso de áudio externo.");
            return false;
        }

        if (!auditorio.SN_OPERADOR) {
            mostrarErro("Selecione o operador do som/apresentação.");
            return false;
        }

        if (!auditorio.SN_AO_VIVO) {
            mostrarErro("Selecione se haverá transmissão ao vivo.");
            return false;
        }

        if (auditorio.SN_AO_VIVO === "1" && !getPlataformaString()) {
            mostrarErro("Selecione ao menos uma plataforma de transmissão.");
            return false;
        }

        if (!auditorio.SN_INTERNET) {
            mostrarErro("Selecione se precisa de internet dedicada.");
            return false;
        }

        if (
            auditorio.SN_INTERNET === "1" &&
            !auditorio.DESC_JUSTIFICATIVA.trim()
        ) {
            mostrarErro("Preencha a justificativa da internet.");
            return false;
        }

        if (!auditorio.OBS_AUDITORIO_SICOOB_SEDE.trim()) {
            mostrarErro("Preencha as observações adicionais do auditório.");
            return false;
        }

        return true;
    };

    const validarCampos = () => {
        if (!funcionario.trim()) {
            mostrarErro("Não foi possível identificar o funcionário logado.");
            return false;
        }

        if (!nomeFantasia.trim()) {
            mostrarErro("Preencha o Nome Fantasia.");
            return false;
        }

        if (!cpfCnpj.trim()) {
            mostrarErro("Preencha o CPF/CNPJ.");
            return false;
        }

        const tamanhoCpfCnpj = cpfCnpj.length;
        if (tamanhoCpfCnpj !== 14 && tamanhoCpfCnpj !== 18) {
            mostrarErro("Preencha com o número correto de caracteres do CPF ou CNPJ.");
            return false;
        }

        if (!cidade.trim()) {
            mostrarErro("Selecione a cidade.");
            return false;
        }

        if (semFinsLucrativos === "1" && !docSemFins) {
            mostrarErro("Anexe o comprovante de Entidade Sem Fins Lucrativos.");
            return false;
        }

        if (!dias.length) {
            mostrarErro("Adicione o(s) dia(s) do evento.");
            return false;
        }

        for (const dia of dias) {
            if (!dia.DT_DIA || !dia.HR_INICIO || !dia.HR_FIM) {
                mostrarErro("Preencha todos os campos de data e hora do evento.");
                return false;
            }
        }

        if (precisaValorMonetario === "1" && !valorSolicitado.trim()) {
            mostrarErro("Preencha o valor desejado.");
            return false;
        }

        if (precisaInsumo === "1" && !estimativaInsumo.trim()) {
            mostrarErro("Preencha a estimativa de valor.");
            return false;
        }

        if (precisaAuditorio === "1" && !auditorioCentro && !auditorioSede) {
            mostrarErro("Selecione ao menos um local: Centro de Convivência ou Sede.");
            return false;
        }

        if (!solicitacao.trim()) {
            mostrarErro("Preencha a Solicitação.");
            return false;
        }

        if (!resumoEvento.trim()) {
            mostrarErro("Preencha o resumo do evento.");
            return false;
        }

        if (!contaCooperativa) {
            mostrarErro("Selecione se possui conta na cooperativa.");
            return false;
        }

        if (contaCooperativa === "1") {
            if (!servicos.trim()) {
                mostrarErro("Preencha os serviços que a solicitante possui.");
                return false;
            }

            if (!saldoMedio.trim()) {
                mostrarErro("Preencha o saldo médio da conta corrente.");
                return false;
            }

            if (!rentMaq.trim()) {
                mostrarErro("Preencha a rentabilidade da maquininha.");
                return false;
            }
        }

        if (!vinculo.trim()) {
            mostrarErro("Preencha o vínculo do solicitante.");
            return false;
        }

        if (eventoAnterior === "1" && !retornoUltimoEvento.trim()) {
            mostrarErro("Preencha o retorno do último evento.");
            return false;
        }

        if (!oficio) {
            mostrarErro("Anexe o Ofício.");
            return false;
        }

        if (auditorioSede && !validaCamposAuditorio()) {
            return false;
        }

        return true;
    };

    const limparAuditorio = () => {
        setAuditorio({
            QTD_ESTIMATIVA_CONVIDADOS: "",
            SN_USO_MICROFONE: "",
            QNTD_MICROFONE: "",
            SN_USO_PROJETOR: "",
            NM_APRESENTACAO: "",
            SN_AUDIO_EXTERNO: "",
            SN_OPERADOR: "",
            SN_AO_VIVO: "",
            NM_PLATAFORMA: "",
            SN_INTERNET: "",
            DESC_JUSTIFICATIVA: "",
            OBS_AUDITORIO_SICOOB_SEDE: "",
        });
    };

    const limparTudo = () => {
        setNomeFantasia("");
        setCpfCnpj("");
        setCidade("");
        setSemFinsLucrativos("0");
        setDocSemFins(null);
        setDias([]);
        setPrecisaValorMonetario("0");
        setValorSolicitado("");
        setPrecisaInsumo("0");
        setEstimativaInsumo("");
        setPrecisaAuditorio("0");
        setAuditorioCentro(false);
        setAuditorioSede(false);
        setPrecisaMotorista("0");
        setPrecisaFuncionarios("0");
        setSolicitacao("");
        setResumoEvento("");
        setContaCooperativa("");
        setVinculo("");
        setServicos("");
        setSaldoMedio("");
        setRentMaq("");
        setEventoAnterior("0");
        setRetornoUltimoEvento("");
        setOficio(null);
        if (oficioInputRef.current) {
            oficioInputRef.current.value = "";
        }
        setDiaSolicitacao(hojeISO());
        limparAuditorio();
    };

    const togglePlataforma = (nome: string, checked: boolean) => {
        const atual = getPlataformaString()
            .split(" ")
            .map((item) => item.trim())
            .filter(Boolean);

        let novaLista = [...atual];

        if (checked) {
            if (!novaLista.includes(nome)) novaLista.push(nome);
        } else {
            novaLista = novaLista.filter((item) => item !== nome);
        }

        updateAuditorio("NM_PLATAFORMA", novaLista.join(" "));
    };

    const isPlataformaChecked = (nome: string) => {
        return getPlataformaString().split(" ").includes(nome);
    };

    const onSalvarAuditorio = () => {
        setErro("");
        if (!validaCamposAuditorio()) {
            subirParaAlerta();
            return;
        }
        setOpenAuditorioModal(false);
        setInfo("Dados do auditório sede preenchidos com sucesso.");
    };

    const cadastrar = async () => {
        if (loading || submitLockRef.current) return;

        setErro("");
        setInfo("");

        if (!validarCampos()) return;

        submitLockRef.current = true;

        try {
            setLoading(true);

            const formData = new FormData();
            const nmSolicitanteOracle = normalizarOracleUpper(
                nomeFantasia,
                ORACLE_LIMITS.NM_SOLICITANTE
            );
            const nmCidadeOracle = normalizarOracleUpper(
                cidade,
                ORACLE_LIMITS.NM_CIDADE
            );
            const nmFuncionarioOracle = normalizarOracleUpper(
                funcionario,
                ORACLE_LIMITS.NM_FUNCIONARIO
            );
            const descServicosOracle = normalizarOracleUpper(
                servicos,
                ORACLE_LIMITS.DESC_SERVICOS
            );
            const descVinculoOracle = normalizarOracleUpper(
                vinculo,
                ORACLE_LIMITS.DESC_VINCULO
            );
            const descRetornoOracle = normalizarOracleUpper(
                retornoUltimoEvento,
                ORACLE_LIMITS.DESC_RETORNO_ULTIMO_EVENTO
            );
            const descSolicitacaoOracle = normalizarOracleUpper(
                solicitacao,
                ORACLE_LIMITS.DESC_SOLICITACAO
            );
            const descResumoOracle = normalizarOracleUpper(
                resumoEvento,
                ORACLE_LIMITS.DESC_RESUMO_EVENTO
            );

            formData.append("NM_SOLICITANTE", nmSolicitanteOracle);
            formData.append("NR_CPF_CNPJ", onlyDigits(cpfCnpj));
            formData.append("NM_FUNCIONARIO", nmFuncionarioOracle);
            formData.append("NM_CIDADE", nmCidadeOracle);
            formData.append("DT_SOLICITACAO", diaSolicitacao);
            formData.append("NM_ANDAMENTO", "Pendente Gerência");
            formData.append("CD_CONTA_COOPERATIVA", contaCooperativa || "0");
            formData.append(
                "VL_SALDO_MEDCIOCC",
                String(converterReaisParaNumero(saldoMedio))
            );
            formData.append("DESC_SERVICOS", descServicosOracle);
            formData.append("DESC_VINCULO", descVinculoOracle);
            formData.append(
                "DESC_RETORNO_ULTIMO_EVENTO",
                descRetornoOracle
            );
            formData.append(
                "VL_RENTABILIDADE_MAQUININHA",
                String(converterReaisParaNumero(rentMaq))
            );

            formData.append("DESC_SOLICITACAO", descSolicitacaoOracle);
            formData.append("CD_MOTORISTA", precisaMotorista);
            formData.append("CD_FUNCIONARIOS", precisaFuncionarios);
            formData.append("DESC_RESUMO_EVENTO", descResumoOracle);
            formData.append(
                "VL_PATROCINIO",
                String(converterReaisParaNumero(valorSolicitado))
            );
            formData.append("VL_MONETARIO", precisaValorMonetario);
            formData.append(
                "VL_ESTIMATIVA",
                String(converterReaisParaNumero(estimativaInsumo))
            );
            formData.append("SN_SEM_FINS_LUCATRIVOS", semFinsLucrativos);
            formData.append("QTD_INSUMO", precisaInsumo);
            formData.append("CD_AUDITORIO_CENTRO", auditorioCentro ? "1" : "0");
            formData.append("CD_AUDITORIO_SEDE", auditorioSede ? "1" : "0");

            formData.append(
                "DIAS",
                JSON.stringify(
                    dias.map((item) => ({
                        DT_DIA: item.DT_DIA,
                        HR_INICIO: item.HR_INICIO,
                        HR_FIM: item.HR_FIM,
                    }))
                )
            );

            if (auditorioSede) {
                formData.append(
                    "AUDITORIO",
                    JSON.stringify({
                        QTD_ESTIMATIVA_CONVIDADOS: auditorio.QTD_ESTIMATIVA_CONVIDADOS,
                        SN_USO_MICROFONE: auditorio.SN_USO_MICROFONE || 0,
                        QNTD_MICROFONE: auditorio.QNTD_MICROFONE || 0,
                        SN_USO_PROJETOR: auditorio.SN_USO_PROJETOR || 0,
                        NM_APRESENTACAO: auditorio.NM_APRESENTACAO || "",
                        SN_AUDIO_EXTERNO: auditorio.SN_AUDIO_EXTERNO || 0,
                        SN_OPERADOR: auditorio.SN_OPERADOR || 0,
                        SN_AO_VIVO: auditorio.SN_AO_VIVO || 0,
                        NM_PLATAFORMA: auditorio.NM_PLATAFORMA || "",
                        SN_INTERNET: auditorio.SN_INTERNET || 0,
                        DESC_JUSTIFICATIVA: auditorio.DESC_JUSTIFICATIVA || "",
                        OBS_AUDITORIO_SICOOB_SEDE:
                            auditorio.OBS_AUDITORIO_SICOOB_SEDE || "",
                    })
                );
            }

            if (docSemFins) {
                formData.append("DIR_DOC_SEM_FINS_LUCRATIVO", docSemFins);
            }

            if (oficio) {
                formData.append("DIR_OFICIO", oficio);
            }

            const response = await cadastrarSolicitacaoParticipacao(formData);
            const idPatrocinio = response?.ID_PATROCINIO;
            const duplicidadeIgnorada = Boolean(response?.DUPLICIDADE_IGNORADA);

            if (idPatrocinio && !duplicidadeIgnorada) {
                await dispararEmailGerencia({
                    funcionario,
                    empresa: nmSolicitanteOracle,
                    patrocinioId: idPatrocinio,
                });
            }

            limparTudo();
            setInfo(response?.message || "Solicitação cadastrada com sucesso.");
        } catch (err: any) {
            setErro(err?.message || "Falha ao cadastrar solicitação.");
        } finally {
            setLoading(false);
            submitLockRef.current = false;
        }
    };

    return (
        <>
            <div className="mx-auto rounded-xl bg-white p-6 shadow">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div />
                    <button
                        type="button"
                        onClick={handleClick}
                        className="rounded-lg bg-secondary px-6 py-2 text-md font-semibold text-white hover:bg-primary cursor-pointer"
                    >
                        Consulta Participação de Marketing
                    </button>
                </div>

                <div ref={alertRef} />

                {erro && (
                    <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {erro}
                    </div>
                )}

                {info && (
                    <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        {info}
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Nome Fantasia
                        </label>
                        <input
                            value={nomeFantasia}
                            onChange={(e) =>
                                setNomeFantasia(
                                    limitarTextoPorBytesOracle(
                                        e.target.value,
                                        ORACLE_LIMITS.NM_SOLICITANTE
                                    )
                                )
                            }
                            className="w-full rounded border px-3 py-2"
                            maxLength={ORACLE_LIMITS.NM_SOLICITANTE}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                CPF/CNPJ
                            </label>
                            <input
                                value={cpfCnpj}
                                onChange={(e) => setCpfCnpj(formatCpfOuCnpj(e.target.value))}
                                className="w-full rounded border px-3 py-2"
                                maxLength={18}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Cidade destino
                            </label>
                            <select
                                value={cidade}
                                onChange={(e) =>
                                    setCidade(
                                        limitarTextoPorBytesOracle(
                                            e.target.value,
                                            ORACLE_LIMITS.NM_CIDADE
                                        )
                                    )
                                }
                                className="w-full rounded border px-3 py-2"
                            >
                                <option value="">Selecione uma cidade</option>
                                {cidadesOrdenadas.map((item, index) => (
                                    <option key={`${item}-${index}`} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-gray-600">
                            Entidade Sem Fins Lucrativos?
                        </label>
                        <div className="flex flex-wrap gap-4 rounded border p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="sem-fins"
                                    checked={semFinsLucrativos === "1"}
                                    onChange={() => setSemFinsLucrativos("1")}
                                />
                                Sim
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="sem-fins"
                                    checked={semFinsLucrativos === "0"}
                                    onChange={() => setSemFinsLucrativos("0")}
                                />
                                Não
                            </label>
                        </div>
                    </div>

                    {semFinsLucrativos === "1" && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Declaração de Utilidade Pública
                            </label>
                            <input
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => setDocSemFins(e.target.files?.[0] || null)}
                                className="w-full rounded border px-3 py-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {docSemFins ? docSemFins.name : "Nenhum arquivo selecionado"}
                            </p>
                        </div>
                    )}

                    <div className="border-t pt-5">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="block text-xs font-medium text-gray-600">
                                Dia(s) do Evento
                            </label>
                            <button
                                type="button"
                                onClick={adicionarDiaEvento}
                                className="inline-flex items-center gap-2 rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
                            >
                                <FaCalendarPlus size={12} />
                                Adicionar Hora e dia
                            </button>
                        </div>

                        <div className="space-y-3">
                            {dias.length === 0 ? (
                                <div className="rounded border border-dashed p-4 text-sm text-gray-500">
                                    Nenhum dia adicionado ainda.
                                </div>
                            ) : (
                                dias.map((dia) => (
                                    <div
                                        key={dia.id}
                                        className="grid grid-cols-1 gap-3 rounded border p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                                    >
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                                Data
                                            </label>

                                            <input
                                                type="date"
                                                value={dia.DT_DIA}
                                                onChange={(e) =>
                                                    updateDiaEvento(dia.id, "DT_DIA", e.target.value)
                                                }
                                                className="w-full rounded border px-3 py-2"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                                Hora Inicial
                                            </label>

                                            <input
                                                type="time"
                                                value={dia.HR_INICIO}
                                                onChange={(e) =>
                                                    updateDiaEvento(dia.id, "HR_INICIO", e.target.value)
                                                }
                                                className="w-full rounded border px-3 py-2"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                                Hora Final
                                            </label>

                                            <input
                                                type="time"
                                                value={dia.HR_FIM}
                                                onChange={(e) =>
                                                    updateDiaEvento(dia.id, "HR_FIM", e.target.value)
                                                }
                                                className="w-full rounded border px-3 py-2"
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => removerDiaEvento(dia.id)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-600">
                                Precisa de Valor Monetário?
                            </label>
                            <div className="flex flex-wrap gap-4 rounded border p-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaValorMonetario === "1"}
                                        onChange={() => setPrecisaValorMonetario("1")}
                                    />
                                    Sim
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaValorMonetario === "0"}
                                        onChange={() => setPrecisaValorMonetario("0")}
                                    />
                                    Não
                                </label>
                            </div>
                        </div>

                        {precisaValorMonetario === "1" && (
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Valor Solicitado
                                </label>
                                <input
                                    value={valorSolicitado}
                                    onChange={(e) =>
                                        setValorSolicitado(monetizarDigitacao(e.target.value))
                                    }
                                    className="w-full rounded border px-3 py-2 text-right"
                                    placeholder="R$ 0,00"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-600">
                                Compra de Insumos?
                            </label>
                            <div className="flex flex-wrap gap-4 rounded border p-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaInsumo === "1"}
                                        onChange={() => setPrecisaInsumo("1")}
                                    />
                                    Sim
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaInsumo === "0"}
                                        onChange={() => setPrecisaInsumo("0")}
                                    />
                                    Não
                                </label>
                            </div>
                        </div>

                        {precisaInsumo === "1" && (
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Estimativa de Valor Monetário
                                </label>
                                <input
                                    value={estimativaInsumo}
                                    onChange={(e) =>
                                        setEstimativaInsumo(monetizarDigitacao(e.target.value))
                                    }
                                    className="w-full rounded border px-3 py-2 text-right"
                                    placeholder="R$ 0,00"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-600">
                                Precisa do Auditório?
                            </label>
                            <div className="flex flex-wrap gap-4 rounded border p-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaAuditorio === "1"}
                                        onChange={() => setPrecisaAuditorio("1")}
                                    />
                                    Sim
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaAuditorio === "0"}
                                        onChange={() => setPrecisaAuditorio("0")}
                                    />
                                    Não
                                </label>
                            </div>
                        </div>

                        {precisaAuditorio === "1" && (
                            <>
                                <label className="flex items-center gap-2 rounded border p-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={auditorioCentro}
                                        onChange={(e) => setAuditorioCentro(e.target.checked)}
                                    />
                                    Centro de Convivência
                                </label>

                                <label className="flex items-center justify-between gap-2 rounded border p-3 text-sm">
                                    <span className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={auditorioSede}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setAuditorioSede(checked);
                                                if (checked) setOpenAuditorioModal(true);
                                            }}
                                        />
                                        Sede
                                    </span>

                                    {auditorioSede && (
                                        <button
                                            type="button"
                                            onClick={() => setOpenAuditorioModal(true)}
                                            className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                                        >
                                            Configurar
                                        </button>
                                    )}
                                </label>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-600">
                                Precisa de Motorista?
                            </label>
                            <div className="flex flex-wrap gap-4 rounded border p-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaMotorista === "1"}
                                        onChange={() => setPrecisaMotorista("1")}
                                    />
                                    Sim
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaMotorista === "0"}
                                        onChange={() => setPrecisaMotorista("0")}
                                    />
                                    Não
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-600">
                                Precisa de Funcionários?
                            </label>
                            <div className="flex flex-wrap gap-4 rounded border p-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaFuncionarios === "1"}
                                        onChange={() => setPrecisaFuncionarios("1")}
                                    />
                                    Sim
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={precisaFuncionarios === "0"}
                                        onChange={() => setPrecisaFuncionarios("0")}
                                    />
                                    Não
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Solicitação
                        </label>
                        <textarea
                            value={solicitacao}
                            onChange={(e) =>
                                setSolicitacao(
                                    limitarTextoPorBytesOracle(
                                        e.target.value,
                                        ORACLE_LIMITS.DESC_SOLICITACAO
                                    )
                                )
                            }
                            className="w-full rounded border px-3 py-2"
                            rows={5}
                            maxLength={ORACLE_LIMITS.DESC_SOLICITACAO}
                            placeholder="Detalhe sua solicitação de patrocínio, incluindo evento, datas, valores, contrapartidas e demais informações."
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Resumo do evento
                        </label>
                        <textarea
                            value={resumoEvento}
                            onChange={(e) =>
                                setResumoEvento(
                                    limitarTextoPorBytesOracle(
                                        e.target.value,
                                        ORACLE_LIMITS.DESC_RESUMO_EVENTO
                                    )
                                )
                            }
                            className="w-full rounded border px-3 py-2"
                            rows={6}
                            maxLength={ORACLE_LIMITS.DESC_RESUMO_EVENTO}
                            placeholder="Informe um resumo claro do evento e seu objetivo."
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Conta na Cooperativa?
                            </label>
                            <select
                                value={contaCooperativa}
                                onChange={(e) => setContaCooperativa(e.target.value)}
                                className="w-full rounded border px-3 py-2"
                            >
                                <option value="">Selecione</option>
                                <option value="1">SIM</option>
                                <option value="0">NÃO</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Vínculo
                            </label>
                            <textarea
                                value={vinculo}
                                onChange={(e) =>
                                    setVinculo(
                                        limitarTextoPorBytesOracle(
                                            e.target.value,
                                            ORACLE_LIMITS.DESC_VINCULO
                                        )
                                    )
                                }
                                className="w-full rounded border px-3 py-2"
                                rows={2}
                                maxLength={ORACLE_LIMITS.DESC_VINCULO}
                            />
                        </div>
                    </div>

                    {contaCooperativa === "1" && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Produtos/Serviços
                                </label>
                                <textarea
                                    value={servicos}
                                    onChange={(e) =>
                                        setServicos(
                                            limitarTextoPorBytesOracle(
                                                e.target.value,
                                                ORACLE_LIMITS.DESC_SERVICOS
                                            )
                                        )
                                    }
                                    className="w-full rounded border px-3 py-2"
                                    rows={2}
                                    maxLength={ORACLE_LIMITS.DESC_SERVICOS}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Sal. Méd. C/C
                                    </label>
                                    <input
                                        value={saldoMedio}
                                        onChange={(e) =>
                                            setSaldoMedio(monetizarDigitacao(e.target.value))
                                        }
                                        className="w-full rounded border px-3 py-2 text-right"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Rent. Máq.
                                    </label>
                                    <input
                                        value={rentMaq}
                                        onChange={(e) =>
                                            setRentMaq(monetizarDigitacao(e.target.value))
                                        }
                                        className="w-full rounded border px-3 py-2 text-right"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="mb-2 block text-xs font-medium text-gray-600">
                            Já realizou algum evento conosco anteriormente?
                        </label>
                        <div className="flex flex-wrap gap-4 rounded border p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={eventoAnterior === "1"}
                                    onChange={() => setEventoAnterior("1")}
                                />
                                Sim
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={eventoAnterior === "0"}
                                    onChange={() => setEventoAnterior("0")}
                                />
                                Não
                            </label>
                        </div>
                    </div>

                    {eventoAnterior === "1" && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Retorno do último evento
                            </label>
                            <textarea
                                value={retornoUltimoEvento}
                                onChange={(e) =>
                                    setRetornoUltimoEvento(
                                        limitarTextoPorBytesOracle(
                                            e.target.value,
                                            ORACLE_LIMITS.DESC_RETORNO_ULTIMO_EVENTO
                                        )
                                    )
                                }
                                className="w-full rounded border px-3 py-2"
                                rows={5}
                                maxLength={ORACLE_LIMITS.DESC_RETORNO_ULTIMO_EVENTO}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Funcionário
                            </label>
                            <input
                                value={funcionario || "Carregando usuário..."}
                                readOnly
                                className="w-full rounded border bg-gray-50 px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Adicionar Ofício
                            </label>
                            <input
                                ref={oficioInputRef}
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => setOficio(e.target.files?.[0] || null)}
                                className="w-full rounded border px-3 py-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {oficio ? oficio.name : "Nenhum arquivo selecionado"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                                Dia da Solicitação
                            </label>
                            <input
                                type="date"
                                value={diaSolicitacao}
                                readOnly
                                className="w-full rounded border bg-gray-50 px-3 py-2"
                            />
                        </div>

                        <div className="flex items-end justify-end">
                            <button
                                type="button"
                                onClick={cadastrar}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? "Cadastrando..." : "Cadastrar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {openAuditorioModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Informações importantes para a reserva do Auditório Sede
                            </h2>
                            <button
                                type="button"
                                onClick={() => setOpenAuditorioModal(false)}
                                className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_180px]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Estimativa de convidados
                                    </label>
                                    <input
                                        value={auditorio.QTD_ESTIMATIVA_CONVIDADOS}
                                        onChange={(e) =>
                                            updateAuditorio("QTD_ESTIMATIVA_CONVIDADOS", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        USO DE MICROFONE?
                                    </label>
                                    <select
                                        value={auditorio.SN_USO_MICROFONE}
                                        onChange={(e) =>
                                            updateAuditorio("SN_USO_MICROFONE", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>

                                {auditorio.SN_USO_MICROFONE === "1" && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Quantos?
                                        </label>
                                        <input
                                            value={auditorio.QNTD_MICROFONE}
                                            onChange={(e) =>
                                                updateAuditorio("QNTD_MICROFONE", e.target.value)
                                            }
                                            className="w-full rounded border px-3 py-2"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        USO DE PROJEÇÃO? (DATASHOW/TELA)
                                    </label>
                                    <select
                                        value={auditorio.SN_USO_PROJETOR}
                                        onChange={(e) =>
                                            updateAuditorio("SN_USO_PROJETOR", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>

                                {auditorio.SN_USO_PROJETOR === "1" && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            APRESENTAÇÃO VIA
                                        </label>
                                        <select
                                            value={auditorio.NM_APRESENTACAO}
                                            onChange={(e) =>
                                                updateAuditorio("NM_APRESENTACAO", e.target.value)
                                            }
                                            className="w-full rounded border px-3 py-2"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="POSSUI NOTEBOOK PROPRIO">
                                                NOTEBOOK PRÓPRIO
                                            </option>
                                            <option value="PRECISA DE NOTEBOOK DO TI">
                                                PRECISA DE NOTEBOOK DO TI
                                            </option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        USO DE ÁUDIO EXTERNO
                                    </label>
                                    <select
                                        value={auditorio.SN_AUDIO_EXTERNO}
                                        onChange={(e) =>
                                            updateAuditorio("SN_AUDIO_EXTERNO", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        TEM OPERADOR DO SOM/APRESENTAÇÃO?
                                    </label>
                                    <select
                                        value={auditorio.SN_OPERADOR}
                                        onChange={(e) =>
                                            updateAuditorio("SN_OPERADOR", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        HAVERÁ TRANSMISSÃO AO VIVO?
                                    </label>
                                    <select
                                        value={auditorio.SN_AO_VIVO}
                                        onChange={(e) =>
                                            updateAuditorio("SN_AO_VIVO", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>

                                {auditorio.SN_AO_VIVO === "1" && (
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-gray-600">
                                            Plataforma
                                        </label>
                                        <div className="flex flex-wrap gap-4 rounded border p-3">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={isPlataformaChecked("Youtube")}
                                                    onChange={(e) =>
                                                        togglePlataforma("Youtube", e.target.checked)
                                                    }
                                                />
                                                Youtube
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={isPlataformaChecked("Zoom")}
                                                    onChange={(e) =>
                                                        togglePlataforma("Zoom", e.target.checked)
                                                    }
                                                />
                                                Zoom
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={isPlataformaChecked("Teams")}
                                                    onChange={(e) =>
                                                        togglePlataforma("Teams", e.target.checked)
                                                    }
                                                />
                                                Teams
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-600">
                                        INTERNET DEDICADA?
                                    </label>
                                    <select
                                        value={auditorio.SN_INTERNET}
                                        onChange={(e) =>
                                            updateAuditorio("SN_INTERNET", e.target.value)
                                        }
                                        className="w-full rounded border px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="1">SIM</option>
                                        <option value="0">NÃO</option>
                                    </select>
                                </div>

                                {auditorio.SN_INTERNET === "1" && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Justifique
                                        </label>
                                        <input
                                            value={auditorio.DESC_JUSTIFICATIVA}
                                            onChange={(e) =>
                                                updateAuditorio("DESC_JUSTIFICATIVA", e.target.value)
                                            }
                                            className="w-full rounded border px-3 py-2"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Observações adicionais
                                </label>
                                <textarea
                                    value={auditorio.OBS_AUDITORIO_SICOOB_SEDE}
                                    onChange={(e) =>
                                        updateAuditorio(
                                            "OBS_AUDITORIO_SICOOB_SEDE",
                                            e.target.value
                                        )
                                    }
                                    className="w-full rounded border px-3 py-2"
                                    rows={4}
                                />
                            </div>

                            <div className="flex justify-end border-t pt-4">
                                <button
                                    type="button"
                                    onClick={onSalvarAuditorio}
                                    className="rounded bg-secondary px-5 py-2 text-sm font-semibold text-white hover:bg-primary"
                                >
                                    Salvar informações do auditório
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}





