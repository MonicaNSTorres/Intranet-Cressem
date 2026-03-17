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
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Parâmetros</h2>
        <p className="text-sm text-gray-600">
          Ajuste os valores para simular a rentabilidade.
        </p>
      </div>

      {indexesError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
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
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
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
              className="w-full border px-3 py-2 rounded bg-gray-50"
              placeholder={loadingIndexes ? "Carregando..." : ""}
            />
          </Field>

          <Field label="SELIC (anual)">
            <input
              value={value.selic ?? ""}
              readOnly
              className="w-full border px-3 py-2 rounded bg-gray-50"
              placeholder={loadingIndexes ? "Carregando..." : ""}
            />
          </Field>

          <Field label="Poupança (índice)">
            <input
              value={value.poupanca ?? ""}
              readOnly
              className="w-full border px-3 py-2 rounded bg-gray-50"
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
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}