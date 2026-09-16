"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  alterarStatusFuncionario,
  baixarArquivoFuncionario,
  baixarRelatorioFuncionarios,
  buscarCargosFuncionario,
  buscarFuncionariosPaginados,
  buscarGerenciasFuncionario,
  buscarSetoresFuncionario,
  buscarTodosFuncionarios,
  cadastrarFuncionario,
  editarFuncionario,
  type CargoFuncionarioItem,
  type FuncionarioItem,
  type FuncionarioPaginadoResponse,
  type GerenciaFuncionarioItem,
  type SetorFuncionarioItem,
} from "@/services/gerenciamento_funcionario.service";

type ModalModo = "cadastrar" | "editar";

function formatarDataInput(data?: string | null) {
  if (!data) return "";
  return String(data).slice(0, 10);
}

function formatarNascimentoTabela(data?: string | null) {
  if (!data) return "";
  const somenteData = String(data).slice(0, 10);
  const [ano, mes, dia] = somenteData.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}`;
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .slice(0, 15);
}

function removerEspacoInicial(value: string) {
  return String(value || "").replace(/^\s+/, "");
}

function limparTexto(value: string) {
  return removerEspacoInicial(value).trim();
}

function getNomeArquivo(caminho?: string | null) {
  if (!caminho) return "Nenhum arquivo salvo!";
  const normalizado = String(caminho).replaceAll("\\", "/");
  const partes = normalizado.split("/");
  return partes[partes.length - 1] || "Nenhum arquivo salvo!";
}

function baixarBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function GerenciamentoFuncionarioForm() {
  const [busca, setBusca] = useState("");
  const [funcionarios, setFuncionarios] = useState<FuncionarioItem[]>([]);
  const [setores, setSetores] = useState<SetorFuncionarioItem[]>([]);
  const [cargos, setCargos] = useState<CargoFuncionarioItem[]>([]);
  const [gerencias, setGerencias] = useState<GerenciaFuncionarioItem[]>([]);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [loading, setLoading] = useState(false);
  const [loadingTabela, setLoadingTabela] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [totais, setTotais] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalModo, setModalModo] = useState<ModalModo>("cadastrar");
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
    useState<FuncionarioItem | null>(null);
  const [modalStatusOpen, setModalStatusOpen] = useState(false);
  const [funcionarioStatus, setFuncionarioStatus] =
    useState<FuncionarioItem | null>(null);
  const [statusDataDesligamento, setStatusDataDesligamento] = useState("");
  const [statusFichaDesimpedimento, setStatusFichaDesimpedimento] =
    useState<File | null>(null);
  const [statusEnviarEmails, setStatusEnviarEmails] = useState(true);
  const [statusEnviarEmailGeral, setStatusEnviarEmailGeral] = useState(false);
  const [statusEfetivacaoEstagiario, setStatusEfetivacaoEstagiario] =
    useState(false);
  const [statusEnviarAssem, setStatusEnviarAssem] = useState(false);
  const [statusEnviarGremio, setStatusEnviarGremio] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusErro, setStatusErro] = useState("");

  const [inputNome, setInputNome] = useState("");
  const [inputCPF, setInputCPF] = useState("");
  const [inputRG, setInputRG] = useState("");
  const [inputCelular, setInputCelular] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputNascimento, setInputNascimento] = useState("");
  const [inputCC, setInputCC] = useState("");
  const [inputRamal, setInputRamal] = useState("");
  const [inputMatricula, setInputMatricula] = useState("");
  const [inputAdmissao, setInputAdmissao] = useState("");
  const [inputDemissao, setInputDemissao] = useState("");

  const [secSexo, setSecSexo] = useState("");
  const [secSetor, setSecSetor] = useState("");
  const [secCargo, setSecCargo] = useState("");
  const [secGerencia, setSecGerencia] = useState("");

  const [enviarEmailAdmissao, setEnviarEmailAdmissao] = useState(false);

  const [arquivoDocIdentidade, setArquivoDocIdentidade] = useState<File | null>(null);
  const [arquivoCompEndereco, setArquivoCompEndereco] = useState<File | null>(null);
  const [arquivoFichaRh, setArquivoFichaRh] = useState<File | null>(null);
  const [arquivoCertNascimento, setArquivoCertNascimento] = useState<File | null>(null);
  const [arquivoCertCasamento, setArquivoCertCasamento] = useState<File | null>(null);
  const [arquivoDocConjuge, setArquivoDocConjuge] = useState<File | null>(null);
  const [arquivoFichaDesimpedimento, setArquivoFichaDesimpedimento] =
    useState<File | null>(null);

  const [anexarCertNascimento, setAnexarCertNascimento] = useState(false);
  const [anexarCertCasamento, setAnexarCertCasamento] = useState(false);
  const [anexarDocConjuge, setAnexarDocConjuge] = useState(false);

  async function carregarTotais() {
    try {
      const lista = await buscarTodosFuncionarios();

      let total = 0;
      let ativos = 0;
      let inativos = 0;

      lista.forEach((funcionario) => {
        total += 1;
        if (Number(funcionario.SN_ATIVO) === 1) ativos += 1;
        if (Number(funcionario.SN_ATIVO) === 0) inativos += 1;
      });

      setTotais({ total, ativos, inativos });
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarCombos() {
    try {
      const [listaSetores, listaCargos, listaGerencias] = await Promise.all([
        buscarSetoresFuncionario(),
        buscarCargosFuncionario(),
        buscarGerenciasFuncionario(),
      ]);

      setSetores(
        [...listaSetores]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) => String(a.NM_SETOR).localeCompare(String(b.NM_SETOR)))
      );

      setCargos(
        [...listaCargos]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) => String(a.NM_CARGO).localeCompare(String(b.NM_CARGO)))
      );

      setGerencias(
        [...listaGerencias]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) =>
            String(a.NM_FUNCIONARIO).localeCompare(String(b.NM_FUNCIONARIO))
          )
      );
    } catch (e) {
      console.error(e);
      setErro("Falha ao carregar os dados auxiliares.");
    }
  }

  async function carregarFuncionarios(
    page = 1,
    limit = itensPorPagina
  ) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response: FuncionarioPaginadoResponse =
        await buscarFuncionariosPaginados({
          nome: busca || " ",
          page,
          limit,
        });

      setFuncionarios(response.items || []);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setFuncionarios([]);
      setErro(
        "Funcionário não encontrado ou falha ao carregar a listagem."
      );
    } finally {
      setLoadingTabela(false);
    }
  }

  useEffect(() => {
    carregarCombos();
  }, []);

  function limparBusca() {
    setBusca("");
    setFuncionarios([]);
    setPaginaAtual(1);
    setTotalPages(1);
    setErro("");
    setInfo("");
    setTotais({
      total: 0,
      ativos: 0,
      inativos: 0,
    });
  }

  function limparModal() {
    setFuncionarioSelecionado(null);
    setInputNome("");
    setInputCPF("");
    setInputRG("");
    setInputCelular("");
    setInputEmail("");
    setInputNascimento("");
    setInputCC("");
    setInputRamal("");
    setInputMatricula("");
    setInputAdmissao("");
    setInputDemissao("");
    setSecSexo("");
    setSecSetor("");
    setSecCargo("");
    setSecGerencia("");
    setEnviarEmailAdmissao(false);

    setArquivoDocIdentidade(null);
    setArquivoCompEndereco(null);
    setArquivoFichaRh(null);
    setArquivoCertNascimento(null);
    setArquivoCertCasamento(null);
    setArquivoDocConjuge(null);
    setArquivoFichaDesimpedimento(null);

    setAnexarCertNascimento(false);
    setAnexarCertCasamento(false);
    setAnexarDocConjuge(false);
  }

  function abrirCadastro() {
    setModalModo("cadastrar");
    limparModal();
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function abrirEdicao(funcionario: FuncionarioItem) {
    setModalModo("editar");
    setFuncionarioSelecionado(funcionario);

    setInputNome(removerEspacoInicial(funcionario.NM_FUNCIONARIO || ""));
    setInputCPF(funcionario.NR_CPF || "");
    setInputRG(removerEspacoInicial(funcionario.NR_RG || ""));
    setInputCelular(removerEspacoInicial(funcionario.NR_CELULAR || ""));
    setInputEmail(removerEspacoInicial(funcionario.EMAIL || ""));
    setInputNascimento(formatarDataInput(funcionario.DT_NASCIMENTO));
    setInputCC(removerEspacoInicial(funcionario.NR_CONTA_CORRENTE || ""));
    setInputRamal(removerEspacoInicial(funcionario.NR_RAMAL || ""));
    setInputMatricula(removerEspacoInicial(funcionario.NR_MATRICULA || ""));
    setInputAdmissao(formatarDataInput(funcionario.DT_ADMISSAO));
    setInputDemissao(formatarDataInput(funcionario.DT_DESLIGAMENTO));
    setSecSexo(funcionario.SEXO || "");
    setSecSetor(funcionario.ID_SETOR ? String(funcionario.ID_SETOR) : "");
    setSecCargo(funcionario.ID_CARGO ? String(funcionario.ID_CARGO) : "");
    setSecGerencia(funcionario.CD_GERENCIA ? String(funcionario.CD_GERENCIA) : "");

    setEnviarEmailAdmissao(false);

    setArquivoDocIdentidade(null);
    setArquivoCompEndereco(null);
    setArquivoFichaRh(null);
    setArquivoCertNascimento(null);
    setArquivoCertCasamento(null);
    setArquivoDocConjuge(null);
    setArquivoFichaDesimpedimento(null);

    setAnexarCertNascimento(Boolean(funcionario.CERT_NASCIMENTO));
    setAnexarCertCasamento(Boolean(funcionario.CERT_CASAMENTO));
    setAnexarDocConjuge(Boolean(funcionario.DOC_IDENTIDADE_CONJ));

    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (loading) return;
    setModalOpen(false);
    limparModal();
  }

  function validarCampos() {
    if (!inputNome.trim()) {
      setErro("Preencha o nome.");
      return false;
    }

    if (!inputCPF.trim()) {
      setErro("Preencha o CPF.");
      return false;
    }

    if (!inputRG.trim()) {
      setErro("Preencha o RG.");
      return false;
    }

    if (!inputCelular.trim()) {
      setErro("Preencha o celular.");
      return false;
    }

    if (!secSexo) {
      setErro("Preencha o sexo.");
      return false;
    }

    if (!inputNascimento) {
      setErro("Preencha a data de nascimento.");
      return false;
    }

    if (!inputAdmissao) {
      setErro("Preencha a data de admissão.");
      return false;
    }

    if (!secSetor) {
      setErro("Preencha o setor.");
      return false;
    }

    if (!secCargo) {
      setErro("Preencha o cargo.");
      return false;
    }

    if (!secGerencia) {
      setErro("Preencha a gerência.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoDocIdentidade) {
      setErro("Anexe o documento pessoal com foto.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoCompEndereco) {
      setErro("Anexe o comprovante de endereço.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoFichaRh) {
      setErro("Anexe a ficha cadastral do RH.");
      return false;
    }

    if (anexarCertNascimento && !arquivoCertNascimento && !funcionarioSelecionado?.CERT_NASCIMENTO) {
      setErro("Você marcou certidão de nascimento, mas não anexou o arquivo.");
      return false;
    }

    if (anexarCertCasamento && !arquivoCertCasamento && !funcionarioSelecionado?.CERT_CASAMENTO) {
      setErro("Você marcou certidão de casamento, mas não anexou o arquivo.");
      return false;
    }

    if (anexarDocConjuge && !arquivoDocConjuge && !funcionarioSelecionado?.DOC_IDENTIDADE_CONJ) {
      setErro("Você marcou documento do cônjuge, mas não anexou o arquivo.");
      return false;
    }

    return true;
  }

  async function salvarModal() {
    if (!validarCampos()) return;

    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const payload = {
        NM_FUNCIONARIO: limparTexto(inputNome).toUpperCase(),
        DT_NASCIMENTO: inputNascimento,
        ID_SETOR: Number(secSetor),
        ID_CARGO: secCargo ? Number(secCargo) : null,
        NR_RAMAL: limparTexto(inputRamal),
        CD_GERENCIA: secGerencia ? Number(secGerencia) : null,
        EMAIL: limparTexto(inputEmail),
        NR_CPF: inputCPF,
        NR_RG: limparTexto(inputRG),
        NR_CELULAR: limparTexto(inputCelular),
        SEXO: secSexo,
        DT_ADMISSAO: inputAdmissao,
        DT_DESLIGAMENTO: inputDemissao || null,
        NR_MATRICULA: limparTexto(inputMatricula),
        NR_CONTA_CORRENTE: limparTexto(inputCC) || "0000000000",
        DOC_INDENTIDADE: arquivoDocIdentidade,
        COMP_ENDERECO: arquivoCompEndereco,
        FICHA_RH: arquivoFichaRh,
        CERT_NASCIMENTO: anexarCertNascimento ? arquivoCertNascimento : null,
        CERT_CASAMENTO: anexarCertCasamento ? arquivoCertCasamento : null,
        DOC_IDENTIDADE_CONJ: anexarDocConjuge ? arquivoDocConjuge : null,
        FICHA_DESIMPEDIMENTO: arquivoFichaDesimpedimento,
        ENVIAR_EMAIL_ADMISSAO: enviarEmailAdmissao ? 1 : 0,
      };

      if (modalModo === "cadastrar") {
        await cadastrarFuncionario(payload);
        setInfo("Funcionário cadastrado com sucesso.");
      }

      if (modalModo === "editar" && funcionarioSelecionado) {
        await editarFuncionario({
          id: Number(funcionarioSelecionado.ID_FUNCIONARIO),
          ...payload,
          SN_ATIVO: Number(funcionarioSelecionado.SN_ATIVO ?? 1),
        });

        setInfo("Funcionário atualizado com sucesso.");
      }

      await carregarFuncionarios(modalModo === "editar" ? paginaAtual : 1);
      await carregarTotais();

      setTimeout(() => {
        fecharModal();
      }, 600);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Não foi possível salvar o funcionário."
      );
    } finally {
      setLoading(false);
    }
  }

  function abrirModalStatus(funcionario: FuncionarioItem) {
    const vaiInativar = Number(funcionario.SN_ATIVO) === 1;

    setFuncionarioStatus(funcionario);
    setStatusDataDesligamento(
      vaiInativar ? formatarDataInput(funcionario.DT_DESLIGAMENTO) : ""
    );
    setStatusFichaDesimpedimento(null);
    setStatusEnviarEmails(vaiInativar);
    setStatusEnviarEmailGeral(false);
    setStatusEfetivacaoEstagiario(false);
    setStatusEnviarAssem(false);
    setStatusEnviarGremio(false);
    setStatusErro("");
    setErro("");
    setInfo("");
    setModalStatusOpen(true);
  }

  function fecharModalStatus() {
    if (statusLoading) return;

    setModalStatusOpen(false);
    setFuncionarioStatus(null);
    setStatusDataDesligamento("");
    setStatusFichaDesimpedimento(null);
    setStatusEnviarEmails(true);
    setStatusEnviarEmailGeral(false);
    setStatusEfetivacaoEstagiario(false);
    setStatusEnviarAssem(false);
    setStatusEnviarGremio(false);
    setStatusErro("");
  }

  async function confirmarStatus() {
    if (!funcionarioStatus) return;

    try {
      setErro("");
      setInfo("");
      setStatusErro("");

      const novoStatus = Number(funcionarioStatus.SN_ATIVO) === 1 ? 0 : 1;

      if (novoStatus === 0 && !statusDataDesligamento) {
        setStatusErro("Preencha a data de desligamento antes de inativar.");
        return;
      }

      if (
        novoStatus === 0 &&
        !statusFichaDesimpedimento &&
        !funcionarioStatus.FICHA_DESIMPEDIMENTO
      ) {
        setStatusErro("Anexe a ficha de desimpedimento antes de inativar.");
        return;
      }

      setStatusLoading(true);

      await alterarStatusFuncionario({
        id: Number(funcionarioStatus.ID_FUNCIONARIO),
        SN_ATIVO: novoStatus,
        DT_DESLIGAMENTO: novoStatus === 0 ? statusDataDesligamento : null,
        FICHA_DESIMPEDIMENTO:
          novoStatus === 0 ? statusFichaDesimpedimento : null,
        ENVIAR_EMAIL_DESLIGAMENTO:
          novoStatus === 0 && statusEnviarEmails ? 1 : 0,
        ENVIAR_EMAIL_DESLIGAMENTO_GERAL:
          novoStatus === 0 && statusEnviarEmails && statusEnviarEmailGeral
            ? 1
            : 0,
        ENVIAR_EMAIL_ASSEM:
          novoStatus === 0 && statusEnviarEmails && statusEnviarAssem ? 1 : 0,
        ENVIAR_EMAIL_GREMIO:
          novoStatus === 0 && statusEnviarEmails && statusEnviarGremio ? 1 : 0,
        EFETIVACAO_ESTAGIARIO:
          novoStatus === 0 && statusEnviarEmails && statusEfetivacaoEstagiario
            ? 1
            : 0,
      });

      setInfo(
        novoStatus === 1
          ? "Funcionário ativado com sucesso."
          : "Funcionário inativado com sucesso."
      );

      await carregarFuncionarios(paginaAtual);
      await carregarTotais();
      fecharModalStatus();
    } catch (e: any) {
      console.error(e);
      setStatusErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Erro ao alterar o status do funcionário."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function baixarCsv() {
    try {
      setErro("");
      setInfo("Preparando relatório para download...");

      const blob = await baixarRelatorioFuncionarios();
      baixarBlob(blob, "funcionarios.csv");

      setInfo("Download do relatório iniciado com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Falha ao baixar o relatório."
      );
    }
  }

  async function baixarArquivo(caminho: string) {
    try {
      const response = await baixarArquivoFuncionario(caminho);
      const fileName =
        response.headers["content-disposition"]
          ?.split("filename=")?.[1]
          ?.replace(/"/g, "") || getNomeArquivo(caminho);

      baixarBlob(response.data, fileName);
    } catch (e: any) {
      console.error(e);
      setErro("Falha ao baixar o arquivo.");
    }
  }

  const primeiroRegistro =
    totais.total === 0
      ? 0
      : (paginaAtual - 1) * itensPorPagina + 1;

  const ultimoRegistro = Math.min(
    paginaAtual * itensPorPagina,
    totais.total
  );

  return (
    <>
      <div className="min-w-225 mx-auto overflow-hidden rounded-xl bg-white shadow">
        <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Digite o nome
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={busca}
                  onChange={(e) => {
                    setBusca(removerEspacoInicial(e.target.value));
                    setPaginaAtual(1);
                  }}
                  placeholder="Digite o nome do funcionário"
                  className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />

                <button
                  type="button"
                  onClick={() => carregarFuncionarios(1)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary"
                >
                  <FaSearch />
                  Buscar
                </button>

                <button
                  type="button"
                  onClick={limparBusca}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FaTimes />
                  Limpar
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={abrirCadastro}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary lg:w-auto"
              >
                <FaPlus />
                Cadastrar
              </button>
            </div>
          </div>

          {(erro || info) && (
            <div className="mt-4">
              {erro ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              ) : (
                <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}
            </div>
          )}

          {(funcionarios.length > 0 || loadingTabela) && (
            <>
              <div className="mt-6 flex justify-end">
                <select
                  value={itensPorPagina}
                  onChange={(e) => {
                    const novoLimite = Number(e.target.value);

                    setItensPorPagina(novoLimite);
                    setPaginaAtual(1);
                    carregarFuncionarios(1, novoLimite);
                  }}
                  disabled={loadingTabela}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Nascimento
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Ramal
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Setor
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Cargo
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">
                        Editar
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingTabela ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Carregando funcionários...
                        </td>
                      </tr>
                    ) : funcionarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Nenhum funcionário encontrado.
                        </td>
                      </tr>
                    ) : (
                      funcionarios.map((funcionario) => (
                        <tr
                          key={funcionario.ID_FUNCIONARIO}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">{funcionario.NM_FUNCIONARIO}</td>
                          <td className="px-4 py-3">
                            {formatarNascimentoTabela(funcionario.DT_NASCIMENTO)}
                          </td>
                          <td className="px-4 py-3">{funcionario.NR_RAMAL || ""}</td>
                          <td className="px-4 py-3">
                            {funcionario.SETOR?.NM_SETOR || ""}
                          </td>
                          <td className="px-4 py-3">
                            {funcionario.CARGO?.NM_CARGO || "Sem cargo Gerência"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirEdicao(funcionario)}
                              className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <FaEdit />
                              Editar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirModalStatus(funcionario)}
                              className={`inline-flex min-w-21 items-center justify-center rounded px-3 py-1.5 text-xs font-semibold ${Number(funcionario.SN_ATIVO) === 1
                                ? "bg-secondary text-white hover:bg-third"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                            >
                              {Number(funcionario.SN_ATIVO) === 1 ? "Ativo" : "Inativo"}
                            </button>
                          </td>
                        </tr>
                      ))
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
                    {totais.total}
                  </span>{" "}
                  funcionários
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      carregarFuncionarios(
                        Math.max(paginaAtual - 1, 1)
                      )
                    }
                    disabled={paginaAtual <= 1 || loadingTabela}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaChevronLeft />
                    Anterior
                  </button>

                  <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    Página {paginaAtual} de {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      carregarFuncionarios(
                        Math.min(paginaAtual + 1, totalPages)
                      )
                    }
                    disabled={
                      paginaAtual >= totalPages || loadingTabela
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                    <FaChevronRight />
                  </button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-5 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Total
                  </label>
                  <input
                    readOnly
                    value={totais.total}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Ativos
                  </label>
                  <input
                    readOnly
                    value={totais.ativos}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Inativos
                  </label>
                  <input
                    readOnly
                    value={totais.inativos}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={baixarCsv}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary md:w-auto"
                  >
                    <FaDownload />
                    Baixar Relatório
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Gestão de funcionários
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    {modalModo === "cadastrar"
                      ? "Cadastrar funcionário"
                      : "Editar funcionário"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {modalModo === "cadastrar"
                      ? "Preencha os dados pessoais, profissionais e documentos do novo funcionário."
                      : "Atualize os dados pessoais, profissionais e documentos do funcionário."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={loading}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Funcionário
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados pessoais
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Informe os dados de identificação e contato do funcionário.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Nome
                    </label>
                    <input
                      value={inputNome}
                      onChange={(e) =>
                        setInputNome(removerEspacoInicial(e.target.value))
                      }
                      placeholder="Digite o nome"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CPF
                    </label>
                    <input
                      value={inputCPF}
                      onChange={(e) =>
                        setInputCPF(
                          e.target.value.replace(/\D/g, "").slice(0, 11)
                        )
                      }
                      placeholder="Digite o CPF"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      RG
                    </label>
                    <input
                      value={inputRG}
                      onChange={(e) =>
                        setInputRG(removerEspacoInicial(e.target.value))
                      }
                      placeholder="Digite o RG"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Celular
                    </label>
                    <input
                      value={inputCelular}
                      onChange={(e) =>
                        setInputCelular(
                          formatPhone(
                            removerEspacoInicial(e.target.value)
                          )
                        )
                      }
                      placeholder="Digite o celular"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Sexo
                    </label>
                    <select
                      value={secSexo}
                      onChange={(e) => setSecSexo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Selecione</option>
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      E-mail
                    </label>
                    <input
                      value={inputEmail}
                      onChange={(e) =>
                        setInputEmail(removerEspacoInicial(e.target.value))
                      }
                      placeholder="Digite o e-mail"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Data de nascimento
                    </label>
                    <input
                      type="date"
                      value={inputNascimento}
                      onChange={(e) => setInputNascimento(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Vínculo
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados profissionais
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Informe os dados relacionados ao vínculo do funcionário com a instituição.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Conta Corrente
                    </label>
                    <input
                      value={inputCC}
                      onChange={(e) =>
                        setInputCC(removerEspacoInicial(e.target.value))
                      }
                      placeholder="Digite a conta corrente"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Ramal
                    </label>
                    <input
                      value={inputRamal}
                      onChange={(e) =>
                        setInputRamal(removerEspacoInicial(e.target.value))
                      }
                      placeholder="Digite o ramal"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Matrícula
                    </label>
                    <input
                      value={inputMatricula}
                      onChange={(e) =>
                        setInputMatricula(
                          removerEspacoInicial(e.target.value)
                        )
                      }
                      placeholder="Digite a matrícula"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Admissão
                    </label>
                    <input
                      type="date"
                      value={inputAdmissao}
                      onChange={(e) => setInputAdmissao(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Demissão
                    </label>
                    <input
                      type="date"
                      value={inputDemissao}
                      onChange={(e) => setInputDemissao(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Setor
                    </label>
                    <select
                      value={secSetor}
                      onChange={(e) => setSecSetor(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Selecione o setor</option>
                      {setores.map((setor) => (
                        <option
                          key={setor.ID_SETOR}
                          value={setor.ID_SETOR}
                        >
                          {setor.NM_SETOR}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Cargo
                    </label>
                    <select
                      value={secCargo}
                      onChange={(e) => setSecCargo(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Selecione o cargo</option>
                      {cargos.map((cargo) => (
                        <option
                          key={cargo.ID_CARGO}
                          value={cargo.ID_CARGO}
                        >
                          {cargo.NM_CARGO}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Gerência
                    </label>
                    <select
                      value={secGerencia}
                      onChange={(e) => setSecGerencia(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Selecione a gerência</option>
                      <option value="0">Sem Gerência</option>

                      {gerencias.map((gerencia) => (
                        <option
                          key={gerencia.ID_FUNCIONARIO}
                          value={gerencia.ID_FUNCIONARIO}
                        >
                          {gerencia.NM_FUNCIONARIO}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Arquivos
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Documentos
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Anexe os documentos do funcionário em formato PDF.
                  </p>
                </div>

                <div className="mt-5 space-y-5">

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Documento pessoal com foto
                    </label>

                    {modalModo === "editar" && (
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          readOnly
                          value={getNomeArquivo(
                            funcionarioSelecionado?.DOC_INDENTIDADE
                          )}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        />

                        {funcionarioSelecionado?.DOC_INDENTIDADE && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(
                                funcionarioSelecionado.DOC_INDENTIDADE!
                              )
                            }
                            className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setArquivoDocIdentidade(
                          e.target.files?.[0] || null
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Comprovante de Endereço
                    </label>

                    {modalModo === "editar" && (
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          readOnly
                          value={getNomeArquivo(
                            funcionarioSelecionado?.COMP_ENDERECO
                          )}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        />

                        {funcionarioSelecionado?.COMP_ENDERECO && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(
                                funcionarioSelecionado.COMP_ENDERECO!
                              )
                            }
                            className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setArquivoCompEndereco(
                          e.target.files?.[0] || null
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Ficha cadastral do RH
                    </label>

                    {modalModo === "editar" && (
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          readOnly
                          value={getNomeArquivo(
                            funcionarioSelecionado?.FICHA_RH
                          )}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        />

                        {funcionarioSelecionado?.FICHA_RH && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(
                                funcionarioSelecionado.FICHA_RH!
                              )
                            }
                            className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setArquivoFichaRh(
                          e.target.files?.[0] || null
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={anexarCertNascimento}
                        onChange={(e) =>
                          setAnexarCertNascimento(e.target.checked)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      Certidão de Nascimento
                    </label>

                    {anexarCertNascimento && (
                      <div className="mt-4">
                        {modalModo === "editar" && (
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              readOnly
                              value={getNomeArquivo(
                                funcionarioSelecionado?.CERT_NASCIMENTO
                              )}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                            />

                            {funcionarioSelecionado?.CERT_NASCIMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(
                                    funcionarioSelecionado.CERT_NASCIMENTO!
                                  )
                                }
                                className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}

                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoCertNascimento(
                              e.target.files?.[0] || null
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={anexarCertCasamento}
                        onChange={(e) =>
                          setAnexarCertCasamento(e.target.checked)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      Certidão de Casamento
                    </label>

                    {anexarCertCasamento && (
                      <div className="mt-4">
                        {modalModo === "editar" && (
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              readOnly
                              value={getNomeArquivo(
                                funcionarioSelecionado?.CERT_CASAMENTO
                              )}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                            />

                            {funcionarioSelecionado?.CERT_CASAMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(
                                    funcionarioSelecionado.CERT_CASAMENTO!
                                  )
                                }
                                className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}

                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoCertCasamento(
                              e.target.files?.[0] || null
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={anexarDocConjuge}
                        onChange={(e) =>
                          setAnexarDocConjuge(e.target.checked)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      Documento do cônjuge com foto e CPF
                    </label>

                    {anexarDocConjuge && (
                      <div className="mt-4">
                        {modalModo === "editar" && (
                          <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              readOnly
                              value={getNomeArquivo(
                                funcionarioSelecionado?.DOC_IDENTIDADE_CONJ
                              )}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                            />

                            {funcionarioSelecionado?.DOC_IDENTIDADE_CONJ && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(
                                    funcionarioSelecionado.DOC_IDENTIDADE_CONJ!
                                  )
                                }
                                className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}

                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoDocConjuge(
                              e.target.files?.[0] || null
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                        />
                      </div>
                    )}
                  </div>

                  {modalModo === "editar" && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Ficha de Desimpedimento
                      </label>

                      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          readOnly
                          value={getNomeArquivo(
                            funcionarioSelecionado?.FICHA_DESIMPEDIMENTO
                          )}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        />

                        {funcionarioSelecionado?.FICHA_DESIMPEDIMENTO && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(
                                funcionarioSelecionado.FICHA_DESIMPEDIMENTO!
                              )
                            }
                            className="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Consultar
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          setArquivoFichaDesimpedimento(
                            e.target.files?.[0] || null
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {modalModo === "cadastrar" && (
                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Comunicação
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Notificação de admissão
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Deseja enviar e-mail às partes responsáveis?
                  </p>

                  <div className="mt-4 flex gap-6">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={enviarEmailAdmissao === true}
                        onChange={() => setEnviarEmailAdmissao(true)}
                        className="h-4 w-4 accent-primary"
                      />
                      Sim
                    </label>

                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={enviarEmailAdmissao === false}
                        onChange={() => setEnviarEmailAdmissao(false)}
                        className="h-4 w-4 accent-primary"
                      />
                      Não
                    </label>
                  </div>
                </div>
              )}

              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erro}
                </div>
              )}

              {!erro && info && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {info}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={loading}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarModal}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Salvando..."
                    : modalModo === "cadastrar"
                      ? "Cadastrar funcionário"
                      : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalStatusOpen && funcionarioStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Gestão de funcionários
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    {Number(funcionarioStatus.SN_ATIVO) === 1
                      ? "Inativar funcionário"
                      : "Ativar funcionário"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {funcionarioStatus.NM_FUNCIONARIO}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalStatus}
                  disabled={statusLoading}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
              {Number(funcionarioStatus.SN_ATIVO) === 1 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm leading-6 text-amber-900">
                    Para inativar, informe a data de desligamento e anexe a
                    ficha de desimpedimento. Se o envio de e-mail estiver
                    marcado, o sistema avisará automaticamente os destinatários
                    configurados do RH e a gerência vinculada.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm leading-6 text-emerald-900">
                    Ao confirmar, o funcionário será reativado e a data de
                    desligamento será limpa.
                  </p>
                </div>
              )}

              {Number(funcionarioStatus.SN_ATIVO) === 1 && (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Desligamento
                    </p>

                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Dados da inativação
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Informe os dados obrigatórios para concluir a inativação.
                    </p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Data de desligamento
                        </label>

                        <input
                          type="date"
                          value={statusDataDesligamento}
                          onChange={(e) =>
                            setStatusDataDesligamento(e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Ficha de desimpedimento
                        </label>

                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setStatusFichaDesimpedimento(
                              e.target.files?.[0] || null
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                        />

                        {funcionarioStatus.FICHA_DESIMPEDIMENTO && (
                          <p className="mt-2 text-xs text-slate-500">
                            Arquivo salvo atualmente:{" "}
                            <span className="font-semibold text-slate-700">
                              {getNomeArquivo(
                                funcionarioStatus.FICHA_DESIMPEDIMENTO
                              )}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Comunicação
                    </p>

                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Notificações de desligamento
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Deseja enviar e-mail às partes responsáveis?
                    </p>

                    <div className="mt-4 flex flex-wrap gap-6">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          checked={statusEnviarEmails === true}
                          onChange={() => setStatusEnviarEmails(true)}
                          className="h-4 w-4 accent-primary"
                        />
                        Sim
                      </label>

                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          checked={statusEnviarEmails === false}
                          onChange={() => setStatusEnviarEmails(false)}
                          className="h-4 w-4 accent-primary"
                        />
                        Não
                      </label>
                    </div>

                    {statusEnviarEmails && (
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={statusEfetivacaoEstagiario}
                            onChange={(e) =>
                              setStatusEfetivacaoEstagiario(
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          Efetivação de estagiário
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={statusEnviarEmailGeral}
                            onChange={(e) =>
                              setStatusEnviarEmailGeral(e.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          Avisar lista geral
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={statusEnviarAssem}
                            onChange={(e) =>
                              setStatusEnviarAssem(e.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          ASSEM
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={statusEnviarGremio}
                            onChange={(e) =>
                              setStatusEnviarGremio(e.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          Grêmio
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}

              {statusErro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {statusErro}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModalStatus}
                  disabled={statusLoading}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarStatus}
                  disabled={statusLoading}
                  className={`inline-flex cursor-pointer items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${Number(funcionarioStatus.SN_ATIVO) === 1
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-secondary hover:bg-primary"
                    }`}
                >
                  {statusLoading
                    ? "Processando..."
                    : Number(funcionarioStatus.SN_ATIVO) === 1
                      ? "Inativar funcionário"
                      : "Ativar funcionário"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
