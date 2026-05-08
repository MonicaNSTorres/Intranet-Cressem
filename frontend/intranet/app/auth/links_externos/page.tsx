"use client";

import { FaExternalLinkAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { LinksExternos } from "@/components/links-externos/links-externos";

export default function LinksExternosPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="mt-4 flex items-center gap-3">
             <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-00 shadow-sm">
              <FaExternalLinkAlt size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Links Externos
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Acesse rapidamente portais, sistemas internos e ferramentas externas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <LinksExternos />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Utilize a busca ou os filtros para localizar rapidamente o acesso desejado.
      </div>
    </div>
  );
}