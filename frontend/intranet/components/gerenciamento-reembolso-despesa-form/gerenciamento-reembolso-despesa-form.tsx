"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCheck,
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
  atualizarDiretoriaSolicitacaoReembolso,
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

function normalizeGrupo(value: string) {
  return String(value || "").trim().toUpperCase();
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

export function GerenciamentoReembolsoDespesaForm() {
  const router = useRouter();

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

  const perfilTipo = useMemo(() => {
    return solicitacaoAtual?.TIPO_USUARIO || solicitacaoAtual?.tipo || "";
  }, [solicitacaoAtual]);

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

      const nomeAD = "ANA CAROLINA MOTA HESPANHA RODRIGUES";
      const grupos = Array.isArray(me?.grupos) ? me.grupos : [];
      const gruposNormalizados = grupos.map(normalizeGrupo);

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
    verTodos = podeVerTodos,
    filtros?: {
      pesquisa?: string;
      cpf?: string;
      cidade?: string;
      status?: string;
    }
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
    }
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

  function podeEditarSolicitacao() {
    if (!solicitacaoAtual) return false;

    if (!isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Funcionario")) return false;

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
      perfilTipo === "gerencia" &&
      podeAtuarEtapaGerencia
    ) return true;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia Superior") &&
      (perfilTipo === "gerencia superior" || perfilTipo === "gerencia") &&
      podeAtuarEtapaGerenciaSup
    ) return true;

    if (
      isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
      perfilTipo === "diretoria" &&
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
      perfilTipo === "gerencia" &&
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
      (perfilTipo === "gerencia superior" || perfilTipo === "gerencia") &&
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
      perfilTipo === "diretoria" &&
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
        perfilTipo === "gerencia" &&
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia") &&
        podeAtuarEtapaGerencia
      ) {
        parecer = parecerGerenciaTexto;
        acao = parecerFinal === "Reprovado" ? "reprovar" : "aprovar";
      } else if (
        (perfilTipo === "gerencia superior" || perfilTipo === "gerencia") &&
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia Superior") &&
        podeAtuarEtapaGerenciaSup
      ) {
        parecer = parecerGerenciaSupTexto;
        acao = parecerFinal === "Reprovado" ? "reprovar" : "aprovar";
      } else if (
        perfilTipo === "diretoria" &&
        isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
        podeAtuarEtapaDiretoria
      ) {
        parecer = parecerDiretoriaTexto;
        acao = parecerFinal === "Aprovado" ? "aprovar" : "reprovar";

        if (diretoriaCompleto?.ID_FUNCIONARIO) {
          await atualizarDiretoriaSolicitacaoReembolso({
            idSolicitacao: solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA,
            idDiretoria: diretoriaCompleto.ID_FUNCIONARIO,
            nomeDiretoria: diretoriaCompleto.NM_FUNCIONARIO,
          });
        }
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
        buscarDespesas(paginaAtual, pesquisa, nomeResponsavel, podeVerTodos),
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

  return (
    <>
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Digite o nome do funcionário, CPF, andamento ou cidade"
              className="w-full rounded border px-3 py-2"
            />

            <input
              type="text"
              value={filtroCpf}
              onChange={(e) => setFiltroCpf(formatCpfView(e.target.value))}
              placeholder="Filtrar por CPF"
              className="w-full rounded border px-3 py-2"
            />

            <input
              type="text"
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              placeholder="Filtrar por cidade"
              className="w-full rounded border px-3 py-2"
            />

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full rounded border px-3 py-2"
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
              type="button"
              onClick={() => {
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
              className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FaSearch size={12} />
              Buscar
            </button>

            <button
              type="button"
              onClick={limparBusca}
              className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div />
            <button
              type="button"
              onClick={() => router.push("/auth/cadastro_reembolso_despesa")}
              className="inline-flex items-center justify-center gap-2 rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
            >
              <FaPlus size={12} />
              Cadastrar
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-lg border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Nome
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  CPF
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Cidade
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Abertura
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Ida
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Volta
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Status
                </th>
                <th className="border-b px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingBusca ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-500">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                lista.map((item) => (
                  <tr key={item.ID_SOLICITACAO_REEMBOLSO_DESPESA} className="hover:bg-gray-50">
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {primeiroUltimoNome(capitalizeWords(item.NM_FUNCIONARIO))}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {formatCpfView(item.NR_CPF_FUNCIONARIO)}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {capitalizeWords(item.NM_CIDADE)}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {formatDateBR(item.DT_ABERTURA)}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {formatDateBR(item.DT_IDA)}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {formatDateBR(item.DT_VOLTA)}
                    </td>
                    <td className="border-b px-3 py-2 text-sm text-gray-700">
                      {capitalizeWords(item.DESC_ANDAMENTO)}
                    </td>
                    <td className="border-b px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => abrirSolicitacao(item)}
                        className={`rounded px-3 py-1.5 text-xs font-semibold text-white ${item.SN_FINALIZADO ? "bg-green-600" : "bg-blue-600"
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => buscarDespesas(page)}
              className={`rounded px-3 py-1.5 text-sm ${page === paginaAtual
                ? "bg-green-600 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              {page}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <ResumoCard label="Funcionário" value={totais.funcionario} />
          <ResumoCard label="Financeiro" value={totais.financeiro} />
          <ResumoCard label="Gerência" value={totais.gerencia} />
          <ResumoCard label="Gerência Sup." value={totais.gerenciaSup} />
          <ResumoCard label="Diretoria" value={totais.diretoria} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ResumoCard label="Aprovados" value={totais.aprovados} />
          <ResumoCard label="Reprovados" value={totais.reprovados} />
          <ResumoCard label="Total" value={totais.total} />
        </div>
      </div>

      {modalOpen && solicitacaoAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Solicitação #{solicitacaoAtual.ID_SOLICITACAO_REEMBOLSO_DESPESA}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="max-h-[calc(95vh-140px)] overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-9">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Funcionário</label>
                  <input
                    value={solicitacaoAtual.NM_FUNCIONARIO || ""}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">CPF</label>
                  <input
                    value={formatCpfView(solicitacaoAtual.NR_CPF_FUNCIONARIO || "")}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Ida</label>
                  <input
                    value={formatDateBR(solicitacaoAtual.DT_IDA)}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Volta</label>
                  <input
                    value={formatDateBR(solicitacaoAtual.DT_VOLTA)}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cidade</label>
                  <input
                    value={solicitacaoAtual.NM_CIDADE || ""}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Justificativa</label>
                  <textarea
                    value={solicitacaoAtual.DESC_JTF_EVENTO || ""}
                    readOnly
                    rows={3}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nº Banco</label>
                  <input
                    value={solicitacaoAtual.NR_BANCO || ""}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Agência</label>
                  <input
                    value={solicitacaoAtual.CD_AGENCIA || ""}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nº Conta</label>
                  <input
                    value={solicitacaoAtual.NR_CONTA || ""}
                    readOnly
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                <h4 className="mb-4 text-sm font-semibold text-gray-800">Despesas</h4>

                <div className="space-y-4">
                  {(solicitacaoAtual.DESPESAS || solicitacaoAtual.despesas || []).map((despesa: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
                            <input
                              value={capitalizeWords(despesa.TP_DESPESA || "")}
                              readOnly
                              className="w-full rounded border bg-gray-50 px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">Valor</label>
                            <input
                              value={fmtBRL(despesa.VALOR || 0)}
                              readOnly
                              className="w-full rounded border bg-gray-50 px-3 py-2"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!despesa.COMPROVANTE}
                          onClick={() => baixarArquivo(despesa.COMPROVANTE)}
                          className="inline-flex items-center gap-2 rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {despesa.COMPROVANTE
                            ? String(despesa.COMPROVANTE).split(/[/\\]/).pop()
                            : "Sem comprovante"}
                        </button>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Descrição</label>
                        <textarea
                          value={despesa.DESC_DESPESA || ""}
                          readOnly
                          rows={4}
                          className="w-full rounded border bg-gray-50 px-3 py-2"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-[280px]">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Total de Despesas</label>
                      <input
                        value={fmtBRL(
                          (solicitacaoAtual.DESPESAS || solicitacaoAtual.despesas || []).reduce(
                            (acc: number, item: any) => acc + Number(item.VALOR || 0),
                            0
                          )
                        )}
                        readOnly
                        className="w-full rounded border bg-gray-50 px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isAndamento(
                solicitacaoAtual.DESC_ANDAMENTO || "",
                "Pendente Financeiro"
              ) &&
                isFinanceiroAD && (
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Parecer Financeiro
                    </label>
                    <select
                      value={parecerFinanceiroSelect}
                      onChange={(e) => setParecerFinanceiroSelect(e.target.value)}
                      className="w-full rounded border px-3 py-2"
                    >
                      <option value="">Selecione</option>
                      <option value="Solicitação Divergente">Solicitação Divergente</option>
                      <option value="Solicitação OK">Solicitação OK</option>
                    </select>
                  </div>
                )}

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">
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
                    isFinanceiroAD
                  )}
                  rows={3}
                  className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
                />
              </div>

              {isAndamento(
                solicitacaoAtual.DESC_ANDAMENTO || "",
                "Pendente Financeiro"
              ) &&
                isFinanceiroAD && (
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Financeiro
                    </label>
                    <input
                      value={solicitacaoAtual.NM_FNC_FINANCEIRO || ""}
                      readOnly
                      className="w-full rounded border bg-gray-50 px-3 py-2"
                    />
                  </div>
                )}

              {!!solicitacaoAtual.HAS_GERENCIA && (
                <>
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Parecer Gerência
                    </label>
                    <textarea
                      value={parecerGerenciaTexto}
                      onChange={(e) => setParecerGerenciaTexto(e.target.value)}
                      disabled={!(
                        solicitacaoAtual.DESC_ANDAMENTO === "Pendente Gerencia" &&
                        perfilTipo === "gerencia" &&
                        podeAtuarEtapaGerencia
                      )}
                      rows={3}
                      className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Gerência</label>
                    <input
                      value={
                        solicitacaoAtual.APROV_GERENCIA_NOME ||
                        solicitacaoAtual.NM_FNC_GERENCIA ||
                        ""
                      }
                      readOnly
                      className="w-full rounded border bg-gray-50 px-3 py-2"
                    />
                  </div>
                </>
              )}

              {!!solicitacaoAtual.HAS_GERENCIA_SUP && (
                <>
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Parecer Gerência Superior
                    </label>
                    <textarea
                      value={parecerGerenciaSupTexto}
                      onChange={(e) => setParecerGerenciaSupTexto(e.target.value)}
                      disabled={!(
                        solicitacaoAtual.DESC_ANDAMENTO === "Pendente Gerencia Superior" &&
                        (perfilTipo === "gerencia superior" || perfilTipo === "gerencia") &&
                        podeAtuarEtapaGerenciaSup
                      )}
                      rows={3}
                      className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Gerência Superior
                    </label>
                    <input
                      value={
                        solicitacaoAtual.APROV_GERENCIA_SUP_NOME ||
                        solicitacaoAtual.NM_FNC_GERENCIA_SUP ||
                        ""
                      }
                      readOnly
                      className="w-full rounded border bg-gray-50 px-3 py-2"
                    />
                  </div>
                </>
              )}

              <div className="mt-5">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Parecer Diretoria
                </label>
                <textarea
                  value={parecerDiretoriaTexto}
                  onChange={(e) => setParecerDiretoriaTexto(e.target.value)}
                  disabled={!(
                    solicitacaoAtual.DESC_ANDAMENTO === "Pendente Diretoria" &&
                    perfilTipo === "diretoria" &&
                    podeAtuarEtapaDiretoria
                  )}
                  rows={3}
                  className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
                />
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">Diretoria</label>
                <input
                  value={solicitacaoAtual.NM_FNC_DIRETORIA || ""}
                  readOnly
                  className="w-full rounded border bg-gray-50 px-3 py-2"
                />
              </div>

              {((isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Gerencia") &&
                perfilTipo === "gerencia" &&
                podeAtuarEtapaGerencia) ||
                (isAndamento(
                  solicitacaoAtual.DESC_ANDAMENTO || "",
                  "Pendente Gerencia Superior"
                ) &&
                  (perfilTipo === "gerencia superior" || perfilTipo === "gerencia") &&
                  podeAtuarEtapaGerenciaSup) ||
                (isAndamento(solicitacaoAtual.DESC_ANDAMENTO || "", "Pendente Diretoria") &&
                  perfilTipo === "diretoria" &&
                  podeAtuarEtapaDiretoria)) && (
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Parecer Final
                    </label>
                    <select
                      value={parecerFinal}
                      onChange={(e) => setParecerFinal(e.target.value)}
                      className="w-full rounded border px-3 py-2"
                    >
                      <option value="">Selecione</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Reprovado">Reprovado</option>
                    </select>
                  </div>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t px-5 py-4">
              <button
                type="button"
                disabled={!podeConcluir() || saving}
                onClick={concluirSolicitacaoAtual}
                className="inline-flex items-center gap-2 rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaCheck size={12} />
                Concluído
              </button>

              <button
                type="button"
                disabled={!podeGerarRelatorio()}
                onClick={imprimirSolicitacao}
                className="inline-flex items-center gap-2 rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaEdit size={12} />
                Editar Solicitação
              </button>

              <button
                type="button"
                disabled={!podeSalvarParecer() || saving}
                onClick={salvarParecer}
                className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave size={12} />
                Salvar
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

