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

export function onlyCpfCnpjChars(v: string) {
  return (v || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function formatCpfCnpjView(v: string) {
  const s = onlyCpfCnpjChars(v).slice(0, 14);

  if (s.length > 11 || /[A-Z]/.test(s)) {
    if (s.length <= 2) return s;
    if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`;
    if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`;
    if (s.length <= 12) {
      return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`;
    }
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
  }

  return formatCpfView(s);
}
