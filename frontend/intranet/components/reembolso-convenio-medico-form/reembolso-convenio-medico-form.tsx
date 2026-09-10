"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { FaFilePdf } from "react-icons/fa";
import {
  buscarFuncionarioPorNome,
  buscarDiretoria,
  buscarDiretorPorNome,
  type DiretorOption,
} from "@/services/reembolso_convenio_medico.service";
import { gerarReembolsoConvenioMedicoPdf } from "@/lib/pdf/gerarPdfReembolsoConvenioMedico";

type FormDataType = {
  nome: string;
  matricula: string;
  setor: string;
  empresaConvenio: string;
  mensalidade: string;
  valorReembolso: string;
  diretor: string;
};

const initialForm: FormDataType = {
  nome: "",
  matricula: "",
  setor: "",
  empresaConvenio: "",
  mensalidade: "",
  valorReembolso: "",
  diretor: "",
};

function getNomeUsuarioLogado() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("NOME_COMPLETO") ||
    localStorage.getItem("NOME_COMPLETO") ||
    sessionStorage.getItem("REMOTE_USER_INTRANET") ||
    localStorage.getItem("REMOTE_USER_INTRANET") ||
    localStorage.getItem("nome_completo") ||
    localStorage.getItem("nome") ||
    localStorage.getItem("username") ||
    sessionStorage.getItem("nome_completo") ||
    sessionStorage.getItem("nome") ||
    sessionStorage.getItem("username") ||
    ""
  );
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarMoedaBRL(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseMoedaBRL(valor: string) {
  if (!valor) return 0;

  const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const numero = parseFloat(limpo);

  return isNaN(numero) ? 0 : numero;
}

function formatarInputMoeda(valor: string) {
  const numeros = somenteNumeros(valor);

  if (!numeros) return "";

  const numero = Number(numeros) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReembolsoConvenioMedicoForm() {
  const [form, setForm] = useState<FormDataType>(initialForm);
  const [diretores, setDiretores] = useState<DiretorOption[]>([]);
  const [nomeDiretor, setNomeDiretor] = useState("");
  const [cargoDiretor, setCargoDiretor] = useState("");
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const dataHoje = useMemo(() => {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, "0");
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = String(agora.getFullYear());

    return `${dia}/${mes}/${ano}`;
  }, []);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    calcularReembolso();
  }, [form.mensalidade]);

  async function carregarDadosIniciais() {
    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const nomeUsuarioLogado = getNomeUsuarioLogado();

      const diretoria = await buscarDiretoria();
      setDiretores(diretoria || []);

      if (!nomeUsuarioLogado) {
        setErro("Não foi possível identificar o usuário logado para preencher a solicitação.");
        return;
      }

      const funcionario = await buscarFuncionarioPorNome(nomeUsuarioLogado);

      setForm((prev) => ({
        ...prev,
        nome: funcionario?.NM_FUNCIONARIO || "",
        matricula: String(funcionario?.NR_MATRICULA || ""),
        setor: funcionario?.SETOR?.NM_SETOR || funcionario?.NM_SETOR || "",
      }));

      setInfo("Dados do empregado carregados com sucesso.");
    } catch (error: any) {
      console.error("Erro ao carregar reembolso convênio médico:", error);
      setErro(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Não foi possível carregar os dados da solicitação."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    if (name === "mensalidade") {
      setForm((prev) => ({
        ...prev,
        mensalidade: formatarInputMoeda(value),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function calcularReembolso() {
    const mensalidadeNumero = parseMoedaBRL(form.mensalidade);
    let valor = mensalidadeNumero * 0.8;

    if (valor > 600) {
      valor = 600;
    }

    setForm((prev) => ({
      ...prev,
      valorReembolso: mensalidadeNumero ? formatarMoedaBRL(valor) : "",
    }));
  }

  async function carregarDiretorSelecionado() {
    if (!form.diretor) {
      setNomeDiretor("");
      setCargoDiretor("");
      return;
    }

    try {
      const diretor = await buscarDiretorPorNome(form.diretor);
      setNomeDiretor(diretor?.NM_FUNCIONARIO || form.diretor);
      setCargoDiretor(diretor?.CARGO?.NM_CARGO || diretor?.NM_CARGO || "");
    } catch (error) {
      console.error("Erro ao carregar diretor selecionado:", error);
      setNomeDiretor(form.diretor);
      setCargoDiretor("");
    }
  }

  function validarCampos() {
    if (!form.nome.trim()) return "Nome do empregado não preenchido.";
    if (!form.matricula.trim()) return "Matrícula do empregado não preenchida.";
    if (!form.setor.trim()) return "Setor do empregado não preenchido.";
    if (!form.empresaConvenio.trim()) return "Empresa contratada no convênio não preenchida.";
    if (!form.mensalidade.trim()) return "Custo da mensalidade do convênio não preenchida.";
    if (!form.diretor.trim()) return "Selecione um diretor para assinar.";
    return "";
  }

  const formularioValido = useMemo(() => {
    if (!form.nome.trim()) return false;
    if (!form.matricula.trim()) return false;
    if (!form.setor.trim()) return false;
    if (!form.empresaConvenio.trim()) return false;
    if (!form.mensalidade.trim()) return false;
    if (!form.valorReembolso.trim()) return false;
    if (!form.diretor.trim()) return false;

    const mensalidadeNumero = parseMoedaBRL(form.mensalidade);

    if (mensalidadeNumero <= 0) return false;

    return true;
  }, [form]);

  async function handleGerar() {
    const mensagemErro = validarCampos();

    if (mensagemErro) {
      setErro(mensagemErro);
      setInfo("");
      return;
    }

    try {
      setErro("");
      setGerando(true);

      await carregarDiretorSelecionado();

      let diretorNome = nomeDiretor;
      let diretorCargo = cargoDiretor;

      if (!diretorNome) {
        const diretor = await buscarDiretorPorNome(form.diretor);
        diretorNome = diretor?.NM_FUNCIONARIO || form.diretor;
        diretorCargo = diretor?.CARGO?.NM_CARGO || diretor?.NM_CARGO || "";
        setNomeDiretor(diretorNome);
        setCargoDiretor(diretorCargo);
      }

      await gerarReembolsoConvenioMedicoPdf({
        dataHoje,
        nome: form.nome,
        matricula: form.matricula,
        setor: form.setor,
        empresaConvenio: form.empresaConvenio,
        mensalidade: form.mensalidade,
        valorReembolso: form.valorReembolso,
        nomeDiretor: diretorNome,
        cargoDiretor: diretorCargo,
        nomeRh: "JORGE LUIZ GREGORIO",
        cargoRh: "GERENTE DE RH",
      });
    } catch (error) {
      console.error("Erro ao gerar solicitação:", error);
      setErro("Não foi possível gerar a solicitação para impressão.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 rounded-2xl border border-slate-200 border-t-[#00AE9D] border-t-4 bg-white p-5 shadow-sm">
      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      {info && !erro && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {info}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Carregando dados da solicitação...
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              Preencha os dados abaixo. O valor do reembolso é calculado automaticamente em 80%, limitado a R$ 600,00.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-9">
              <label className={labelClass}>
                Nome do empregado
              </label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-3">
              <label className={labelClass}>
                Matrícula
              </label>
              <input
                type="text"
                name="matricula"
                value={form.matricula}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-5">
              <label className={labelClass}>
                Setor
              </label>
              <input
                type="text"
                name="setor"
                value={form.setor}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-12">
              <label className={labelClass}>
                Empresa do convênio
              </label>
              <input
                type="text"
                name="empresaConvenio"
                value={form.empresaConvenio}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-6">
              <label className={labelClass}>
                Valor da mensalidade
              </label>
              <input
                type="text"
                name="mensalidade"
                value={form.mensalidade}
                onChange={handleChange}
                placeholder="0,00"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-6">
              <label className={labelClass}>
                Valor a reembolsar
              </label>
              <input
                type="text"
                name="valorReembolso"
                value={form.valorReembolso}
                readOnly
                className={`${inputClass} bg-slate-50 font-bold`}
              />
            </div>

            <div className="md:col-span-6">
              <label className={labelClass}>
                Diretor a autorizar
              </label>
              <select
                name="diretor"
                value={form.diretor}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {diretores.map((diretor) => (
                  <option
                    key={diretor.NM_FUNCIONARIO}
                    value={diretor.NM_FUNCIONARIO}
                  >
                    {diretor.NM_FUNCIONARIO}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleGerar}
                disabled={!formularioValido || gerando}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition
    ${formularioValido && !gerando
                    ? "cursor-pointer bg-[#00AE9D] hover:bg-[#49479D]"
                    : "cursor-not-allowed bg-slate-300"
                  }`}
              >
                <FaFilePdf />
                {gerando ? "Baixando..." : "Baixar PDF"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/15";
