"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCalendarCheck,
  FaEye,
  FaGavel,
  FaSearch,
  FaTrophy,
  FaUserCheck,
} from "react-icons/fa";
import {
  listarLeiloesFinalizados,
  type LeilaoFinalizado,
} from "@/services/leiloes.service";

function formatCurrency(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function LeiloesFinalizadosLista() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [leiloes, setLeiloes] = useState<LeilaoFinalizado[]>([]);

  async function carregar() {
    try {
      setLoading(true);
      setMensagem("");

      const result = await listarLeiloesFinalizados({
        busca,
        page: 1,
        limit: 50,
      });

      setLeiloes(result.data);
    } catch (error: any) {
      console.error(error);
      setMensagem(
        error?.response?.data?.details ||
          error?.response?.data?.error ||
          "Não foi possível carregar os leilões encerrados."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalArrecadado = leiloes.reduce(
    (acc, item) => acc + Number(item.VL_LANCE_VENCEDOR || 0),
    0
  );

  return (
    <div className="space-y-6">
      {mensagem && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {mensagem}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <ResumoCard
          label="Leilões encerrados"
          value={String(leiloes.length)}
          icon={<FaTrophy />}
          detail="Produtos finalizados"
        />

        <ResumoCard
          label="Total arrecadado"
          value={formatCurrency(totalArrecadado)}
          icon={<FaGavel />}
          detail="Somando os lances vencedores"
        />

        <ResumoCard
          label="Total de lances"
          value={String(
            leiloes.reduce((acc, item) => acc + Number(item.TOTAL_LANCES || 0), 0)
          )}
          icon={<FaUserCheck />}
          detail="Participações registradas"
        />
      </div>

      <div className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="bg-linear-to-r from-yellow-50 via-white to-emerald-50 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Histórico de arrematações
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Veja quem venceu cada leilão e por qual valor.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-96">
                <FaSearch className="absolute left-4 top-4 text-slate-400" />

                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") carregar();
                  }}
                  placeholder="Buscar produto encerrado..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                />
              </div>

              <button
                type="button"
                onClick={carregar}
                disabled={loading}
                className="rounded-2xl bg-secondary px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-primary disabled:opacity-60"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Carregando leilões encerrados...
            </div>
          ) : leiloes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <FaTrophy className="mx-auto mb-3 text-4xl text-slate-300" />

              <p className="text-base font-black text-slate-700">
                Nenhum leilão encerrado encontrado.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Quando um leilão for finalizado, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {leiloes.map((item) => (
                <div
                  key={item.ID_LEILAO}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="bg-linear-to-r from-yellow-400 to-amber-500 px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider">
                          🏆 Finalizado
                        </div>

                        <h3 className="line-clamp-2 text-xl font-black">
                          {item.NM_PRODUTO}
                        </h3>
                      </div>

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl">
                        🏆
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                      {item.DS_PRODUTO || "Produto arrematado em leilão."}
                    </p>

                    <div className="mt-5 rounded-3xl bg-emerald-50 p-5 text-center ring-1 ring-emerald-100">
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                        Lance vencedor
                      </p>

                      <p className="mt-2 text-4xl font-black text-emerald-800">
                        {formatCurrency(item.VL_LANCE_VENCEDOR)}
                      </p>

                      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                        <FaUserCheck />
                        {item.NM_USUARIO_VENCEDOR || "Sem vencedor"}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <InfoBox
                        label="Valor inicial"
                        value={formatCurrency(item.VL_INICIAL)}
                      />

                      <InfoBox
                        label="Total de lances"
                        value={`${item.TOTAL_LANCES || 0}`}
                      />

                      <InfoBox
                        label="Finalizado em"
                        value={item.DT_ATUALIZACAO || item.DT_FIM || "-"}
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                        <FaCalendarCheck className="text-yellow-600" />
                        Encerramento: {item.DT_FIM}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/auth/leiloes_ao_vivo/${item.ID_LEILAO}`)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-black text-white transition hover:bg-primary cursor-pointer"
                      >
                        <FaEye />
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumoCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>

          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-xl text-yellow-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}