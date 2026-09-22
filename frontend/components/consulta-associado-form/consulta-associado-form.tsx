"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { useState } from "react";
import {
  VALORES_INTEGRALIZACAO,
  valorIntegralizacaoComMoeda,
} from "@/config/integralizacao";
import { gerarPdfAssociado } from "@/lib/pdf/gerarPdf";
import { formatCpfView } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { getMeAdUser } from "@/services/auth.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type Associado = {
  nome: string;
  cpf: string;
  matricula: string;
  empresa: string;
};

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

export function ConsultaAssociadoForm() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState<Associado | null>(null);
  const [valorAnterior, setValorAnterior] = useState("");
  const [valorNovo, setValorNovo] = useState("");
  const [atendente, setAtendente] = useState("");
  const [dataPrimeiroDesconto, setDataPrimeiroDesconto] = useState("");
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    setData(null);
    if (!atendente.trim()) {
      try {
        const me = await getMeAdUser();
        const nomeAtendente = String(me?.nome_completo || me?.username || "").trim();
        if (nomeAtendente) {
          setAtendente(nomeAtendente);
        }
      } catch {
        // mantém manual caso não consiga buscar usuário logado
      }
    }

    const r = await buscar(cpf);
    if (r.found) {
      setData({
        nome: r.data.nome || "",
        cpf: r.data.cpf || cpf,
        matricula: r.data.matricula || "",
        empresa: r.data.empresa || "",
      });
    }
  };

  const onGerarPdf = async () => {
    if (!data) return;

    await gerarPdfAssociado({
      nome: data.nome,
      cpf: data.cpf,
      matricula: data.matricula,
      empresa: data.empresa,
      atendente,
      dataPrimeiroDesconto,
      valorAnterior,
      valorNovo,
    });
  };

  const isFormularioValido =
    !!data &&
    atendente.trim() !== "" &&
    dataPrimeiroDesconto.trim() !== "" &&
    valorAnterior.trim() !== "" &&
    valorNovo.trim() !== "";

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SectionCard
          title="Consulta do associado"
          description="Digite o CPF para carregar os dados do associado e preencher a alteração."
        >
          <SearchForm onSearch={onBuscar}>
            <div>
              <FieldLabel>CPF do associado(a)</FieldLabel>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <SearchInput
                  value={formatCpfView(cpf)}
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

        {data && (
          <>
            <SectionCard
              title="Dados do associado"
              description="Informações carregadas pela consulta e usadas na impressão."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FieldReadOnly label="Nome completo" value={data.nome} />
                <FieldReadOnly label="CPF" value={formatCpfView(data.cpf)} />
                <FieldReadOnly label="Matrícula" value={data.matricula} />
                <FieldReadOnly label="Empresa" value={data.empresa} />
              </div>
            </SectionCard>

            <SectionCard
              title="Dados da alteração"
              description="Informe o atendente, a data do primeiro desconto e os valores de integralização."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Atendente</FieldLabel>
                  <input
                    value={atendente}
                    onChange={(e) => setAtendente(e.target.value)}
                    className={fieldClass}
                    placeholder="Nome do atendente"
                  />
                </div>

                <div>
                  <FieldLabel>Data 1º Desconto</FieldLabel>
                  <input
                    type="date"
                    value={dataPrimeiroDesconto}
                    onChange={(e) => setDataPrimeiroDesconto(e.target.value)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <FieldLabel>Valor Anterior</FieldLabel>
                  <select
                    value={valorAnterior}
                    onChange={(e) => setValorAnterior(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Selecione</option>
                    {VALORES_INTEGRALIZACAO.map((item) => {
                      const valor = valorIntegralizacaoComMoeda(item.valor);
                      return (
                        <option key={`anterior-${item.nivel}`} value={valor}>
                          Nível {item.nivel} - {valor}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <FieldLabel>Valor Novo</FieldLabel>
                  <select
                    value={valorNovo}
                    onChange={(e) => setValorNovo(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Selecione</option>
                    {VALORES_INTEGRALIZACAO.map((item) => {
                      const valor = valorIntegralizacaoComMoeda(item.valor);
                      return (
                        <option key={`novo-${item.nivel}`} value={valor}>
                          Nível {item.nivel} - {valor}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <button
                onClick={onGerarPdf}
                disabled={!isFormularioValido}
                className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${isFormularioValido
                  ? "cursor-pointer bg-secondary hover:bg-primary"
                  : "cursor-not-allowed bg-slate-300"
                  }`}
              >
                Gerar PDF
              </button>
            </div>
          </>
        )}
      </div>
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

function FieldReadOnly({ label, value }: { label: string; value: string }) {
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
