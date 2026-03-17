"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { gerarPdfDeclaracaoResidencia } from "@/lib/pdf/gerarPdfResidencia";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { formatCpfView, hojeBR, onlyDigits } from "@/utils/br";

type Assoc = {
  nome: string;
  cpf: string;
  rg: string;

  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

const maskCepView = (v: string) => {
  const s = (v || "").replace(/\D/g, "").slice(0, 8);
  if (s.length <= 5) return s;
  return `${s.slice(0, 5)}-${s.slice(5)}`;
};

const hojePartsBR = () => {
  const h = hojeBR(); // dd/mm/aaaa
  const [dia = "", mesNum = "", ano = ""] = (h || "").split("/");
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const mesIdx = Math.max(0, Math.min(11, Number(mesNum) - 1));
  const mes = meses[isNaN(mesIdx) ? 0 : mesIdx];
  return { dia, mes, ano };
};

export function DeclaracaoResidenciaForm() {
  const [tipoPessoa, setTipoPessoa] = useState<"associado" | "nao_associado" | null>(null);

  const [cpfBusca, setCpfBusca] = useState("");
  const [data, setData] = useState<Assoc | null>(null);

  const { dia: d0, mes: m0, ano: a0 } = useMemo(hojePartsBR, []);
  const [cidadeRodape, setCidadeRodape] = useState("");
  const [dia, setDia] = useState(d0);
  const [mes, setMes] = useState(m0);
  const [ano, setAno] = useState(a0);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const emptyAssoc: Assoc = {
    nome: "",
    cpf: "",
    rg: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
  };

  const handleSelecionarAssociado = () => {
    setTipoPessoa("associado");
    setCpfBusca("");
    setData(null);
    setCidadeRodape("");
    setDia(d0);
    setMes(m0);
    setAno(a0);
  };

  const handleSelecionarNaoAssociado = () => {
    setTipoPessoa("nao_associado");
    setCpfBusca("");
    setData({ ...emptyAssoc });
    setCidadeRodape("");
    setDia(d0);
    setMes(m0);
    setAno(a0);
  };

  const isAssociado = tipoPessoa === "associado";
  const isNaoAssociado = tipoPessoa === "nao_associado";

  const onBuscar = async () => {
    setData(null);

    const r = await buscar(cpfBusca);
    if (r.found) {
      const assoc: Assoc = {
        ...emptyAssoc,
        nome: r.data.nome || "",
        cpf: r.data.cpf || onlyDigits(cpfBusca),
        rg: r.data.rg || "",
        cidade: r.data.cidade || "",
        bairro: r.data.bairro || "",
        rua: r.data.rua || "",
        uf: r.data.uf || "",
        cep: r.data.cep || "",
      };

      setData(assoc);
      setCidadeRodape(assoc.cidade || "");
    } else {
      setData({ ...emptyAssoc, cpf: onlyDigits(cpfBusca) });
    }
  };

  const onGerarPdf = async () => {
    if (!data) return;

    await gerarPdfDeclaracaoResidencia({
      nome: data.nome,
      cpf: data.cpf,
      rg: data.rg,
      endereco: data.rua,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      cep: onlyDigits(data.cep),

      dia,
      mes,
      ano: ano || new Date().getFullYear().toString(),
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-1">Declaração de Residência</h2>

      <p className="text-md text-gray-500 mb-3">
        Selecione se é associado ou não associado para continuar.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={handleSelecionarAssociado}
          className={`px-4 py-2 rounded-full border text-sm font-semibold transition cursor-pointer
            ${
              isAssociado
                ? "bg-secondary text-white border-secondary"
                : "bg-white text-gray-700 border-gray-300 hover:border-primary"
            }`}
        >
          Associado
        </button>

        <button
          type="button"
          onClick={handleSelecionarNaoAssociado}
          className={`px-4 py-2 rounded-full border text-sm font-semibold transition cursor-pointer
            ${
              isNaoAssociado
                ? "bg-secondary text-white border-secondary"
                : "bg-white text-gray-700 border-gray-300 hover:border-secondary"
            }`}
        >
          Não associado
        </button>
      </div>

      {isAssociado && (
        <p className="text-md text-gray-500 mb-6">
          Digite o CPF para preencher automaticamente (nome/CPF/RG). Complete o endereço se necessário.
        </p>
      )}

      {isNaoAssociado && (
        <p className="text-md text-gray-500 mb-6">
          Preencha os dados manualmente para gerar a declaração.
        </p>
      )}

      {isAssociado && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={formatCpfView(cpfBusca)}
            onChange={(e) => setCpfBusca(e.target.value)}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />
          <button
            onClick={onBuscar}
            disabled={loading}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
          >
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>
      )}

      {erro && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {erro}
        </div>
      )}

      {info && (
        <div className="mt-3 text-sm text-secondary bg-emerald-50 border border-emerald-200 rounded p-3">
          {info}
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isAssociado ? (
              <>
                <InputRO label="Nome completo" value={data.nome} />
                <InputRO label="CPF" value={formatCpfView(data.cpf)} />
                <InputRO label="RG" value={data.rg} />
              </>
            ) : (
              <>
                <InputRW label="Nome completo" value={data.nome} onChange={(v) => setData({ ...data, nome: v })} />
                <InputRW
                  label="CPF"
                  value={formatCpfView(data.cpf)}
                  onChange={(v) => setData({ ...data, cpf: onlyDigits(v) })}
                />
                <InputRW label="RG" value={data.rg} onChange={(v) => setData({ ...data, rg: v })} />
              </>
            )}

            <InputRW label="Rua" value={data.rua} onChange={(v) => setData({ ...data, rua: v })} />
            <InputRW label="Número" value={data.numero} onChange={(v) => setData({ ...data, numero: v })} />
            <InputRW
              label="Complemento"
              value={data.complemento}
              onChange={(v) => setData({ ...data, complemento: v })}
            />
            <InputRW label="Bairro" value={data.bairro} onChange={(v) => setData({ ...data, bairro: v })} />
            <InputRW label="Cidade" value={data.cidade} onChange={(v) => setData({ ...data, cidade: v })} />
            <InputRW label="UF" value={data.uf} onChange={(v) => setData({ ...data, uf: v.toUpperCase().slice(0, 2) })} />
            <InputRW
              label="CEP"
              value={maskCepView(data.cep)}
              onChange={(v) => setData({ ...data, cep: v })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <InputRW label="Cidade (no rodapé)" value={cidadeRodape} onChange={setCidadeRodape} />
            <InputRW label="Dia" value={dia} onChange={setDia} />
            <InputRW label="Mês por extenso" value={mes} onChange={setMes} />
            <InputRW label="Ano" value={ano} onChange={setAno} />
          </div>

          <div className="pt-4 border-t flex items-center justify-end">
            <button
              onClick={onGerarPdf}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
              title="Gerar PDF igual ao modelo"
            >
              Gerar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InputRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input readOnly value={value} className="w-full border px-3 py-2 rounded bg-gray-50" />
    </div>
  );
}

function InputRW({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border px-3 py-2 rounded" />
    </div>
  );
}