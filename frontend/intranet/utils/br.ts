export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function hojeBR() {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtBRL(n: number) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function monetizarDigitacao(v: string) {
  const only = (v || "").replace(/[^\d]/g, "");
  if (!only) return "";
  const n = Number(only) / 100;
  return fmtBRL(n);
}

export function parseBRL(v: string) {
  return (
    Number((v || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0
  );
}

export function formatCpfView(v: string) {
  const s = (v || "").replace(/\D/g, "").slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

export function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}