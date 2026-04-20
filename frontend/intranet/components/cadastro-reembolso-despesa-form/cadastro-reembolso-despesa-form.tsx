"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaEdit, FaPlus, FaSave, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import {
  baixarComprovanteReembolso,
  buscarSolicitacaoReembolsoPorId,
  cadastrarSolicitacaoReembolso,
  carregarCidadesReembolso,
  carregarTiposDespesaReembolso,
  editarSolicitacaoReembolso,
  enviarEmailInformativoFinanceiroReembolso,
  type SolicitacaoReembolsoPayload,
  type SolicitacaoReembolsoResponse,
} from "@/services/cadastro_reembolso_despesa.service";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
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

export function CadastroReembolsoDespesaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [tipoDespesa, setTipoDespesa] = useState("");
  const [descricaoDespesa, setDescricaoDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");
  const [multiplicador, setMultiplicador] = useState("");
  const [comprovanteNome, setComprovanteNome] = useState("Nenhum arquivo selecionado");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePath, setComprovantePath] = useState<string | null>(null);

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
      }
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

      const response = await buscarFuncionarioPorCpf(cpf);

      if (!response?.found) {
        alert("CPF não encontrado.");
        setNome("");
        return;
      }

      setCpf(response.cpf || onlyDigits(cpf));
      setNome(response.nome || "");
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
    limparModal();
    setModalOpen(true);
  };

  const fecharModal = () => {
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
    if (!validarDespesa()) return;

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

    fecharModal();
  };

  const editarDespesa = (index: number) => {
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
        COMPROVANTE: comprovanteDataUrl,
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
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const payload = await montarPayload();

      if (modoTela === "edicao" && requestId) {
        const response = await editarSolicitacaoReembolso(payload);

        await enviarEmailInformativoFinanceiroReembolso(
          payload.NM_FUNCIONARIO,
          response.ID_SOLICITACAO_REEMBOLSO_DESPESA
        );

        alert("Solicitação atualizada com sucesso.");
      } else {
        const response = await cadastrarSolicitacaoReembolso(payload);

        await enviarEmailInformativoFinanceiroReembolso(
          payload.NM_FUNCIONARIO,
          response.ID_SOLICITACAO_REEMBOLSO_DESPESA
        );

        alert("Solicitação cadastrada com sucesso.");
      }

      router.push("/auth/gerenciamento_reembolso_despesa");
    } catch (error) {
      console.error(error);
      alert("Falha ao salvar a solicitação.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="text-sm text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SearchForm onSearch={onBuscarCpf}>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                CPF do funcionário
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <SearchInput
                  value={formatCpfView(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="CPF"
                  className="w-full rounded border px-3 py-2"
                  inputMode="numeric"
                  maxLength={14}
                />

                <SearchButton loading={loading} label="Pesquisar" />
              </div>
            </div>
          </SearchForm>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded border bg-gray-50 px-3 py-2"
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ida</label>
            <input
              type="date"
              value={ida}
              onChange={(e) => setIda(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Volta</label>
            <input
              type="date"
              value={volta}
              onChange={(e) => setVolta(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Número Banco</label>
            <input
              value={numeroBanco}
              onChange={(e) => setNumeroBanco(e.target.value)}
              className="w-full rounded border bg-gray-50 px-3 py-2"
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Agência</label>
            <input
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              className="w-full rounded border bg-gray-50 px-3 py-2"
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Número Conta</label>
            <input
              value={numeroConta}
              onChange={(e) => setNumeroConta(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Cidade</label>
            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {cidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Justificativa</label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="w-full rounded border px-3 py-2"
              rows={4}
              maxLength={400}
              placeholder="Descreva a justificativa do reembolso"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Despesas adicionadas</h2>

            <button
              type="button"
              onClick={abrirModalNovaDespesa}
              className="inline-flex items-center gap-2 rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
            >
              <FaPlus size={12} />
              Adicionar Despesa
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-lg border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Tipo
                  </th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Descrição
                  </th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Valor
                  </th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Arquivo
                  </th>
                  <th className="border-b px-3 py-2 text-center text-xs font-semibold text-gray-600">
                    Editar
                  </th>
                  <th className="border-b px-3 py-2 text-center text-xs font-semibold text-gray-600">
                    Excluir
                  </th>
                </tr>
              </thead>

              <tbody>
                {despesas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                      Nenhuma despesa adicionada.
                    </td>
                  </tr>
                ) : (
                  despesas.map((item, index) => (
                    <tr key={`${item.tipo}-${index}`} className="hover:bg-gray-50">
                      <td className="border-b px-3 py-2 text-sm text-gray-700">{item.tipo}</td>
                      <td className="whitespace-pre-line border-b px-3 py-2 text-sm text-gray-700">
                        {item.descricao}
                      </td>
                      <td className="border-b px-3 py-2 text-sm text-gray-700">{item.valor}</td>
                      <td className="border-b px-3 py-2 text-sm text-gray-700">
                        <button
                          type="button"
                          onClick={() => baixarComprovante(item)}
                          className="text-left text-primary hover:underline"
                        >
                          {item.comprovanteNome}
                        </button>
                      </td>
                      <td className="border-b px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => editarDespesa(index)}
                          className="inline-flex items-center justify-center rounded bg-sky-500 p-2 text-white hover:opacity-90"
                        >
                          <FaEdit size={12} />
                        </button>
                      </td>
                      <td className="border-b px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removerDespesa(index)}
                          className="inline-flex items-center justify-center rounded bg-red-500 p-2 text-white hover:opacity-90"
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

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Total de Despesas
              </label>
              <input
                readOnly
                value={fmtBRL(totalDespesas)}
                className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end border-t pt-5">
          <button
            onClick={enviarSolicitacao}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FaSave size={12} />
            {saving
              ? "Salvando..."
              : modoTela === "edicao"
                ? "Atualizar Solicitação"
                : "Enviar Solicitação"}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Despesa</h3>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded p-2 text-gray-500 hover:bg-gray-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
                <select
                  value={tipoDespesa}
                  onChange={(e) => setTipoDespesa(e.target.value)}
                  className="w-full rounded border px-3 py-2"
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
                <label className="mb-1 block text-xs font-medium text-gray-600">Descrição</label>
                <textarea
                  value={descricaoDespesa}
                  onChange={(e) => setDescricaoDespesa(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Valor</label>
                  <input
                    value={valorDespesa}
                    onChange={(e) => setValorDespesa(monetizarDigitacao(e.target.value))}
                    className={`w-full rounded border px-3 py-2 ${isKms ? "bg-gray-50" : ""}`}
                    readOnly={isKms}
                    placeholder="R$ 0,00"
                  />
                </div>

                {isKms && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Total KMs (x 0,77)
                    </label>
                    <input
                      value={multiplicador}
                      onChange={(e) => setMultiplicador(e.target.value)}
                      onBlur={calcularKms}
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Adicione somente 1 comprovante por despesa.
                </p>

                {isKms && (
                  <p className="mb-3 text-xs text-amber-700">
                    Para reembolso por distância percorrida, anexe uma captura do Google Maps mostrando a rota entre origem e destino, com o total em quilômetros visível.
                  </p>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary">
                    Selecionar comprovante
                    <input
                      type="file"
                      accept="application/pdf,.pdf,image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setComprovanteFile(file);
                        setComprovanteNome(file?.name || "Nenhum arquivo selecionado");
                        setComprovantePath(null);
                      }}
                    />
                  </label>

                  <span className="text-sm text-gray-600">{comprovanteNome}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-5 py-4">
              <button
                type="button"
                onClick={fecharModal}
                className="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FaTimes size={12} />
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarDespesa}
                className="inline-flex items-center gap-2 rounded bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
              >
                <FaSave size={12} />
                Salvar Despesa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}