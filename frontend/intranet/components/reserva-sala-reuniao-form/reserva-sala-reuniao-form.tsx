"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FaArrowRight,
    FaCalendarCheck,
    FaClock,
    FaSave,
    FaTrash,
} from "react-icons/fa";
import { getMeAdUser, type MeResponse } from "@/services/auth.service";
import {
    cadastrarReservaSala,
    cancelarReservaSala,
    listarReservasSala,
    type ReservaSalaItem,
    type TipoEspacoReserva,
} from "@/services/reserva_sala_reuniao.service";

const inputBase =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const buttonPrimary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-base font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";
const buttonSecondary =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer";

const buttonDanger =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer";

const espacosPorTipo: Record<TipoEspacoReserva, string[]> = {
    SALA_REUNIAO: ["Sala de Reunião 1", "Sala de Reunião 2"],
    AUDITORIO: ["Auditório"],
};

function Field({
    label,
    children,
    helper,
}: {
    label: string;
    children: React.ReactNode;
    helper?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
                {label}
            </label>
            {children}
            {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
        </div>
    );
}

function Section({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {subtitle ? (
                    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                ) : null}
            </div>

            <div className="p-5">{children}</div>
        </section>
    );
}

function formatDateTimeBR(value?: string | null) {
    if (!value) return "";

    const raw = String(value).replace("T", " ");
    const [date, time] = raw.split(" ");
    const [y, m, d] = String(date || "").split("-");
    const hora = String(time || "").slice(0, 5);

    if (!y || !m || !d) return String(value);

    return `${d}/${m}/${y}${hora ? ` às ${hora}` : ""}`;
}

function hojeISO() {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function montarDateTime(data: string, hora: string) {
    if (!data || !hora) return "";
    return `${data}T${hora}:00`;
}

export function ReservaSalaReuniaoForm() {
    const router = useRouter();

    const [usuario, setUsuario] = useState<MeResponse | null>(null);

    const [tipoEspaco, setTipoEspaco] =
        useState<TipoEspacoReserva>("SALA_REUNIAO");
    const [nomeEspaco, setNomeEspaco] = useState("Sala de Reunião 1");
    const [titulo, setTitulo] = useState("");
    const [dataReserva, setDataReserva] = useState(hojeISO());
    const [horaInicio, setHoraInicio] = useState("");
    const [horaFim, setHoraFim] = useState("");
    const [observacao, setObservacao] = useState("");

    const [reservas, setReservas] = useState<ReservaSalaItem[]>([]);
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingLista, setLoadingLista] = useState(false);

    const [erro, setErro] = useState("");
    const [info, setInfo] = useState("");

    const opcoesEspaco = useMemo(() => {
        return espacosPorTipo[tipoEspaco] || [];
    }, [tipoEspaco]);

    useEffect(() => {
        const primeiraOpcao = espacosPorTipo[tipoEspaco]?.[0] || "";
        setNomeEspaco(primeiraOpcao);
    }, [tipoEspaco]);

    useEffect(() => {
        async function loadInicial() {
            try {
                setLoadingInicial(true);
                setErro("");

                const me = await getMeAdUser();
                setUsuario(me);

                await carregarReservas(dataReserva);
            } catch (error: any) {
                console.error(error);
                setErro(
                    error?.response?.data?.error ||
                    "Não foi possível carregar os dados da reserva."
                );
            } finally {
                setLoadingInicial(false);
            }
        }

        loadInicial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function carregarReservas(dataBase = dataReserva) {
        try {
            setLoadingLista(true);

            const inicio = `${dataBase}T00:00:00`;
            const fim = `${dataBase}T23:59:59`;

            const response = await listarReservasSala({
                inicio,
                fim,
            });

            setReservas(response?.items || response?.data || response || []);
        } catch (error) {
            console.error(error);
            setReservas([]);
        } finally {
            setLoadingLista(false);
        }
    }

    function abrirConsulta() {
        router.push("/auth/consulta_sala_reuniao");
    }

    function validarCampos() {
        if (!tipoEspaco) return "Selecione o tipo de espaço.";
        if (!nomeEspaco.trim()) return "Selecione a sala ou auditório.";
        if (!titulo.trim()) return "Preencha o título da reunião.";
        if (!dataReserva) return "Selecione a data da reserva.";
        if (!horaInicio) return "Selecione o horário inicial.";
        if (!horaFim) return "Selecione o horário final.";

        const inicio = new Date(montarDateTime(dataReserva, horaInicio));
        const fim = new Date(montarDateTime(dataReserva, horaFim));

        if (fim <= inicio) {
            return "O horário final deve ser maior que o horário inicial.";
        }

        return "";
    }

    function limparFormulario() {
        setTitulo("");
        setHoraInicio("");
        setHoraFim("");
        setObservacao("");
    }

    async function salvarReserva() {
        try {
            setErro("");
            setInfo("");

            const msg = validarCampos();

            if (msg) {
                setErro(msg);
                return;
            }

            if (!usuario) {
                setErro("Não foi possível identificar o usuário logado.");
                return;
            }

            setLoadingSalvar(true);

            await cadastrarReservaSala({
                TP_ESPACO: tipoEspaco,
                NM_ESPACO: nomeEspaco,
                DS_TITULO: titulo.trim(),
                DS_OBSERVACAO: observacao.trim(),
                DT_INICIO: montarDateTime(dataReserva, horaInicio),
                DT_FIM: montarDateTime(dataReserva, horaFim),
                USUARIO: usuario,
            });

            setInfo("Reserva cadastrada com sucesso.");
            limparFormulario();
            await carregarReservas(dataReserva);
        } catch (error: any) {
            console.error(error);

            setErro(
                error?.response?.data?.error ||
                "Não foi possível cadastrar a reserva. Verifique se o espaço já está ocupado nesse horário."
            );
        } finally {
            setLoadingSalvar(false);
        }
    }

    async function cancelarReserva(id: number) {
        const confirmar = window.confirm("Deseja realmente cancelar esta reserva?");

        if (!confirmar) return;

        try {
            setErro("");
            setInfo("");

            await cancelarReservaSala(id);

            setInfo("Reserva cancelada com sucesso.");
            await carregarReservas(dataReserva);
        } catch (error: any) {
            console.error(error);
            setErro(
                error?.response?.data?.error || "Não foi possível cancelar a reserva."
            );
        }
    }

    const reservasDoEspacoSelecionado = reservas.filter(
        (item) => item.NM_ESPACO === nomeEspaco
    );

    if (loadingInicial) {
        return (
            <div className="mx-auto w-full max-w-400 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-slate-500">
                    Carregando dados da reserva...
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Dados da reserva
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Escolha o espaço, informe o dia e o horário da reunião.
                        </p>
                    </div>

                    <button type="button" onClick={abrirConsulta} className={buttonPrimary}>
                        <FaArrowRight />
                        Consulta de Reservas
                    </button>
                </div>

                {(erro || info) && (
                    <div className="mb-5">
                        {erro ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {erro}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                {info}
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                        <Field label="Usuário logado">
                            <input
                                readOnly
                                value={
                                    usuario?.nome_completo ||
                                    usuario?.username ||
                                    "Usuário não identificado"
                                }
                                className={`${inputBase} bg-slate-50`}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-4">
                        <Field label="E-mail">
                            <input
                                readOnly
                                value={usuario?.email || ""}
                                className={`${inputBase} bg-slate-50`}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-4">
                        <Field label="Departamento">
                            <input
                                readOnly
                                value={usuario?.department || ""}
                                className={`${inputBase} bg-slate-50`}
                            />
                        </Field>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                        <Field label="Tipo de espaço">
                            <select
                                value={tipoEspaco}
                                onChange={(e) =>
                                    setTipoEspaco(e.target.value as TipoEspacoReserva)
                                }
                                className={inputBase}
                            >
                                <option value="SALA_REUNIAO">Sala de reunião</option>
                                <option value="AUDITORIO">Auditório</option>
                            </select>
                        </Field>
                    </div>

                    <div className="md:col-span-4">
                        <Field label="Sala/Auditório">
                            <select
                                value={nomeEspaco}
                                onChange={(e) => setNomeEspaco(e.target.value)}
                                className={inputBase}
                            >
                                {opcoesEspaco.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="md:col-span-4">
                        <Field label="Data da reserva">
                            <input
                                type="date"
                                value={dataReserva}
                                onChange={async (e) => {
                                    const novaData = e.target.value;
                                    setDataReserva(novaData);
                                    await carregarReservas(novaData);
                                }}
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-8">
                        <Field label="Título da reunião">
                            <input
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                className={inputBase}
                                placeholder="Ex: Reunião com diretoria"
                                maxLength={200}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Início">
                            <input
                                type="time"
                                value={horaInicio}
                                onChange={(e) => setHoraInicio(e.target.value)}
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Fim">
                            <input
                                type="time"
                                value={horaFim}
                                onChange={(e) => setHoraFim(e.target.value)}
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <Field label="Observação">
                            <textarea
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                className={textareaBase}
                                rows={3}
                                maxLength={1000}
                                placeholder="Informe detalhes da reunião, se necessário."
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => carregarReservas(dataReserva)}
                                className={buttonSecondary}
                            >
                                <FaClock />
                                Atualizar disponibilidade
                            </button>

                            <button
                                type="button"
                                onClick={salvarReserva}
                                disabled={loadingSalvar}
                                className={buttonPrimary}
                            >
                                <FaSave />
                                {loadingSalvar ? "Salvando..." : "Cadastrar Reserva"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Section
                title="Disponibilidade do dia"
                subtitle="Confira as reservas já cadastradas para o espaço selecionado."
            >
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <FaCalendarCheck />
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Espaço selecionado
                                </p>
                                <p className="text-sm font-bold text-slate-800">{nomeEspaco}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                            Data
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                            {formatDateTimeBR(`${dataReserva} 00:00:00`).replace(
                                " às 00:00",
                                ""
                            )}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                            Reservas no dia
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                            {reservasDoEspacoSelecionado.length}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                                <th className="border-b border-slate-200 px-4 py-3">Espaço</th>
                                <th className="border-b border-slate-200 px-4 py-3">Título</th>
                                <th className="border-b border-slate-200 px-4 py-3">Início</th>
                                <th className="border-b border-slate-200 px-4 py-3">Fim</th>
                                <th className="border-b border-slate-200 px-4 py-3">
                                    Reservado por
                                </th>
                                <th className="border-b border-slate-200 px-4 py-3">
                                    Departamento
                                </th>
                                <th className="border-b border-slate-200 px-4 py-3 text-center">
                                    Cancelar
                                </th>
                            </tr>
                        </thead>

                        <tbody className="bg-white text-sm text-slate-700">
                            {loadingLista ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                                    >
                                        Carregando reservas...
                                    </td>
                                </tr>
                            ) : reservasDoEspacoSelecionado.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                                    >
                                        Nenhuma reserva encontrada para este espaço no dia selecionado.
                                    </td>
                                </tr>
                            ) : (
                                reservasDoEspacoSelecionado.map((item) => (
                                    <tr
                                        key={item.ID_RESERVA_SALA}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="border-b border-slate-100 px-4 py-3 font-medium">
                                            {item.NM_ESPACO}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {item.DS_TITULO}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {formatDateTimeBR(item.DT_INICIO)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {formatDateTimeBR(item.DT_FIM)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {item.NM_USUARIO || item.DS_LOGIN || "-"}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {item.DS_DEPARTAMENTO || "-"}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    cancelarReserva(Number(item.ID_RESERVA_SALA))
                                                }
                                                className={buttonDanger}
                                            >
                                                <FaTrash size={13} />
                                                Cancelar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}