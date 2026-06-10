"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHistory,
  FaInfoCircle,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTable,
  FaTrash,
  FaUndoAlt,
} from "react-icons/fa";

import {
  buscarFavorecidoPorCpf,
  gerarCnab240PorTransferencias,
  importarRetorno,
  listarRemessas,
  type RemessaCnab,
  type TransferenciaCnabPayload,
} from "@/services/cnab240.service";

type LinhaTransferencia = TransferenciaCnabPayload & {
  id: string;
};

export function Cnab240Form() {
  const [arquivoRetorno, setArquivoRetorno] = useState<File | null>(null);

  const [remessas, setRemessas] = useState<RemessaCnab[]>([]);
  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [conciliando, setConciliando] = useState(false);
  const [carregandoCpf, setCarregandoCpf] = useState(false);

  const [cpf, setCpf] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<1 | 2>(2);
  const [descricao, setDescricao] = useState("");

  const [linhas, setLinhas] = useState<LinhaTransferencia[]>([]);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">(
    "success"
  );

  const remessasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return remessas;

    return remessas.filter((item) => {
      return (
        String(item.NM_ARQUIVO || "").toLowerCase().includes(termo) ||
        String(item.STATUS || "").toLowerCase().includes(termo)
      );
    });
  }, [busca, remessas]);

  const totalRemessas = remessas.length;

  const totalPagamentos = useMemo(() => {
    return remessas.reduce(
      (acc, item) => acc + Number(item.QT_PAGAMENTOS || 0),
      0
    );
  }, [remessas]);

  const valorTotalLinhas = useMemo(() => {
    return linhas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }, [linhas]);

  const totalRetornosImportados = useMemo(() => {
    return remessas.filter((item) =>
      String(item.STATUS || "").toUpperCase().includes("CONCILI")
    ).length;
  }, [remessas]);

  function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  function onlyDigits(value: string) {
    return value.replace(/\D/g, "");
  }

  function parseValor(value: string) {
    const cleaned = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value: number | string | null | undefined) {
    const numero = Number(value || 0);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatCpf(value: string) {
    const digits = onlyDigits(value).slice(0, 11);

    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  async function carregarRemessas() {
    try {
      setLoading(true);

      const data = await listarRemessas();
      setRemessas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      mostrarMensagem(
        "Não foi possível carregar o histórico de remessas.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRemessas();
  }, []);

  function handleRetornoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setArquivoRetorno(file);
    setMensagem("");
  }

  async function adicionarTransferencia() {
    const cpfLimpo = onlyDigits(cpf);
    const valorNumerico = parseValor(valor);

    if (!cpfLimpo) {
      mostrarMensagem("Informe o CPF do favorecido.", "error");
      return;
    }

    if (!valorNumerico || valorNumerico <= 0) {
      mostrarMensagem("Informe um valor válido para pagamento.", "error");
      return;
    }

    try {
      setCarregandoCpf(true);
      setMensagem("");

      const favorecido = await buscarFavorecidoPorCpf(cpfLimpo);

      const novaLinha: LinhaTransferencia = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,

        sequencia: linhas.length + 1,
        cpfCnpj: onlyDigits(favorecido.CPF || cpfLimpo),
        banco: String(favorecido.BANCO || ""),
        agencia: String(favorecido.AGENCIA || ""),
        conta: String(favorecido.CONTA || ""),
        dvConta: String(favorecido.DV_CONTA || ""),
        nome: String(favorecido.NOME || ""),
        valor: valorNumerico,
        tipo,
        descricao,
      };

      setLinhas((old) => [...old, novaLinha]);

      setCpf("");
      setValor("");
      setDescricao("");

      mostrarMensagem("Pagamento adicionado à remessa.", "success");
    } catch (error: any) {
      console.error(error);
      mostrarMensagem(
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Favorecido não encontrado para o CPF informado.",
        "error"
      );
    } finally {
      setCarregandoCpf(false);
    }
  }

  function removerTransferencia(id: string) {
    setLinhas((old) =>
      old
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          sequencia: index + 1,
        }))
    );
  }

  async function onGerarCnab240() {
    if (linhas.length === 0) {
      mostrarMensagem("Adicione pelo menos um pagamento antes de gerar o CNAB240.", "error");
      return;
    }

    try {
      setGerando(true);
      setMensagem("");

      const payload = linhas.map(({ id, ...rest }) => rest);

      const blob = await gerarCnab240PorTransferencias(payload);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `CNAB240_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[-:T]/g, "")}.txt`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      mostrarMensagem("Arquivo CNAB240 gerado com sucesso.", "success");
      setLinhas([]);
      await carregarRemessas();
    } catch (error: any) {
      console.error(error);
      mostrarMensagem(
        error?.response?.data?.details ||
          error?.response?.data?.error ||
          error?.message ||
          "Erro ao gerar o arquivo CNAB240.",
        "error"
      );
    } finally {
      setGerando(false);
    }
  }

  async function onConciliarRetorno() {
    if (!arquivoRetorno) {
      mostrarMensagem(
        "Selecione o extrato ou arquivo de retorno antes de conciliar.",
        "error"
      );
      return;
    }

    try {
      setConciliando(true);
      setMensagem("");

      await importarRetorno(arquivoRetorno);

      mostrarMensagem("Arquivo importado para conciliação com sucesso.", "success");
      await carregarRemessas();
    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao importar o arquivo para conciliação.", "error");
    } finally {
      setConciliando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="min-w-225 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-[#00AE9D]/8 via-white to-[#C7D300]/10 px-6 py-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <CardResumo
              titulo="Remessas geradas"
              valor={String(totalRemessas)}
              icone={<FaFileInvoiceDollar />}
              cor="text-[#00AE9D]"
            />

            <CardResumo
              titulo="Pagamentos"
              valor={String(totalPagamentos)}
              icone={<FaCheckCircle />}
              cor="text-emerald-700"
            />

            <CardResumo
              titulo="Devolvidos"
              valor="0"
              icone={<FaExclamationTriangle />}
              cor="text-red-600"
            />

            <CardResumo
              titulo="Retornos importados"
              valor={String(totalRetornosImportados)}
              icone={<FaHistory />}
              cor="text-blue-700"
            />
          </div>
        </div>

        <div className="px-6 py-6">
          {mensagem && (
            <div
              className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${
                tipoMensagem === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {mensagem}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FaFileInvoiceDollar className="text-primary" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Transferências da remessa
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      CPF
                    </label>
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Valor
                    </label>
                    <input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Tipo
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(Number(e.target.value) as 1 | 2)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value={1}>Crédito bancário</option>
                      <option value={2}>TED</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Descrição
                    </label>
                    <input
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descrição do pagamento"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={adicionarTransferencia}
                    disabled={carregandoCpf}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaPlus />
                    {carregandoCpf ? "Buscando CPF..." : "Adicionar pagamento"}
                  </button>

                  <button
                    type="button"
                    onClick={onGerarCnab240}
                    disabled={linhas.length === 0 || gerando}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaDownload />
                    {gerando ? "Gerando..." : "Gerar CNAB240"}
                  </button>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Seq
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          CPF
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Nome
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Banco
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Agência
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Conta
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Valor
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {linhas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-10 text-center text-sm text-gray-500"
                          >
                            Nenhum pagamento adicionado até o momento.
                          </td>
                        </tr>
                      ) : (
                        linhas.map((item) => (
                          <tr key={item.id} className="bg-white">
                            <td className="rounded-l-2xl px-4 py-4 text-sm text-gray-700">
                              {item.sequencia}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              {item.cpfCnpj}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                              {item.nome}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              {item.banco}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              {item.agencia}
                            </td>

                            <td className="px-4 py-4 text-sm text-gray-700">
                              {item.conta}-{item.dvConta}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                              {formatMoney(item.valor)}
                            </td>

                            <td className="rounded-r-2xl px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removerTransferencia(item.id)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FaSyncAlt className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Importação do extrato/retorno bancário
                  </h3>
                </div>

                <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition hover:bg-gray-50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <FaCloudUploadAlt size={22} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-800">
                    {arquivoRetorno
                      ? arquivoRetorno.name
                      : "Selecionar extrato ou retorno"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Arquivo utilizado para conferência dos pagamentos
                  </p>

                  <input
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleRetornoChange}
                  />
                </label>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onConciliarRetorno}
                    disabled={!arquivoRetorno || conciliando}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaSyncAlt />
                    {conciliando ? "Conciliando..." : "Conciliar arquivo"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 p-5">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="mt-0.5 shrink-0 text-secondary" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Fluxo da tela
                    </p>
                    <p className="mt-1 text-xs leading-6 text-gray-600">
                      O usuário informa CPF, valor, tipo e descrição. O sistema
                      busca os dados bancários do favorecido, monta a lista de
                      pagamentos e gera o TXT CNAB240.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  Resumo da próxima remessa
                </h4>

                <div className="mt-4 space-y-3">
                  <LinhaResumo
                    label="Quantidade de pagamentos"
                    value={String(linhas.length)}
                  />
                  <LinhaResumo
                    label="Valor total"
                    value={formatMoney(valorTotalLinhas)}
                  />
                  <LinhaResumo label="Registros com erro" value="0" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  Ações futuras
                </h4>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FaTable />
                    Exportar relatório
                  </button>

                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FaUndoAlt />
                    Regerar devolvidos
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* histórico */}
      <div className="min-w-225 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Histórico de remessas e retornos
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Consulte os arquivos gerados, retornos importados e status da conciliação.
              </p>
            </div>

            <div className="relative w-full lg:w-96">
              <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por arquivo ou status..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Arquivo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Data geração
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pagamentos
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Valor total
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      Carregando histórico...
                    </td>
                  </tr>
                ) : remessasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      Nenhuma remessa gerada até o momento.
                    </td>
                  </tr>
                ) : (
                  remessasFiltradas.map((item: any) => (
                    <tr key={item.ID_REMESSA} className="bg-gray-50">
                      <td className="rounded-l-2xl px-4 py-4 text-sm font-semibold text-gray-800">
                        {item.NM_ARQUIVO}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.DT_GERACAO || "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.QT_PAGAMENTOS || 0}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatMoney(item.VL_TOTAL)}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {item.STATUS || "Gerado"}
                        </span>
                      </td>

                      <td className="rounded-r-2xl px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Ver detalhes
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
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
  icone,
  cor,
}: {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  cor: string;
}) {
  return (
    <div className="rounded-2xl bg-white/90 px-4 py-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{valor}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 ${cor}`}
        >
          {icone}
        </div>
      </div>
    </div>
  );
}

function LinhaResumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">
        {value}
      </span>
    </div>
  );
}