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

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";

const readOnlyFieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none";

const textareaClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20 disabled:bg-slate-50";

const readOnlyTextareaClass =
  "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none";

const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#79B729] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#49479D] disabled:cursor-not-allowed disabled:opacity-60";

const neutralButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-100";

export function GerenciamentoReembolsoDespesaForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [saving, setSaving] = useState(false);
  const salvarParecerLockRef = useRef(false);
  const concluirSolicitacaoLockRef = useRef(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroCpf, setFiltroCpf] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [nomeResponsavelAD, setNomeResponsavelAD] = useState("");
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState("");
  const [loginUsuarioLogado, setLoginUsuarioLogado] = useState("");
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
      const loginAD = me?.username || "";
      const grupos = Array.isArray(me?.grupos) ? me.grupos : [];
      setNomeResponsavelAD(nomeAD);
      setNomeUsuarioLogado(nomeAD);
      setLoginUsuarioLogado(loginAD);

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

      if (!usuarioPodeVerTodos && !nomeFiltro) {
        setNomeResponsavel("");
        setDiretoriaCompleto(null);
        setLista([]);
        setListaContador([]);
        setTotais(totaisInicial);

        alert(
          "Seu usuário do AD não foi encontrado na base de funcionários. Por isso, não foi possível carregar suas solicitações."
        );

        return;
      }

      const nomeBusca = nomeFiltro || nomeAD;

      setNomeResponsavel(nomeBusca);
      setDiretoriaCompleto(funcionario);

      await Promise.all([
        buscarDespesas(1, "", nomeBusca, usuarioPodeVerTodos, undefined, loginAD),
        carregarContadores(nomeBusca, usuarioPodeVerTodos, undefined, loginAD),
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
    verTodos = podeVerTodos,
    filtros?: {
      pesquisa?: string;
      cpf?: string;
      cidade?: string;
      status?: string;
    },
    login = loginUsuarioLogado
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
        login,
        pesquisa: (filtros?.pesquisa ?? pesquisa).trim(),
        cpf: onlyDigits(filtros?.cpf ?? filtroCpf),
        cidade: filtros?.cidade ?? filtroCidade ?? "",
        status: filtros?.status ?? filtroStatus ?? "",
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
      const status = String(item.DESC_ANDAMENTO || "");

      if (status === "Pendente Funcionario") novosTotais.funcionario += 1;
      else if (status === "Pendente Financeiro") novosTotais.financeiro += 1;
      else if (status === "Pendente Gerencia") novosTotais.gerencia += 1;
      else if (status === "Pendente Gerencia Superior") novosTotais.gerenciaSup += 1;
      else if (status === "Pendente Diretoria") novosTotais.diretoria += 1;
      else if (status === "Aprovado") novosTotais.aprovados += 1;
      else if (status === "Reprovado") novosTotais.reprovados += 1;

      novosTotais.total += 1;
    });

    setTotais(novosTotais);
  }

  async function buscarDespesas(
    pagina = 1,
    textoPesquisa = pesquisa,
    nome = nomeResponsavel,
    verTodos = podeVerTodos,
    filtros?: {
      cpf?: string;
      cidade?: string;
      status?: string;
    },
    login = loginUsuarioLogado
  ) {
    try {
      setLoadingBusca(true);

      const nomeFiltro = nomeResponsavel || nome || nomeResponsavelAD;

      console.log("BUSCANDO COM:", {
        verTodos,
        nomeFiltro,
        nomeResponsavel,
        nome,
      });

      const response = await buscarSolicitacoesReembolsoPaginado({
        nome: nomeFiltro,
        login,
        pesquisa: textoPesquisa.trim(),
        cpf: onlyDigits(filtros?.cpf ?? filtroCpf),
        cidade: filtros?.cidade ?? filtroCidade ?? "",
        status: filtros?.status ?? filtroStatus ?? "",
        verTodos,
        page: pagina,
        limit: 10,
      });

      setLista(response.items || []);
      setPaginaAtual(pagina);
      setTotalPages(response.total_pages || 1);
      setTotalItems(Number(response.total || 0));
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
    setLista([]);
    setTotalPages(1);
    setPaginaAtual(1);

    buscarDespesas(1, "", nomeResponsavel, podeVerTodos, {
      cpf: "",
      cidade: "",
      status: "",
    });

    carregarContadores(nomeResponsavel, podeVerTodos, {
      pesquisa: "",
      cpf: "",
      cidade: "",
      status: "",
    });
  }

  function aplicarFiltroRapidoStatus(status: string) {
    setFiltroStatus(status);

    buscarDespesas(1, pesquisa, nomeResponsavel, podeVerTodos, {
      cpf: filtroCpf,
      cidade: filtroCidade,
      status,
    });
  }

  function podeEditarSolicitacao() {
    if (!solicitacaoAtual) return false;

    if (!isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Funcionario")) return false;

    if (isSecretariaDiretoria(solicitacaoAtual.TIPO_USUARIO)) return true;

    const nomeSolicitacao = normalizeNomeComparacao(
      solicitacaoAtual.NM_FUNCIONARIO || ""
    );
    const nomeUsuarioAbertura = normalizeNomeComparacao(
      solicitacaoAtual.NM_USUARIO_ABERTURA || ""
    );
    const loginUsuarioAbertura = normalizeNomeComparacao(
      solicitacaoAtual.NM_LOGIN_ABERTURA || ""
    );

    const nomesPossiveisUsuario = [
      nomeResponsavel,
      nomeResponsavelAD,
      nomeUsuarioLogado,
    ]
      .map((n) => normalizeNomeComparacao(n || ""))
      .filter(Boolean);

    const loginsPossiveisUsuario = [loginUsuarioLogado]
      .map((n) => normalizeNomeComparacao(n || ""))
      .filter(Boolean);

    return (
      nomesPossiveisUsuario.includes(nomeSolicitacao) ||
      (!!nomeUsuarioAbertura && nomesPossiveisUsuario.includes(nomeUsuarioAbertura)) ||
      (!!loginUsuarioAbertura && loginsPossiveisUsuario.includes(loginUsuarioAbertura))
    );
  }

  function usuarioLogadoAbriuSolicitacao() {
    if (!solicitacaoAtual) return false;

    const nomeUsuarioAbertura = normalizeNomeComparacao(
      solicitacaoAtual.NM_USUARIO_ABERTURA || ""
    );
    const loginUsuarioAbertura = normalizeNomeComparacao(
      solicitacaoAtual.NM_LOGIN_ABERTURA || ""
    );

    const nomesPossiveisUsuario = [
      nomeResponsavel,
      nomeResponsavelAD,
      nomeUsuarioLogado,
    ]
      .map((n) => normalizeNomeComparacao(n || ""))
      .filter(Boolean);

    const loginsPossiveisUsuario = [loginUsuarioLogado]
      .map((n) => normalizeNomeComparacao(n || ""))
      .filter(Boolean);

    return (
      (!!nomeUsuarioAbertura && nomesPossiveisUsuario.includes(nomeUsuarioAbertura)) ||
      (!!loginUsuarioAbertura && loginsPossiveisUsuario.includes(loginUsuarioAbertura))
    );
  }

  function podeAtuarComoFinanceiro() {
    return isFinanceiroAD && !usuarioLogadoAbriuSolicitacao();
  }

  function podeSalvarParecer() {
    if (!solicitacaoAtual) return false;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Financeiro") &&
      podeAtuarComoFinanceiro()
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
    return solicitacaoAtual.DESC_ANDAMENTO === "Aprovado" && podeAtuarComoFinanceiro();
  }

  function podeConcluir() {
    if (!solicitacaoAtual) return false;
    return (
      solicitacaoAtual.DESC_ANDAMENTO === "Aprovado" &&
      podeAtuarComoFinanceiro() &&
      !solicitacaoAtual.SN_FINALIZADO
    );
  }

  function validarCampos() {
    if (!solicitacaoAtual) return false;
    const andamentoAtual = solicitacaoAtual.DESC_ANDAMENTO || "";

    if (isAndamento(andamentoAtual, "Pendente Financeiro") && podeAtuarComoFinanceiro()) {
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
    if (saving || salvarParecerLockRef.current) return;
    if (!validarCampos()) return;

    salvarParecerLockRef.current = true;

    try {
      setSaving(true);

      let acao = "";
      let parecer = "";

      if (
        podeAtuarComoFinanceiro() &&
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
        buscarDespesas(paginaAtual, pesquisa, nomeResponsavel, podeVerTodos),
        carregarContadores(nomeResponsavel, podeVerTodos),
      ]);
    } catch (error) {
      console.error(error);
      alert("Não foi possível atualizar a solicitação.");
    } finally {
      setSaving(false);
      salvarParecerLockRef.current = false;
    }
  }

  async function concluirSolicitacaoAtual() {
    if (!solicitacaoAtual) return;
    if (saving || concluirSolicitacaoLockRef.current) return;

    concluirSolicitacaoLockRef.current = true;

    try {
      setSaving(true);
      await concluirSolicitacaoReembolso(
        solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA
      );

      alert("Solicitação concluída com sucesso.");
      setModalOpen(false);

      await Promise.all([
        buscarDespesas(paginaAtual, pesquisa, nomeResponsavel, podeVerTodos),
        carregarContadores(nomeResponsavel, podeVerTodos),
      ]);
    } catch (error) {
      console.error(error);
      alert("Não foi possível concluir a solicitação.");
    } finally {
      setSaving(false);
      concluirSolicitacaoLockRef.current = false;
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
      <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Carregando gerenciamento...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-sm font-semibold text-red-700">
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

    carregarContadores(nomeResponsavel, podeVerTodos, {
      pesquisa,
      cpf: filtroCpf,
      cidade: filtroCidade,
      status: filtroStatus,
    });
  }

  return (
    <>
      <div className="mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();

            buscarDespesas(1, pesquisa, nomeResponsavel, podeVerTodos, {
              cpf: filtroCpf,
              cidade: filtroCidade,
              status: filtroStatus,
            });

            carregarContadores(nomeResponsavel, podeVerTodos, {
              pesquisa,
              cpf: filtroCpf,
              cidade: filtroCidade,
              status: filtroStatus,
            });
          }}
          className="p-5"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
                <h2 className="text-base font-black text-slate-950">Filtros</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Pesquise e acompanhe o andamento das solicitações de reembolso.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/auth/cadastro_reembolso_despesa")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#49479D]"
            >
              <FaPlus size={12} />
              Nova Solicitação
            </button>
          </div>

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
            <label>
              <span className={labelClass}>Pesquisa</span>
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Funcionário, CPF, andamento ou cidade"
                className={fieldClass}
              />
            </label>

            <label>
              <span className={labelClass}>CPF</span>
              <input
                type="text"
                value={filtroCpf}
                onChange={(e) => setFiltroCpf(formatCpfView(e.target.value))}
                placeholder="Filtrar por CPF"
                className={fieldClass}
              />
            </label>

            <label>
              <span className={labelClass}>Cidade</span>
              <input
                type="text"
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                placeholder="Filtrar por cidade"
                className={fieldClass}
              />
            </label>

            <label>
              <span className={labelClass}>Status</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className={fieldClass}
              >
                <option value="">Todos os status</option>
                <option value="Pendente Funcionario">Pendente funcionário</option>
                <option value="Pendente Financeiro">Pendente financeiro</option>
                <option value="Pendente Gerencia">Pendente gerência</option>
                <option value="Pendente Gerencia Superior">Pendente gerência superior</option>
                <option value="Pendente Diretoria">Pendente diretoria</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Reprovado">Reprovado</option>
              </select>
            </label>

            <button
              type="submit"
              className={primaryButtonClass}
            >
              <FaSearch size={12} />
              Buscar
            </button>

            <button
              type="button"
              onClick={limparBusca}
              className={neutralButtonClass}
            >
              Limpar
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-5 md:grid-cols-4 xl:grid-cols-8">
          <ResumoCard label="Total" value={totais.total} variant="slate" active={filtroStatus === ""} onClick={() => aplicarFiltroRapidoStatus("")} />
          <ResumoCard label="Funcionário" value={totais.funcionario} variant="amber" active={filtroStatus === "Pendente Funcionario"} onClick={() => aplicarFiltroRapidoStatus("Pendente Funcionario")} />
          <ResumoCard label="Financeiro" value={totais.financeiro} variant="sky" active={filtroStatus === "Pendente Financeiro"} onClick={() => aplicarFiltroRapidoStatus("Pendente Financeiro")} />
          <ResumoCard label="Gerência" value={totais.gerencia} variant="teal" active={filtroStatus === "Pendente Gerencia"} onClick={() => aplicarFiltroRapidoStatus("Pendente Gerencia")} />
          <ResumoCard label="Gerência Sup." value={totais.gerenciaSup} variant="indigo" active={filtroStatus === "Pendente Gerencia Superior"} onClick={() => aplicarFiltroRapidoStatus("Pendente Gerencia Superior")} />
          <ResumoCard label="Diretoria" value={totais.diretoria} variant="violet" active={filtroStatus === "Pendente Diretoria"} onClick={() => aplicarFiltroRapidoStatus("Pendente Diretoria")} />
          <ResumoCard label="Aprovados" value={totais.aprovados} variant="green" active={filtroStatus === "Aprovado"} onClick={() => aplicarFiltroRapidoStatus("Aprovado")} />
          <ResumoCard label="Reprovados" value={totais.reprovados} variant="red" active={filtroStatus === "Reprovado"} onClick={() => aplicarFiltroRapidoStatus("Reprovado")} />
        </div>

        <div className="border-t border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-950">Solicitações cadastradas</h3>
              <p className="text-sm text-slate-600">Total localizado: {totais.total}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full overflow-hidden">
              <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nome
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  CPF
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Cidade
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Abertura
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Ida
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Volta
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Status
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingBusca ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Carregando...
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                lista.map((item) => (
                  <tr key={item.ID_SOLICITACAO_REEMBOLSO_DESPESA} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                      {primeiroUltimoNome(capitalizeWords(item.NM_FUNCIONARIO))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {formatCpfView(item.NR_CPF_FUNCIONARIO)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {capitalizeWords(item.NM_CIDADE)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {formatDateBR(item.DT_ABERTURA)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {formatDateBR(item.DT_IDA)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {formatDateBR(item.DT_VOLTA)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {capitalizeWords(item.DESC_ANDAMENTO)}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => abrirSolicitacao(item)}
                        className={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-bold text-white shadow-sm transition ${item.SN_FINALIZADO ? "bg-[#00AE9D] hover:bg-[#49479D]" : "bg-[#79B729] hover:bg-[#00AE9D]"
                          }`}
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
            loading={loadingBusca}
            onChange={(page) =>
              buscarDespesas(page, pesquisa, nomeResponsavel, podeVerTodos, {
                cpf: filtroCpf,
                cidade: filtroCidade,
                status: filtroStatus,
              })
            }
          />
        </div>
      </div>

      {modalOpen && solicitacaoAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#00AE9D]">
                  Análise de reembolso
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Solicitação #{solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {capitalizeWords(solicitacaoAtual.DESC_ANDAMENTO || "")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-9">
                  <label className={labelClass}>Funcionário</label>
                  <input
                    value={solicitacaoAtual.NM_FUNCIONARIO || ""}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className={labelClass}>CPF</label>
                  <input
                    value={formatCpfView(solicitacaoAtual.NR_CPF_FUNCIONARIO || "")}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className={labelClass}>Ida</label>
                  <input
                    value={formatDateBR(solicitacaoAtual.DT_IDA)}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className={labelClass}>Volta</label>
                  <input
                    value={formatDateBR(solicitacaoAtual.DT_VOLTA)}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-6">
                  <label className={labelClass}>Cidade</label>
                  <input
                    value={solicitacaoAtual.NM_CIDADE || ""}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-12">
                  <label className={labelClass}>Justificativa</label>
                  <textarea
                    value={solicitacaoAtual.DESC_JTF_EVENTO || ""}
                    readOnly
                    rows={3}
                    className={readOnlyTextareaClass}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className={labelClass}>Nº Banco</label>
                  <input
                    value={solicitacaoAtual.NR_BANCO || ""}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className={labelClass}>Agência</label>
                  <input
                    value={solicitacaoAtual.CD_AGENCIA || ""}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className={labelClass}>Nº Conta</label>
                  <input
                    value={solicitacaoAtual.NR_CONTA || ""}
                    readOnly
                    className={readOnlyFieldClass}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
                  <h4 className="text-sm font-black text-slate-950">Despesas</h4>
                </div>

                <div className="space-y-4">
                  {(solicitacaoAtual.DESPESAS || solicitacaoAtual.despesas || []).map((despesa: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className={labelClass}>Tipo</label>
                            <input
                              value={capitalizeWords(despesa.TP_DESPESA || "")}
                              readOnly
                              className={readOnlyFieldClass}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Valor</label>
                            <input
                              value={fmtBRL(despesa.VALOR || 0)}
                              readOnly
                              className={`${readOnlyFieldClass} text-right font-bold`}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!despesa.COMPROVANTE}
                          onClick={() => baixarArquivo(despesa.COMPROVANTE)}
                          className={secondaryButtonClass}
                        >
                          {despesa.COMPROVANTE
                            ? String(despesa.COMPROVANTE).split(/[/\\]/).pop()
                            : "Sem comprovante"}
                        </button>
                      </div>

                      <div>
                        <label className={labelClass}>Descrição</label>
                        <textarea
                          value={despesa.DESC_DESPESA || ""}
                          readOnly
                          rows={4}
                          className={readOnlyTextareaClass}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-[280px]">
                    <div>
                      <label className={labelClass}>Total de Despesas</label>
                      <input
                        value={fmtBRL(
                          (solicitacaoAtual.DESPESAS || solicitacaoAtual.despesas || []).reduce(
                            (acc: number, item: any) => acc + Number(item.VALOR || 0),
                            0
                          )
                        )}
                        readOnly
                        className={`${readOnlyFieldClass} text-right font-bold`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isAndamento(
                solicitacaoAtual.DESC_ANDAMENTO || "",
                "Pendente Financeiro"
              ) &&
                isFinanceiroAD &&
                usuarioLogadoAbriuSolicitacao() && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Você abriu esta solicitação. Para manter a conferência independente,
                    outro usuário do financeiro precisa dar o parecer.
                  </div>
                )}

              {isAndamento(
                solicitacaoAtual.DESC_ANDAMENTO || "",
                "Pendente Financeiro"
              ) &&
                podeAtuarComoFinanceiro() && (
                  <div className="mt-5">
                    <label className={labelClass}>
                      Parecer Financeiro
                    </label>
                    <select
                      value={parecerFinanceiroSelect}
                      onChange={(e) => setParecerFinanceiroSelect(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Selecione</option>
                      <option value="Solicitação Divergente">Solicitação Divergente</option>
                      <option value="Solicitação OK">Solicitação OK</option>
                    </select>
                  </div>
                )}

              <div className="mt-3">
                <label className={labelClass}>
                  Parecer Financeiro Escrito
                </label>
                <textarea
                  value={parecerFinanceiroTexto}
                  onChange={(e) => setParecerFinanceiroTexto(e.target.value)}
                  disabled={!(
                    isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Financeiro"
                    ) &&
                    podeAtuarComoFinanceiro()
                  )}
                  rows={3}
                  className={textareaClass}
                />
              </div>

              {isAndamento(
                solicitacaoAtual.DESC_ANDAMENTO || "",
                "Pendente Financeiro"
              ) &&
                podeAtuarComoFinanceiro() && (
                  <div className="mt-5">
                    <label className={labelClass}>
                      Financeiro
                    </label>
                    <input
                      value={solicitacaoAtual.NM_FNC_FINANCEIRO || ""}
                      readOnly
                      className={readOnlyFieldClass}
                    />
                  </div>
                )}

              {!!solicitacaoAtual.HAS_GERENCIA && (
                <>
                  <div className="mt-5">
                    <label className={labelClass}>
                      Parecer Gerência
                    </label>
                    <textarea
                      value={parecerGerenciaTexto}
                      onChange={(e) => setParecerGerenciaTexto(e.target.value)}
                      disabled={!(
                        solicitacaoAtual.DESC_ANDAMENTO === "Pendente Gerencia" &&
                        podeAtuarEtapaGerencia
                      )}
                      rows={3}
                      className={textareaClass}
                    />
                  </div>

                  <div className="mt-3">
                    <label className={labelClass}>Gerência</label>
                    <input
                      value={
                        solicitacaoAtual.APROV_GERENCIA_NOME ||
                        solicitacaoAtual.NM_FNC_GERENCIA ||
                        ""
                      }
                      readOnly
                      className={readOnlyFieldClass}
                    />
                  </div>
                </>
              )}

              {!!solicitacaoAtual.HAS_GERENCIA_SUP && (
                <>
                  <div className="mt-5">
                    <label className={labelClass}>
                      Parecer Gerência Superior
                    </label>
                    <textarea
                      value={parecerGerenciaSupTexto}
                      onChange={(e) => setParecerGerenciaSupTexto(e.target.value)}
                      disabled={!(
                        solicitacaoAtual.DESC_ANDAMENTO === "Pendente Gerencia Superior" &&
                        podeAtuarEtapaGerenciaSup
                      )}
                      rows={3}
                      className={textareaClass}
                    />
                  </div>

                  <div className="mt-3">
                    <label className={labelClass}>
                      Gerência Superior
                    </label>
                    <input
                      value={
                        solicitacaoAtual.APROV_GERENCIA_SUP_NOME ||
                        solicitacaoAtual.NM_FNC_GERENCIA_SUP ||
                        ""
                      }
                      readOnly
                      className={readOnlyFieldClass}
                    />
                  </div>
                </>
              )}

              <div className="mt-5">
                <label className={labelClass}>
                  Parecer Diretoria
                </label>
                <textarea
                  value={parecerDiretoriaTexto}
                  onChange={(e) => setParecerDiretoriaTexto(e.target.value)}
                  disabled={!(
                    solicitacaoAtual.DESC_ANDAMENTO === "Pendente Diretoria" &&
                    podeAtuarEtapaDiretoria
                  )}
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className="mt-3">
                <label className={labelClass}>Diretoria</label>
                <input
                  value={
                    solicitacaoAtual.NM_FNC_DIRETORIA ||
                    (isAndamento(
                      solicitacaoAtual.DESC_ANDAMENTO || "",
                      "Pendente Diretoria"
                    ) &&
                      podeAtuarEtapaDiretoria
                      ? diretoriaCompleto?.NM_FUNCIONARIO ||
                      nomeUsuarioLogado ||
                      nomeResponsavelAD ||
                      ""
                      : "")
                  }
                  readOnly
                  className={readOnlyFieldClass}
                />
              </div>

              {((isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia") &&
                podeAtuarEtapaGerencia) ||
                (isAndamento(
                  solicitacaoAtual.DESC_ANDAMENTO || "",
                  "Pendente Gerencia Superior"
                ) &&
                  podeAtuarEtapaGerenciaSup) ||
                (isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
                  podeAtuarEtapaDiretoria)) && (
                  <div className="mt-5">
                    <label className={labelClass}>
                      Parecer Final
                    </label>
                    <select
                      value={parecerFinal}
                      onChange={(e) => setParecerFinal(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Selecione</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Reprovado">Reprovado</option>
                    </select>
                  </div>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                disabled={!podeConcluir() || saving || concluirSolicitacaoLockRef.current}
                aria-busy={saving && concluirSolicitacaoLockRef.current}
                onClick={concluirSolicitacaoAtual}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaCheck size={12} />
                Concluído
              </button>

              <button
                type="button"
                disabled={!podeGerarRelatorio()}
                onClick={imprimirSolicitacao}
                className={secondaryButtonClass}
              >
                <FaFilePdf size={12} />
                Gerar Relatório
              </button>

              <button
                type="button"
                disabled={!podeEditarSolicitacao()}
                onClick={() =>
                  mudarTelaEditar(solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#49479D]/30 bg-[#49479D]/10 px-4 text-sm font-bold text-[#49479D] shadow-sm transition hover:bg-[#49479D] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaEdit size={12} />
                Editar Solicitação
              </button>

              <button
                type="button"
                disabled={!podeSalvarParecer() || saving || salvarParecerLockRef.current}
                aria-busy={saving && salvarParecerLockRef.current}
                onClick={salvarParecer}
                className={primaryButtonClass}
              >
                <FaSave size={12} />
                Salvar
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={dangerButtonClass}
              >
                <FaTimes size={12} />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  loading = false,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  loading?: boolean;
  onChange: (page: number) => void;
}) {
  const limit = 10;
  const total = Math.max(1, totalPages);
  const primeiro = totalItems > 0 ? (currentPage - 1) * limit + 1 : 0;
  const ultimo = totalItems > 0 ? Math.min(currentPage * limit, totalItems) : 0;

  return (
    <div className="border-t border-slate-100 bg-white px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700">{primeiro}</span> até{" "}
          <span className="font-semibold text-slate-700">{ultimo}</span> de{" "}
          <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
          solicitação(ões)
        </p>

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
            Página {currentPage} de {total}
          </span>

          <button
            type="button"
            onClick={() => onChange(Math.min(currentPage + 1, total))}
            disabled={currentPage >= total || loading}
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

function ResumoCard({
  label,
  value,
  variant = "slate",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  variant?: "amber" | "sky" | "teal" | "indigo" | "violet" | "green" | "red" | "slate";
  active?: boolean;
  onClick?: () => void;
}) {
  const variants = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${variants[variant]} ${
        active ? "ring-2 ring-[#00AE9D]/40" : ""
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </button>
  );
}
