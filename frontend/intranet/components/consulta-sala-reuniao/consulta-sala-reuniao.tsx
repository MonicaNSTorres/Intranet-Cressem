// components/consulta-sala-reuniao/consulta-sala-reuniao.tsx

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDoorOpen,
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

  const [dataConsulta, setDataConsulta] = useState(hojeISO());
  const [modoConsulta, setModoConsulta] = useState<"DIA" | "MES">("DIA");
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

  async function carregarReservas(dataBase = dataConsulta) {
    try {
      setLoading(true);
      setErro("");

      const { inicio, fim } = getPeriodoConsulta(dataBase);

      const response = await listarReservasSala({
        inicio,
        fim,
        tipoEspaco: tipoFiltro === "TODOS" ? undefined : tipoFiltro,
        nomeEspaco: nomeFiltro === "TODOS" ? undefined : nomeFiltro,
      });

      setReservas(response?.items || response?.data || response || []);
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

    setModoConsulta("DIA");
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
          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
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

          <div className="md:col-span-3">
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
          </div>

          <div className="md:col-span-3">
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
      </section>

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
                <th className="border-b border-slate-200 px-4 py-3">Horário</th>
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
                          {inicio} às {fim}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        <strong>Ajuda:</strong> verde significa disponível. Vermelho significa
        reservado neste momento. Para reservar um horário, clique em{" "}
        <strong>Nova Reserva</strong>.
      </div>
    </div>
  );
}