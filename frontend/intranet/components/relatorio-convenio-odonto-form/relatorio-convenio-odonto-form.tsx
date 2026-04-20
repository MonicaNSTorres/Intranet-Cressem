"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { FaDownload, FaFileCsv, FaUsers, FaBirthdayCake, FaMoneyBillWave, FaFileInvoiceDollar } from "react-icons/fa";
import {
  downloadCsvContratantesOdonto,
  downloadCsvHistoricoCustoOdonto,
  downloadCsvMaiorIdadeOdonto,
  downloadCsvFolhaOdonto,
} from "@/services/relatorio_convenio_odonto.service";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-emerald-200 bg-linear-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ReportButton({
  title,
  subtitle,
  icon,
  onClick,
  loading,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex min-h-29.5 w-full flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-secondary transition group-hover:bg-primary">
        {icon}
      </div>

      <div className="space-y-3">
        <h4 className="text-md font-semibold text-slate-800 mt-3">{title}</h4>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="inline-flex items-center gap-2 mt-3 text-md font-semibold text-secondary">
        <FaDownload size={12} />
        {loading ? "Baixando..." : "Baixar CSV"}
      </div>
    </button>
  );
}

export function RelatorioConvenioOdontoForm() {
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [loadingContratantes, setLoadingContratantes] = useState(false);
  const [loadingMaiorIdade, setLoadingMaiorIdade] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [loadingFolha, setLoadingFolha] = useState(false);

  async function baixarContratantes() {
    try {
      setErro("");
      setInfo("");
      setLoadingContratantes(true);

      await downloadCsvContratantesOdonto();

      setInfo("Relatório de contratantes baixado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível baixar o relatório de contratantes."
      );
    } finally {
      setLoadingContratantes(false);
    }
  }

  async function baixarMaiorIdade() {
    try {
      setErro("");
      setInfo("");
      setLoadingMaiorIdade(true);

      await downloadCsvMaiorIdadeOdonto();

      setInfo("Relatório de maior idade baixado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível baixar o relatório de maior idade."
      );
    } finally {
      setLoadingMaiorIdade(false);
    }
  }

  async function baixarHistoricoCusto() {
    try {
      setErro("");
      setInfo("");
      setLoadingHistorico(true);

      await downloadCsvHistoricoCustoOdonto();

      setInfo("Relatório de histórico de custo baixado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível baixar o relatório de histórico de custo."
      );
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function baixarFolha() {
    try {
      setErro("");
      setInfo("");
      setLoadingFolha(true);

      await downloadCsvFolhaOdonto();

      setInfo("Relatório de folha de pagamento baixado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível baixar o relatório de folha de pagamento."
      );
    } finally {
      setLoadingFolha(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Exportação de relatórios
            </h2>
            <p className="text-sm text-slate-500">
              Escolha abaixo o relatório desejado para download.
            </p>
          </div>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}
      </div>

      <Section title="Dados">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReportButton
            title="Relatório Contratantes"
            subtitle="Exporta os contratantes e vinculados do convênio odontológico."
            icon={<FaUsers size={16} />}
            onClick={baixarContratantes}
            loading={loadingContratantes}
          />

          <ReportButton
            title="Relatório Maior Idade"
            subtitle="Exporta os conveniados próximos da maioridade."
            icon={<FaBirthdayCake size={16} />}
            onClick={baixarMaiorIdade}
            loading={loadingMaiorIdade}
          />
        </div>
      </Section>

      <Section title="Custo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReportButton
            title="Relatório de Histórico de Custo"
            subtitle="Exporta o histórico de custos dos convênios odontológicos."
            icon={<FaMoneyBillWave size={16} />}
            onClick={baixarHistoricoCusto}
            loading={loadingHistorico}
          />

          <ReportButton
            title="Relatório Folha de Pagamento"
            subtitle="Exporta os valores consolidados para desconto em folha."
            icon={<FaFileInvoiceDollar size={16} />}
            onClick={baixarFolha}
            loading={loadingFolha}
          />
        </div>
      </Section>
    </div>
  );
}