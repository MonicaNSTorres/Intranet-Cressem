"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCheck,
  FaDownload,
  FaEdit,
  FaEye,
  FaSearch,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import { getMeAdUser, type MeResponse } from "@/services/auth.service";
import { AD_GROUPS } from "@/config/ad-groups";
import {
  PERFIL_TESTE_SUBSIDIO_FUNERAL,
  usuarioEstaNoModoTesteSubsidio,
} from "@/lib/subsidio-funeral-perfil-teste";
import {
  atualizarStatusSubsidioFuneral,
  buscarSolicitacoesSubsidioFuneralPaginado,
  type SubsidioFuneralListaItem,
} from "@/services/gerenciamento_subsidio_funeral.service";
import {
  baixarAnexoSubsidioFuneral,
  buscarSubsidioFuneralPorId,
  editarSubsidioFuneral,
} from "@/services/cadastro_subsidio_funeral.service";
import { fmtBRL, formatCpfView } from "@/utils/br";

const TIPO_ANEXO_DOCUMENTOS = "DOCUMENTOS_GERAIS";
const TIPO_ANEXO_TERMO_SOLICITANTE = "AUTORIZACAO_ASSINADA_SOLICITANTE";
const TIPO_ANEXO_TERMO_DIRETORIA = "AUTORIZACAO_ASSINADA_DIRETORIA";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

function statusBadgeClass(item: { ST_SOLICITACAO?: string; DT_APROVACAO_DIRETORIA?: string | null }) {
  const status = String(item.ST_SOLICITACAO || "");
  if (status === "AGUARDANDO_FINANCEIRO" && item.DT_APROVACAO_DIRETORIA) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  const map: Record<string, string> = {
    AGUARDANDO_ASSINATURA_SOLICITANTE: "border-amber-200 bg-amber-50 text-amber-700",
    AGUARDANDO_DIRETORIA: "border-sky-200 bg-sky-50 text-sky-700",
    AGUARDANDO_FINANCEIRO: "border-violet-200 bg-violet-50 text-violet-700",
    DEVOLVIDO_AO_ATENDIMENTO: "border-rose-200 bg-rose-50 text-rose-700",
    FINALIZADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELADO: "border-red-200 bg-red-50 text-red-700",
  };

  return map[status] || "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(item: { ST_SOLICITACAO?: string; DT_APROVACAO_DIRETORIA?: string | null }) {
  const status = String(item.ST_SOLICITACAO || "");
  if (status === "AGUARDANDO_FINANCEIRO" && item.DT_APROVACAO_DIRETORIA) {
    return "Aguardando depósito";
  }

  const labels: Record<string, string> = {
    AGUARDANDO_ASSINATURA_SOLICITANTE: "Aguardando assinatura",
    AGUARDANDO_DIRETORIA: "Aguardando aprovação diretoria",
    AGUARDANDO_FINANCEIRO: "Aguardando financeiro",
    DEVOLVIDO_AO_ATENDIMENTO: "Devolvido ao atendimento",
    FINALIZADO: "Finalizado",
    CANCELADO: "Reprovado pela diretoria",
  };

  return labels[status] || status || "-";
}

function labelTipoAnexo(tipo: string) {
  if (tipo === TIPO_ANEXO_DOCUMENTOS || tipo === "DOCUMENTACAO_UNICA") return "Documentação obrigatória";
  if (
    tipo === TIPO_ANEXO_TERMO_SOLICITANTE ||
    ["AUTORIZACAO_GERADA", "TERMO_GERADO_ASSINADO", "TERMO_ASSINADO", "TERMO_SOLICITANTE"].includes(tipo)
  ) {
    return "Termo assinado pelo solicitante";
  }
  if (tipo === TIPO_ANEXO_TERMO_DIRETORIA) return "Termo assinado pela diretoria";
  return tipo || "-";
}

function tipoAnexoCompativel(tipo: string) {
  const valor = String(tipo || "").trim().toUpperCase();

  if (["DOCUMENTOS_GERAIS", "DOCUMENTACAO_UNICA", "DOCUMENTOS", "DOCUMENTACAO"].includes(valor)) {
    return TIPO_ANEXO_DOCUMENTOS;
  }

  if (
    [
      "AUTORIZACAO_GERADA",
      "AUTORIZACAO_ASSINADA_SOLICITANTE",
      "TERMO_ASSINADO",
      "TERMO_GERADO_ASSINADO",
      "TERMO_SOLICITANTE",
    ].includes(valor)
  ) {
    return TIPO_ANEXO_TERMO_SOLICITANTE;
  }

  if (
    [
      "AUTORIZACAO_ASSINADA_DIRETORIA",
      "TERMO_ASSINADO_DIRETORIA",
      "TERMO_DIRETORIA",
      "TERMO_DIRETORIA_ASSINADO",
    ].includes(valor)
  ) {
    return TIPO_ANEXO_TERMO_DIRETORIA;
  }

  return valor;
}

function fileToDataURL(file: File | null) {
  return new Promise<string | null>((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeLogin(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
}

function usuarioEhSolicitanteAtual(
  usuario: MeResponse | null | undefined,
  solicitacao?: {
    LOGIN_USUARIO_ABERTURA?: string | null;
    NM_USUARIO_ABERTURA?: string | null;
  } | null
) {
  const loginUsuario = normalizeLogin(usuario?.username);
  const emailUsuario = normalizeLogin(usuario?.email);
  const nomeUsuario = normalizeLogin(usuario?.nome_completo);
  const loginAbertura = normalizeLogin(solicitacao?.LOGIN_USUARIO_ABERTURA);
  const nomeAbertura = normalizeLogin(solicitacao?.NM_USUARIO_ABERTURA);

  const identificadoresUsuario = [loginUsuario, emailUsuario].filter(Boolean);
  const identificadoresAbertura = [loginAbertura, nomeAbertura].filter(Boolean);

  if (
    identificadoresUsuario.length &&
    identificadoresAbertura.length &&
    identificadoresUsuario.some((valor) => identificadoresAbertura.includes(valor))
  ) {
    return true;
  }

  return Boolean(nomeUsuario) && Boolean(nomeAbertura) && nomeUsuario === nomeAbertura;
}

function formatarDataBR(value?: string | null) {
  const texto = String(value || "").trim();
  if (!texto) return "-";

  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  return texto;
}

function formatarDataHoraBR(value?: string | null) {
  const texto = String(value || "").trim();
  if (!texto) return "-";

  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}${match[6] ? `:${match[6]}` : ""}`;
  }

  return formatarDataBR(texto);
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
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

export function GerenciamentoSubsidioFuneralForm() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<SubsidioFuneralListaItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);
  const [observacaoAcao, setObservacaoAcao] = useState("");
  const [termoSolicitanteFile, setTermoSolicitanteFile] = useState<File | null>(null);

  const gruposUsuario = useMemo(() => (Array.isArray(usuario?.grupos) ? usuario?.grupos : []), [usuario]);
  const usuarioEmTeste = useMemo(
    () => usuarioEstaNoModoTesteSubsidio(usuario?.username, usuario?.email),
    [usuario]
  );
  const isTesteFinanceiro = usuarioEmTeste && PERFIL_TESTE_SUBSIDIO_FUNERAL === "FINANCEIRO";
  const isTesteDiretoria = usuarioEmTeste && PERFIL_TESTE_SUBSIDIO_FUNERAL === "DIRETORIA";
  const isSuporte = useMemo(
    () => !usuarioEmTeste && gruposUsuario.includes(AD_GROUPS.SUPORTE),
    [gruposUsuario, usuarioEmTeste]
  );
  const isFinanceiro = useMemo(
    () =>
      isTesteFinanceiro ||
      gruposUsuario.includes(AD_GROUPS.FINANCEIRO) ||
      gruposUsuario.includes(AD_GROUPS.FINANCEIRO_CADASTRO),
    [gruposUsuario, isTesteFinanceiro]
  );
  const isDiretoria = useMemo(
    () => isTesteDiretoria || gruposUsuario.includes(AD_GROUPS.GERENCIA_DIRETORIA),
    [gruposUsuario, isTesteDiretoria]
  );
  const isSolicitanteAtual = useMemo(() => {
    if (usuarioEmTeste) return false;
    return usuarioEhSolicitanteAtual(usuario, detalhe);
  }, [usuario, detalhe, usuarioEmTeste]);

  const podeAtuarComoSolicitante = useMemo(() => {
    const statusAtual = String(detalhe?.ST_SOLICITACAO || "");
    return (
      isSolicitanteAtual &&
      ["AGUARDANDO_ASSINATURA_SOLICITANTE", "DEVOLVIDO_AO_ATENDIMENTO"].includes(statusAtual)
    );
  }, [detalhe, isSolicitanteAtual]);

  const podeAtuarComoFinanceiro = useMemo(() => {
    return isFinanceiro && String(detalhe?.ST_SOLICITACAO || "") === "AGUARDANDO_FINANCEIRO";
  }, [detalhe, isFinanceiro]);

  const podeAtuarComoDiretoria = useMemo(() => {
    return isDiretoria && String(detalhe?.ST_SOLICITACAO || "") === "AGUARDANDO_DIRETORIA";
  }, [detalhe, isDiretoria]);

  useEffect(() => {
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (usuario) {
      carregarLista();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, page, status]);

  async function carregarUsuario() {
    try {
      const me = await getMeAdUser();
      setUsuario(me);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível identificar o usuário.");
    }
  }

  async function carregarLista() {
    try {
      setLoading(true);
      setErro("");

      const data = await buscarSolicitacoesSubsidioFuneralPaginado({
        pesquisa,
        status,
        page,
        limit: 10,
      });

      setRows(data.rows || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e: any) {
      setErro(e?.response?.data?.error || e?.message || "Falha ao carregar solicitações.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirDetalhes(id: number) {
    try {
      setErro("");
      setMensagem("");
      const data = await buscarSubsidioFuneralPorId(id);
      setDetalhe(data);
      setObservacaoAcao("");
      setTermoSolicitanteFile(null);
      setModalOpen(true);
    } catch (e: any) {
      setErro(e?.response?.data?.error || e?.message || "Falha ao abrir detalhes.");
    }
  }

  async function baixarAnexo(caminho: string, nome: string) {
    const blob = await baixarAnexoSubsidioFuneral(caminho);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome || "anexo";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function temAnexo(tipo: string) {
    return Array.isArray(detalhe?.ANEXOS)
      ? detalhe.ANEXOS.some((item: any) => tipoAnexoCompativel(item.TP_ANEXO) === tipo)
      : false;
  }

  function podeExecutarAcao(acao: string) {
    if ((acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO") && !podeAtuarComoSolicitante) return false;
    if ((acao === "DEVOLVER_ATENDIMENTO" || acao === "FINALIZAR") && !podeAtuarComoFinanceiro) return false;
    if ((acao === "APROVAR_DIRETORIA" || acao === "REPROVAR_DIRETORIA") && !podeAtuarComoDiretoria) return false;

    if (acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO") {
      return Boolean(termoSolicitanteFile || temAnexo(TIPO_ANEXO_TERMO_SOLICITANTE));
    }

    if (acao === "DEVOLVER_ATENDIMENTO" || acao === "REPROVAR_DIRETORIA") {
      return observacaoAcao.trim().length > 0;
    }

    return true;
  }

  async function salvarAnexoNoGerenciamento(tipo: string, arquivo: File | null) {
    if (!detalhe?.ID_SUBSIDIO_FUNERAL || !arquivo) return;

    const anexosAtuais = Array.isArray(detalhe.ANEXOS) ? detalhe.ANEXOS : [];
    const anexosPayload = anexosAtuais
      .filter((item: any) => String(item.TP_ANEXO || "") !== tipo)
      .map((item: any) => ({
        TP_ANEXO: String(item.TP_ANEXO || ""),
        NM_ARQUIVO_ORIGINAL: String(item.NM_ARQUIVO_ORIGINAL || "arquivo"),
        NR_TAMANHO_BYTES: Number(item.NR_TAMANHO_BYTES || 0) || undefined,
        DS_MIME_TYPE: item.DS_MIME_TYPE || null,
        DS_CAMINHO_ARQUIVO: item.DS_CAMINHO_ARQUIVO || null,
        ARQUIVO: null,
      }));

    anexosPayload.push({
      TP_ANEXO: tipo,
      NM_ARQUIVO_ORIGINAL: arquivo.name,
      NR_TAMANHO_BYTES: arquivo.size,
      DS_MIME_TYPE: arquivo.type || null,
      DS_CAMINHO_ARQUIVO: null,
      ARQUIVO: await fileToDataURL(arquivo),
    });

    await editarSubsidioFuneral({
      ID_SUBSIDIO_FUNERAL: detalhe.ID_SUBSIDIO_FUNERAL,
      ST_SOLICITACAO: detalhe.ST_SOLICITACAO,
      DT_SOLICITACAO: detalhe.DT_SOLICITACAO,
      NM_USUARIO_ABERTURA: usuario?.nome_completo || usuario?.username || "",
      LOGIN_USUARIO_ABERTURA: usuario?.username || "",
      NM_SOLICITANTE: detalhe.NM_SOLICITANTE || "",
      NR_CPF_SOLICITANTE: detalhe.NR_CPF_SOLICITANTE || "",
      TP_PARENTESCO: detalhe.TP_PARENTESCO || "",
      DS_PARENTESCO_OUTRO: detalhe.DS_PARENTESCO_OUTRO || "",
      DS_PROFISSAO_SOLICITANTE: detalhe.DS_PROFISSAO_SOLICITANTE || "",
      ID_ASSOCIADO: detalhe.ID_ASSOCIADO || null,
      NR_CPF_ASSOCIADO: detalhe.NR_CPF_ASSOCIADO || "",
      NM_ASSOCIADO: detalhe.NM_ASSOCIADO || "",
      NR_MATRICULA_ASSOCIADO: detalhe.NR_MATRICULA_ASSOCIADO || "",
      NM_LOCAL_TRABALHO: detalhe.NM_LOCAL_TRABALHO || "",
      DS_CARGO_ASSOCIADO: detalhe.DS_CARGO_ASSOCIADO || "",
      DT_ASSOCIACAO: detalhe.DT_ASSOCIACAO || "",
      DT_OBITO: detalhe.DT_OBITO || "",
      VL_CUSTO_SERVICO: Number(detalhe.VL_CUSTO_SERVICO || 0),
      VL_SUBSIDIO_APROVADO: Number(detalhe.VL_SUBSIDIO_APROVADO || 0),
      NM_PRESTADOR_SERVICO: detalhe.NM_PRESTADOR_SERVICO || "",
      NR_CPF_CNPJ_PRESTADOR: detalhe.NR_CPF_CNPJ_PRESTADOR || "",
      NM_TITULAR_CONTA: detalhe.NM_TITULAR_CONTA || "",
      NR_CPF_TITULAR_CONTA: detalhe.NR_CPF_TITULAR_CONTA || "",
      CD_BANCO: detalhe.CD_BANCO || "",
      NM_BANCO: detalhe.NM_BANCO || "",
      CD_AGENCIA: detalhe.CD_AGENCIA || "",
      NR_CONTA: detalhe.NR_CONTA || "",
      TP_CONTA: detalhe.TP_CONTA || "CORRENTE",
      CHAVE_PIX: "",
      DS_OBSERVACAO: detalhe.DS_OBSERVACAO || "",
      DS_MOTIVO_DEVOLUCAO: detalhe.DS_MOTIVO_DEVOLUCAO || "",
      ANEXOS: anexosPayload,
    });
  }

  async function executarAcao(acao: string) {
    if (!detalhe?.ID_SUBSIDIO_FUNERAL) return;

    try {
      setSubmitting(true);
      setErro("");
      setMensagem("");

      if (!podeExecutarAcao(acao)) {
        setErro("Seu perfil não pode atuar nesta etapa da solicitação.");
        return;
      }

      if (acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO") {
        if (!termoSolicitanteFile && !temAnexo(TIPO_ANEXO_TERMO_SOLICITANTE)) {
          setErro("Anexe o termo assinado pelo solicitante antes de enviar à diretoria.");
          return;
        }
        await salvarAnexoNoGerenciamento(TIPO_ANEXO_TERMO_SOLICITANTE, termoSolicitanteFile);
      }

      if ((acao === "DEVOLVER_ATENDIMENTO" || acao === "REPROVAR_DIRETORIA") && !observacaoAcao.trim()) {
        setErro(
          acao === "REPROVAR_DIRETORIA"
            ? "Informe o motivo da reprovação antes de concluir."
            : "Informe o motivo da devolução antes de devolver ao atendimento."
        );
        return;
      }

      const data = await atualizarStatusSubsidioFuneral({
        id: detalhe.ID_SUBSIDIO_FUNERAL,
        acao,
        observacao:
          acao === "DEVOLVER_ATENDIMENTO" || acao === "REPROVAR_DIRETORIA"
            ? observacaoAcao
            : "",
        nomeResponsavel: usuario?.nome_completo || usuario?.username || "",
        loginResponsavel: usuario?.username || "",
      });

      setMensagem(data?.message || "Status atualizado com sucesso.");
      const atualizado = await buscarSubsidioFuneralPorId(detalhe.ID_SUBSIDIO_FUNERAL);
      setDetalhe(atualizado);
      setTermoSolicitanteFile(null);
      await carregarLista();
    } catch (e: any) {
      setErro(e?.response?.data?.error || e?.message || "Falha ao atualizar status.");
    } finally {
      setSubmitting(false);
    }
  }

  const acoesDisponiveis = useMemo(() => {
    const st = String(detalhe?.ST_SOLICITACAO || "");

    if (st === "AGUARDANDO_ASSINATURA_SOLICITANTE" && podeAtuarComoSolicitante) {
      return [
        { acao: "ENVIAR_DIRETORIA", label: "Anexar termo e enviar à diretoria", style: "secondary", icon: FaCheck },
      ];
    }

    if (st === "AGUARDANDO_FINANCEIRO" && podeAtuarComoFinanceiro) {
      return [
        { acao: "FINALIZAR", label: "Depósito realizado, concluir", style: "secondary", icon: FaCheck },
        { acao: "DEVOLVER_ATENDIMENTO", label: "Recusar documentação", style: "danger", icon: FaUndo },
      ];
    }

    if (st === "AGUARDANDO_DIRETORIA" && podeAtuarComoDiretoria) {
      return [
        { acao: "APROVAR_DIRETORIA", label: "Aprovar e enviar ao financeiro", style: "secondary", icon: FaCheck },
        { acao: "REPROVAR_DIRETORIA", label: "Reprovar solicitação", style: "danger", icon: FaTimes },
      ];
    }

    return [];
  }, [detalhe, podeAtuarComoDiretoria, podeAtuarComoFinanceiro, podeAtuarComoSolicitante]);

  function podeEditarCadastro(item: SubsidioFuneralListaItem) {
    const statusAtual = String(item.ST_SOLICITACAO || "");
    if (usuarioEmTeste) return false;
    if (statusAtual !== "DEVOLVIDO_AO_ATENDIMENTO") return false;
    return usuarioEhSolicitanteAtual(usuario, item);
  }

  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <div className="grid gap-4 xl:grid-cols-[1.5fr_280px_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pesquisa
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Solicitante, associado ou prestador"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    carregarLista();
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select className={inputClass} value={status} onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}>
              <option value="">Todos</option>
              <option value="AGUARDANDO_ASSINATURA_SOLICITANTE">Aguardando termo assinado</option>
              <option value="AGUARDANDO_FINANCEIRO">Aguardando financeiro</option>
              <option value="AGUARDANDO_DIRETORIA">Aguardando aprovação diretoria</option>
              <option value="DEVOLVIDO_AO_ATENDIMENTO">Devolvido</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Reprovado pela diretoria</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                carregarLista();
              }}
              className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary"
            >
              Buscar
            </button>
          </div>
        </div>

        {isTesteFinanceiro ? (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
            <span className="font-semibold">Perfil de teste:</span> Financeiro
          </div>
        ) : null}

        {isTesteDiretoria ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <span className="font-semibold">Perfil de teste:</span> Diretoria
          </div>
        ) : null}

        {mensagem ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {mensagem}
          </div>
        ) : null}

        {erro && !modalOpen ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Solicitações cadastradas</h2>
            <p className="text-sm text-slate-500">
              Total localizado: {total}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                <th className="px-4 py-3 text-left font-semibold">Associado</th>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-left font-semibold">Valor liberado</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((item) => (
                  <tr key={item.ID_SUBSIDIO_FUNERAL}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.NM_SOLICITANTE}</div>
                      <div className="text-xs text-slate-500">{formatCpfView(item.NR_CPF_SOLICITANTE || "")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.NM_ASSOCIADO}</div>
                      <div className="text-xs text-slate-500">{formatCpfView(item.NR_CPF_ASSOCIADO || "")}</div>
                    </td>
                    <td className="px-4 py-3">{formatarDataBR(item.DT_SOLICITACAO)}</td>
                    <td className="px-4 py-3">{fmtBRL(Number(item.VL_SUBSIDIO_APROVADO || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(item)}`}>
                        {statusLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirDetalhes(item.ID_SUBSIDIO_FUNERAL)}
                          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                        >
                          <FaEye size={11} />
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Nenhuma solicitação encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {modalOpen && detalhe ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Solicitação de subsídio funeral
                </h3>
                <p className="text-sm text-slate-500">{statusLabel(detalhe)}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <div className={cardClass}>
                  <h4 className="text-base font-semibold text-slate-900">Solicitante</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Nome:</span> {detalhe.NM_SOLICITANTE}</div>
                    <div><span className="font-semibold text-slate-800">CPF:</span> {formatCpfView(detalhe.NR_CPF_SOLICITANTE || "")}</div>
                    <div><span className="font-semibold text-slate-800">Parentesco:</span> {detalhe.TP_PARENTESCO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Profissão:</span> {detalhe.DS_PROFISSAO_SOLICITANTE || "-"}</div>
                  </div>
                </div>

                <div className={cardClass}>
                  <h4 className="text-base font-semibold text-slate-900">Associado</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Nome:</span> {detalhe.NM_ASSOCIADO}</div>
                    <div><span className="font-semibold text-slate-800">CPF:</span> {formatCpfView(detalhe.NR_CPF_ASSOCIADO || "")}</div>
                    <div><span className="font-semibold text-slate-800">Matrícula:</span> {detalhe.NR_MATRICULA_ASSOCIADO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Local:</span> {detalhe.NM_LOCAL_TRABALHO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Cargo:</span> {detalhe.DS_CARGO_ASSOCIADO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Óbito:</span> {detalhe.DT_OBITO || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-1">
                <div className={cardClass}>
                  <h4 className="text-base font-semibold text-slate-900">Financeiro</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Custo:</span> {fmtBRL(Number(detalhe.VL_CUSTO_SERVICO || 0))}</div>
                    <div><span className="font-semibold text-slate-800">Liberado:</span> {fmtBRL(Number(detalhe.VL_SUBSIDIO_APROVADO || 0))}</div>
                    <div><span className="font-semibold text-slate-800">Prestador:</span> {detalhe.NM_PRESTADOR_SERVICO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Banco:</span> {detalhe.NM_BANCO || detalhe.CD_BANCO || "-"}</div>
                    <div><span className="font-semibold text-slate-800">Titular:</span> {detalhe.NM_TITULAR_CONTA || "-"}</div>
                  </div>
                </div>
              </div>

              {String(detalhe.DS_MOTIVO_DEVOLUCAO || "").trim() ? (
                <div className={cardClass}>
                  <h4 className="text-base font-semibold text-slate-900">Motivo da devolução</h4>
                  <div className="mt-3 text-sm text-slate-600">
                    {detalhe.DS_MOTIVO_DEVOLUCAO}
                  </div>
                </div>
              ) : null}

              <div className={cardClass}>
                <h4 className="text-base font-semibold text-slate-900">Anexos</h4>
                <div className="mt-3 space-y-3">
                  {Array.isArray(detalhe.ANEXOS) && detalhe.ANEXOS.length ? (
                    detalhe.ANEXOS.map((item: any, index: number) => (
                      <div key={`${item.NM_ARQUIVO_ORIGINAL}-${index}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                          <div className="font-medium text-slate-800">{item.NM_ARQUIVO_ORIGINAL}</div>
                          <div className="text-xs text-slate-500">{labelTipoAnexo(item.TP_ANEXO)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => baixarAnexo(item.DS_CAMINHO_ARQUIVO, item.NM_ARQUIVO_ORIGINAL)}
                          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700"
                        >
                          <FaDownload size={11} />
                          Baixar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      Nenhum anexo disponível.
                    </div>
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <h4 className="text-base font-semibold text-slate-900">Andamento</h4>

                {String(detalhe.ST_SOLICITACAO || "") === "DEVOLVIDO_AO_ATENDIMENTO" && podeEditarCadastro(detalhe) ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-amber-900">Solicitação devolvida ao atendimento</div>
                        <div className="mt-1">
                          Revise o motivo da devolução e clique em <span className="font-semibold">Editar cadastro</span> para corrigir os anexos antes de reenviar à diretoria.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/auth/cadastro_subsidio_funeral?id=${detalhe.ID_SUBSIDIO_FUNERAL}`)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <FaEdit size={12} />
                        Editar cadastro
                      </button>
                    </div>
                  </div>
                ) : acoesDisponiveis.length ? (
                  <>
                    {String(detalhe.ST_SOLICITACAO || "") === "AGUARDANDO_ASSINATURA_SOLICITANTE" &&
                    podeAtuarComoSolicitante ? (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Termo assinado pelo solicitante
                        </label>
                        <input
                          type="file"
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium`}
                          onChange={(e) => setTermoSolicitanteFile(e.target.files?.[0] || null)}
                        />
                        <p className="mt-2 text-xs text-emerald-700">
                          Anexe aqui a solicitação impressa e assinada. Ao confirmar, o sistema envia para aprovação da diretoria.
                        </p>
                      </div>
                    ) : null}

                    {String(detalhe.ST_SOLICITACAO || "") === "AGUARDANDO_DIRETORIA" && podeAtuarComoDiretoria ? (
                      <>
                        <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                          <div className="text-sm font-semibold text-sky-800">Análise da diretoria</div>
                          <p className="mt-1 text-xs text-sky-700">
                            Ao aprovar, a solicitação segue para o financeiro conferir a documentação e realizar o depósito.
                          </p>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Motivo da reprovação
                          </label>
                          <textarea
                            className={`${inputClass} min-h-[100px]`}
                            value={observacaoAcao}
                            onChange={(e) => setObservacaoAcao(e.target.value)}
                            placeholder="Preencha este campo somente se a diretoria reprovar a solicitação."
                          />
                        </div>
                      </>
                    ) : null}

                    {String(detalhe.ST_SOLICITACAO || "") === "AGUARDANDO_FINANCEIRO" && podeAtuarComoFinanceiro ? (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Documento faltante / motivo da devolução
                        </label>
                        <textarea
                          className={`${inputClass} min-h-[110px]`}
                          value={observacaoAcao}
                          onChange={(e) => setObservacaoAcao(e.target.value)}
                          placeholder="Preencha somente se for recusar, informando qual documento falta."
                        />
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {acoesDisponiveis.map((item) => {
                        const Icon = item.icon;
                        const className =
                          item.style === "danger"
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";

                        return (
                          <button
                            key={item.acao}
                            type="button"
                            disabled={submitting || !podeExecutarAcao(item.acao)}
                            onClick={() => executarAcao(item.acao)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <Icon size={12} />
                            {submitting ? "Processando..." : item.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Não há ação pendente para o seu perfil neste status.
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <h4 className="text-base font-semibold text-slate-900">Histórico</h4>
                <div className="mt-3 space-y-3">
                  {Array.isArray(detalhe.HISTORICO) && detalhe.HISTORICO.length ? (
                    detalhe.HISTORICO.map((item: any, index: number) => (
                      <div key={`${item.ID_SUBSIDIO_FUNERAL_HIST || index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                          <div className="font-semibold text-slate-800">{item.DS_ACAO}</div>
                          <div>Status: {item.ST_ANTERIOR || "-"} → {item.ST_NOVO || "-"}</div>
                          <div>Usuário: {item.NM_USUARIO || "-"}</div>
                          <div>Data: {formatarDataHoraBR(item.DT_ACAO)}</div>
                          <div>Observação: {item.DS_OBSERVACAO || "-"}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      Ainda não há histórico registrado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
