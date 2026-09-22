"use client";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function InvestmentResult(props: {
  name: string;
  amount: number;
  interestAmount?: number;
  taxAmount?: number;
  taxPercentage?: number;
  iofAmount?: number;
  loading?: boolean;
}) {
  const { name, amount, interestAmount, taxAmount, taxPercentage, iofAmount, loading } = props;

  const total =
    typeof interestAmount === "number"
      ? amount + (interestAmount - (taxAmount ?? 0))
      : undefined;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#00AE9D]/30 hover:bg-[#00AE9D]/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-900">{name}</div>
          <div className="mt-1 text-xs font-medium text-slate-600">
            Principal: <span className="font-semibold text-slate-800">{money(amount)}</span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Carregando…
          </div>
        ) : (
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total estimado
            </div>
            <div className="text-lg font-black text-[#006f65]">
              {typeof total === "number" ? money(total) : "—"}
            </div>
          </div>
        )}
      </div>

      {!loading && typeof interestAmount === "number" && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-4">
          <Line label="Rendimento" value={money(interestAmount)} />

          {typeof iofAmount === "number" && (
            <Line label="IOF" value={money(iofAmount)} />
          )}

          {typeof taxAmount === "number" && (
            <Line
              label={`IR${typeof taxPercentage === "number" ? ` (${taxPercentage}%)` : ""}`}
              value={money(taxAmount)}
            />
          )}

          <Line label="Líquido" value={money(interestAmount - (taxAmount ?? 0))} />
        </div>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-black text-slate-900">{value}</div>
    </div>
  );
}