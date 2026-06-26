"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FaDownload,
  FaFilePdf,
  FaSave,
  FaTrash,
} from "react-icons/fa";
import { SearchButton } from "@/components/ui/search-button";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { getMeAdUser, type MeResponse } from "@/services/auth.service";
import { AD_GROUPS } from "@/config/ad-groups";
import {
  PERFIL_TESTE_SUBSIDIO_AUDITIVO,
  usuarioEstaNoModoTesteSubsidioAuditivo,
} from "@/lib/subsidio-auditivo-perfil-teste";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
import {
  baixarAnexoSubsidioAuditivo,
  buscarSubsidioAuditivoPorId,
  cadastrarSubsidioAuditivo,
  editarSubsidioAuditivo,
  type SubsidioAuditivoAnexoPayload,
} from "@/services/cadastro_subsidio_auditivo.service";
import {
  fmtBRL,
  formatCpfCnpjView,
  formatCpfView,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
} from "@/utils/br";
import { gerarPdfSubsidioAuditivo } from "@/lib/pdf/gerarPdfSubsidioAuditivo";

type AnexoItem = {
  tipo: string;
  nome: string;
  tamanho?: number;
  mime?: string | null;
  path?: string | null;
  arquivo?: File | null;
};

const TIPO_ANEXO_DOCUMENTOS = "DOCUMENTOS_GERAIS";
const TIPO_ANEXO_ORCAMENTOS_NOTA = "ORCAMENTOS_NOTA_FISCAL";
const TIPO_ANEXO_TERMO = "AUTORIZACAO_ASSINADA_SOLICITANTE";
const TIPO_ANEXO_TERMO_DIRETORIA = "AUTORIZACAO_ASSINADA_DIRETORIA";
const TIPOS_ANEXO_CORRECAO_ATENDIMENTO = [
  TIPO_ANEXO_DOCUMENTOS,
  TIPO_ANEXO_ORCAMENTOS_NOTA,
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

function toIsoDate(value: string) {
  if (!value) return "";
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return value;
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

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function calcularMesesAssociacao(data: string) {
  const iso = toIsoDate(String(data || "").trim());
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);

  const hoje = new Date();
  let meses = (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);

  if (hoje.getDate() < dia) {
    meses -= 1;
  }

  return Math.max(meses, 0);
}

function normalizeLogin(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
}

function usuarioEhSolicitanteAtual(
  usuario: MeResponse | null | undefined,
  dadosAbertura: {
    login?: string | null;
    nome?: string | null;
  }
) {
  const loginUsuario = normalizeLogin(usuario?.username);
  const emailUsuario = normalizeLogin(usuario?.email);
  const nomeUsuario = normalizeLogin(usuario?.nome_completo);
  const loginAbertura = normalizeLogin(dadosAbertura.login);
  const nomeAbertura = normalizeLogin(dadosAbertura.nome);

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

function formatCodigoBanco(value: string) {
  return onlyDigits(value).slice(0, 3);
}

function formatNomeBanco(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-ZÀ-Ú0-9\s.&-]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

function formatAgencia(value: string) {
  const digits = onlyDigits(value).slice(0, 5);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function formatContaBancaria(value: string) {
  const clean = String(value || "")
    .toUpperCase()
    .replace(/[^0-9X]/g, "")
    .slice(0, 13);

  if (clean.length <= 1) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

function hasAnexoTipo(anexos: AnexoItem[], tipo: string) {
  const aliases: Record<string, string[]> = {
    DOCUMENTOS_GERAIS: ["DOCUMENTOS_GERAIS", "DOCUMENTACAO_UNICA", "DOCUMENTOS", "DOCUMENTACAO"],
    ORCAMENTOS_NOTA_FISCAL: ["ORCAMENTOS_NOTA_FISCAL", "ORCAMENTOS", "NOTA_FISCAL_ORCAMENTOS"],
    AUTORIZACAO_ASSINADA_SOLICITANTE: [
      "AUTORIZACAO_GERADA",
      "AUTORIZACAO_ASSINADA_SOLICITANTE",
      "TERMO_ASSINADO",
      "TERMO_GERADO_ASSINADO",
      "TERMO_SOLICITANTE",
    ],
    AUTORIZACAO_ASSINADA_DIRETORIA: [
      "AUTORIZACAO_ASSINADA_DIRETORIA",
      "TERMO_ASSINADO_DIRETORIA",
      "TERMO_DIRETORIA",
      "TERMO_DIRETORIA_ASSINADO",
    ],
  };

  const permitidos = new Set(aliases[tipo] || [tipo]);
  return anexos.some((item) => permitidos.has(String(item.tipo || "").trim().toUpperCase()));
}

function normalizarTipoAnexoLocal(tipo: string) {
  const valor = String(tipo || "").trim().toUpperCase();
  if (["DOCUMENTOS_GERAIS", "DOCUMENTACAO_UNICA", "DOCUMENTOS", "DOCUMENTACAO"].includes(valor)) {
    return TIPO_ANEXO_DOCUMENTOS;
  }
  if (["ORCAMENTOS_NOTA_FISCAL", "ORCAMENTOS", "NOTA_FISCAL_ORCAMENTOS"].includes(valor)) {
    return TIPO_ANEXO_ORCAMENTOS_NOTA;
  }
  if (
    ["AUTORIZACAO_GERADA", "AUTORIZACAO_ASSINADA_SOLICITANTE", "TERMO_ASSINADO", "TERMO_GERADO_ASSINADO", "TERMO_SOLICITANTE"].includes(
      valor
    )
  ) {
    return TIPO_ANEXO_TERMO;
  }
  if (
    ["AUTORIZACAO_ASSINADA_DIRETORIA", "TERMO_ASSINADO_DIRETORIA", "TERMO_DIRETORIA", "TERMO_DIRETORIA_ASSINADO"].includes(
      valor
    )
  ) {
    return TIPO_ANEXO_TERMO_DIRETORIA;
  }
  return valor;
}

function formatValorAprovadoComLimite(value: string) {
  return monetizarDigitacao(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AGUARDANDO_ASSINATURA_SOLICITANTE: "Aguardando assinatura do solicitante",
    AGUARDANDO_DIRETORIA: "Aguardando diretoria",
    AGUARDANDO_FINANCEIRO: "Aguardando financeiro",
    DEVOLVIDO_AO_ATENDIMENTO: "Devolvido ao atendimento",
    FINALIZADO: "Finalizado",
    CANCELADO: "Cancelado",
  };

  return labels[status] || status || "Novo";
}

export function CadastroSubsidioAuditivoForm() {
  const searchParams = useSearchParams();
  const idQuery = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buscandoAssociado, setBuscandoAssociado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [usuario, setUsuario] = useState<MeResponse | null>(null);

  const [idSolicitacao, setIdSolicitacao] = useState("");
  const [status, setStatus] = useState("AGUARDANDO_ASSINATURA_SOLICITANTE");

  const [cpfBuscaAssociado, setCpfBuscaAssociado] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState(hojeIso());

  const [cpfAssociado, setCpfAssociado] = useState("");
  const [nomeAssociado, setNomeAssociado] = useState("");
  const [matriculaAssociado, setMatriculaAssociado] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [cargoAssociado, setCargoAssociado] = useState("");
  const [dataAssociacao, setDataAssociacao] = useState("");
  const [celular, setCelular] = useState("");
  const [telefoneResidencial, setTelefoneResidencial] = useState("");
  const [nivelIntegralizacao, setNivelIntegralizacao] = useState("");
  const [capital, setCapital] = useState("");

  const [orcamentos, setOrcamentos] = useState("");
  const [informacoesAdicionais, setInformacoesAdicionais] = useState("");
  const [dataLimiteNotaFiscal, setDataLimiteNotaFiscal] = useState("");
  const [custoAparelho, setCustoAparelho] = useState("");
  const [valorAprovado, setValorAprovado] = useState("");
  const [prestadorServico, setPrestadorServico] = useState("");
  const [cpfCnpjPrestador, setCpfCnpjPrestador] = useState("");

  const [codigoBanco, setCodigoBanco] = useState("756");
  const [nomeBanco, setNomeBanco] = useState("SICOOB CRESSEM");
  const [agencia, setAgencia] = useState("4317");
  const [conta, setConta] = useState("");
  const [tipoConta, setTipoConta] = useState("CORRENTE");
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [loginAbertura, setLoginAbertura] = useState("");
  const [nomeUsuarioAbertura, setNomeUsuarioAbertura] = useState("");
  const [permissaoSolicitanteBackend, setPermissaoSolicitanteBackend] = useState<
    boolean | null
  >(null);
  const [tipoAnexoCorrecao, setTipoAnexoCorrecao] = useState(TIPO_ANEXO_DOCUMENTOS);
  const [ultimoValorCalculadoAplicado, setUltimoValorCalculadoAplicado] = useState("");

  const [anexos, setAnexos] = useState<AnexoItem[]>([]);

  const totalLiberado = useMemo(() => parseBRL(valorAprovado), [valorAprovado]);
  const mesesAssociacao = useMemo(() => calcularMesesAssociacao(dataAssociacao), [dataAssociacao]);
  const valorBaseSubsidio = 1000;
  const valorMensalAssociacao = 12.7;
  const valorAdicionalAssociacao = useMemo(
    () => Number((mesesAssociacao * valorMensalAssociacao).toFixed(2)),
    [mesesAssociacao]
  );
  const valorCalculadoRegra = useMemo(
    () => Number((valorBaseSubsidio + valorAdicionalAssociacao).toFixed(2)),
    [valorAdicionalAssociacao]
  );
  const valorCalculadoRegraFormatado = useMemo(
    () => fmtBRL(valorCalculadoRegra),
    [valorCalculadoRegra]
  );
  const gruposUsuario = useMemo(() => (Array.isArray(usuario?.grupos) ? usuario.grupos : []), [usuario]);
  const usuarioEmTeste = useMemo(
    () => usuarioEstaNoModoTesteSubsidioAuditivo(usuario?.username, usuario?.email),
    [usuario]
  );
  const isTesteFinanceiro = usuarioEmTeste && PERFIL_TESTE_SUBSIDIO_AUDITIVO === "FINANCEIRO";
  const isTesteDiretoria = usuarioEmTeste && PERFIL_TESTE_SUBSIDIO_AUDITIVO === "DIRETORIA";
  const isSuporte = useMemo(
    () => !usuarioEmTeste && gruposUsuario.includes(AD_GROUPS.SUPORTE),
    [gruposUsuario, usuarioEmTeste]
  );
  const isSolicitanteDaSolicitacao = useMemo(
    () =>
      !usuarioEmTeste &&
      (permissaoSolicitanteBackend ??
        usuarioEhSolicitanteAtual(usuario, {
          login: loginAbertura,
          nome: nomeUsuarioAbertura,
        })),
    [
      usuario,
      loginAbertura,
      nomeUsuarioAbertura,
      usuarioEmTeste,
      permissaoSolicitanteBackend,
    ]
  );
  const podeEditarSolicitacao = useMemo(() => {
    if (!idSolicitacao) return true;
    return (
      isSolicitanteDaSolicitacao &&
      status === "DEVOLVIDO_AO_ATENDIMENTO"
    );
  }, [idSolicitacao, isSolicitanteDaSolicitacao, status]);

  function mostrarErroTopo(message: string) {
    setErro(message);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    carregarTela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dataAssociacao || valorCalculadoRegra <= 0) return;

    const deveAtualizarAutomaticamente =
      !valorAprovado || valorAprovado === ultimoValorCalculadoAplicado;

    if (deveAtualizarAutomaticamente) {
      setValorAprovado(valorCalculadoRegraFormatado);
      setUltimoValorCalculadoAplicado(valorCalculadoRegraFormatado);
    }
  }, [dataAssociacao, valorCalculadoRegra, valorCalculadoRegraFormatado, valorAprovado, ultimoValorCalculadoAplicado]);

  async function carregarTela() {
    try {
      setLoading(true);
      const me = await getMeAdUser();
      setUsuario(me);

      if (idQuery) {
        const detalhe = await buscarSubsidioAuditivoPorId(idQuery);
        preencherFormulario(detalhe);
      }
    } catch (e: any) {
      setErro(e?.response?.data?.error || e?.message || "Falha ao carregar tela.");
    } finally {
      setLoading(false);
    }
  }

  function preencherFormulario(detalhe: any) {
    setIdSolicitacao(String(detalhe.ID_SUBSIDIO_AUDITIVO || ""));
    setStatus(String(detalhe.ST_SOLICITACAO || "AGUARDANDO_ASSINATURA_SOLICITANTE"));
    setDataSolicitacao(String(detalhe.DT_SOLICITACAO || hojeIso()));
    setLoginAbertura(String(detalhe.LOGIN_USUARIO_ABERTURA || ""));
    setNomeUsuarioAbertura(String(detalhe.NM_USUARIO_ABERTURA || ""));
    setPermissaoSolicitanteBackend(
      typeof detalhe?.PERMISSOES?.isSolicitanteAtual === "boolean"
        ? detalhe.PERMISSOES.isSolicitanteAtual
        : null
    );

    setCpfAssociado(formatCpfView(String(detalhe.NR_CPF_ASSOCIADO || "")));
    setCpfBuscaAssociado(formatCpfView(String(detalhe.NR_CPF_ASSOCIADO || "")));
    setNomeAssociado(String(detalhe.NM_ASSOCIADO || ""));
    setMatriculaAssociado(String(detalhe.NR_MATRICULA_ASSOCIADO || ""));
    setLocalTrabalho(String(detalhe.NM_ORGAO_ASSOCIADO || ""));
    setCargoAssociado(String(detalhe.DS_FUNCAO_ASSOCIADO || ""));
    setDataAssociacao(String(detalhe.DT_ASSOCIACAO || ""));
    setCelular(String(detalhe.NR_CELULAR || ""));
    setTelefoneResidencial(String(detalhe.NR_TELEFONE_RESIDENCIAL || ""));
    setNivelIntegralizacao(
      detalhe.VL_NIVEL_INTEGRALIZACAO ? fmtBRL(Number(detalhe.VL_NIVEL_INTEGRALIZACAO)) : ""
    );
    setCapital(detalhe.VL_CAPITAL ? fmtBRL(Number(detalhe.VL_CAPITAL)) : "");

    setOrcamentos(String(detalhe.DS_ORCAMENTOS || ""));
    setInformacoesAdicionais(String(detalhe.DS_INFORMACOES_ADICIONAIS || ""));
    setDataLimiteNotaFiscal(String(detalhe.DT_LIMITE_NOTA_FISCAL || ""));
    setCustoAparelho(detalhe.VL_CUSTO_APARELHO ? fmtBRL(Number(detalhe.VL_CUSTO_APARELHO)) : "");
    const valorAprovadoFormatado = detalhe.VL_SUBSIDIO_APROVADO ? fmtBRL(Number(detalhe.VL_SUBSIDIO_APROVADO)) : "";
    setValorAprovado(valorAprovadoFormatado);
    setUltimoValorCalculadoAplicado(valorAprovadoFormatado);
    setPrestadorServico(String(detalhe.NM_PRESTADOR_SERVICO || ""));
    setCpfCnpjPrestador(formatCpfCnpjView(String(detalhe.NR_CPF_CNPJ_PRESTADOR || "")));

      setCodigoBanco("756");
      setNomeBanco("SICOOB CRESSEM");
      setAgencia("4317");
      setConta(formatContaBancaria(String(detalhe.NR_CONTA || "")));
      setTipoConta("CORRENTE");
    setMotivoDevolucao(String(detalhe.DS_MOTIVO_DEVOLUCAO || ""));
    setTipoAnexoCorrecao(TIPO_ANEXO_DOCUMENTOS);
    setAnexos(
      Array.isArray(detalhe.ANEXOS)
        ? detalhe.ANEXOS.map((item: any) => ({
            tipo: normalizarTipoAnexoLocal(String(item.TP_ANEXO || "DOCUMENTOS_GERAIS")),
            nome: String(item.NM_ARQUIVO_ORIGINAL || "arquivo"),
            tamanho: Number(item.NR_TAMANHO_BYTES || 0) || undefined,
            mime: item.DS_MIME_TYPE || null,
            path: item.DS_CAMINHO_ARQUIVO || null,
            arquivo: null,
          }))
        : []
    );
  }

  async function pesquisarAssociado() {
    if (idSolicitacao || !podeEditarSolicitacao) return;
    try {
      setErro("");
      setMensagem("");
      setBuscandoAssociado(true);

      const data = await buscarFuncionarioPorCpf(cpfBuscaAssociado);
      if (!("found" in data) || !data.found) {
        mostrarErroTopo("Associado não encontrado para o CPF informado.");
        return;
      }

      setCpfAssociado(formatCpfView(data.cpf || cpfBuscaAssociado));
      setNomeAssociado(String(data.nome || ""));
      setMatriculaAssociado(String(data.matricula || ""));
      setLocalTrabalho(String(data.empresa || data.orgao || ""));
      setCargoAssociado(String(data.cargo || ""));
      setDataAssociacao(String(data.data_matricula_cooperativa || ""));
      setCelular(String(data.telefone || ""));
      setTelefoneResidencial(String(data.telefone || ""));
      setCapital(data.saldo_capital ? fmtBRL(Number(data.saldo_capital)) : "");

      const contaCorrente = String(data.conta_corrente || data.nr_conta_corrente || "").trim();
      setCodigoBanco("756");
      setNomeBanco("SICOOB CRESSEM");
      setAgencia("4317");
      setTipoConta("CORRENTE");
      if (contaCorrente) {
        setConta(formatContaBancaria(contaCorrente));
      }

      setMensagem("Dados do associado carregados. Você pode ajustar manualmente se precisar.");
    } catch (e: any) {
      mostrarErroTopo(e?.response?.data?.error || e?.message || "Falha ao buscar associado.");
    } finally {
      setBuscandoAssociado(false);
    }
  }

  function definirAnexoPorTipo(tipo: string, arquivo: File | null) {
    if (!podeEditarSolicitacao) {
      setErro("Esta solicitação só pode ser alterada no cadastro quando for devolvida ao atendimento.");
      return;
    }

    if (!arquivo) return;

    if (!podeEditarAnexo(tipo)) {
      setErro("O termo assinado já foi encaminhado no fluxo e não pode mais ser alterado por aqui.");
      return;
    }

    setErro("");
    setAnexos((prev) => {
      const semTipo = prev.filter((item) => item.tipo !== tipo);
      return [
        ...semTipo,
        {
          tipo,
          nome: arquivo.name,
          tamanho: arquivo.size,
          mime: arquivo.type || null,
          arquivo,
          path: null,
        },
      ];
    });
  }

  function obterAnexo(tipo: string) {
    return anexos.find((item) => normalizarTipoAnexoLocal(item.tipo) === tipo) || null;
  }

  function termoEstaTravado() {
    const termo = obterAnexo(TIPO_ANEXO_TERMO);
    if (!termo?.path) return false;

    return [
      "DEVOLVIDO_AO_ATENDIMENTO",
      "AGUARDANDO_FINANCEIRO",
      "AGUARDANDO_DIRETORIA",
      "FINALIZADO",
      "CANCELADO",
    ].includes(status);
  }

  function podeEditarAnexo(tipo: string) {
    const tipoNormalizado = normalizarTipoAnexoLocal(tipo);

    if (!TIPOS_ANEXO_CORRECAO_ATENDIMENTO.includes(tipoNormalizado)) {
      return false;
    }

    if (tipoNormalizado === TIPO_ANEXO_TERMO) {
      return false;
    }

    return !(tipoNormalizado === TIPO_ANEXO_TERMO && termoEstaTravado());
  }

  function removerAnexoPorTipo(tipo: string) {
    if (!podeEditarSolicitacao) {
      setErro("Esta solicitação só pode ser alterada no cadastro quando for devolvida ao atendimento.");
      return;
    }

    if (!podeEditarAnexo(tipo)) {
      setErro("O termo assinado já foi encaminhado no fluxo e não pode mais ser removido por aqui.");
      return;
    }

    setAnexos((prev) => prev.filter((item) => item.tipo !== tipo));
  }

  function labelTipoAnexo(tipo: string) {
    if (tipo === TIPO_ANEXO_DOCUMENTOS || tipo === "DOCUMENTACAO_UNICA") {
      return "Documentos pessoais / obrigatórios";
    }
    if (tipo === TIPO_ANEXO_ORCAMENTOS_NOTA) {
      return "Orçamentos + nota fiscal";
    }
    if (
      tipo === TIPO_ANEXO_TERMO ||
      ["AUTORIZACAO_GERADA", "TERMO_GERADO_ASSINADO", "TERMO_ASSINADO", "TERMO_SOLICITANTE"].includes(
        tipo
      )
    ) {
      return "Termo assinado pelo solicitante";
    }
    if (tipo === TIPO_ANEXO_TERMO_DIRETORIA) return "Termo assinado pela diretoria";
    return tipo;
  }

  async function baixarAnexo(item: AnexoItem) {
    if (!item.path) return;

    const blob = await baixarAnexoSubsidioAuditivo(item.path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.nome || "anexo";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function montarPayload() {
    const anexosPayload: SubsidioAuditivoAnexoPayload[] = [];

    for (const item of anexos) {
      anexosPayload.push({
        TP_ANEXO: item.tipo,
        NM_ARQUIVO_ORIGINAL: item.nome,
        NR_TAMANHO_BYTES: item.tamanho,
        DS_MIME_TYPE: item.mime || null,
        DS_CAMINHO_ARQUIVO: item.path || null,
        ARQUIVO: item.arquivo ? await fileToDataURL(item.arquivo) : null,
      });
    }

    return {
      ID_SUBSIDIO_AUDITIVO: idSolicitacao || undefined,
      ST_SOLICITACAO: status,
      DT_SOLICITACAO: dataSolicitacao,
      NM_USUARIO_ABERTURA: usuario?.nome_completo || usuario?.username || "",
      LOGIN_USUARIO_ABERTURA: usuario?.username || "",
      NR_CPF_ASSOCIADO: onlyDigits(cpfAssociado),
      NM_ASSOCIADO: nomeAssociado,
      NR_MATRICULA_ASSOCIADO: matriculaAssociado,
      NM_ORGAO_ASSOCIADO: localTrabalho,
      DS_FUNCAO_ASSOCIADO: cargoAssociado,
      DT_ASSOCIACAO: toIsoDate(dataAssociacao),
      NR_CELULAR: celular,
      NR_TELEFONE_RESIDENCIAL: telefoneResidencial,
      VL_NIVEL_INTEGRALIZACAO: parseBRL(nivelIntegralizacao),
      VL_CAPITAL: parseBRL(capital),
      DS_ORCAMENTOS: orcamentos,
      VL_CUSTO_APARELHO: parseBRL(custoAparelho),
      VL_SUBSIDIO_APROVADO: parseBRL(valorAprovado),
      NM_PRESTADOR_SERVICO: prestadorServico,
      NR_CPF_CNPJ_PRESTADOR: onlyDigits(cpfCnpjPrestador),
      DS_INFORMACOES_ADICIONAIS: informacoesAdicionais,
      DT_LIMITE_NOTA_FISCAL: toIsoDate(dataLimiteNotaFiscal),
      CD_BANCO: codigoBanco,
      NM_BANCO: nomeBanco,
      CD_AGENCIA: agencia,
      NR_CONTA: conta,
      TP_CONTA: tipoConta,
      DS_MOTIVO_DEVOLUCAO: motivoDevolucao,
      ANEXOS: anexosPayload,
    };
  }

  async function salvarFormulario() {
    if (!podeEditarSolicitacao) {
      mostrarErroTopo("Esta solicitação não está disponível para edição nesta etapa.");
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      if (!nomeAssociado.trim()) {
        mostrarErroTopo("Preencha o nome do associado.");
        return;
      }

      if (onlyDigits(cpfAssociado).length !== 11) {
        mostrarErroTopo("CPF do associado inválido.");
        return;
      }

      if (!localTrabalho.trim()) {
        mostrarErroTopo("Preencha a empresa ou local de trabalho do associado.");
        return;
      }

      if (!dataAssociacao.trim()) {
        mostrarErroTopo("Preencha a data de associação do cooperado.");
        return;
      }

      if (mesesAssociacao < 12) {
        mostrarErroTopo("O associado precisa ter pelo menos 12 meses de associação para solicitar o subsídio.");
        return;
      }

      if (!celular.trim()) {
        mostrarErroTopo("Preencha o celular para contato.");
        return;
      }

      if (!nivelIntegralizacao.trim()) {
        mostrarErroTopo("Preencha o nível de integralização.");
        return;
      }

      if (parseBRL(nivelIntegralizacao) < 0) {
        mostrarErroTopo("Informe um nível de integralização válido.");
        return;
      }

      if (!dataLimiteNotaFiscal.trim()) {
        mostrarErroTopo("Preencha a data de entrega da nota.");
        return;
      }

      if (!custoAparelho || parseBRL(custoAparelho) < 0) {
        mostrarErroTopo("Informe o custo do aparelho.");
        return;
      }

      if (!valorAprovado || parseBRL(valorAprovado) < 0) {
        mostrarErroTopo("Informe o valor liberado.");
        return;
      }

      if (!prestadorServico.trim()) {
        mostrarErroTopo("Preencha o nome do prestador de serviço.");
        return;
      }

      if (!onlyDigits(cpfCnpjPrestador).trim()) {
        mostrarErroTopo("Preencha o CPF/CNPJ do prestador de serviço.");
        return;
      }

      if (!conta.trim()) {
        mostrarErroTopo("Preencha a conta.");
        return;
      }

      if (!hasAnexoTipo(anexos, TIPO_ANEXO_DOCUMENTOS)) {
        mostrarErroTopo("Anexe os documentos pessoais / obrigatórios antes de salvar a solicitação.");
        return;
      }

      if (!hasAnexoTipo(anexos, TIPO_ANEXO_ORCAMENTOS_NOTA)) {
        mostrarErroTopo("Anexe o arquivo de orçamentos / nota fiscal antes de salvar a solicitação.");
        return;
      }

      if (status === "DEVOLVIDO_AO_ATENDIMENTO" && !hasAnexoTipo(anexos, TIPO_ANEXO_TERMO)) {
        mostrarErroTopo("Na devolução, é necessário manter ou reenviar o termo assinado pelo solicitante.");
        return;
      }

      const payload = await montarPayload();
      const response = idSolicitacao
        ? await editarSubsidioAuditivo(payload)
        : await cadastrarSubsidioAuditivo(payload);

      if (response?.id) {
        setIdSolicitacao(String(response.id));
      }

      if (response?.status) {
        setStatus(String(response.status));
      }

      if (response?.motivoDevolucao !== undefined) {
        setMotivoDevolucao(String(response.motivoDevolucao || ""));
      }

      setMensagem(
        response?.message || "Solicitação de subsídio auditivo salva com sucesso."
      );
    } catch (e: any) {
      mostrarErroTopo(e?.response?.data?.error || e?.message || "Falha ao salvar solicitação.");
    } finally {
      setSaving(false);
    }
  }

  async function gerarPdf() {
    try {
      if (!idSolicitacao) {
        mostrarErroTopo("Salve a solicitação antes de baixar a autorização.");
        return;
      }

      await gerarPdfSubsidioAuditivo({
        nomeAssociado: nomeAssociado || "________________________________",
        cpfAssociado: cpfAssociado || "___________________",
        matriculaAssociado,
        localTrabalho,
        cargoAssociado,
        dataAssociacao,
        celular,
        telefoneResidencial,
        nivelIntegralizacao: nivelIntegralizacao || "R$ 0,00",
        capital: capital || "R$ 0,00",
        dataEntregaNotaFiscal: dataLimiteNotaFiscal || "",
        valorSolicitado: custoAparelho || "R$ 0,00",
        valorAprovado: valorAprovado || "R$ 0,00",
        prestadorServico: prestadorServico || "________________________________",
        cpfCnpjPrestador,
        banco: nomeBanco || codigoBanco,
        agencia,
        conta,
        tipoConta,
        local: localTrabalho || "São José dos Campos",
        dataDocumento: dataSolicitacao || hojeIso(),
        funcionarioGerador: usuario?.nome_completo || usuario?.username || "",
      });
    } catch (e: any) {
      mostrarErroTopo(e?.message || "Não foi possível gerar o PDF.");
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">Carregando formulário...</div>;
  }

  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <label className={labelClass}>CPF do associado</label>
            <SearchForm onSearch={pesquisarAssociado}>
              <div className="flex flex-col gap-3 lg:flex-row">
                <SearchInput
                  placeholder="Digite o CPF do associado"
                  value={cpfBuscaAssociado}
                  onChange={(e) => setCpfBuscaAssociado(formatCpfView(e.target.value))}
                />
                <SearchButton loading={buscandoAssociado} />
              </div>
            </SearchForm>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="font-semibold">Status atual</div>
            <div>{statusLabel(status)}</div>
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

        {erro ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
          <div className="font-semibold">Regra do subsídio auditivo</div>
          <div className="mt-1">
            Associado com mais de 12 meses, com indicação profissional, 2 orçamentos, conta corrente com portabilidade de salário e empréstimo consignado exclusivamente no Sicoob Cressem.
          </div>
          <div className="mt-2">
            Cálculo usado no cadastro: <span className="font-semibold">R$ 1.000,00 base + R$ 12,70 por mês de associação</span>.
          </div>
        </div>

        {!podeEditarSolicitacao && idSolicitacao ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta solicitação está bloqueada para edição nesta etapa. O associado só pode alterar quando o financeiro devolver a documentação para correção.
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Dados do associado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Esses dados são do próprio associado solicitante. Parte deles pode vir da busca por CPF.
          </p>

        <fieldset disabled={Boolean(idSolicitacao)} className={idSolicitacao ? "opacity-80" : ""}>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>CPF do associado</label>
            <input className={inputClass} value={cpfAssociado} onChange={(e) => setCpfAssociado(formatCpfView(e.target.value))} />
          </div>
            <div className="xl:col-span-2">
              <label className={labelClass}>Nome do associado</label>
              <input className={inputClass} value={nomeAssociado} onChange={(e) => setNomeAssociado(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Matrícula</label>
              <input className={inputClass} value={matriculaAssociado} onChange={(e) => setMatriculaAssociado(e.target.value)} />
            </div>
            <div className="xl:col-span-2">
              <label className={labelClass}>Local de trabalho</label>
              <input className={inputClass} value={localTrabalho} onChange={(e) => setLocalTrabalho(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cargo</label>
              <input className={inputClass} value={cargoAssociado} onChange={(e) => setCargoAssociado(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Data de associação</label>
              <input type="date" className={inputClass} value={dataAssociacao} onChange={(e) => setDataAssociacao(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Celular</label>
              <input className={inputClass} value={celular} onChange={(e) => setCelular(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Telefone residencial</label>
              <input className={inputClass} value={telefoneResidencial} onChange={(e) => setTelefoneResidencial(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Nível de integralização</label>
              <input
                className={inputClass}
                value={nivelIntegralizacao}
                onChange={(e) => setNivelIntegralizacao(monetizarDigitacao(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className={labelClass}>Capital</label>
              <input className={inputClass} value={capital} onChange={(e) => setCapital(monetizarDigitacao(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>Data de entrega da nota</label>
              <input
                type="date"
                className={inputClass}
                value={dataLimiteNotaFiscal}
                onChange={(e) => setDataLimiteNotaFiscal(e.target.value)}
              />
            </div>
          </div>
        </fieldset>
        </div>
      </div>

      <fieldset disabled={Boolean(idSolicitacao)} className={idSolicitacao ? "space-y-5 opacity-80" : "space-y-5"}>
      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Valores e prestador de serviço</h2>
        <p className="mt-1 text-sm text-slate-500">
          O valor liberado é sugerido automaticamente conforme a data de associação, mas ainda pode ser ajustado se o processo precisar.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Custo do aparelho</label>
            <input className={inputClass} value={custoAparelho} onChange={(e) => setCustoAparelho(monetizarDigitacao(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Valor liberado</label>
            <input
              className={inputClass}
              value={valorAprovado}
              onChange={(e) => setValorAprovado(formatValorAprovadoComLimite(e.target.value))}
            />
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <div className="font-semibold">Cálculo automático</div>
            <div>Base fixa: {fmtBRL(valorBaseSubsidio)}</div>
            <div>Meses de associação: {mesesAssociacao}</div>
            <div>Adicional: {fmtBRL(valorAdicionalAssociacao)}</div>
            <div className="font-semibold text-amber-800">
              Valor calculado: {valorCalculadoRegraFormatado}
            </div>
            <div className="mt-1">
              Valor informado no campo: {valorAprovado || "R$ 0,00"}
            </div>
          </div>
          <div className="xl:col-span-2">
            <label className={labelClass}>Prestador de serviço</label>
            <input className={inputClass} value={prestadorServico} onChange={(e) => setPrestadorServico(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CPF/CNPJ do prestador</label>
            <input className={inputClass} value={cpfCnpjPrestador} onChange={(e) => setCpfCnpjPrestador(formatCpfCnpjView(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Data da solicitação</label>
            <input
              type="date"
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
              value={dataSolicitacao}
              readOnly
              disabled
            />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Conta para recebimento</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Tipo de conta</label>
            <input
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
              value={tipoConta}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={labelClass}>Código do banco</label>
            <input
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
              value={codigoBanco}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={labelClass}>Nome do banco</label>
            <input
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
              value={nomeBanco}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={labelClass}>Agência</label>
            <input
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
              value={agencia}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={labelClass}>Conta corrente do associado</label>
            <input
              className={inputClass}
              inputMode="text"
              maxLength={14}
              placeholder="Ex.: 123456-7"
              value={conta}
              onChange={(e) => setConta(formatContaBancaria(e.target.value))}
            />
          </div>
        </div>
      </div>
      </fieldset>

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Anexos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Separe os anexos do atendimento por tipo. O termo assinado continua sendo anexado depois pelo gerenciamento.
        </p>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-semibold">Tipos de anexo do atendimento</div>
          <div className="mt-2">
            {status === "DEVOLVIDO_AO_ATENDIMENTO"
              ? "Na correção, selecione qual documentação deseja substituir: documentos pessoais/obrigatórios ou orçamentos + nota fiscal. O termo assinado pelo solicitante permanece bloqueado."
              : "Use um tipo para documentos pessoais/obrigatórios e outro tipo para orçamentos junto com nota fiscal."}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {status === "DEVOLVIDO_AO_ATENDIMENTO" ? (
            <>
              <div>
                <label className={labelClass}>Tipo do arquivo corrigido</label>
                <select
                  className={inputClass}
                  value={tipoAnexoCorrecao}
                  onChange={(e) => setTipoAnexoCorrecao(e.target.value)}
                >
                  <option value={TIPO_ANEXO_DOCUMENTOS}>Documentos pessoais / obrigatórios</option>
                  <option value={TIPO_ANEXO_ORCAMENTOS_NOTA}>Orçamentos + nota fiscal</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  No retorno ao atendimento, você corrige somente os anexos de documentação. O termo assinado não pode ser substituído nesta etapa.
                </p>
              </div>
              <div>
                <label className={labelClass}>Substituir arquivo</label>
                <input
                  type="file"
                  className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium`}
                  onChange={(e) => {
                    definirAnexoPorTipo(tipoAnexoCorrecao, e.target.files?.[0] || null);
                    e.currentTarget.value = "";
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mantemos um arquivo ativo por categoria, totalizando até 2 arquivos de documentação nesta correção.
                </p>
                {obterAnexo(tipoAnexoCorrecao) ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    Arquivo atual do tipo: {obterAnexo(tipoAnexoCorrecao)?.nome}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Tipo do anexo</label>
                <select
                  className={inputClass}
                  value={tipoAnexoCorrecao}
                  onChange={(e) => setTipoAnexoCorrecao(e.target.value)}
                >
                  <option value={TIPO_ANEXO_DOCUMENTOS}>Documentos pessoais / obrigatórios</option>
                  <option value={TIPO_ANEXO_ORCAMENTOS_NOTA}>Orçamentos + nota fiscal</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Escolha a categoria antes de anexar o arquivo.
                </p>
              </div>
              <div>
                <label className={labelClass}>Arquivo</label>
                <input
                  type="file"
                  className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium`}
                  onChange={(e) => {
                    definirAnexoPorTipo(tipoAnexoCorrecao, e.target.files?.[0] || null);
                    e.currentTarget.value = "";
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mantemos um arquivo ativo por categoria nesta etapa.
                </p>
                {obterAnexo(tipoAnexoCorrecao) ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    Arquivo atual do tipo: {obterAnexo(tipoAnexoCorrecao)?.nome}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Arquivo</th>
                <th className="px-4 py-3 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {anexos.length ? (
                anexos.map((item, index) => (
                  <tr key={`${item.nome}-${index}`}>
                    <td className="px-4 py-3">{labelTipoAnexo(item.tipo)}</td>
                    <td className="px-4 py-3">{item.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item.path ? (
                          <button
                            type="button"
                            onClick={() => baixarAnexo(item)}
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                          >
                            <FaDownload size={11} />
                            Baixar
                          </button>
                        ) : null}
                        {podeEditarAnexo(item.tipo) ? (
                          <button
                            type="button"
                            onClick={() => removerAnexoPorTipo(item.tipo)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            <FaTrash size={11} />
                            Remover
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            Termo bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    Nenhum anexo adicionado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {status === "DEVOLVIDO_AO_ATENDIMENTO" && motivoDevolucao.trim() ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Motivo da devolução
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{motivoDevolucao}</p>
          </div>
        ) : null}
      </div>
      

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={salvarFormulario}
          disabled={saving || !podeEditarSolicitacao}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FaSave size={12} />
          {saving ? "Salvando..." : idSolicitacao ? "Atualizar solicitação" : "Salvar solicitação"}
        </button>

        <button
          type="button"
          onClick={gerarPdf}
          disabled={!idSolicitacao}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <FaFilePdf size={12} />
          Baixar solicitação
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Salve primeiro. Depois o botão libera para baixar, imprimir e assinar a solicitação.
        </div>
      </div>
    </div>
  );
}



