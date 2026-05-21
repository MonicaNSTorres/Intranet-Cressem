"use client";

import { useRouter } from "next/navigation";
import { FaListAlt } from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import { GerenciamentoReembolsoDespesaForm } from "@/components/gerenciamento-reembolso-despesa-form/gerenciamento-reembolso-despesa-form";

export default function GerenciamentoReembolsoDespesaPage() {
  const router = useRouter();

  const handleNovaSolicitacao = () => {
    router.push("/auth/cadastro_reembolso_despesa");
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700 shadow">
              <FaListAlt size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Gerenciamento de Reembolso de Despesas
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Consulte, acompanhe, analise e conclua solicitações de reembolso.
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleNovaSolicitacao}
            className="rounded-lg bg-secondary px-6 py-2 text-md font-semibold text-white shadow hover:bg-primary cursor-pointer"
          >
            Nova Solicitação
          </button>

          <button
            type="button"
            onClick={async () => {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/v1/error-logs`,
                {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    USERNAME: "TESTE",
                    NOME_COMPLETO: "Usuário Teste",
                    EMAIL: "teste@teste.com",
                    DEPARTMENT: "TI",
                    PAGE_URL: window.location.href,
                    ERROR_MESSAGE: "Teste manual de erro da intranet",
                    ERROR_STACK: "Stack manual de teste",
                    ERROR_DETAIL: {
                      tela: "gerenciamento_reembolso_despesa",
                    },
                    SOURCE: "TESTE_MANUAL",
                  }),
                }
              );

              const data = await response.json();
              console.log("Resposta log:", data);
            }}
          >
            Testar log manual
          </button>
        </div>
      </div>

      <div className="mt-6">
        <GerenciamentoReembolsoDespesaForm />
      </div>

      <div className="mt-8 text-xs text-gray-500">
        * Os dados da listagem, pareceres e andamento serão carregados via intranet-api.
      </div>
    </div>
  );
}