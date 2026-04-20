"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buscarPopupPendenteMe,
  responderPopupAviso,
  type PopupAviso,
} from "@/services/popup_aviso.service";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaImage,
  FaTimes,
} from "react-icons/fa";

type PopupAvisoComImagem = PopupAviso & {
  IMAGEM_BASE64?: string | null;
};

export function PopupAvisoGate() {
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<PopupAvisoComImagem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await buscarPopupPendenteMe();

        if (!active) return;

        if (data.temPopupPendente && data.popup) {
          setPopup(data.popup as PopupAvisoComImagem);
        } else {
          setPopup(null);
        }
      } catch (error) {
        console.error("Erro ao carregar popup pendente:", error);
        setPopup(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (popup) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [popup, mounted]);

  async function handleResposta(resposta: "ACEITO" | "RECUSADO") {
    if (!popup) return;

    try {
      setSubmitting(true);

      await responderPopupAviso({
        idPopup: popup.ID_POPUP,
        resposta,
      });

      setPopup(null);
    } catch (error) {
      console.error("Erro ao responder popup:", error);
      alert("Não foi possível registrar sua resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  const imagemValida = useMemo(() => {
    if (!popup?.IMAGEM_BASE64) return "";
    return String(popup.IMAGEM_BASE64).trim();
  }, [popup]);

  if (!mounted) return null;

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-2147483647 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-gray-600">Carregando intranet...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!popup) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647]"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[5px]" />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[90vh] overflow-y-auto">
            {imagemValida ? (
              <div className="relative h-55 w-full overflow-hidden bg-slate-100">
                <img
                  src={imagemValida}
                  alt="Imagem do aviso"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow">
                  <FaImage className="text-[#00AE9D]" />
                  Aviso institucional
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-200 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                    <FaExclamationCircle size={22} />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                      Aviso importante
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Confirmação necessária para continuar
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-6">
              <div className="flex items-start gap-3">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C7D300]/25 text-slate-700 md:flex">
                  <FaExclamationCircle size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                    Aviso importante
                  </p>

                  <h2 className="text-2xl font-bold leading-tight text-slate-800">
                    {popup.TITULO}
                  </h2>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                      {popup.MENSAGEM}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 px-4 py-3">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <FaCheckCircle className="mt-0.5 shrink-0 text-[#79B729]" />
                  <span>
                    Para continuar utilizando a intranet, escolha uma das opções abaixo.
                    Sua resposta será registrada automaticamente.
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleResposta("RECUSADO")}
                  disabled={submitting}
                  className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <FaTimes />
                  {popup.BOTAO_RECUSAR || "Recusar"}
                </button>

                <button
                  type="button"
                  onClick={() => handleResposta("ACEITO")}
                  disabled={submitting}
                  className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <FaCheckCircle />
                  {popup.BOTAO_ACEITAR || "Aceitar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}