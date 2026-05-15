"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaPrint, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import {
  fmtBRL,
  formatCpfView,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
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
  return onlyDigits(value).length === 14;
}

function capitalizeWords(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [nomeAtendente, setNomeAtendente] = useState("ATENDENTE");

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
    return parseBRL(saldoCapitalAtual) - totalResgateCapital;
  }, [saldoCapitalAtual, totalResgateCapital]);

  const totalParcelado = useMemo(() => {
    return parcelas.reduce((acc, item) => acc + parseBRL(item.valor), 0);
  }, [parcelas]);

  async function onBuscar() {
    try {
      setErro("");
      setInfo("");

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
        setInfo("Associado carregado com sucesso.");

        await carregarEmprestimosAutomaticos();
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
        const saldo = Number(item.SALDODEVEDORDIA || 0);

        return tipo !== "" || contrato !== "" || saldo > 0;
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

    if (onlyDigits(cpf).length > LIMITS.NR_CPF_CNPJ) {
      setErro(`CPF/CNPJ deve ter no máximo ${LIMITS.NR_CPF_CNPJ} dígitos.`);
      return false;
    }

    if (!saldoCapitalAtual || parseBRL(saldoCapitalAtual) <= 0) {
      setErro("Preencha o saldo de capital atual.");
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

    for (const item of emprestimos) {
      if (item.tipo.trim().length > LIMITS.DESC_TIPO_EMPRESTIMO) {
        setErro(`Tipo de empréstimo deve ter no máximo ${LIMITS.DESC_TIPO_EMPRESTIMO} caracteres.`);
        return false;
      }
      if (item.contrato.trim().length > LIMITS.NR_CONTRATO_EMPRESTIMO) {
        setErro(`Contrato deve ter no máximo ${LIMITS.NR_CONTRATO_EMPRESTIMO} caracteres.`);
        return false;
      }
    }

    if (totalResgateCapital >= parseBRL(saldoCapitalAtual)) {
      setErro(
        "O total do resgate não pode ser maior ou igual ao saldo da conta capital."
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
    }

    return true;
  }

  async function salvarEImprimir() {
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
        VL_CAPITAL_ATUAL: parseBRL(saldoCapitalAtual),
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

      await gerarPdfResgateCapital(
        {
          cpfCnpj: formatCpfView(cpf),
          nome,
          matricula,
          empresa,
          motivo: secMotivo,
          autorizadoPor: secAutorizado,
          saldoCapitalAtual: parseBRL(saldoCapitalAtual),
          totalResgateCapital,
          saldoCapitalRestante: capitalRestante,
          emprestimos: emprestimos.map((item) => ({
            tipo: item.tipo,
            contrato: item.contrato,
            saldoDevedor: parseBRL(item.saldoDevedor),
            amortizacao: parseBRL(item.amortizacao),
          })),
          contaCorrenteNumero: numeroContaCorrente,
          contaCorrenteSaldo: parseBRL(saldoDevedorConta),
          contaCorrenteAmortizacao: parseBRL(amortizacaoConta),
          cartaoNumero: numeroCartao,
          cartaoSaldo: parseBRL(saldoCartao),
          cartaoAmortizacao: parseBRL(amortizacaoCartao),
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
          acao: "print",
          nomeArquivo: `resgate_capital_${onlyDigits(cpf) || "associado"}.pdf`,
        }
      );

      setInfo("Resgate salvo com sucesso. Impressão preparada.");
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

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <SearchForm onSearch={onBuscar}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF/CNPJ do associado(a)
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Digite o CPF/CNPJ"
                className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                inputMode="numeric"
                maxLength={18}
              />

              <SearchButton loading={loading} label="Pesquisar" />

              <button
                type="button"
                onClick={limparFormulario}
                className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <FaTimes />
                Limpar
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={salvarEImprimir}
              disabled={loadingSalvar || loadingTela}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary lg:w-auto cursor-pointer disabled:opacity-60"
            >
              <FaPrint />
              {loadingSalvar ? "Salvando..." : "Salvar e imprimir"}
            </button>
          </div>
        </div>

        {(erro || info || erroBusca || infoBusca) && (
          <div className="mt-4">
            {erro || erroBusca ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erro || erroBusca}
              </div>
            ) : (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {info || infoBusca}
              </div>
            )}
          </div>
        )}
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome do associado(a)
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(limitText(e.target.value, LIMITS.NM_CLIENTE))}
            maxLength={LIMITS.NM_CLIENTE}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {!isCnpj(cpf) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Matrícula
            </label>
            <input
              value={matricula}
              onChange={(e) =>
                setMatricula(limitText(e.target.value, LIMITS.CD_MATRICULA))
              }
              maxLength={LIMITS.CD_MATRICULA}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        )}

        {!isCnpj(cpf) && (
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Empresa
            </label>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(limitText(e.target.value, LIMITS.NM_EMPRESA))}
              maxLength={LIMITS.NM_EMPRESA}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Saldo de capital atual
          </label>
          <input
            value={saldoCapitalAtual}
            onChange={(e) => setSaldoCapitalAtual(monetizarDigitacao(e.target.value))}
            className="w-full rounded border px-3 py-2 text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Motivo
          </label>
          <select
            value={secMotivo}
            onChange={(e) => setSecMotivo(e.target.value)}
            className="w-full rounded border px-3 py-2"
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Autorizado por
          </label>
          <select
            value={secAutorizado}
            onChange={(e) => setSecAutorizado(e.target.value)}
            className="w-full rounded border px-3 py-2"
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

      <div className="mt-6 border-t pt-5">
        <label className="mb-2 block text-xs font-medium text-gray-600">
          Amortização de empréstimo(s)?
        </label>

        <div className="flex gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={radioEmprestimo === "Sim"}
              onChange={() => setRadioEmprestimo("Sim")}
            />
            Sim
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={radioEmprestimo === "Nao"}
              onChange={() => setRadioEmprestimo("Nao")}
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
                className="inline-flex items-center gap-2 rounded bg-secondary px-4 py-2 font-semibold text-white hover:bg-primary cursor-pointer"
              >
                <FaPlus />
                Adicionar empréstimo
              </button>

              <button
                type="button"
                onClick={removerEmprestimo}
                className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                <FaTrash />
                Remover empréstimo
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
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
                          className="w-full rounded border px-3 py-2"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={item.contrato}
                          onChange={(e) =>
                            updateEmprestimo(item.id, "contrato", e.target.value)
                          }
                          maxLength={LIMITS.NR_CONTRATO_EMPRESTIMO}
                          className="w-full rounded border px-3 py-2"
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
                          className="w-full rounded border px-3 py-2 text-right"
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
                          className="w-full rounded border px-3 py-2 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Total do saldo devedor
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalSaldoEmprestimo)}
                  className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Total da amortização de capital
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalAmortizacaoEmprestimo)}
                  className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 border-t pt-5">
        <label className="mb-2 block text-xs font-medium text-gray-600">
          Amortização de débito(s) em conta?
        </label>

        <div className="flex gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={radioConta === "Sim"}
              onChange={() => setRadioConta("Sim")}
            />
            Sim
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              checked={radioConta === "Nao"}
              onChange={() => setRadioConta("Nao")}
            />
            Não
          </label>
        </div>

        {radioConta === "Sim" && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nº C. Corrente
              </label>
              <input
                value={numeroContaCorrente}
                onChange={(e) =>
                  setNumeroContaCorrente(limitText(e.target.value, LIMITS.NR_CONTA))
                }
                maxLength={LIMITS.NR_CONTA}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Saldo devedor
              </label>
              <input
                value={saldoDevedorConta}
                onChange={(e) => setSaldoDevedorConta(monetizarDigitacao(e.target.value))}
                className="w-full rounded border px-3 py-2 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Amortização
              </label>
              <input
                value={amortizacaoConta}
                onChange={(e) => setAmortizacaoConta(monetizarDigitacao(e.target.value))}
                className="w-full rounded border px-3 py-2 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Cartão de crédito
              </label>
              <input
                value={numeroCartao}
                onChange={(e) =>
                  setNumeroCartao(onlyDigits(e.target.value).slice(0, LIMITS.NR_CARTAO))
                }
                inputMode="numeric"
                maxLength={LIMITS.NR_CARTAO}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Saldo devedor
              </label>
              <input
                value={saldoCartao}
                onChange={(e) => setSaldoCartao(monetizarDigitacao(e.target.value))}
                className="w-full rounded border px-3 py-2 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Amortização
              </label>
              <input
                value={amortizacaoCartao}
                onChange={(e) => setAmortizacaoCartao(monetizarDigitacao(e.target.value))}
                className="w-full rounded border px-3 py-2 text-right"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t pt-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Saldo a ser creditado em conta
            </label>
            <input
              value={saldoCreditadoConta}
              onChange={(e) => {
                setSaldoCreditadoConta(monetizarDigitacao(e.target.value));
                limparParcelas();
              }}
              className="w-full rounded border px-3 py-2 text-right"
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Total do resgate parcial de capital
            </label>
            <input
              readOnly
              value={fmtBRL(totalResgateCapital)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Saldo de capital restante
            </label>
            <input
              readOnly
              value={fmtBRL(capitalRestante)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Banco nº
            </label>
            <input
              value={banco}
              onChange={(e) => setBanco(limitText(e.target.value, LIMITS.CD_BANCO))}
              maxLength={LIMITS.CD_BANCO}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Agência
            </label>
            <input
              value={agencia}
              onChange={(e) => setAgencia(limitText(e.target.value, LIMITS.CD_AGENCIA))}
              maxLength={LIMITS.CD_AGENCIA}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Conta corrente
            </label>
            <input
              value={conta}
              onChange={(e) =>
                setConta(limitText(e.target.value, LIMITS.CD_CONTA_CORRENTE_DEPOSITO))
              }
              maxLength={LIMITS.CD_CONTA_CORRENTE_DEPOSITO}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Dígito
            </label>
            <input
              value={digito}
              onChange={(e) => setDigito(limitText(e.target.value, 5))}
              maxLength={5}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Valor da 1ª parcela
            </label>
            <input
              value={valorPrimeiraParcela}
              onChange={(e) => {
                setValorPrimeiraParcela(monetizarDigitacao(e.target.value));
                limparParcelas();
              }}
              className="w-full border px-3 py-2 rounded text-right bg-white"
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Data da 1ª parcela
            </label>
            <input
              type="date"
              value={dataPrimeiraParcela}
              onChange={(e) => {
                setDataPrimeiraParcela(e.target.value);
                limparParcelas();
              }}
              className="w-full border px-3 py-2 rounded bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Total devolução parcelada
            </label>
            <input
              readOnly
              value={fmtBRL(totalParcelado)}
              className="w-full border px-3 py-2 rounded bg-gray-100 text-right"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={adicionarParcela}
            className="inline-flex items-center gap-2 rounded bg-secondary px-3 py-2 text-sm font-medium text-white hover:bg-primary"
          >
            <FaPlus size={12} />
            Adicionar parcela
          </button>

          <button
            type="button"
            onClick={removerParcela}
            className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <FaTrash size={12} />
            Remover parcela
          </button>
        </div>

        {(parcelas.length > 0 || totalParcelado > 0) && (
          <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
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

      <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cidade do atendimento
          </label>
          <select
            value={secCidade}
            onChange={(e) => setSecCidade(e.target.value)}
            className="w-full rounded border px-3 py-2"
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Dia do atendimento
          </label>
          <input
            readOnly
            type="date"
            value={diaAtendimento}
            className="w-full rounded border bg-gray-50 px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}

