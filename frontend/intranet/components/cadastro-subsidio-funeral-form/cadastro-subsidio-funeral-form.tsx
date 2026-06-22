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
  PERFIL_TESTE_SUBSIDIO_FUNERAL,
  usuarioEstaNoModoTesteSubsidio,
} from "@/lib/subsidio-funeral-perfil-teste";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
import {
  baixarAnexoSubsidioFuneral,
  buscarSubsidioFuneralPorId,
  cadastrarSubsidioFuneral,
  editarSubsidioFuneral,
  type SubsidioFuneralAnexoPayload,
} from "@/services/cadastro_subsidio_funeral.service";
import {
  fmtBRL,
  formatCpfCnpjView,
  formatCpfView,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
} from "@/utils/br";
import { gerarPdfSubsidioFuneral } from "@/lib/pdf/gerarPdfSubsidioFuneral";

type AnexoItem = {
  tipo: string;
  nome: string;
  tamanho?: number;
  mime?: string | null;
  path?: string | null;
  arquivo?: File | null;
};

const TIPO_ANEXO_DOCUMENTOS = "DOCUMENTOS_GERAIS";
const TIPO_ANEXO_TERMO = "AUTORIZACAO_ASSINADA_SOLICITANTE";
const TIPO_ANEXO_TERMO_DIRETORIA = "AUTORIZACAO_ASSINADA_DIRETORIA";
const TIPOS_ANEXO_CORRECAO_ATENDIMENTO = [TIPO_ANEXO_DOCUMENTOS, TIPO_ANEXO_TERMO];

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

function normalizeLogin(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
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
  const monetizado = monetizarDigitacao(value);
  return parseBRL(monetizado) > 2000 ? fmtBRL(2000) : monetizado;
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

export function CadastroSubsidioFuneralForm() {
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

  const [nomeSolicitante, setNomeSolicitante] = useState("");
  const [cpfSolicitante, setCpfSolicitante] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [parentescoOutro, setParentescoOutro] = useState("");
  const [profissao, setProfissao] = useState("");

  const [cpfAssociado, setCpfAssociado] = useState("");
  const [nomeAssociado, setNomeAssociado] = useState("");
  const [matriculaAssociado, setMatriculaAssociado] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [cargoAssociado, setCargoAssociado] = useState("");
  const [dataAssociacao, setDataAssociacao] = useState("");
  const [dataObito, setDataObito] = useState("");

  const [custoServico, setCustoServico] = useState("");
  const [valorAprovado, setValorAprovado] = useState("");
  const [prestadorServico, setPrestadorServico] = useState("");
  const [cpfCnpjPrestador, setCpfCnpjPrestador] = useState("");

  const [titularConta, setTitularConta] = useState("");
  const [cpfTitularConta, setCpfTitularConta] = useState("");
  const [codigoBanco, setCodigoBanco] = useState("");
  const [nomeBanco, setNomeBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [tipoConta, setTipoConta] = useState("CORRENTE");
  const [observacao, setObservacao] = useState("");
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [loginAbertura, setLoginAbertura] = useState("");
  const [tipoAnexoCorrecao, setTipoAnexoCorrecao] = useState(TIPO_ANEXO_DOCUMENTOS);

  const [anexos, setAnexos] = useState<AnexoItem[]>([]);

  const totalLiberado = useMemo(() => parseBRL(valorAprovado), [valorAprovado]);
  const gruposUsuario = useMemo(() => (Array.isArray(usuario?.grupos) ? usuario.grupos : []), [usuario]);
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
  const isSolicitanteDaSolicitacao = useMemo(
    () => !usuarioEmTeste && normalizeLogin(usuario?.username) === normalizeLogin(loginAbertura),
    [usuario, loginAbertura, usuarioEmTeste]
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

  async function carregarTela() {
    try {
      setLoading(true);
      const me = await getMeAdUser();
      setUsuario(me);

      if (idQuery) {
        const detalhe = await buscarSubsidioFuneralPorId(idQuery);
        preencherFormulario(detalhe);
      }
    } catch (e: any) {
      setErro(e?.response?.data?.error || e?.message || "Falha ao carregar tela.");
    } finally {
      setLoading(false);
    }
  }

  function preencherFormulario(detalhe: any) {
    setIdSolicitacao(String(detalhe.ID_SUBSIDIO_FUNERAL || ""));
    setStatus(String(detalhe.ST_SOLICITACAO || "AGUARDANDO_ASSINATURA_SOLICITANTE"));
    setDataSolicitacao(String(detalhe.DT_SOLICITACAO || hojeIso()));
    setLoginAbertura(String(detalhe.LOGIN_USUARIO_ABERTURA || ""));

    setNomeSolicitante(String(detalhe.NM_SOLICITANTE || ""));
    setCpfSolicitante(formatCpfView(String(detalhe.NR_CPF_SOLICITANTE || "")));
    setParentesco(String(detalhe.TP_PARENTESCO || ""));
    setParentescoOutro(String(detalhe.DS_PARENTESCO_OUTRO || ""));
    setProfissao(String(detalhe.DS_PROFISSAO_SOLICITANTE || ""));

    setCpfAssociado(formatCpfView(String(detalhe.NR_CPF_ASSOCIADO || "")));
    setCpfBuscaAssociado(formatCpfView(String(detalhe.NR_CPF_ASSOCIADO || "")));
    setNomeAssociado(String(detalhe.NM_ASSOCIADO || ""));
    setMatriculaAssociado(String(detalhe.NR_MATRICULA_ASSOCIADO || ""));
    setLocalTrabalho(String(detalhe.NM_LOCAL_TRABALHO || ""));
    setCargoAssociado(String(detalhe.DS_CARGO_ASSOCIADO || ""));
    setDataAssociacao(String(detalhe.DT_ASSOCIACAO || ""));
    setDataObito(String(detalhe.DT_OBITO || ""));

    setCustoServico(detalhe.VL_CUSTO_SERVICO ? fmtBRL(Number(detalhe.VL_CUSTO_SERVICO)) : "");
    setValorAprovado(detalhe.VL_SUBSIDIO_APROVADO ? fmtBRL(Number(detalhe.VL_SUBSIDIO_APROVADO)) : "");
    setPrestadorServico(String(detalhe.NM_PRESTADOR_SERVICO || ""));
    setCpfCnpjPrestador(formatCpfCnpjView(String(detalhe.NR_CPF_CNPJ_PRESTADOR || "")));

    setTitularConta(String(detalhe.NM_TITULAR_CONTA || ""));
    setCpfTitularConta(formatCpfView(String(detalhe.NR_CPF_TITULAR_CONTA || "")));
    setCodigoBanco(formatCodigoBanco(String(detalhe.CD_BANCO || "")));
    setNomeBanco(formatNomeBanco(String(detalhe.NM_BANCO || "")));
    setAgencia(formatAgencia(String(detalhe.CD_AGENCIA || "")));
    setConta(formatContaBancaria(String(detalhe.NR_CONTA || "")));
    setTipoConta(String(detalhe.TP_CONTA || "CORRENTE"));
    setObservacao(String(detalhe.DS_OBSERVACAO || ""));
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
    if (!podeEditarSolicitacao) return;
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
      setLocalTrabalho(String(data.empresa || ""));
      setCargoAssociado(String(data.cargo || ""));
      setDataAssociacao(String(data.data_matricula_cooperativa || ""));

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

    if (status !== "DEVOLVIDO_AO_ATENDIMENTO" && tipoNormalizado === TIPO_ANEXO_TERMO) {
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
      return "Documentação obrigatória";
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

    const blob = await baixarAnexoSubsidioFuneral(item.path);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.nome || "anexo";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function montarPayload() {
    const anexosPayload: SubsidioFuneralAnexoPayload[] = [];

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
      ID_SUBSIDIO_FUNERAL: idSolicitacao || undefined,
      ST_SOLICITACAO: status,
      DT_SOLICITACAO: dataSolicitacao,
      NM_USUARIO_ABERTURA: usuario?.nome_completo || usuario?.username || "",
      LOGIN_USUARIO_ABERTURA: usuario?.username || "",
      NM_SOLICITANTE: nomeSolicitante,
      NR_CPF_SOLICITANTE: onlyDigits(cpfSolicitante),
      TP_PARENTESCO: parentesco,
      DS_PARENTESCO_OUTRO: parentesco === "OUTRO" ? parentescoOutro : "",
      DS_PROFISSAO_SOLICITANTE: profissao,
      NR_CPF_ASSOCIADO: onlyDigits(cpfAssociado),
      NM_ASSOCIADO: nomeAssociado,
      NR_MATRICULA_ASSOCIADO: matriculaAssociado,
      NM_LOCAL_TRABALHO: localTrabalho,
      DS_CARGO_ASSOCIADO: cargoAssociado,
      DT_ASSOCIACAO: toIsoDate(dataAssociacao),
      DT_OBITO: toIsoDate(dataObito),
      VL_CUSTO_SERVICO: parseBRL(custoServico),
      VL_SUBSIDIO_APROVADO: parseBRL(valorAprovado),
      NM_PRESTADOR_SERVICO: prestadorServico,
      NR_CPF_CNPJ_PRESTADOR: onlyDigits(cpfCnpjPrestador),
      NM_TITULAR_CONTA: titularConta,
      NR_CPF_TITULAR_CONTA: onlyDigits(cpfTitularConta),
      CD_BANCO: codigoBanco,
      NM_BANCO: nomeBanco,
      CD_AGENCIA: agencia,
      NR_CONTA: conta,
      TP_CONTA: tipoConta,
      CHAVE_PIX: "",
      DS_OBSERVACAO: observacao,
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

      if (!nomeSolicitante.trim()) {
        mostrarErroTopo("Preencha o nome do solicitante.");
        return;
      }

      if (onlyDigits(cpfSolicitante).length !== 11) {
        mostrarErroTopo("CPF do solicitante inválido.");
        return;
      }

      if (!parentesco) {
        mostrarErroTopo("Selecione o parentesco.");
        return;
      }

      if (parentesco === "OUTRO" && !parentescoOutro.trim()) {
        mostrarErroTopo("Informe o parentesco quando selecionar Outros.");
        return;
      }

      if (!profissao.trim()) {
        mostrarErroTopo("Preencha a profissão do solicitante.");
        return;
      }

      if (!nomeAssociado.trim()) {
        mostrarErroTopo("Preencha o nome do associado.");
        return;
      }

      if (onlyDigits(cpfAssociado).length !== 11) {
        mostrarErroTopo("CPF do associado inválido.");
        return;
      }

      if (!localTrabalho.trim()) {
        mostrarErroTopo("Preencha o local de trabalho do associado.");
        return;
      }

      if (!dataObito) {
        mostrarErroTopo("Preencha a data do óbito.");
        return;
      }

      if (!custoServico || parseBRL(custoServico) < 0) {
        mostrarErroTopo("Informe o custo do serviço.");
        return;
      }

      if (!valorAprovado || parseBRL(valorAprovado) < 0) {
        mostrarErroTopo("Informe o valor liberado.");
        return;
      }

      if (totalLiberado > 2000) {
        mostrarErroTopo("O valor liberado não pode ultrapassar R$ 2.000,00.");
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

      if (!titularConta.trim()) {
        mostrarErroTopo("Preencha o nome do titular da conta.");
        return;
      }

      if (onlyDigits(cpfTitularConta).length !== 11) {
        mostrarErroTopo("CPF do titular da conta inválido.");
        return;
      }

      if (!codigoBanco.trim()) {
        mostrarErroTopo("Preencha o código do banco.");
        return;
      }

      if (!nomeBanco.trim()) {
        mostrarErroTopo("Preencha o nome do banco.");
        return;
      }

      if (!agencia.trim()) {
        mostrarErroTopo("Preencha a agência.");
        return;
      }

      if (!conta.trim()) {
        mostrarErroTopo("Preencha a conta.");
        return;
      }

      if (!tipoConta.trim()) {
        mostrarErroTopo("Selecione o tipo de conta.");
        return;
      }

      if (!hasAnexoTipo(anexos, TIPO_ANEXO_DOCUMENTOS)) {
        mostrarErroTopo("Anexe a documentação obrigatória antes de salvar a solicitação.");
        return;
      }

      if (status === "DEVOLVIDO_AO_ATENDIMENTO" && !hasAnexoTipo(anexos, TIPO_ANEXO_TERMO)) {
        mostrarErroTopo("Na devolução, é necessário manter ou reenviar o termo assinado pelo solicitante.");
        return;
      }

      const payload = await montarPayload();
      const response = idSolicitacao
        ? await editarSubsidioFuneral(payload)
        : await cadastrarSubsidioFuneral(payload);

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
        response?.message || "Solicitação de subsídio funeral salva com sucesso."
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

      await gerarPdfSubsidioFuneral({
        nomeSolicitante: nomeSolicitante || "________________________________",
        cpfSolicitante: cpfSolicitante || "___________________",
        parentesco:
          parentesco === "OUTRO" ? parentescoOutro || "Outro" : parentesco || "________________",
        profissaoSolicitante: profissao,
        nomeAssociado: nomeAssociado || "________________________________",
        cpfAssociado: cpfAssociado || "___________________",
        matriculaAssociado,
        localTrabalho,
        cargoAssociado,
        dataAssociacao,
        dataObito: dataObito || hojeIso(),
        valorSolicitado: custoServico || "R$ 0,00",
        valorAprovado: valorAprovado || "R$ 0,00",
        prestadorServico: prestadorServico || "________________________________",
        cpfCnpjPrestador,
        titularConta,
        cpfTitularConta,
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
            <label className={labelClass}>CPF do associado falecido</label>
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

        {!podeEditarSolicitacao && idSolicitacao ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta solicitação está bloqueada para edição nesta etapa. A solicitante só pode alterar quando precisar anexar o assinado ou quando o financeiro devolver por documentação.
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Dados do beneficiário</h2>
          <p className="mt-1 text-sm text-slate-500">
            Esses dados são do associado falecido. Parte deles pode vir da busca por CPF.
          </p>

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
              <label className={labelClass}>Data do óbito</label>
              <input type="date" className={inputClass} value={dataObito} onChange={(e) => setDataObito(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <fieldset disabled={!podeEditarSolicitacao} className={!podeEditarSolicitacao ? "space-y-5 opacity-80" : "space-y-5"}>
      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Dados do solicitante</h2>
        <p className="mt-1 text-sm text-slate-500">
          Preencha as informações básicas da pessoa que está solicitando o subsídio.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className={labelClass}>Nome do solicitante</label>
            <input className={inputClass} value={nomeSolicitante} onChange={(e) => setNomeSolicitante(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CPF do solicitante</label>
            <input className={inputClass} value={cpfSolicitante} onChange={(e) => setCpfSolicitante(formatCpfView(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Parentesco</label>
            <select className={inputClass} value={parentesco} onChange={(e) => setParentesco(e.target.value)}>
              <option value="">Selecione</option>
              <option value="MAE">Mãe</option>
              <option value="PAI">Pai</option>
              <option value="CONJUGE">Cônjuge</option>
              <option value="FILHO(A)">Filho(a)</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          {parentesco === "OUTRO" ? (
            <div>
              <label className={labelClass}>Qual parentesco?</label>
              <input className={inputClass} value={parentescoOutro} onChange={(e) => setParentescoOutro(e.target.value)} />
            </div>
          ) : null}
          <div>
            <label className={labelClass}>Profissão</label>
            <input className={inputClass} value={profissao} onChange={(e) => setProfissao(e.target.value)} />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Valores e pagamento</h2>
        <p className="mt-1 text-sm text-slate-500">
          O valor liberado deve respeitar o teto de R$ 2.000,00.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Custo do serviço</label>
            <input className={inputClass} value={custoServico} onChange={(e) => setCustoServico(monetizarDigitacao(e.target.value))} />
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
            <div className="font-semibold">Controle de teto</div>
            <div>Limite máximo: R$ 2.000,00</div>
            <div className={totalLiberado > 2000 ? "font-semibold text-red-600" : ""}>
              Informado: {valorAprovado || "R$ 0,00"}
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
        <h2 className="text-lg font-semibold text-slate-900">Dados bancários do solicitante</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className={labelClass}>Titular da conta</label>
            <input className={inputClass} value={titularConta} onChange={(e) => setTitularConta(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CPF do titular</label>
            <input className={inputClass} value={cpfTitularConta} onChange={(e) => setCpfTitularConta(formatCpfView(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Tipo de conta</label>
            <select className={inputClass} value={tipoConta} onChange={(e) => setTipoConta(e.target.value)}>
              <option value="CORRENTE">Corrente</option>
              <option value="POUPANCA">Poupança</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Código do banco</label>
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={3}
              placeholder="Ex.: 001"
              value={codigoBanco}
              onChange={(e) => setCodigoBanco(formatCodigoBanco(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Nome do banco</label>
            <input
              className={inputClass}
              placeholder="Ex.: BANCO DO BRASIL"
              value={nomeBanco}
              onChange={(e) => setNomeBanco(formatNomeBanco(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Agência</label>
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={6}
              placeholder="Ex.: 1234-5"
              value={agencia}
              onChange={(e) => setAgencia(formatAgencia(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Conta</label>
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

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Anexos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Deixe toda a documentação obrigatória em um único arquivo. O termo assinado será anexado pelo gerenciamento depois da impressão.
        </p>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-semibold">Documentos esperados no arquivo único</div>
          <div className="mt-2">
            Último holerite, nota fiscal da funerária, atestado de óbito, RG/CPF do cooperado, RG/CPF do falecido, RG/CPF do tomador do crédito, telefone para contato e dados bancários.
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
                  <option value={TIPO_ANEXO_DOCUMENTOS}>Documentação obrigatória</option>
                  <option value={TIPO_ANEXO_TERMO}>Termo assinado pelo solicitante</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  No retorno ao atendimento, você pode corrigir somente esses dois tipos de anexo.
                </p>
              </div>
              <div>
                <label className={labelClass}>Substituir arquivo</label>
                <input
                  type="file"
                  className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium`}
                  onChange={(e) => definirAnexoPorTipo(tipoAnexoCorrecao, e.target.files?.[0] || null)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mantemos no máximo 2 anexos do atendimento: documentação obrigatória e termo assinado.
                </p>
                {obterAnexo(tipoAnexoCorrecao) ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    Arquivo atual do tipo: {obterAnexo(tipoAnexoCorrecao)?.nome}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div>
              <label className={labelClass}>Documentação obrigatória</label>
              <input
                type="file"
                className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium`}
                onChange={(e) => definirAnexoPorTipo(TIPO_ANEXO_DOCUMENTOS, e.target.files?.[0] || null)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Junte tudo em um único PDF ou arquivo.
              </p>
              {obterAnexo(TIPO_ANEXO_DOCUMENTOS) ? (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Arquivo atual: {obterAnexo(TIPO_ANEXO_DOCUMENTOS)?.nome}
                </p>
              ) : null}
            </div>
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
        </fieldset>
      

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
