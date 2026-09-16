"use client";

import { useEffect, useRef, useState } from "react";
import { FaSave, FaTimes, FaUser } from "react-icons/fa";
import {
    buscarFuncionariosNotebook,
    atualizarNotebook,
    type FuncionarioOption,
    type AtualizarNotebookPayload,
} from "@/services/consulta_notebook.service";

export type NotebookRow = {
    ID_NOTEBOOKS_SICOOB: number | string;
    NM_NOTEBOOK: string | null;
    NM_MODELO: string | null;
    DT_INICIO_OPERACAO: string | null;
    DT_GARANTIA: string | null;
    NR_MAC: string | null;
    CD_PATRIMONIO: number | string | null;
    NR_IP: string | null;
    NR_BITLOCKER: string | null;
    OBS_NOTEBOOKS_SICOOB: string | null;
    ID_FUNCIONARIO: number | string | null;
    NM_FUNCIONARIO_TI: string | null;
    NM_FUNCIONARIO_RECEBEU?: string | null;
    DESC_SITUACAO: string | null;
};

type Props = {
    open: boolean;
    notebook: NotebookRow | null;
    onClose: () => void;
    onSuccess: () => void;
};

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
    NM_FUNCIONARIO: string;
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
    NM_FUNCIONARIO: "",
    DESC_SITUACAO: "",
};

export default function ModalEditarNotebook({
    open,
    notebook,
    onClose,
    onSuccess,
}: Props) {
    const [form, setForm] = useState<NotebookFormData>(initialState);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
    const [showFuncionarios, setShowFuncionarios] = useState(false);

    const debouncedFuncionario = useDebouncedValue(form.NM_FUNCIONARIO, 300);
    const funcionarioBoxRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open || !notebook) return;

        setForm({
            NM_NOTEBOOK: notebook.NM_NOTEBOOK ?? "",
            NM_MODELO: notebook.NM_MODELO ?? "",
            DT_INICIO_OPERACAO: normalizeDateForInput(notebook.DT_INICIO_OPERACAO),
            DT_GARANTIA: normalizeDateForInput(notebook.DT_GARANTIA),
            NR_MAC: notebook.NR_MAC ?? "",
            CD_PATRIMONIO:
                notebook.CD_PATRIMONIO !== null && notebook.CD_PATRIMONIO !== undefined
                    ? String(notebook.CD_PATRIMONIO)
                    : "",
            NR_IP: notebook.NR_IP ?? "",
            NR_BITLOCKER: notebook.NR_BITLOCKER ?? "",
            OBS_NOTEBOOKS_SICOOB: notebook.OBS_NOTEBOOKS_SICOOB ?? "",
            ID_FUNCIONARIO:
                notebook.ID_FUNCIONARIO !== null && notebook.ID_FUNCIONARIO !== undefined
                    ? String(notebook.ID_FUNCIONARIO)
                    : "",
            NM_FUNCIONARIO_TI: notebook.NM_FUNCIONARIO_TI ?? "",
            NM_FUNCIONARIO: notebook.NM_FUNCIONARIO_RECEBEU ?? "",
            DESC_SITUACAO: notebook.DESC_SITUACAO ?? "",
        });

        setSuccess(null);
        setError(null);
        setFuncionarios([]);
        setShowFuncionarios(false);
    }, [open, notebook]);

    useEffect(() => {
        if (!open) return;

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
    }, [debouncedFuncionario, open]);

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

    function handleChange<K extends keyof NotebookFormData>(field: K, value: NotebookFormData[K]) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

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

        if (!notebook) return;

        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            const payload: AtualizarNotebookPayload = {
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
            };

            await atualizarNotebook(String(notebook.ID_NOTEBOOKS_SICOOB), payload);

            setSuccess("Notebook atualizado com sucesso.");
            onSuccess();

            setTimeout(() => {
                onClose();
            }, 500);
        } catch (e: any) {
            setError(String(e?.message || "Erro ao atualizar notebook."));
        } finally {
            setLoading(false);
        }
    }

    if (!open || !notebook) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Gestão de notebooks
                            </p>

                            <h2 className="mt-1 text-2xl font-bold text-slate-800">
                                Editar notebook
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Atualize os dados do equipamento, responsável e demais informações.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                            title="Fechar"
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[78vh] space-y-5 overflow-y-auto p-6"
                >
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Equipamento
                            </p>

                            <h3 className="mt-1 text-base font-semibold text-slate-900">
                                Dados do equipamento
                            </h3>

                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                Atualize as informações de identificação, rede, segurança
                                e período de operação do notebook.
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Field
                                label="Nome do notebook *"
                                value={form.NM_NOTEBOOK}
                                onChange={(v) =>
                                    handleChange("NM_NOTEBOOK", v)
                                }
                                required
                            />

                            <Field
                                label="Modelo"
                                value={form.NM_MODELO}
                                onChange={(v) =>
                                    handleChange("NM_MODELO", v)
                                }
                            />

                            <Field
                                label="Patrimônio"
                                value={form.CD_PATRIMONIO}
                                onChange={(v) =>
                                    handleChange("CD_PATRIMONIO", v)
                                }
                                type="number"
                            />

                            <Field
                                label="IP"
                                value={form.NR_IP}
                                onChange={(v) =>
                                    handleChange("NR_IP", v)
                                }
                            />

                            <Field
                                label="MAC"
                                value={form.NR_MAC}
                                onChange={(v) =>
                                    handleChange("NR_MAC", v)
                                }
                            />

                            <Field
                                label="BitLocker"
                                value={form.NR_BITLOCKER}
                                onChange={(v) =>
                                    handleChange("NR_BITLOCKER", v)
                                }
                            />

                            <Field
                                label="Início da operação"
                                value={form.DT_INICIO_OPERACAO}
                                onChange={(v) =>
                                    handleChange("DT_INICIO_OPERACAO", v)
                                }
                                type="date"
                            />

                            <Field
                                label="Garantia"
                                value={form.DT_GARANTIA}
                                onChange={(v) =>
                                    handleChange("DT_GARANTIA", v)
                                }
                                type="date"
                            />

                            <Field
                                label="Situação"
                                value={form.DESC_SITUACAO}
                                onChange={(v) =>
                                    handleChange("DESC_SITUACAO", v)
                                }
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                Responsável
                            </p>

                            <h3 className="mt-1 text-base font-semibold text-slate-900">
                                Responsável / vínculo
                            </h3>

                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                Informe o funcionário responsável pelo equipamento e
                                confira o responsável da TI pelo cadastro.
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div
                                className="relative"
                                ref={funcionarioBoxRef}
                            >
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                    Funcionário que recebeu
                                </label>

                                <div className="relative">
                                    <input
                                        value={form.NM_FUNCIONARIO}
                                        onChange={(e) => {
                                            handleChange(
                                                "NM_FUNCIONARIO",
                                                e.target.value
                                            );

                                            handleChange(
                                                "ID_FUNCIONARIO",
                                                ""
                                            );

                                            setShowFuncionarios(true);
                                        }}
                                        onFocus={() => {
                                            if (funcionarios.length > 0) {
                                                setShowFuncionarios(true);
                                            }
                                        }}
                                        placeholder="Digite o nome do funcionário que recebeu"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />

                                    <FaUser className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>

                                {showFuncionarios &&
                                    form.NM_FUNCIONARIO.trim() ? (
                                    <div className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                                        {loadingFuncionarios ? (
                                            <div className="px-4 py-3 text-sm text-slate-500">
                                                Buscando funcionários...
                                            </div>
                                        ) : funcionarios.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-slate-500">
                                                Nenhum funcionário encontrado.
                                            </div>
                                        ) : (
                                            funcionarios.map(
                                                (funcionario) => (
                                                    <button
                                                        key={`${funcionario.ID_FUNCIONARIO}-${funcionario.NM_FUNCIONARIO}`}
                                                        type="button"
                                                        onClick={() =>
                                                            handleSelectFuncionario(
                                                                funcionario
                                                            )
                                                        }
                                                        className="flex w-full cursor-pointer flex-col items-start rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                                                    >
                                                        <span className="text-sm font-semibold text-slate-800">
                                                            {
                                                                funcionario.NM_FUNCIONARIO
                                                            }
                                                        </span>

                                                        <span className="mt-0.5 text-xs text-slate-400">
                                                            ID:{" "}
                                                            {funcionario.ID_FUNCIONARIO ??
                                                                "-"}
                                                        </span>
                                                    </button>
                                                )
                                            )
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            <Field
                                label="Funcionário TI que cadastrou"
                                value={form.NM_FUNCIONARIO_TI}
                                onChange={(v) =>
                                    handleChange(
                                        "NM_FUNCIONARIO_TI",
                                        v
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Informações adicionais
                            </p>

                            <h3 className="mt-1 text-base font-semibold text-slate-900">
                                Observações
                            </h3>

                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                Registre informações complementares relacionadas ao equipamento.
                            </p>
                        </div>

                        <div className="mt-5">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Observação
                            </label>

                            <textarea
                                value={form.OBS_NOTEBOOKS_SICOOB}
                                onChange={(e) =>
                                    handleChange(
                                        "OBS_NOTEBOOKS_SICOOB",
                                        e.target.value
                                    )
                                }
                                rows={4}
                                placeholder="Digite uma observação, se necessário."
                                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                    </div>

                    {success ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-sm font-medium text-emerald-800">
                                {success}
                            </p>
                        </div>
                    ) : null}

                    {error ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm font-medium text-red-700">
                                {error}
                            </p>
                        </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FaSave size={16} />

                            {loading
                                ? "Salvando..."
                                : "Salvar alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field(props: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-gray-600">{props.label}</label>
            <input
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
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

function normalizeDateForInput(value: string | null) {
    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
        const [, day, month, year] = brMatch;
        return `${year}-${month}-${day}`;
    }

    return "";
}