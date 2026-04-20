"use client";

import { FileSearch } from "lucide-react";
import BackButton from "@/components/back-button/back-button";
import { GrDocumentMissingForm } from "@/components/docusign-form/docusign-form";

export default function GrDocumentMissingPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
              <FileSearch size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate">
                Dashboard DocuSign
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Consulte documentos, localize envelopes e abra ou baixe os PDFs com facilidade.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GrDocumentMissingForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os arquivos são consultados na base interna e disponibilizados para abertura ou download conforme o envelope selecionado.
      </div>
    </div>
  );
}