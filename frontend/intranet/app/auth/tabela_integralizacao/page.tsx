"use client";

import { FaTable } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";

export default function IntegralizacaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaTable size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Tabela de Integralização
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Valores de integralização para pessoa física.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border rounded-xl shadow-sm p-6">

        <p className="text-md mb-4">
          <span className="font-semibold">Taxa de Manutenção:</span> R$ 12,70
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full border text-md text-center">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">
                  Nível de integralização
                </th>
                <th className="p-2 border">
                  Valor da integralização (R$)
                </th>
              </tr>
            </thead>

            <tbody>
              {[
                ["1", "27,32"],
                ["2", "36,54"],
                ["3", "51,09"],
                ["4", "82,37"],
                ["5", "111,47"],
                ["6", "140,53"],
                ["7", "162,28"],
                ["8", "221,95"],
                ["9", "256,13"],
                ["10", "303,41"],
                ["11", "383,00"],
                ["12", "523,17"],
                ["13", "628,27"],
                ["14", "837,11"],
                ["15", "1.149,49"],
              ].map(([nivel, valor]) => (
                <tr key={nivel} className="hover:bg-gray-50">
                  <td className="p-2 border font-mono">{nivel}</td>
                  <td className="p-2 border">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Valores definidos conforme tabela oficial de integralização para pessoa física.
      </div>
    </div>
  );
}