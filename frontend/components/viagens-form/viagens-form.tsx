"use client";

import { useEffect, useState } from "react";
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTimesCircle,
} from "react-icons/fa";
import {
  buscarViagem,
  consultarDisponibilidadeMotorista,
  criarViagem,
  decidirViagem,
  listarMotoristasViagem,
  listarViagens,
  listarViagensPendentes,
  obterPerfilViagens,
  pesquisarFuncionariosViagem,
  type FuncionarioViagem,
  type IndisponibilidadeMotorista,
  type MotoristaViagem,
  type PerfilViagens,
  type StatusViagem,
  type TipoViagem,
  type ViagemDetalhe,
  type ViagemItem,
} from "@/services/viagens.service";

const inputBase =
  "h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50";
const labelBase =
  "block text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600";
const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-primary/35 bg-primary/10 px-4 text-sm font-bold text-[#006f65] shadow-sm transition hover:bg-primary hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60";

type Aba = "SOLICITACAO" | "AGENDA" | "APROVACOES";

function hojeISO() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

function montarDataHora(data: string, hora: string) {
  return data && hora ? `${data}T${hora}:00` : "";
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "Não informado";
  const normalizado = String(valor).replace(" ", "T");
  const [data, horaCompleta] = normalizado.split("T");
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return String(valor);
  return `${dia}/${mes}/${ano}${horaCompleta ? ` às ${horaCompleta.slice(0, 5)}` : ""}`;
}

function textoErro(error: any, padrao: string) {
  return error?.response?.data?.error || error?.message || padrao;
}

function tituloTipo(tipo: TipoViagem) {
  return tipo === "IDA_VOLTA" ? "Ida e volta" : "Somente ida";
}

function tituloStatus(status: StatusViagem) {
  if (status === "APROVADA") return "Aprovada";
  if (status === "REPROVADA") return "Reprovada";
  return "Pendente Secretaria";
}

function BadgeStatus({ status }: { status: StatusViagem }) {
  const estilo =
    status === "APROVADA"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "REPROVADA"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${estilo}`}
    >
      {tituloStatus(status)}
    </span>
  );
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
      <label className={labelBase}>{label}</label>
      {children}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Secao({
  title,
  children,
  subtitle,
  permitirSobreposicao = false,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  permitirSobreposicao?: boolean;
}) {
  return (
    <section
      className={`${permitirSobreposicao ? "overflow-visible" : "overflow-hidden"} rounded-3xl border border-slate-200 bg-white shadow-sm`}
    >
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.04em] text-slate-800 before:h-2 before:w-2 before:shrink-0 before:rounded-full before:bg-primary">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 pl-4 text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PaginacaoAgenda({
  pagina,
  totalPaginas,
  totalItens,
  limite,
  carregando,
  aoMudarPagina,
  aoMudarLimite,
}: {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  limite: number;
  carregando: boolean;
  aoMudarPagina: (novaPagina: number) => void;
  aoMudarLimite: (novoLimite: number) => void;
}) {
  const primeiroItem = totalItens === 0 ? 0 : (pagina - 1) * limite + 1;
  const ultimoItem = Math.min(pagina * limite, totalItens);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <p>
          Mostrando <span className="font-semibold text-slate-700">{primeiroItem}</span> até{" "}
          <span className="font-semibold text-slate-700">{ultimoItem}</span> de{" "}
          <span className="font-semibold text-slate-700">{totalItens}</span> solicitação(ões)
        </p>
        <select
          value={limite}
          disabled={carregando}
          onChange={(event) => aoMudarLimite(Number(event.target.value))}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={pagina <= 1 || carregando}
          onClick={() => aoMudarPagina(pagina - 1)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaChevronLeft /> Anterior
        </button>
        <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina >= totalPaginas || carregando}
          onClick={() => aoMudarPagina(pagina + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima <FaChevronRight />
        </button>
      </div>
    </div>
  );
}

export function ViagensForm() {
  const [aba, setAba] = useState<Aba>("SOLICITACAO");
  const [perfil, setPerfil] = useState<PerfilViagens | null>(null);
  const [tipo, setTipo] = useState<TipoViagem>("IDA_VOLTA");
  const [dataIda, setDataIda] = useState("");
  const [horaIda, setHoraIda] = useState("");
  const [retornoMesmoDia, setRetornoMesmoDia] = useState(true);
  const [dataVolta, setDataVolta] = useState("");
  const [horaVolta, setHoraVolta] = useState("");
  const [motoristaAguarda, setMotoristaAguarda] = useState<"S" | "N">("S");
  const [motoristaSelecionado, setMotoristaSelecionado] = useState("");
  const [motoristas, setMotoristas] = useState<MotoristaViagem[]>([]);
  const [carregandoMotoristas, setCarregandoMotoristas] = useState(true);
  const [disponibilidadeMotorista, setDisponibilidadeMotorista] = useState<
    boolean | null
  >(null);
  const [indisponibilidadesMotorista, setIndisponibilidadesMotorista] =
    useState<IndisponibilidadeMotorista[]>([]);
  const [verificandoDisponibilidade, setVerificandoDisponibilidade] =
    useState(false);
  const [destino, setDestino] = useState("");
  const [buscaAcompanhante, setBuscaAcompanhante] = useState("");
  const [opcoesAcompanhante, setOpcoesAcompanhante] = useState<
    FuncionarioViagem[]
  >([]);
  const [acompanhantes, setAcompanhantes] = useState<FuncionarioViagem[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [agenda, setAgenda] = useState<ViagemItem[]>([]);
  const [totalAgenda, setTotalAgenda] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [limiteAgenda, setLimiteAgenda] = useState(10);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<StatusViagem | "">("");
  const [filtroSolicitante, setFiltroSolicitante] = useState("");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [pendentes, setPendentes] = useState<ViagemItem[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);
  const [detalhe, setDetalhe] = useState<ViagemDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [modoReprovacao, setModoReprovacao] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");
  const [decidindo, setDecidindo] = useState(false);

  useEffect(() => {
    setDataIda(hojeISO());
    async function iniciar() {
      try {
        const [dadosPerfil, dadosMotoristas] = await Promise.all([
          obterPerfilViagens(),
          listarMotoristasViagem(),
        ]);
        setPerfil(dadosPerfil);
        setMotoristas(dadosMotoristas);
      } catch (error: any) {
        setErro(
          textoErro(
            error,
            "Não foi possível identificar seu acesso a Viagens.",
          ),
        );
      } finally {
        setCarregandoMotoristas(false);
      }
    }
    void iniciar();
  }, []);

  useEffect(() => {
    if (tipo === "SOMENTE_IDA") {
      setDataVolta("");
      setHoraVolta("");
    } else if (retornoMesmoDia) {
      setDataVolta(dataIda);
    }
    setDisponibilidadeMotorista(null);
    setIndisponibilidadesMotorista([]);
  }, [
    tipo,
    retornoMesmoDia,
    dataIda,
    horaIda,
    dataVolta,
    horaVolta,
    motoristaAguarda,
    motoristaSelecionado,
  ]);

  useEffect(() => {
    const idMotorista = Number(motoristaSelecionado);
    const ida = montarDataHora(dataIda, horaIda);
    const volta =
      tipo === "IDA_VOLTA" ? montarDataHora(dataVolta, horaVolta) : "";

    if (
      !Number.isInteger(idMotorista) ||
      idMotorista <= 0 ||
      !ida ||
      (tipo === "IDA_VOLTA" && !volta) ||
      (volta && volta <= ida)
    ) {
      setDisponibilidadeMotorista(null);
      setIndisponibilidadesMotorista([]);
      return;
    }

    let ativo = true;
    const timer = window.setTimeout(async () => {
      try {
        setVerificandoDisponibilidade(true);
        const resultado = await consultarDisponibilidadeMotorista({
          id_funcionario_motorista: idMotorista,
          tipo_viagem: tipo,
          dt_ida: ida,
          dt_volta: volta || null,
          sn_motorista_aguarda: tipo === "IDA_VOLTA" ? motoristaAguarda : null,
        });
        if (!ativo) return;
        setDisponibilidadeMotorista(resultado.disponivel);
        setIndisponibilidadesMotorista(resultado.items);
      } catch (error: any) {
        if (!ativo) return;
        setDisponibilidadeMotorista(null);
        setIndisponibilidadesMotorista([]);
        setErro(
          textoErro(
            error,
            "Não foi possível consultar a disponibilidade do motorista.",
          ),
        );
      } finally {
        if (ativo) setVerificandoDisponibilidade(false);
      }
    }, 300);

    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [
    motoristaSelecionado,
    tipo,
    dataIda,
    horaIda,
    dataVolta,
    horaVolta,
    motoristaAguarda,
  ]);

  useEffect(() => {
    if (buscaAcompanhante.trim().length < 2) {
      setOpcoesAcompanhante([]);
      return;
    }
    let ativo = true;
    const timer = window.setTimeout(async () => {
      try {
        const items = await pesquisarFuncionariosViagem(
          buscaAcompanhante.trim(),
        );
        if (ativo) setOpcoesAcompanhante(items);
      } catch {
        if (ativo) setOpcoesAcompanhante([]);
      }
    }, 300);
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [buscaAcompanhante]);

  async function carregarAgenda(novaPagina = pagina, novoLimite = limiteAgenda) {
    try {
      setCarregandoAgenda(true);
      const result = await listarViagens({
        page: novaPagina,
        limit: novoLimite,
        status: filtroStatus,
        solicitante: filtroSolicitante.trim(),
        periodo_inicio: filtroInicio,
        periodo_fim: filtroFim,
      });
      setAgenda(result.items || []);
      setTotalAgenda(result.total || 0);
      setPagina(result.page || novaPagina);
      setTotalPaginas(result.total_pages || 1);
    } catch (error: any) {
      setErro(textoErro(error, "Não foi possível carregar a agenda."));
    } finally {
      setCarregandoAgenda(false);
    }
  }

  function alterarLimiteAgenda(novoLimite: number) {
    setLimiteAgenda(novoLimite);
    void carregarAgenda(1, novoLimite);
  }

  async function carregarPendentes() {
    if (!perfil?.IS_CONSELHO) return;
    try {
      setCarregandoPendentes(true);
      setPendentes(await listarViagensPendentes());
    } catch (error: any) {
      setErro(textoErro(error, "Não foi possível carregar as aprovações."));
    } finally {
      setCarregandoPendentes(false);
    }
  }

  useEffect(() => {
    if (!perfil) return;
    void carregarAgenda(1);
    // A primeira carga não depende dos filtros alterados posteriormente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  useEffect(() => {
    if (aba === "AGENDA" && perfil) void carregarAgenda(1);
    if (aba === "APROVACOES") void carregarPendentes();
    // A aba é a ação explícita que atualiza as listas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  function adicionarAcompanhante(funcionario: FuncionarioViagem) {
    if (
      funcionario.NM_FUNCIONARIO.trim().toUpperCase() ===
      perfil?.NM_USUARIO.trim().toUpperCase()
    ) {
      setErro("O próprio solicitante não pode ser incluído como acompanhante.");
      return;
    }
    if (
      acompanhantes.some(
        (item) => item.ID_FUNCIONARIO === funcionario.ID_FUNCIONARIO,
      )
    ) {
      setErro("Este acompanhante já foi incluído.");
      return;
    }
    setErro("");
    setAcompanhantes((atual) => [...atual, funcionario]);
    setBuscaAcompanhante("");
    setOpcoesAcompanhante([]);
  }

  async function verificarDisponibilidade() {
    const ida = montarDataHora(dataIda, horaIda);
    const volta =
      tipo === "IDA_VOLTA" ? montarDataHora(dataVolta, horaVolta) : "";
    const idMotorista = Number(motoristaSelecionado);
    if (!Number.isInteger(idMotorista) || idMotorista <= 0) {
      setErro("Selecione um motorista.");
      return false;
    }
    if (!ida || (tipo === "IDA_VOLTA" && !volta)) {
      setErro(
        "Informe as datas e horários da viagem antes de verificar a disponibilidade.",
      );
      return false;
    }
    if (volta && volta <= ida) {
      setErro("O retorno deve ser posterior à ida.");
      return false;
    }
    try {
      setVerificandoDisponibilidade(true);
      setErro("");
      const resultado = await consultarDisponibilidadeMotorista({
        id_funcionario_motorista: idMotorista,
        tipo_viagem: tipo,
        dt_ida: ida,
        dt_volta: volta || null,
        sn_motorista_aguarda: tipo === "IDA_VOLTA" ? motoristaAguarda : null,
      });
      setDisponibilidadeMotorista(resultado.disponivel);
      setIndisponibilidadesMotorista(resultado.items);
      return resultado.disponivel;
    } catch (error: any) {
      setErro(
        textoErro(
          error,
          "Não foi possível verificar a disponibilidade do motorista.",
        ),
      );
      return false;
    } finally {
      setVerificandoDisponibilidade(false);
    }
  }

  async function salvar() {
    setErro("");
    setSucesso("");
    if (!destino.trim()) {
      setErro("Informe o destino.");
      return;
    }
    if (!motoristaSelecionado) {
      setErro("Selecione um motorista.");
      return;
    }
    const ida = montarDataHora(dataIda, horaIda);
    const volta =
      tipo === "IDA_VOLTA" ? montarDataHora(dataVolta, horaVolta) : "";
    if (!ida || (tipo === "IDA_VOLTA" && !volta)) {
      setErro("Informe as datas e horários obrigatórios.");
      return;
    }
    if (volta && volta <= ida) {
      setErro("O retorno deve ser posterior à ida.");
      return;
    }

    try {
      setSalvando(true);
      const disponivel = await verificarDisponibilidade();
      if (!disponivel) {
        if (!erro)
          setErro("Este motorista já possui uma viagem neste horário.");
        return;
      }
      const result = await criarViagem({
        TP_VIAGEM: tipo,
        DT_IDA: ida,
        DT_VOLTA: volta || null,
        SN_MOTORISTA_AGUARDA: tipo === "IDA_VOLTA" ? motoristaAguarda : null,
        DS_DESTINO: destino.trim(),
        ID_FUNCIONARIO_MOTORISTA: Number(motoristaSelecionado),
        ACOMPANHANTES: acompanhantes.map(({ ID_FUNCIONARIO }) => ({
          ID_FUNCIONARIO,
        })),
      });
      setSucesso(result?.mensagem || "Viagem cadastrada com sucesso.");
      setDestino("");
      setHoraIda("");
      setHoraVolta("");
      setAcompanhantes([]);
      setDisponibilidadeMotorista(null);
      setIndisponibilidadesMotorista([]);
      void carregarAgenda(1);
    } catch (error: any) {
      const itens = error?.response?.data?.items;
      if (Array.isArray(itens)) setIndisponibilidadesMotorista(itens);
      setErro(textoErro(error, "Não foi possível cadastrar a viagem."));
    } finally {
      setSalvando(false);
    }
  }

  async function abrirDetalhe(id: number) {
    try {
      setCarregandoDetalhe(true);
      setModoReprovacao(false);
      setMotivoReprovacao("");
      setDetalhe(await buscarViagem(id));
    } catch (error: any) {
      setErro(
        textoErro(error, "Não foi possível abrir os detalhes da viagem."),
      );
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function registrarDecisao(acao: "APROVADA" | "REPROVADA") {
    if (!detalhe) return;
    if (acao === "REPROVADA" && !motivoReprovacao.trim()) {
      setErro("Informe o motivo da reprovação.");
      return;
    }
    try {
      setDecidindo(true);
      await decidirViagem(detalhe.ID_VIAGEM, {
        ACAO: acao,
        DS_MOTIVO_REPROVACAO:
          acao === "REPROVADA" ? motivoReprovacao.trim() : undefined,
      });
      setSucesso(
        acao === "APROVADA" ? "Viagem aprovada." : "Viagem reprovada.",
      );
      setDetalhe(null);
      void carregarPendentes();
      void carregarAgenda(1);
    } catch (error: any) {
      setErro(textoErro(error, "Não foi possível registrar a decisão."));
    } finally {
      setDecidindo(false);
    }
  }

  const podeDecidir = Boolean(
    perfil?.IS_CONSELHO && detalhe?.ST_VIAGEM === "PENDENTE_CONSELHO",
  );

  return (
    <div className="mx-auto w-full space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setAba("SOLICITACAO")}
          className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-bold transition ${aba === "SOLICITACAO" ? "bg-secondary text-white shadow-sm" : "text-slate-600 hover:bg-primary/10 hover:text-[#006f65]"}`}
        >
          Nova solicitação
        </button>
        <button
          type="button"
          onClick={() => setAba("AGENDA")}
          className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-bold transition ${aba === "AGENDA" ? "bg-secondary text-white shadow-sm" : "text-slate-600 hover:bg-primary/10 hover:text-[#006f65]"}`}
        >
          Agenda
        </button>
        {perfil?.IS_CONSELHO ? (
          <button
            type="button"
            onClick={() => setAba("APROVACOES")}
            className={`inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-bold transition ${aba === "APROVACOES" ? "bg-secondary text-white shadow-sm" : "text-slate-600 hover:bg-primary/10 hover:text-[#006f65]"}`}
          >
            Aprovações
          </button>
        ) : null}
      </div>

      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {erro}
        </div>
      ) : null}
      {sucesso ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          {sucesso}
        </div>
      ) : null}

      {aba === "SOLICITACAO" ? (
        <div className="space-y-4">
          <Secao
            title="Solicitante"
            subtitle="Os dados são registrados a partir do usuário autenticado."
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
              <Field label="Solicitante">
                <input
                  className={`${inputBase} bg-slate-50`}
                  value={perfil?.NM_USUARIO || "Carregando..."}
                  readOnly
                />
              </Field>
              <Field label="Motorista">
                <select
                  className={inputBase}
                  value={motoristaSelecionado}
                  disabled={carregandoMotoristas}
                  onChange={(event) =>
                    setMotoristaSelecionado(event.target.value)
                  }
                >
                  <option value="">
                    {carregandoMotoristas
                      ? "Carregando motoristas..."
                      : "Selecione o motorista"}
                  </option>
                  {motoristas.map((motorista) => (
                    <option
                      key={motorista.ID_FUNCIONARIO}
                      value={motorista.ID_FUNCIONARIO}
                    >
                      {motorista.NM_FUNCIONARIO}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Secao>

          <Secao title="Dados da viagem">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Tipo de viagem">
                <select
                  className={inputBase}
                  value={tipo}
                  onChange={(event) =>
                    setTipo(event.target.value as TipoViagem)
                  }
                >
                  <option value="IDA_VOLTA">Ida e volta</option>
                  <option value="SOMENTE_IDA">Somente ida</option>
                </select>
              </Field>
              <Field label="Data da ida">
                <input
                  className={inputBase}
                  type="date"
                  value={dataIda}
                  onChange={(event) => setDataIda(event.target.value)}
                />
              </Field>
              <Field label="Horário da ida">
                <input
                  className={inputBase}
                  type="time"
                  value={horaIda}
                  onChange={(event) => setHoraIda(event.target.value)}
                />
              </Field>
              <Field label="Destino">
                <input
                  className={inputBase}
                  value={destino}
                  onChange={(event) => setDestino(event.target.value)}
                  placeholder="Informe cidade, unidade ou local"
                />
              </Field>
            </div>
            {!carregandoMotoristas && motoristas.length === 0 ? (
              <p className="mt-3 text-sm text-amber-700">
                Nenhum motorista ativo foi encontrado.
              </p>
            ) : null}
            {verificandoDisponibilidade ? (
              <p className="mt-3 text-sm text-slate-500">
                Consultando disponibilidade do motorista...
              </p>
            ) : null}
            {disponibilidadeMotorista === true ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Motorista disponível para este horário.
              </p>
            ) : null}
            {disponibilidadeMotorista === false ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">
                  Este motorista já possui uma viagem neste horário.
                </p>
                {indisponibilidadesMotorista.map((item) => (
                  <p key={item.ID_VIAGEM} className="mt-1">
                    {formatarDataHora(item.DT_IDA)}
                    {item.DT_VOLTA
                      ? ` até ${formatarDataHora(item.DT_VOLTA)}`
                      : ""}{" "}
                    · {item.DS_DESTINO} · {tituloStatus(item.ST_VIAGEM)}
                  </p>
                ))}
              </div>
            ) : null}
            {tipo === "IDA_VOLTA" ? (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={retornoMesmoDia}
                    onChange={(event) =>
                      setRetornoMesmoDia(event.target.checked)
                    }
                  />{" "}
                  Retorno no mesmo dia
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Data da volta">
                    <input
                      className={inputBase}
                      type="date"
                      value={dataVolta}
                      min={dataIda || undefined}
                      disabled={retornoMesmoDia}
                      onChange={(event) => setDataVolta(event.target.value)}
                    />
                  </Field>
                  <Field label="Horário da volta">
                    <input
                      className={inputBase}
                      type="time"
                      value={horaVolta}
                      onChange={(event) => setHoraVolta(event.target.value)}
                    />
                  </Field>
                  <Field label="Motorista aguarda no destino?">
                    <select
                      className={inputBase}
                      value={motoristaAguarda}
                      onChange={(event) =>
                        setMotoristaAguarda(event.target.value as "S" | "N")
                      }
                    >
                      <option value="S">Sim</option>
                      <option value="N">Não</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}
          </Secao>

          <Secao
            title="Acompanhantes"
            subtitle="Pesquise funcionários existentes e adicione somente quem participará da viagem."
            permitirSobreposicao
          >
            <div className="relative max-w-2xl">
              <div className="flex gap-2">
                <input
                  className={inputBase}
                  value={buscaAcompanhante}
                  onChange={(event) => setBuscaAcompanhante(event.target.value)}
                  placeholder="Digite ao menos 2 letras do nome"
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500">
                  <FaSearch />
                </span>
              </div>
              {opcoesAcompanhante.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {opcoesAcompanhante.map((funcionario) => (
                    <button
                      type="button"
                      key={funcionario.ID_FUNCIONARIO}
                      onClick={() => adicionarAcompanhante(funcionario)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    >
                      <span>{funcionario.NM_FUNCIONARIO}</span>
                      <FaPlus className="text-emerald-700" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {acompanhantes.length === 0 ? (
                <span className="text-sm text-slate-500">
                  Nenhum acompanhante incluído.
                </span>
              ) : (
                acompanhantes.map((item) => (
                  <span
                    key={item.ID_FUNCIONARIO}
                    className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800"
                  >
                    {item.NM_FUNCIONARIO}
                    <button
                      type="button"
                      className="text-violet-700 hover:text-violet-950"
                      aria-label={`Remover ${item.NM_FUNCIONARIO}`}
                      onClick={() =>
                        setAcompanhantes((atual) =>
                          atual.filter(
                            (acompanhante) =>
                              acompanhante.ID_FUNCIONARIO !==
                              item.ID_FUNCIONARIO,
                          ),
                        )
                      }
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))
              )}
            </div>
          </Secao>

          <div className="flex justify-end">
            <button
              type="button"
              className={primaryButton}
              disabled={
                salvando || !perfil || disponibilidadeMotorista !== true
              }
              onClick={() => void salvar()}
            >
              <FaCheck />
              {salvando ? "Enviando..." : "Enviar solicitação"}
            </button>
          </div>
        </div>
      ) : null}

      {aba === "AGENDA" ? (
        <Secao
          title="Agenda de viagens"
          subtitle="Consulta por período, solicitante e situação. As viagens mais próximas aparecem primeiro."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Início">
              <input
                className={inputBase}
                type="date"
                value={filtroInicio}
                onChange={(event) => setFiltroInicio(event.target.value)}
              />
            </Field>
            <Field label="Fim">
              <input
                className={inputBase}
                type="date"
                value={filtroFim}
                onChange={(event) => setFiltroFim(event.target.value)}
              />
            </Field>
            <Field label="Solicitante">
              <input
                className={inputBase}
                value={filtroSolicitante}
                onChange={(event) => setFiltroSolicitante(event.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputBase}
                value={filtroStatus}
                onChange={(event) =>
                  setFiltroStatus(event.target.value as StatusViagem | "")
                }
              >
                <option value="">Todos</option>
                <option value="PENDENTE_CONSELHO">Pendente Secretaria</option>
                <option value="APROVADA">Aprovada</option>
                <option value="REPROVADA">Reprovada</option>
              </select>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                className={`${secondaryButton} w-full`}
                onClick={() => void carregarAgenda(1)}
              >
                <FaSearch /> Filtrar
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3">Solicitante</th>
                  <th className="px-3 py-3">Destino</th>
                  <th className="px-3 py-3">Ida</th>
                  <th className="px-3 py-3">Volta</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Motorista</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {carregandoAgenda ? (
                  <tr>
                    <td className="px-3 py-5 text-slate-500" colSpan={8}>
                      Carregando agenda...
                    </td>
                  </tr>
                ) : agenda.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-slate-500" colSpan={8}>
                      Nenhuma viagem encontrada.
                    </td>
                  </tr>
                ) : (
                  agenda.map((item) => (
                    <tr
                      key={item.ID_VIAGEM}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {item.NM_SOLICITANTE}
                      </td>
                      <td className="px-3 py-3">{item.DS_DESTINO}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatarDataHora(item.DT_IDA)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.DT_VOLTA ? formatarDataHora(item.DT_VOLTA) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {tituloTipo(item.TP_VIAGEM)}
                      </td>
                      <td className="px-3 py-3">
                        {item.NM_MOTORISTA || "A definir"}
                      </td>
                      <td className="px-3 py-3">
                        <BadgeStatus status={item.ST_VIAGEM} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          onClick={() => void abrirDetalhe(item.ID_VIAGEM)}
                        >
                          <FaInfoCircle /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginacaoAgenda
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalItens={totalAgenda}
            limite={limiteAgenda}
            carregando={carregandoAgenda}
            aoMudarPagina={(novaPagina) => void carregarAgenda(novaPagina)}
            aoMudarLimite={alterarLimiteAgenda}
          />
        </Secao>
      ) : null}

      {aba === "APROVACOES" && perfil?.IS_CONSELHO ? (
        <Secao
          title="Aprovações pendentes"
          subtitle="Apenas integrantes da Secretaria podem registrar a decisão."
        >
          <div className="space-y-3">
            {carregandoPendentes ? (
              <p className="text-sm text-slate-500">
                Carregando solicitações...
              </p>
            ) : pendentes.length === 0 ? (
              <p className="text-sm text-slate-500">
                Não há solicitações pendentes.
              </p>
            ) : (
              pendentes.map((item) => (
                <div
                  key={item.ID_VIAGEM}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {item.NM_SOLICITANTE}
                      </p>
                      <BadgeStatus status={item.ST_VIAGEM} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.DS_DESTINO} · {formatarDataHora(item.DT_IDA)}
                      {item.DT_VOLTA
                        ? ` até ${formatarDataHora(item.DT_VOLTA)}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => void abrirDetalhe(item.ID_VIAGEM)}
                  >
                    <FaInfoCircle /> Analisar
                  </button>
                </div>
              ))
            )}
          </div>
        </Secao>
      ) : null}

      {carregandoDetalhe || detalhe ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Detalhes da viagem
                </h2>
                {detalhe ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {detalhe.NM_SOLICITANTE} · {detalhe.DS_DESTINO}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar detalhes"
                onClick={() => setDetalhe(null)}
              >
                <FaTimes />
              </button>
            </div>
            {carregandoDetalhe || !detalhe ? (
              <div className="p-5 text-sm text-slate-500">
                Carregando detalhes...
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className={labelBase}>Período</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatarDataHora(detalhe.DT_IDA)}
                      {detalhe.DT_VOLTA
                        ? ` até ${formatarDataHora(detalhe.DT_VOLTA)}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className={labelBase}>Status</p>
                    <div className="mt-1">
                      <BadgeStatus status={detalhe.ST_VIAGEM} />
                    </div>
                  </div>
                  <div>
                    <p className={labelBase}>Tipo / motorista</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {tituloTipo(detalhe.TP_VIAGEM)} ·{" "}
                      {detalhe.NM_MOTORISTA || "A definir"}
                    </p>
                  </div>
                  <div>
                    <p className={labelBase}>Motorista aguarda</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {detalhe.SN_MOTORISTA_AGUARDA === "S"
                        ? "Sim"
                        : detalhe.SN_MOTORISTA_AGUARDA === "N"
                          ? "Não"
                          : "Não se aplica"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className={labelBase}>Acompanhantes</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {detalhe.ACOMPANHANTES.length
                      ? detalhe.ACOMPANHANTES.map(
                          (item) => item.NM_ACOMPANHANTE,
                        ).join(", ")
                      : "Nenhum acompanhante."}
                  </p>
                </div>
                {detalhe.DS_MOTIVO_REPROVACAO ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <strong>Motivo da reprovação:</strong>{" "}
                    {detalhe.DS_MOTIVO_REPROVACAO}
                  </div>
                ) : null}
                {podeDecidir ? (
                  <div className="border-t border-slate-200 pt-4">
                    {modoReprovacao ? (
                      <div className="space-y-3">
                        <Field label="Motivo da reprovação">
                          <textarea
                            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                            value={motivoReprovacao}
                            onChange={(event) =>
                              setMotivoReprovacao(event.target.value)
                            }
                          />
                        </Field>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={secondaryButton}
                            onClick={() => setModoReprovacao(false)}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            disabled={decidindo}
                            onClick={() => void registrarDecisao("REPROVADA")}
                          >
                            <FaTimesCircle /> Confirmar reprovação
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
                          onClick={() => setModoReprovacao(true)}
                        >
                          <FaTimesCircle /> Reprovar
                        </button>
                        <button
                          type="button"
                          className={primaryButton}
                          disabled={decidindo}
                          onClick={() => void registrarDecisao("APROVADA")}
                        >
                          <FaCheck /> Aprovar
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
