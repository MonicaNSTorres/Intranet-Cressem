"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowDownAZ, ArrowUpZA, Download, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/back-button/back-button";

const normalizeUserName = (name: string): string => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .trim();
};

type MissingDocRow = {
  ID?: number | string;
  CREATED_AT?: string | Date;
  UPDATED_AT?: string | Date;
  ENVELOPE_ID?: string;
  DOCUMENT_NAME?: string;
  EMAIL_SUBJECT?: string;
  STATUS?: string;
  RESPONSAVEL_NOME?: string;
  PDF_PATH?: string;
};

export default function GrDocumentMissingClientContent() {
  const router = useRouter();

  const usuariosDiretoria = useMemo(
    () =>
      [
        "monica.torres",
        "tiago.teixeira",
        "paulo.alciprete",
        "paulo.tarso",
        "janainag",
        "diego.adriano",
        "thais.yumi",
        "lucas.itner",
        "marcelo.bueno",
        "renata.teixeira",
        "thiago.msantos",
        "luiz.gerhard",
        "vitoria.fontoura",
        "fabio.prado",
        "ricardo.henrique",
        "renata.steixeira",
        "jennyffer.rodrigues",
      ].map((n) => normalizeUserName(n)),
    []
  );

  const itensPorPagina = 20;

  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [loggedInUserName, setLoggedInUserName] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const [ordenacaoDataAsc, setOrdenacaoDataAsc] = useState(true);

  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [rows, setRows] = useState<MissingDocRow[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    setIsClientLoaded(true);
  }, []);

  useEffect(() => {
    async function checkAuthentication() {
      if (!isClientLoaded || autenticado !== null) return;

      let identifiedUserName: string | null = null;

      try {
        const response = await axios.get("http://10.0.107.233/usuario_info.php", {
          withCredentials: true,
        });
        identifiedUserName = response.data?.NORMALIZADO;
      } catch (err) {
        console.error("Erro ao verificar sessão Next.js:", err);
        setError(
          "Acesso restrito: Sua sessão expirou ou não foi iniciada. Redirecionando para autenticação."
        );
        setAutenticado(false);
        return;
      }

      if (identifiedUserName) {
        const normalizedName = normalizeUserName(identifiedUserName);
        setLoggedInUserName(normalizedName);
      } else {
        setError(
          "Acesso restrito: Nome de usuário não fornecido na sessão. Redirecionando para autenticação."
        );
        setAutenticado(false);
        return;
      }

      if (usuariosDiretoria.includes(normalizeUserName(identifiedUserName))) {
        setAutenticado(true);
      } else {
        setError("Acesso restrito: Você não tem permissão para visualizar esta tela.");
        setAutenticado(false);
      }
    }

    checkAuthentication();
  }, [autenticado, isClientLoaded, usuariosDiretoria]);

  const rowsOrdenadas = useMemo(() => {
    const copy = [...rows];
    return copy.sort((a, b) => {
      const aTime = a.CREATED_AT ? new Date(a.CREATED_AT).getTime() : 0;
      const bTime = b.CREATED_AT ? new Date(b.CREATED_AT).getTime() : 0;
      return ordenacaoDataAsc ? aTime - bTime : bTime - aTime;
    });
  }, [rows, ordenacaoDataAsc]);

  const rowsFiltradas = useMemo(() => {
    let data = [...rowsOrdenadas];

    if (statusFilter.trim()) {
      const s = statusFilter.toLowerCase();
      data = data.filter((r) => String(r.STATUS || "").toLowerCase().includes(s));
    }

    if (responsavelFilter.trim()) {
      const s = responsavelFilter.toLowerCase();
      data = data.filter((r) => String(r.RESPONSAVEL_NOME || "").toLowerCase().includes(s));
    }

    if (searchFilter.trim()) {
      const s = searchFilter.toLowerCase();
      data = data.filter((r) => {
        const blob = [
          r.ENVELOPE_ID,
          r.DOCUMENT_NAME,
          r.STATUS,
          r.RESPONSAVEL_NOME,
          r.ID,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return blob.includes(s);
      });
    }

    return data;
  }, [rowsOrdenadas, statusFilter, responsavelFilter, searchFilter]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(rowsFiltradas.length / itensPorPagina));
  }, [rowsFiltradas.length]);

  const rowsPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = paginaAtual * itensPorPagina;
    return rowsFiltradas.slice(inicio, fim);
  }, [rowsFiltradas, paginaAtual]);

  const handleBuscar = async () => {
    try {
      setError(null);
      setLoadingProgress(10);

      const base = process.env.NEXT_PUBLIC_API_URL;

      const res = await axios.get(`${base}/v1/gr-document-missing`, {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          status: statusFilter || undefined,
          responsavel: responsavelFilter || undefined,
          q: searchFilter || undefined,
        },
      });

      setRows(res.data?.rows || []);
      setPaginaAtual(1);

      let fake = 10;
      const interval = setInterval(() => {
        fake += 10;

        if (fake >= 100) {
          clearInterval(interval);
          setLoadingProgress(100);
          setTimeout(() => setLoadingProgress(null), 800);
        } else {
          setLoadingProgress(fake);
        }
      }, 80);

    } catch (err) {
      console.error("Erro ao consultar documentos pendentes:", err);
      setLoadingProgress(null);
      setError("Erro ao buscar registros.");
    }
  };

  if (autenticado === null) {
    return (
      <div className="text-center mt-40 text-lg text-gray-600">
        Verificando permissões de acesso...
      </div>
    );
  }

  if (autenticado === false) {
    return (
      <div className="max-w-xl mx-auto mt-40 p-6 bg-white shadow-lg rounded-xl text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
        <p className="text-gray-700 mb-4">
          {error || "Você não tem permissão para acessar esta tela."}
        </p>
        <button
          onClick={() => router.push("https://intranet/menu")}
          className="bg-blue-600 hover:cursor-pointer text-white font-bold py-2 px-4 rounded"
        >
          Retornar à Intranet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white dark:bg-gray-900 shadow-lg rounded-xl text-gray-900 dark:text-gray-100">
      <BackButton />

      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard Docusign</h1>

      {loggedInUserName && (
        <p className="text-sm text-gray-600 text-center mb-4 dark:text-white">
          Logado como:{" "}
          <span className="font-semibold dark:text-white">{loggedInUserName}</span>
        </p>
      )}

      {error && <p className="text-red-500 mb-4">Erro: {error}</p>}

      {loadingProgress !== null && (
        <div className="mt-2 mb-6 w-full max-w-md mx-auto text-center">
          <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden shadow-md">
            <div
              className="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
              style={{
                width: `${loadingProgress}%`,
                background: "linear-gradient(90deg, #4ade80, #16a34a)",
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
              {loadingProgress}% carregado
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-2 mb-2 animate-pulse">
            Aguarde, carregando registros...
          </p>
        </div>
      )}

      <div className="border border-gray-200 p-6 rounded bg-gray-50 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-4">
          Consulta de documentos na Docusign
        </h2>

        <div className="text-center text-md py-4 my-6 bg-white dark:bg-gray-900 border-b-emerald-50 shadow-lg rounded-lg">
          <p>É obrigatório o preenchimento da data inicial e data final, os outros campos não são obrigatórios.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 items-end">
          <div>
            <label className="block mb-1">Data Inicial:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded px-4 py-2 w-full dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block mb-1">Data Final:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded px-4 py-2 w-full dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block mb-1">Status:</label>
            <input
              type="text"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-4 py-2 w-full dark:bg-gray-800 dark:text-white"
              placeholder="Ex: missing"
            />
          </div>

          <div>
            <label className="block mb-1">Responsável:</label>
            <input
              type="text"
              value={responsavelFilter}
              onChange={(e) => setResponsavelFilter(e.target.value)}
              className="border rounded px-4 py-2 w-full dark:bg-gray-800 dark:text-white"
              placeholder="Ex: Lucas"
            />
          </div>

          <div>
            <label className="block mb-1">Busca livre:</label>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="border rounded px-4 py-2 w-full dark:bg-gray-800 dark:text-white"
              placeholder="envelope, doc, id..."
            />
          </div>
        </div>

        <button
          onClick={handleBuscar}
          className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
        >
          Buscar
        </button>

        {rowsFiltradas.length > 0 && (
          <>
            <p className="text-sm text-gray-700 font-medium mt-6 mb-4 text-center">
              {rowsFiltradas.length} registros encontrados
              {fromDate && toDate
                ? ` entre ${new Date(fromDate).toLocaleDateString("pt-BR")} e ${new Date(
                  toDate
                ).toLocaleDateString("pt-BR")}.`
                : "."}
            </p>

            <div className="flex justify-between items-center mb-4 mt-4">
              <button
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2 bg-gray-300 font-semibold rounded disabled:opacity-50 hover:shadow-md cursor-pointer hover:bg-blue-400 hover:text-white"
                disabled={paginaAtual === 1}
              >
                Anterior
              </button>

              <span className="text-sm font-medium text-gray-700">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                onClick={() => setPaginaAtual((prev) => (prev < totalPaginas ? prev + 1 : prev))}
                className="px-4 py-2 bg-gray-300 font-semibold rounded disabled:opacity-50 hover:shadow-md cursor-pointer hover:bg-blue-400 hover:text-white"
                disabled={paginaAtual >= totalPaginas}
              >
                Próxima
              </button>
            </div>

            <table className="table-auto w-full border border-gray-300 mt-6">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <tr className="bg-gray-100">
                  <th
                    onClick={() => setOrdenacaoDataAsc((prev) => !prev)}
                    className="border px-4 py-2 text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1">
                      Data
                      {ordenacaoDataAsc ? (
                        <ArrowDownAZ className="w-4 h-4 text-blue-700" />
                      ) : (
                        <ArrowUpZA className="w-4 h-4 text-blue-700" />
                      )}
                    </div>
                  </th>

                  <th className="border px-4 py-2 text-left">Envelope</th>
                  <th className="border px-4 py-2 text-left">Documento</th>
                  <th className="border px-4 py-2 text-left">Status</th>
                  <th className="border px-4 py-2 text-left">Responsável</th>
                  <th className="border px-4 py-2 text-left">Ações</th>
                </tr>
              </thead>

              <tbody>
                {rowsPaginadas.map((r, idx) => {
                  const key = String(r.ID || r.ENVELOPE_ID || idx);

                  return (
                    <tr key={key} className="hover:bg-gray-100 transition-colors duration-200">
                      <td className="border px-4 py-2">
                        {r.CREATED_AT ? new Date(r.CREATED_AT).toLocaleDateString("pt-BR") : "—"}
                      </td>

                      <td className="border px-4 py-3">{r.ENVELOPE_ID || "—"}</td>
                      <td className="border px-4 py-3">{r.EMAIL_SUBJECT || "—"}</td>
                      <td className="border px-4 py-3">{r.STATUS || "—"}</td>
                      <td className="border px-4 py-3">{r.RESPONSAVEL_NOME || "—"}</td>

                      <td className="border px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {r.ENVELOPE_ID ? (
                            <>
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" /> Baixar
                              </a>

                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/v1/download-from-db?envelopeId=${r.ENVELOPE_ID}&inline=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-700 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" /> Abrir
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}