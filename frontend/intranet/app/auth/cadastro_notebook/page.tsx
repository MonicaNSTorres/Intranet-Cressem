"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaList } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { FaLaptop, FaSave, FaUser } from "react-icons/fa";
import {
    buscarFuncionariosNotebook,
    cadastrarNotebook,
    type FuncionarioOption,
} from "@/services/cadastro_notebook.service";
import {
    canAccess,
    PAGE_ACCESS,
    type AuthUserLike,
} from "@/lib/access-control";
import { getMeAdUser } from "@/services/auth.service";

type NotebookFormData = {
    NM_NOTEBOOK: string;
    NM_MODELO: string;
    DT_INICIO_OPERACAO: string;
    DT_GARANTIA: string;
    NR_MAC: string;
    CD_PATRIMONIO: string;
    NR_IP: string;
    NR_BITLOCKER: string;
    OBS_NOTEBOOKS_SICOOB: string;
    DESC_SITUACAO: string;

    ID_FUNCIONARIO: string;
    NM_FUNCIONARIO: string;

    NM_FUNCIONARIO_TI: string;
};

const initialState: NotebookFormData = {
    NM_NOTEBOOK: "",
    NM_MODELO: "",
    DT_INICIO_OPERACAO: "",
    DT_GARANTIA: "",
    NR_MAC: "",
    CD_PATRIMONIO: "",
    NR_IP: "",
    NR_BITLOCKER: "",
    OBS_NOTEBOOKS_SICOOB: "",
    ID_FUNCIONARIO: "",
    NM_FUNCIONARIO: "",
    NM_FUNCIONARIO_TI: "",
    DESC_SITUACAO: "",
};

const funcionariosTI = [
    "Fabio da Silva Prado",
    "Monica Nathalia Sousa Torres",
    "Ricardo Henrique Guilhem da Silva",
    "Thiago Moreira Santos",
];

const buttonBase =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
const primaryButtonClass = `${buttonBase} bg-secondary text-white hover:bg-primary`;
const accentButtonClass = `${buttonBase} border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white`;
const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-title outline-none shadow-sm transition placeholder:text-text-darken-placeholder focus:border-primary focus:ring-2 focus:ring-primary/10";
const textareaClass =
    "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-title outline-none shadow-sm transition placeholder:text-text-darken-placeholder focus:border-primary focus:ring-2 focus:ring-primary/10";
const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const labelClass = "mb-1 block text-xs font-bold uppercase text-slate-600";

export default function CadastroNotebookPage() {
    const [form, setForm] = useState<NotebookFormData>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
    const [showFuncionarios, setShowFuncionarios] = useState(false);

    const debouncedFuncionario = useDebouncedValue(form.NM_FUNCIONARIO, 300);
    const funcionarioBoxRef = useRef<HTMLDivElement | null>(null);
    const submitLockRef = useRef(false);

    const [loadingAccess, setLoadingAccess] = useState(true);
    const [allowed, setAllowed] = useState(false);

    const [showTiOptions, setShowTiOptions] = useState(false);

    function handleChange<K extends keyof NotebookFormData>(field: K, value: NotebookFormData[K]) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    useEffect(() => {
        async function validarAcesso() {
            try {
                const user = (await getMeAdUser()) as AuthUserLike;

                setAllowed(canAccess(user, PAGE_ACCESS.cadastroNotebook));
            } catch (error) {
                console.error(error);
                setAllowed(false);
            } finally {
                setLoadingAccess(false);
            }
        }

        validarAcesso();
    }, []);

    useEffect(() => {
        const loadFuncionarios = async () => {
            const termo = debouncedFuncionario.trim();

            if (!termo) {
                setFuncionarios([]);
                setShowFuncionarios(false);
                return;
            }

            try {
                setLoadingFuncionarios(true);
                const data = await buscarFuncionariosNotebook(termo);
                const lista = Array.isArray(data.data) ? data.data : [];
                setFuncionarios(lista);
                setShowFuncionarios(true);
            } catch {
                setFuncionarios([]);
                setShowFuncionarios(false);
            } finally {
                setLoadingFuncionarios(false);
            }
        };

        loadFuncionarios();
    }, [debouncedFuncionario]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                funcionarioBoxRef.current &&
                !funcionarioBoxRef.current.contains(event.target as Node)
            ) {
                setShowFuncionarios(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSelectFuncionario(funcionario: FuncionarioOption) {
        setForm((prev) => ({
            ...prev,
            NM_FUNCIONARIO: funcionario.NM_FUNCIONARIO || "",
            ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO
                ? String(funcionario.ID_FUNCIONARIO)
                : "",
        }));

        setShowFuncionarios(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading || submitLockRef.current) return;

        submitLockRef.current = true;
        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            await cadastrarNotebook({
                NM_NOTEBOOK: form.NM_NOTEBOOK,
                NM_MODELO: form.NM_MODELO || null,
                DT_INICIO_OPERACAO: form.DT_INICIO_OPERACAO || null,
                DT_GARANTIA: form.DT_GARANTIA || null,
                NR_MAC: form.NR_MAC || null,
                CD_PATRIMONIO: form.CD_PATRIMONIO ? Number(form.CD_PATRIMONIO) : null,
                NR_IP: form.NR_IP || null,
                NR_BITLOCKER: form.NR_BITLOCKER || null,
                OBS_NOTEBOOKS_SICOOB: form.OBS_NOTEBOOKS_SICOOB || null,
                DESC_SITUACAO: form.DESC_SITUACAO || null,

                // quem recebeu
                ID_FUNCIONARIO: form.ID_FUNCIONARIO
                    ? Number(form.ID_FUNCIONARIO)
                    : null,

                // quem cadastrou
                NM_FUNCIONARIO_TI: form.NM_FUNCIONARIO_TI || null,
            });

            setSuccess("Notebook cadastrado com sucesso.");
            setForm(initialState);
            setFuncionarios([]);
            setShowFuncionarios(false);
        } catch (e: any) {
            setError(String(e?.message || "Erro ao cadastrar notebook."));
        } finally {
            submitLockRef.current = false;
            setLoading(false);
        }
    }

    if (loadingAccess) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Carregando...
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Você não possui permissão para acessar esta tela.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                        <BackButton />

                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-third bg-third text-primary shadow-sm">
                                <FaLaptop size={16} />
                            </div>

                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-semibold text-title">
                                    Cadastro de Notebook
                                </h1>

                                <p className="mt-1 text-sm text-paragraph">
                                    Preencha os dados abaixo para cadastrar um novo notebook.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className={`${cardClass} border-t-4 border-t-primary`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <h2 className="text-base font-semibold text-title">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                            Dados do equipamento
                        </h2>

                        <Link
                            href="/auth/consulta_notebook"
                            className={`${accentButtonClass} w-full sm:w-auto`}
                        >
                            <FaList />
                            Consultar notebooks cadastrados
                        </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Field
                            label="Nome do notebook *"
                            value={form.NM_NOTEBOOK}
                            onChange={(v) => handleChange("NM_NOTEBOOK", v)}
                            placeholder="Ex: NOTE-001"
                            required
                        />

                        <Field
                            label="Modelo"
                            value={form.NM_MODELO}
                            onChange={(v) => handleChange("NM_MODELO", v)}
                            placeholder="Ex: Dell Latitude"
                        />

                        <Field
                            label="Patrimônio"
                            value={form.CD_PATRIMONIO}
                            onChange={(v) => handleChange("CD_PATRIMONIO", v)}
                            placeholder="Ex: 123456"
                            type="number"
                        />

                        <Field
                            label="IP"
                            value={form.NR_IP}
                            onChange={(v) => handleChange("NR_IP", v)}
                            placeholder="Ex: 192.168.0.10"
                        />

                        <Field
                            label="MAC"
                            value={form.NR_MAC}
                            onChange={(v) => handleChange("NR_MAC", v)}
                            placeholder="Ex: 00:1A:2B:3C:4D:5E"
                        />

                        <Field
                            label="BitLocker"
                            value={form.NR_BITLOCKER}
                            onChange={(v) => handleChange("NR_BITLOCKER", v)}
                            placeholder="Número/chave BitLocker"
                        />

                        <Field
                            label="Início da operação"
                            value={form.DT_INICIO_OPERACAO}
                            onChange={(v) => handleChange("DT_INICIO_OPERACAO", v)}
                            type="date"
                        />

                        <Field
                            label="Garantia"
                            value={form.DT_GARANTIA}
                            onChange={(v) => handleChange("DT_GARANTIA", v)}
                            type="date"
                        />

                        <Field
                            label="Situação"
                            value={form.DESC_SITUACAO}
                            onChange={(v) => handleChange("DESC_SITUACAO", v)}
                            placeholder="Ex: Ativo"
                        />
                    </div>
                </div>

                <div className={cardClass}>
                    <h2 className="text-base font-semibold text-title">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                        Responsável / vínculo
                    </h2>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="relative" ref={funcionarioBoxRef}>
                            <label className={labelClass}>
                                Funcionário que recebeu
                            </label>

                            <div className="relative">
                                <input
                                    value={form.NM_FUNCIONARIO}
                                    onChange={(e) => {
                                        handleChange("NM_FUNCIONARIO", e.target.value);
                                        handleChange("ID_FUNCIONARIO", "");
                                        setShowFuncionarios(true);
                                    }}
                                    onFocus={() => {
                                        if (funcionarios.length > 0) {
                                            setShowFuncionarios(true);
                                        }
                                    }}
                                    placeholder="Digite o nome do funcionário que recebeu"
                                    className={`${inputClass} pr-10`}
                                />

                                <FaUser className="absolute right-3 top-1/2 -translate-y-1/2 text-text-darken" />
                            </div>

                            {showFuncionarios && form.NM_FUNCIONARIO.trim() ? (
                                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                                    {loadingFuncionarios ? (
                                        <div className="px-3 py-3 text-sm text-gray-500">
                                            Buscando funcionários...
                                        </div>
                                    ) : funcionarios.length === 0 ? (
                                        <div className="px-3 py-3 text-sm text-gray-500">
                                            Nenhum funcionário encontrado.
                                        </div>
                                    ) : (
                                        funcionarios.map((funcionario) => (
                                            <button
                                                key={`${funcionario.ID_FUNCIONARIO}-${funcionario.NM_FUNCIONARIO}`}
                                                type="button"
                                                onClick={() => handleSelectFuncionario(funcionario)}
                                                className="flex w-full flex-col items-start px-3 py-3 text-left hover:bg-primary/10"
                                            >
                                                <span className="text-sm font-medium text-title">
                                                    {funcionario.NM_FUNCIONARIO}
                                                </span>
                                                <span className="text-xs text-paragraph">
                                                    ID: {funcionario.ID_FUNCIONARIO ?? "-"}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="relative">
                            <label className={labelClass}>
                                Funcionário TI que cadastrou
                            </label>

                            <button
                                type="button"
                                onClick={() => setShowTiOptions((prev) => !prev)}
                                className={`${inputClass} flex items-center justify-between`}
                            >
                                <span>
                                    {form.NM_FUNCIONARIO_TI || "Selecione o funcionário da TI"}
                                </span>
                                <FaUser className="text-text-darken" />
                            </button>

                            {showTiOptions && (
                                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                    {funcionariosTI.map((nome) => (
                                        <button
                                            key={nome}
                                            type="button"
                                            onClick={() => {
                                                handleChange("NM_FUNCIONARIO_TI", nome);
                                                setShowTiOptions(false);
                                            }}
                                            className="block w-full px-4 py-3 text-left text-sm text-title hover:bg-primary/10"
                                        >
                                            {nome}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={cardClass}>
                    <h2 className="text-base font-semibold text-title">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                        Observações
                    </h2>

                    <div className="mt-4">
                        <label className={labelClass}>Observação</label>
                        <textarea
                            value={form.OBS_NOTEBOOKS_SICOOB}
                            onChange={(e) => handleChange("OBS_NOTEBOOKS_SICOOB", e.target.value)}
                            placeholder="Escreva alguma observação sobre o notebook..."
                            className={textareaClass}
                        />
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || submitLockRef.current}
                            aria-busy={loading}
                            className={primaryButtonClass}
                        >
                            <FaSave size={14} />
                            {loading ? "Salvando..." : "Salvar notebook"}
                        </button>
                    </div>
                </div>

                {success ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {success}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}
            </form>
        </div>
    );
}

function Field(props: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className={labelClass}>{props.label}</label>
            <input
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                type={props.type || "text"}
                required={props.required}
                className={inputClass}
            />
        </div>
    );
}

function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
}
