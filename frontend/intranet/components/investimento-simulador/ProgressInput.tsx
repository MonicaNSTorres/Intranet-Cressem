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
      {/*barra verde*/}
      <div
        className="absolute inset-y-0 left-0 rounded-md bg-secondary/70 pointer-events-none transition-all duration-300"
        style={{ width: `${p}%` }}
      />
      {/*mask*/}
      <div className="absolute inset-0 rounded-md ring-1 ring-black/10 pointer-events-none" />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        className={[
          "relative z-10 w-full rounded-md border bg-transparent px-3 py-2",
          "focus:outline-none focus:ring-2 focus:ring-secondary-300",
          "disabled:bg-gray-50 disabled:text-gray-500",
        ].join(" ")}
      />
    </div>
  );
}