"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
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
  const [itensPorPagina, setItensPorPagina] = useState(10);
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
  const isFinanceiro = useMemo(
    () =>
      isTesteFinanceiro ||
      gruposUsuario.includes(AD_GROUPS.FINANCEIRO) ||
      gruposUsuario.includes(AD_GROUPS.FINANCEIRO_CADASTRO),
    [gruposUsuario, isTesteFinanceiro]
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

  async function carregarLista(
    pagina = page,
    limite = itensPorPagina
  ) {
    try {
      setLoading(true);
      setErro("");

      const data = await buscarSolicitacoesSubsidioFuneralPaginado({
        pesquisa,
        status,
        page: pagina,
        limit: limite,
      });

      setRows(data.rows || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(pagina);
    } catch (e: any) {
      setErro(
        e?.response?.data?.error ||
        e?.message ||
        "Falha ao carregar solicitações."
      );
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

    if (acao === "ENVIAR_DIRETORIA" || acao === "ENVIAR_FINANCEIRO") {
      return Boolean(termoSolicitanteFile || temAnexo(TIPO_ANEXO_TERMO_SOLICITANTE));
    }

    if (acao === "DEVOLVER_ATENDIMENTO") {
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
          setErro("Anexe o termo assinado pelo solicitante antes de enviar ao financeiro.");
          return;
        }
        await salvarAnexoNoGerenciamento(TIPO_ANEXO_TERMO_SOLICITANTE, termoSolicitanteFile);
      }

      if (acao === "DEVOLVER_ATENDIMENTO" && !observacaoAcao.trim()) {
        setErro("Informe o motivo da devolução antes de devolver ao atendimento.");
        return;
      }

      const data = await atualizarStatusSubsidioFuneral({
        id: detalhe.ID_SUBSIDIO_FUNERAL,
        acao,
        observacao:
          acao === "DEVOLVER_ATENDIMENTO" ? observacaoAcao : "",
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
        { acao: "ENVIAR_FINANCEIRO", label: "Anexar termo e enviar ao financeiro", style: "secondary", icon: FaCheck },
      ];
    }

    if (st === "AGUARDANDO_FINANCEIRO" && podeAtuarComoFinanceiro) {
      return [
        { acao: "FINALIZAR", label: "Depósito realizado, concluir", style: "secondary", icon: FaCheck },
        { acao: "DEVOLVER_ATENDIMENTO", label: "Recusar documentação", style: "danger", icon: FaUndo },
      ];
    }

    return [];
  }, [detalhe, podeAtuarComoFinanceiro, podeAtuarComoSolicitante]);

  function podeEditarCadastro(item: SubsidioFuneralListaItem) {
    const statusAtual = String(item.ST_SOLICITACAO || "");
    if (usuarioEmTeste) return false;
    if (statusAtual !== "DEVOLVIDO_AO_ATENDIMENTO") return false;
    return usuarioEhSolicitanteAtual(usuario, item);
  }

  const primeiroRegistro =
    total === 0
      ? 0
      : (page - 1) * itensPorPagina + 1;

  const ultimoRegistro = Math.min(
    page * itensPorPagina,
    total
  );

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
                onChange={(e) => {
                  setPesquisa(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    carregarLista(1);
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
              <option value="DEVOLVIDO_AO_ATENDIMENTO">Devolvido</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Reprovado pela diretoria</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => carregarLista(1)}
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
            <h2 className="text-lg font-semibold text-slate-900">
              Solicitações cadastradas
            </h2>

            <p className="text-sm text-slate-500">
              Total localizado: {total}
            </p>
          </div>

          <select
            value={itensPorPagina}
            onChange={(e) => {
              const novoLimite = Number(e.target.value);

              setItensPorPagina(novoLimite);
              setPage(1);
              carregarLista(1, novoLimite);
            }}
            disabled={loading}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
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
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
                        >
                          <FaEye size={13} />
                          Visualizar
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

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-700">
              {primeiroRegistro}
            </span>{" "}
            até{" "}
            <span className="font-semibold text-slate-700">
              {ultimoRegistro}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700">
              {total}
            </span>{" "}
            solicitações
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                carregarLista(Math.max(page - 1, 1))
              }
              disabled={page <= 1 || loading}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaChevronLeft />
              Anterior
            </button>

            <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                carregarLista(
                  Math.min(page + 1, totalPages)
                )
              }
              disabled={page >= totalPages || loading}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && detalhe ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Gestão de subsídio funeral
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    Solicitação de subsídio funeral
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                        detalhe
                      )}`}
                    >
                      {statusLabel(detalhe)}
                    </span>

                    {detalhe.ID_SUBSIDIO_FUNERAL ? (
                      <span className="text-xs font-medium text-slate-400">
                        Solicitação #{detalhe.ID_SUBSIDIO_FUNERAL}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Fechar"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    {erro}
                  </p>
                </div>
              ) : null}

              {mensagem ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">
                    {mensagem}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Solicitante
                    </p>

                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Dados do solicitante
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Informações da pessoa responsável pela solicitação.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        Nome
                      </p>
                      <p className="mt-0.5 font-medium text-slate-800">
                        {detalhe.NM_SOLICITANTE || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        CPF
                      </p>
                      <p className="mt-0.5 text-slate-700">
                        {formatCpfView(
                          detalhe.NR_CPF_SOLICITANTE || ""
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Parentesco
                        </p>
                        <p className="mt-0.5 text-slate-700">
                          {detalhe.TP_PARENTESCO || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Profissão
                        </p>
                        <p className="mt-0.5 text-slate-700">
                          {detalhe.DS_PROFISSAO_SOLICITANTE || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Associado
                    </p>

                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Dados do associado
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Informações do associado relacionado à solicitação.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        Nome
                      </p>
                      <p className="mt-0.5 font-medium text-slate-800">
                        {detalhe.NM_ASSOCIADO || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        CPF
                      </p>
                      <p className="mt-0.5 text-slate-700">
                        {formatCpfView(
                          detalhe.NR_CPF_ASSOCIADO || ""
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Matrícula
                        </p>
                        <p className="mt-0.5 text-slate-700">
                          {detalhe.NR_MATRICULA_ASSOCIADO || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Data do óbito
                        </p>
                        <p className="mt-0.5 text-slate-700">
                          {formatarDataBR(detalhe.DT_OBITO)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        Local de trabalho
                      </p>
                      <p className="mt-0.5 text-slate-700">
                        {detalhe.NM_LOCAL_TRABALHO || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        Cargo
                      </p>
                      <p className="mt-0.5 text-slate-700">
                        {detalhe.DS_CARGO_ASSOCIADO || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Financeiro
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados financeiros
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Valores aprovados, prestador do serviço e dados para pagamento.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold text-slate-400">
                      Custo do serviço
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {fmtBRL(Number(detalhe.VL_CUSTO_SERVICO || 0))}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold text-primary">
                      Valor liberado
                    </p>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {fmtBRL(
                        Number(detalhe.VL_SUBSIDIO_APROVADO || 0)
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold text-slate-400">
                      Banco
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {detalhe.NM_BANCO || detalhe.CD_BANCO || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      Prestador do serviço
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {detalhe.NM_PRESTADOR_SERVICO || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      Titular da conta
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {detalhe.NM_TITULAR_CONTA || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {String(detalhe.DS_MOTIVO_DEVOLUCAO || "").trim() ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                    Atenção
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-amber-950">
                    Motivo da devolução
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-amber-900">
                    {detalhe.DS_MOTIVO_DEVOLUCAO}
                  </p>
                </div>
              ) : null}

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Documentos
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Anexos
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Documentos vinculados a esta solicitação.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {Array.isArray(detalhe.ANEXOS) &&
                    detalhe.ANEXOS.length ? (
                    detalhe.ANEXOS.map(
                      (item: any, index: number) => (
                        <div
                          key={`${item.NM_ARQUIVO_ORIGINAL}-${index}`}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.NM_ARQUIVO_ORIGINAL}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {labelTipoAnexo(item.TP_ANEXO)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              baixarAnexo(
                                item.DS_CAMINHO_ARQUIVO,
                                item.NM_ARQUIVO_ORIGINAL
                              )
                            }
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          >
                            <FaDownload size={11} />
                            Baixar
                          </button>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                      <p className="text-sm text-slate-500">
                        Nenhum anexo disponível.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Fluxo
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Andamento da solicitação
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Ações disponíveis conforme o status atual e seu perfil.
                  </p>
                </div>

                {String(detalhe.ST_SOLICITACAO || "") ===
                  "DEVOLVIDO_AO_ATENDIMENTO" &&
                  podeEditarCadastro(detalhe) ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-amber-900">
                          Solicitação devolvida ao atendimento
                        </p>

                        <p className="mt-1 text-sm leading-5 text-amber-800">
                          Revise o motivo da devolução e clique em{" "}
                          <span className="font-semibold">
                            Editar cadastro
                          </span>{" "}
                          para corrigir os anexos antes de reenviar ao
                          financeiro.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/auth/cadastro_subsidio_funeral?id=${detalhe.ID_SUBSIDIO_FUNERAL}`
                          )
                        }
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
                      >
                        <FaEdit size={12} />
                        Editar cadastro
                      </button>
                    </div>
                  </div>
                ) : acoesDisponiveis.length ? (
                  <>
                    {String(detalhe.ST_SOLICITACAO || "") ===
                      "AGUARDANDO_ASSINATURA_SOLICITANTE" &&
                      podeAtuarComoSolicitante ? (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Termo assinado pelo solicitante
                        </label>

                        <input
                          type="file"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                          onChange={(e) =>
                            setTermoSolicitanteFile(
                              e.target.files?.[0] || null
                            )
                          }
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Anexe aqui a solicitação impressa e assinada. Ao
                          confirmar, o sistema envia para conferência do
                          financeiro.
                        </p>
                      </div>
                    ) : null}

                    {String(detalhe.ST_SOLICITACAO || "") ===
                      "AGUARDANDO_FINANCEIRO" &&
                      podeAtuarComoFinanceiro ? (
                      <div className="mt-5">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Documento faltante / motivo da devolução
                        </label>

                        <textarea
                          value={observacaoAcao}
                          onChange={(e) =>
                            setObservacaoAcao(e.target.value)
                          }
                          placeholder="Preencha somente se for recusar, informando qual documento falta."
                          rows={4}
                          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      {acoesDisponiveis.map((item) => {
                        const Icon = item.icon;

                        const className =
                          item.style === "danger"
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-secondary text-white hover:bg-primary";

                        return (
                          <button
                            key={item.acao}
                            type="button"
                            disabled={
                              submitting ||
                              !podeExecutarAcao(item.acao)
                            }
                            onClick={() =>
                              executarAcao(item.acao)
                            }
                            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-sm transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <Icon size={12} />

                            {submitting
                              ? "Processando..."
                              : item.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-sm text-slate-500">
                      Não há ação pendente para o seu perfil neste status.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Auditoria
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Histórico
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Registro das movimentações realizadas nesta solicitação.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {Array.isArray(detalhe.HISTORICO) &&
                    detalhe.HISTORICO.length ? (
                    detalhe.HISTORICO.map(
                      (item: any, index: number) => (
                        <div
                          key={`${item.ID_SUBSIDIO_FUNERAL_HIST || index
                            }`}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-col gap-2 text-sm text-slate-600">
                            <p className="font-semibold text-slate-800">
                              {item.DS_ACAO}
                            </p>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <div>
                                <span className="font-semibold text-slate-700">
                                  Status:
                                </span>{" "}
                                {item.ST_ANTERIOR || "-"} →{" "}
                                {item.ST_NOVO || "-"}
                              </div>

                              <div>
                                <span className="font-semibold text-slate-700">
                                  Usuário:
                                </span>{" "}
                                {item.NM_USUARIO || "-"}
                              </div>

                              <div>
                                <span className="font-semibold text-slate-700">
                                  Data:
                                </span>{" "}
                                {formatarDataHoraBR(item.DT_ACAO)}
                              </div>

                              <div>
                                <span className="font-semibold text-slate-700">
                                  Observação:
                                </span>{" "}
                                {item.DS_OBSERVACAO || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center">
                      <p className="text-sm text-slate-500">
                        Ainda não há histórico registrado.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
