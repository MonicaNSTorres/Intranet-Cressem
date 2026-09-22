"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit, FaPlus, FaSearch } from "react-icons/fa";
import {
  consultarContratosEmpresas,
  carregarCidadesContratoConsulta,
  carregarTiposContratoConsulta,
  carregarSistemasConsignadosConsulta,
  type ContratoEmpresaItem,
  type ConsultaContratosParams,
} from "@/services/cadastro_contratos.service";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
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
      <div className="border-b border-emerald-200 bg-gradient-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
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

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const result: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition ${
            page === currentPage
              ? "bg-primary text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );
}

export function ConsultaContratosForm() {
  const router = useRouter();

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingBuscar, setLoadingBuscar] = useState(false);

  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [sistema, setSistema] = useState("");
  const [status, setStatus] = useState("");

  const [cidades, setCidades] = useState<string[]>([]);
  const [tiposContrato, setTiposContrato] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);

  const [items, setItems] = useState<ContratoEmpresaItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const limit = 10;

  useEffect(() => {
    async function loadInicial() {
      try {
        const [cidadesResp, tiposResp, sistemasResp] = await Promise.all([
          carregarCidadesContratoConsulta(),
          carregarTiposContratoConsulta(),
          carregarSistemasConsignadosConsulta(),
        ]);

        setCidades(cidadesResp || []);
        setTiposContrato(tiposResp || []);
        setSistemas(sistemasResp || []);
      } catch (error: any) {
        console.error(error);
        setErro("Não foi possível carregar os filtros da consulta.");
      } finally {
        setLoadingInicial(false);
      }
    }

    loadInicial();
  }, []);

  async function buscar(page = 1) {
    try {
      setErro("");
      setInfo("");
      setLoadingBuscar(true);

      const params: ConsultaContratosParams = {
        page,
        limit,
        NM_EMPRESA: empresa.trim() || undefined,
        NR_CNPJ: onlyDigits(cnpj) || undefined,
        NM_CIDADE: cidade.trim() || undefined,
        NM_TIPO_CONTRATO: tipoContrato.trim() || undefined,
        NM_SISTEMA_CONSIG: sistema.trim() || undefined,
        SN_ATIVO:
          status === ""
            ? undefined
            : status === "1"
            ? 1
            : 0,
      };

      const response = await consultarContratosEmpresas(params);

      setItems(response.items || []);
      setTotalItems(Number(response.total_items || 0));
      setTotalPages(Number(response.total_pages || 1));
      setCurrentPage(Number(response.current_page || 1));

      if (!response.items?.length) {
        setInfo("Nenhum contrato encontrado para os filtros informados.");
      }
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          "Não foi possível consultar os contratos."
      );
    } finally {
      setLoadingBuscar(false);
    }
  }

  function limparFiltros() {
    setEmpresa("");
    setCnpj("");
    setCidade("");
    setTipoContrato("");
    setSistema("");
    setStatus("");
    setItems([]);
    setTotalItems(0);
    setTotalPages(1);
    setCurrentPage(1);
    setErro("");
    setInfo("");
  }

  function abrirCadastro() {
    router.push("/cadastro_contrato");
  }

  function abrirEdicao(id: number) {
    router.push(`/cadastro_contrato?id=${id}`);
  }

  useEffect(() => {
    if (!loadingInicial) {
      buscar(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingInicial]);

  if (loadingInicial) {
    return (
      <div className="mx-auto w-full max-w-[1600px] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Carregando filtros e contratos...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Filtros da consulta
            </h2>
            <p className="text-sm text-slate-500">
              Use os filtros abaixo para localizar contratos cadastrados.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastro}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
          >
            <FaPlus />
            Novo Contrato
          </button>
        </div>

        {(erro || info) && (
          <div className="mb-4">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <Field label="Razão Social">
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className={inputBase}
              />
            </Field>
          </div>

          <div className="md:col-span-3">
            <Field label="CNPJ">
              <input
                value={formatCnpj(cnpj)}
                onChange={(e) => setCnpj(e.target.value)}
                className={inputBase}
                maxLength={18}
              />
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="Cidade">
              <input
                list="cidades-consulta-list"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={inputBase}
                placeholder="Selecione ou digite"
              />
              <datalist id="cidades-consulta-list">
                {cidades.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="Tipo de Contrato">
              <input
                list="tipos-consulta-list"
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className={inputBase}
                placeholder="Selecione ou digite"
              />
              <datalist id="tipos-consulta-list">
                {tiposContrato.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="Sistema">
              <input
                list="sistemas-consulta-list"
                value={sistema}
                onChange={(e) => setSistema(e.target.value)}
                className={inputBase}
                placeholder="Selecione ou digite"
              />
              <datalist id="sistemas-consulta-list">
                {sistemas.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputBase}
              >
                <option value=""></option>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </Field>
          </div>

          <div className="md:col-span-12">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => buscar(1)}
                disabled={loadingBuscar}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSearch />
                {loadingBuscar ? "Buscando..." : "Buscar"}
              </button>

              <button
                type="button"
                onClick={limparFiltros}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      <Section title="Contratos encontrados">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum contrato para exibir.
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-500">
              Total encontrado: <strong>{totalItems}</strong>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                    <th className="border-b border-slate-200 px-4 py-3">Empresa</th>
                    <th className="border-b border-slate-200 px-4 py-3">CNPJ</th>
                    <th className="border-b border-slate-200 px-4 py-3">Cidade</th>
                    <th className="border-b border-slate-200 px-4 py-3">Conta Capital</th>
                    <th className="border-b border-slate-200 px-4 py-3">Tipo</th>
                    <th className="border-b border-slate-200 px-4 py-3">Sistema</th>
                    <th className="border-b border-slate-200 px-4 py-3">Início</th>
                    <th className="border-b border-slate-200 px-4 py-3">Fim</th>
                    <th className="border-b border-slate-200 px-4 py-3">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>

                <tbody className="bg-white text-sm text-slate-700">
                  {items.map((item) => (
                    <tr
                      key={item.ID_CONTRATOS_EMPRESAS}
                      className="hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.NM_EMPRESA || ""}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {formatCnpj(item.NR_CNPJ || "")}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.NM_CIDADE || ""}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.CD_CONTA_CAPITAL || ""}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.NM_TIPO_TEMPO_CONTRATO || ""}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {item.NM_SISTEMA_CONSIG || ""}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {formatDateBR(item.DT_INICIO)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {formatDateBR(item.DT_FIM)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            Number(item.SN_ATIVO || 0) === 1
                              ? "bg-third text-white"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {Number(item.SN_ATIVO || 0) === 1 ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(Number(item.ID_CONTRATOS_EMPRESAS))}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
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

            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={(page) => buscar(page)}
              />
            </div>
          </>
        )}
      </Section>
    </div>
  );
}