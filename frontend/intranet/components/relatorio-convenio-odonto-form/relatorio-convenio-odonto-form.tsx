"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { FaDownload, FaUsers, FaBirthdayCake, FaMoneyBillWave, FaFileInvoiceDollar } from "react-icons/fa";
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
        {title}
      </h3>
      {children}
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
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[var(--title)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--paragraph)]">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaDownload size={13} />
          {loading ? "Baixando..." : "Baixar CSV"}
        </button>
      </div>
    </div>
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
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
            Exportação de relatórios
          </h2>
          <p className="mt-1 text-sm text-[var(--paragraph)]">
            Escolha abaixo o relatório desejado para download.
          </p>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-[#006f65]">
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