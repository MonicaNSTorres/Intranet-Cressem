"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { gerarPdfAdiantamentoSalarial } from "@/lib/pdf/gerarPdfAdiantamentoSalarial";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { buscarFuncionarioPorNome } from "@/services/bolsa_estudo.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { FileText, Search } from "lucide-react";

function hojeBRComHora() {
  const d = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function getNomeUsuarioLogado() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("NOME_COMPLETO") ||
    localStorage.getItem("REMOTE_USER_INTRANET") ||
    localStorage.getItem("nome_completo") ||
    localStorage.getItem("nome") ||
    localStorage.getItem("username") ||
    sessionStorage.getItem("NOME_COMPLETO") ||
    sessionStorage.getItem("REMOTE_USER_INTRANET") ||
    sessionStorage.getItem("nome_completo") ||
    sessionStorage.getItem("nome") ||
    sessionStorage.getItem("username") ||
    ""
  );
}

export function AdiantamentoSalarialForm() {
  const [cpf, setCpf] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [prontuario, setProntuario] = useState("");

  const [percentual, setPercentual] = useState<20 | 30>(30);
  const [acao, setAcao] = useState<"Ativar" | "Cancelar">("Ativar");

  const [dataLocal, setDataLocal] = useState(hojeBRComHora());

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  useEffect(() => {
    let ativo = true;

    async function preencherFuncionarioLogado() {
      const nomeUsuarioLogado = getNomeUsuarioLogado();
      if (!nomeUsuarioLogado) return;

      try {
        const funcionario = await buscarFuncionarioPorNome(nomeUsuarioLogado);
        if (!ativo) return;

        setCpf(String(funcionario?.NR_CPF || "").replace(/\D/g, ""));
        setNome(funcionario?.NM_FUNCIONARIO || nomeUsuarioLogado);
        setMatricula(String(funcionario?.NR_MATRICULA || ""));
      } catch (error) {
        console.warn("Não foi possível preencher os dados do funcionário logado:", error);
      }
    }

    preencherFuncionarioLogado();

    return () => {
      ativo = false;
    };
  }, []);

  const onBuscar = async () => {
    const r = await buscar(cpf);
    if (r.found) {
      setNome(r.data.nome || "");
      setMatricula(r.data.matricula || "");
    }
  };

  const formularioValido = useMemo(() => {
    const cpfValido = cpf.replace(/\D/g, "").length === 11;

    if (!cpfValido) return false;

    if (!nome.trim()) return false;

    if (!matricula.trim()) return false;

    if (!acao) return false;

    if (![20, 30].includes(percentual)) return false;

    if (!dataLocal.trim()) return false;

    return true;
  }, [
    cpf,
    nome,
    matricula,
    acao,
    percentual,
    dataLocal,
  ]);

  const gerar = async () => {
    await gerarPdfAdiantamentoSalarial({
      nome: nome || "_________________________",
      matricula: matricula || "",
      prontuario: prontuario || "",
      percentual,
      dataCabecalho: dataLocal,
      cidade: "São José dos Campos",
      acao,
    });
  };

  const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";
  const inputClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <div className="min-w-225 mx-auto overflow-hidden rounded-xl bg-white shadow">
      <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />
      <div className="p-6">
        <SearchForm onSearch={onBuscar}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CPF do empregado(a)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="CPF (somente números)"
                className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
                inputMode="numeric"
                maxLength={14}
              />

              <SearchButton loading={loading} label="Pesquisar" />
            </div>

            {erro && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {erro}
              </div>
            )}
            {info && (
              <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
                {info}
              </div>
            )}
          </div>
        </SearchForm>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome do empregado(a)
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Matrícula
            </label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ação
            </label>
            <select
              value={acao}
              onChange={(e) => setAcao(e.target.value as "Ativar" | "Cancelar")}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="Ativar">Ativar</option>
              <option value="Cancelar">Cancelar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Percentual
            </label>
            <select
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value) as 20 | 30)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value={20}>20%</option>
              <option value={30}>30%</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data e hora (cabeçalho)
            </label>
            <input
              value={dataLocal}
              onChange={(e) => setDataLocal(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="dd/mm/aaaa hh:mm"
            />
          </div>
        </div>

        <div className="pt-5 border-t mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={gerar}
            disabled={!formularioValido}
            className={`inline-flex items-center gap-2 text-white font-semibold px-5 py-2 rounded shadow transition
            ${formularioValido
                ? "bg-secondary hover:bg-primary cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
              }`}
          >
            Gerar PDF
          </button>
        </div>

      </div>
    </div>
  );
}
