"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaEdit, FaPlus, FaSave, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import {
  baixarComprovanteReembolso,
  buscarFuncionarioPorNome,
  buscarFuncionarioReembolsoPorCpf,
  buscarSolicitacaoReembolsoPorId,
  cadastrarSolicitacaoReembolso,
  carregarCidadesReembolso,
  carregarTiposDespesaReembolso,
  editarSolicitacaoReembolso,
  type SolicitacaoReembolsoPayload,
  type SolicitacaoReembolsoResponse,
} from "@/services/cadastro_reembolso_despesa.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type DespesaItem = {
  tipo: string;
  descricao: string;
  valor: string;
  comprovanteNome: string;
  comprovanteFile: File | null;
  comprovantePath?: string | null;
  multiplicador?: string;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfView(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validaCPF(raw: string) {
  if (!raw) return false;

  const cleaned = String(raw).replace(/\D/g, "");

  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  function calculaDigito(cpfArray: number[], pesoInicial: number) {
    let soma = 0;
    for (let i = 0; i < cpfArray.length; i++) {
      soma += cpfArray[i] * (pesoInicial - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const nums = cleaned.split("").map((d) => parseInt(d, 10));
  const dig1 = calculaDigito(nums.slice(0, 9), 10);
  const dig2 = calculaDigito(nums.slice(0, 10), 11);

  return dig1 === nums[9] && dig2 === nums[10];
}

function monetizarDigitacao(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const numeric = Number(digits) / 100;

  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseBRL(value: string) {
  if (!value) return 0;

  const normalized = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function normalizaNumeroParaPonto(value: string) {
  let s = String(value ?? "").trim().replace(/[R$\s\u00A0]/g, "");

  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }

  return s;
}

function parseNumeroBR(value: string) {
  const n = Number(normalizaNumeroParaPonto(value));
  return Number.isFinite(n) ? n : NaN;
}

const KMS_LINE_RE = /\n?\s*\d[\d.,\s]*\s*KM'?s?\s*x\s*0[,.]?77\s*R\$\s*=\s*.+$/i;

function stripKmsLine(desc: string) {
  return String(desc || "").replace(KMS_LINE_RE, "").trimEnd();
}

function extractMultiplicador(desc: string) {
  const match = String(desc || "").match(/(\d[\d.,]*)\s*KM'?s?/i);
  return match ? match[1] : "";
}

function descricaoComKms(
  tipo: string,
  descricaoBase: string,
  multiplicadorStr: string,
  valorFormatado: string
) {
  if (tipo !== "KMS") return descricaoBase;

  const limpa = stripKmsLine(descricaoBase);
  const linha = `\n${multiplicadorStr} KM's x 0.77 R$ = ${valorFormatado}`;

  return limpa + linha;
}

async function fileToDataURL(file: File | null) {
  return await new Promise<string | null>((resolve, reject) => {
    if (!file) return resolve(null);

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-left text-sm leading-10 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";
const readOnlyFieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-left text-sm leading-10 text-slate-900 shadow-sm outline-none";
const textareaClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";
const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";
const sectionClass =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";
const sectionTitleClass =
  "flex items-center gap-2 px-5 py-4 text-base font-black text-slate-950";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-70";
const actionButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#49479D] disabled:cursor-not-allowed disabled:opacity-70";
const neutralButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#00AE9D] hover:text-[#007E7A]";

export function CadastroReembolsoDespesaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const enviarSolicitacaoLockRef = useRef(false);

  const [cidades, setCidades] = useState<string[]>([]);
  const [tiposDespesa, setTiposDespesa] = useState<string[]>([]);

  const [modoTela, setModoTela] = useState<"cadastro" | "edicao">("cadastro");
  const [requestId, setRequestId] = useState("");

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [ida, setIda] = useState("");
  const [volta, setVolta] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [numeroBanco, setNumeroBanco] = useState("756");
  const [agencia, setAgencia] = useState("4317");
  const [numeroConta, setNumeroConta] = useState("");
  const [cidade, setCidade] = useState("");

  const [despesas, setDespesas] = useState<DespesaItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const salvarDespesaLockRef = useRef(false);

  const [tipoDespesa, setTipoDespesa] = useState("");
  const [descricaoDespesa, setDescricaoDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");
  const [multiplicador, setMultiplicador] = useState("");
  const [comprovanteNome, setComprovanteNome] = useState("Nenhum arquivo selecionado");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePath, setComprovantePath] = useState<string | null>(null);

  const hoje = new Date().toISOString().split("T")[0];

  const totalDespesas = useMemo(() => {
    return despesas.reduce((acc, item) => acc + parseBRL(item.valor), 0);
  }, [despesas]);

  const isKms = tipoDespesa === "KMS";

  useEffect(() => {
    carregarDadosIniciais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);

      const [listaCidades, listaTipos] = await Promise.all([
        carregarCidadesReembolso(),
        carregarTiposDespesaReembolso(),
      ]);

      setCidades(listaCidades);
      setTiposDespesa(listaTipos);

      const id = searchParams.get("id");

      if (id) {
        const solicitacao = await buscarSolicitacaoReembolsoPorId(id);
        preencherTelaEdicao(solicitacao);
        return;
      }

      await preencherDadosFuncionarioLogado();
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar os dados da tela.");
    } finally {
      setLoading(false);
    }
  };

  const preencherTelaEdicao = (solicitacao: SolicitacaoReembolsoResponse) => {
    setModoTela("edicao");
    setRequestId(String(solicitacao.ID_SOLICITACAO_REEMBOLSO_DESPESA || ""));

    setCpf(solicitacao.NR_CPF_FUNCIONARIO || "");
    setNome(solicitacao.NM_FUNCIONARIO || "");
    setIda(solicitacao.DT_IDA || "");
    setVolta(solicitacao.DT_VOLTA || "");
    setJustificativa(solicitacao.DESC_JTF_EVENTO || "");
    setNumeroBanco(solicitacao.NR_BANCO || "756");
    setAgencia(solicitacao.CD_AGENCIA || "4317");
    setNumeroConta(solicitacao.NR_CONTA || "");
    setCidade(solicitacao.NM_CIDADE || "");

    const despesasConvertidas: DespesaItem[] = (solicitacao.DESPESAS || []).map((item) => ({
      tipo: item.TP_DESPESA,
      descricao: item.DESC_DESPESA,
      valor: fmtBRL(Number(item.VALOR || 0)),
      comprovanteNome: item.COMPROVANTE_NOME || "arquivo",
      comprovanteFile: null,
      comprovantePath: item.COMPROVANTE || null,
      multiplicador:
        item.TP_DESPESA === "KMS" ? extractMultiplicador(item.DESC_DESPESA || "") : "",
    }));

    setDespesas(despesasConvertidas);
  };

  const onBuscarCpf = async () => {
    try {
      if (!cpf) {
        alert("Preencha o CPF.");
        return;
      }

      if (!validaCPF(cpf)) {
        alert("CPF inválido.");
        return;
      }

      const response = await buscarFuncionarioReembolsoPorCpf(cpf);

      if (!response?.found) {
        alert("CPF não encontrado.");
        setNome("");
        setNumeroConta("");
        return;
      }

      setCpf(response.cpf || onlyDigits(cpf));
      setNome(response.nome || "");
      setNumeroConta(
        String(response.conta_corrente || response.nr_conta_corrente || "").trim()
      );
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Não foi possível buscar o CPF.");
    }
  };

  const limparModal = () => {
    setTipoDespesa("");
    setDescricaoDespesa("");
    setValorDespesa("");
    setMultiplicador("");
    setComprovanteNome("Nenhum arquivo selecionado");
    setComprovanteFile(null);
    setComprovantePath(null);
    setModoEdicao(false);
    setIndiceEditando(null);
  };

  const abrirModalNovaDespesa = () => {
    salvarDespesaLockRef.current = false;
    setSalvandoDespesa(false);
    limparModal();
    setModalOpen(true);
  };

  const preencherDadosFuncionarioLogado = async () => {
    const nomeUsuarioLogado = getNomeUsuarioLogado();
    if (!nomeUsuarioLogado) return;

    try {
      const funcionario = await buscarFuncionarioPorNome(nomeUsuarioLogado);
      const cpfFuncionario = onlyDigits(funcionario?.NR_CPF || "");
      const cidadeFuncionario = String(funcionario?.NM_CIDADE || "").trim();

      setNome(funcionario?.NM_FUNCIONARIO || nomeUsuarioLogado);
      setCpf(cpfFuncionario);
      setCidade(cidadeFuncionario);

      if (cidadeFuncionario) {
        setCidades((prev) =>
          prev.some(
            (item) => item.toLocaleUpperCase("pt-BR") === cidadeFuncionario.toLocaleUpperCase("pt-BR")
          )
            ? prev
            : [...prev, cidadeFuncionario].sort((a, b) => a.localeCompare(b, "pt-BR"))
        );
      }

      if (cpfFuncionario.length === 11) {
        const dadosBancarios = await buscarFuncionarioReembolsoPorCpf(cpfFuncionario);

        if (dadosBancarios.found) {
          setNumeroConta(
            String(
              dadosBancarios.conta_corrente ||
                dadosBancarios.nr_conta_corrente ||
                ""
            ).trim()
          );
        }
      }
    } catch (error) {
      console.warn("Não foi possível preencher os dados do funcionário logado:", error);
    }
  };

  const fecharModal = () => {
    salvarDespesaLockRef.current = false;
    setSalvandoDespesa(false);
    setModalOpen(false);
    limparModal();
  };

  const calcularKms = () => {
    const mult = parseNumeroBR(multiplicador);

    if (!Number.isFinite(mult)) {
      setValorDespesa("");
      return;
    }

    const total = mult * 0.77;
    setValorDespesa(fmtBRL(total));
  };

  const validarDespesa = () => {
    if (!tipoDespesa) {
      alert("Selecione o tipo de despesa.");
      return false;
    }

    if (!descricaoDespesa) {
      alert("Preencha a descrição da despesa.");
      return false;
    }

    if (!valorDespesa) {
      alert("Preencha o valor da despesa.");
      return false;
    }

    if (!comprovanteFile && !comprovantePath && comprovanteNome === "Nenhum arquivo selecionado") {
      alert("Anexe um comprovante.");
      return false;
    }

    return true;
  };

  const salvarDespesa = () => {
    if (salvandoDespesa || salvarDespesaLockRef.current) return;
    if (!validarDespesa()) return;

    salvarDespesaLockRef.current = true;
    setSalvandoDespesa(true);

    const item: DespesaItem = {
      tipo: tipoDespesa,
      descricao: descricaoComKms(tipoDespesa, descricaoDespesa, multiplicador, valorDespesa),
      valor: valorDespesa,
      comprovanteNome,
      comprovanteFile,
      comprovantePath,
      multiplicador,
    };

    if (modoEdicao && indiceEditando !== null) {
      setDespesas((prev) => prev.map((despesa, index) => (index === indiceEditando ? item : despesa)));
    } else {
      setDespesas((prev) => [...prev, item]);
    }

    setModalOpen(false);
    limparModal();
  };

  const editarDespesa = (index: number) => {
    salvarDespesaLockRef.current = false;
    setSalvandoDespesa(false);
    const item = despesas[index];

    setModoEdicao(true);
    setIndiceEditando(index);
    setTipoDespesa(item.tipo);
    setDescricaoDespesa(item.tipo === "KMS" ? stripKmsLine(item.descricao) : item.descricao);
    setValorDespesa(item.valor);
    setMultiplicador(item.multiplicador || extractMultiplicador(item.descricao));
    setComprovanteNome(item.comprovanteNome);
    setComprovanteFile(item.comprovanteFile);
    setComprovantePath(item.comprovantePath || null);
    setModalOpen(true);
  };

  const removerDespesa = (index: number) => {
    setDespesas((prev) => prev.filter((_, i) => i !== index));
  };

  const baixarComprovante = async (item: DespesaItem) => {
    try {
      const origem = item.comprovantePath || item.comprovanteNome;

      if (!origem) {
        alert("Comprovante não encontrado.");
        return;
      }

      const blob = await baixarComprovanteReembolso(origem);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = item.comprovanteNome || "comprovante";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Não foi possível baixar o comprovante.");
    }
  };

  const validarFormulario = () => {
    if (!cpf) {
      alert("Preencha o CPF.");
      return false;
    }

    if (!validaCPF(cpf)) {
      alert("CPF inválido.");
      return false;
    }

    if (!nome) {
      alert("Busque um CPF válido antes de continuar.");
      return false;
    }

    if (!ida) {
      alert("Preencha a data de ida.");
      return false;
    }

    if (!volta) {
      alert("Preencha a data de volta.");
      return false;
    }

    if (!justificativa) {
      alert("Preencha a justificativa.");
      return false;
    }

    if (!numeroBanco) {
      alert("Preencha o número do banco.");
      return false;
    }

    if (!agencia) {
      alert("Preencha a agência.");
      return false;
    }

    if (!numeroConta) {
      alert("Preencha o número da conta.");
      return false;
    }

    if (!cidade) {
      alert("Selecione a cidade.");
      return false;
    }

    if (!despesas.length) {
      alert("Adicione ao menos uma despesa.");
      return false;
    }

    return true;
  };

  const montarPayload = async (): Promise<SolicitacaoReembolsoPayload> => {
    const despesasPayload = [];

    for (const item of despesas) {
      let comprovanteDataUrl: string | null = null;

      if (item.comprovanteFile) {
        comprovanteDataUrl = await fileToDataURL(item.comprovanteFile);
      }

      despesasPayload.push({
        TP_DESPESA: item.tipo,
        DESC_DESPESA: item.descricao,
        VALOR: parseBRL(item.valor),
        COMPROVANTE: comprovanteDataUrl || item.comprovantePath || null,
        COMPROVANTE_NOME: item.comprovanteNome || null,
      });
    }

    return {
      ID_SOLICITACAO_REEMBOLSO_DESPESA: requestId || undefined,
      NM_FUNCIONARIO: nome.toUpperCase(),
      NR_CPF_FUNCIONARIO: onlyDigits(cpf),
      DT_IDA: ida,
      DT_VOLTA: volta,
      DESC_JTF_EVENTO: justificativa,
      NM_CIDADE: cidade,
      NR_BANCO: numeroBanco,
      CD_AGENCIA: agencia,
      NR_CONTA: numeroConta,
      DESC_ANDAMENTO: "Pendente Financeiro",
      DESPESAS: despesasPayload,
    };
  };

  const enviarSolicitacao = async () => {
    if (saving || enviarSolicitacaoLockRef.current) return;
    if (!validarFormulario()) return;

    enviarSolicitacaoLockRef.current = true;

    try {
      setSaving(true);

      const payload = await montarPayload();

      if (modoTela === "edicao" && requestId) {
        await editarSolicitacaoReembolso(payload);

        alert("Solicitação atualizada com sucesso.");
      } else {
        await cadastrarSolicitacaoReembolso(payload);

        alert("Solicitação cadastrada com sucesso.");
      }

      router.push("/auth/gerenciamento_reembolso_despesa");
    } catch (error) {
      console.error(error);
      alert("Falha ao salvar a solicitação.");
    } finally {
      setSaving(false);
      enviarSolicitacaoLockRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full space-y-5">
        <SearchForm
          onSearch={onBuscarCpf}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className={labelClass}>
                CPF do funcionário
              </label>

              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="CPF"
                className={fieldClass}
                inputMode="numeric"
                maxLength={14}
              />
            </div>

            <SearchButton loading={loading} label="Pesquisar" />
          </div>
        </SearchForm>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>
            <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
            Dados da solicitação
          </h2>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Cidade</label>
              <select
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {cidades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Data de ida</label>
              <input
                type="date"
                value={ida}
                max={hoje}
                onChange={(e) => setIda(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Data de volta</label>
              <input
                type="date"
                value={volta}
                max={hoje}
                onChange={(e) => setVolta(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Número do banco</label>
              <input
                value={numeroBanco}
                onChange={(e) => setNumeroBanco(e.target.value)}
                className={readOnlyFieldClass}
                readOnly
              />
            </div>

            <div>
              <label className={labelClass}>Agência</label>
              <input
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className={readOnlyFieldClass}
                readOnly
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Número da conta</label>
              <input
                value={numeroConta}
                onChange={(e) => setNumeroConta(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Justificativa</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className={textareaClass}
                rows={4}
                maxLength={400}
                placeholder="Descreva a justificativa do reembolso"
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <h2 className={sectionTitleClass.replace("px-5 py-4", "p-0")}>
              <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
              Despesas adicionadas
            </h2>

            <button
              type="button"
              onClick={abrirModalNovaDespesa}
              className={actionButtonClass}
            >
              <FaPlus size={12} />
              Adicionar despesa
            </button>
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Tipo
                      </th>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Descrição
                      </th>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Valor
                      </th>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Arquivo
                      </th>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Editar
                      </th>
                      <th className="h-10 border-b border-slate-200 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Excluir
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {despesas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          Nenhuma despesa adicionada.
                        </td>
                      </tr>
                    ) : (
                      despesas.map((item, index) => (
                        <tr key={`${item.tipo}-${index}`} className="transition hover:bg-slate-50">
                          <td className="h-11 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">{item.tipo}</td>
                          <td className="h-11 whitespace-pre-line border-b border-slate-100 px-4 py-2 text-sm text-slate-700">
                            {item.descricao}
                          </td>
                          <td className="h-11 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">{item.valor}</td>
                          <td className="h-11 border-b border-slate-100 px-4 py-2 text-sm text-slate-700">
                            <button
                              type="button"
                              onClick={() => baixarComprovante(item)}
                              className="text-left font-semibold text-[#007E7A] hover:underline"
                            >
                              {item.comprovanteNome}
                            </button>
                          </td>
                          <td className="h-11 border-b border-slate-100 px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => editarDespesa(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                            >
                              <FaEdit size={12} />
                            </button>
                          </td>
                          <td className="h-11 border-b border-slate-100 px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removerDespesa(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                            >
                              <FaTrash size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div className="w-full max-w-[260px]">
              <label className={labelClass}>
                Total de despesas
              </label>
              <input
                readOnly
                value={fmtBRL(totalDespesas)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-0 text-right text-sm font-bold leading-normal text-slate-900 shadow-sm outline-none"
              />
            </div>

            <button
              onClick={enviarSolicitacao}
              disabled={saving || enviarSolicitacaoLockRef.current}
              aria-busy={saving}
              className={primaryButtonClass}
            >
              <FaSave size={12} />
              {saving
                ? "Salvando..."
                : modoTela === "edicao"
                  ? "Atualizar solicitação"
                  : "Enviar solicitação"}
            </button>
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-black text-slate-950">Despesa</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Informe os dados e anexe o comprovante da despesa.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:bg-red-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={tipoDespesa}
                  onChange={(e) => setTipoDespesa(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Selecione</option>
                  {tiposDespesa.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                  value={descricaoDespesa}
                  onChange={(e) => setDescricaoDespesa(e.target.value)}
                  className={textareaClass}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Valor</label>
                  <input
                    value={valorDespesa}
                    onChange={(e) => setValorDespesa(monetizarDigitacao(e.target.value))}
                    className={isKms ? readOnlyFieldClass : fieldClass}
                    readOnly={isKms}
                    placeholder="R$ 0,00"
                  />
                </div>

                {isKms && (
                  <div>
                    <label className={labelClass}>
                      Total KMs (x 0,77)
                    </label>
                    <input
                      value={multiplicador}
                      onChange={(e) => setMultiplicador(e.target.value)}
                      onBlur={calcularKms}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-[#00AE9D]/30 bg-[#00AE9D]/5 p-4">
                <p className="mb-2 text-sm font-bold text-slate-800">
                  Adicione somente 1 comprovante por despesa.
                </p>

                {isKms && (
                  <p className="mb-3 text-xs text-amber-700">
                    Para reembolso por distância percorrida, anexe uma captura do Google Maps mostrando a rota entre origem e destino, com o total em quilômetros visível.
                  </p>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className={`${actionButtonClass} cursor-pointer`}>
                    Selecionar comprovante
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;

                        if (
                          file &&
                          file.type !== "application/pdf" &&
                          !file.name.toLowerCase().endsWith(".pdf")
                        ) {
                          alert("Selecione apenas arquivo PDF.");
                          e.currentTarget.value = "";
                          setComprovanteFile(null);
                          setComprovanteNome("Nenhum arquivo selecionado");
                          setComprovantePath(null);
                          return;
                        }

                        setComprovanteFile(file);
                        setComprovanteNome(file?.name || "Nenhum arquivo selecionado");
                        setComprovantePath(null);
                      }}
                    />
                  </label>

                  <span className="text-sm font-medium text-slate-600">{comprovanteNome}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={fecharModal}
                className={neutralButtonClass}
              >
                <FaTimes size={12} />
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarDespesa}
                disabled={salvandoDespesa || salvarDespesaLockRef.current}
                aria-busy={salvandoDespesa}
                className={primaryButtonClass}
              >
                <FaSave size={12} />
                {salvandoDespesa ? "Salvando..." : "Salvar despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

