"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
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
import { formatCpfView, monetizarDigitacao, parseBRL, fmtBRL, hojeBR } from "@/utils/br";
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

  const tipoFormulario = useMemo<"CREDOR" | "DEVEDOR">(
    () => (saldoFinal >= 0 ? "CREDOR" : "DEVEDOR"),
    [saldoFinal]
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

    if (tipoFormulario === "CREDOR") {
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

    if (tipoFormulario === "DEVEDOR") {
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
    const totalADevolver = Math.abs(saldoFinal);

    if (tipoFormulario !== "CREDOR") {
      setErro("Parcelas só podem ser adicionadas no formulário credor.");
      return false;
    }

    if (totalADevolver <= 0) {
      setErro("Não há saldo para devolução parcelada.");
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

    const dataValida = await validarDataPrimeiraParcela(dataPrimeiraParcela);
    if (!dataValida) return false;

    if (parseBRL(valorPrimeiraParcela) > totalADevolver) {
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

    const valorTotal = Math.abs(saldoFinal);
    const valorPrimeiro = parseBRL(valorPrimeiraParcela);

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

      await gerarPdfDemissao({
        tipoFormulario,
        cpf: formatCpfView(cpf),
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

  return (
    <div className="min-w-0 mx-auto rounded-xl bg-white p-6 shadow">
      <SearchForm onSearch={onBuscar}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF do associado
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="CPF (somente números)"
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
                inputMode="numeric"
                maxLength={14}
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

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={loadingGerar || loadingSalvar}
              className="inline-flex items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary cursor-pointer disabled:opacity-60"
            >
              <FaPrint />
              {loadingSalvar ? "Salvando..." : "Salvar e imprimir"}
            </button>
          </div>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome do associado
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Empresa
          </label>
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Matrícula
          </label>
          <input
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Telefone
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            className="w-full border px-3 py-2 rounded"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Tipo do formulário
          </label>
          <input
            readOnly
            value={tipoFormulario === "CREDOR" ? "Credor" : "Devedor"}
            className="w-full border px-3 py-2 rounded bg-gray-50 font-medium"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Possui convênio odontológico
          </label>
          <input
            readOnly
            value={possuiConvenio}
            className="w-full border px-3 py-2 rounded bg-gray-50 font-medium"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Valor convênio odontológico
          </label>
          <input
            readOnly={possuiConvenio === "Não"}
            value={valorConvenio}
            onChange={(e) => {
              if (possuiConvenio === "Não") return;
              setValorConvenio(monetizarDigitacao(e.target.value));
            }}
            className={`w-full border px-3 py-2 rounded text-right ${possuiConvenio === "Não" ? "bg-gray-50 cursor-not-allowed" : ""}`}
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Saldo capital
          </label>
          <input
            value={saldoCapital}
            onChange={(e) => setSaldoCapital(monetizarDigitacao(e.target.value))}
            className="w-full border px-3 py-2 rounded text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Débito conta
          </label>
          <input
            value={debitoConta}
            onChange={(e) => setDebitoConta(monetizarDigitacao(e.target.value))}
            className="w-full border px-3 py-2 rounded text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Débito empréstimo
          </label>
          <input
            value={debitoEmprestimo}
            onChange={(e) =>
              setDebitoEmprestimo(monetizarDigitacao(e.target.value))
            }
            className="w-full border px-3 py-2 rounded text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Débito cartão
          </label>
          <input
            value={debitoCartao}
            onChange={(e) => setDebitoCartao(monetizarDigitacao(e.target.value))}
            className="w-full border px-3 py-2 rounded text-right"
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Total débitos
          </label>
          <input
            readOnly
            value={fmtBRL(totalDebitos)}
            className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {tipoFormulario === "CREDOR" ? "Total a devolver" : "Total a pagar"}
          </label>
          <input
            readOnly
            value={fmtBRL(Math.abs(saldoFinal))}
            className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
          />
        </div>
      </div>

      {tipoFormulario === "CREDOR" && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Banco
            </label>
            <input
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Agência
            </label>
            <input
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Conta
            </label>
            <input
              value={conta}
              onChange={(e) => setConta(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Dígito
            </label>
            <input
              value={digito}
              onChange={(e) => setDigito(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="md:col-span-4 mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
                  className="w-full border px-3 py-2 rounded bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Total devolução parcelada
                </label>
                <input
                  readOnly
                  value={fmtBRL(totalDevolucaoParcelada)}
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

            {(parcelas.length > 0 || totalDevolucaoParcelada > 0) && (
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
        </div>
      )}

      {tipoFormulario === "DEVEDOR" && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Recibo (devedor)</h3>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Transferência
              </label>
              <input
                value={reciboTransferencia}
                onChange={(e) => setReciboTransferencia(monetizarDigitacao(e.target.value))}
                className="w-full border px-3 py-2 rounded text-right bg-white"
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Pix</label>
              <input
                value={reciboPix}
                onChange={(e) => setReciboPix(monetizarDigitacao(e.target.value))}
                className="w-full border px-3 py-2 rounded text-right bg-white"
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Débito em C/C
              </label>
              <input
                value={reciboDebitoConta}
                onChange={(e) => setReciboDebitoConta(monetizarDigitacao(e.target.value))}
                className="w-full border px-3 py-2 rounded text-right bg-white"
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Total do recibo
              </label>
              <input
                readOnly
                value={fmtBRL(totalRecibo)}
                className="w-full border px-3 py-2 rounded bg-gray-100 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Diferença para total a pagar
              </label>
              <input
                readOnly
                value={fmtBRL(Number((totalRecibo - Math.abs(saldoFinal)).toFixed(2)))}
                className="w-full border px-3 py-2 rounded bg-gray-100 text-right"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Motivo da demissão
          </label>
          <select
            value={motivoDemissao}
            onChange={(e) => setMotivoDemissao(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-white"
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cidade do atendimento
          </label>
          <select
            value={cidadeAtendimento}
            onChange={(e) => setCidadeAtendimento(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-white"
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Data de retorno
          </label>
          <input
            readOnly
            value={dataRetorno}
            className="w-full border px-3 py-2 rounded bg-gray-50 cursor-not-allowed"
          />
        </div>
      </div>

    </div>
  );
}
