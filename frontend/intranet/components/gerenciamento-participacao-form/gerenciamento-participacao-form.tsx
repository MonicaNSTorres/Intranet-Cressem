"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {

  FaChevronLeft,

  FaChevronRight,

  FaDownload,

  FaFilePdf,

  FaPlus,

  FaSearch,

  FaTimes,

} from "react-icons/fa";

import {

  baixarArquivoPatrocinio,

  baixarPdfCompletoPatrocinio,

  baixarRelatorioPatrocinios,

  buscarFuncionarioTipo,

  buscarPatrocinioPorId,

  buscarPatrociniosPaginado,

  enviarEmailConselho,

  enviarEmailDiretoria,

  enviarEmailMarketing,

  enviarEmailTesteParticipacao,

  enviarEmailParecerFinal,

  type FuncionarioTipoResponse,

  type PerfilTesteParticipacao,

  type PatrocinioItem,

  atualizarPatrocinio,

} from "@/services/gerenciamento_participacao.service";

import { getMeAdUser } from "@/services/auth.service";

import { AD_GROUPS } from "@/config/ad-groups";

import {

  criarCadernoPropostasConselho,

  criarPdfAnalisePatrocinio,

} from "@/lib/pdf/gerarPdfAnalisePatrocinio";

function capitalizeWords(value: string) {

  return String(value || "")

    .toLowerCase()

    .replace(/\b\w/g, (char) => char.toUpperCase());

}

function normalizeText(value: string) {

  return String(value || "")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toUpperCase()

    .trim();

}

function primeiroUltimoNome(nomeCompleto: string) {

  const nomes = String(nomeCompleto || "").trim().split(" ").filter(Boolean);

  if (nomes.length <= 1) return nomes[0] || "";

  return `${nomes[0]} ${nomes[nomes.length - 1]}`;

}

function formatarCPFouCNPJ(valor: string) {

  let value = String(valor || "")

    .replace(/[^a-zA-Z0-9]/g, "")

    .toUpperCase();

  if (value.length <= 11 && !/[A-Z]/.test(value)) {

    value = value.replace(/(\d{3})(\d)/, "$1.$2");

    value = value.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");

    value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{2})/, "$1.$2.$3-$4");

  }

  else {

    if (value.length > 2)

      value = value.replace(/^(.{2})(.+)/, "$1.$2");

    if (value.length > 6)

      value = value.replace(/^(.{2})\.(.{3})(.+)/, "$1.$2.$3");

    if (value.length > 10)

      value = value.replace(/^(.{2})\.(.{3})\.(.{3})(.+)/, "$1.$2.$3/$4");

    if (value.length > 15)

      value = value.replace(/^(.{2})\.(.{3})\.(.{3})\/(.{4})(.+)/, "$1.$2.$3/$4-$5");

  }

  return value;

}

function formatarDataBR(dataIso?: string) {

  if (!dataIso) return "";

  const raw = String(dataIso).slice(0, 10);

  const [ano, mes, dia] = raw.split("-");

  if (!ano || !mes || !dia) return raw;

  return `${dia}/${mes}/${ano}`;

}

type SituacaoEvento = "A realizar" | "Em andamento" | "Encerrado" | "Sem data";

function hojeISO() {

  const hoje = new Date();

  const ano = hoje.getFullYear();

  const mes = String(hoje.getMonth() + 1).padStart(2, "0");

  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;

}

function datasDoEvento(patrocinio: PatrocinioItem) {

  const dias = Array.isArray(patrocinio.DIAS)

    ? patrocinio.DIAS

      .map((dia) => String(dia.DT_DIA || "").slice(0, 10))

      .filter(Boolean)

    : [];

  const ordenadas = [...new Set(dias)].sort();

  return {

    inicio: ordenadas[0] || patrocinio.DT_EVENTO_INICIO || "",

    fim: ordenadas[ordenadas.length - 1] || patrocinio.DT_EVENTO_FIM || "",

  };

}

function periodoEvento(patrocinio: PatrocinioItem) {

  const { inicio, fim } = datasDoEvento(patrocinio);

  if (!inicio) return "Não informado";

  if (!fim || fim === inicio) return formatarDataBR(inicio);

  return `${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;

}

function situacaoDoEvento(patrocinio: PatrocinioItem): SituacaoEvento {

  const { inicio, fim } = datasDoEvento(patrocinio);

  if (!inicio) return "Sem data";

  const hoje = hojeISO();

  if (hoje < inicio) return "A realizar";

  if (hoje > (fim || inicio)) return "Encerrado";

  return "Em andamento";

}

function fmtBRL(valor: number | null | undefined) {

  return Number(valor || 0).toLocaleString("pt-BR", {

    style: "currency",

    currency: "BRL",

    minimumFractionDigits: 2,

  });

}

type PatrocinioItemComPainelSisbr = PatrocinioItem & {

  DIR_PAINEL_SISBR?: string;

};

type Totais = {

  total: number;

  gerencia: number;

  marketing: number;

  diretoria: number;

  conselho: number;

  aprovados: number;

  reprovados: number;

};

const totaisIniciais: Totais = {

  total: 0,

  gerencia: 0,

  marketing: 0,

  diretoria: 0,

  conselho: 0,

  aprovados: 0,

  reprovados: 0,

};

const inputBase =

  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10";

const primaryButtonBase =

  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#79B729] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#00AE9D] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonBase =

  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#00AE9D]/35 bg-[#00AE9D]/10 px-4 text-sm font-bold text-[#006f65] shadow-sm transition hover:bg-[#00AE9D] hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60";

const neutralButtonBase =

  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#49479D]/40 hover:bg-[#49479D]/10 hover:text-[#49479D] disabled:cursor-not-allowed disabled:opacity-60";

const MODO_TESTE_LOCAL =

  process.env.NODE_ENV === "development" &&

  process.env.NEXT_PUBLIC_PARTICIPACAO_TEST_MODE === "true";

const PERFIS_TESTE: Record<Exclude<PerfilTesteParticipacao, "">, FuncionarioTipoResponse> = {

  gerencia: { TIPO: "gerencia", NM_FUNCIONARIO: "GERÊNCIA DE TESTE" },

  marketing: { TIPO: "marketing", NM_FUNCIONARIO: "MARKETING DE TESTE" },

  diretoria: { TIPO: "diretoria", NM_FUNCIONARIO: "DIRETORIA DE TESTE" },

  conselho: { TIPO: "conselho", NM_FUNCIONARIO: "CONSELHO DE TESTE" },

};

async function mapComConcorrencia<T, R>(

  itens: T[],

  limite: number,

  executar: (item: T, index: number) => Promise<R>

): Promise<R[]> {

  if (!itens.length) return [];

  const resultados = new Array<R>(itens.length);

  let proximoIndice = 0;

  async function worker() {

    while (true) {

      const index = proximoIndice;

      proximoIndice += 1;

      if (index >= itens.length) return;

      resultados[index] = await executar(itens[index], index);

    }

  }

  const quantidadeWorkers = Math.min(

    Math.max(1, limite),

    itens.length

  );

  await Promise.all(

    Array.from({ length: quantidadeWorkers }, () => worker())

  );

  return resultados;

}

export function GerenciamentoParticipacaoForm() {

  const router = useRouter();

  const [nomeResponsavel, setNomeResponsavel] = useState("");

  const [pesquisa, setPesquisa] = useState("");

  const [statusFiltro, setStatusFiltro] = useState("");

  const [pesquisaAplicada, setPesquisaAplicada] = useState("");

  const [statusAplicado, setStatusAplicado] = useState("");

  const [loading, setLoading] = useState(false);

  const [erro, setErro] = useState("");

  const [info, setInfo] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [totalItems, setTotalItems] = useState(0);

  const [limit, setLimit] = useState(10);

  const [items, setItems] = useState<PatrocinioItem[]>([]);

  const [totais, setTotais] = useState<Totais>(totaisIniciais);

  const [funcionarioTipoReal, setFuncionarioTipoReal] = useState<FuncionarioTipoResponse | null>(null);

  const [perfilTeste, setPerfilTeste] = useState<PerfilTesteParticipacao>("");

  const funcionarioTipo = useMemo(

    () => perfilTeste ? PERFIS_TESTE[perfilTeste] : funcionarioTipoReal,

    [perfilTeste, funcionarioTipoReal]

  );

  const [isSuporte, setIsSuporte] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [selected, setSelected] = useState<PatrocinioItem | null>(null);

  const [modalErro, setModalErro] = useState("");

  const [modalInfo, setModalInfo] = useState("");

  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const salvarParecerLockRef = useRef(false);

  const [salvandoParecer, setSalvandoParecer] = useState(false);

  const [inputGerencia, setInputGerencia] = useState("");

  const [inputParecerGerenciaEscrito, setInputParecerGerenciaEscrito] = useState("");

  const [inputResponsavelEvento, setInputResponsavelEvento] = useState("");

  const [inputSugestao, setInputSugestao] = useState("");

  const [inputMarketing, setInputMarketing] = useState("");

  const [inputParecerMarketing, setInputParecerMarketing] = useState("");

  const [inputDiretoria, setInputDiretoria] = useState("");

  const [inputParecerDiretoria, setInputParecerDiretoria] = useState("");

  const [inputNomeConselho, setInputNomeConselho] = useState("");

  const [inputConselho, setInputConselho] = useState("");

  const [inputConselhoFinal, setInputConselhoFinal] = useState("");

  const [baixandoPdfCompleto, setBaixandoPdfCompleto] = useState(false);

  const [baixandoPdfConselho, setBaixandoPdfConselho] = useState(false);

  const podeBaixarPdfConselho =

    funcionarioTipo?.TIPO === "conselho" ||

    nomeResponsavel.trim().toUpperCase() === "MARCELO OLIVEIRA BUENO DA SILVA";

  const filtroConselhoAplicado =

    normalizeText(statusAplicado) === "PENDENTE CONSELHO";

  useEffect(() => {

    async function init() {

      try {

        const me = await getMeAdUser();

        const nome = String(me?.nome_completo || "").trim();

        const grupos = Array.isArray(me?.grupos) ? me.grupos : [];

        const suporte = grupos.some(

          (grupo: string) =>

            String(grupo || "").trim().toUpperCase() === AD_GROUPS.SUPORTE.toUpperCase()

        );

        setIsSuporte(suporte);

        if (!nome) {

          throw new Error("Usuário logado sem nome completo.");

        }

        setNomeResponsavel(nome);

        if (nome) {

          const tipo = await buscarFuncionarioTipo(nome);

          setFuncionarioTipoReal(tipo);

          setInputGerencia(tipo.TIPO === "gerencia" ? tipo.NM_FUNCIONARIO : "");

          setInputMarketing(tipo.TIPO === "marketing" ? tipo.NM_FUNCIONARIO : "");

          setInputDiretoria(tipo.TIPO === "diretoria" ? tipo.NM_FUNCIONARIO : "");

        }

      } catch (err: any) {

        setErro(err?.message || "Falha ao carregar usuário logado.");

      }

    }

    init();

  }, []);

  useEffect(() => {

    if (!nomeResponsavel) return;

    buscarLista(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [nomeResponsavel, isSuporte, perfilTeste]);

  async function buscarTotais() {

    if (!nomeResponsavel) return;

    try {

      const response = await buscarPatrociniosPaginado({

        nome: nomeResponsavel,

        pesquisa: " ",

        page: 1,

        limit: 999999,

        verTodos: isSuporte,

        perfilTeste,

      });

      const calc = { ...totaisIniciais };

      response.items.forEach((patrocinio) => {

        const status = normalizeText(patrocinio.NM_ANDAMENTO || "");

        calc.total += 1;

        if (status === "PENDENTE GERENCIA") calc.gerencia += 1;

        else if (status === "PENDENTE MARKETING") calc.marketing += 1;

        else if (status === "PENDENTE DIRETORIA") calc.diretoria += 1;

        else if (status === "PENDENTE CONSELHO") calc.conselho += 1;

        else if (status === "APROVADO") calc.aprovados += 1;

        else if (status === "REPROVADO") calc.reprovados += 1;

      });

      setTotais(calc);

    } catch {

      //

    }

  }

  async function buscarLista(

    page = 1,

    pageLimit = limit,

    statusOverride = statusFiltro,

    pesquisaOverride = pesquisa

  ) {

    try {

      setLoading(true);

      setErro("");

      setInfo("");

      const response = await buscarPatrociniosPaginado({

        nome: nomeResponsavel,

        pesquisa: pesquisaOverride || " ",

        status: statusOverride,

        page,

        limit: pageLimit,

        verTodos: isSuporte,

        perfilTeste,

      });

      const responseItems = response.items || [];

      const responseTotal = Number(response.total_items ?? response.total ?? 0);

      const fallbackTotal =

        response.total_pages && response.total_pages > 1

          ? (response.total_pages - 1) * pageLimit + responseItems.length

          : responseItems.length;

      setItems(responseItems);

      setPaginaAtual(page);

      setTotalPages(response.total_pages || 1);

      setTotalItems(responseTotal || fallbackTotal);

      setPesquisaAplicada(String(pesquisaOverride || "").trim());

      setStatusAplicado(statusOverride);

      await buscarTotais();

    } catch (err: any) {

      setErro(err?.message || "Falha ao buscar solicitações.");

      setItems([]);

      setTotalItems(0);

    } finally {

      setLoading(false);

    }

  }

  function alterarLimite(novoLimit: number) {

    setLimit(novoLimit);

    buscarLista(1, novoLimit);

  }

  function limpar() {

    setPesquisa("");

    setStatusFiltro("");

    setPaginaAtual(1);

    setErro("");

    setInfo("");

    if (nomeResponsavel) {

      buscarLista(1, limit, "", " ");

    } else {

      setItems([]);

      setTotais(totaisIniciais);

      setTotalPages(1);

      setTotalItems(0);

      setPesquisaAplicada("");

      setStatusAplicado("");

    }

  }

  function filtrarPorResumo(status: string) {

    setStatusFiltro(status);

    buscarLista(1, limit, status);

  }

  function abrirCadastro() {

    router.push("/auth/solicitacao_participacao");

  }

  async function abrirAndamento(item: PatrocinioItem) {

    try {

      setErro("");

      setModalErro("");

      setModalInfo("");

      const completo = await buscarPatrocinioPorId(item.ID_PATROCINIO);

      setSelected(completo);

      setInputGerencia(

        completo.NM_GERENCIA ||

        (funcionarioTipo?.TIPO === "gerencia" ? funcionarioTipo.NM_FUNCIONARIO : "")

      );

      setInputParecerGerenciaEscrito(completo.DESC_PARECER_GERENCIA || "");

      setInputMarketing(

        completo.NM_MARKETING ||

        (funcionarioTipo?.TIPO === "marketing" ? funcionarioTipo.NM_FUNCIONARIO : "")

      );

      setInputParecerMarketing(completo.DESC_PARECER_MARKETING || "");

      setInputResponsavelEvento(completo.NM_GERENTE_EVENTO || "");

      setInputSugestao(completo.NM_SUGESTAO_PARTICIPANTES || "");

      setInputDiretoria(

        completo.NM_DIRETORIA ||

        (funcionarioTipo?.TIPO === "diretoria" ? funcionarioTipo.NM_FUNCIONARIO : "")

      );

      setInputParecerDiretoria(completo.DESC_PARECER_ESCRITO_DIRETORIA || "");

      setInputNomeConselho(

        completo.NM_CONSELHO ||

        (funcionarioTipo?.TIPO === "conselho" ? funcionarioTipo.NM_FUNCIONARIO : "")

      );

      setInputConselho(completo.DESC_PARECER_ESCRITO_CONSELHO || "");

      setInputConselhoFinal(completo.NM_PARECER_CONSELHO || "");

      setModalOpen(true);

    } catch (err: any) {

      setErro(err?.message || "Falha ao abrir a solicitação.");

    }

  }

  function validaCampos() {

    if (!podeEditar) {

      setModalErro("Você só pode editar esta solicitação na etapa do seu perfil.");

      return false;

    }

    if (funcionarioTipo?.TIPO === "gerencia") {

      if (!inputParecerGerenciaEscrito.trim()) {

        setModalErro("Preencha o campo Parecer Gerência.");

        return false;

      }

      if (!inputResponsavelEvento.trim()) {

        setModalErro("Preencha o campo Responsável Evento.");

        return false;

      }

      if (!inputSugestao.trim()) {

        setModalErro("Preencha o campo Sugestões de Participantes.");

        return false;

      }

    }

    if (funcionarioTipo?.TIPO === "diretoria") {

      if (!inputParecerDiretoria.trim()) {

        setModalErro("Preencha o campo Parecer Diretoria.");

        return false;

      }

      if (!inputResponsavelEvento.trim()) {

        setModalErro("Preencha o campo Responsável Evento.");

        return false;

      }

      if (!inputSugestao.trim()) {

        setModalErro("Preencha o campo Sugestões de Participantes.");

        return false;

      }

    }

    if (funcionarioTipo?.TIPO === "marketing") {

      if (!inputParecerMarketing.trim()) {

        setModalErro("Preencha o campo Parecer Marketing.");

        return false;

      }

    }

    if (funcionarioTipo?.TIPO === "conselho") {

      if (!inputConselho.trim()) {

        setModalErro("Preencha o campo Parecer Conselho.");

        return false;

      }

      const decisaoFinal = normalizeText(inputConselhoFinal || "");

      const decisaoValida =

        decisaoFinal === "APROVADO" || decisaoFinal === "REPROVADO";

      if (!decisaoValida) {

        setModalErro("Selecione a decisão final.");

        return false;

      }

    }

    return true;

  }

  async function salvarParecer() {

    if (!selected || !funcionarioTipo) return;

    if (salvandoParecer || salvarParecerLockRef.current) return;

    if (!validaCampos()) return;

    salvarParecerLockRef.current = true;

    try {

      setSalvandoParecer(true);

      setLoading(true);

      setErro("");

      setInfo("");

      setModalErro("");

      setModalInfo("");

      const existente = await buscarPatrocinioPorId(selected.ID_PATROCINIO);

      let status1 = "";

      if (funcionarioTipo.TIPO === "gerencia") status1 = "Pendente Marketing";

      if (funcionarioTipo.TIPO === "marketing") status1 = "Pendente Diretoria";

      if (funcionarioTipo.TIPO === "diretoria") status1 = "Pendente Conselho";

      if (funcionarioTipo.TIPO === "conselho") status1 = inputConselhoFinal;

      const data: Record<string, any> = {

        NM_ANDAMENTO: status1,

        DESC_PARECER_GERENCIA: existente.DESC_PARECER_GERENCIA,

        NM_GERENCIA: existente.NM_GERENCIA,

        DESC_PARECER_MARKETING: existente.DESC_PARECER_MARKETING,

        NM_MARKETING: existente.NM_MARKETING,

        DESC_PARECER_ESCRITO_DIRETORIA: existente.DESC_PARECER_ESCRITO_DIRETORIA,

        NM_DIRETORIA: existente.NM_DIRETORIA,

        NM_CONSELHO: existente.NM_CONSELHO,

        NM_PARECER_CONSELHO: existente.NM_PARECER_CONSELHO,

        DESC_PARECER_ESCRITO_CONSELHO: existente.DESC_PARECER_ESCRITO_CONSELHO,

        NM_GERENTE_EVENTO: existente.NM_GERENTE_EVENTO,

        NM_SUGESTAO_PARTICIPANTES: existente.NM_SUGESTAO_PARTICIPANTES,

      };

      switch (funcionarioTipo.TIPO) {

        case "gerencia":

          Object.assign(data, {

            DESC_PARECER_GERENCIA: inputParecerGerenciaEscrito,

            NM_GERENCIA: funcionarioTipo.NM_FUNCIONARIO,

            NM_GERENTE_EVENTO: inputResponsavelEvento,

            NM_SUGESTAO_PARTICIPANTES: inputSugestao,

          });

          break;

        case "marketing":

          Object.assign(data, {

            DESC_PARECER_MARKETING: inputParecerMarketing,

            NM_MARKETING: funcionarioTipo.NM_FUNCIONARIO,

          });

          break;

        case "diretoria":

          Object.assign(data, {

            DESC_PARECER_ESCRITO_DIRETORIA: inputParecerDiretoria,

            NM_DIRETORIA: funcionarioTipo.NM_FUNCIONARIO,

            NM_GERENTE_EVENTO: inputResponsavelEvento,

            NM_SUGESTAO_PARTICIPANTES: inputSugestao,

          });

          break;

        case "conselho":

          Object.assign(data, {

            NM_GERENTE_EVENTO: inputResponsavelEvento,

            NM_SUGESTAO_PARTICIPANTES: inputSugestao,

            NM_PARECER_CONSELHO: inputConselhoFinal,

            NM_CONSELHO: funcionarioTipo.NM_FUNCIONARIO,

            DESC_PARECER_ESCRITO_CONSELHO: inputConselho,

            DT_FINALIZACAO: new Date().toISOString().slice(0, 10),

          });

          break;

      }

      await atualizarPatrocinio(selected.ID_PATROCINIO, data, perfilTeste);

      if (perfilTeste) {

        await enviarEmailTesteParticipacao(selected.ID_PATROCINIO);

      } else if (status1 === "Pendente Marketing") {

        await enviarEmailMarketing(selected.ID_PATROCINIO);

      } else if (status1 === "Pendente Diretoria") {

        await enviarEmailDiretoria(

          selected.NM_FUNCIONARIO,

          selected.NM_SOLICITANTE,

          selected.ID_PATROCINIO

        );

      } else if (status1 === "Pendente Conselho") {

        await enviarEmailConselho(selected.ID_PATROCINIO);

      } else if (funcionarioTipo.TIPO === "conselho") {

        await enviarEmailParecerFinal(funcionarioTipo.TIPO, selected.ID_PATROCINIO);

      }

      setInfo("Solicitação atualizada com sucesso.");

      setModalInfo("Solicitação atualizada com sucesso.");

      setSelected((prev) =>

        prev

          ? {

            ...prev,

            ...data,

            NM_ANDAMENTO: status1 || prev.NM_ANDAMENTO,

          }

          : prev

      );

      await buscarLista(paginaAtual);

    } catch (err: any) {

      setModalErro(err?.message || "Não foi possível atualizar a solicitação.");

    } finally {

      setLoading(false);

      setSalvandoParecer(false);

      salvarParecerLockRef.current = false;

    }

  }

  async function visualizarArquivo(caminho?: string) {

    if (!caminho) return;

    try {

      const blob = await baixarArquivoPatrocinio(caminho);

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

    } catch (err: any) {

      setErro(err?.message || "Erro ao baixar arquivo.");

    }

  }

  async function baixarCSV() {

    try {

      setErro("");

      const blob = await baixarRelatorioPatrocinios({

        nome: nomeResponsavel,

        pesquisa: pesquisaAplicada || " ",

        status: statusAplicado,

        perfilTeste,

        verTodos: isSuporte,

      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "participacoes_filtradas.csv";

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);

    } catch (err: any) {

      setErro(err?.message || "Erro ao baixar relatório.");

    }

  }

  async function baixarPdfPropostasPendentesConselho() {

    if (baixandoPdfConselho || !filtroConselhoAplicado) return;

    try {

      setErro("");

      setInfo("");

      setBaixandoPdfConselho(true);

      const registrosResumidos: PatrocinioItem[] = [];

      let pagina = 1;

      let paginas = 1;

      do {

        const response = await buscarPatrociniosPaginado({

          nome: nomeResponsavel,

          pesquisa: " ",

          status: "Pendente Conselho",

          page: pagina,

          limit: 100,

          verTodos: isSuporte,

          perfilTeste,

        });

        registrosResumidos.push(...(response.items || []));

        paginas = Math.max(1, Number(response.total_pages || 1));

        pagina += 1;

      } while (pagina <= paginas);

      const ids = Array.from(

        new Set(

          registrosResumidos

            .map((item) => Number(item.ID_PATROCINIO))

            .filter((id) => Number.isFinite(id) && id > 0)

        )

      );

      if (ids.length === 0) {

        throw new Error("Nenhuma proposta pendente do Conselho foi encontrada.");

      }

      const registrosCompletos = await mapComConcorrencia(

        ids,

        5,

        (id) => buscarPatrocinioPorId(id)

      );

      const pacotes = await mapComConcorrencia(

        registrosCompletos,

        4,

        async (registro) => {

          const formulario = await criarPdfAnalisePatrocinio(registro);

          const registroComPainel = registro as PatrocinioItemComPainelSisbr;

          const anexos = [

            registro.DIR_OFICIO,

            registroComPainel.DIR_PAINEL_SISBR,

            registro.DIR_DOC_SEM_FINS_LUCRATIVO,

          ].filter((item): item is string => Boolean(item));

          const arquivo = await baixarPdfCompletoPatrocinio(

            formulario.output("blob"),

            anexos

          );

          return { registro, arquivo };

        }

      );

      const pdfFinal = await criarCadernoPropostasConselho(pacotes);

      const url = window.URL.createObjectURL(pdfFinal);

      const link = document.createElement("a");

      const dataArquivo = new Date().toISOString().slice(0, 10);

      link.href = url;

      link.download = `caderno_conselho_${dataArquivo}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      setInfo(`Caderno gerado com ${registrosCompletos.length} proposta(s).`);

    } catch (err: any) {

      setErro(err?.message || "Falha ao gerar o caderno de propostas do Conselho.");

    } finally {

      setBaixandoPdfConselho(false);

    }

  }

  async function baixarPdfCompleto() {

    if (!selected || baixandoPdfCompleto) return;

    try {

      setModalErro("");

      setBaixandoPdfCompleto(true);

      const doc = await criarPdfAnalisePatrocinio(selected, {

        gerencia: inputGerencia,

        parecerGerencia: inputParecerGerenciaEscrito,

        marketing: inputMarketing,

        parecerMarketing: inputParecerMarketing,

        responsavelEvento: inputResponsavelEvento,

        sugestoesParticipantes: inputSugestao,

        diretoria: inputDiretoria,

        parecerDiretoria: inputParecerDiretoria,

        conselho: inputNomeConselho,

        parecerConselho: inputConselho,

        parecerConselhoFinal: inputConselhoFinal,

      });

      const selectedComPainel = selected as PatrocinioItemComPainelSisbr;

      const anexos = [

        selected.DIR_OFICIO,

        selectedComPainel.DIR_PAINEL_SISBR,

        selected.DIR_DOC_SEM_FINS_LUCRATIVO,

      ].filter((item): item is string => Boolean(item));

      const pdfCompleto = await baixarPdfCompletoPatrocinio(

        doc.output("blob"),

        anexos

      );

      const url = window.URL.createObjectURL(pdfCompleto);

      const link = document.createElement("a");

      link.href = url;

      link.download = "analise_participacao_completa.pdf";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (err: any) {

      setModalErro(

        err?.message || "Falha ao gerar o PDF completo da solicitação."

      );

    } finally {

      setBaixandoPdfCompleto(false);

    }

  }

  const selectedPainelSisbr = (selected as PatrocinioItemComPainelSisbr | null)?.DIR_PAINEL_SISBR;

  const selectedContaCooperativa = selected?.CD_CONTA_COOPERATIVA ? "Sim" : "Não";

  const selectedUltimoEvento = selected?.DESC_RETORNO_ULTIMO_EVENTO || "Não preenchido.";

  const selectedVinculo = selected?.DESC_VINCULO || "Não preenchido.";

  const selectedServicos = selected?.DESC_SERVICOS || "Não preenchido.";

  const statusPermitidoPerfil = useMemo(() => {

    if (!funcionarioTipo) return "";

    if (funcionarioTipo.TIPO === "gerencia") return "PENDENTE GERENCIA";

    if (funcionarioTipo.TIPO === "marketing") return "PENDENTE MARKETING";

    if (funcionarioTipo.TIPO === "diretoria") return "PENDENTE DIRETORIA";

    if (funcionarioTipo.TIPO === "conselho") return "PENDENTE CONSELHO";

    return "";

  }, [funcionarioTipo]);

  const podeEditar = useMemo(() => {

    if (!selected || !funcionarioTipo) return false;

    const statusAtual = normalizeText(selected.NM_ANDAMENTO || "");

    if (statusAtual === "APROVADO" || statusAtual === "REPROVADO") return false;

    if (!statusPermitidoPerfil) return false;

    return statusAtual === statusPermitidoPerfil;

  }, [selected, funcionarioTipo, statusPermitidoPerfil]);

  const mensagemBloqueioPerfil = useMemo(() => {

    if (!funcionarioTipo || !selected) return "";

    const statusAtual = normalizeText(selected.NM_ANDAMENTO || "");

    if (statusAtual === "APROVADO" || statusAtual === "REPROVADO") {

      return "Solicitação finalizada. Edição bloqueada.";

    }

    if (statusPermitidoPerfil && statusAtual !== statusPermitidoPerfil) {

      const statusPermitidoPerfilVisual = statusPermitidoPerfil

        .replace("GERENCIA", "GERÊNCIA")

        .replace("DIRETORIA", "DIRETORIA")

        .replace("CONSELHO", "CONSELHO");

      return `Edição bloqueada para seu perfil. Você só pode editar quando estiver em "${statusPermitidoPerfilVisual}".`;

    }

    return "";

  }, [

    funcionarioTipo,

    selected,

    statusPermitidoPerfil,

  ]);

  useEffect(() => {

    if (!modalOpen) return;

    if (!modalErro && !modalInfo && !mensagemBloqueioPerfil) return;

    const timer = window.setTimeout(() => {

      const el = modalScrollRef.current;

      if (!el) return;

      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });

    }, 40);

    return () => window.clearTimeout(timer);

  }, [modalOpen, modalErro, modalInfo, mensagemBloqueioPerfil]);

  return (

    <>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#C7D300]" />

        <div className="p-4 lg:p-5">

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#00AE9D]">

              Filtros

            </p>

            <h2 className="mt-0.5 text-base font-black text-slate-900">

              Solicitações cadastradas

            </h2>

            <p className="mt-0.5 text-xs text-slate-500">

              Pesquise por solicitante, CPF/CNPJ ou andamento da participação.

            </p>

            {MODO_TESTE_LOCAL && (

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs">

                <span className="font-black uppercase tracking-wide text-violet-700">Modo de teste local</span>

                <label className="font-semibold text-violet-800" htmlFor="perfil-teste-participacao">

                  Simular como

                </label>

                <select

                  id="perfil-teste-participacao"

                  value={perfilTeste}

                  onChange={(event) => setPerfilTeste(event.target.value as PerfilTesteParticipacao)}

                  className="rounded-lg border border-violet-200 bg-white px-2 py-1 font-bold text-violet-800 outline-none focus:border-violet-400"

                >

                  <option value="">Meu perfil real</option>

                  <option value="gerencia">Gerência</option>

                  <option value="marketing">Marketing</option>

                  <option value="diretoria">Diretoria</option>

                  <option value="conselho">Conselho</option>

                </select>

                {perfilTeste && (

                  <span className="text-violet-700">O e-mail de teste será enviado somente para você.</span>

                )}

              </div>

            )}

          </div>

          <button

            type="button"

            onClick={abrirCadastro}

            className={primaryButtonBase}

          >

            <FaPlus />

            Cadastrar

          </button>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">

            <input

              value={pesquisa}

              onChange={(e) => setPesquisa(e.target.value)}

              onKeyDown={(event) => {

                if (event.key === "Enter") buscarLista(1);

              }}

              placeholder="Digite o solicitante, CPF/CNPJ ou status"

              className={inputBase}

            />

            <button

              type="button"

              onClick={() => buscarLista(1)}

              disabled={loading}

              className={primaryButtonBase}

            >

              <FaSearch />

              Buscar

            </button>

            <button

              type="button"

              onClick={limpar}

              disabled={loading}

              className={neutralButtonBase}

            >

              <FaTimes />

              Limpar

            </button>

          </div>

        </div>

        {erro && (

          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">

            {erro}

          </div>

        )}

        {info && (

          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">

            {info}

          </div>

        )}

        {(items.length > 0 || totais.total > 0) && (

          <>

            <div

              className={`mt-4 grid grid-cols-2 gap-2 ${

                podeBaixarPdfConselho && filtroConselhoAplicado

                  ? "lg:grid-cols-9"

                  : "lg:grid-cols-8"

              }`}

            >

              <ResumoCard

                label="Total"

                value={totais.total}

                active={!statusFiltro}

                onClick={() => filtrarPorResumo("")}

              />

              <ResumoCard

                label="P. Gerência"

                value={totais.gerencia}

                tone="amber"

                active={normalizeText(statusFiltro) === "PENDENTE GERENCIA"}

                onClick={() => filtrarPorResumo("Pendente Gerencia")}

              />

              <ResumoCard

                label="P. Marketing"

                value={totais.marketing}

                tone="violet"

                active={normalizeText(statusFiltro) === "PENDENTE MARKETING"}

                onClick={() => filtrarPorResumo("Pendente Marketing")}

              />

              <ResumoCard

                label="P. Diretoria"

                value={totais.diretoria}

                tone="sky"

                active={normalizeText(statusFiltro) === "PENDENTE DIRETORIA"}

                onClick={() => filtrarPorResumo("Pendente Diretoria")}

              />

              <ResumoCard

                label="P. Conselho"

                value={totais.conselho}

                tone="teal"

                active={normalizeText(statusFiltro) === "PENDENTE CONSELHO"}

                onClick={() => filtrarPorResumo("Pendente Conselho")}

              />

              <ResumoCard

                label="Aprovados"

                value={totais.aprovados}

                tone="emerald"

                active={normalizeText(statusFiltro) === "APROVADO"}

                onClick={() => filtrarPorResumo("Aprovado")}

              />

              <ResumoCard

                label="Reprovados"

                value={totais.reprovados}

                tone="red"

                active={normalizeText(statusFiltro) === "REPROVADO"}

                onClick={() => filtrarPorResumo("Reprovado")}

              />

              <button

                type="button"

                onClick={baixarCSV}

                className={`${secondaryButtonBase} min-h-[56px] rounded-xl px-3 py-2`}

              >

                <FaDownload />

                Baixar Relatório

              </button>

              {podeBaixarPdfConselho && filtroConselhoAplicado && (

                <button

                  type="button"

                  onClick={baixarPdfPropostasPendentesConselho}

                  disabled={baixandoPdfConselho}

                  className={`${secondaryButtonBase} min-h-[56px] rounded-xl px-3 py-2`}

                >

                  <FaFilePdf />

                  {baixandoPdfConselho ? "Montando caderno..." : "Baixar Caderno PDF"}

                </button>

              )}

            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="overflow-x-auto">

              <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0">

                <colgroup>

                  <col className="w-[20%]" />

                  <col className="w-[12%]" />

                  <col className="w-[10%]" />

                  <col className="w-[10%]" />

                  <col className="w-[13%]" />

                  <col className="w-[11%]" />

                  <col className="w-[15%]" />

                  <col className="w-[9%]" />

                </colgroup>

                <thead>

                  <tr>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Nome Fantasia

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      CPF/CNPJ

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Cidade

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Funcionário

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Período do evento

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Situação do evento

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Status

                    </th>

                    <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">

                      Ação

                    </th>

                  </tr>

                </thead>

                <tbody>

                  {items.map((patrocinio) => (

                    <tr

                      key={patrocinio.ID_PATROCINIO}

                      className="transition hover:bg-emerald-50/40"

                    >

                      <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">

                        {String(patrocinio.NM_SOLICITANTE || "").toUpperCase()}

                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700 whitespace-nowrap">

                        {formatarCPFouCNPJ(patrocinio.NR_CPF_CNPJ)}

                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">

                        {String(patrocinio.NM_CIDADE || "").toUpperCase()}

                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">

                        {primeiroUltimoNome(

                          String(patrocinio.NM_FUNCIONARIO || "").toUpperCase()

                        )}

                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">

                        {periodoEvento(patrocinio)}

                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">

                        <SituacaoEventoBadge situacao={situacaoDoEvento(patrocinio)} />

                      </td>

                      <td className="border-b border-slate-100 px-2 py-2 text-sm text-slate-700">

                        <StatusFluxoBadge status={patrocinio.NM_ANDAMENTO} />

                      </td>

                      <td className="border-b border-slate-100 px-2 py-2 text-center">

                        <button

                          type="button"

                          onClick={() => abrirAndamento(patrocinio)}

                          className="whitespace-nowrap rounded-xl border border-[#00AE9D]/35 bg-[#00AE9D]/10 px-2 py-2 text-xs font-black text-[#006f65] shadow-sm transition hover:bg-[#00AE9D] hover:text-white hover:shadow-md"

                        >

                          Informações

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

              </div>

              <Pagination

                currentPage={paginaAtual}

                totalPages={totalPages}

                totalItems={totalItems}

                limit={limit}

                loading={loading}

                onChange={(page) => buscarLista(page)}

                onLimitChange={alterarLimite}

              />

            </div>

          </>

        )}

        </div>

      </div>

      {modalOpen && selected && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div

            ref={modalScrollRef}

            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"

          >

            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                  <h2 className="text-lg font-black text-slate-950">

                    Análise de Patrocínio

                  </h2>

                  <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

                  <span className="text-sm font-bold text-slate-700">

                    {capitalizeWords(selected.NM_SOLICITANTE)}

                  </span>

                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">

                  <span className="font-black uppercase tracking-[0.08em] text-[#006f65]">Evento</span>

                  <span>{periodoEvento(selected)}</span>

                  <span className="text-slate-300" aria-hidden="true">•</span>

                  <span className="font-bold text-[#006f65]">{situacaoDoEvento(selected)}</span>

                </div>

              </div>

              <button

                onClick={() => {

                  setModalErro("");

                  setModalInfo("");

                  setModalOpen(false);

                }}

                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"

              >

                Fechar

              </button>

            </div>

            <div className="space-y-4 p-6">

              <CampoTextarea label="Solicitação" value={selected.DESC_SOLICITACAO} readOnly />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                <CampoInput label="Precisa de dinheiro?" value={selected.VL_MONETARIO ? "Sim" : "Não"} readOnly />

                <CampoInput label="Valor" value={fmtBRL(selected.VL_PATROCINIO)} readOnly />

                <div>

                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ofício</label>

                  <button

                    type="button"

                    onClick={() => visualizarArquivo(selected.DIR_OFICIO)}

                    disabled={!selected.DIR_OFICIO}

                    className={`${secondaryButtonBase} w-full disabled:bg-gray-100 disabled:text-gray-500`}

                  >

                    {selected.DIR_OFICIO ? "Visualizar" : "Não enviado"}

                  </button>

                </div>

                <div>

                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Painel SISBR</label>

                  <button

                    type="button"

                    onClick={() => visualizarArquivo(selectedPainelSisbr)}

                    disabled={!selectedPainelSisbr}

                    className={`${secondaryButtonBase} w-full disabled:bg-gray-100 disabled:text-gray-500`}

                  >

                    {selectedPainelSisbr ? "Visualizar" : "Não enviado"}

                  </button>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <CampoInput label="É insumo?" value={selected.QTD_INSUMO ? "Sim" : "Não"} readOnly />

                <CampoInput label="Estimado" value={fmtBRL(selected.VL_ESTIMATIVA)} readOnly />

                <CampoInput label="Data da Solicitação" value={formatarDataBR(selected.DT_SOLICITACAO)} readOnly />

              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <CampoInput label="Cidade" value={selected.NM_CIDADE} readOnly />

                <div />

                <div />

              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <CampoInput label="Auditório Sede" value={selected.CD_AUDITORIO_SEDE ? "Sim" : "Não"} readOnly />

                <CampoInput label="Auditório Centro de Convivência" value={selected.CD_AUDITORIO_CENTRO ? "Sim" : "Não"} readOnly />

                <div>

                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">

                    Declaração de Utilidade Pública

                  </label>

                  <button

                    onClick={() => visualizarArquivo(selected.DIR_DOC_SEM_FINS_LUCRATIVO)}

                    disabled={!selected.DIR_DOC_SEM_FINS_LUCRATIVO}

                    className={`${secondaryButtonBase} w-full disabled:bg-gray-100 disabled:text-gray-500`}

                  >

                    {selected.DIR_DOC_SEM_FINS_LUCRATIVO ? "Visualizar" : "Não enviada"}

                  </button>

                </div>

              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <CampoInput label="Motorista" value={selected.CD_MOTORISTA ? "Sim" : "Não"} readOnly />

                <CampoInput label="Funcionários" value={selected.CD_FUNCIONARIOS ? "Sim" : "Não"} readOnly />

                <div />

              </div>

              <CampoTextarea label="Vínculo" value={selectedVinculo} readOnly />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                <CampoInput label="S. médio C/C" value={fmtBRL(selected.VL_SALDO_MEDCIOCC)} readOnly />

                <CampoInput label="R. Maquininha" value={fmtBRL(selected.VL_RENTABILIDADE_MAQUININHA)} readOnly />

                <CampoInput label="Conta na Cooperativa" value={selectedContaCooperativa} readOnly />

              </div>

              <CampoTextarea label="Produtos/Serviços" value={selectedServicos} readOnly />

              <CampoTextarea label="Retorno último evento" value={selectedUltimoEvento} readOnly />

              <div className="space-y-3">

                {selected.DIAS?.map((dia, index) => (

                  <div key={`${dia.DT_DIA}-${index}`} className="grid grid-cols-1 gap-4 md:grid-cols-3">

                    <CampoInput label="Dia(s)" value={formatarDataBR(dia.DT_DIA)} readOnly />

                    <CampoInput label="Início" value={dia.HR_INICIO} readOnly />

                    <CampoInput label="Fim" value={dia.HR_FIM} readOnly />

                  </div>

                ))}

              </div>

              <CampoTextarea label="Resumo do Evento" value={selected.DESC_RESUMO_EVENTO} readOnly />

              <CampoInput label="Nome Gerência" value={inputGerencia} readOnly />

              <CampoTextarea

                label="Parecer Gerência"

                value={inputParecerGerenciaEscrito}

                onChange={setInputParecerGerenciaEscrito}

                readOnly={!(funcionarioTipo?.TIPO === "gerencia" && podeEditar)}

                maxLength={570}

              />

              <CampoInput

                label="Responsável Evento"

                value={inputResponsavelEvento}

                onChange={setInputResponsavelEvento}

                readOnly={!podeEditar || funcionarioTipo?.TIPO === "funcionario"}

                maxLength={190}

              />

              <CampoTextarea

                label="Sugestões de Participantes"

                value={inputSugestao}

                onChange={setInputSugestao}

                readOnly={!podeEditar || funcionarioTipo?.TIPO === "funcionario"}

                maxLength={285}

              />

              <CampoInput label="Nome Marketing" value={inputMarketing} readOnly />

              <CampoTextarea

                label="Parecer Marketing"

                value={inputParecerMarketing}

                onChange={setInputParecerMarketing}

                readOnly={!(funcionarioTipo?.TIPO === "marketing" && podeEditar)}

                maxLength={570}

              />

              <CampoInput label="Nome Diretoria" value={inputDiretoria} readOnly />

              <CampoTextarea

                label="Parecer Diretoria"

                value={inputParecerDiretoria}

                onChange={setInputParecerDiretoria}

                readOnly={!(funcionarioTipo?.TIPO === "diretoria" && podeEditar)}

                maxLength={285}

              />

              <CampoInput label="Nome Conselho" value={inputNomeConselho} readOnly />

              <CampoTextarea

                label="Parecer Conselho"

                value={inputConselho}

                onChange={setInputConselho}

                readOnly={!(funcionarioTipo?.TIPO === "conselho" && podeEditar)}

                maxLength={380}

              />

              <div>

                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">

                  Parecer Conselho Final

                </label>

                <select

                  value={inputConselhoFinal}

                  onChange={(e) => setInputConselhoFinal(e.target.value)}

                  disabled={!(funcionarioTipo?.TIPO === "conselho" && podeEditar)}

                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 disabled:bg-gray-50"

                >

                  <option value="">Selecione</option>

                  <option value="Aprovado">APROVADO</option>

                  <option value="Reprovado">REPROVADO</option>

                </select>

              </div>

            </div>

            <div className="sticky bottom-0 flex items-end justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">

              <div className="flex-1 space-y-2 pr-2">

                {modalErro && (

                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">

                    {modalErro}

                  </div>

                )}

                {modalInfo && (

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">

                    {modalInfo}

                  </div>

                )}

                {mensagemBloqueioPerfil && (

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">

                    {mensagemBloqueioPerfil}

                  </div>

                )}

              </div>

              <div className="flex shrink-0 gap-3">

                {podeBaixarPdfConselho && (

                  <button

                    type="button"

                    onClick={baixarPdfCompleto}

                    disabled={baixandoPdfCompleto}

                    aria-busy={baixandoPdfCompleto}

                    className={secondaryButtonBase}

                  >

                    <FaDownload />

                    {baixandoPdfCompleto

                      ? "Montando PDF..."

                      : "Baixar registro em PDF"}

                  </button>

                )}

                <button

                  onClick={() => {

                    setModalErro("");

                    setModalInfo("");

                    setModalOpen(false);

                  }}

                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"

                >

                  Fechar

                </button>

                <button

                  onClick={salvarParecer}

                  disabled={!podeEditar || loading || salvandoParecer || salvarParecerLockRef.current}

                  aria-busy={salvandoParecer}

                  className={primaryButtonBase}

                >

                  {salvandoParecer ? "Salvando..." : "Salvar"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </>

  );

}

function SituacaoEventoBadge({ situacao }: { situacao: SituacaoEvento }) {

  const estilos: Record<SituacaoEvento, string> = {

    "A realizar": "border-sky-200 bg-sky-50 text-sky-700",

    "Em andamento": "border-amber-200 bg-amber-50 text-amber-700",

    Encerrado: "border-emerald-200 bg-emerald-50 text-emerald-700",

    "Sem data": "border-slate-200 bg-slate-50 text-slate-600",

  };

  return (

    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase ${estilos[situacao]}`}>

      {situacao}

    </span>

  );

}

function StatusFluxoBadge({ status }: { status?: string }) {

  const statusNormalizado = normalizeText(status || "");

  const estilos: Record<string, string> = {

    "PENDENTE GERENCIA": "border-amber-300 bg-amber-100 text-amber-800",

    "PENDENTE MARKETING": "border-violet-300 bg-violet-100 text-violet-800",

    "PENDENTE DIRETORIA": "border-sky-300 bg-sky-100 text-sky-800",

    "PENDENTE CONSELHO": "border-teal-300 bg-teal-100 text-teal-800",

    APROVADO: "border-emerald-300 bg-emerald-100 text-emerald-800",

    REPROVADO: "border-red-300 bg-red-100 text-red-800",

  };

  return (

    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-black uppercase ${estilos[statusNormalizado] || "border-slate-200 bg-slate-50 text-slate-600"}`}>

      {status || "Não informado"}

    </span>

  );

}

type ResumoTone = "slate" | "amber" | "violet" | "sky" | "teal" | "emerald" | "red";

function ResumoCard({

  label,

  value,

  tone = "slate",

  active = false,

  onClick,

}: {

  label: string;

  value: number;

  tone?: ResumoTone;

  active?: boolean;

  onClick?: () => void;

}) {

  const tones: Record<ResumoTone, string> = {

    slate: "border-slate-200 bg-slate-50 text-slate-700",

    amber: "border-amber-200 bg-amber-50 text-amber-700",

    violet: "border-violet-200 bg-violet-50 text-violet-700",

    sky: "border-sky-200 bg-sky-50 text-sky-700",

    teal: "border-teal-200 bg-teal-50 text-teal-700",

    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",

    red: "border-red-200 bg-red-50 text-red-700",

  };

  const content = (

    <>

      <div className="text-[10px] font-black uppercase tracking-[0.08em] opacity-75">

        {label}

      </div>

      <div className="mt-1 text-xl font-black leading-none">{value}</div>

    </>

  );

  const className = `rounded-xl border px-3 py-2.5 text-left shadow-sm transition ${

    tones[tone]

  } ${

    active

      ? "ring-2 ring-[#00AE9D]/35 ring-offset-1"

      : "hover:-translate-y-0.5 hover:border-[#00AE9D]/45 hover:shadow-md"

  }`;

  if (onClick) {

    return (

      <button type="button" onClick={onClick} className={className}>

        {content}

      </button>

    );

  }

  return (

    <div className={className}>{content}</div>

  );

}

function Pagination({

  currentPage,

  totalPages,

  totalItems,

  limit,

  loading,

  onChange,

  onLimitChange,

}: {

  currentPage: number;

  totalPages: number;

  totalItems: number;

  limit: number;

  loading: boolean;

  onChange: (page: number) => void;

  onLimitChange: (limit: number) => void;

}) {

  const primeiro = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;

  const ultimo = Math.min(currentPage * limit, totalItems);

  return (

    <div className="border-t border-slate-100 bg-white px-3 py-3">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

          <p className="text-xs text-slate-500">

            Mostrando <span className="font-semibold text-slate-700">{primeiro}</span> até{" "}

            <span className="font-semibold text-slate-700">{ultimo}</span> de{" "}

            <span className="font-semibold text-slate-700">{totalItems}</span> solicitação(ões)

          </p>

          <select

            value={limit}

            onChange={(event) => onLimitChange(Number(event.target.value))}

            disabled={loading}

            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-60"

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

            onClick={() => onChange(Math.max(currentPage - 1, 1))}

            disabled={currentPage <= 1 || loading}

            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

          >

            <FaChevronLeft />

            Anterior

          </button>

          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">

            Página {currentPage} de {totalPages}

          </span>

          <button

            type="button"

            onClick={() => onChange(Math.min(currentPage + 1, totalPages))}

            disabled={currentPage >= totalPages || loading}

            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

          >

            Próxima

            <FaChevronRight />

          </button>

        </div>

      </div>

    </div>

  );

}

function CampoInput({

  label,

  value,

  readOnly = false,

  onChange,

  maxLength,

}: {

  label: string;

  value: string;

  readOnly?: boolean;

  onChange?: (v: string) => void;

  maxLength?: number;

}) {

  return (

    <div>

      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>

      <input

        value={value || ""}

        onChange={(e) => onChange?.(e.target.value)}

        readOnly={readOnly}

        maxLength={maxLength}

        className="w-full rounded border px-3 py-2 read-only:bg-gray-50"

      />

      {!readOnly && maxLength ? (

        <p className="mt-1 text-right text-[11px] text-slate-400">

          {(value || "").length}/{maxLength}

        </p>

      ) : null}

    </div>

  );

}

function CampoTextarea({

  label,

  value,

  readOnly = false,

  onChange,

  maxLength,

}: {

  label: string;

  value: string;

  readOnly?: boolean;

  onChange?: (v: string) => void;

  maxLength?: number;

}) {

  return (

    <div>

      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>

      <textarea

        value={value || ""}

        onChange={(e) => onChange?.(e.target.value)}

        readOnly={readOnly}

        maxLength={maxLength}

        rows={3}

        className="w-full rounded border px-3 py-2 read-only:bg-gray-50"

      />

      {!readOnly && maxLength ? (

        <p className="mt-1 text-right text-[11px] text-slate-400">

          {(value || "").length}/{maxLength}

        </p>

      ) : null}

    </div>

  );

}
