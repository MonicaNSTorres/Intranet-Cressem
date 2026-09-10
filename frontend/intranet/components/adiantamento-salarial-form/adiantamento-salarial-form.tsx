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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
          <h2 className="text-base font-bold text-slate-950">Dados do adiantamento</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Informe o CPF do empregado(a), confira os dados e gere o PDF.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <SearchForm onSearch={onBuscar}>
          <div>
            <label className={labelClass}>CPF do empregado(a)</label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="CPF (somente números)"
                className="h-10 rounded-xl border-slate-300 px-4 text-sm shadow-sm focus:border-[#00AE9D] focus:ring-[#00AE9D]/20"
                inputMode="numeric"
                maxLength={14}
              />

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Search size={16} />
                {loading ? "Buscando..." : "Pesquisar"}
              </button>
            </div>

            {erro && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </div>
            )}
            {info && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
          </div>
        </SearchForm>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Nome do empregado(a)</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Matrícula</label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Ação</label>
            <select
              value={acao}
              onChange={(e) => setAcao(e.target.value as "Ativar" | "Cancelar")}
              className={selectClass}
            >
              <option value="Ativar">Ativar</option>
              <option value="Cancelar">Cancelar</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Percentual</label>
            <select
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value) as 20 | 30)}
              className={selectClass}
            >
              <option value={20}>20%</option>
              <option value={30}>30%</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Data e hora (cabeçalho)</label>
            <input
              value={dataLocal}
              onChange={(e) => setDataLocal(e.target.value)}
              className={inputClass}
              placeholder="dd/mm/aaaa hh:mm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={gerar}
            disabled={!formularioValido}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${
              formularioValido
                ? "bg-[#00AE9D] hover:bg-[#49479D] hover:shadow-md"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            <FileText size={16} />
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
