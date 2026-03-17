"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { gerarPdfDeclaracaoRendimentos } from "@/lib/pdf/gerarPdfRendimentos";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";

type Associado = {
  nome: string;
  cpf: string;
};

const maskCpfView = (v: string) => {
  const s = (v || "").replace(/\D/g, "").slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
};

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function DeclaracaoRendimentosForm() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState<Associado | null>(null);

  const [destinatario, setDestinatario] = useState("Sicoob Cressem");
  const [valorMensal, setValorMensal] = useState("");
  const [atividade, setAtividade] = useState("");
  const [cidade, setCidade] = useState("São José dos Campos");

  const hoje = useMemo(() => new Date(), []);
  const [dia, setDia] = useState(pad2(hoje.getDate()));
  const [mes, setMes] = useState(pad2(hoje.getMonth() + 1));
  const [ano, setAno] = useState(String(hoje.getFullYear()));

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    setData(null);
    const r = await buscar(cpf);

    if (!r.found) return;

    setData({
      nome: r.data.nome || "",
      cpf: r.data.cpf || onlyDigits(cpf),
    });
  };

  const onGerar = async () => {
    await gerarPdfDeclaracaoRendimentos({
      destinatario,
      valorMensal,
      atividade,
      cidade,
      dia,
      mes,
      ano,
      nome: data?.nome,
      cpf: data?.cpf,
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          CPF do empregado(a)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={maskCpfView(cpf)}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />

          <button
            onClick={onBuscar}
            disabled={loading}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer"
          >
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {erro && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {erro}
          </div>
        )}

        {info && (
          <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
            {info}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InputRO label="Nome" value={data?.nome || ""} />
        <InputRO label="CPF" value={maskCpfView(data?.cpf || "")} />

        <InputRW
          label="Destinatário"
          value={destinatario}
          onChange={setDestinatario}
          placeholder="Ex.: Sicoob Cressem"
        />

        <InputRW
          label="Valor mensal (R$)"
          value={valorMensal}
          onChange={setValorMensal}
          placeholder="R$ 0,00"
        />

        <div className="md:col-span-2">
          <InputRW
            label="Atividade"
            value={atividade}
            onChange={setAtividade}
            placeholder="Descrição da atividade principal"
          />
        </div>

        <InputRW
          label="Cidade"
          value={cidade}
          onChange={setCidade}
          placeholder="São José dos Campos"
        />

        <div className="grid grid-cols-3 gap-3">
          <InputRW label="Dia" value={dia} onChange={setDia} placeholder="21" />
          <InputRW label="Mês" value={mes} onChange={setMes} placeholder="08" />
          <InputRW label="Ano" value={ano} onChange={setAno} placeholder="2025" />
        </div>
      </div>

      <div className="pt-4 mt-4 border-t flex items-center justify-end">
        <button
          onClick={onGerar}
          disabled={!data}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
          title={!data ? "Busque um CPF antes de gerar" : "Gerar PDF"}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

function InputRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        readOnly
        value={value}
        className="w-full border px-3 py-2 rounded bg-gray-50"
      />
    </div>
  );
}

function InputRW({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}