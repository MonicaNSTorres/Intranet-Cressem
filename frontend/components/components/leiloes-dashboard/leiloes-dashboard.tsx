"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  FaChartLine,
  FaClock,
  FaGavel,
  FaMedal,
  FaMoneyBillWave,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buscarDashboardLeiloes } from "@/services/leiloes.service";

function formatCurrency(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const STATUS_COLORS = ["#00AE9D", "#2563eb", "#f59e0b"];

export function LeiloesDashboard() {
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);

  async function carregar() {
    try {
      setLoading(true);
      setMensagem("");

      const data = await buscarDashboardLeiloes();
      setDashboard(data);
    } catch (error: any) {
      console.error(error);
      setMensagem(
        error?.response?.data?.details ||
          error?.response?.data?.error ||
          "Não foi possível carregar o dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Carregando dashboard de leilões...
      </div>
    );
  }

  if (mensagem) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        {mensagem}
      </div>
    );
  }

  const resumo = dashboard?.resumo || {};
  const indicadores = dashboard?.indicadores || {};
  const graficos = dashboard?.graficos || {};
  const produtoMaisDisputado = dashboard?.produtoMaisDisputado;
  const ultimosFinalizados = dashboard?.ultimosFinalizados || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Total de leilões" value={resumo.totalLeiloes || 0} detail="Cadastrados na intranet" icon={<FaGavel />} />
        <ResumoCard label="Em andamento" value={resumo.totalEmAndamento || 0} detail="Disponíveis para lance" icon={<FaClock />} />
        <ResumoCard label="Finalizados" value={resumo.totalFinalizados || 0} detail="Leilões encerrados" icon={<FaTrophy />} />
        <ResumoCard label="Participantes" value={indicadores.participantesUnicos || 0} detail="Usuários únicos" icon={<FaUsers />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <IndicadorGrande label="Valor movimentado" value={formatCurrency(indicadores.valorMovimentado)} detail="Soma dos lances vencedores" icon={<FaMoneyBillWave />} />
        <IndicadorGrande label="Total de lances" value={String(indicadores.totalLances || 0)} detail="Todos os lances registrados" icon={<FaChartLine />} />
        <IndicadorGrande label="Maior lance" value={formatCurrency(indicadores.maiorLance)} detail="Maior valor ofertado" icon={<FaMedal />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Distribuição por status" subtitle="Quantidade de leilões por situação.">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={graficos.status || []}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
              >
                {(graficos.status || []).map((_: any, index: number) => (
                  <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lances por dia" subtitle="Volume de lances nos últimos 30 dias.">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={graficos.lancesPorDia || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="DIA" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="TOTAL_LANCES"
                stroke="#00AE9D"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Top produtos mais disputados" subtitle="Produtos com mais lances registrados.">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={graficos.topProdutos || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="NM_PRODUTO" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="TOTAL_LANCES" fill="#00AE9D" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Valor movimentado por mês" subtitle="Soma dos lances vencedores por mês.">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={graficos.valorPorMes || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MES" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="VALOR_MOVIMENTADO" fill="#79B729" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="bg-linear-to-r from-yellow-400 to-amber-500 px-6 py-5 text-white">
            <h2 className="text-xl font-black">🏆 Produto mais disputado</h2>
            <p className="text-sm text-yellow-100">Leilão com maior número de lances.</p>
          </div>

          <div className="p-6">
            {produtoMaisDisputado ? (
              <>
                <h3 className="text-2xl font-black text-slate-900">
                  {produtoMaisDisputado.NM_PRODUTO}
                </h3>

                <div className="mt-6 grid gap-3">
                  <InfoBox label="Total de lances" value={`${produtoMaisDisputado.TOTAL_LANCES || 0}`} />
                  <InfoBox label="Maior lance" value={formatCurrency(produtoMaisDisputado.MAIOR_LANCE)} />
                  <InfoBox label="ID do leilão" value={`#${produtoMaisDisputado.ID_LEILAO}`} />
                </div>
              </>
            ) : (
              <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                Nenhum produto disputado ainda.
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">Últimos leilões encerrados</h2>
            <p className="mt-1 text-sm text-slate-500">Resultado dos últimos produtos finalizados.</p>
          </div>

          <div className="p-6">
            {ultimosFinalizados.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                Nenhum leilão encerrado encontrado.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Produto</th>
                      <th className="px-4 py-4">Vencedor</th>
                      <th className="px-4 py-4">Valor</th>
                      <th className="px-4 py-4">Fim</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {ultimosFinalizados.map((item: any) => (
                      <tr key={item.ID_LEILAO} className="bg-white">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-800">{item.NM_PRODUTO}</p>
                          <p className="text-xs text-slate-400">#{item.ID_LEILAO}</p>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-600">
                          {item.NM_USUARIO_VENCEDOR || "Sem vencedor"}
                        </td>

                        <td className="px-4 py-4 font-black text-emerald-700">
                          {formatCurrency(item.VL_LANCE_VENCEDOR)}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-500">
                          {item.DT_FIM || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-slate-500">{subtitle}</p>
      {children}
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
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function IndicadorGrande({
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
    <div className="rounded-[28px] bg-linear-to-br from-slate-900 to-slate-700 p-6 text-white shadow-sm">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-wider text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{detail}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}