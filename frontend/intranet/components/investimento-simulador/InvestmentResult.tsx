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
    <div className="border rounded-xl p-4 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-600 mt-1">
            Principal: <span className="font-medium">{money(amount)}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-gray-500">Carregando…</div>
        ) : (
          <div className="text-right">
            <div className="text-xs text-gray-600">Total estimado</div>
            <div className="text-base font-semibold text-gray-900">
              {typeof total === "number" ? money(total) : "—"}
            </div>
          </div>
        )}
      </div>

      {!loading && typeof interestAmount === "number" && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
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
    <div className="bg-white rounded-lg border p-2">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}