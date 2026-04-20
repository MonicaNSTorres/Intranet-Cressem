"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaSave } from "react-icons/fa";
import {
  atualizarFatorAjusteOdonto,
  listarFatoresAjusteOdonto,
  type FatorAjusteOdontoItem,
} from "@/services/gestao_valor_convenio.service";

function monetizarDigitacao(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  const number = Number(digits || 0) / 100;

  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function convenioLabel(item: FatorAjusteOdontoItem) {
  const operadora = Number(item.ID_OPERADORA || item.CONVENIO_FATOR_AJUSTE_HISTORICO || 0);

  if (operadora === 1) return "Uniodonto";
  if (operadora === 2) return "HapVida";

  return `Convênio ${operadora}`;
}

const inputBase =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

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

function EditarConvenioModal({
  open,
  item,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  item: FatorAjusteOdontoItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { valor: string; dataVigencia: string }) => Promise<void>;
}) {
  const [valor, setValor] = useState("");
  const [dataVigencia, setDataVigencia] = useState("");

  useEffect(() => {
    if (!item) return;
    setValor(
      Number(item.VL_AJUSTE || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setDataVigencia(String(item.DT_VIGENCIA || "").slice(0, 10));
  }, [item]);

  if (!open || !item) return null;

  async function handleSave() {
    await onSave({ valor, dataVigencia });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Editar informações</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field label="Convênio">
            <input readOnly value={convenioLabel(item)} className={`${inputBase} bg-slate-50`} />
          </Field>

          <Field label="Plano">
            <input
              readOnly
              value={item.NM_FATOR_AJUSTE || ""}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>

          <Field label="Valor">
            <input
              value={valor}
              onChange={(e) => setValor(monetizarDigitacao(e.target.value))}
              className={inputBase}
            />
          </Field>

          <Field label="Data de Vigência">
            <input
              type="date"
              value={dataVigencia}
              onChange={(e) => setDataVigencia(e.target.value)}
              className={inputBase}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSave />
            {saving ? "Salvando..." : "Editar"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function GestaoValorConvenioForm() {
  const [items, setItems] = useState<FatorAjusteOdontoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<FatorAjusteOdontoItem | null>(null);

  async function carregarDados() {
    try {
      setErro("");
      setLoading(true);

      const response = await listarFatoresAjusteOdonto();
      setItems(response || []);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error || "Não foi possível carregar os convênios."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const itensOrdenados = useMemo(() => {
    return [...items].sort((a, b) => {
      const convA = convenioLabel(a);
      const convB = convenioLabel(b);
      return `${convA}-${a.NM_FATOR_AJUSTE}`.localeCompare(
        `${convB}-${b.NM_FATOR_AJUSTE}`,
        "pt-BR"
      );
    });
  }, [items]);

  function abrirModal(item: FatorAjusteOdontoItem) {
    setItemSelecionado(item);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setItemSelecionado(null);
  }

  async function salvarEdicao(payload: { valor: string; dataVigencia: string }) {
    try {
      if (!itemSelecionado) return;

      setErro("");
      setInfo("");

      if (!payload.valor) {
        setErro("Informe o valor do convênio.");
        return;
      }

      if (!payload.dataVigencia) {
        setErro("Informe a data de vigência.");
        return;
      }

      setSaving(true);

      await atualizarFatorAjusteOdonto(
        Number(itemSelecionado.ID_CONVENIO_FATOR_AJUSTE),
        {
          ID_CONVENIO_FATOR_AJUSTE: Number(itemSelecionado.ID_CONVENIO_FATOR_AJUSTE),
          NM_FATOR_AJUSTE: itemSelecionado.NM_FATOR_AJUSTE,
          VL_AJUSTE: parseBRL(payload.valor),
          DT_VIGENCIA: payload.dataVigencia,
        }
      );

      setInfo("Convênio atualizado com sucesso.");
      fecharModal();
      await carregarDados();
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          "Não foi possível atualizar o valor do convênio."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-800">
              Planos e valores vigentes
            </h2>
            <p className="text-sm text-slate-500">
              Edite os fatores de ajuste de cada plano odontológico.
            </p>
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

        <Section title="Tabela de Convênios">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Carregando convênios...
            </div>
          ) : itensOrdenados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum convênio encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                    <th className="border-b border-slate-200 px-4 py-3">Convênio</th>
                    <th className="border-b border-slate-200 px-4 py-3">Plano</th>
                    <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                    <th className="border-b border-slate-200 px-4 py-3">Vigência</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>

                <tbody className="bg-white text-sm text-slate-700">
                  {itensOrdenados.map((item) => (
                    <tr
                      key={item.ID_CONVENIO_FATOR_AJUSTE}
                      className="hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        {convenioLabel(item)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.NM_FATOR_AJUSTE}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        {fmtBRL(Number(item.VL_AJUSTE || 0))}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        {formatDateBR(item.DT_VIGENCIA)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => abrirModal(item)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-third cursor-pointer"
                        >
                          <FaEdit size={13} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <EditarConvenioModal
        open={modalOpen}
        item={itemSelecionado}
        saving={saving}
        onClose={fecharModal}
        onSave={salvarEdicao}
      />
    </>
  );
}