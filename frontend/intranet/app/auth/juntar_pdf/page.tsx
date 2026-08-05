"use client";

import { FaFilePdf } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { JuntarPdfForm } from "@/components/juntar-pdf-form/juntar-pdf-form";

export default function JuntarPdfPage() {
  return (
    <div className="p-6 lg:p-8">
      <BackButton />

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7D300] text-[#003641] shadow-sm">
            <FaFilePdf size={18} />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-gray-900">
              Juntar PDFs
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Adicione, organize e gere um único PDF final de forma rápida e
              prática.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <JuntarPdfForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os arquivos PDF são enviados para processamento no backend e o
        download é iniciado automaticamente após a geração.
      </div>
    </div>
  );
}
