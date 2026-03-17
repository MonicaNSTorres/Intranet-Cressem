"use client";

import { useEffect, useRef, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import { FaLaptop, FaSave, FaUser } from "react-icons/fa";
import {
    buscarFuncionariosNotebook,
    cadastrarNotebook,
    type FuncionarioOption,
} from "@/services/cadastro_notebook.service";

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
    ID_FUNCIONARIO: string;
    NM_FUNCIONARIO_TI: string;
    DESC_SITUACAO: string;
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
    NM_FUNCIONARIO_TI: "",
    DESC_SITUACAO: "",
};

export default function CadastroNotebookPage() {
    const [form, setForm] = useState<NotebookFormData>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
    const [showFuncionarios, setShowFuncionarios] = useState(false);

    const debouncedFuncionario = useDebouncedValue(form.NM_FUNCIONARIO_TI, 300);
    const funcionarioBoxRef = useRef<HTMLDivElement | null>(null);

    function handleChange<K extends keyof NotebookFormData>(field: K, value: NotebookFormData[K]) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

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
            NM_FUNCIONARIO_TI: funcionario.NM_FUNCIONARIO || "",
            ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO
                ? String(funcionario.ID_FUNCIONARIO)
                : "",
        }));
        setShowFuncionarios(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
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
                ID_FUNCIONARIO: form.ID_FUNCIONARIO ? Number(form.ID_FUNCIONARIO) : null,
                NM_FUNCIONARIO_TI: form.NM_FUNCIONARIO_TI || null,
                DESC_SITUACAO: form.DESC_SITUACAO || null,
            });

            setSuccess("Notebook cadastrado com sucesso.");
            setForm(initialState);
            setFuncionarios([]);
            setShowFuncionarios(false);
        } catch (e: any) {
            setError(String(e?.message || "Erro ao cadastrar notebook."));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4">
                <div className="min-w-0">
                    <BackButton />

                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
                            <FaLaptop size={16} />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Cadastro de Notebook
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Preencha os dados abaixo para cadastrar um novo notebook.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 className="text-base font-semibold text-gray-900">
                        Dados do equipamento
                    </h2>

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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 className="text-base font-semibold text-gray-900">
                        Responsável / vínculo
                    </h2>

                    {/*<p className="mt-3 text-xs text-gray-500">
                        * Preencha primeiro o nome do funcionário.
                    </p>*/}

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/*<Field
                            label="ID Funcionário"
                            value={form.ID_FUNCIONARIO}
                            onChange={(v) => handleChange("ID_FUNCIONARIO", v)}
                            placeholder="Preenchido ao selecionar o nome"
                            type="number"
                        />*/}

                        <div className="relative" ref={funcionarioBoxRef}>
                            <label className="text-xs font-medium text-gray-600">
                                Funcionário TI
                            </label>

                            <div className="relative">
                                <input
                                    value={form.NM_FUNCIONARIO_TI}
                                    onChange={(e) => {
                                        handleChange("NM_FUNCIONARIO_TI", e.target.value);
                                        handleChange("ID_FUNCIONARIO", "");
                                        setShowFuncionarios(true);
                                    }}
                                    onFocus={() => {
                                        if (funcionarios.length > 0) {
                                            setShowFuncionarios(true);
                                        }
                                    }}
                                    placeholder="Digite o nome do funcionário"
                                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-900 outline-none shadow-sm placeholder:text-gray-400"
                                />

                                <FaUser className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 mt-0.5" />
                            </div>

                            {showFuncionarios && form.NM_FUNCIONARIO_TI.trim() ? (
                                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
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
                                                className="flex w-full flex-col items-start px-3 py-3 text-left hover:bg-gray-50"
                                            >
                                                <span className="text-sm font-medium text-gray-900">
                                                    {funcionario.NM_FUNCIONARIO}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ID: {funcionario.ID_FUNCIONARIO ?? "-"}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h2 className="text-base font-semibold text-gray-900">
                        Observações
                    </h2>

                    <div className="mt-4">
                        <label className="text-xs font-medium text-gray-600">Observação</label>
                        <textarea
                            value={form.OBS_NOTEBOOKS_SICOOB}
                            onChange={(e) => handleChange("OBS_NOTEBOOKS_SICOOB", e.target.value)}
                            placeholder="Escreva alguma observação sobre o notebook..."
                            className="mt-1 min-h-30 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none shadow-sm placeholder:text-gray-400"
                        />
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

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
                    >
                        <FaSave size={14} />
                        {loading ? "Salvando..." : "Salvar notebook"}
                    </button>
                </div>
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
            <label className="text-xs font-medium text-gray-600">{props.label}</label>
            <input
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                type={props.type || "text"}
                required={props.required}
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none shadow-sm placeholder:text-gray-400"
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