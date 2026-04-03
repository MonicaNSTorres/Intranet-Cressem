"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  buscarAssociadoDemissaoPorCpf,
  buscarCidadesDemissao,
  buscarMotivosDemissao,
  type MotivoDemissaoOption,
} from "@/services/demissao.service";
import { gerarPdfDemissao } from "@/lib/pdf/gerarPdfDemissao";
import { formatCpfView, monetizarDigitacao, parseBRL, fmtBRL, hojeBR } from "@/utils/br";

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

function addMonthsToTodayBR(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  return `${dia}/${mes}/${ano}`;
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

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

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

  const saldoCapitalNum = useMemo(() => parseBRL(saldoCapital), [saldoCapital]);
  const debitoContaNum = useMemo(() => parseBRL(debitoConta), [debitoConta]);
  const debitoEmprestimoNum = useMemo(
    () => parseBRL(debitoEmprestimo),
    [debitoEmprestimo]
  );
  const debitoCartaoNum = useMemo(() => parseBRL(debitoCartao), [debitoCartao]);

  const totalDebitos = useMemo(
    () => debitoContaNum + debitoEmprestimoNum + debitoCartaoNum,
    [debitoContaNum, debitoEmprestimoNum, debitoCartaoNum]
  );

  const saldoFinal = useMemo(
    () => saldoCapitalNum - totalDebitos,
    [saldoCapitalNum, totalDebitos]
  );

  const tipoFormulario = useMemo<"CREDOR" | "DEVEDOR">(
    () => (saldoFinal >= 0 ? "CREDOR" : "DEVEDOR"),
    [saldoFinal]
  );

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
      setSaldoCapital(fmtBRL(Number(data.SL_CONTA_CAPITAL || 0)));

      setInfo("Associado carregado com sucesso.");
    } catch (error: any) {
      setErro(error?.response?.data?.error || "Erro ao buscar associado.");
      setInfo("");
    } finally {
      setLoading(false);
    }
  };

  const gerar = async () => {
    await gerarPdfDemissao({
      tipoFormulario,
      cpf: formatCpfView(cpf),
      nome,
      matricula,
      empresa,
      telefone,

      saldoCapital: fmtBRL(saldoCapitalNum),
      debitoConta: fmtBRL(debitoContaNum),
      debitoEmprestimo: fmtBRL(debitoEmprestimoNum),
      debitoCartao: fmtBRL(debitoCartaoNum),
      totalDebitos: fmtBRL(totalDebitos),
      saldoFinal: fmtBRL(Math.abs(saldoFinal)),

      banco,
      agencia,
      conta,
      digito,

      primeiraParcelaValor: "",
      primeiraParcelaData: "",
      totalDevolucaoParcelada: "",
      parcelas: [],

      motivoDemissao,
      dataRetorno,

      reciboTransferencia: "",
      reciboPix: "",
      reciboDebitoConta: "",
      reciboTotal: fmtBRL(Math.abs(saldoFinal)),

      cidadeAtendimento,
      dataAtendimento: hojeBR(),
      atendente: "Atendente",
    });
  };

  return (
    <div className="min-w-0 mx-auto rounded-xl bg-white p-6 shadow">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          CPF do associado
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={formatCpfView(cpf)}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />

          <button
            onClick={onBuscar}
            disabled={loading}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {erro && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {info && (
          <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {info}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
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
            Empresa
          </label>
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
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
            value={dataRetorno}
            onChange={(e) => setDataRetorno(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="dd/mm/aaaa"
          />
        </div>
      </div>

      <div className="pt-5 border-t mt-6 flex items-center justify-end">
        <button
          onClick={gerar}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}