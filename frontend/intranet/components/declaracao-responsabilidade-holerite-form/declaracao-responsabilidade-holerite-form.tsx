"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FaFilePdf } from "react-icons/fa";
import { SearchButton } from "@/components/ui/search-button";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfDeclaracaoResponsabilidadeHolerite } from "@/lib/pdf/gerarPdfDeclaracaoResponsabilidadeHolerite";
import {
  listarCidadesAutorizacaoDebito,
  type CidadeOption,
} from "@/services/autorizacao_debito.service";
import { formatCpfView, monetizarDigitacao, onlyDigits } from "@/utils/br";

function hojeIso() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAtualBR() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${mes}/${ano}`;
}

function formatarMesAnoBR(value: string) {
  const digitos = value.replace(/\D/g, "").slice(0, 6);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function resolverCidadeSelect(cidade: string, cidades: CidadeOption[]) {
  const cidadeNormalizada = normalizarTexto(cidade);
  if (!cidadeNormalizada) return "São José dos Campos";

  return (
    cidades.find(
      (item) => normalizarTexto(item.NM_CIDADE) === cidadeNormalizada
    )?.NM_CIDADE ||
    cidade ||
    "São José dos Campos"
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

const labelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

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
    <section className="rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={labelClass}>{children}</label>;
}

export function DeclaracaoResponsabilidadeHoleriteForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [rg, setRg] = useState("");
  const [mesReferencia, setMesReferencia] = useState(mesAtualBR());
  const [valor, setValor] = useState("");
  const [prazoMeses, setPrazoMeses] = useState("");
  const [local, setLocal] = useState("São José dos Campos");
  const [cidades, setCidades] = useState<CidadeOption[]>([]);
  const [dataDeclaracao, setDataDeclaracao] = useState(hojeIso());
  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");
  const [modoManual, setModoManual] = useState(false);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();
  const erroAtual = erroLocal || erro;
  const infoAtual = erroAtual ? "" : infoLocal || info;

  useEffect(() => {
    let ativo = true;

    listarCidadesAutorizacaoDebito()
      .then((data) => {
        if (ativo) setCidades(data || []);
      })
      .catch(() => {
        if (ativo) setCidades([]);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const onBuscar = async () => {
    setErroLocal("");
    setInfoLocal("");

    const result = await buscar(cpf);
    const cpfFormatado = formatCpfView(cpf);

    if (!result.found) {
      setNome("");
      setRg(cpfFormatado);
      setModoManual(true);
      setInfoLocal("Associado não encontrado. Preencha os dados manualmente.");
      return;
    }

    const cpfEncontrado = result.data.cpf || cpf;

    setNome(result.data.nome || "");
    setCpf(cpfEncontrado);
    setRg(formatCpfView(cpfEncontrado));
    setLocal(resolverCidadeSelect(result.data.cidade || "", cidades));
    setModoManual(false);
  };

  const formularioCompleto = useMemo(() => {
    return (
      onlyDigits(cpf).length === 11 &&
      !!nome.trim() &&
      !!rg.trim() &&
      !!mesReferencia &&
      !!valor.trim() &&
      !!prazoMeses.trim() &&
      !!local.trim() &&
      !!dataDeclaracao
    );
  }, [cpf, nome, rg, mesReferencia, valor, prazoMeses, local, dataDeclaracao]);

  const onGerarPdf = async () => {
    if (!formularioCompleto) {
      setErroLocal("Preencha todos os campos obrigatórios para gerar o PDF.");
      setInfoLocal("");
      return;
    }

    setErroLocal("");
    setInfoLocal("Gerando PDF...");

    await gerarPdfDeclaracaoResponsabilidadeHolerite({
      nome: nome.trim(),
      cpf: formatCpfView(cpf),
      rg: rg.trim(),
      mesReferencia,
      valor,
      prazoMeses,
      local: local.trim(),
      dataDeclaracao,
    });

    setInfoLocal("PDF gerado com sucesso.");
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SectionCard
          title="Consulta do cooperado"
          description="Busque pelo CPF para carregar os dados disponíveis e ajuste manualmente se necessário."
        >
          <SearchForm onSearch={onBuscar}>
            <div>
              <FieldLabel>CPF do cooperado</FieldLabel>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <SearchInput
                  value={formatCpfView(cpf)}
                  onChange={(e) => {
                    const novoCpf = e.target.value;
                    const cpfAnteriorFormatado = formatCpfView(cpf);
                    const novoCpfFormatado = formatCpfView(novoCpf);

                    setCpf(novoCpf);
                    setRg((valorAtual) => {
                      if (!valorAtual.trim() || valorAtual === cpfAnteriorFormatado) {
                        return novoCpfFormatado;
                      }

                      return valorAtual;
                    });
                    setErroLocal("");
                    setInfoLocal("");
                  }}
                  placeholder="CPF (somente números)"
                  className={fieldClass}
                  inputMode="numeric"
                  maxLength={14}
                />

                <SearchButton loading={loading} label="Pesquisar" />

                <button
                  type="button"
                  onClick={onGerarPdf}
                  disabled={!formularioCompleto}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaFilePdf size={14} />
                  Gerar PDF
                </button>
              </div>

              {erroAtual && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erroAtual}
                </div>
              )}
              {infoAtual && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {infoAtual}
                </div>
              )}
              {modoManual && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Modo manual ativo: revise nome, CPF e RG antes de gerar o documento.
                </div>
              )}
            </div>
          </SearchForm>
        </SectionCard>

        <SectionCard
          title="Dados do cooperado"
          description="As informações podem ser carregadas pela busca e ajustadas manualmente."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <FieldLabel>Nome completo</FieldLabel>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={fieldClass}
                placeholder="Nome do cooperado"
              />
            </div>

            <div>
              <FieldLabel>RG</FieldLabel>
              <input
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className={fieldClass}
                placeholder="RG do cooperado"
              />
            </div>

            <div>
              <FieldLabel>Local</FieldLabel>
              <select
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {cidades.map((item) => (
                  <option key={item.ID_CIDADES} value={item.NM_CIDADE}>
                    {item.NM_CIDADE}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Dados do desconto"
          description="Estes campos preenchem o texto da declaração e a impressão do PDF."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <FieldLabel>Mês de referência</FieldLabel>
              <input
                value={mesReferencia}
                onChange={(e) => setMesReferencia(formatarMesAnoBR(e.target.value))}
                className={fieldClass}
                placeholder="MM/AAAA"
                inputMode="numeric"
                maxLength={7}
              />
            </div>

            <div>
              <FieldLabel>Valor</FieldLabel>
              <input
                value={valor}
                onChange={(e) => setValor(monetizarDigitacao(e.target.value))}
                className={fieldClass}
                placeholder="R$ 0,00"
                inputMode="numeric"
              />
            </div>

            <div>
              <FieldLabel>Prazo total (meses)</FieldLabel>
              <input
                value={prazoMeses}
                onChange={(e) => setPrazoMeses(e.target.value.replace(/\D/g, ""))}
                className={fieldClass}
                placeholder="Ex.: 24"
                inputMode="numeric"
              />
            </div>

            <div>
              <FieldLabel>Data</FieldLabel>
              <input
                type="date"
                value={dataDeclaracao}
                onChange={(e) => setDataDeclaracao(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
