"use client";

import React from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percentFromValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

export default function ProgressInput(props: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  disabled?: boolean;
  min?: number;
  max?: number;
  percent?: number;
}) {
  const {
    value,
    onChange,
    placeholder,
    inputMode,
    maxLength,
    disabled,
    min = 0,
    max = 100,
    percent,
  } = props;

  const numeric = Number(String(value).replace(",", "."));
  const p = typeof percent === "number" ? percent : percentFromValue(numeric, min, max);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-[#00AE9D]/25 to-[#79B729]/30 transition-all duration-300"
        style={{ width: `${p}%` }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-slate-200" />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        className={[
          "relative z-10 h-10 w-full rounded-xl border border-transparent bg-transparent px-3 text-sm font-semibold text-slate-800 shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-[#00AE9D]/15",
          "disabled:bg-slate-50 disabled:text-slate-500",
        ].join(" ")}
      />
    </div>
  );
}