"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { FaDownload, FaInfoCircle, FaPlus, FaSearch } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  buscarConvenioPorCpfTitular,
  downloadCsvPessoasOdontologicasTitular,
  type PessoaOdonto,
} from "@/services/convenio_odonto.service";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function isValidCpf(cpf: string) {
  const value = onlyDigits(cpf);
  if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(value[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(value[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;

  return rest === Number(value[10]);
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const inputBase =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

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

function InfoModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: PessoaOdonto | null;
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Outras Informações</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field label="Nascimento">
            <input
              readOnly
              value={String(item.DT_NASCIMENTO || "").slice(0, 10)}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>

          <Field label="Nome da Mãe">
            <input
              readOnly
              value={item.NM_MAE || ""}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>

          <Field label="Cidade">
            <input
              readOnly
              value={item.NM_CIDADE || ""}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function ConvenioOdontoConsultaForm() {
  const router = useRouter();

  const [cpf, setCpf] = useState("");
  const [convenioNome, setConvenioNome] = useState("");
  const [mostrarApenasAtivos, setMostrarApenasAtivos] = useState<"" | "1" | "0">("");
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingBaixar, setLoadingBaixar] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [items, setItems] = useState<PessoaOdonto[]>([]);
  const [itemModal, setItemModal] = useState<PessoaOdonto | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const cpfBusca = onlyDigits(cpf);

  const itemsFiltrados = useMemo(() => {
    if (mostrarApenasAtivos === "1") {
      return items.filter((item) => Number(item.SN_ATIVO || 0) === 1);
    }

    if (mostrarApenasAtivos === "0") {
      return items;
    }

    return [];
  }, [items, mostrarApenasAtivos]);

  const gastoMensal = useMemo(() => {
    return itemsFiltrados.reduce((acc, item) => {
      if (Number(item.SN_ATIVO || 0) !== 1) return acc;
      return acc + Number(item.VL_AJUSTE || 0);
    }, 0);
  }, [itemsFiltrados]);

  function abrirModal(item: PessoaOdonto) {
    setItemModal(item);
    setOpenModal(true);
  }

  function fecharModal() {
    setOpenModal(false);
    setItemModal(null);
  }

  async function onBuscar() {
    try {
      setErro("");
      setInfo("");
      setConvenioNome("");
      setItems([]);

      if (!cpfBusca) {
        setErro("Informe o CPF do titular.");
        return;
      }

      if (!isValidCpf(cpfBusca)) {
        setErro("Informe um CPF válido.");
        return;
      }

      if (!mostrarApenasAtivos) {
        setErro("Selecione se deseja mostrar apenas conveniados ativos ou não.");
        return;
      }

      setLoadingBuscar(true);

      const response = await buscarConvenioPorCpfTitular(cpfBusca);

      if (!response || response.length === 0) {
        setErro("Não foi encontrado nenhum registro associado ao CPF solicitado.");
        return;
      }

      setItems(response);
      setConvenioNome(response[0]?.DESC_CONVENIO || "");
      setInfo("Consulta realizada com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Ocorreu um erro ao buscar os dados. Tente novamente."
      );
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function onBaixarCsv() {
    try {
      if (!cpfBusca) {
        setErro("Informe um CPF do titular para baixar o relatório.");
        return;
      }

      setLoadingBaixar(true);
      await downloadCsvPessoasOdontologicasTitular(cpfBusca);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error || "Não foi possível baixar o relatório CSV."
      );
    } finally {
      setLoadingBaixar(false);
    }
  }

  function irParaCadastroDependente() {
    if (!cpfBusca) {
      setErro("Informe o CPF do titular antes de cadastrar dependente.");
      return;
    }

    router.push(`/auth/cadastro_convenio_odonto?cpf=${cpfBusca}`);
  }

  return (
    <>
      <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px_220px]">
            <Field label="CPF do titular">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <input
                  value={formatCpf(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className={inputBase}
                  inputMode="numeric"
                  maxLength={14}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onBuscar();
                  }}
                />

                <button
                  type="button"
                  onClick={onBuscar}
                  disabled={loadingBuscar}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSearch />
                  {loadingBuscar ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </Field>

            <Field label="Convênio">
              <input
                readOnly
                value={convenioNome}
                className={`${inputBase} bg-slate-50`}
              />
            </Field>

            <Field label="Ação">
              <button
                type="button"
                onClick={irParaCadastroDependente}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              >
                <FaPlus />
                Cadastrar dependente
              </button>
            </Field>
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

        <Section title="Filtros da Consulta">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <span className="text-sm font-medium text-slate-700">
              Deseja mostrar apenas conveniados ativos?
            </span>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="ativos"
                value="1"
                checked={mostrarApenasAtivos === "1"}
                onChange={() => setMostrarApenasAtivos("1")}
                className="h-4 w-4 accent-emerald-600"
              />
              Sim
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="ativos"
                value="0"
                checked={mostrarApenasAtivos === "0"}
                onChange={() => setMostrarApenasAtivos("0")}
                className="h-4 w-4 accent-emerald-600"
              />
              Não
            </label>
          </div>
        </Section>

        {itemsFiltrados.length > 0 && (
          <>
            <Section title="Conveniados">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                      <th className="border-b border-slate-200 px-4 py-3">Nome</th>
                      <th className="border-b border-slate-200 px-4 py-3">CPF Pessoa</th>
                      <th className="border-b border-slate-200 px-4 py-3">Cod. Cartão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Parentesco</th>
                      <th className="border-b border-slate-200 px-4 py-3">Plano</th>
                      <th className="border-b border-slate-200 px-4 py-3">Inclusão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Exclusão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center">Info</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-sm text-slate-700">
                    {itemsFiltrados.map((item, index) => (
                      <tr
                        key={`${item.ID_CONVENIO_PESSOAS || index}-${item.NR_CPF_USUARIO}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.NM_USUARIO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatCpf(item.NR_CPF_USUARIO || "")}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.CD_CARTAO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.DESC_PARENTESCO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.NM_FATOR_AJUSTE || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(item.DT_INCLUSAO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(item.DT_EXCLUSAO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {fmtBRL(Number(item.VL_AJUSTE || 0))}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => abrirModal(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm transition hover:bg-sky-700"
                            title="Ver mais informações"
                          >
                            <FaInfoCircle size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Totais e Relatório">
              <div className="grid gap-4 md:grid-cols-[320px_240px]">
                <Field label="Gasto total mensal">
                  <input
                    readOnly
                    value={fmtBRL(gastoMensal)}
                    className={`${inputBase} bg-slate-50 font-semibold`}
                  />
                </Field>

                <Field label="Relatório">
                  <button
                    type="button"
                    onClick={onBaixarCsv}
                    disabled={loadingBaixar}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaDownload />
                    {loadingBaixar ? "Baixando..." : "Relatório Contratantes"}
                  </button>
                </Field>
              </div>
            </Section>
          </>
        )}
      </div>

      <InfoModal open={openModal} onClose={fecharModal} item={itemModal} />
    </>
  );
}