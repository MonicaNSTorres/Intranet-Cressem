"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDoorOpen,
  FaList,
  FaPlus,
  FaSearch,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import {
  cancelarReservaSala,
  listarReservasSala,
  type ReservaSalaItem,
  type TipoEspacoReserva,
} from "@/services/reserva_sala_reuniao.service";
import { getMeAdUser, type MeResponse } from "@/services/auth.service";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

const inputBase =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const buttonPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-base font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const buttonSecondary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer";

const buttonDanger =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer";

const espacos = [
  {
    tipo: "SALA_REUNIAO" as TipoEspacoReserva,
    nome: "Sala de Reunião",
    label: "Sala de Reunião",
  },
  {
    tipo: "SALA_REUNIAO" as TipoEspacoReserva,
    nome: "Sala da Diretória",
    label: "Sala da Diretória",
  },
  {
    tipo: "AUDITORIO" as TipoEspacoReserva,
    nome: "Auditório",
    label: "Auditório",
  },
];

function hojeISO() {
  const hoje = new Date();
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const dd = String(hoje.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function formatHora(value?: string | null) {
  if (!value) return "";
  return String(value).replace("T", " ").split(" ")[1]?.slice(0, 5) || "";
}

function toDate(value: string) {
  return new Date(String(value).replace(" ", "T"));
}

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
      <label className="block text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function ConsultaSalaReuniao() {
  const router = useRouter();
  const calendarioRef = useRef<FullCalendar | null>(null);
  const [tooltipReserva, setTooltipReserva] = useState<{
    reserva: ReservaSalaItem;
    x: number;
    y: number;
  } | null>(null);

  const [dataConsulta, setDataConsulta] = useState(hojeISO());
  const [modoConsulta, setModoConsulta] = useState<"DIA" | "MES">("MES");
  const [mesConsulta, setMesConsulta] = useState(hojeISO().slice(0, 7));
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | TipoEspacoReserva>(
    "TODOS"
  );
  const [nomeFiltro, setNomeFiltro] = useState("TODOS");

  const [reservas, setReservas] = useState<ReservaSalaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState<MeResponse | null>(null);

  const [modoVisualizacao, setModoVisualizacao] = useState<
    "CALENDARIO" | "LISTA"
  >("CALENDARIO");

  function getPeriodoConsulta(dataBase = dataConsulta, mesBase = mesConsulta) {
    if (modoConsulta === "MES") {
      const [ano, mes] = mesBase.split("-").map(Number);

      const primeiroDia = `${mesBase}-01`;
      const ultimoDiaDate = new Date(ano, mes, 0);
      const ultimoDia = String(ultimoDiaDate.getDate()).padStart(2, "0");

      return {
        inicio: `${primeiroDia}T00:00:00`,
        fim: `${mesBase}-${ultimoDia}T23:59:59`,
      };
    }

    return {
      inicio: `${dataBase}T00:00:00`,
      fim: `${dataBase}T23:59:59`,
    };
  }

  async function carregarReservas(
    dataBase = dataConsulta,
    mesBase = mesConsulta
  ) {
    try {
      setLoading(true);
      setErro("");

      const { inicio, fim } = getPeriodoConsulta(dataBase, mesBase);

      const response = await listarReservasSala({
        inicio,
        fim,
        tipoEspaco: tipoFiltro === "TODOS" ? undefined : tipoFiltro,
        nomeEspaco: nomeFiltro === "TODOS" ? undefined : nomeFiltro,
      });

      setReservas(Array.isArray(response) ? response : []);

      const dataCalendario =
        modoConsulta === "MES"
          ? `${mesBase}-01`
          : dataBase;

      setTimeout(() => {
        calendarioRef.current
          ?.getApi()
          .gotoDate(dataCalendario);
      }, 0);
    } catch (error: any) {
      console.error(error);

      setErro(
        error?.response?.data?.error ||
        "Não foi possível carregar as reservas."
      );

      setReservas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function iniciarTela() {
      try {
        const me = await getMeAdUser();
        setUsuarioLogado(me);
      } catch (error) {
        console.error("Erro ao buscar usuário logado:", error);
      } finally {
        await carregarReservas();
      }
    }

    iniciarTela();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const espacosFiltrados = useMemo(() => {
    return espacos.filter((espaco) => {
      if (tipoFiltro !== "TODOS" && espaco.tipo !== tipoFiltro) return false;
      if (nomeFiltro !== "TODOS" && espaco.nome !== nomeFiltro) return false;
      return true;
    });
  }, [tipoFiltro, nomeFiltro]);

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort(
      (a, b) => toDate(a.DT_INICIO).getTime() - toDate(b.DT_INICIO).getTime()
    );
  }, [reservas]);

  const eventosCalendario = useMemo(() => {
    return reservasOrdenadas.map((reserva) => {
      let backgroundColor = "#00AE9D";
      let borderColor = "#009688";

      switch (reserva.NM_ESPACO) {
        case "Sala de Reunião":
        case "Sala Reunião":
        case "Sala Reunião 1":
          backgroundColor = "#00AE9D";
          borderColor = "#009688";
          break;

        case "Sala da Diretória":
        case "Sala da Diretoria":
          backgroundColor = "#F59E0B";
          borderColor = "#D97706";
          break;

        case "Auditório":
          backgroundColor = "#2563EB";
          borderColor = "#1D4ED8";
          break;

        default:
          backgroundColor = "#64748B";
          borderColor = "#475569";
      }

      return {
        id: String(reserva.ID_RESERVA_SALA),

        title: `${reserva.NM_ESPACO} - ${reserva.DS_TITULO}`,

        start: String(reserva.DT_INICIO).replace(" ", "T"),
        end: String(reserva.DT_FIM).replace(" ", "T"),

        backgroundColor,
        borderColor,
        textColor: "#FFFFFF",

        extendedProps: {
          reserva,
          espaco: reserva.NM_ESPACO,
          responsavel:
            reserva.NM_USUARIO ||
            reserva.DS_LOGIN ||
            "Responsável não informado",
          departamento:
            reserva.DS_DEPARTAMENTO ||
            "Departamento não informado",
          observacao: reserva.DS_OBSERVACAO || "",
        },
      };
    });
  }, [reservasOrdenadas]);

  function reservaAtualDoEspaco(nomeEspaco: string) {
    const hoje = dataConsulta === hojeISO();
    const agora = new Date();

    if (!hoje) return null;

    return reservasOrdenadas.find((reserva) => {
      if (reserva.NM_ESPACO !== nomeEspaco) return false;

      const inicio = toDate(reserva.DT_INICIO);
      const fim = toDate(reserva.DT_FIM);

      return agora >= inicio && agora <= fim;
    });
  }

  function proximaReservaDoEspaco(nomeEspaco: string) {
    const agora = new Date();

    return reservasOrdenadas.find((reserva) => {
      if (reserva.NM_ESPACO !== nomeEspaco) return false;

      const inicio = toDate(reserva.DT_INICIO);

      if (dataConsulta === hojeISO()) {
        return inicio > agora;
      }

      return true;
    });
  }

  function getStatusEspaco(nomeEspaco: string) {
    const atual = reservaAtualDoEspaco(nomeEspaco);
    const proxima = proximaReservaDoEspaco(nomeEspaco);

    if (atual) {
      return {
        status: "OCUPADO",
        titulo: "Reservado agora",
        descricao: `${formatHora(atual.DT_INICIO)} até ${formatHora(
          atual.DT_FIM
        )}`,
        reserva: atual,
      };
    }

    if (proxima) {
      return {
        status: "DISPONIVEL",
        titulo: "Disponível agora",
        descricao: `Próxima reserva às ${formatHora(proxima.DT_INICIO)}`,
        reserva: proxima,
      };
    }

    return {
      status: "DISPONIVEL",
      titulo: "Disponível",
      descricao: "Sem reservas para este dia",
      reserva: null,
    };
  }

  async function cancelarReserva(id: number) {
    const confirmar = window.confirm("Deseja realmente cancelar esta reserva?");

    if (!confirmar) return;

    try {
      setErro("");
      setInfo("");

      await cancelarReservaSala(id);

      setInfo("Reserva cancelada com sucesso.");
      await carregarReservas();
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error || "Não foi possível cancelar a reserva."
      );
    }
  }

  function limparFiltros() {
    const hoje = hojeISO();

    setModoConsulta("MES");
    setTipoFiltro("TODOS");
    setNomeFiltro("TODOS");
    setDataConsulta(hoje);
    setMesConsulta(hoje.slice(0, 7));

    setTimeout(() => {
      carregarReservas(hoje);
    }, 0);
  }

  function normalizarLogin(value?: string | null) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function usuarioPodeCancelarReserva(item: ReservaSalaItem) {
    const loginReserva = normalizarLogin(item.DS_LOGIN);
    const loginAtual = normalizarLogin(usuarioLogado?.username);

    return loginReserva && loginAtual && loginReserva === loginAtual;
  }

  return (
    <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">
              Disponibilidade das salas
            </h2>
            <p className="mt-1 text-base text-primary">
              Escolha uma data e veja rapidamente se a sala ou auditório está livre.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/auth/reserva_sala_reuniao")}
            className={buttonPrimary}
          >
            <FaPlus />
            Nova Reserva
          </button>
        </div>
      </div>

      {(erro || info) && (
        <div>
          {erro ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-700">
              {erro}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-medium text-primary">
              {info}
            </div>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-800">
            Filtros de consulta
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Use poucos filtros para encontrar a informação mais rápido.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <Field label="Consulta">
              <select
                value={modoConsulta}
                onChange={(e) =>
                  setModoConsulta(e.target.value as "DIA" | "MES")
                }
                className={inputBase}
              >
                <option value="DIA">Por dia</option>
                <option value="MES">Por mês</option>
              </select>
            </Field>
          </div>

          <div className="md:col-span-3">
            <Field label={modoConsulta === "MES" ? "Mês" : "Data"}>
              {modoConsulta === "MES" ? (
                <input
                  type="month"
                  value={mesConsulta}
                  onChange={(e) => setMesConsulta(e.target.value)}
                  className={inputBase}
                />
              ) : (
                <input
                  type="date"
                  value={dataConsulta}
                  onChange={(e) => setDataConsulta(e.target.value)}
                  className={inputBase}
                />
              )}
            </Field>
          </div>

          {/*<div className="md:col-span-2">
            <Field label="Tipo de espaço">
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as any);
                  setNomeFiltro("TODOS");
                }}
                className={inputBase}
              >
                <option value="TODOS">Todos</option>
                <option value="SALA_REUNIAO">Sala de reunião</option>
                <option value="AUDITORIO">Auditório</option>
              </select>
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Espaço">
              <select
                value={nomeFiltro}
                onChange={(e) => setNomeFiltro(e.target.value)}
                className={inputBase}
              >
                <option value="TODOS">Todos</option>
                {espacos
                  .filter((item) =>
                    tipoFiltro === "TODOS" ? true : item.tipo === tipoFiltro
                  )
                  .map((item) => (
                    <option key={item.nome} value={item.nome}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </Field>
          </div>*/}

          <div className="md:col-span-6">
            <Field label="Ações">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => carregarReservas()}
                  className={`${buttonPrimary} flex-1`}
                >
                  <FaSearch />
                  Buscar
                </button>

                <button
                  type="button"
                  onClick={limparFiltros}
                  className={buttonSecondary}
                >
                  Limpar
                </button>
              </div>
            </Field>
          </div>
        </div>
      </section>

      {/*<section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {espacosFiltrados.map((espaco) => {
          const status = getStatusEspaco(espaco.nome);
          const ocupado = status.status === "OCUPADO";

          return (
            <div
              key={espaco.nome}
              className={`rounded-3xl border p-5 shadow-sm ${ocupado
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-emerald-50"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${ocupado
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-primary"
                      }`}
                  >
                    {ocupado ? (
                      <FaTimesCircle size={24} />
                    ) : (
                      <FaCheckCircle size={24} />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {espaco.label}
                    </h3>
                    <p
                      className={`mt-1 text-base font-bold ${ocupado ? "text-red-700" : "text-primary"
                        }`}
                    >
                      {status.titulo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/80 p-4">
                <p className="flex items-center gap-2 text-base font-semibold text-slate-700">
                  <FaClock />
                  {status.descricao}
                </p>

                {status.reserva ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>
                      <strong>Reunião:</strong> {status.reserva.DS_TITULO}
                    </p>
                    <p>
                      <strong>Reservado por:</strong>{" "}
                      {status.reserva.NM_USUARIO ||
                        status.reserva.DS_LOGIN ||
                        "-"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Nenhuma reunião cadastrada para este espaço.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>*/}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Visualização das reservas
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Escolha entre a visualização em calendário ou em lista.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setModoVisualizacao("CALENDARIO");

                setTimeout(() => {
                  calendarioRef.current
                    ?.getApi()
                    .gotoDate(
                      modoConsulta === "MES"
                        ? `${mesConsulta}-01`
                        : dataConsulta
                    );
                }, 0);
              }}
              className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${modoVisualizacao === "CALENDARIO"
                ? "bg-secondary text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
                }`}
            >
              <FaCalendarAlt />
              Calendário
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao("LISTA")}
              className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${modoVisualizacao === "LISTA"
                ? "bg-secondary text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
                }`}
            >
              <FaList />
              Lista
            </button>
          </div>
        </div>
      </section>

      {modoVisualizacao === "CALENDARIO" && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-emerald-50/60 px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-primary">
                    <FaCalendarAlt size={20} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Calendário de reservas
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Acompanhe todas as reservas do período de forma rápida e visual.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  <span className="h-3 w-3 rounded-full bg-[#00AE9D]" />
                  Sala de Reunião
                </div>

                <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  <span className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                  Sala da Diretoria
                </div>

                <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                  <span className="h-3 w-3 rounded-full bg-[#2563EB]" />
                  Auditório
                </div>
              </div>
            </div>
          </div>

          <div className="calendar-reservas-wrapper p-4 sm:p-6 lg:p-8">
            <FullCalendar
              ref={calendarioRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
              ]}
              locale={ptBrLocale}
              initialView="dayGridMonth"
              events={eventosCalendario}
              eventDisplay="block"
              eventBorderColor="transparent"
              dayMaxEvents={3}
              fixedWeekCount={false}
              showNonCurrentDates
              eventContent={(eventInfo) => {
                const reserva =
                  eventInfo.event.extendedProps.reserva as ReservaSalaItem;

                return (
                  <div className="w-full overflow-hidden px-1.5 py-0.5 text-xs font-semibold leading-4">
                    <div className="truncate font-bold">
                      {formatHora(reserva.DT_INICIO)} às{" "}
                      {formatHora(reserva.DT_FIM)}
                    </div>

                    <div className="truncate opacity-95">
                      {reserva.NM_ESPACO} - {reserva.DS_TITULO}
                    </div>
                  </div>
                );
              }}
              eventMouseEnter={(info) => {
                const reserva =
                  info.event.extendedProps.reserva as ReservaSalaItem;

                const rect = info.el.getBoundingClientRect();

                setTooltipReserva({
                  reserva,
                  x: Math.min(rect.left, window.innerWidth - 340),
                  y: rect.bottom + 8,
                });
              }}
              eventMouseLeave={() => {
                setTooltipReserva(null);
              }}
              displayEventTime={false}
              height="auto"
              contentHeight={780}
              nowIndicator
              allDaySlot={false}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
              }}
            />
          </div>

          <style jsx global>{`
            .calendar-reservas-wrapper .fc {
              --fc-border-color: #e2e8f0;
              --fc-page-bg-color: #ffffff;
              --fc-neutral-bg-color: #f8fafc;
              --fc-today-bg-color: #fef9c3;
              font-family: inherit;
            }

            .calendar-reservas-wrapper .fc .fc-toolbar {
              margin-bottom: 1.5rem;
              gap: 1rem;
            }

            .calendar-reservas-wrapper .fc .fc-toolbar-title {
              color: #0f172a;
              font-size: 1.5rem;
              font-weight: 800;
              text-transform: capitalize;
            }

            .calendar-reservas-wrapper .fc .fc-button {
              border: 0;
              border-radius: 0.75rem;
              background: #0f253a;
              padding: 0.7rem 1rem;
              font-weight: 700;
              box-shadow: 0 1px 2px rgb(15 23 42 / 0.12);
              transition:
                transform 150ms ease,
                background-color 150ms ease,
                box-shadow 150ms ease;
            }

            .calendar-reservas-wrapper .fc .fc-button:hover {
              background: #1e3a52;
              box-shadow: 0 8px 20px -12px rgb(15 23 42 / 0.65);
              transform: translateY(-1px);
            }

            .calendar-reservas-wrapper .fc .fc-button-primary:not(:disabled).fc-button-active,
            .calendar-reservas-wrapper .fc .fc-button-primary:not(:disabled):active {
              background: #79b729;
            }

            .calendar-reservas-wrapper .fc .fc-scrollgrid {
              overflow: hidden;
              border-radius: 1rem;
              border: 1px solid #e2e8f0;
              box-shadow: 0 12px 30px -24px rgb(15 23 42 / 0.45);
            }

            .calendar-reservas-wrapper .fc .fc-col-header-cell {
              background: #f8fafc;
              padding: 0.75rem 0.4rem;
            }

            .calendar-reservas-wrapper .fc .fc-col-header-cell-cushion {
              color: #334155;
              font-size: 0.78rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-day {
              min-height: 8rem;
              background: #ffffff;
              transition: background-color 150ms ease;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-day:hover {
              background: #f8fafc;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-day-frame {
              min-height: 8rem;
              padding: 0.35rem;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-day-number {
              display: inline-flex;
              min-width: 1.8rem;
              height: 1.8rem;
              align-items: center;
              justify-content: center;
              border-radius: 9999px;
              color: #475569;
              font-size: 0.8rem;
              font-weight: 800;
            }

            .calendar-reservas-wrapper .fc .fc-day-today .fc-daygrid-day-number {
              background: #79b729;
              color: #ffffff;
            }

            .calendar-reservas-wrapper .fc .fc-day-other {
              background: #f8fafc;
            }

            .calendar-reservas-wrapper .fc .fc-day-other .fc-daygrid-day-number {
              color: #cbd5e1;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-event {
              margin: 0.18rem 0.25rem;
              border-radius: 0.6rem;
              padding: 0.2rem;
              box-shadow: 0 5px 14px -10px rgb(15 23 42 / 0.8);
              transition:
                transform 150ms ease,
                box-shadow 150ms ease,
                filter 150ms ease;
            }

            .calendar-reservas-wrapper .fc .fc-daygrid-event:hover {
              filter: brightness(0.98);
              box-shadow: 0 10px 20px -12px rgb(15 23 42 / 0.75);
              transform: translateY(-1px);
            }

            .calendar-reservas-wrapper .fc .fc-more-link {
              margin-left: 0.3rem;
              color: #047857;
              font-size: 0.75rem;
              font-weight: 800;
            }

            @media (max-width: 1024px) {
              .calendar-reservas-wrapper .fc .fc-toolbar {
                align-items: stretch;
                flex-direction: column;
              }

              .calendar-reservas-wrapper .fc .fc-toolbar-chunk {
                display: flex;
                justify-content: center;
              }

              .calendar-reservas-wrapper .fc .fc-toolbar-title {
                font-size: 1.25rem;
              }

              .calendar-reservas-wrapper .fc .fc-daygrid-day-frame {
                min-height: 7rem;
              }
            }
          `}</style>
        </section>
      )}

      {tooltipReserva && (
        <div
          className="pointer-events-none fixed z-9999 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          style={{
            left: tooltipReserva.x,
            top: tooltipReserva.y,
          }}
        >
          <div className="mb-3 border-b border-slate-100 pb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Detalhes da reserva
            </p>

            <h4 className="mt-1 text-base font-bold text-slate-900">
              {tooltipReserva.reserva.DS_TITULO}
            </h4>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>Espaço:</strong>{" "}
              {tooltipReserva.reserva.NM_ESPACO}
            </p>

            <p>
              <strong>Data:</strong>{" "}
              {formatDateBR(tooltipReserva.reserva.DT_INICIO)}
            </p>

            <p>
              <strong>Horário:</strong>{" "}
              {formatHora(tooltipReserva.reserva.DT_INICIO)} às{" "}
              {formatHora(tooltipReserva.reserva.DT_FIM)}
            </p>

            <p>
              <strong>Responsável:</strong>{" "}
              {tooltipReserva.reserva.NM_USUARIO ||
                tooltipReserva.reserva.DS_LOGIN ||
                "-"}
            </p>

            <p>
              <strong>Departamento:</strong>{" "}
              {tooltipReserva.reserva.DS_DEPARTAMENTO || "-"}
            </p>

            {/*tooltipReserva.reserva.DS_OBSERVACAO ? (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Observações
                </p>

                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                  {tooltipReserva.reserva.DS_OBSERVACAO}
                </p>
              </div>
            ) : null*/}
          </div>
        </div>
      )}

      {modoVisualizacao === "LISTA" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h3 className="text-lg font-bold text-slate-800">
              {modoConsulta === "MES"
                ? `Reservas do mês ${mesConsulta.split("-").reverse().join("/")}`
                : `Reservas do dia ${formatDateBR(dataConsulta)}`
              }
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Lista detalhada com horários, responsável e departamento.
            </p>
          </div>

          <div className="overflow-x-auto p-5">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
              <thead>
                <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                  <th className="border-b border-slate-200 px-4 py-3">Espaço</th>
                  <th className="border-b border-slate-200 px-4 py-3">Reunião</th>
                  <th className="border-b border-slate-200 px-4 py-3">Data e Horário</th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Responsável
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Departamento
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center">
                    Cancelar
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border-b border-slate-100 px-4 py-10 text-center text-slate-400"
                    >
                      Carregando reservas...
                    </td>
                  </tr>
                ) : reservasOrdenadas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border-b border-slate-100 px-4 py-10 text-center text-slate-400"
                    >
                      Nenhuma reserva encontrada para este período.
                    </td>
                  </tr>
                ) : (
                  reservasOrdenadas.map((item) => {
                    const inicio = formatHora(item.DT_INICIO);
                    const fim = formatHora(item.DT_FIM);

                    return (
                      <tr
                        key={item.ID_RESERVA_SALA}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-4 font-semibold">
                          <div className="flex items-center gap-2">
                            <FaDoorOpen className="text-emerald-700" />
                            {item.NM_ESPACO}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <p className="font-semibold text-slate-800">
                            {item.DS_TITULO}
                          </p>
                          {item.DS_OBSERVACAO ? (
                            <p className="mt-1 max-w-md text-xs text-slate-500">
                              {item.DS_OBSERVACAO}
                            </p>
                          ) : null}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-700">
                            <FaCalendarAlt />

                            {modoConsulta === "MES"
                              ? `${formatDateBR(item.DT_INICIO)} - ${inicio} às ${fim}`
                              : `${inicio} às ${fim}`}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {item.NM_USUARIO || item.DS_LOGIN || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          {item.DS_DEPARTAMENTO || "-"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-center">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            ATIVA
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-center">
                          {usuarioPodeCancelarReserva(item) ? (
                            <button
                              type="button"
                              onClick={() => cancelarReserva(Number(item.ID_RESERVA_SALA))}
                              className={buttonDanger}
                            >
                              <FaTrash size={13} />
                              Cancelar
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Apenas o responsável
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        <strong>Ajuda:</strong> verde significa disponível. Vermelho significa
        reservado neste momento. Para reservar um horário, clique em{" "}
        <strong>Nova Reserva</strong>.
      </div>
    </div>
  );
}