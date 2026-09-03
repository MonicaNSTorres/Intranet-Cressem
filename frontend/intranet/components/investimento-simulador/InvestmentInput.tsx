"use client";

import type { InvestmentState, PeriodType } from "./InvestmentoSimulador";
import ProgressInput from "./ProgressInput";
import React from "react";

export default function InvestmentInput(props: {
  value: InvestmentState;
  onChange: (v: InvestmentState) => void;
  loadingIndexes: boolean;
  indexesError: string | null;
}) {
  const { value, onChange, loadingIndexes, indexesError } = props;

  const set = <K extends keyof InvestmentState>(key: K, v: InvestmentState[K]) => {
    onChange({ ...value, [key]: v });
  };

  const asNumber = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
          Parâmetros
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Ajuste os valores para simular a rentabilidade.
        </p>
      </div>

      {indexesError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {indexesError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Field label="Valor (R$)">
          <ProgressInput
            value={value.amount}
            onChange={(v) => set("amount", asNumber(v))}
            inputMode="decimal"
            placeholder="1000"
            min={0}
            max={100000}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Prazo">
            <ProgressInput
              value={value.period}
              onChange={(v) => set("period", Math.max(0, Math.floor(asNumber(v))))}
              inputMode="numeric"
              placeholder="360"
              min={0}
              max={2000}
            />
          </Field>

          <Field label="Tipo de prazo">
            <select
              value={value.periodType}
              onChange={(e) => set("periodType", e.target.value as PeriodType)}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
            >
              <option value="dias">Dias</option>
              <option value="meses">Meses</option>
              <option value="anos">Anos</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="RDC (% do CDI)">
            <ProgressInput
              value={value.cdb}
              onChange={(v) => set("cdb", asNumber(v))}
              inputMode="decimal"
              placeholder="100"
              min={0}
              max={200}
            />
          </Field>

          <Field label="LCI/LCA (% do CDI)">
            <ProgressInput
              value={value.lcx}
              onChange={(v) => set("lcx", asNumber(v))}
              inputMode="decimal"
              placeholder="100"
              min={0}
              max={200}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="CDI (anual)">
            <input
              value={value.di ?? ""}
              readOnly
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none"
              placeholder={loadingIndexes ? "Carregando..." : ""}
            />
          </Field>

          <Field label="SELIC (anual)">
            <input
              value={value.selic ?? ""}
              readOnly
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none"
              placeholder={loadingIndexes ? "Carregando..." : ""}
            />
          </Field>

          <Field label="Poupança (índice)">
            <input
              value={value.poupanca ?? ""}
              readOnly
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none"
              placeholder={loadingIndexes ? "Carregando..." : ""}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}