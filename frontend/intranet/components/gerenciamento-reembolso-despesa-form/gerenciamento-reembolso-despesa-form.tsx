"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaFilePdf,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { AD_GROUPS } from "@/config/ad-groups";
import {
  buscarSolicitacoesReembolsoPaginado,
  buscarUsuarioLogadoGerenciamentoReembolso,
  buscarFuncionarioPorNomeGerenciamento,
  decidirSolicitacaoReembolso,
  concluirSolicitacaoReembolso,
  baixarComprovanteGerenciamentoReembolso,
  type SolicitaoListaItem,
  type SolicitacaoDetalheItem,
} from "@/services/gerenciamento_reembolso_despesa.service";
import { gerarPdfSolicitacaoReembolso } from "@/lib/pdf/gerarPdfSolicitacaoReembolso";

function capitalizeWords(text: string) {
  const palavrasMinusculas = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
  ]);

  return String(text || "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((palavra, index) => {
      if (index > 0 && palavrasMinusculas.has(palavra)) {
        return palavra;
      }

      return palavra
        .split("-")
        .map((parte) =>
          parte ? parte.charAt(0).toUpperCase() + parte.slice(1) : parte
        )
        .join("-");
    })
    .join(" ");
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfView(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{2})$/, ".$1-$2");
  }

  return digits;
}

function formatDateBR(value?: string) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function primeiroUltimoNome(nomeCompleto: string) {
  const nomes = String(nomeCompleto || "").trim().split(" ").filter(Boolean);
  if (nomes.length <= 1) return nomes[0] || "";
  return `${nomes[0]} ${nomes[nomes.length - 1]}`;
}

function normalizeNomeComparacao(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeStatus(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isAndamento(value: string, esperado: string) {
  return normalizeStatus(value) === normalizeStatus(esperado);
}

function isSecretariaDiretoria(value?: string) {
  return normalizeStatus(value || "") === "SECRETARIA_DIRETORIA";
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

type Totais = {
  funcionario: number;
  financeiro: number;
  gerencia: number;
  gerenciaSup: number;
  diretoria: number;
  aprovados: number;
  reprovados: number;
  total: number;
};

const totaisInicial: Totais = {
  funcionario: 0,
  financeiro: 0,
  gerencia: 0,
  gerenciaSup: 0,
  diretoria: 0,
  aprovados: 0,
  reprovados: 0,
  total: 0,
};

const inputBase =
  "h-11 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10";

const primaryButtonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#79B729] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#00AE9D] hover:shadow-md";

const neutralButtonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#49479D]/40 hover:bg-[#49479D]/10 hover:text-[#49479D]";

const tableHeaderBase =
  "border-b border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.04em] text-slate-600";

const tableCellBase = "border-b border-slate-100 px-3 py-2 text-sm text-slate-700";

export function GerenciamentoReembolsoDespesaForm() {
  const router = useRouter();
  const loginUsuarioLogado = useRef("");

  const [loading, setLoading] = useState(true);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    pesquisa: "",
    cpf: "",
    cidade: "",
    status: "",
  });

  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [nomeResponsavelAD, setNomeResponsavelAD] = useState("");
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState("");
  const [diretoriaCompleto, setDiretoriaCompleto] = useState<any>(null);
  const [isFinanceiroAD, setIsFinanceiroAD] = useState(false);
  const [podeVerTodos, setPodeVerTodos] = useState(false);

  const [lista, setLista] = useState<SolicitaoListaItem[]>([]);
  const [listaContador, setListaContador] = useState<SolicitaoListaItem[]>([]);
  const [totais, setTotais] = useState<Totais>(totaisInicial);

  const [modalOpen, setModalOpen] = useState(false);
  const [solicitacaoAtual, setSolicitacaoAtual] = useState<SolicitacaoDetalheItem | null>(null);

  const [parecerFinanceiroSelect, setParecerFinanceiroSelect] = useState("");
  const [parecerFinanceiroTexto, setParecerFinanceiroTexto] = useState("");
  const [parecerGerenciaTexto, setParecerGerenciaTexto] = useState("");
  const [parecerGerenciaSupTexto, setParecerGerenciaSupTexto] = useState("");
  const [parecerDiretoriaTexto, setParecerDiretoriaTexto] = useState("");
  const [parecerFinal, setParecerFinal] = useState("");

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    calcularTotais(listaContador);
  }, [listaContador]);

  const idUsuarioLogado = useMemo(() => {
    return Number(diretoriaCompleto?.ID_FUNCIONARIO || 0);
  }, [diretoriaCompleto]);

  const podeAtuarEtapaGerencia = useMemo(() => {
    if (!solicitacaoAtual) return false;
    return (
      idUsuarioLogado > 0 &&
      Number(solicitacaoAtual.ID_APROV_GERENCIA || 0) === idUsuarioLogado
    );
  }, [solicitacaoAtual, idUsuarioLogado]);

  const podeAtuarEtapaGerenciaSup = useMemo(() => {
    if (!solicitacaoAtual) return false;
    return (
      idUsuarioLogado > 0 &&
      Number(solicitacaoAtual.ID_APROV_GERENCIA_SUP || 0) === idUsuarioLogado
    );
  }, [solicitacaoAtual, idUsuarioLogado]);

  const podeAtuarEtapaDiretoria = useMemo(() => {
    if (!solicitacaoAtual) return false;
    return (
      idUsuarioLogado > 0 &&
      Number(solicitacaoAtual.ID_APROV_DIRETORIA || 0) === idUsuarioLogado
    );
  }, [solicitacaoAtual, idUsuarioLogado]);

  async function carregarDadosIniciais() {
    try {
      setLoading(true);

      const me = (await buscarUsuarioLogadoGerenciamentoReembolso()) as {
        nome?: string;
        nome_completo?: string;
        username?: string;
        grupos?: string[];
      };

      const nomeAD = me?.nome_completo || me?.nome || "";
      loginUsuarioLogado.current = String(me?.username || "").trim();
      const grupos = Array.isArray(me?.grupos) ? me.grupos : [];
      setNomeResponsavelAD(nomeAD);
      setNomeUsuarioLogado(nomeAD);

      const usuarioEhFinanceiroAD = grupos.includes(AD_GROUPS.FINANCEIRO);
      const usuarioEhSuporteAD = grupos.includes(AD_GROUPS.SUPORTE);

      const usuarioPodeVerTodos = usuarioEhFinanceiroAD || usuarioEhSuporteAD;

      setIsFinanceiroAD(usuarioEhFinanceiroAD);
      setHasAccess(true);
      setPodeVerTodos(usuarioPodeVerTodos);

      let nomeFiltro = "";
      let funcionario = null;

      if (nomeAD) {
        try {
          funcionario = await buscarFuncionarioPorNomeGerenciamento(nomeAD);
          nomeFiltro = funcionario?.NM_FUNCIONARIO || "";
        } catch (error) {
          console.warn("Funcionário não encontrado na base:", nomeAD);
          nomeFiltro = "";
        }
      }

      if (!nomeAD) {
        setNomeResponsavel("");
        setDiretoriaCompleto(null);
        setLista([]);
        setListaContador([]);
        setTotais(totaisInicial);
        setTotalItems(0);

        alert("Não foi possível identificar seu nome no AD para consultar as solicitações.");

        return;
      }

      const nomeBusca = nomeFiltro || nomeAD;

      setNomeResponsavel(nomeBusca);
      setDiretoriaCompleto(funcionario);

      await Promise.all([
        buscarDespesas(1, "", nomeBusca, usuarioPodeVerTodos),
        carregarContadores(nomeBusca, usuarioPodeVerTodos),
      ]);
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar o gerenciamento.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarContadores(
    nome: string,
    verTodos = podeVerTodos
  ) {
    try {
      const nomeSeguro = nome || nomeResponsavel || nomeResponsavelAD;

      if (!nomeSeguro) {
        setListaContador([]);
        setTotais(totaisInicial);
        return;
      }

      const response = await buscarSolicitacoesReembolsoPaginado({
        nome: nomeSeguro,
        login: loginUsuarioLogado.current,
        pesquisa: "",
        verTodos,
        page: 1,
        limit: 999999,
      });

      setListaContador(response.items || []);
    } catch (error) {
      console.error(error);
    }
  }

  function calcularTotais(items: SolicitaoListaItem[]) {
    const novosTotais = { ...totaisInicial };

    items.forEach((item) => {
      const status = normalizeStatus(item.DESC_ANDAMENTO || "");

      if (status === "PENDENTE FUNCIONARIO") novosTotais.funcionario += 1;
      else if (status === "PENDENTE FINANCEIRO") novosTotais.financeiro += 1;
      else if (status === "PENDENTE GERENCIA") novosTotais.gerencia += 1;
      else if (status === "PENDENTE GERENCIA SUPERIOR") novosTotais.gerenciaSup += 1;
      else if (status === "PENDENTE DIRETORIA") novosTotais.diretoria += 1;
      else if (status === "APROVADO") novosTotais.aprovados += 1;
      else if (status === "REPROVADO") novosTotais.reprovados += 1;

      novosTotais.total += 1;
    });

    setTotais(novosTotais);
  }

  async function buscarDespesas(
    pagina = 1,
    textoPesquisa = filtrosAplicados.pesquisa,
    nome = nomeResponsavel,
    verTodos = podeVerTodos,
    filtros?: {
      cpf?: string;
      cidade?: string;
      status?: string;
    },
    pageLimit = limit
  ) {
    try {
      setLoadingBusca(true);

      const nomeFiltro = nomeResponsavel || nome || nomeResponsavelAD;

      const filtrosConsulta = {
        pesquisa: textoPesquisa.trim(),
        cpf: onlyDigits(filtros?.cpf ?? filtrosAplicados.cpf),
        cidade: filtros?.cidade ?? filtrosAplicados.cidade,
        status: filtros?.status ?? filtrosAplicados.status,
      };
      const response = await buscarSolicitacoesReembolsoPaginado({
        nome: nomeFiltro,
        login: loginUsuarioLogado.current,
        ...filtrosConsulta,
        verTodos,
        page: pagina,
        limit: pageLimit,
      });

      setLista(response.items || []);
      setPaginaAtual(pagina);
      setTotalPages(response.total_pages || 1);
      setTotalItems(Number(response.total || 0));
      setFiltrosAplicados(filtrosConsulta);
    } catch (error) {
      console.error(error);
      alert("Solicitações não encontradas.");
    } finally {
      setLoadingBusca(false);
    }
  }

  function abrirSolicitacao(item: SolicitaoListaItem) {
    setSolicitacaoAtual(item as SolicitacaoDetalheItem);

    setParecerFinanceiroSelect(
      isFinanceiroAD && isAndamento(item.DESC_ANDAMENTO || "", "Pendente Financeiro")
        ? ""
        : item.DESC_PRC_FINANCEIRO || ""
    );
    setParecerFinanceiroTexto(item.DESC_PRC_FINANCEIRO || "");
    setParecerGerenciaTexto(item.DESC_PRC_GERENCIA || "");
    setParecerGerenciaSupTexto(item.DESC_PRC_GERENCIA_SUP || "");
    setParecerDiretoriaTexto(item.DESC_PRC_DIRETORIA || "");
    setParecerFinal(
      item.DESC_ANDAMENTO === "Aprovado" || item.DESC_ANDAMENTO === "Reprovado"
        ? item.DESC_ANDAMENTO
        : ""
    );

    setModalOpen(true);
  }

  function limparBusca() {
    setPesquisa("");
    setFiltroCpf("");
    setFiltroCidade("");
    setFiltroStatus("");
    buscarDespesas(1, "", nomeResponsavel, podeVerTodos, {
      cpf: "",
      cidade: "",
      status: "",
    });

  }

  function filtrarPorResumo(status: string) {
    setFiltroStatus(status);
    buscarDespesas(1, filtrosAplicados.pesquisa, nomeResponsavel, podeVerTodos, {
      cpf: filtrosAplicados.cpf,
      cidade: filtrosAplicados.cidade,
      status,
    });
  }

  function alterarLimite(novoLimite: number) {
    setLimit(novoLimite);
    buscarDespesas(1, undefined, nomeResponsavel, podeVerTodos, undefined, novoLimite);
  }

  function podeEditarSolicitacao() {
    if (!solicitacaoAtual) return false;

    if (!isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Funcionario")) return false;

    if (isSecretariaDiretoria(solicitacaoAtual.TIPO_USUARIO)) return true;

    const nomeSolicitacao = normalizeNomeComparacao(
      solicitacaoAtual.NM_FUNCIONARIO || ""
    );

    const nomesPossiveisUsuario = [
      nomeResponsavel,
      nomeResponsavelAD,
      nomeUsuarioLogado,
    ]
      .map((n) => normalizeNomeComparacao(n || ""))
      .filter(Boolean);

    return nomesPossiveisUsuario.includes(nomeSolicitacao);
  }

  function podeSalvarParecer() {
    if (!solicitacaoAtual) return false;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Financeiro") &&
      isFinanceiroAD
    ) return true;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia") &&
      podeAtuarEtapaGerencia
    ) return true;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia Superior") &&
      podeAtuarEtapaGerenciaSup
    ) return true;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
      podeAtuarEtapaDiretoria
    ) return true;

    return false;
  }

  function podeGerarRelatorio() {
    if (!solicitacaoAtual) return false;
    return solicitacaoAtual.DESC_ANDAMENTO === "Aprovado" && isFinanceiroAD;
  }

  function podeConcluir() {
    if (!solicitacaoAtual) return false;
    return (
      solicitacaoAtual.DESC_ANDAMENTO === "Aprovado" &&
      isFinanceiroAD &&
      !solicitacaoAtual.SN_FINALIZADO
    );
  }

  function validarCampos() {
    if (!solicitacaoAtual) return false;
    const andamentoAtual = solicitacaoAtual.DESC_ANDAMENTO || "";

    if (isAndamento(andamentoAtual, "Pendente Financeiro") && isFinanceiroAD) {
      const parecerFinanceiroValido =
        parecerFinanceiroSelect.endsWith("OK") ||
        parecerFinanceiroSelect.endsWith("Divergente");

      if (!parecerFinanceiroValido) {
        alert("Dê o parecer do financeiro.");
        return false;
      }

      if (!parecerFinanceiroTexto) {
        alert("Dê o parecer do financeiro por escrito.");
        return false;
      }
    }

    if (
      isAndamento(andamentoAtual, "Pendente Gerencia") &&
      podeAtuarEtapaGerencia
    ) {
      if (!parecerGerenciaTexto) {
        alert("Dê o parecer da gerência.");
        return false;
      }

      if (!parecerFinal) {
        alert("Dê o parecer final.");
        return false;
      }
    }

    if (
      isAndamento(andamentoAtual, "Pendente Gerencia Superior") &&
      podeAtuarEtapaGerenciaSup
    ) {
      if (!parecerGerenciaSupTexto) {
        alert("Dê o parecer da gerência superior.");
        return false;
      }

      if (!parecerFinal) {
        alert("Dê o parecer final.");
        return false;
      }
    }

    if (
      isAndamento(andamentoAtual, "Pendente Diretoria") &&
      podeAtuarEtapaDiretoria
    ) {
      if (!parecerDiretoriaTexto) {
        alert("Dê o parecer da diretoria.");
        return false;
      }

      if (!parecerFinal) {
        alert("Dê o parecer final.");
        return false;
      }
    }

    return true;
  }

  async function salvarParecer() {
    if (!solicitacaoAtual) return;
    if (!validarCampos()) return;

    try {
      setSaving(true);

      let acao = "";
      let parecer = "";

      if (
        isFinanceiroAD &&
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Financeiro")
      ) {
        parecer = parecerFinanceiroTexto;
        acao = parecerFinanceiroSelect === "Solicitação OK" ? "aprovar" : "devolver";
      } else if (
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia") &&
        podeAtuarEtapaGerencia
      ) {
        parecer = parecerGerenciaTexto;
        acao = parecerFinal === "Reprovado" ? "reprovar" : "aprovar";
      } else if (
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia Superior") &&
        podeAtuarEtapaGerenciaSup
      ) {
        parecer = parecerGerenciaSupTexto;
        acao = parecerFinal === "Reprovado" ? "reprovar" : "aprovar";
      } else if (
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
        podeAtuarEtapaDiretoria
      ) {
        parecer = parecerDiretoriaTexto;
        acao = parecerFinal === "Aprovado" ? "aprovar" : "reprovar";
      }

      if (!acao || !parecer) {
        alert("Você não tem permissão para salvar parecer nesta etapa.");
        return;
      }

      await decidirSolicitacaoReembolso({
        id: solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA,
        nomeResponsavel: nomeUsuarioLogado,
        acao,
        parecer,
      });
      alert("Solicitação atualizada com sucesso.");
      setModalOpen(false);

      await Promise.all([
        buscarDespesas(paginaAtual),
        carregarContadores(nomeResponsavel, podeVerTodos),
      ]);
    } catch (error) {
      console.error(error);
      alert("Não foi possível atualizar a solicitação.");
    } finally {
      setSaving(false);
    }
  }

  async function concluirSolicitacaoAtual() {
    if (!solicitacaoAtual) return;

    try {
      setSaving(true);
      await concluirSolicitacaoReembolso(
        solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA
      );

      alert("Solicitação concluída com sucesso.");
      setModalOpen(false);

      await Promise.all([
        buscarDespesas(paginaAtual),
        carregarContadores(nomeResponsavel, podeVerTodos),
      ]);
    } catch (error) {
      console.error(error);
      alert("Não foi possível concluir a solicitação.");
    } finally {
      setSaving(false);
    }
  }

  async function baixarArquivo(caminho?: string | null) {
    if (!caminho) return;

    try {
      const blob = await baixarComprovanteGerenciamentoReembolso(caminho);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = String(caminho).split(/[/\\]/).pop() || "arquivo";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao baixar o arquivo.");
    }
  }

  function mudarTelaEditar(id: number | string) {
    router.push(`/auth/cadastro_reembolso_despesa?id=${id}`);
  }

  async function imprimirSolicitacao() {
    if (!solicitacaoAtual) return;

    try {
      const despesas = (solicitacaoAtual.DESPESAS || solicitacaoAtual.despesas || []).map(
        (item: any) => ({
          TP_DESPESA: item?.TP_DESPESA || "",
          DESC_DESPESA: item?.DESC_DESPESA || "",
          VALOR: Number(item?.VALOR || 0),
        })
      );

      await gerarPdfSolicitacaoReembolso(
        {
          idSolicitacao: solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA,
          nomeFuncionario: solicitacaoAtual.NM_FUNCIONARIO || "",
          cpfFuncionario: solicitacaoAtual.NR_CPF_FUNCIONARIO || "",
          cidade: solicitacaoAtual.NM_CIDADE || "",
          dtIda: solicitacaoAtual.DT_IDA || "",
          dtVolta: solicitacaoAtual.DT_VOLTA || "",
          justificativa: solicitacaoAtual.DESC_JTF_EVENTO || "",
          nrBanco: solicitacaoAtual.NR_BANCO || "",
          agencia: solicitacaoAtual.CD_AGENCIA || "",
          nrConta: solicitacaoAtual.NR_CONTA || "",
          andamento: solicitacaoAtual.DESC_ANDAMENTO || "",
          despesas,
          nmFinanceiro: solicitacaoAtual.NM_FNC_FINANCEIRO || "",
          parecerFinanceiro: parecerFinanceiroTexto || solicitacaoAtual.DESC_PRC_FINANCEIRO || "",
          nmGerencia: solicitacaoAtual.NM_FNC_GERENCIA || "",
          parecerGerencia: parecerGerenciaTexto || solicitacaoAtual.DESC_PRC_GERENCIA || "",
          nmGerenciaSup: solicitacaoAtual.NM_FNC_GERENCIA_SUP || "",
          parecerGerenciaSup:
            parecerGerenciaSupTexto || solicitacaoAtual.DESC_PRC_GERENCIA_SUP || "",
          nmDiretoria: solicitacaoAtual.NM_FNC_DIRETORIA || "",
          parecerDiretoria: parecerDiretoriaTexto || solicitacaoAtual.DESC_PRC_DIRETORIA || "",
          parecerFinal: parecerFinal || solicitacaoAtual.DESC_ANDAMENTO || "",
        },
        {
          acao: "download",
          nomeArquivo: `reembolso_${String(
            solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA || "solicitacao"
          )}.pdf`,
        }
      );
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o relatório em PDF.");
    }
  }

  if (loading) {
    return (
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="text-sm text-gray-500">Carregando gerenciamento...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="text-sm text-gray-500">
          Acesso negado. Esta tela é permitida apenas para os grupos do AD
          financeiro e suporte.
        </div>
      </div>
    );
  }

  function executarBusca() {
    buscarDespesas(1, pesquisa, nomeResponsavel, podeVerTodos, {
      cpf: filtroCpf,
      cidade: filtroCidade,
      status: filtroStatus,
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#C7D300]" />
        <div className="p-4 lg:p-5">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#00AE9D]">Filtros</p>
          <h2 className="mt-0.5 text-base font-black text-slate-900">Solicitações cadastradas</h2>
          <p className="mt-0.5 text-xs text-slate-500">Pesquise e acompanhe as solicitações de reembolso de despesas.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executarBusca();
          }}
          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Digite o nome do funcionário, CPF, andamento ou cidade"
              className={inputBase}
            />

            <input
              type="text"
              value={filtroCpf}
              onChange={(e) => setFiltroCpf(formatCpfView(e.target.value))}
              placeholder="Filtrar por CPF"
              className={inputBase}
            />

            <input
              type="text"
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              placeholder="Filtrar por cidade"
              className={inputBase}
            />

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={inputBase}
            >
              <option value="">TODOS OS STATUS</option>
              <option value="Pendente Funcionario">PENDENTE FUNCIONÁRIO</option>
              <option value="Pendente Financeiro">PENDENTE FINANCEIRO</option>
              <option value="Pendente Gerencia">PENDENTE GERÊNCIA</option>
              <option value="Pendente Gerencia Superior">PENDENTE GERÊNCIA SUPERIOR</option>
              <option value="Pendente Diretoria">PENDENTE DIRETORIA</option>
              <option value="Aprovado">APROVADO</option>
              <option value="Reprovado">REPROVADO</option>
            </select>

            <button
              type="submit"
              className={primaryButtonBase}
            >
              <FaSearch size={12} />
              Buscar
            </button>

            <button
              type="button"
              onClick={limparBusca}
              className={neutralButtonBase}
            >
              Limpar
            </button>
          </div>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-8">
          <ResumoCard label="Total" value={totais.total} active={!filtrosAplicados.status} onClick={() => filtrarPorResumo("")} />
          <ResumoCard label="P. Funcionário" value={totais.funcionario} tone="amber" active={normalizeStatus(filtrosAplicados.status) === "PENDENTE FUNCIONARIO"} onClick={() => filtrarPorResumo("Pendente Funcionario")} />
          <ResumoCard label="P. Financeiro" value={totais.financeiro} tone="violet" active={normalizeStatus(filtrosAplicados.status) === "PENDENTE FINANCEIRO"} onClick={() => filtrarPorResumo("Pendente Financeiro")} />
          <ResumoCard label="P. Gerência" value={totais.gerencia} tone="sky" active={normalizeStatus(filtrosAplicados.status) === "PENDENTE GERENCIA"} onClick={() => filtrarPorResumo("Pendente Gerencia")} />
          <ResumoCard label="P. Gerência Sup." value={totais.gerenciaSup} tone="teal" active={normalizeStatus(filtrosAplicados.status) === "PENDENTE GERENCIA SUPERIOR"} onClick={() => filtrarPorResumo("Pendente Gerencia Superior")} />
          <ResumoCard label="P. Diretoria" value={totais.diretoria} tone="sky" active={normalizeStatus(filtrosAplicados.status) === "PENDENTE DIRETORIA"} onClick={() => filtrarPorResumo("Pendente Diretoria")} />
          <ResumoCard label="Aprovados" value={totais.aprovados} tone="emerald" active={normalizeStatus(filtrosAplicados.status) === "APROVADO"} onClick={() => filtrarPorResumo("Aprovado")} />
          <ResumoCard label="Reprovados" value={totais.reprovados} tone="red" active={normalizeStatus(filtrosAplicados.status) === "REPROVADO"} onClick={() => filtrarPorResumo("Reprovado")} />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={`${tableHeaderBase} text-left`}>
                  Nome
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  CPF
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  Cidade
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  Abertura
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  Ida
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  Volta
                </th>
                <th className={`${tableHeaderBase} text-left`}>
                  Status
                </th>
                <th className={`${tableHeaderBase} text-center`}>
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingBusca ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                lista.map((item) => (
                  <tr key={item.ID_SOLICITACAO_REEMBOLSO_DESPESA} className="transition hover:bg-emerald-50/40">
                    <td className={`${tableCellBase} font-semibold text-slate-900`}>
                      {primeiroUltimoNome(capitalizeWords(item.NM_FUNCIONARIO))}
                    </td>
                    <td className={tableCellBase}>
                      {formatCpfView(item.NR_CPF_FUNCIONARIO)}
                    </td>
                    <td className={tableCellBase}>
                      {capitalizeWords(item.NM_CIDADE)}
                    </td>
                    <td className={tableCellBase}>
                      {formatDateBR(item.DT_ABERTURA)}
                    </td>
                    <td className={tableCellBase}>
                      {formatDateBR(item.DT_IDA)}
                    </td>
                    <td className={tableCellBase}>
                      {formatDateBR(item.DT_VOLTA)}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2 text-sm text-slate-700">
                      <StatusReembolsoBadge status={item.DESC_ANDAMENTO} />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => abrirSolicitacao(item)}
                        className={`whitespace-nowrap rounded-xl border px-2 py-2 text-xs font-black shadow-sm transition hover:shadow-md ${item.SN_FINALIZADO
                          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-[#00AE9D]/35 bg-[#00AE9D]/10 text-[#006f65] hover:bg-[#00AE9D] hover:text-white"}`}
                      >
                        {item.SN_FINALIZADO ? "Concluído" : "Informações"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            currentPage={paginaAtual}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            loading={loadingBusca}
            onChange={(page) => buscarDespesas(page)}
            onLimitChange={alterarLimite}
          />
        </div>
        </div>
      </div>

      {modalOpen && solicitacaoAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Reembolso de despesas
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    Solicitação #{solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Consulte os dados da solicitação, despesas e pareceres do fluxo de aprovação.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(94vh-105px)] space-y-5 overflow-y-auto p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Solicitação
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados do funcionário
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Informações do solicitante, período da despesa e dados para reembolso.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-9">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Funcionário
                    </label>

                    <input
                      value={solicitacaoAtual.NM_FUNCIONARIO || ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CPF
                    </label>

                    <input
                      value={formatCpfView(
                        solicitacaoAtual.NR_CPF_FUNCIONARIO || ""
                      )}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Ida
                    </label>

                    <input
                      value={formatDateBR(solicitacaoAtual.DT_IDA)}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Volta
                    </label>

                    <input
                      value={formatDateBR(solicitacaoAtual.DT_VOLTA)}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Cidade
                    </label>

                    <input
                      value={solicitacaoAtual.NM_CIDADE || ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Justificativa
                    </label>

                    <textarea
                      value={solicitacaoAtual.DESC_JTF_EVENTO || ""}
                      readOnly
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Nº Banco
                    </label>

                    <input
                      value={solicitacaoAtual.NR_BANCO || ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Agência
                    </label>

                    <input
                      value={solicitacaoAtual.CD_AGENCIA || ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Nº Conta
                    </label>

                    <input
                      value={solicitacaoAtual.NR_CONTA || ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Reembolso
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Despesas
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Consulte os valores informados e os comprovantes anexados pelo funcionário.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {(
                    solicitacaoAtual.DESPESAS ||
                    solicitacaoAtual.despesas ||
                    []
                  ).map((despesa: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Tipo
                          </label>

                          <input
                            value={capitalizeWords(despesa.TP_DESPESA || "")}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Valor
                          </label>

                          <input
                            value={fmtBRL(despesa.VALOR || 0)}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
                          />
                        </div>

                        <div className="md:col-span-6">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Comprovante
                          </label>

                          <button
                            type="button"
                            disabled={!despesa.COMPROVANTE}
                            onClick={() =>
                              baixarArquivo(despesa.COMPROVANTE)
                            }
                            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <FaFilePdf size={15} />

                            <span className="truncate">
                              {despesa.COMPROVANTE
                                ? String(despesa.COMPROVANTE)
                                  .split(/[/\\]/)
                                  .pop()
                                : "Sem comprovante"}
                            </span>
                          </button>
                        </div>

                        <div className="md:col-span-12">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Descrição
                          </label>

                          <textarea
                            value={despesa.DESC_DESPESA || ""}
                            readOnly
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-1">
                    <div className="w-full rounded-2xl border border-primary/20 bg-white p-4 sm:w-72">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Total de despesas
                      </p>

                      <p className="mt-1 text-2xl font-bold text-primary">
                        {fmtBRL(
                          (
                            solicitacaoAtual.DESPESAS ||
                            solicitacaoAtual.despesas ||
                            []
                          ).reduce(
                            (acc: number, item: any) =>
                              acc + Number(item.VALOR || 0),
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Aprovação
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Pareceres da solicitação
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Acompanhe as análises realizadas em cada etapa do fluxo de aprovação.
                  </p>
                </div>

                <div className="mt-5 space-y-5">

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Financeiro
                    </p>

                    {isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Financeiro"
                    ) &&
                      isFinanceiroAD && (
                        <div className="mb-4">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Parecer Financeiro
                          </label>

                          <select
                            value={parecerFinanceiroSelect}
                            onChange={(e) =>
                              setParecerFinanceiroSelect(e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                          >
                            <option value="">Selecione</option>
                            <option value="Solicitação Divergente">
                              Solicitação Divergente
                            </option>
                            <option value="Solicitação OK">
                              Solicitação OK
                            </option>
                          </select>
                        </div>
                      )}

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Parecer Financeiro Escrito
                      </label>

                      <textarea
                        value={parecerFinanceiroTexto}
                        onChange={(e) =>
                          setParecerFinanceiroTexto(e.target.value)
                        }
                        disabled={
                          !(
                            isAndamento(
                              solicitacaoAtual.DESC_ANDAMENTO || "",
                              "Pendente Financeiro"
                            ) && isFinanceiroAD
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                      />
                    </div>

                    {isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Financeiro"
                    ) &&
                      isFinanceiroAD && (
                        <div className="mt-4">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Financeiro
                          </label>

                          <input
                            value={solicitacaoAtual.NM_FNC_FINANCEIRO || ""}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          />
                        </div>
                      )}
                  </div>

                  {!!solicitacaoAtual.HAS_GERENCIA && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        Gerência
                      </p>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Parecer Gerência
                        </label>

                        <textarea
                          value={parecerGerenciaTexto}
                          onChange={(e) =>
                            setParecerGerenciaTexto(e.target.value)
                          }
                          disabled={
                            !(
                              solicitacaoAtual.DESC_ANDAMENTO ===
                              "Pendente Gerencia" &&
                              podeAtuarEtapaGerencia
                            )
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Gerência
                        </label>

                        <input
                          value={
                            solicitacaoAtual.APROV_GERENCIA_NOME ||
                            solicitacaoAtual.NM_FNC_GERENCIA ||
                            ""
                          }
                          readOnly
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </div>
                    </div>
                  )}

                  {!!solicitacaoAtual.HAS_GERENCIA_SUP && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        Gerência Superior
                      </p>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Parecer Gerência Superior
                        </label>

                        <textarea
                          value={parecerGerenciaSupTexto}
                          onChange={(e) =>
                            setParecerGerenciaSupTexto(e.target.value)
                          }
                          disabled={
                            !(
                              solicitacaoAtual.DESC_ANDAMENTO ===
                              "Pendente Gerencia Superior" &&
                              podeAtuarEtapaGerenciaSup
                            )
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Gerência Superior
                        </label>

                        <input
                          value={
                            solicitacaoAtual.APROV_GERENCIA_SUP_NOME ||
                            solicitacaoAtual.NM_FNC_GERENCIA_SUP ||
                            ""
                          }
                          readOnly
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Diretoria
                    </p>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Parecer Diretoria
                      </label>

                      <textarea
                        value={parecerDiretoriaTexto}
                        onChange={(e) =>
                          setParecerDiretoriaTexto(e.target.value)
                        }
                        disabled={
                          !(
                            solicitacaoAtual.DESC_ANDAMENTO ===
                            "Pendente Diretoria" &&
                            podeAtuarEtapaDiretoria
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Diretoria
                      </label>

                      <input
                        value={
                          solicitacaoAtual.NM_FNC_DIRETORIA ||
                          (isAndamento(
                            solicitacaoAtual.DESC_ANDAMENTO || "",
                            "Pendente Diretoria"
                          ) && podeAtuarEtapaDiretoria
                            ? diretoriaCompleto?.NM_FUNCIONARIO ||
                            nomeUsuarioLogado ||
                            nomeResponsavelAD ||
                            ""
                            : "")
                        }
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  {((isAndamento(
                    solicitacaoAtual.DESC_ANDAMENTO || "",
                    "Pendente Gerencia"
                  ) &&
                    podeAtuarEtapaGerencia) ||
                    (isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Gerencia Superior"
                    ) &&
                      podeAtuarEtapaGerenciaSup) ||
                    (isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Diretoria"
                    ) &&
                      podeAtuarEtapaDiretoria)) && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Parecer Final
                        </label>

                        <select
                          value={parecerFinal}
                          onChange={(e) =>
                            setParecerFinal(e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        >
                          <option value="">Selecione</option>
                          <option value="Aprovado">Aprovado</option>
                          <option value="Reprovado">Reprovado</option>
                        </select>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Fechar
                </button>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    disabled={!podeConcluir() || saving}
                    onClick={concluirSolicitacaoAtual}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaCheck size={14} />
                    Concluído
                  </button>

                  <button
                    type="button"
                    disabled={!podeGerarRelatorio()}
                    onClick={imprimirSolicitacao}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaFilePdf size={14} />
                    Gerar Relatório
                  </button>

                  <button
                    type="button"
                    disabled={!podeEditarSolicitacao()}
                    onClick={() =>
                      mudarTelaEditar(
                        solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA
                      )
                    }
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaEdit size={14} />
                    Editar Solicitação
                  </button>

                  <button
                    type="button"
                    disabled={!podeSalvarParecer() || saving}
                    onClick={salvarParecer}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave size={14} />

                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusReembolsoBadge({ status }: { status?: string }) {
  const estilos: Record<string, string> = {
    "PENDENTE FUNCIONARIO": "border-amber-300 bg-amber-100 text-amber-800",
    "PENDENTE FINANCEIRO": "border-violet-300 bg-violet-100 text-violet-800",
    "PENDENTE GERENCIA": "border-sky-300 bg-sky-100 text-sky-800",
    "PENDENTE GERENCIA SUPERIOR": "border-teal-300 bg-teal-100 text-teal-800",
    "PENDENTE DIRETORIA": "border-sky-300 bg-sky-100 text-sky-800",
    APROVADO: "border-emerald-300 bg-emerald-100 text-emerald-800",
    REPROVADO: "border-red-300 bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-black uppercase ${estilos[normalizeStatus(status || "")] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
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
  onClick: () => void;
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2.5 text-left shadow-sm transition ${tones[tone]} ${active
        ? "ring-2 ring-[#00AE9D]/35 ring-offset-1"
        : "hover:-translate-y-0.5 hover:border-[#00AE9D]/45 hover:shadow-md"}`}
    >
      <span className="block text-[10px] font-black uppercase tracking-[0.08em] opacity-75">{label}</span>
      <span className="mt-1 block text-xl font-black leading-none">{value}</span>
    </button>
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
    <div className="mt-4 border-t border-slate-100 bg-white px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{primeiro}</span> até{" "}
            <span className="font-semibold text-slate-700">{ultimo}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> solicitação(ões)
          </p>
          <select
            aria-label="Solicitações por página"
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
