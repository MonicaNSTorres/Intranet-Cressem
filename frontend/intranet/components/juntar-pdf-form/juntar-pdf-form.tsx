"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useRef, useState } from "react";
import {
    FaCheckCircle,
    FaDownload,
    FaFilePdf,
    FaGripVertical,
    FaPlus,
    FaTrash,
} from "react-icons/fa";
import { FiAlertCircle, FiUploadCloud } from "react-icons/fi";
import { juntarEComprimirPdfs } from "@/services/juntar_pdf.service";

type AlertType = "success" | "error" | "warning" | "info";

type AlertState = {
    open: boolean;
    title: string;
    message: string;
    type: AlertType;
};

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncateFileName(name: string, max = 42) {
    if (name.length <= max) return name;
    const extIndex = name.lastIndexOf(".");
    if (extIndex === -1) return `${name.slice(0, max)}...`;

    const ext = name.slice(extIndex);
    const base = name.slice(0, extIndex);
    return `${base.slice(0, Math.max(0, max - ext.length - 3))}...${ext}`;
}

export function JuntarPdfForm() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const [alert, setAlert] = useState<AlertState>({
        open: false,
        title: "",
        message: "",
        type: "info",
    });

    function openAlert(title: string, message: string, type: AlertType = "info") {
        setAlert({
            open: true,
            title,
            message,
            type,
        });
    }

    function closeAlert() {
        setAlert((prev) => ({ ...prev, open: false }));
    }

    function clearFileSelection() {
        setSelectedFiles([]);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }

    function handleSelectButtonClick() {
        inputRef.current?.click();
    }

    function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []);

        for (const file of files) {
            const fileExtension = file.name.split(".").pop()?.toLowerCase();

            if (file.size <= 1024) {
                openAlert(
                    "Arquivo inválido",
                    "Por gentileza, selecione um arquivo válido com tamanho maior que 1KB.",
                    "warning"
                );
                event.target.value = "";
                return;
            }

            if (fileExtension !== "pdf") {
                openAlert(
                    "Formato não permitido",
                    "Por gentileza, selecione apenas arquivos PDF.",
                    "warning"
                );
                event.target.value = "";
                return;
            }
        }

        setSelectedFiles((prev) => {
            const updated = [...prev];

            for (const file of files) {
                const duplicated = updated.some(
                    (f) => f.name === file.name && f.size === file.size
                );

                if (!duplicated) {
                    updated.push(file);
                }
            }

            return updated;
        });

        event.target.value = "";
    }

    function removeFile(indexToRemove: number) {
        setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    }

    function moveFile(fromIndex: number, toIndex: number) {
        setSelectedFiles((prev) => {
            const updated = [...prev];
            const [movedItem] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, movedItem);
            return updated;
        });
    }

    function handleDragStart(index: number) {
        setDragIndex(index);
    }

    function handleDragOver(event: React.DragEvent<HTMLLIElement>) {
        event.preventDefault();
    }

    function handleDrop(dropIndex: number) {
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            return;
        }

        moveFile(dragIndex, dropIndex);
        setDragIndex(null);
    }

    async function handleMergeAndDownload() {
        if (!selectedFiles.length) {
            openAlert("Nenhum arquivo selecionado", "Selecione pelo menos um PDF.", "warning");
            return;
        }

        try {
            setIsProcessing(true);

            openAlert(
                "Processando arquivos",
                "Estamos juntando e preparando seu PDF para download.",
                "info"
            );

            const blob = await juntarEComprimirPdfs(selectedFiles);

            const url = window.URL.createObjectURL(
                new Blob([blob], { type: "application/pdf" })
            );

            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "pdf_junto.pdf");
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            clearFileSelection();

            openAlert(
                "Download concluído",
                "Seu PDF foi gerado e o download foi iniciado com sucesso.",
                "success"
            );
        } catch (error) {
            console.error("Erro ao processar PDFs:", error);
            openAlert(
                "Erro ao processar",
                "Não foi possível juntar os PDFs agora. Tente novamente em instantes.",
                "error"
            );
        } finally {
            setIsProcessing(false);
        }
    }

    const totalSize = useMemo(() => {
        return selectedFiles.reduce((acc, file) => acc + file.size, 0);
    }, [selectedFiles]);

    const totalPagesEstimate = useMemo(() => {
        return selectedFiles.length;
    }, [selectedFiles.length]);

    const alertStyles = {
        success: {
            wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
            icon: <FaCheckCircle className="text-emerald-600" />,
            button: "bg-emerald-600 hover:bg-emerald-700",
        },
        error: {
            wrapper: "border-red-200 bg-red-50 text-red-900",
            icon: <FiAlertCircle className="text-red-600" />,
            button: "bg-red-600 hover:bg-red-700",
        },
        warning: {
            wrapper: "border-amber-200 bg-amber-50 text-amber-900",
            icon: <FiAlertCircle className="text-amber-600" />,
            button: "bg-amber-500 hover:bg-amber-600",
        },
        info: {
            wrapper: "border-sky-200 bg-sky-50 text-sky-900",
            icon: <FiAlertCircle className="text-sky-600" />,
            button: "bg-sky-600 hover:bg-sky-700",
        },
    };

    return (
        <>
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(0,174,157,0.10),rgba(121,183,41,0.08),rgba(255,255,255,1))] px-6 py-7 sm:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-[#00AE9D]/20">
                                <FaFilePdf className="text-2xl" />
                            </div>

                            <div>
                                <div className="mb-2 inline-flex items-center rounded-full border border-[#00AE9D]/15 bg-white/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                                    Utilitário de documentos
                                </div>

                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                    Juntar PDFs
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                    Organize seus arquivos na ordem desejada e gere um único PDF de forma
                                    rápida, prática e segura.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-105">
                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Arquivos
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">{selectedFiles.length}</p>
                            </div>

                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Tamanho total
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {formatFileSize(totalSize)}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Ordem pronta
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {totalPagesEstimate > 0 ? "Sim" : "Não"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00AE9D]/10 text-primary">
                                    <FiUploadCloud className="text-lg" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Adicionar arquivos</h2>
                                    <p className="text-sm text-slate-500">
                                        Selecione um ou mais PDFs para montar o documento final.
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={handleSelectButtonClick}
                                className="group cursor-pointer rounded-[22px] border-2 border-dashed border-slate-300 bg-white px-6 py-8 transition hover:border-primary/60 hover:bg-[#00AE9D]/3"
                            >
                                <input
                                    ref={inputRef}
                                    id="pdfFiles"
                                    type="file"
                                    multiple
                                    accept="application/pdf,.pdf"
                                    className="hidden"
                                    onChange={handleFilesChange}
                                />

                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition group-hover:bg-[#00AE9D]/10 group-hover:text-primary">
                                        <FiUploadCloud className="text-3xl" />
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Clique para adicionar seus PDFs
                                    </h3>

                                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                                        Você pode selecionar vários arquivos de uma vez. Arquivos repetidos
                                        não serão adicionados novamente.
                                    </p>

                                    <button
                                        type="button"
                                        className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <FaPlus className="text-xs" />
                                        Selecionar arquivos
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Tipo aceito
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">Somente PDF</p>
                                </div>

                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Validação
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                        Acima de 1KB
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Reordenação
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                        Arraste para organizar
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Arquivos selecionados</h2>
                                    <p className="text-sm text-slate-500">
                                        Defina a ordem final antes de gerar o documento.
                                    </p>
                                </div>

                                {!!selectedFiles.length && (
                                    <button
                                        type="button"
                                        onClick={clearFileSelection}
                                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                    >
                                        Limpar lista
                                    </button>
                                )}
                            </div>

                            <ul className="space-y-3">
                                {selectedFiles.length === 0 ? (
                                    <li className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                                            <FaFilePdf className="text-2xl" />
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-800">
                                            Nenhum PDF adicionado ainda
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                            Adicione seus arquivos para visualizar a lista, reorganizar a ordem e
                                            gerar o documento final.
                                        </p>
                                    </li>
                                ) : (
                                    selectedFiles.map((file, index) => (
                                        <li
                                            key={`${file.name}-${file.size}-${index}`}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(index)}
                                            className={`group flex items-center justify-between gap-4 rounded-[22px] border px-4 py-4 shadow-sm transition ${dragIndex === index
                                                    ? "scale-[1.01] border-[#00AE9D]/50 bg-[#00AE9D]/5 shadow-md"
                                                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                                                }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition group-hover:bg-[#00AE9D]/10 group-hover:text-primary">
                                                    <FaGripVertical />
                                                </div>

                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                    <FaFilePdf />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                                                        {index + 1}. {truncateFileName(file.name)}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                                            {formatFileSize(file.size)}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                                            PDF
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                                                title="Remover arquivo"
                                            >
                                                <FaTrash className="text-sm" />
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-bold text-slate-900">Como funciona</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Siga a sequência abaixo para montar seu documento.
                            </p>

                            <div className="mt-5 space-y-4">
                                {[
                                    {
                                        step: "1",
                                        title: "Adicione os arquivos",
                                        desc: "Selecione os PDFs que deseja unir em um único documento.",
                                    },
                                    {
                                        step: "2",
                                        title: "Organize a ordem",
                                        desc: "Arraste os itens para cima ou para baixo conforme a ordem desejada.",
                                    },
                                    {
                                        step: "3",
                                        title: "Baixe o PDF final",
                                        desc: "Clique no botão principal para gerar e iniciar o download.",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.step}
                                        className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-bold text-slate-900">Resumo</h2>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-sm text-slate-500">Total de arquivos</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {selectedFiles.length}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-sm text-slate-500">Tamanho somado</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {formatFileSize(totalSize)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-sm text-slate-500">Status</span>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedFiles.length
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-200 text-slate-600"
                                            }`}
                                    >
                                        {selectedFiles.length ? "Pronto para gerar" : "Aguardando arquivos"}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleMergeAndDownload}
                                disabled={isProcessing}
                                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[20px] bg-[linear-gradient(135deg,#79B729_0%,#5e9d1d_100%)] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#79B729]/20 transition hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FaDownload className="text-sm" />
                                {isProcessing ? "Processando arquivos..." : "Juntar e Comprimir PDFs"}
                            </button>

                            <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                                O download será iniciado automaticamente após a geração do arquivo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {alert.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                        <div
                            className={`flex items-start gap-4 rounded-2xl border p-4 ${alertStyles[alert.type].wrapper
                                }`}
                        >
                            <div className="mt-0.5 text-xl">{alertStyles[alert.type].icon}</div>

                            <div className="min-w-0">
                                <h3 className="text-base font-bold">{alert.title}</h3>
                                <p className="mt-1 text-sm leading-6">{alert.message}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={closeAlert}
                                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition ${alertStyles[alert.type].button}`}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}