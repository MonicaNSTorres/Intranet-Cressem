"use client";

import { FaTable } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { VALORES_INTEGRALIZACAO } from "@/config/integralizacao";

export default function IntegralizacaoPage() {
  return (
    <main className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaTable size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Tabela de Integralização
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Valores de integralização para pessoa física.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              Valores vigentes
            </h2>

            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Consulte o nível e o respectivo valor de integralização.
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Taxa de Manutenção
            </p>

            <p className="mt-0.5 text-base font-bold text-[var(--title)]">
              R$ 12,70
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm text-slate-700">
            <thead>
              <tr className="border-b border-primary/20 bg-primary/10 text-xs font-bold uppercase tracking-wide text-[#006f65]">
                <th className="px-4 py-3 text-center">
                  Nível de integralização
                </th>

                <th className="px-4 py-3 text-center">
                  Valor da integralização (R$)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {VALORES_INTEGRALIZACAO.map(({ nivel, valor }) => (
                <tr key={nivel} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 text-center font-semibold text-[var(--title)]">
                    {nivel}
                  </td>

                  <td className="px-4 py-3 text-center font-medium">
                    {valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        * Valores definidos conforme tabela oficial de integralização para
        pessoa física.
      </p>
    </main>
  );
}