"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  baixarArquivoPatrocinio,
  baixarRelatorioPatrocinios,
  buscarFuncionarioTipo,
  buscarPatrocinioPorId,
  buscarPatrociniosPaginado,
  enviarEmailConselho,
  enviarEmailDiretoria,
  enviarEmailParecerFinal,
  type FuncionarioTipoResponse,
  type PatrocinioItem,
  atualizarPatrocinio,
} from "@/services/gerenciamento_participacao.service";
import { getMeAdUser } from "@/services/auth.service";

function capitalizeWords(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function primeiroUltimoNome(nomeCompleto: string) {
  const nomes = String(nomeCompleto || "").trim().split(" ").filter(Boolean);
  if (nomes.length <= 1) return nomes[0] || "";
  return `${nomes[0]} ${nomes[nomes.length - 1]}`;
}

function formatarCPFouCNPJ(valor: string) {
  let value = String(valor || "").replace(/\D/g, "");

  if (value.length <= 11) {
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (value.length === 14) {
    value = value.replace(/^(\d{2})(\d)/, "$1.$2");
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");
  }

  return value;
}

function formatarDataBR(dataIso?: string) {
  if (!dataIso) return "";
  const raw = String(dataIso).slice(0, 10);
  const [ano, mes, dia] = raw.split("-");
  if (!ano || !mes || !dia) return raw;
  return `${dia}/${mes}/${ano}`;
}

function fmtBRL(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

type Totais = {
  total: number;
  gerencia: number;
  diretoria: number;
  conselho: number;
  aprovados: number;
  reprovados: number;
};

const totaisIniciais: Totais = {
  total: 0,
  gerencia: 0,
  diretoria: 0,
  conselho: 0,
  aprovados: 0,
  reprovados: 0,
};

export function GerenciamentoParticipacaoForm() {
  const router = useRouter();

  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<PatrocinioItem[]>([]);
  const [totais, setTotais] = useState<Totais>(totaisIniciais);

  const [funcionarioTipo, setFuncionarioTipo] = useState<FuncionarioTipoResponse | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PatrocinioItem | null>(null);

  const [inputGerencia, setInputGerencia] = useState("");
  const [inputParecerGerenciaEscrito, setInputParecerGerenciaEscrito] = useState("");
  const [inputResponsavelEvento, setInputResponsavelEvento] = useState("");
  const [inputSugestao, setInputSugestao] = useState("");
  const [inputDiretoria, setInputDiretoria] = useState("");
  const [inputParecerDiretoria, setInputParecerDiretoria] = useState("");
  const [inputConselho, setInputConselho] = useState("");
  const [inputConselhoFinal, setInputConselhoFinal] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const me = await getMeAdUser();
        const nome = me?.nome_completo || "";
        setNomeResponsavel(nome);

        if (nome) {
          const tipo = await buscarFuncionarioTipo(nome);
          setFuncionarioTipo(tipo);
          setInputGerencia(tipo.TIPO === "gerencia" ? tipo.NM_FUNCIONARIO : "");
          setInputDiretoria(tipo.TIPO === "diretoria" ? tipo.NM_FUNCIONARIO : "");
        }
      } catch (err: any) {
        setErro(err?.message || "Falha ao carregar usuário logado.");
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!nomeResponsavel) return;
    buscarLista(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeResponsavel]);

  async function buscarTotais() {
    if (!nomeResponsavel) return;

    try {
      const response = await buscarPatrociniosPaginado({
        nome: nomeResponsavel,
        pesquisa: " ",
        page: 1,
        limit: 999999,
      });

      const calc = { ...totaisIniciais };

      response.items.forEach((patrocinio) => {
        calc.total += 1;

        if (patrocinio.NM_ANDAMENTO === "Pendente Gerência") calc.gerencia += 1;
        else if (patrocinio.NM_ANDAMENTO === "Pendente Diretoria") calc.diretoria += 1;
        else if (patrocinio.NM_ANDAMENTO === "Pendente Conselho") calc.conselho += 1;
        else if (patrocinio.NM_ANDAMENTO === "Aprovado") calc.aprovados += 1;
        else if (patrocinio.NM_ANDAMENTO === "Reprovado") calc.reprovados += 1;
      });

      setTotais(calc);
    } catch {
      //
    }
  }

  async function buscarLista(page = 1) {
    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const response = await buscarPatrociniosPaginado({
        nome: nomeResponsavel,
        pesquisa: pesquisa || " ",
        page,
        limit: 10,
      });

      setItems(response.items || []);
      setPaginaAtual(page);
      setTotalPages(response.total_pages || 1);

      await buscarTotais();
    } catch (err: any) {
      setErro(err?.message || "Falha ao buscar solicitações.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setPesquisa("");
    setItems([]);
    setTotais(totaisIniciais);
    setPaginaAtual(1);
    setTotalPages(1);
    setErro("");
    setInfo("");
  }

  function abrirCadastro() {
    router.push("/auth/solicitacao_participacao");
  }

  async function abrirAndamento(item: PatrocinioItem) {
    try {
      setErro("");
      const completo = await buscarPatrocinioPorId(item.ID_PATROCINIO);

      setSelected(completo);
      setInputGerencia(completo.NM_GERENCIA || "");
      setInputParecerGerenciaEscrito(completo.DESC_PARECER_GERENCIA || "");
      setInputResponsavelEvento(completo.NM_GERENTE_EVENTO || "");
      setInputSugestao(completo.NM_SUGESTAO_PARTICIPANTES || "");
      setInputDiretoria(completo.NM_DIRETORIA || "");
      setInputParecerDiretoria(completo.DESC_PARECER_ESCRITO_DIRETORIA || "");
      setInputConselho(completo.DESC_PARECER_ESCRITO_CONSELHO || "");
      setInputConselhoFinal(completo.NM_PARECER_CONSELHO || "");
      setModalOpen(true);
    } catch (err: any) {
      setErro(err?.message || "Falha ao abrir a solicitação.");
    }
  }

  function validaCampos() {
    if (!inputResponsavelEvento.trim()) {
      setErro("Indique o funcionário responsável pelo evento.");
      return false;
    }

    if (!inputSugestao.trim()) {
      setErro("Dê sugestões de participantes para o evento.");
      return false;
    }

    if (funcionarioTipo?.TIPO === "gerencia" && !inputParecerGerenciaEscrito.trim()) {
      setErro("Dê seu parecer de Gerência.");
      return false;
    }

    if (funcionarioTipo?.TIPO === "diretoria" && !inputParecerDiretoria.trim()) {
      setErro("Dê seu parecer de Diretoria.");
      return false;
    }

    if (funcionarioTipo?.TIPO === "conselho") {
      if (!inputConselho.trim()) {
        setErro("Dê seu parecer de Conselho.");
        return false;
      }

      if (!inputConselhoFinal.trim()) {
        setErro("Selecione a decisão final.");
        return false;
      }
    }

    return true;
  }

  async function salvarParecer() {
    if (!selected || !funcionarioTipo) return;
    if (!validaCampos()) return;

    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const existente = await buscarPatrocinioPorId(selected.ID_PATROCINIO);

      let status1 = "";
      if (funcionarioTipo.TIPO === "gerencia") status1 = "Pendente Diretoria";
      if (funcionarioTipo.TIPO === "diretoria") status1 = "Pendente Conselho";
      if (funcionarioTipo.TIPO === "conselho") status1 = inputConselhoFinal;

      const data: Record<string, any> = {
        NM_ANDAMENTO: status1,
        DESC_PARECER_GERENCIA: existente.DESC_PARECER_GERENCIA,
        NM_GERENCIA: existente.NM_GERENCIA,
        DESC_PARECER_ESCRITO_DIRETORIA: existente.DESC_PARECER_ESCRITO_DIRETORIA,
        NM_DIRETORIA: existente.NM_DIRETORIA,
        NM_PARECER_CONSELHO: existente.NM_PARECER_CONSELHO,
        DESC_PARECER_ESCRITO_CONSELHO: existente.DESC_PARECER_ESCRITO_CONSELHO,
        NM_GERENTE_EVENTO: existente.NM_GERENTE_EVENTO,
        NM_SUGESTAO_PARTICIPANTES: existente.NM_SUGESTAO_PARTICIPANTES,
      };

      switch (funcionarioTipo.TIPO) {
        case "gerencia":
          Object.assign(data, {
            DESC_PARECER_GERENCIA: inputParecerGerenciaEscrito,
            NM_GERENCIA: funcionarioTipo.NM_FUNCIONARIO,
            NM_GERENTE_EVENTO: inputResponsavelEvento,
            NM_SUGESTAO_PARTICIPANTES: inputSugestao,
          });
          break;

        case "diretoria":
          Object.assign(data, {
            DESC_PARECER_ESCRITO_DIRETORIA: inputParecerDiretoria,
            NM_DIRETORIA: funcionarioTipo.NM_FUNCIONARIO,
            NM_GERENTE_EVENTO: inputResponsavelEvento,
            NM_SUGESTAO_PARTICIPANTES: inputSugestao,
          });
          break;

        case "conselho":
          Object.assign(data, {
            NM_GERENTE_EVENTO: inputResponsavelEvento,
            NM_SUGESTAO_PARTICIPANTES: inputSugestao,
            NM_PARECER_CONSELHO: inputConselhoFinal,
            DESC_PARECER_ESCRITO_CONSELHO: inputConselho,
            DT_FINALIZACAO: new Date().toISOString().slice(0, 10),
          });
          break;
      }

      await atualizarPatrocinio(selected.ID_PATROCINIO, data);

      if (status1 === "Pendente Diretoria") {
        await enviarEmailDiretoria(
          selected.NM_FUNCIONARIO,
          selected.NM_SOLICITANTE,
          selected.ID_PATROCINIO
        );
      } else if (status1 === "Pendente Conselho") {
        await enviarEmailConselho(selected.ID_PATROCINIO);
      } else if (funcionarioTipo.TIPO === "conselho") {
        await enviarEmailParecerFinal(funcionarioTipo.TIPO, selected.ID_PATROCINIO);
      }

      setInfo("Solicitação atualizada com sucesso.");
      setModalOpen(false);
      await buscarLista(paginaAtual);
    } catch (err: any) {
      setErro(err?.message || "Não foi possível atualizar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function visualizarArquivo(caminho?: string) {
    if (!caminho) return;

    try {
      const blob = await baixarArquivoPatrocinio(caminho);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      setErro(err?.message || "Erro ao baixar arquivo.");
    }
  }

  async function baixarCSV() {
    try {
      const blob = await baixarRelatorioPatrocinios();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patrocinios.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErro(err?.message || "Erro ao baixar relatório.");
    }
  }

  const paginacao = useMemo(() => {
    const range = 2;
    const itemsPag: number[] = [];

    for (
      let i = Math.max(1, paginaAtual - range);
      i <= Math.min(totalPages, paginaAtual + range);
      i++
    ) {
      itemsPag.push(i);
    }

    return itemsPag;
  }, [paginaAtual, totalPages]);

  const selectedContaCooperativa = selected?.CD_CONTA_COOPERATIVA ? "Sim" : "Não";
  const selectedUltimoEvento = selected?.DESC_RETORNO_ULTIMO_EVENTO || "Não preenchido.";
  const selectedVinculo = selected?.DESC_VINCULO || "Não preenchido.";
  const selectedServicos = selected?.DESC_SERVICOS || "Não preenchido.";

  const podeEditar = useMemo(() => {
    if (!selected || !funcionarioTipo) return false;
    if (selected.NM_ANDAMENTO === "Aprovado" || selected.NM_ANDAMENTO === "Reprovado") {
      return false;
    }
    return true;
  }, [selected, funcionarioTipo]);

  return (
    <>
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Digite o solicitante, CPF/CNPJ ou status"
              className="rounded border px-3 py-2"
            />
            <button
              onClick={() => buscarLista(1)}
              className="rounded bg-white px-4 py-2 text-sm font-semibold text-primary border border-primary hover:bg-primary hover:text-white"
            >
              Buscar
            </button>
            <button
              onClick={limpar}
              className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-700 border hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>

          <button
            onClick={abrirCadastro}
            className="rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
          >
            Cadastrar
          </button>
        </div>

        {erro && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {info && (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {info}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1100px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      Nome Fantasia
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      CPF/CNPJ
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      Cidade
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      Funcionário
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      Dia
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="bg-gray-50 border-b px-3 py-3 text-center text-xs font-semibold text-gray-600">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((patrocinio) => (
                    <tr key={patrocinio.ID_PATROCINIO}>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {capitalizeWords(patrocinio.NM_SOLICITANTE)}
                      </td>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {formatarCPFouCNPJ(patrocinio.NR_CPF_CNPJ)}
                      </td>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {capitalizeWords(patrocinio.NM_CIDADE)}
                      </td>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {primeiroUltimoNome(capitalizeWords(patrocinio.NM_FUNCIONARIO))}
                      </td>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {formatarDataBR(patrocinio.DT_SOLICITACAO)}
                      </td>
                      <td className="border-b px-3 py-3 text-sm text-gray-700">
                        {capitalizeWords(patrocinio.NM_ANDAMENTO)}
                      </td>
                      <td className="border-b px-3 py-3 text-center">
                        <button
                          onClick={() => abrirAndamento(patrocinio)}
                          className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                        >
                          Andamento
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {paginaAtual > 1 && (
                <>
                  <button
                    onClick={() => buscarLista(1)}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    1
                  </button>
                  <button
                    onClick={() => buscarLista(paginaAtual - 1)}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Anterior
                  </button>
                </>
              )}

              {paginacao.map((page) => (
                <button
                  key={page}
                  onClick={() => buscarLista(page)}
                  className={`rounded px-3 py-2 text-sm ${
                    page === paginaAtual
                      ? "bg-secondary text-white"
                      : "border text-gray-700"
                  }`}
                >
                  {page}
                </button>
              ))}

              {paginaAtual < totalPages && (
                <>
                  <button
                    onClick={() => buscarLista(paginaAtual + 1)}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    Próxima
                  </button>
                  <button
                    onClick={() => buscarLista(totalPages)}
                    className="rounded border px-3 py-2 text-sm"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-7">
              <ResumoCard label="Total" value={totais.total} />
              <ResumoCard label="P. Gerência" value={totais.gerencia} />
              <ResumoCard label="P. Diretoria" value={totais.diretoria} />
              <ResumoCard label="P. Conselho" value={totais.conselho} />
              <ResumoCard label="Aprovados" value={totais.aprovados} />
              <ResumoCard label="Reprovados" value={totais.reprovados} />
              <button
                onClick={baixarCSV}
                className="rounded-xl border bg-white px-4 py-4 text-sm font-semibold text-secondary hover:bg-secondary hover:text-white"
              >
                Baixar Relatório
              </button>
            </div>
          </>
        )}
      </div>

      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Análise de Patrocínio - {capitalizeWords(selected.NM_SOLICITANTE)}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4 p-6">
              <CampoTextarea label="Solicitação" value={selected.DESC_SOLICITACAO} readOnly />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoInput label="Precisa de dinheiro?" value={selected.VL_MONETARIO ? "Sim" : "Não"} readOnly />
                <CampoInput label="Valor" value={fmtBRL(selected.VL_PATROCINIO)} readOnly />
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Ofício</label>
                  <button
                    onClick={() => visualizarArquivo(selected.DIR_OFICIO)}
                    className="w-full rounded border px-3 py-2 text-left hover:bg-gray-50"
                  >
                    Visualizar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoInput label="É insumo?" value={selected.QTD_INSUMO ? "Sim" : "Não"} readOnly />
                <CampoInput label="Estimado" value={fmtBRL(selected.VL_ESTIMATIVA)} readOnly />
                <CampoInput label="Cidade" value={selected.NM_CIDADE} readOnly />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoInput label="Auditório Sede" value={selected.CD_AUDITORIO_SEDE ? "Sim" : "Não"} readOnly />
                <CampoInput label="Auditório Centro de Convivência" value={selected.CD_AUDITORIO_CENTRO ? "Sim" : "Não"} readOnly />
                {selected.DIR_DOC_SEM_FINS_LUCRATIVO ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Declaração de Utilidade Pública
                    </label>
                    <button
                      onClick={() => visualizarArquivo(selected.DIR_DOC_SEM_FINS_LUCRATIVO)}
                      className="w-full rounded border px-3 py-2 text-left hover:bg-gray-50"
                    >
                      Visualizar
                    </button>
                  </div>
                ) : (
                  <CampoInput label="Declaração de Utilidade Pública" value="Não enviada" readOnly />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoInput label="Motorista" value={selected.CD_MOTORISTA ? "Sim" : "Não"} readOnly />
                <CampoInput label="Funcionários" value={selected.CD_FUNCIONARIOS ? "Sim" : "Não"} readOnly />
                <div />
              </div>

              <CampoTextarea label="Vínculo" value={selectedVinculo} readOnly />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoInput label="S. médio C/C" value={fmtBRL(selected.VL_SALDO_MEDCIOCC)} readOnly />
                <CampoInput label="R. Maquininha" value={fmtBRL(selected.VL_RENTABILIDADE_MAQUININHA)} readOnly />
                <CampoInput label="Conta na Cooperativa" value={selectedContaCooperativa} readOnly />
              </div>
              <CampoTextarea label="Produtos/Serviços" value={selectedServicos} readOnly />
              <CampoTextarea label="Retorno último evento" value={selectedUltimoEvento} readOnly />

              <div className="space-y-3">
                {selected.DIAS?.map((dia, index) => (
                  <div key={`${dia.DT_DIA}-${index}`} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <CampoInput label="Dia(s)" value={dia.DT_DIA} readOnly />
                    <CampoInput label="Início" value={dia.HR_INICIO} readOnly />
                    <CampoInput label="Fim" value={dia.HR_FIM} readOnly />
                  </div>
                ))}
              </div>

              <CampoTextarea label="Resumo do Evento" value={selected.DESC_RESUMO_EVENTO} readOnly />

              <CampoInput label="Nome Gerência" value={inputGerencia} readOnly />
              <CampoTextarea
                label="Parecer Gerência"
                value={inputParecerGerenciaEscrito}
                onChange={setInputParecerGerenciaEscrito}
                readOnly={!(funcionarioTipo?.TIPO === "gerencia" && podeEditar)}
              />

              <CampoInput
                label="Responsável Evento"
                value={inputResponsavelEvento}
                onChange={setInputResponsavelEvento}
                readOnly={!podeEditar || funcionarioTipo?.TIPO === "funcionario"}
              />

              <CampoTextarea
                label="Sugestões de Participantes"
                value={inputSugestao}
                onChange={setInputSugestao}
                readOnly={!podeEditar || funcionarioTipo?.TIPO === "funcionario"}
              />

              <CampoInput label="Nome Diretoria" value={inputDiretoria} readOnly />
              <CampoTextarea
                label="Parecer Diretoria"
                value={inputParecerDiretoria}
                onChange={setInputParecerDiretoria}
                readOnly={!(funcionarioTipo?.TIPO === "diretoria" && podeEditar)}
              />

              <CampoTextarea
                label="Parecer Conselho"
                value={inputConselho}
                onChange={setInputConselho}
                readOnly={!(funcionarioTipo?.TIPO === "conselho" && podeEditar)}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Parecer Conselho Final
                </label>
                <select
                  value={inputConselhoFinal}
                  onChange={(e) => setInputConselhoFinal(e.target.value)}
                  disabled={!(funcionarioTipo?.TIPO === "conselho" && podeEditar)}
                  className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
                >
                  <option value=""></option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Reprovado">Reprovado</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                Close
              </button>
              <button
                onClick={salvarParecer}
                disabled={!podeEditar || loading}
                className="rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-gray-50 p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function CampoInput({
  label,
  value,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full rounded border px-3 py-2 read-only:bg-gray-50"
      />
    </div>
  );
}

function CampoTextarea({
  label,
  value,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        rows={3}
        className="w-full rounded border px-3 py-2 read-only:bg-gray-50"
      />
    </div>
  );
}