import type { PeriodType } from "./InvestmentoSimulador";

const periodMultiplier: Record<PeriodType, number> = {
  dias: 1,
  meses: 365 / 12,
  anos: 365,
};

export function computedDurationDays(period: number, periodType: PeriodType) {
  const mult = periodMultiplier[periodType] ?? 1;
  return Math.floor(period * mult);
}