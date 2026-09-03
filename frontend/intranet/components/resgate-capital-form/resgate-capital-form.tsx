"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaPrint, FaSearch, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import {
  fmtBRL,
  formatCpfView,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
  formatCpfCnpjView,
  onlyCpfCnpjChars,
} from "@/utils/br";
import {
  buscarAutorizacoesResgate,
  buscarCidadesResgate,
  buscarDiaUtil,
  buscarEmprestimosPorCpf,
  buscarIdAssociado,
  buscarMotivosResgate,
  criarCartaoCredito,
  criarContaCorrente,
  criarContaDeposito,
  criarEmprestimo,
  criarParcela,
  criarResgate,
  type AutorizacaoResgateItem,
  type CidadeResgateItem,
  type EmprestimoAssociadoItem,
  type MotivoResgateItem,
} from "@/services/resgate_capital.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { gerarPdfResgateCapital } from "@/lib/pdf/gerarPdfResgateCapital";
import { getMeAdUser } from "@/services/auth.service";

type EmprestimoItem = {
  id: string;
  tipo: string;
  contrato: string;
  saldoDevedor: string;
  amortizacao: string;
};

type ParcelaItem = {
  id: string;
  numero: number;
  data: string;
  valor: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function addMonthsSafe(dateISO: string, months: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function buildEmprestimo(): EmprestimoItem {
  return {
    id: uid(),
    tipo: "",
    contrato: "",
    saldoDevedor: "",
    amortizacao: "",
  };
}

function isCnpj(value: string) {
  return onlyCpfCnpjChars(value).length === 14;
}

function capitalizeWords(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeCidade(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const LIMITS = {
  NR_CPF_CNPJ: 14,
  NM_CLIENTE: 100,
  CD_MATRICULA: 30,
  NM_EMPRESA: 150,
  DESC_MOTIVO: 200,
  NM_AUTORIZADO: 50,
  NM_ATENDENTE: 100,
  NM_CIDADE: 30,
  DESC_TIPO_EMPRESTIMO: 60,
  NR_CONTRATO_EMPRESTIMO: 15,
  NR_CARTAO: 16,
  NR_CONTA: 20,
  CD_BANCO: 4,
  CD_AGENCIA: 7,
  CD_CONTA_CORRENTE_DEPOSITO: 20,
};

function limitText(value: string, max: number) {
  return String(value || "").slice(0, max);
}

export function ResgateCapitalForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [empresa, setEmpresa] = useState("");

  const [saldoCapitalAtual, setSaldoCapitalAtual] = useState("");
  const [saldoCapitalFonte, setSaldoCapitalFonte] = useState(0);
  const [secMotivo, setSecMotivo] = useState("");
  const [secAutorizado, setSecAutorizado] = useState("");

  const [motivos, setMotivos] = useState<MotivoResgateItem[]>([]);
  const [autorizacoes, setAutorizacoes] = useState<AutorizacaoResgateItem[]>([]);
  const [cidades, setCidades] = useState<CidadeResgateItem[]>([]);

  const [radioEmprestimo, setRadioEmprestimo] = useState<"Sim" | "Nao">("Nao");
  const [emprestimos, setEmprestimos] = useState<EmprestimoItem[]>([
    buildEmprestimo(),
  ]);

  const [radioConta, setRadioConta] = useState<"Sim" | "Nao">("Nao");
  const [numeroContaCorrente, setNumeroContaCorrente] = useState("");
  const [saldoDevedorConta, setSaldoDevedorConta] = useState("");
  const [amortizacaoConta, setAmortizacaoConta] = useState("");

  const [numeroCartao, setNumeroCartao] = useState("");
  const [saldoCartao, setSaldoCartao] = useState("");
  const [amortizacaoCartao, setAmortizacaoCartao] = useState("");

  const [saldoCreditadoConta, setSaldoCreditadoConta] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [digito, setDigito] = useState("");

  const [valorPrimeiraParcela, setValorPrimeiraParcela] = useState("");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);

  const [secCidade, setSecCidade] = useState("");
  const [diaAtendimento] = useState(hojeISO());

  const [loadingTela, setLoadingTela] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingImprimir, setLoadingImprimir] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [nomeAtendente, setNomeAtendente] = useState("ATENDENTE");
  const [hashFormularioSalvo, setHashFormularioSalvo] = useState("");

  const { loading, erro: erroBusca, info: infoBusca, buscar } = useAssociadoPorCpf();

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    async function carregarAtendenteLogado() {
      try {
        const me = await getMeAdUser();
        const nome = String(me?.nome_completo || me?.username || "").trim();
        if (nome) setNomeAtendente(nome);
      } catch {
        // Mantém fallback "ATENDENTE"
      }
    }

    carregarAtendenteLogado();
  }, []);

  async function carregarDadosIniciais() {
    try {
      setLoadingTela(true);
      setErro("");

      const [motivosRes, autorizacoesRes, cidadesRes] = await Promise.all([
        buscarMotivosResgate(),
        buscarAutorizacoesResgate(),
        buscarCidadesResgate(),
      ]);

      setMotivos(
        (motivosRes || []).filter((item) => Number(item.SN_ATIVO ?? 1) === 1)
      );

      setAutorizacoes(
        (autorizacoesRes || []).filter((item) => Number(item.SN_ATIVO ?? 1) === 1)
      );

      setCidades(cidadesRes || []);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Falha ao carregar os dados iniciais."
      );
    } finally {
      setLoadingTela(false);
    }
  }

  const totalSaldoEmprestimo = useMemo(() => {
    if (radioEmprestimo !== "Sim") return 0;

    return emprestimos.reduce((acc, item) => {
      return acc + parseBRL(item.saldoDevedor);
    }, 0);
  }, [emprestimos, radioEmprestimo]);

  const totalAmortizacaoEmprestimo = useMemo(() => {
    if (radioEmprestimo !== "Sim") return 0;

    return emprestimos.reduce((acc, item) => {
      return acc + parseBRL(item.amortizacao);
    }, 0);
  }, [emprestimos, radioEmprestimo]);

  const totalAmortizacaoConta = useMemo(() => {
    if (radioConta !== "Sim") return 0;
    return parseBRL(amortizacaoConta) + parseBRL(amortizacaoCartao);
  }, [radioConta, amortizacaoConta, amortizacaoCartao]);

  const totalResgateCapital = useMemo(() => {
    return (
      totalAmortizacaoEmprestimo +
      totalAmortizacaoConta +
      parseBRL(saldoCreditadoConta)
    );
  }, [totalAmortizacaoEmprestimo, totalAmortizacaoConta, saldoCreditadoConta]);

  const capitalRestante = useMemo(() => {
    return saldoCapitalFonte - totalResgateCapital;
  }, [saldoCapitalFonte, totalResgateCapital]);

  const totalParcelado = useMemo(() => {
    return parcelas.reduce((acc, item) => acc + parseBRL(item.valor), 0);
  }, [parcelas]);

  const hashFormularioAtual = useMemo(
    () =>
      JSON.stringify({
        cpf,
        nome,
        matricula,
        empresa,
        saldoCapitalAtual,
        secMotivo,
        secAutorizado,
        radioEmprestimo,
        emprestimos,
        radioConta,
        numeroContaCorrente,
        saldoDevedorConta,
        amortizacaoConta,
        numeroCartao,
        saldoCartao,
        amortizacaoCartao,
        saldoCreditadoConta,
        banco,
        agencia,
        conta,
        digito,
        valorPrimeiraParcela,
        dataPrimeiraParcela,
        parcelas,
        secCidade,
      }),
    [
      cpf,
      nome,
      matricula,
      empresa,
      saldoCapitalAtual,
      secMotivo,
      secAutorizado,
      radioEmprestimo,
      emprestimos,
      radioConta,
      numeroContaCorrente,
      saldoDevedorConta,
      amortizacaoConta,
      numeroCartao,
      saldoCartao,
      amortizacaoCartao,
      saldoCreditadoConta,
      banco,
      agencia,
      conta,
      digito,
      valorPrimeiraParcela,
      dataPrimeiraParcela,
      parcelas,
      secCidade,
    ]
  );

  const podeImprimir =
    hashFormularioSalvo !== "" && hashFormularioSalvo === hashFormularioAtual;

  function limparBlocosDebito() {
    setRadioEmprestimo("Nao");
    setEmprestimos([buildEmprestimo()]);

    setRadioConta("Nao");
    setNumeroContaCorrente("");
    setSaldoDevedorConta("");
    setAmortizacaoConta("");
    setNumeroCartao("");
    setSaldoCartao("");
    setAmortizacaoCartao("");
  }

  function desativarEmprestimos() {
    setRadioEmprestimo("Nao");
    setEmprestimos([buildEmprestimo()]);
  }

  function desativarDebitosConta() {
    setRadioConta("Nao");
    setNumeroContaCorrente("");
    setSaldoDevedorConta("");
    setAmortizacaoConta("");
    setNumeroCartao("");
    setSaldoCartao("");
    setAmortizacaoCartao("");
  }

  async function onBuscar() {
    try {
      setErro("");
      setInfo("");
      setHashFormularioSalvo("");

      const r = await buscar(cpf);

      if (r.found) {
        setNome(limitText(r.data.nome || "", LIMITS.NM_CLIENTE));
        setMatricula(limitText(r.data.matricula || "", LIMITS.CD_MATRICULA));
        setEmpresa(limitText(r.data.empresa || "", LIMITS.NM_EMPRESA));

        const saldoRaw: any = (r.data as any).saldo_capital;
        const saldoNumerico =
          typeof saldoRaw === "number"
            ? saldoRaw
            : Number.isFinite(Number(saldoRaw))
              ? Number(saldoRaw)
              : parseBRL(String(saldoRaw || ""));

        setSaldoCapitalAtual(fmtBRL(saldoNumerico));
        setSaldoCapitalFonte(saldoNumerico);
        limparBlocosDebito();

        const cidadeAssociado = String((r.data as any).cidade || "").trim();
        if (cidadeAssociado) {
          const encontrada = cidades.find(
            (c) => normalizeCidade(c.NM_CIDADE) === normalizeCidade(cidadeAssociado)
          );
          if (encontrada?.NM_CIDADE) {
            setSecCidade(encontrada.NM_CIDADE);
          }
        }

        setInfo("Associado carregado com sucesso.");
      }
    } catch (e) {
      console.error(e);
      setErro("Falha ao buscar associado.");
    }
  }

  async function carregarEmprestimosAutomaticos() {
    try {
      const lista = await buscarEmprestimosPorCpf(cpf);

      const listaValida = (lista || []).filter((item: EmprestimoAssociadoItem) => {
        const tipo = String(item.DESC_TIPO || "").trim();
        const contrato = String(item.NR_CONTRATO || "").trim();

        // Ignora linhas "placeholder" com apenas SALDODEVEDORDIA.
        // Para entrar como empréstimo automático, precisa existir tipo/contrato real.
        return tipo !== "" || contrato !== "";
      });

      if (listaValida.length === 0) {
        setRadioEmprestimo("Nao");
        setEmprestimos([buildEmprestimo()]);
        return;
      }

      const mapeados: EmprestimoItem[] = listaValida.map((item: EmprestimoAssociadoItem) => ({
        id: uid(),
        tipo: item.DESC_TIPO || "",
        contrato: item.NR_CONTRATO || "",
        saldoDevedor: fmtBRL(Number(item.SALDODEVEDORDIA || 0)),
        amortizacao: "",
      }));

      setRadioEmprestimo("Sim");
      setEmprestimos(mapeados.length ? mapeados : [buildEmprestimo()]);
    } catch (e) {
      console.error(e);
    }
  }

  function limparFormulario() {
    setCpf("");
    setNome("");
    setMatricula("");
    setEmpresa("");
    setSaldoCapitalAtual("");
    setSaldoCapitalFonte(0);
    setSecMotivo("");
    setSecAutorizado("");

    setRadioEmprestimo("Nao");
    setEmprestimos([buildEmprestimo()]);

    setRadioConta("Nao");
    setNumeroContaCorrente("");
    setSaldoDevedorConta("");
    setAmortizacaoConta("");
    setNumeroCartao("");
    setSaldoCartao("");
    setAmortizacaoCartao("");

    setSaldoCreditadoConta("");
    setBanco("");
    setAgencia("");
    setConta("");
    setDigito("");

    setValorPrimeiraParcela("");
    setDataPrimeiraParcela("");
    setParcelas([]);

    setSecCidade("");
    setErro("");
    setInfo("");
    setHashFormularioSalvo("");
  }

  function updateEmprestimo(
    id: string,
    field: keyof EmprestimoItem,
    value: string
  ) {
    let nextValue = value;
    if (field === "tipo") {
      nextValue = limitText(nextValue, LIMITS.DESC_TIPO_EMPRESTIMO);
    }
    if (field === "contrato") {
      nextValue = limitText(nextValue, LIMITS.NR_CONTRATO_EMPRESTIMO);
    }

    setEmprestimos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: nextValue } : item))
    );
  }

  function adicionarEmprestimo() {
    setEmprestimos((prev) => [...prev, buildEmprestimo()]);
  }

  function removerEmprestimo() {
    setEmprestimos((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }

  function limparParcelas() {
    setParcelas([]);
  }

  async function validarDataUtil(data: string) {
    try {
      const response = await buscarDiaUtil(data);
      return Boolean(response?.diaUtil);
    } catch (e) {
      console.error(e);
      return true;
    }
  }

  async function validarCamposParcelas() {
    if (!saldoCreditadoConta || parseBRL(saldoCreditadoConta) <= 0) {
      setErro("Preencha o saldo a ser creditado em conta.");
      return false;
    }

    if (!valorPrimeiraParcela || parseBRL(valorPrimeiraParcela) <= 0) {
      setErro("Preencha o valor da primeira parcela.");
      return false;
    }

    if (!dataPrimeiraParcela) {
      setErro("Preencha a data da primeira parcela.");
      return false;
    }

    if (parseBRL(valorPrimeiraParcela) > parseBRL(saldoCreditadoConta)) {
      setErro("O valor da primeira parcela não pode ser maior que o valor total a receber.");
      return false;
    }

    const diaUtil = await validarDataUtil(dataPrimeiraParcela);

    if (!diaUtil) {
      setErro("A data da primeira parcela deve ser um dia útil.");
      return false;
    }

    return true;
  }

  async function gerarParcelas(quantidade: number) {
    const valido = await validarCamposParcelas();
    if (!valido) return;

    setErro("");
    setInfo("");

    const valorTotal = parseBRL(saldoCreditadoConta);
    const valorPrimeiro = parseBRL(valorPrimeiraParcela);

    const novasParcelas: ParcelaItem[] = [];
    let soma = 0;

    for (let i = 0; i < quantidade; i++) {
      const data = addMonthsSafe(dataPrimeiraParcela, i);

      const ehDiaUtil = await validarDataUtil(data);
      if (!ehDiaUtil) {
      }

      let valor = 0;

      if (i === 0) {
        valor = valorPrimeiro;
      } else if (quantidade === 1) {
        valor = valorPrimeiro;
      } else {
        valor = (valorTotal - valorPrimeiro) / (quantidade - 1);
      }

      valor = Number(valor.toFixed(2));
      soma += valor;

      if (i === quantidade - 1) {
        const diferenca = Number((valorTotal - soma).toFixed(2));
        valor = Number((valor + diferenca).toFixed(2));
      }

      novasParcelas.push({
        id: uid(),
        numero: i + 1,
        data,
        valor: fmtBRL(valor),
      });
    }

    setParcelas(novasParcelas);
    setInfo("Parcelas atualizadas com sucesso.");
  }

  async function adicionarParcela() {
    const proximaQtd = parcelas.length === 0 ? 1 : parcelas.length + 1;
    await gerarParcelas(proximaQtd);
  }

  async function removerParcela() {
    if (parcelas.length <= 1) {
      setParcelas([]);
      return;
    }

    await gerarParcelas(parcelas.length - 1);
  }

  function validarFormulario() {
    if (!cpf.trim()) {
      setErro("Preencha o CPF/CNPJ do associado.");
      return false;
    }

    if (!nome.trim()) {
      setErro("Preencha o nome do associado.");
      return false;
    }

    if (nome.trim().length > LIMITS.NM_CLIENTE) {
      setErro(`Nome do associado deve ter no máximo ${LIMITS.NM_CLIENTE} caracteres.`);
      return false;
    }

    if (matricula.trim().length > LIMITS.CD_MATRICULA) {
      setErro(`Matrícula deve ter no máximo ${LIMITS.CD_MATRICULA} caracteres.`);
      return false;
    }

    if (empresa.trim().length > LIMITS.NM_EMPRESA) {
      setErro(`Empresa deve ter no máximo ${LIMITS.NM_EMPRESA} caracteres.`);
      return false;
    }

    if (onlyCpfCnpjChars(cpf).length > LIMITS.NR_CPF_CNPJ) {
      setErro(`CPF/CNPJ deve ter no máximo ${LIMITS.NR_CPF_CNPJ} caracteres.`);
      return false;
    }

    if (!saldoCapitalAtual || saldoCapitalFonte <= 0) {
      setErro("Não foi possível validar o saldo de capital do associado. Pesquise novamente.");
      return false;
    }

    if (Math.abs(parseBRL(saldoCapitalAtual) - saldoCapitalFonte) > 0.009) {
      setErro(
        "O saldo de capital foi alterado após a consulta. Pesquise o associado novamente."
      );
      return false;
    }

    if (!secMotivo) {
      setErro("Selecione o motivo.");
      return false;
    }

    if (!secAutorizado) {
      setErro("Selecione a autorização.");
      return false;
    }

    if (secMotivo.trim().length > LIMITS.DESC_MOTIVO) {
      setErro(`Motivo deve ter no máximo ${LIMITS.DESC_MOTIVO} caracteres.`);
      return false;
    }

    if (secAutorizado.trim().length > LIMITS.NM_AUTORIZADO) {
      setErro(`Autorizado por deve ter no máximo ${LIMITS.NM_AUTORIZADO} caracteres.`);
      return false;
    }

    if (!secCidade) {
      setErro("Selecione a cidade do atendimento.");
      return false;
    }

    if (secCidade.trim().length > LIMITS.NM_CIDADE) {
      setErro(`Cidade do atendimento deve ter no máximo ${LIMITS.NM_CIDADE} caracteres.`);
      return false;
    }

    if (nomeAtendente.trim().length > LIMITS.NM_ATENDENTE) {
      setErro(`Nome do atendente deve ter no máximo ${LIMITS.NM_ATENDENTE} caracteres.`);
      return false;
    }

    if (radioEmprestimo === "Sim") {
      for (const item of emprestimos) {
        if (item.tipo.trim().length > LIMITS.DESC_TIPO_EMPRESTIMO) {
          setErro(`Tipo de empréstimo deve ter no máximo ${LIMITS.DESC_TIPO_EMPRESTIMO} caracteres.`);
          return false;
        }

        if (item.contrato.trim().length > LIMITS.NR_CONTRATO_EMPRESTIMO) {
          setErro(`Contrato deve ter no máximo ${LIMITS.NR_CONTRATO_EMPRESTIMO} caracteres.`);
          return false;
        }

        const saldoDevedor = parseBRL(item.saldoDevedor);
        const amortizacao = parseBRL(item.amortizacao);

        if (amortizacao < 0 || saldoDevedor < 0) {
          setErro("Os valores do empréstimo não podem ser negativos.");
          return false;
        }

        if (amortizacao > saldoDevedor + 0.009) {
          setErro(
            `A amortização do contrato ${item.contrato || "informado"} não pode ser maior que o saldo devedor.`
          );
          return false;
        }

        if (amortizacao > 0 && (!item.tipo.trim() || !item.contrato.trim())) {
          setErro(
            "Informe o tipo e o contrato de todo empréstimo que possuir valor de amortização."
          );
          return false;
        }
      }
    }

    if (radioConta === "Sim") {
      const saldoCc = parseBRL(saldoDevedorConta);
      const amortizacaoCc = parseBRL(amortizacaoConta);
      const saldoCartaoNum = parseBRL(saldoCartao);
      const amortizacaoCartaoNum = parseBRL(amortizacaoCartao);

      if (amortizacaoCc > saldoCc + 0.009) {
        setErro("A amortização da conta corrente não pode ser maior que o saldo devedor.");
        return false;
      }

      if (amortizacaoCartaoNum > saldoCartaoNum + 0.009) {
        setErro("A amortização do cartão não pode ser maior que o saldo devedor.");
        return false;
      }
    }

    if (totalResgateCapital <= 0) {
      setErro("Informe ao menos um valor para o resgate de capital.");
      return false;
    }

    if (totalResgateCapital >= saldoCapitalFonte - 0.009) {
      setErro(
        `Operação bloqueada: o total utilizado (${fmtBRL(totalResgateCapital)}) deve ser menor que o saldo de capital (${fmtBRL(saldoCapitalFonte)}).`
      );
      return false;
    }

    if (parseBRL(saldoCreditadoConta) > 0) {
      if (!banco.trim()) {
        setErro("Preencha o banco.");
        return false;
      }
      if (banco.trim().length > LIMITS.CD_BANCO) {
        setErro(`Banco deve ter no máximo ${LIMITS.CD_BANCO} caracteres.`);
        return false;
      }

      if (!agencia.trim()) {
        setErro("Preencha a agência.");
        return false;
      }
      if (agencia.trim().length > LIMITS.CD_AGENCIA) {
        setErro(`Agência deve ter no máximo ${LIMITS.CD_AGENCIA} caracteres.`);
        return false;
      }

      if (!conta.trim()) {
        setErro("Preencha a conta corrente.");
        return false;
      }
      if (conta.trim().length > LIMITS.CD_CONTA_CORRENTE_DEPOSITO) {
        setErro(`Conta corrente deve ter no máximo ${LIMITS.CD_CONTA_CORRENTE_DEPOSITO} caracteres.`);
        return false;
      }

      if (!digito.trim()) {
        setErro("Preencha o dígito.");
        return false;
      }

      const contaComDigito = `${conta.trim()}-${digito.trim()}`;
      if (contaComDigito.length > LIMITS.CD_CONTA_CORRENTE_DEPOSITO) {
        setErro(
          `Conta corrente + dígito deve ter no máximo ${LIMITS.CD_CONTA_CORRENTE_DEPOSITO} caracteres.`
        );
        return false;
      }

      if (parcelas.length === 0) {
        setErro("Adicione ao menos uma parcela.");
        return false;
      }

      if (Math.abs(totalParcelado - parseBRL(saldoCreditadoConta)) > 0.01) {
        setErro(
          `O total das parcelas (${fmtBRL(totalParcelado)}) deve ser igual ao saldo a ser creditado (${fmtBRL(parseBRL(saldoCreditadoConta))}). Gere as parcelas novamente.`
        );
        return false;
      }
    } else if (parcelas.length > 0) {
      setErro("Existem parcelas geradas sem valor a ser creditado. Limpe as parcelas.");
      return false;
    }

    return true;
  }

  async function salvarFormulario() {
    if (!validarFormulario()) return;

    try {
      setLoadingSalvar(true);
      setErro("");
      setInfo("");

      const associadoIdResponse = await buscarIdAssociado(cpf);
      const idCliente =
        associadoIdResponse.found === true ? associadoIdResponse.ID_CLIENTE : null;

      const resgate = await criarResgate({
        ID_CLIENTE: idCliente,
        NR_CPF_CNPJ: onlyDigits(cpf).slice(0, LIMITS.NR_CPF_CNPJ),
        NM_CLIENTE: limitText(nome, LIMITS.NM_CLIENTE),
        CD_MATRICULA: limitText(matricula, LIMITS.CD_MATRICULA) || null,
        NM_EMPRESA: limitText(empresa, LIMITS.NM_EMPRESA) || null,
        DESC_MOTIVO: limitText(secMotivo, LIMITS.DESC_MOTIVO),
        NM_AUTORIZADO: limitText(secAutorizado, LIMITS.NM_AUTORIZADO),
        VL_CAPITAL_ATUAL: saldoCapitalFonte,
        VL_CAPITAL_AMORTIZACAO: totalResgateCapital,
        VL_SALDO_RESTANTE: capitalRestante,
        DT_CARENCIA: "2000-01-01",
        DT_RESGATE_PARCIAL_CAPITAL: diaAtendimento,
        NM_ATENDENTE: limitText(nomeAtendente, LIMITS.NM_ATENDENTE),
        NM_CIDADE: limitText(secCidade, LIMITS.NM_CIDADE),
      });

      const idResgate = resgate.ID_RESGATE_PARCIAL_CAPITAL;

      if (radioEmprestimo === "Sim") {
        for (const item of emprestimos) {
          const saldo = parseBRL(item.saldoDevedor);
          const amortizacao = parseBRL(item.amortizacao);

          if (!item.tipo && !item.contrato && saldo <= 0 && amortizacao <= 0) {
            continue;
          }

          await criarEmprestimo({
            ID_RESGATE: idResgate,
            DESC_TIPO: limitText(item.tipo, LIMITS.DESC_TIPO_EMPRESTIMO),
            NR_CONTRATO: limitText(item.contrato, LIMITS.NR_CONTRATO_EMPRESTIMO),
            VL_SALDO_DEVEDOR: saldo,
            VL_SALDO_AMORTIZADO: amortizacao,
          });
        }
      }

      if (radioConta === "Sim" && numeroContaCorrente.trim()) {
        await criarContaCorrente({
          NR_CONTA: limitText(numeroContaCorrente, LIMITS.NR_CONTA),
          VL_SALDO_DEVEDOR: parseBRL(saldoDevedorConta),
          VL_SALDO_AMORTIZADO: parseBRL(amortizacaoConta),
          ID_RESGATE: idResgate,
        });
      }

      if (radioConta === "Sim" && numeroCartao.trim()) {
        await criarCartaoCredito({
          NR_CARTAO: onlyDigits(numeroCartao).slice(0, LIMITS.NR_CARTAO),
          VL_SALDO_DEVEDOR: parseBRL(saldoCartao),
          VL_SALDO_AMORTIZADO: parseBRL(amortizacaoCartao),
          ID_RESGATE: idResgate,
        });
      }

      let idContaDeposito: number | null = null;

      if (parseBRL(saldoCreditadoConta) > 0) {
        const contaComDigito = `${conta.trim()}-${digito.trim()}`;
        const contaDeposito = await criarContaDeposito({
          CD_BANCO: limitText(banco, LIMITS.CD_BANCO),
          CD_AGENCIA: limitText(agencia, LIMITS.CD_AGENCIA),
          CD_CONTA_CORRENTE: limitText(
            contaComDigito,
            LIMITS.CD_CONTA_CORRENTE_DEPOSITO
          ),
        });

        idContaDeposito = contaDeposito.ID_CONTA_DEPOSITO_RESGATE;
      }

      if (idContaDeposito && parcelas.length > 0) {
        for (const parcela of parcelas) {
          await criarParcela({
            DT_PARCELA: parcela.data,
            DT_PAGAMENTO: null,
            SN_PAGO: 0,
            VL_PARCELA_RESGATE: parseBRL(parcela.valor),
            NM_ATENDENTE: nomeAtendente,
            ID_RESGATE: idResgate,
            ID_CONTA_DEPOSITO: idContaDeposito,
          });
        }
      }

      setHashFormularioSalvo(hashFormularioAtual);
      setInfo("Resgate salvo com sucesso. Agora você pode imprimir.");
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Não foi possível salvar o resgate."
      );
    } finally {
      setLoadingSalvar(false);
    }
  }

  async function imprimirFormulario() {
    if (!podeImprimir) {
      setErro("Salve novamente antes de imprimir. O formulário foi alterado.");
      return;
    }

    try {
      setLoadingImprimir(true);
      setErro("");
      setInfo("");

      await gerarPdfResgateCapital(
        {
          cpfCnpj: formatCpfCnpjView(cpf),
          nome,
          matricula,
          empresa,
          motivo: secMotivo,
          autorizadoPor: secAutorizado,
          saldoCapitalAtual: saldoCapitalFonte,
          totalResgateCapital,
          saldoCapitalRestante: capitalRestante,
          emprestimos:
            radioEmprestimo === "Sim"
              ? emprestimos.map((item) => ({
                  tipo: item.tipo,
                  contrato: item.contrato,
                  saldoDevedor: parseBRL(item.saldoDevedor),
                  amortizacao: parseBRL(item.amortizacao),
                }))
              : [],
          contaCorrenteNumero: radioConta === "Sim" ? numeroContaCorrente : "",
          contaCorrenteSaldo:
            radioConta === "Sim" ? parseBRL(saldoDevedorConta) : 0,
          contaCorrenteAmortizacao:
            radioConta === "Sim" ? parseBRL(amortizacaoConta) : 0,
          cartaoNumero: radioConta === "Sim" ? numeroCartao : "",
          cartaoSaldo: radioConta === "Sim" ? parseBRL(saldoCartao) : 0,
          cartaoAmortizacao:
            radioConta === "Sim" ? parseBRL(amortizacaoCartao) : 0,
          saldoCreditadoConta: parseBRL(saldoCreditadoConta),
          banco,
          agencia,
          conta,
          digito,
          valorPrimeiraParcela: parseBRL(valorPrimeiraParcela),
          dataPrimeiraParcela,
          parcelas: parcelas.map((item) => ({
            numero: item.numero,
            data: item.data,
            valor: parseBRL(item.valor),
          })),
          totalParcelado,
          cidadeAtendimento: secCidade,
          dataAtendimento: diaAtendimento,
          atendente: nomeAtendente,
        },
        {
          acao: "download",
          nomeArquivo: `resgate_capital_${onlyCpfCnpjChars(cpf) || "associado"}.pdf`,
        }
      );

      setInfo("PDF gerado e baixado com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro(e?.message || "Não foi possível gerar o PDF para impressão.");
    } finally {
      setLoadingImprimir(false);
    }
  }

  const labelClass =
    "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";
  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
  const readOnlyClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 shadow-sm outline-none";
  const moneyInputClass = `${inputClass} text-right`;
  const readOnlyMoneyClass = `${readOnlyClass} text-right`;
  const sectionClass =
    "mx-5 mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const sectionTitleClass =
    "mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary";
  const radioClass =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5";

  return (
    <div className="min-w-0 mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white pb-5 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />
      <SearchForm
        onSearch={onBuscar}
        className="border-b border-slate-100 bg-white p-5"
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className={labelClass}>
              CPF/CNPJ do associado(a)
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <SearchInput
                value={formatCpfCnpjView(cpf)}
                onChange={(e) => setCpf(onlyCpfCnpjChars(e.target.value).slice(0, 14))}
                placeholder="Digite o CPF/CNPJ"
                className="h-10 rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary focus:ring-primary/10"
                maxLength={18}
              />

              <SearchButton loading={loading} label="Pesquisar" />

              <button
                type="button"
                onClick={limparFormulario}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
              >
                <FaTimes />
                Limpar
              </button>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={salvarFormulario}
              disabled={loadingSalvar || loadingTela}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth lg:w-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {loadingSalvar ? "Salvando..." : "Salvar"}
            </button>

            {podeImprimir && (
              <button
                type="button"
                onClick={imprimirFormulario}
                disabled={loadingImprimir || loadingTela}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary lg:w-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaPrint />
                {loadingImprimir ? "Gerando..." : "Baixar PDF"}
              </button>
            )}
          </div>
        </div>

        {(erro || info || erroBusca || infoBusca) && (
          <div className="mt-4">
            {erro || erroBusca ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {erro || erroBusca}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {info || infoBusca}
              </div>
            )}
          </div>
        )}
      </SearchForm>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Dados do associado</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>
            Nome do associado(a)
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(limitText(e.target.value, LIMITS.NM_CLIENTE))}
            maxLength={LIMITS.NM_CLIENTE}
            className={inputClass}
          />
        </div>

        {!isCnpj(cpf) && (
          <div>
            <label className={labelClass}>
              Matrícula
            </label>
            <input
              value={matricula}
              onChange={(e) =>
                setMatricula(limitText(e.target.value, LIMITS.CD_MATRICULA))
              }
              maxLength={LIMITS.CD_MATRICULA}
              className={inputClass}
            />
          </div>
        )}

        {!isCnpj(cpf) && (
          <div className="md:col-span-2">
            <label className={labelClass}>
              Empresa
            </label>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(limitText(e.target.value, LIMITS.NM_EMPRESA))}
              maxLength={LIMITS.NM_EMPRESA}
              className={inputClass}
            />
          </div>
        )}
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Dados do resgate</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className={labelClass}>
            Saldo de capital atual
          </label>
          <input
            value={saldoCapitalAtual}
            readOnly
            className={readOnlyMoneyClass}
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className={labelClass}>
            Motivo
          </label>
          <select
            value={secMotivo}
            onChange={(e) => setSecMotivo(e.target.value)}
            className={inputClass}
          >
            <option value=""></option>
            {motivos.map((item) => (
              <option key={item.ID_MOTIVO_RESGATE || item.NM_MOTIVO} value={item.NM_MOTIVO}>
                {String(item.NM_MOTIVO).toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Autorizado por
          </label>
          <select
            value={secAutorizado}
            onChange={(e) => setSecAutorizado(e.target.value)}
            className={inputClass}
          >
            <option value=""></option>
            {autorizacoes.map((item) => (
              <option
                key={item.ID_AUTORIZACAO_RESGATE || item.NM_AUTORIZADO}
                value={item.NM_AUTORIZADO}
              >
                {String(item.NM_AUTORIZADO).toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      <div className={sectionClass}>
        <label className={labelClass}>
          Amortização de empréstimo(s)?
        </label>

        <div className="flex gap-6">
          <label className={radioClass}>
            <input
              type="radio"
              checked={radioEmprestimo === "Sim"}
              onChange={() => setRadioEmprestimo("Sim")}
            />
            Sim
          </label>

          <label className={radioClass}>
            <input
              type="radio"
              checked={radioEmprestimo === "Nao"}
              onChange={desativarEmprestimos}
            />
            Não
          </label>
        </div>

        {radioEmprestimo === "Sim" && (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={adicionarEmprestimo}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white cursor-pointer"
              >
                <FaPlus />
                Adicionar empréstimo
              </button>

              <button
                type="button"
                onClick={removerEmprestimo}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-fourth/30 bg-fourth/10 px-4 text-sm font-semibold text-fourth shadow-sm transition hover:bg-fourth hover:text-white cursor-pointer"
              >
                <FaTrash />
                Remover empréstimo
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Tipo de empréstimo
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Contrato
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Saldo devedor
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Amortização de capital
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {emprestimos.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <input
                          value={item.tipo}
                          onChange={(e) =>
                            updateEmprestimo(item.id, "tipo", e.target.value)
                          }
                          maxLength={LIMITS.DESC_TIPO_EMPRESTIMO}
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={item.contrato}
                          onChange={(e) =>
                            updateEmprestimo(item.id, "contrato", e.target.value)
                          }
                          maxLength={LIMITS.NR_CONTRATO_EMPRESTIMO}
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={item.saldoDevedor}
                          onChange={(e) =>
                            updateEmprestimo(
                              item.id,
                              "saldoDevedor",
                              monetizarDigitacao(e.target.value)
                            )
                          }
                          className={moneyInputClass}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={item.amortizacao}
                          onChange={(e) =>
                            updateEmprestimo(
                              item.id,
                              "amortizacao",
                              monetizarDigitacao(e.target.value)
                            )
                          }
                          className={moneyInputClass}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl border border-[#00AE9D]/15 bg-[#00AE9D]/5 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Total do saldo devedor
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalSaldoEmprestimo)}
                  className={readOnlyMoneyClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Total da amortização de capital
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalAmortizacaoEmprestimo)}
                  className={readOnlyMoneyClass}
                />
              </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={sectionClass}>
        <label className={labelClass}>
          Amortização de débito(s) em conta?
        </label>

        <div className="flex gap-6">
          <label className={radioClass}>
            <input
              type="radio"
              checked={radioConta === "Sim"}
              onChange={() => setRadioConta("Sim")}
            />
            Sim
          </label>

          <label className={radioClass}>
            <input
              type="radio"
              checked={radioConta === "Nao"}
              onChange={desativarDebitosConta}
            />
            Não
          </label>
        </div>

        {radioConta === "Sim" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>
                Nº C. Corrente
              </label>
              <input
                value={numeroContaCorrente}
                onChange={(e) =>
                  setNumeroContaCorrente(limitText(e.target.value, LIMITS.NR_CONTA))
                }
                maxLength={LIMITS.NR_CONTA}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Saldo devedor
              </label>
              <input
                value={saldoDevedorConta}
                onChange={(e) => setSaldoDevedorConta(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Amortização
              </label>
              <input
                value={amortizacaoConta}
                onChange={(e) => setAmortizacaoConta(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Cartão de crédito
              </label>
              <input
                value={numeroCartao}
                onChange={(e) =>
                  setNumeroCartao(onlyDigits(e.target.value).slice(0, LIMITS.NR_CARTAO))
                }
                inputMode="numeric"
                maxLength={LIMITS.NR_CARTAO}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Saldo devedor
              </label>
              <input
                value={saldoCartao}
                onChange={(e) => setSaldoCartao(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Amortização
              </label>
              <input
                value={amortizacaoCartao}
                onChange={(e) => setAmortizacaoCartao(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Saldo a ser creditado em conta
            </label>
            <input
              value={saldoCreditadoConta}
              onChange={(e) => {
                setSaldoCreditadoConta(monetizarDigitacao(e.target.value));
                limparParcelas();
              }}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className={labelClass}>
              Total do resgate parcial de capital
            </label>
            <input
              readOnly
              value={fmtBRL(totalResgateCapital)}
              className={readOnlyMoneyClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Saldo de capital restante
            </label>
            <input
              readOnly
              value={fmtBRL(capitalRestante)}
              className={readOnlyMoneyClass}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className={labelClass}>
              Banco nº
            </label>
            <input
              value={banco}
              onChange={(e) => setBanco(limitText(e.target.value, LIMITS.CD_BANCO))}
              maxLength={LIMITS.CD_BANCO}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Agência
            </label>
            <input
              value={agencia}
              onChange={(e) => setAgencia(limitText(e.target.value, LIMITS.CD_AGENCIA))}
              maxLength={LIMITS.CD_AGENCIA}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Conta corrente
            </label>
            <input
              value={conta}
              onChange={(e) =>
                setConta(limitText(e.target.value, LIMITS.CD_CONTA_CORRENTE_DEPOSITO))
              }
              maxLength={LIMITS.CD_CONTA_CORRENTE_DEPOSITO}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Dígito
            </label>
            <input
              value={digito}
              onChange={(e) => setDigito(limitText(e.target.value, 5))}
              maxLength={5}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl border border-[#00AE9D]/15 bg-[#00AE9D]/5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Valor da 1ª parcela
            </label>
            <input
              value={valorPrimeiraParcela}
              onChange={(e) => {
                setValorPrimeiraParcela(monetizarDigitacao(e.target.value));
                limparParcelas();
              }}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className={labelClass}>
              Data da 1ª parcela
            </label>
            <input
              type="date"
              value={dataPrimeiraParcela}
              onChange={(e) => {
                setDataPrimeiraParcela(e.target.value);
                limparParcelas();
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Total devolução parcelada
            </label>
            <input
              readOnly
              value={fmtBRL(totalParcelado)}
              className={readOnlyMoneyClass}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={adicionarParcela}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
          >
            <FaPlus size={12} />
            Adicionar parcela
          </button>

          <button
            type="button"
            onClick={removerParcela}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-fourth/30 bg-fourth/10 px-4 text-sm font-semibold text-fourth shadow-sm transition hover:bg-fourth hover:text-white"
          >
            <FaTrash size={12} />
            Remover parcela
          </button>
        </div>

        {(parcelas.length > 0 || totalParcelado > 0) && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Parcela</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                      Nenhuma parcela adicionada.
                    </td>
                  </tr>
                ) : (
                  parcelas.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{`Parcela ${item.numero}`}</td>
                      <td className="px-3 py-2">{formatDateBR(item.data)}</td>
                      <td className="px-3 py-2 text-right">{item.valor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Fechamento do atendimento</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>
            Cidade do atendimento
          </label>
          <select
            value={secCidade}
            onChange={(e) => setSecCidade(e.target.value)}
            className={inputClass}
          >
            <option value=""></option>
            {cidades.map((cidade) => (
              <option key={cidade.ID_CIDADES} value={cidade.NM_CIDADE}>
                {String(cidade.NM_CIDADE).toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Dia do atendimento
          </label>
          <input
            readOnly
            type="date"
            value={diaAtendimento}
            className={readOnlyClass}
          />
        </div>
        </div>
      </div>
    </div>
  );
}