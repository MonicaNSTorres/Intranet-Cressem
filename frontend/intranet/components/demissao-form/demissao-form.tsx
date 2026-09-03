"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { FaPlus, FaPrint, FaTimes, FaTrash } from "react-icons/fa";
import {
  buscarAssociadoDemissaoPorCpf,
  buscarCidadesDemissao,
  buscarMotivosDemissao,
  buscarConvenioDemissaoPorCpf,
  desativarConvenioDemissao,
  type MotivoDemissaoOption,
} from "@/services/demissao.service";
import { buscarDiaUtil } from "@/services/resgate_capital.service";
import { gerarPdfDemissao } from "@/lib/pdf/gerarPdfDemissao";
import { getMeAdUser } from "@/services/auth.service";
import { monetizarDigitacao, parseBRL, fmtBRL, hojeBR } from "@/utils/br";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type CidadeOption = {
  value: string;
  label: string;
};

function formatTelefone(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function onlyCpfCnpjChars(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function formatCpfCnpjView(value: string) {
  const digits = onlyCpfCnpjChars(value).slice(0, 14);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function removerPontuacaoComDigitoVizinho(
  value: string,
  cursor: number,
  direction: "backspace" | "delete"
) {
  if (direction === "backspace") {
    const removeStart = Math.max(cursor - 2, 0);
    return `${value.slice(0, removeStart)}${value.slice(cursor)}`;
  }

  return `${value.slice(0, cursor)}${value.slice(cursor + 2)}`;
}

type ParcelaItem = {
  id: string;
  numero: number;
  data: string;
  valor: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function addMonthsToTodayBR(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

export function DemissaoForm() {
  const [cpf, setCpf] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");

  const [saldoCapital, setSaldoCapital] = useState("");
  const [debitoConta, setDebitoConta] = useState("");
  const [debitoEmprestimo, setDebitoEmprestimo] = useState("");
  const [debitoCartao, setDebitoCartao] = useState("");

  const [motivos, setMotivos] = useState<MotivoDemissaoOption[]>([]);
  const [cidades, setCidades] = useState<CidadeOption[]>([]);

  const [motivoDemissao, setMotivoDemissao] = useState("");
  const [cidadeAtendimento, setCidadeAtendimento] = useState("");
  const [dataRetorno, setDataRetorno] = useState(addMonthsToTodayBR(2));

  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [digito, setDigito] = useState("");
  const [valorPrimeiraParcela, setValorPrimeiraParcela] = useState("");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);
  const [reciboTransferencia, setReciboTransferencia] = useState("");
  const [reciboPix, setReciboPix] = useState("");
  const [reciboDebitoConta, setReciboDebitoConta] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [possuiConvenio, setPossuiConvenio] = useState<"Sim" | "Não">("Não");
  const [valorConvenio, setValorConvenio] = useState("");
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [nomeAtendente, setNomeAtendente] = useState("Atendente");

  useEffect(() => {
    async function carregarDados() {
      try {
        const [motivosData, cidadesData] = await Promise.all([
          buscarMotivosDemissao(),
          buscarCidadesDemissao(),
        ]);

        setMotivos(motivosData || []);
        setCidades(cidadesData || []);
      } catch (error) {
        console.error("Erro ao carregar dados da demissão:", error);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    async function carregarAtendente() {
      try {
        const me = await getMeAdUser();
        const nome = String(me?.nome_completo || me?.username || "").trim();
        if (nome) setNomeAtendente(nome);
      } catch {
        // Mantém fallback.
      }
    }

    carregarAtendente();
  }, []);

  const saldoCapitalNum = useMemo(() => parseBRL(saldoCapital), [saldoCapital]);
  const debitoContaNum = useMemo(() => parseBRL(debitoConta), [debitoConta]);
  const debitoEmprestimoNum = useMemo(
    () => parseBRL(debitoEmprestimo),
    [debitoEmprestimo]
  );
  const debitoCartaoNum = useMemo(() => parseBRL(debitoCartao), [debitoCartao]);

  const valorConvenioNum = useMemo(
    () => parseBRL(valorConvenio),
    [valorConvenio]
  );

  const totalDebitos = useMemo(
    () =>
      debitoContaNum +
      debitoEmprestimoNum +
      debitoCartaoNum +
      valorConvenioNum,
    [debitoContaNum, debitoEmprestimoNum, debitoCartaoNum, valorConvenioNum]
  );

  const saldoFinal = useMemo(
    () => saldoCapitalNum - totalDebitos,
    [saldoCapitalNum, totalDebitos]
  );

  const totalDevolucaoParcelada = useMemo(() => {
    return parcelas.reduce((acc, item) => acc + parseBRL(item.valor), 0);
  }, [parcelas]);
  const reciboTransferenciaNum = useMemo(
    () => parseBRL(reciboTransferencia),
    [reciboTransferencia]
  );
  const reciboPixNum = useMemo(() => parseBRL(reciboPix), [reciboPix]);
  const reciboDebitoContaNum = useMemo(
    () => parseBRL(reciboDebitoConta),
    [reciboDebitoConta]
  );
  const totalRecibo = useMemo(
    () => reciboTransferenciaNum + reciboPixNum + reciboDebitoContaNum,
    [reciboTransferenciaNum, reciboPixNum, reciboDebitoContaNum]
  );
  const diferencaReciboPagar = useMemo(
    () => Math.max(0, Number((Math.abs(saldoFinal) - totalRecibo).toFixed(2))),
    [saldoFinal, totalRecibo]
  );
  const mostrarResumoRecibo = useMemo(
    () => diferencaReciboPagar > 0,
    [diferencaReciboPagar]
  );

  const temValorADevolver = useMemo(() => saldoFinal > 0, [saldoFinal]);
  const temValorAPagar = useMemo(() => saldoFinal < 0, [saldoFinal]);

  const tipoFormulario = useMemo<"CREDOR" | "DEVEDOR">(
    () => (temValorADevolver ? "CREDOR" : "DEVEDOR"),
    [temValorADevolver]
  );

  function limparParcelas() {
    setParcelas([]);
  }

  function limparFormulario() {
    setCpf("");
    setNome("");
    setMatricula("");
    setEmpresa("");
    setTelefone("");
    setSaldoCapital("");
    setDebitoConta("");
    setDebitoEmprestimo("");
    setDebitoCartao("");
    setMotivoDemissao("");
    setCidadeAtendimento("");
    setDataRetorno(addMonthsToTodayBR(2));
    setBanco("");
    setAgencia("");
    setConta("");
    setDigito("");
    setValorPrimeiraParcela("");
    setDataPrimeiraParcela("");
    setParcelas([]);
    setReciboTransferencia("");
    setReciboPix("");
    setReciboDebitoConta("");
    setPossuiConvenio("Não");
    setValorConvenio("");
    setErro("");
    setInfo("");
  }

  function validarAntesDeGerar() {
    const cpfLimpo = String(cpf || "").replace(/\D/g, "");
    if (!cpfLimpo || (cpfLimpo.length !== 11 && cpfLimpo.length !== 14)) {
      setErro("Informe um CPF/CNPJ válido.");
      return false;
    }

    if (!telefone.trim()) {
      setErro("Telefone do associado não preenchido.");
      return false;
    }

    if (!motivoDemissao) {
      setErro("Motivo da demissão não foi selecionado.");
      return false;
    }

    if (!cidadeAtendimento) {
      setErro("Cidade do atendimento não foi selecionada.");
      return false;
    }

    const totalAjustado = Number(Math.abs(saldoFinal).toFixed(2));

    if (temValorADevolver) {
      if (!banco.trim()) {
        setErro("Número do banco não preenchido.");
        return false;
      }

      if (!agencia.trim()) {
        setErro("Número da agência não preenchido.");
        return false;
      }

      if (!conta.trim()) {
        setErro("Número da conta corrente não preenchido.");
        return false;
      }

      if (!digito.trim()) {
        setErro("Dígito da conta corrente não preenchido.");
        return false;
      }

      if (!valorPrimeiraParcela || parseBRL(valorPrimeiraParcela) <= 0) {
        setErro("Valor da primeira parcela não preenchido.");
        return false;
      }

      if (!dataPrimeiraParcela) {
        setErro("Data da primeira parcela não preenchida.");
        return false;
      }

      if (parcelas.length === 0) {
        setErro("Não há parcelas adicionadas. Adicione ao menos uma parcela.");
        return false;
      }

      const primeiraParcelaTabela = Number(parseBRL(parcelas[0]?.valor || "").toFixed(2));
      const primeiraParcelaInformada = Number(parseBRL(valorPrimeiraParcela).toFixed(2));
      if (primeiraParcelaTabela !== primeiraParcelaInformada) {
        setErro("Valor da primeira parcela não corresponde ao valor informado.");
        return false;
      }

      const totalParcelado = Number(totalDevolucaoParcelada.toFixed(2));
      if (totalParcelado !== totalAjustado) {
        setErro("O total da devolução parcelada não bate com o total a devolver.");
        return false;
      }
    }

    if (temValorAPagar) {
      const totalReciboNum = Number(totalRecibo.toFixed(2));
      if (totalReciboNum <= 0) {
        setErro("Preencha os valores do recibo.");
        return false;
      }

      if (totalReciboNum !== totalAjustado) {
        setErro("O total do recibo deve ser igual ao total a pagar.");
        return false;
      }
    }

    return true;
  }

  async function validarDataPrimeiraParcela(data: string) {
    const hoje = hojeISO();

    if (data < hoje) {
      setErro("A data da 1ª parcela não pode ser anterior a hoje.");
      return false;
    }

    try {
      const resposta = await buscarDiaUtil(data);
      if (!resposta?.diaUtil) {
        setErro("A data da 1ª parcela deve ser um dia útil.");
        return false;
      }
    } catch {
      setErro("Não foi possível validar se a data da 1ª parcela é dia útil.");
      return false;
    }

    return true;
  }

  async function validarCamposParcelas() {
    const totalADevolver = Number(Math.abs(saldoFinal).toFixed(2));
    const valorPrimeiro = Number(parseBRL(valorPrimeiraParcela).toFixed(2));

    if (tipoFormulario !== "CREDOR") {
      setErro("Parcelas só podem ser adicionadas no formulário credor.");
      return false;
    }

    if (totalADevolver <= 0) {
      setErro("Não há saldo para devolução parcelada.");
      return false;
    }

    if (!valorPrimeiraParcela || valorPrimeiro <= 0) {
      setErro("Preencha o valor da primeira parcela.");
      return false;
    }

    if (!dataPrimeiraParcela) {
      setErro("Preencha a data da primeira parcela.");
      return false;
    }

    const dataValida = await validarDataPrimeiraParcela(dataPrimeiraParcela);
    if (!dataValida) return false;

    if (valorPrimeiro > totalADevolver) {
      setErro("O valor da primeira parcela não pode ser maior que o total a devolver.");
      return false;
    }

    return true;
  }

  async function gerarParcelas(quantidade: number) {
    const valido = await validarCamposParcelas();
    if (!valido) return;

    setErro("");
    setInfo("");

    const valorTotal = Number(Math.abs(saldoFinal).toFixed(2));
    const valorPrimeiro = Number(parseBRL(valorPrimeiraParcela).toFixed(2));

    const novasParcelas: ParcelaItem[] = [];
    let soma = 0;

    for (let i = 0; i < quantidade; i++) {
      const data = addMonthsSafe(dataPrimeiraParcela, i);
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

  const onBuscar = async () => {
    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const data = await buscarAssociadoDemissaoPorCpf(cpf);

      if (!data) {
        setErro("Associado não encontrado.");
        return;
      }

      setNome(data.NOME || "");
      setMatricula(data.MATRICULA || "");
      setEmpresa(data.EMPRESA || "");
      setCidadeAtendimento(data.CIDADE || "");
      setTelefone(formatTelefone(data.TELEFONE || ""));
      setSaldoCapital(fmtBRL(Number(data.SL_CONTA_CAPITAL || 0)));

      const convenio = await buscarConvenioDemissaoPorCpf(cpf);

      if (convenio?.titular_ativo) {
        setPossuiConvenio("Sim");
        setValorConvenio(
          fmtBRL(Number(convenio?.total_custo || 0))
        );
      } else {
        setPossuiConvenio("Não");
        setValorConvenio(fmtBRL(0));
      }

      setInfo("Associado carregado com sucesso.");
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Erro ao buscar associado.");
      setInfo("");
    } finally {
      setLoading(false);
    }
  };

  const gerarPdfAtual = async () => {
    await gerarPdfDemissao({
      tipoFormulario,
      cpf: formatCpfCnpjView(cpf),
      nome,
      matricula,
      empresa,
      telefone,

      saldoCapital: fmtBRL(saldoCapitalNum),
      possuiConvenioOdontologico: possuiConvenio,
      debitoConta: fmtBRL(debitoContaNum),
      debitoEmprestimo: fmtBRL(debitoEmprestimoNum),
      debitoCartao: fmtBRL(debitoCartaoNum),
      convenioOdontologico: fmtBRL(valorConvenioNum),
      totalDebitos: fmtBRL(totalDebitos),
      saldoFinal: fmtBRL(Math.abs(saldoFinal)),
      temValorADevolver,
      temValorAPagar,

      banco,
      agencia,
      conta,
      digito,

      primeiraParcelaValor: valorPrimeiraParcela || "",
      primeiraParcelaData: dataPrimeiraParcela
        ? formatDateBR(dataPrimeiraParcela)
        : "",
      totalDevolucaoParcelada: fmtBRL(totalDevolucaoParcelada),
      parcelas: parcelas.map((item) => ({
        numero: item.numero,
        data: formatDateBR(item.data),
        valor: item.valor,
      })),

      motivoDemissao,
      dataRetorno,

      reciboTransferencia: fmtBRL(reciboTransferenciaNum),
      reciboPix: fmtBRL(reciboPixNum),
      reciboDebitoConta: fmtBRL(reciboDebitoContaNum),
      reciboTotal: fmtBRL(totalRecibo),

      cidadeAtendimento,
      dataAtendimento: hojeBR(),
      atendente: nomeAtendente || "Atendente",
    } as any);
  };

  const gerar = async () => {
    try {
      setErro("");
      setInfo("");

      const valido = validarAntesDeGerar();
      if (!valido) return;

      setLoadingGerar(true);
      let falhaConvenio = "";

      if (possuiConvenio === "Sim") {
        try {
          await desativarConvenioDemissao(cpf, nomeAtendente || "Atendente");
        } catch (error: any) {
          falhaConvenio =
            error?.response?.data?.error ||
            error?.response?.data?.details ||
            error?.message ||
            "Falha ao desativar convênio odontológico.";
          console.error("Falha ao desativar convênio na demissão:", error);
        }
      }

      await gerarPdfAtual();

      if (falhaConvenio) {
        setInfo(`PDF gerado com sucesso. Atenção: ${falhaConvenio}`);
      } else {
        setInfo(
          possuiConvenio === "Sim"
            ? "PDF gerado e convênio odontológico desativado com envio de e-mail."
            : "PDF gerado com sucesso."
        );
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF da demissão:", error);
      setErro(
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "Erro ao gerar PDF ou desativar convênio."
      );
    } finally {
      setLoadingGerar(false);
    }
  };

  const salvar = async () => {
    try {
      setLoadingSalvar(true);
      await gerar();
    } finally {
      setLoadingSalvar(false);
    }
  };

  const onDocumentoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;

    const input = e.currentTarget;
    const cursorInicio = input.selectionStart ?? 0;
    const cursorFim = input.selectionEnd ?? cursorInicio;
    if (cursorInicio !== cursorFim) return;

    const value = input.value;
    const isBackspaceSobrePontuacao =
      e.key === "Backspace" &&
      cursorInicio > 0 &&
      /\D/.test(value[cursorInicio - 1] || "");

    const isDeleteSobrePontuacao =
      e.key === "Delete" &&
      cursorInicio < value.length &&
      /\D/.test(value[cursorInicio] || "");

    if (!isBackspaceSobrePontuacao && !isDeleteSobrePontuacao) return;

    e.preventDefault();
    const novoValor = removerPontuacaoComDigitoVizinho(
      value,
      cursorInicio,
      e.key === "Backspace" ? "backspace" : "delete"
    );
    setCpf(onlyCpfCnpjChars(novoValor).slice(0, 14));
  };

  const labelClass =
    "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";
  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
  const readOnlyClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 shadow-sm outline-none";
  const moneyInputClass = `${inputClass} text-right`;
  const readOnlyMoneyClass = `${readOnlyClass} text-right`;
  const sectionClass =
    "mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const sectionTitleClass =
    "mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]";

  return (
    <div className="min-w-0 mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />
      <SearchForm
        onSearch={onBuscar}
        className="border-b border-slate-100 bg-white p-5"
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className={labelClass}>
              CPF/CNPJ do associado
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <SearchInput
                value={formatCpfCnpjView(cpf)}
                onChange={(e) => setCpf(onlyCpfCnpjChars(e.target.value).slice(0, 14))}
                onKeyDown={onDocumentoKeyDown}
                placeholder="CPF/CNPJ"
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
              onClick={salvar}
              disabled={loadingGerar || loadingSalvar}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaPrint />
              {loadingSalvar ? "Salvando..." : "Salvar e imprimir"}
            </button>
          </div>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {info}
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
              Nome do associado
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Empresa
            </label>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Matrícula
            </label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Telefone
            </label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              className={inputClass}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className={labelClass}>
              Tipo do formulário
            </label>
            <input
              readOnly
              value={tipoFormulario === "CREDOR" ? "Credor" : "Devedor"}
              className={readOnlyClass + " font-semibold"}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Possui convênio odontológico
            </label>
            <select
              value={possuiConvenio}
              onChange={(e) => {
                const valor = e.target.value as "Sim" | "Não";
                setPossuiConvenio(valor);
                if (valor === "Não") {
                  setValorConvenio(fmtBRL(0));
                }
              }}
              className={inputClass + " font-semibold"}
            >
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Valor convênio odontológico
            </label>
            <input
              value={valorConvenio}
              onChange={(e) => setValorConvenio(monetizarDigitacao(e.target.value))}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Saldos e débitos</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className={labelClass}>
              Saldo capital
            </label>
            <input
              value={saldoCapital}
              onChange={(e) => setSaldoCapital(monetizarDigitacao(e.target.value))}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className={labelClass}>
              Débito conta
            </label>
            <input
              value={debitoConta}
              onChange={(e) => setDebitoConta(monetizarDigitacao(e.target.value))}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className={labelClass}>
              Débito empréstimo
            </label>
            <input
              value={debitoEmprestimo}
              onChange={(e) =>
                setDebitoEmprestimo(monetizarDigitacao(e.target.value))
              }
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className={labelClass}>
              Débito cartão
            </label>
            <input
              value={debitoCartao}
              onChange={(e) => setDebitoCartao(monetizarDigitacao(e.target.value))}
              className={moneyInputClass}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Total débitos
            </label>
            <input
              readOnly
              value={fmtBRL(totalDebitos)}
              className={readOnlyMoneyClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {temValorADevolver
                ? "Total a devolver"
                : temValorAPagar
                  ? "Total a pagar"
                  : "Sem devolução ou pagamento"}
            </label>
            <input
              readOnly
              value={fmtBRL(Math.abs(saldoFinal))}
              className={readOnlyMoneyClass}
            />
          </div>
        </div>
      </div>

      {temValorADevolver && (
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Dados para devolução</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className={labelClass}>
                Banco
              </label>
              <input
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Agência
              </label>
              <input
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Conta
              </label>
              <input
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Dígito
              </label>
              <input
                value={digito}
                onChange={(e) => setDigito(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#00AE9D]/15 bg-[#00AE9D]/5 p-4">
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
                  min={hojeISO()}
                  value={dataPrimeiraParcela}
                  onChange={(e) => {
                    setDataPrimeiraParcela(e.target.value);
                    limparParcelas();
                  }}
                  onBlur={async () => {
                    if (!dataPrimeiraParcela) return;
                    await validarDataPrimeiraParcela(dataPrimeiraParcela);
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
                  value={fmtBRL(totalDevolucaoParcelada)}
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

            {(parcelas.length > 0 || totalDevolucaoParcelada > 0) && (
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
        </div>
      )}

      {temValorAPagar && (
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Recibo do devedor</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>
                Transferência
              </label>
              <input
                value={reciboTransferencia}
                onChange={(e) => setReciboTransferencia(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className={labelClass}>Pix</label>
              <input
                value={reciboPix}
                onChange={(e) => setReciboPix(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className={labelClass}>
                Débito em C/C
              </label>
              <input
                value={reciboDebitoConta}
                onChange={(e) => setReciboDebitoConta(monetizarDigitacao(e.target.value))}
                className={moneyInputClass}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {mostrarResumoRecibo && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Total recebido
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalRecibo)}
                  className={readOnlyMoneyClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Diferença para total a pagar
                </label>
                <input
                  readOnly
                  value={fmtBRL(diferencaReciboPagar)}
                  className={readOnlyMoneyClass}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!temValorADevolver && !temValorAPagar && (
        <div className="my-4 rounded-2xl border border-[#00AE9D]/30 bg-[#00AE9D]/10 p-4 text-sm font-semibold text-[#006B5F]">
          Não há valor a devolver ou a pagar. Os dados bancários não são necessários.
        </div>
      )}

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Fechamento do formulário</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Motivo da demissão
            </label>
            <select
              value={motivoDemissao}
              onChange={(e) => setMotivoDemissao(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {motivos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Cidade do atendimento
            </label>
            <select
              value={cidadeAtendimento}
              onChange={(e) => setCidadeAtendimento(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {cidades.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Data de retorno
            </label>
            <input
              readOnly
              value={dataRetorno}
              className={readOnlyClass + " cursor-not-allowed"}
            />
          </div>
        </div>
      </div>

    </div>
  );
}