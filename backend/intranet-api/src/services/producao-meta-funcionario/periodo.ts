type PeriodoParseado = {
  dt_inicio: string;
  dt_fim: string;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoToBr(value: string) {
  const [yyyy, mm, dd] = value.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export function parsePeriodo(periodo: string): PeriodoParseado | null {
  if (!periodo || !String(periodo).includes("|")) {
    return null;
  }

  const [inicioRaw, fimRaw] = String(periodo)
    .split("|")
    .map((v) => v.trim());

  if (!inicioRaw || !fimRaw) {
    return null;
  }

  if (isIsoDate(inicioRaw) && isIsoDate(fimRaw)) {
    return {
      dt_inicio: isoToBr(inicioRaw),
      dt_fim: isoToBr(fimRaw),
    };
  }

  return null;
}