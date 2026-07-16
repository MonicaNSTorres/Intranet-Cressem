"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaBolt,
  FaClock,
  FaGavel,
  FaSearch,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

import { listarLeiloes, type Leilao } from "@/services/leiloes.service";

export function LeiloesAoVivoLista() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [leiloes, setLeiloes] = useState<Leilao[]>([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setMensagem("");

      const result = await listarLeiloes({
        busca,
        status: "EM_ANDAMENTO",
        page: 1,
        limit: 50,
      });

      setLeiloes(result.data);
    } catch (error: any) {
      console.error(error);
      setMensagem(
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        "Não foi possível carregar os leilões disponíveis."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarBusca() {
    carregar();
  }

  function formatCurrency(value: any) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const totalLanceAtual = useMemo(() => {
    return leiloes.reduce(
      (acc, item) => acc + Number(item.VL_LANCE_ATUAL || item.VL_INICIAL || 0),
      0
    );
  }, [leiloes]);

  return (
    <div className="space-y-6">
      {mensagem && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {mensagem}
        </div>
      )}

      {/*<div className="grid gap-4 md:grid-cols-3">
        <ResumoCard
          label="Ao vivo agora"
          value={String(leiloes.length)}
          detail="Leilões em andamento"
          icon={<FaBolt />}
        />

        <ResumoCard
          label="Lances atuais"
          value={formatCurrency(totalLanceAtual)}
          detail="Somatório dos valores atuais"
          icon={<FaTrophy />}
        />

        <ResumoCard
          label="Participação"
          value="Aberto"
          detail="Funcionários podem dar lances"
          icon={<FaUsers />}
        />
      </div>*/}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm md:col-span-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                Regras para participação
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                Cada colaborador só poderá adquirir um equipamento.<br/>
                O pagamento é a vista e será exclusivamente via PIX na conta informada pela coperativa.<br/>
                Após o encerramento do leilão, o colaborador terá até 3 dias úteis para realizar o pagamento.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-100 lg:max-w-md">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Quem pode participar
              </p>

              <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
                <li>• Colaboradores com no mínimo 12 meses de vínculo com a cooperativa.</li>
                <li>• Colaboradores sem pendências na cooperativa.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                🟢 Leilões disponíveis
              </div>

              <h2 className="text-2xl font-black text-slate-900">
                Escolha um produto para participar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Acompanhe o lance atual, veja o encerramento e participe em tempo real.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-96">
                <FaSearch className="absolute left-4 top-4 text-slate-400" />

                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") aplicarBusca();
                  }}
                  placeholder="Buscar por produto ou descrição..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <button
                type="button"
                onClick={aplicarBusca}
                disabled={loading}
                className="rounded-2xl bg-secondary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Carregando leilões disponíveis...
            </div>
          ) : leiloes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <FaGavel className="mx-auto mb-3 text-4xl text-slate-300" />

              <p className="text-base font-black text-slate-700">
                Nenhum leilão disponível no momento.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Quando houver um produto em andamento, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
              {leiloes.map((item) => {
                const lanceAtual = Number(item.VL_LANCE_ATUAL || item.VL_INICIAL || 0);

                return (
                  <div
                    key={item.ID_LEILAO}
                    className="group overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative bg-linear-to-br from-emerald-50 via-white to-lime-50 p-5">
                      <div className="absolute right-4 top-4 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-primary">
                        Ao vivo
                      </div>

                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-primary shadow-sm ring-1 ring-slate-100">
                        <FaGavel size={24} />
                      </div>

                      <h3 className="line-clamp-2 pr-20 text-xl font-black text-slate-900">
                        {item.NM_PRODUTO}
                      </h3>

                      <p className="mt-3 line-clamp-3 min-h-16 text-sm leading-6 text-slate-500">
                        {item.DS_PRODUTO || "Produto disponível para leilão."}
                      </p>
                    </div>

                    <div className="p-5">
                      <div className="rounded-3xl bg-emerald-50 p-5 text-center ring-1 ring-emerald-100">
                        <p className="text-xs font-black uppercase tracking-wider text-primary">
                          Lance atual
                        </p>

                        <p className="mt-2 text-3xl font-black text-primary">
                          {formatCurrency(lanceAtual)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                            <FaTrophy className="text-orange-500" />
                            Valor inicial
                          </span>

                          <span className="font-black text-slate-800">
                            {formatCurrency(item.VL_INICIAL)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                            <FaClock className="text-blue-500" />
                            Encerramento
                          </span>

                          <span className="text-right font-black text-slate-800">
                            {item.DT_FIM}
                          </span>
                        </div>

                        {item.NM_USUARIO_GANHANDO && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-bold text-slate-500">
                              Liderando
                            </span>

                            <span className="max-w-36 truncate text-right font-black text-slate-800">
                              {item.NM_USUARIO_GANHANDO}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/auth/leiloes_ao_vivo/${item.ID_LEILAO}`)
                        }
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-black text-white shadow-lg shadow-primary/20 transition group-hover:bg-secondary hover:-translate-y-0.5 cursor-pointer"
                      >
                        <FaGavel />
                        Participar do leilão
                      </button>
                    </div>
                  </div>
                );
              })}
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

          <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>

          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600">
          {icon}
        </div>
      </div>
    </div>
  );
}