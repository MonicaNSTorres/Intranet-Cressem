export function compoundInterest(amount: number, index: number, days: number): number {
  const interest = amount * Math.pow(index, days) - amount;
  return Number(interest.toFixed(2));
}

export function getIndexIR(days: number): number {
  if (days <= 180) return 22.5;
  if (days <= 360) return 20;
  if (days <= 720) return 17.5;
  return 15;
}

export function getIOFPercentage(daysToRedeem: number): number {
  const iofTable: number[] = [
    96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36,
    33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0
  ];

  if (daysToRedeem <= 30) return iofTable[Math.max(0, daysToRedeem - 1)];
  return 0;
}

export function getIOFAmount(daysToRedeem: number, interestAmount: number): number {
  const iofPercentage = getIOFPercentage(daysToRedeem);
  return interestAmount * (iofPercentage / 100);
}