"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { gerarPdfProcuracaoPF } from "@/lib/pdf/procuracaoPF";
import { gerarPdfProcuracaoPJ } from "@/lib/pdf/procuracaoPJ";
import { formatCpfView, onlyDigits } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function formatCnpjView(v: string) {
  const s = onlyDigits(v).slice(0, 14);
  if (s.length <= 2) return s;
  if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`;
  if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`;
  if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

type AcaoPF = {
  outorganteNome: string;
  outorganteNacionalidade: string;
  outorganteEstadoCivil: string;
  outorganteProfissao: string;
  outorganteDocTipo: string;
  outorganteDocNumero: string;
  outorganteCpf: string;
  outorganteEndereco: string;
  outorganteNumero: string;
  outorganteBairro: string;
  outorganteCep: string;
  outorganteCidade: string;
  outorganteUF: string;
};

type OutorgadoPF = {
  outorgadoNome: string;
  outorgadoNacionalidade: string;
  outorgadoEstadoCivil: string;
  outorgadoProfissao: string;
  outorgadoDocTipo: string;
  outorgadoDocNumero: string;
  outorgadoCpf: string;
  outorgadoEndereco: string;
  outorgadoNumero: string;
  outorgadoBairro: string;
  outorgadoCep: string;
  outorgadoCidade: string;
  outorgadoUF: string;
};

type Comum = {
  razaoCooperativa: string;
  substabelecimento: string;
  prazoValidade: string;
  cidadeData: string;
  dia: string;
  mes: string;
  ano: string;
};

type OutorgantePJ = {
  razaoSocial: string;
  cnpj: string;
  sedeEndereco: string;
  sedeNumero: string;
  sedeBairro: string;
  sedeCep: string;
  sedeCidade: string;
  sedeUF: string;

  representanteNome: string;
  representanteNacionalidade: string;
  representanteEstadoCivil: string;
  representanteProfissao: string;
  representanteDocTipo: string;
  representanteDocNumero: string;
  representanteCpf: string;
  representanteEnd: string;
  representanteNum: string;
  representanteBairro: string;
  representanteCep: string;
  representanteCid: string;
  representanteUF: string;
};

const hojeParts = () => {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = d.toLocaleString("pt-BR", { month: "long" });
  const ano = String(d.getFullYear());
  return { dia, mes, ano };
};

export function ProcuracaoOutorganteForm() {
  // Busca por CPF (PF)
  const [cpfBusca, setCpfBusca] = useState("");

  // Hook padrão do projeto
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  // OUTORGANTE PF (busca preenche; editável)
  const [pf, setPf] = useState<AcaoPF>({
    outorganteNome: "",
    outorganteNacionalidade: "",
    outorganteEstadoCivil: "",
    outorganteProfissao: "",
    outorganteDocTipo: "RG",
    outorganteDocNumero: "",
    outorganteCpf: "",
    outorganteEndereco: "",
    outorganteNumero: "",
    outorganteBairro: "",
    outorganteCep: "",
    outorganteCidade: "",
    outorganteUF: "",
  });

  // OUTORGADO (PF) – manual
  const [outorgado, setOutorgado] = useState<OutorgadoPF>({
    outorgadoNome: "",
    outorgadoNacionalidade: "",
    outorgadoEstadoCivil: "",
    outorgadoProfissao: "",
    outorgadoDocTipo: "RG",
    outorgadoDocNumero: "",
    outorgadoCpf: "",
    outorgadoEndereco: "",
    outorgadoNumero: "",
    outorgadoBairro: "",
    outorgadoCep: "",
    outorgadoCidade: "",
    outorgadoUF: "",
  });

  // Comum (cláusulas/data)
  const { dia: d0, mes: m0, ano: a0 } = useMemo(hojeParts, []);
  const [comum, setComum] = useState<Comum>({
    razaoCooperativa: "Sicoob CRESSEM",
    substabelecimento: "permitido",
    prazoValidade: "",
    cidadeData: "São José dos Campos - SP",
    dia: d0,
    mes: m0,
    ano: a0,
  });

  // OUTORGANTE PJ (manual)
  const [pj, setPj] = useState<OutorgantePJ>({
    razaoSocial: "",
    cnpj: "",
    sedeEndereco: "",
    sedeNumero: "",
    sedeBairro: "",
    sedeCep: "",
    sedeCidade: "",
    sedeUF: "",
    representanteNome: "",
    representanteNacionalidade: "",
    representanteEstadoCivil: "",
    representanteProfissao: "",
    representanteDocTipo: "RG",
    representanteDocNumero: "",
    representanteCpf: "",
    representanteEnd: "",
    representanteNum: "",
    representanteBairro: "",
    representanteCep: "",
    representanteCid: "",
    representanteUF: "",
  });

  const onBuscar = async () => {
    const r = await buscar(cpfBusca);

    const clean = onlyDigits(cpfBusca);

    if (!r.found) {
      setPf((prev) => ({
        ...prev,
        outorganteCpf: clean,
      }));
      return;
    }

    setPf((prev) => ({
      ...prev,
      outorganteNome: r.data.nome || "",
      outorganteCpf: onlyDigits(r.data.cpf || clean),
      outorganteDocNumero: r.data.rg || "",

      outorganteEndereco: r.data.rua || r.data.endereco || "",
      outorganteNumero: r.data.numero || "",
      outorganteBairro: r.data.bairro || "",
      outorganteCep: r.data.cep || "",
      outorganteCidade: r.data.cidade || "",
      outorganteUF: (r.data.uf || "").toUpperCase(),
    }));
  };

  const fillHoje = () => {
    const { dia, mes, ano } = hojeParts();
    setComum((c) => ({ ...c, dia, mes, ano }));
  };

  const onGerarPF = () => {
    gerarPdfProcuracaoPF({
      ...pf,
      ...outorgado,
      ...comum,
    });
  };

  const onGerarPJ = () => {
    gerarPdfProcuracaoPJ({
      ...pj,
      ...outorgado,
      ...comum,
    });
  };

  return (
    <div className="space-y-5">
      <SearchForm onSearch={onBuscar}>
        <SectionCard
          title="Buscar outorgante (PF)"
          description="Consulte pelo CPF para preencher os dados disponíveis e ajuste manualmente se necessário."
        >
          <FieldLabel>CPF do outorgante</FieldLabel>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <SearchInput
              value={formatCpfView(cpfBusca)}
              onChange={(e) => setCpfBusca(onlyDigits(e.target.value).slice(0, 11))}
              placeholder="CPF (somente números)"
              className={fieldClass}
              inputMode="numeric"
              maxLength={14}
            />

            <SearchButton loading={loading} label="Pesquisar" />

            <button
              onClick={fillHoje}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth"
              title="Preencher dia/mês/ano com hoje"
            >
              Usar data de hoje
            </button>
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
        </SectionCard>
      </SearchForm>


      {/* OUTORGANTE PF */}
      <SectionCard
        title="Outorgante (PF)"
        description="Dados da pessoa física que está concedendo a procuração."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="Nome" value={pf.outorganteNome} onChange={(v) => setPf({ ...pf, outorganteNome: v })} />
          <Input label="Nacionalidade" value={pf.outorganteNacionalidade} onChange={(v) => setPf({ ...pf, outorganteNacionalidade: v })} />
          <Input label="Estado Civil" value={pf.outorganteEstadoCivil} onChange={(v) => setPf({ ...pf, outorganteEstadoCivil: v })} />
          <Input label="Profissão" value={pf.outorganteProfissao} onChange={(v) => setPf({ ...pf, outorganteProfissao: v })} />

          <Input label="Tipo Doc (RG/CNH)" value={pf.outorganteDocTipo} onChange={(v) => setPf({ ...pf, outorganteDocTipo: v })} />
          <Input label="Nº Doc" value={pf.outorganteDocNumero} onChange={(v) => setPf({ ...pf, outorganteDocNumero: v })} />
          <Input label="CPF" value={formatCpfView(pf.outorganteCpf)} onChange={(v) => setPf({ ...pf, outorganteCpf: onlyDigits(v).slice(0, 11) })} />

          <Input
            label="Endereço"
            value={pf.outorganteEndereco}
            onChange={(v) => setPf({ ...pf, outorganteEndereco: v })}
            className="md:col-span-2"
          />
          <Input label="Número" value={pf.outorganteNumero} onChange={(v) => setPf({ ...pf, outorganteNumero: v })} />

          <Input label="Bairro" value={pf.outorganteBairro} onChange={(v) => setPf({ ...pf, outorganteBairro: v })} />
          <Input label="CEP" value={pf.outorganteCep} onChange={(v) => setPf({ ...pf, outorganteCep: v })} />
          <Input label="Cidade" value={pf.outorganteCidade} onChange={(v) => setPf({ ...pf, outorganteCidade: v })} />
          <Input label="UF" value={pf.outorganteUF} onChange={(v) => setPf({ ...pf, outorganteUF: v.toUpperCase().slice(0, 2) })} />
        </div>
      </SectionCard>

      {/* OUTORGADO (PF) */}
      <SectionCard
        title="Outorgado (PF)"
        description="Dados da pessoa que receberá os poderes da procuração."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="Nome" value={outorgado.outorgadoNome} onChange={(v) => setOutorgado({ ...outorgado, outorgadoNome: v })} />
          <Input label="Nacionalidade" value={outorgado.outorgadoNacionalidade} onChange={(v) => setOutorgado({ ...outorgado, outorgadoNacionalidade: v })} />
          <Input label="Estado Civil" value={outorgado.outorgadoEstadoCivil} onChange={(v) => setOutorgado({ ...outorgado, outorgadoEstadoCivil: v })} />
          <Input label="Profissão" value={outorgado.outorgadoProfissao} onChange={(v) => setOutorgado({ ...outorgado, outorgadoProfissao: v })} />

          <Input label="Tipo Doc (RG/CNH)" value={outorgado.outorgadoDocTipo} onChange={(v) => setOutorgado({ ...outorgado, outorgadoDocTipo: v })} />
          <Input label="Nº Doc" value={outorgado.outorgadoDocNumero} onChange={(v) => setOutorgado({ ...outorgado, outorgadoDocNumero: v })} />
          <Input label="CPF" value={formatCpfView(outorgado.outorgadoCpf)} onChange={(v) => setOutorgado({ ...outorgado, outorgadoCpf: onlyDigits(v).slice(0, 11) })} />

          <Input
            label="Endereço"
            value={outorgado.outorgadoEndereco}
            onChange={(v) => setOutorgado({ ...outorgado, outorgadoEndereco: v })}
            className="md:col-span-2"
          />
          <Input label="Número" value={outorgado.outorgadoNumero} onChange={(v) => setOutorgado({ ...outorgado, outorgadoNumero: v })} />

          <Input label="Bairro" value={outorgado.outorgadoBairro} onChange={(v) => setOutorgado({ ...outorgado, outorgadoBairro: v })} />
          <Input label="CEP" value={outorgado.outorgadoCep} onChange={(v) => setOutorgado({ ...outorgado, outorgadoCep: v })} />
          <Input label="Cidade" value={outorgado.outorgadoCidade} onChange={(v) => setOutorgado({ ...outorgado, outorgadoCidade: v })} />
          <Input label="UF" value={outorgado.outorgadoUF} onChange={(v) => setOutorgado({ ...outorgado, outorgadoUF: v.toUpperCase().slice(0, 2) })} />
        </div>
      </SectionCard>

      {/* OUTORGANTE PJ */}
      <SectionCard
        title="Outorgante (PJ)"
        description="Preencha estes campos quando a procuração for de pessoa jurídica."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="Razão Social" value={pj.razaoSocial} onChange={(v) => setPj({ ...pj, razaoSocial: v })} />
          <Input label="CNPJ" value={formatCnpjView(pj.cnpj)} onChange={(v) => setPj({ ...pj, cnpj: onlyDigits(v).slice(0, 14) })} />

          <Input label="Endereço (sede)" value={pj.sedeEndereco} onChange={(v) => setPj({ ...pj, sedeEndereco: v })} className="md:col-span-2" />
          <Input label="Número" value={pj.sedeNumero} onChange={(v) => setPj({ ...pj, sedeNumero: v })} />
          <Input label="Bairro" value={pj.sedeBairro} onChange={(v) => setPj({ ...pj, sedeBairro: v })} />
          <Input label="CEP" value={pj.sedeCep} onChange={(v) => setPj({ ...pj, sedeCep: v })} />
          <Input label="Cidade" value={pj.sedeCidade} onChange={(v) => setPj({ ...pj, sedeCidade: v })} />
          <Input label="UF" value={pj.sedeUF} onChange={(v) => setPj({ ...pj, sedeUF: v.toUpperCase().slice(0, 2) })} />

          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-title md:col-span-3">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            Representante
          </div>

          <Input label="Nome" value={pj.representanteNome} onChange={(v) => setPj({ ...pj, representanteNome: v })} className="md:col-span-2" />
          <Input label="Nacionalidade" value={pj.representanteNacionalidade} onChange={(v) => setPj({ ...pj, representanteNacionalidade: v })} />
          <Input label="Estado Civil" value={pj.representanteEstadoCivil} onChange={(v) => setPj({ ...pj, representanteEstadoCivil: v })} />
          <Input label="Profissão" value={pj.representanteProfissao} onChange={(v) => setPj({ ...pj, representanteProfissao: v })} />
          <Input label="Tipo Doc" value={pj.representanteDocTipo} onChange={(v) => setPj({ ...pj, representanteDocTipo: v })} />
          <Input label="Nº Doc" value={pj.representanteDocNumero} onChange={(v) => setPj({ ...pj, representanteDocNumero: v })} />
          <Input label="CPF" value={formatCpfView(pj.representanteCpf)} onChange={(v) => setPj({ ...pj, representanteCpf: onlyDigits(v).slice(0, 11) })} />

          <Input label="Endereço (rep.)" value={pj.representanteEnd} onChange={(v) => setPj({ ...pj, representanteEnd: v })} className="md:col-span-2" />
          <Input label="Número" value={pj.representanteNum} onChange={(v) => setPj({ ...pj, representanteNum: v })} />
          <Input label="Bairro" value={pj.representanteBairro} onChange={(v) => setPj({ ...pj, representanteBairro: v })} />
          <Input label="CEP" value={pj.representanteCep} onChange={(v) => setPj({ ...pj, representanteCep: v })} />
          <Input label="Cidade" value={pj.representanteCid} onChange={(v) => setPj({ ...pj, representanteCid: v })} />
          <Input label="UF" value={pj.representanteUF} onChange={(v) => setPj({ ...pj, representanteUF: v.toUpperCase().slice(0, 2) })} />
        </div>
      </SectionCard>

      {/* Cláusulas / Data */}
      <SectionCard
        title="Cláusulas e data"
        description="Informações comuns usadas nos modelos de procuração PF e PJ."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            label="Razão social da cooperativa"
            value={comum.razaoCooperativa}
            onChange={(v) => setComum({ ...comum, razaoCooperativa: v })}
            className="md:col-span-2"
          />
          <Input
            label="Substabelecimento (permitido/vedado)"
            value={comum.substabelecimento}
            onChange={(v) => setComum({ ...comum, substabelecimento: v })}
          />
          <Input
            label="Prazo de validade (por extenso)"
            value={comum.prazoValidade}
            onChange={(v) => setComum({ ...comum, prazoValidade: v })}
            className="md:col-span-3"
          />
          <Input
            label="Cidade - UF"
            value={comum.cidadeData}
            onChange={(v) => setComum({ ...comum, cidadeData: v })}
            className="md:col-span-2"
          />
          <Input label="Dia" value={comum.dia} onChange={(v) => setComum({ ...comum, dia: v })} />
          <Input label="Mês" value={comum.mes} onChange={(v) => setComum({ ...comum, mes: v })} />
          <Input label="Ano" value={comum.ano} onChange={(v) => setComum({ ...comum, ano: v })} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            onClick={onGerarPF}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
          >
            Gerar PDF PF
          </button>

          <button
            onClick={onGerarPJ}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth"
          >
            Gerar PDF PJ
          </button>
        </div>
      </SectionCard>
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
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />
      <div className="p-4 md:p-5">
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
      </div>
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

function Input({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </div>
  );
}
