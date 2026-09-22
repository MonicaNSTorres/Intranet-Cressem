"use client";

import { Suspense } from "react";
import { FaDoorOpen } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { ConsultaSalaReuniao } from "@/components/consulta-sala-reuniao/consulta-sala-reuniao";

export default function ConsultaSalaReuniaoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaDoorOpen size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Consulta de Salas e Auditório
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Veja de forma simples quais espaços estão disponíveis ou reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div>Carregando...</div>}>
          <ConsultaSalaReuniao />
        </Suspense>
      </div>
    </div>
  );
}