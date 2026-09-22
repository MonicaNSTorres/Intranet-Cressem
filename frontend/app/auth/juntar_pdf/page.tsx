"use client";

import { FaFilePdf } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { JuntarPdfForm } from "@/components/juntar-pdf-form/juntar-pdf-form";

export default function JuntarPdfPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FaFilePdf size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Juntar PDFs
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Adicione, organize e gere um único PDF final de forma rápida e prática.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <JuntarPdfForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os arquivos PDF são enviados para processamento no backend e o download é iniciado automaticamente após a geração.
      </div>
    </div>
  );
}