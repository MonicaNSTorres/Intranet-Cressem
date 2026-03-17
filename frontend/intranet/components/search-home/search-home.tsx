"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaSearch,
  FaTimes,
  FaArrowRight,
  FaRegCompass,
  FaRegStar,
} from "react-icons/fa";

export type ScreenItem = {
  title: string;
  desc?: string;
  href: string;
  keywords?: string[];
  badge?: string;
  group?: string;//ex: 'RH', 'Financeiro'
  pinned?: boolean;//aparece em 'Favoritos'
};

function normalize(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function scoreItem(q: string, item: ScreenItem) {
  const nq = normalize(q);
  if (!nq) return 0;

  const t = normalize(item.title);
  const d = normalize(item.desc ?? "");
  const h = normalize(item.href);
  const k = normalize((item.keywords ?? []).join(" "));

  let score = 0;

  if (t === nq) score += 120;
  if (t.startsWith(nq)) score += 80;
  if (t.includes(nq)) score += 60;

  if (k.includes(nq)) score += 35;
  if (d.includes(nq)) score += 20;
  if (h.includes(nq)) score += 10;

  if (item.pinned) score += 8;

  return score;
}

export default function HomeScreenSearch({
  screens,
  placeholder = "Buscar telas… (ex: ramais, convênios, reembolso)",
  maxResults = 8,
}: {
  screens: ScreenItem[];
  placeholder?: string;
  maxResults?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const pinned = useMemo(() => screens.filter((s) => s.pinned).slice(0, 6), [screens]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const scored = screens
      .map((it) => ({ it, s: scoreItem(q, it) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, maxResults)
      .map((x) => x.it);

    return scored;
  }, [query, screens, maxResults]);

  const emptyState = query.trim().length > 0 && results.length === 0;

  function goTo(item: ScreenItem) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  function clear() {
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  //fecha ao clicar fora
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!panelRef.current) return;
      if (!panelRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  //reset do índice quando muda a lista
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  return (
    <div ref={panelRef} className="mt-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600">Busca por telas</label>

            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FaSearch size={14} />
              </span>

              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (!open) return;

                  if (e.key === "Escape") {
                    setOpen(false);
                    return;
                  }

                  const list = query.trim() ? results : pinned;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, Math.max(0, list.length - 1)));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const item = list[activeIndex];
                    if (item) goTo(item);
                  }
                }}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 pl-10 pr-10 py-2 outline-none focus:ring-2 focus:ring-primary/30"
              />

              {query.trim() && (
                <button
                  onClick={clear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-50 text-gray-500"
                  aria-label="Limpar busca"
                  title="Limpar"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {["ramais", "aniversariantes", "reembolso", "convênios", "arquivos"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setQuery(t);
                    setOpen(true);
                    inputRef.current?.focus();
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:bg-white"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="px-4 py-2 rounded-xl bg-secondary text-white hover:opacity-95 cursor-pointer"
            >
              Buscar
            </button>
            <button
              onClick={clear}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-3 rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {query.trim() ? (
                  <>
                    <FaRegCompass />
                    <span>
                      Resultados para <span className="font-semibold text-gray-900">“{query.trim()}”</span>
                    </span>
                  </>
                ) : (
                  <>
                    <FaRegStar />
                    <span>Favoritos / Atalhos</span>
                  </>
                )}
              </div>

              <span className="text-[13px] text-gray-500">
                ↑↓ navegar • Enter abrir • Esc fechar
              </span>
            </div>

            <div className="bg-white">
              {(query.trim() ? results : pinned).slice(0, maxResults).map((item, idx) => {
                const active = idx === activeIndex;
                return (
                  <button
                    key={item.href}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goTo(item)}
                    className={[
                      "w-full text-left px-4 py-3 flex items-start gap-3 border-t border-gray-100",
                      active ? "bg-secondary/20" : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 h-9 w-9 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-700 cursor-pointer">
                      <FaArrowRight size={12} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        {item.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {item.badge}
                          </span>
                        )}
                        {item.group && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            {item.group}
                          </span>
                        )}
                      </div>

                      {item.desc && (
                        <p className="mt-1 text-xs text-gray-600 truncate">{item.desc}</p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-500 truncate">{item.href}</p>
                    </div>
                  </button>
                );
              })}

              {emptyState && (
                <div className="px-4 py-4 text-sm text-gray-600">
                  Nada encontrado. Tenta buscar por palavras como{" "}
                  <span className="font-semibold text-gray-900">ramais</span>,{" "}
                  <span className="font-semibold text-gray-900">convênios</span> ou{" "}
                  <span className="font-semibold text-gray-900">reembolso</span>.
                </div>
              )}

              {!query.trim() && pinned.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-600">
                  Sem favoritos marcados. Defina <code className="text-xs">pinned: true</code> nas telas.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        * Essa busca navega apenas entre telas (rotas). Depois dá pra plugar permissões por perfil.
      </p>
    </div>
  );
}