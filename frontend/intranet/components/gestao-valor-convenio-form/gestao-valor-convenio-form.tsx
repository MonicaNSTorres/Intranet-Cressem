"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
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
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

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
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--title)]">Editar informações</h3>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Atualize o valor e a data de vigência do plano selecionado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:border-red-600 hover:bg-red-600 hover:text-white"
          >
            <FaTimes size={14} />
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

        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSave />
            {saving ? "Salvando..." : "Editar"}
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
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              Planos e valores vigentes
            </h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
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
                <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-[#006f65]">
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                <thead>
                  <tr className="bg-primary/10 text-left text-xs font-bold uppercase tracking-[0.03em] text-[#006f65]">
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
                          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-4 text-xs font-semibold text-secondary shadow-sm transition hover:bg-secondary hover:text-white"
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