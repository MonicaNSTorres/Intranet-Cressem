export function parsePeriodo(data?: string) {
  if (!data) return null;

  try {
    const [ini, fim] = data.split("|");

    const toDate = (v: string) => {
      if (v.includes("-")) {
        const [y, m, d] = v.split("-");
        return new Date(Number(y), Number(m) - 1, Number(d));
      }

      const [d, m, y] = v.split("/");
      return new Date(Number(y), Number(m) - 1, Number(d));
    };

    const dtIni = toDate(ini);
    const dtFim = toDate(fim);

    const format = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    return {
      dt_inicio: format(dtIni),
      dt_fim: format(dtFim),
      nr_mes: dtIni.getMonth() + 1,
    };
  } catch {
    return null;
  }
}