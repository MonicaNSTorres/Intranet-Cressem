export function onlyDigits(s: string = "") {
  return (s || "").replace(/\D+/g, "");
}

export function normalizeCnpj(s: string = ""): string {
  const d = onlyDigits(s);
  if (!d) return "";

  if (d.length < 14) return d.padStart(14, "0");
  if (d.length > 14) return d.slice(0, 14);
  return d;
}
