"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { gerarPdfDeclaracaoRendimentos } from "@/lib/pdf/gerarPdfRendimentos";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { monetizarDigitacao } from "@/utils/br";


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

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function DeclaracaoRendimentosForm() {
  const [cpf, setCpf] = useState("");
  //const [data, setData] = useState<Associado | null>(null);

  const [data, setData] = useState<Associado | null>(null);
  const [nome, setNome] = useState("");
  const [cpfFormulario, setCpfFormulario] = useState("");

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

    if (!r.found) {
      setNome("");
      setCpfFormulario(onlyDigits(cpf));
      return;
    }

    const associadoEncontrado = {
      nome: r.data.nome || "",
      cpf: r.data.cpf || onlyDigits(cpf),
    };

    setData(associadoEncontrado);
    setNome(associadoEncontrado.nome);
    setCpfFormulario(associadoEncontrado.cpf);
  };

  const podeGerarPdf =
    nome.trim().length > 0 &&
    onlyDigits(cpfFormulario).length > 0 &&
    destinatario.trim().length > 0 &&
    valorMensal.trim().length > 0 &&
    atividade.trim().length > 0 &&
    cidade.trim().length > 0 &&
    dia.trim().length > 0 &&
    mes.trim().length > 0 &&
    ano.trim().length > 0;

  const onGerar = async () => {
    await gerarPdfDeclaracaoRendimentos({
      destinatario,
      valorMensal,
      atividade,
      cidade,
      dia,
      mes,
      ano,
      nome,
      cpf: cpfFormulario,
    });
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SectionCard
          title="Consulta do empregado"
          description="Busque pelo CPF para carregar os dados disponíveis e ajuste manualmente se necessário."
        >
          <SearchForm onSearch={onBuscar}>
            <div>
              <FieldLabel>CPF do empregado(a)</FieldLabel>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <SearchInput
                  value={maskCpfView(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="CPF (somente números)"
                  className={fieldClass}
                  inputMode="numeric"
                  maxLength={14}
                />

                <SearchButton loading={loading} label="Pesquisar" />
              </div>

              {erro && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              {info && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}
            </div>
          </SearchForm>
        </SectionCard>

        <SectionCard
          title="Dados da declaração"
          description="Preencha os dados que serão usados no texto da declaração de rendimentos."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputRW
              label="Nome"
              value={nome}
              onChange={setNome}
              placeholder="Nome do empregado(a)"
            />

            <InputRW
              label="CPF"
              value={maskCpfView(cpfFormulario)}
              onChange={(v) => setCpfFormulario(onlyDigits(v))}
              placeholder="CPF"
            />

            <InputRW
              label="Destinatário"
              value={destinatario}
              onChange={setDestinatario}
              placeholder="Ex.: Sicoob Cressem"
            />

            <InputRW
              label="Valor mensal (R$)"
              value={valorMensal}
              onChange={(value) => setValorMensal(monetizarDigitacao(value))}
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
          </div>
        </SectionCard>

        <SectionCard
          title="Local e data"
          description="Essas informações serão refletidas no rodapé da impressão."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <InputRW
              label="Cidade"
              value={cidade}
              onChange={setCidade}
              placeholder="São José dos Campos"
            />

            <InputRW label="Dia" value={dia} onChange={setDia} placeholder="21" />
            <InputRW label="Mês" value={mes} onChange={setMes} placeholder="08" />
            <InputRW label="Ano" value={ano} onChange={setAno} placeholder="2025" />
          </div>
        </SectionCard>

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            onClick={onGerar}
            disabled={!podeGerarPdf}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${podeGerarPdf
              ? "cursor-pointer bg-secondary hover:bg-primary"
              : "cursor-not-allowed bg-slate-300"
              }`}
            title={!podeGerarPdf ? "Preencha todos os campos obrigatórios" : "Gerar PDF"}
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function InputRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        readOnly
        value={value}
        className={`${fieldClass} bg-slate-50`}
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
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-title">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-paragraph">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}