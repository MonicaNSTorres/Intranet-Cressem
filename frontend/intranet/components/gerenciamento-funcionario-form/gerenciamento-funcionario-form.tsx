"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
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

  async function carregarFuncionarios(page = 1) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response: FuncionarioPaginadoResponse =
        await buscarFuncionariosPaginados({
          nome: busca || " ",
          page,
          limit: 10,
        });

      setFuncionarios(response.items || []);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setFuncionarios([]);
      setErro("Funcionário não encontrado ou falha ao carregar a listagem.");
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

    setInputNome(funcionario.NM_FUNCIONARIO || "");
    setInputCPF(funcionario.NR_CPF || "");
    setInputRG(funcionario.NR_RG || "");
    setInputCelular(funcionario.NR_CELULAR || "");
    setInputEmail(funcionario.EMAIL || "");
    setInputNascimento(formatarDataInput(funcionario.DT_NASCIMENTO));
    setInputCC(funcionario.NR_CONTA_CORRENTE || "");
    setInputRamal(funcionario.NR_RAMAL || "");
    setInputMatricula(funcionario.NR_MATRICULA || "");
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
        NM_FUNCIONARIO: inputNome.trim().toUpperCase(),
        DT_NASCIMENTO: inputNascimento,
        ID_SETOR: Number(secSetor),
        ID_CARGO: secCargo ? Number(secCargo) : null,
        NR_RAMAL: inputRamal || " ",
        CD_GERENCIA: secGerencia ? Number(secGerencia) : null,
        EMAIL: inputEmail || " ",
        NR_CPF: inputCPF,
        NR_RG: inputRG,
        NR_CELULAR: inputCelular,
        SEXO: secSexo,
        DT_ADMISSAO: inputAdmissao,
        DT_DESLIGAMENTO: inputDemissao || null,
        NR_MATRICULA: inputMatricula || " ",
        NR_CONTA_CORRENTE: inputCC || "0000000000",
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

  async function alternarStatus(funcionario: FuncionarioItem) {
    try {
      setErro("");
      setInfo("");

      const novoStatus = Number(funcionario.SN_ATIVO) === 1 ? 0 : 1;

      await alterarStatusFuncionario({
        id: Number(funcionario.ID_FUNCIONARIO),
        SN_ATIVO: novoStatus,
        DT_DESLIGAMENTO: novoStatus === 0 ? inputDemissao || null : null,
        FICHA_DESIMPEDIMENTO: null,
      });

      setInfo(
        novoStatus === 1
          ? "Funcionário ativado com sucesso."
          : "Funcionário inativado com sucesso."
      );

      await carregarFuncionarios(paginaAtual);
      await carregarTotais();
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Erro ao alterar o status do funcionário."
      );
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

  const paginasVisiveis = useMemo(() => {
    const range = 2;
    const inicio = Math.max(1, paginaAtual - range);
    const fim = Math.min(totalPages, paginaAtual + range);

    const paginas: number[] = [];
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }, [paginaAtual, totalPages]);

  return (
    <>
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Digite o nome
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
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
            <div className="mt-6 overflow-x-auto rounded-xl border">
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
                            onClick={() => alternarStatus(funcionario)}
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

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {paginaAtual > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => carregarFuncionarios(1)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarFuncionarios(paginaAtual - 1)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Anterior
                  </button>
                </>
              )}

              {paginasVisiveis.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => carregarFuncionarios(page)}
                  className={`rounded px-3 py-1.5 text-sm ${page === paginaAtual
                    ? "bg-emerald-600 text-white"
                    : "border text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {page}
                </button>
              ))}

              {paginaAtual < totalPages && (
                <>
                  <button
                    type="button"
                    onClick={() => carregarFuncionarios(paginaAtual + 1)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Próxima
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarFuncionarios(totalPages)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalModo === "cadastrar"
                  ? "Cadastro Funcionário"
                  : "Editar Funcionário"}
              </h2>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nome
                  </label>
                  <input
                    value={inputNome}
                    onChange={(e) => setInputNome(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o nome"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    CPF
                  </label>
                  <input
                    value={inputCPF}
                    onChange={(e) => setInputCPF(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o CPF"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    RG
                  </label>
                  <input
                    value={inputRG}
                    onChange={(e) => setInputRG(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o RG"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Celular
                  </label>
                  <input
                    value={inputCelular}
                    onChange={(e) => setInputCelular(formatPhone(e.target.value))}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o celular"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Sexo
                  </label>
                  <select
                    value={secSexo}
                    onChange={(e) => setSecSexo(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value=""></option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Email
                  </label>
                  <input
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o email"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nascimento
                  </label>
                  <input
                    type="date"
                    value={inputNascimento}
                    onChange={(e) => setInputNascimento(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Conta Corrente
                  </label>
                  <input
                    value={inputCC}
                    onChange={(e) => setInputCC(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite a conta corrente"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Ramal
                  </label>
                  <input
                    value={inputRamal}
                    onChange={(e) => setInputRamal(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite o ramal"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Matrícula
                  </label>
                  <input
                    value={inputMatricula}
                    onChange={(e) => setInputMatricula(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Digite a matrícula"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Admissão
                  </label>
                  <input
                    type="date"
                    value={inputAdmissao}
                    onChange={(e) => setInputAdmissao(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Demissão
                  </label>
                  <input
                    type="date"
                    value={inputDemissao}
                    onChange={(e) => setInputDemissao(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Setor
                  </label>
                  <select
                    value={secSetor}
                    onChange={(e) => setSecSetor(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value=""></option>
                    {setores.map((setor) => (
                      <option key={setor.ID_SETOR} value={setor.ID_SETOR}>
                        {setor.NM_SETOR}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Cargo
                  </label>
                  <select
                    value={secCargo}
                    onChange={(e) => setSecCargo(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value=""></option>
                    {cargos.map((cargo) => (
                      <option key={cargo.ID_CARGO} value={cargo.ID_CARGO}>
                        {cargo.NM_CARGO}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Gerência
                  </label>
                  <select
                    value={secGerencia}
                    onChange={(e) => setSecGerencia(e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value=""></option>
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

              <div className="rounded border p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-800">
                  Documentos
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Documento pessoal com foto
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.DOC_INDENTIDADE)}
                          className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                        />
                        {funcionarioSelecionado?.DOC_INDENTIDADE && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(funcionarioSelecionado.DOC_INDENTIDADE!)
                            }
                            className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
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
                        setArquivoDocIdentidade(e.target.files?.[0] || null)
                      }
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Comprovante de Endereço
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.COMP_ENDERECO)}
                          className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                        />
                        {funcionarioSelecionado?.COMP_ENDERECO && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(funcionarioSelecionado.COMP_ENDERECO!)
                            }
                            className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
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
                        setArquivoCompEndereco(e.target.files?.[0] || null)
                      }
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Ficha cadastral do RH
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.FICHA_RH)}
                          className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                        />
                        {funcionarioSelecionado?.FICHA_RH && (
                          <button
                            type="button"
                            onClick={() => baixarArquivo(funcionarioSelecionado.FICHA_RH!)}
                            className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setArquivoFichaRh(e.target.files?.[0] || null)}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={anexarCertNascimento}
                        onChange={(e) => setAnexarCertNascimento(e.target.checked)}
                      />
                      Certidão de Nascimento
                    </label>

                    {anexarCertNascimento && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.CERT_NASCIMENTO)}
                              className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                            />
                            {funcionarioSelecionado?.CERT_NASCIMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.CERT_NASCIMENTO!)
                                }
                                className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
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
                            setArquivoCertNascimento(e.target.files?.[0] || null)
                          }
                          className="w-full rounded border px-3 py-2"
                        />
                      </>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={anexarCertCasamento}
                        onChange={(e) => setAnexarCertCasamento(e.target.checked)}
                      />
                      Certidão de Casamento
                    </label>

                    {anexarCertCasamento && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.CERT_CASAMENTO)}
                              className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                            />
                            {funcionarioSelecionado?.CERT_CASAMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.CERT_CASAMENTO!)
                                }
                                className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
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
                            setArquivoCertCasamento(e.target.files?.[0] || null)
                          }
                          className="w-full rounded border px-3 py-2"
                        />
                      </>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={anexarDocConjuge}
                        onChange={(e) => setAnexarDocConjuge(e.target.checked)}
                      />
                      Documento do cônjuge com foto e CPF
                    </label>

                    {anexarDocConjuge && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.DOC_IDENTIDADE_CONJ)}
                              className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                            />
                            {funcionarioSelecionado?.DOC_IDENTIDADE_CONJ && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.DOC_IDENTIDADE_CONJ!)
                                }
                                className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
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
                            setArquivoDocConjuge(e.target.files?.[0] || null)
                          }
                          className="w-full rounded border px-3 py-2"
                        />
                      </>
                    )}
                  </div>

                  {modalModo === "editar" &&
                    Boolean(funcionarioSelecionado?.FICHA_DESIMPEDIMENTO) && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Ficha de Desimpedimento
                        </label>
                        <div className="mb-2 flex gap-2">
                          <input
                            readOnly
                            value={getNomeArquivo(funcionarioSelecionado?.FICHA_DESIMPEDIMENTO)}
                            className="w-full rounded border bg-gray-50 px-3 py-2 text-sm"
                          />
                          {funcionarioSelecionado?.FICHA_DESIMPEDIMENTO && (
                            <button
                              type="button"
                              onClick={() =>
                                baixarArquivo(funcionarioSelecionado.FICHA_DESIMPEDIMENTO!)
                              }
                              className="rounded bg-secondary px-3 py-2 text-xs font-semibold text-white"
                            >
                              Consultar
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoFichaDesimpedimento(e.target.files?.[0] || null)
                          }
                          className="w-full rounded border px-3 py-2"
                        />
                      </div>
                    )}
                </div>
              </div>

              {modalModo === "cadastrar" && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">
                    Deseja enviar e-mail às partes responsáveis?
                  </label>

                  <div className="flex gap-6 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        checked={enviarEmailAdmissao === true}
                        onChange={() => setEnviarEmailAdmissao(true)}
                      />
                      Sim
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        checked={enviarEmailAdmissao === false}
                        onChange={() => setEnviarEmailAdmissao(false)}
                      />
                      Não
                    </label>
                  </div>
                </div>
              )}

              {(erro || info) && (
                <div>
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
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={fecharModal}
                className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarModal}
                disabled={loading}
                className={`rounded px-4 py-2 font-semibold text-white ${modalModo === "cadastrar"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {loading
                  ? "Salvando..."
                  : modalModo === "cadastrar"
                    ? "Cadastrar"
                    : "Editar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}