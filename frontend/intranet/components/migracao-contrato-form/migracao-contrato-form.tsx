"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import { formatCpfView, onlyDigits } from "@/utils/br";
import {
  buscarMigracaoContratoPorCpf,
  type BuscarMigracaoContratoResponse,
  type MigracaoContratoLinhaPayload,
} from "@/services/migracao_contrato.service";
import { gerarArquivoMigracaoContratoTxt } from "@/lib/txt/gerarArquivoMigracaoContrato";

type LinhaMigracao = {
  id: string;
  nascimento: string;
  cargo: string;
  salario: string;
  admissao: string;
  cpf: string;
  situacao: string;
  matricula: string;
};

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const number = Number(digits) / 100;

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseCurrencyToNumber(value: string) {
  if (!value) return null;

  const normalized = value
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapResponseToLinha(
  data: Extract<BuscarMigracaoContratoResponse, { found: true }>
): LinhaMigracao {
  return {
    id: generateId(),
    nascimento: data.nascimento || "",
    cargo: data.cargo || "",
    salario:
      typeof data.salario === "number"
        ? data.salario.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
          })
        : "",
    admissao: data.admissao || data.nascimento || "",
    cpf: data.cpf || "",
    situacao: data.situacao || "",
    matricula: data.matricula || "",
  };
}

export function MigracaoContratoForm() {
  const [cpfBusca, setCpfBusca] = useState("");
  const [linhas, setLinhas] = useState<LinhaMigracao[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const cpfsAdicionados = useMemo(
    () => linhas.map((linha) => onlyDigits(linha.cpf)),
    [linhas]
  );

  const onBuscar = async () => {
    setErro("");
    setInfo("");

    const cpfLimpo = onlyDigits(cpfBusca);

    if (!cpfLimpo) {
      setErro("Informe o CPF do associado(a).");
      return;
    }

    if (cpfLimpo.length !== 11) {
      setErro("Informe um CPF válido com 11 dígitos.");
      return;
    }

    if (cpfsAdicionados.includes(cpfLimpo)) {
      setErro("Esse CPF já foi adicionado na lista.");
      return;
    }

    try {
      setLoadingBusca(true);

      const result = await buscarMigracaoContratoPorCpf(cpfLimpo);

      if (!result.found) {
        setErro("Nenhum associado encontrado para esse CPF.");
        return;
      }

      const novaLinha = mapResponseToLinha(result);

      setLinhas((prev) => [...prev, novaLinha]);
      setCpfBusca("");
      setInfo("Associado adicionado com sucesso.");
    } catch (err: any) {
      setErro(err?.message || "Falha ao buscar associado.");
    } finally {
      setLoadingBusca(false);
    }
  };

  const removerLinha = (id: string) => {
    setLinhas((prev) => prev.filter((item) => item.id !== id));
    setErro("");
    setInfo("");
  };

  const updateLinha = (
    id: string,
    field: keyof Omit<LinhaMigracao, "id">,
    value: string
  ) => {
    setLinhas((prev) =>
      prev.map((linha) =>
        linha.id === id
          ? {
              ...linha,
              [field]:
                field === "cpf"
                  ? formatCpfView(value)
                  : field === "salario"
                  ? formatCurrencyInput(value)
                  : value,
            }
          : linha
      )
    );
  };

  const validarLinhas = () => {
    if (!linhas.length) {
      setErro("Nenhuma linha preenchida.");
      return false;
    }

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const numeroLinha = i + 1;

      const campos = [
        { nome: "Nascimento", valor: linha.nascimento },
        { nome: "Cargo", valor: linha.cargo },
        { nome: "Salário", valor: linha.salario },
        { nome: "Admissão", valor: linha.admissao },
        { nome: "CPF", valor: linha.cpf },
        { nome: "Situação", valor: linha.situacao },
        { nome: "Nova Matrícula", valor: linha.matricula },
      ];

      for (const campo of campos) {
        if (!String(campo.valor || "").trim()) {
          setErro(`Preencha o campo "${campo.nome}" na linha ${numeroLinha}.`);
          return false;
        }
      }

      const cpf = onlyDigits(linha.cpf);
      if (cpf.length !== 11) {
        setErro(`CPF inválido na linha ${numeroLinha}.`);
        return false;
      }

      const salario = parseCurrencyToNumber(linha.salario);
      if (salario === null) {
        setErro(`Salário inválido na linha ${numeroLinha}.`);
        return false;
      }
    }

    return true;
  };

  const gerar = async () => {
    setErro("");
    setInfo("");

    if (!validarLinhas()) return;

    try {
      setLoadingGerar(true);

      const payload: MigracaoContratoLinhaPayload[] = linhas.map((linha) => ({
        DT_NASCIMENTO: linha.nascimento,
        NM_CARGO: linha.cargo,
        VL_RENDA_BRUTA: parseCurrencyToNumber(linha.salario),
        DT_ADMISSAO: linha.admissao,
        NR_CPF_CNPJ: onlyDigits(linha.cpf),
        DESC_SITUACAO: linha.situacao,
        NR_MATRICULA: linha.matricula,
      }));

      await gerarArquivoMigracaoContratoTxt({
        linhas: payload,
      });

      setInfo("Arquivo gerado com sucesso.");
    } catch (err: any) {
      setErro(err?.message || "Falha ao gerar arquivo.");
    } finally {
      setLoadingGerar(false);
    }
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          CPF do associado(a)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={formatCpfView(cpfBusca)}
            onChange={(e) => setCpfBusca(e.target.value)}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />
          <button
            onClick={onBuscar}
            disabled={loadingBusca}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md inline-flex items-center justify-center gap-2"
          >
            <FaPlus size={12} />
            {loadingBusca ? "Buscando..." : "Adicionar migração"}
          </button>
        </div>

        {erro && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {erro}
          </div>
        )}

        {info && (
          <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
            {info}
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1000px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Nascimento
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Cargo
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Salário
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Admissão
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                CPF
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Situação
              </th>
              <th className="text-left text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b">
                Nova Matrícula
              </th>
              <th className="text-center text-xs font-semibold text-gray-600 px-3 py-3 bg-gray-50 border-b w-[80px]">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-sm text-gray-500 text-center border-b"
                >
                  Nenhum associado adicionado ainda.
                </td>
              </tr>
            ) : (
              linhas.map((linha) => (
                <tr key={linha.id}>
                  <td className="px-3 py-3 border-b">
                    <input
                      type="date"
                      value={linha.nascimento}
                      onChange={(e) =>
                        updateLinha(linha.id, "nascimento", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      value={linha.cargo}
                      onChange={(e) =>
                        updateLinha(linha.id, "cargo", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      value={linha.salario}
                      onChange={(e) =>
                        updateLinha(linha.id, "salario", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded text-right"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      type="date"
                      value={linha.admissao}
                      onChange={(e) =>
                        updateLinha(linha.id, "admissao", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      value={formatCpfView(linha.cpf)}
                      onChange={(e) =>
                        updateLinha(linha.id, "cpf", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                      maxLength={14}
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      value={linha.situacao}
                      onChange={(e) =>
                        updateLinha(linha.id, "situacao", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 border-b">
                    <input
                      value={linha.matricula}
                      onChange={(e) =>
                        updateLinha(linha.id, "matricula", e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 border-b text-center">
                    <button
                      onClick={() => removerLinha(linha.id)}
                      className="inline-flex items-center justify-center h-10 w-10 rounded bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                      title="Excluir"
                    >
                      <FaTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-5 border-t mt-6 flex items-center justify-end">
        <button
          onClick={gerar}
          disabled={loadingGerar}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
        >
          <FaFileAlt size={14} />
          {loadingGerar ? "Gerando..." : "Gerar arquivo"}
        </button>
      </div>
    </div>
  );
}