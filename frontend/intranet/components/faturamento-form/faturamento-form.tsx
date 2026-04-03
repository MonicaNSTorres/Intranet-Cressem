/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useMemo, useState } from "react";
import {
  FaBuilding,
  FaCalculator,
  FaCheckCircle,
  FaClipboardList,
  FaCoins,
  FaFilePdf,
  FaMapMarkerAlt,
  FaPercent,
  FaUserTie,
} from "react-icons/fa";
import { gerarPdfFaturamentoPJ } from "@/lib/pdf/gerarPdfFaturamentoPJ";

type MesItem = { mes: string; valor: string };

type Formas = {
  vista: string;
  prazo: string;
};

type Meios = {
  dinheiro: string;
  cheques: string;
  debito: string;
  credito: string;
  duplicatas: string;
  carne: string;
  outros: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hojeBR() {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function default12Meses(): MesItem[] {
  const arr: MesItem[] = [];
  const d = new Date();

  for (let i = 0; i < 12; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push({
      mes: `${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`,
      valor: "",
    });
  }

  return arr.reverse();
}

function parseBRL(s: string): number {
  if (!s) return 0;

  const clean = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(clean);

  return isFinite(n) ? n : 0;
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function maskBRLOnType(v: string) {
  const onlyDigits = v.replace(/[^\d]/g, "");
  if (!onlyDigits) return "";
  const num = Number(onlyDigits) / 100;
  return fmtBRL(num);
}

function calcularPercentualTotal(formas: Formas) {
  return Number(formas.vista || 0) + Number(formas.prazo || 0);
}

function calcularPercentualMeios(meios: Meios) {
  return (
    Number(meios.dinheiro || 0) +
    Number(meios.cheques || 0) +
    Number(meios.debito || 0) +
    Number(meios.credito || 0) +
    Number(meios.duplicatas || 0) +
    Number(meios.carne || 0) +
    Number(meios.outros || 0)
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-white via-lime-50/40 to-emerald-50/40 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7D300]/50 bg-[#C7D300]/20 text-emerald-700">
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function inputBaseClassName(alignRight = false) {
  return [
    "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition",
    "placeholder:text-gray-400",
    "focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100",
    alignRight ? "text-right" : "text-left",
  ].join(" ");
}

export function FaturamentoFormPJ() {
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [meses, setMeses] = useState<MesItem[]>(default12Meses());

  const [formas, setFormas] = useState<Formas>({
    vista: "",
    prazo: "",
  });

  const [meios, setMeios] = useState<Meios>({
    dinheiro: "",
    cheques: "",
    debito: "",
    credito: "",
    duplicatas: "",
    carne: "",
    outros: "",
  });

  const [municipioUF, setMunicipioUF] = useState("São José dos Campos - SP");
  const [data, setData] = useState(hojeBR());

  const [contNome, setContNome] = useState("");
  const [contCPF, setContCPF] = useState("");
  const [contCRC, setContCRC] = useState("");

  const [pjVisitada, setPjVisitada] = useState<"Sim" | "Não" | "">("");
  const [obs, setObs] = useState("");

  const { total, qtdMeses, media } = useMemo(() => {
    const values = meses.map((m) => parseBRL(m.valor));
    const total = values.reduce((a, b) => a + b, 0);
    const nonZero = values.filter((v) => v > 0);
    const qtdMeses = nonZero.length;

    let media = 0;

    if (qtdMeses > 0) {
      media = qtdMeses === 12 ? total / 12 : total / qtdMeses;
    }

    return { total, qtdMeses, media };
  }, [meses]);

  const percentualFormas = useMemo(() => calcularPercentualTotal(formas), [formas]);
  const percentualMeios = useMemo(() => calcularPercentualMeios(meios), [meios]);

  const onChangeValor = (i: number, v: string) => {
    setMeses((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, valor: maskBRLOnType(v) } : m))
    );
  };

  const gerar = async () => {
    await gerarPdfFaturamentoPJ({
      razaoSocial: razao,
      cnpj,
      meses,
      total,
      qtdMeses,
      media,
      formas,
      meios,
      municipioUF,
      data,
      contNome,
      contCPF,
      contCRC,
      pjVisitada,
      obs,
    });
  };

  const meiosFields: Array<{ key: keyof Meios; label: string; placeholder: string }> = [
    { key: "dinheiro", label: "% dinheiro", placeholder: "0" },
    { key: "cheques", label: "% cheques", placeholder: "0" },
    { key: "debito", label: "% cartão débito", placeholder: "0" },
    { key: "credito", label: "% cartão crédito", placeholder: "0" },
    { key: "duplicatas", label: "% duplicatas", placeholder: "0" },
    { key: "carne", label: "% carnê", placeholder: "0" },
    { key: "outros", label: "% outros", placeholder: "0" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-emerald-100 bg-white shadow-[0_16px_60px_rgba(16,24,40,0.08)]">
        <div className="bg-gradient-to-r from-emerald-50 via-lime-50 to-white px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            {/*<div className="max-w-3xl">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C7D300]/60 bg-[#C7D300] text-emerald-700 shadow-sm">
                <FaBuilding size={20} />
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 lg:text-3xl">
                Declaração de Faturamento Pessoa Jurídica
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                Preencha os dados da empresa, informe o faturamento dos últimos 12
                meses, distribua os percentuais de recebimento e gere o PDF final
                com os cálculos automáticos já consolidados.
              </p>
            </div>*/}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Total acumulado
                  </span>
                  <FaCoins className="text-emerald-700" />
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-900">{fmtBRL(total)}</p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Meses válidos
                  </span>
                  <FaClipboardList className="text-emerald-700" />
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-900">{qtdMeses}</p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Média mensal
                  </span>
                  <FaCalculator className="text-emerald-700" />
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-900">
                  {qtdMeses ? fmtBRL(media) : "R$ 0,00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <Field label="Razão social completa">
                <input
                  value={razao}
                  onChange={(e) => setRazao(e.target.value)}
                  className={inputBaseClassName()}
                  placeholder="Digite a razão social da empresa"
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <Field label="CNPJ">
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className={inputBaseClassName()}
                  placeholder="00.000.000/0000-00"
                />
              </Field>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="Relação de faturamento"
        description="Informe os últimos 12 meses. A média considera os meses preenchidos automaticamente."
        icon={<FaClipboardList size={18} />}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            <FaCheckCircle />
            Preenchimento inteligente dos últimos 12 meses
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {[0, 1].map((col) => (
            <div
              key={col}
              className="rounded-[24px] border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 shadow-sm"
            >
              <div className="mb-3 grid grid-cols-[130px_1fr] gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                <div>Mês/ano</div>
                <div>Faturamento</div>
              </div>

              <div className="space-y-3">
                {meses.slice(col * 6, col * 6 + 6).map((m, idx) => {
                  const absoluteIndex = col * 6 + idx;

                  return (
                    <div
                      key={absoluteIndex}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm md:grid-cols-[130px_1fr]"
                    >
                      <input
                        value={m.mes}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMeses((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === absoluteIndex
                                ? { ...item, mes: v }
                                : item
                            )
                          );
                        }}
                        className={inputBaseClassName()}
                        placeholder="MM/AAAA"
                      />

                      <input
                        value={m.valor}
                        onChange={(e) => onChangeValor(absoluteIndex, e.target.value)}
                        className={inputBaseClassName(true)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Total calculado
              </span>
              <FaCoins className="text-emerald-700" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{fmtBRL(total)}</p>
            <p className="mt-1 text-xs text-gray-500">
              Soma de todos os faturamentos preenchidos.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Meses com valor
              </span>
              <FaClipboardList className="text-emerald-700" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{qtdMeses}</p>
            <p className="mt-1 text-xs text-gray-500">
              Quantidade considerada no cálculo da média.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Média mensal
              </span>
              <FaCalculator className="text-emerald-700" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {qtdMeses ? fmtBRL(media) : "R$ 0,00"}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Cálculo automático com base nos meses informados.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Forma de recebimento"
          description="Informe os percentuais de venda à vista e a prazo."
          icon={<FaPercent size={18} />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="% à vista">
              <input
                value={formas.vista}
                onChange={(e) =>
                  setFormas((prev) => ({ ...prev, vista: e.target.value }))
                }
                className={inputBaseClassName()}
                placeholder="Ex: 40"
              />
            </Field>

            <Field label="% a prazo">
              <input
                value={formas.prazo}
                onChange={(e) =>
                  setFormas((prev) => ({ ...prev, prazo: e.target.value }))
                }
                className={inputBaseClassName()}
                placeholder="Ex: 60"
              />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Total informado</span>
              <span
                className={`text-sm font-semibold ${
                  percentualFormas === 100 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {percentualFormas}%
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Meios de recebimento"
          description="Distribua os percentuais por tipo de recebimento."
          icon={<FaCoins size={18} />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {meiosFields.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  value={meios[field.key]}
                  onChange={(e) =>
                    setMeios((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className={inputBaseClassName()}
                  placeholder={field.placeholder}
                />
              </Field>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600">Total informado</span>
              <span
                className={`text-sm font-semibold ${
                  percentualMeios === 100 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {percentualMeios}%
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Local e data"
          icon={<FaMapMarkerAlt size={18} />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Município / UF">
              <input
                value={municipioUF}
                onChange={(e) => setMunicipioUF(e.target.value)}
                className={inputBaseClassName()}
                placeholder="Município - UF"
              />
            </Field>

            <Field label="Data">
              <input
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputBaseClassName()}
                placeholder="dd/mm/aaaa"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Contador responsável"
          icon={<FaUserTie size={18} />}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <Field label="Nome">
                <input
                  value={contNome}
                  onChange={(e) => setContNome(e.target.value)}
                  className={inputBaseClassName()}
                  placeholder="Nome completo do contador"
                />
              </Field>
            </div>

            <Field label="CPF">
              <input
                value={contCPF}
                onChange={(e) => setContCPF(e.target.value)}
                className={inputBaseClassName()}
                placeholder="CPF"
              />
            </Field>

            <Field label="CRC">
              <input
                value={contCRC}
                onChange={(e) => setContCRC(e.target.value)}
                className={inputBaseClassName()}
                placeholder="CRC"
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Uso exclusivo do Sicoob"
        description="Informe se a PJ foi visitada e registre observações relevantes."
        icon={<FaClipboardList size={18} />}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          <Field label="PJ visitada?">
            <select
              value={pjVisitada}
              onChange={(e) => setPjVisitada(e.target.value as "Sim" | "Não" | "")}
              className={inputBaseClassName()}
            >
              <option value=""></option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </Field>

          <Field label="Observações">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Descreva observações importantes sobre a visita, movimentação ou conferência das informações."
            />
          </Field>
        </div>
      </SectionCard>

      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/50 to-lime-50/70 px-6 py-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Documento pronto para geração
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Revise os dados preenchidos e gere o PDF final da declaração.
            </p>
          </div>

          <button
            onClick={gerar}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary"
          >
            <FaFilePdf />
            Gerar PDF
          </button>
        </div>
      </section>
    </div>
  );
}