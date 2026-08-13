"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { FaFileAlt, FaSearch, FaTrash } from "react-icons/fa";
import { formatCpfCnpjView, onlyCpfCnpjChars } from "@/utils/br";
import {
  buscarMigracaoContratoAssociadoPorCpf,
  type BuscarMigracaoContratoAssociadoResponse,
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

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

const BUTTON_PRIMARY_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_REMOVE_CLASS =
  "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-fourth/30 bg-fourth/10 text-fourth shadow-sm transition hover:bg-fourth hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

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
  data: Extract<BuscarMigracaoContratoAssociadoResponse, { found: true }>
): LinhaMigracao {
  return {
    id: generateId(),
    nascimento: data.DT_NASCIMENTO || "",
    cargo: data.NM_CARGO || "",
    salario:
      typeof data.VL_RENDA_BRUTA === "number"
        ? data.VL_RENDA_BRUTA.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
          })
        : "",
    admissao: data.DT_ADMISSAO || "",
    cpf: data.NR_CPF_CNPJ || "",
    situacao: data.DESC_SITUACAO || "ATIVO",
    matricula: data.NR_MATRICULA || "",
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
    () =>
      linhas.map((linha) =>
        String(linha.cpf || "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase()
      ),
    [linhas]
  );

  const onBuscar = async () => {
    setErro("");
    setInfo("");

    const cpfLimpo = onlyCpfCnpjChars(cpfBusca);
    const documento = cpfLimpo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    console.log("documento enviado:", documento);

    if (!documento) {
      setErro("Informe o CPF do associado(a).");
      return;
    }

    if (![11, 14].includes(documento.length)) {
      setErro("Informe um CPF/CNPJ válido com 11 ou 14 caracteres.");
      return;
    }

    if (cpfsAdicionados.includes(documento)) {
      setErro("Esse CPF já foi adicionado na lista.");
      return;
    }

    try {
      setLoadingBusca(true);

      const result = await buscarMigracaoContratoAssociadoPorCpf(documento);

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
                  ? formatCpfCnpjView(value)
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

      const cpf = onlyCpfCnpjChars(linha.cpf);
      if (![11, 14].includes(cpf.length)) {
        setErro(`CPF/CNPJ inválido na linha ${numeroLinha}.`);
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

  const formularioValido = useMemo(() => {
    if (!linhas.length) return false;

    return linhas.every((linha) => {
      const cpfValido = [11, 14].includes(onlyCpfCnpjChars(linha.cpf).length);
      const salarioValido = parseCurrencyToNumber(linha.salario) !== null;

      return (
        linha.nascimento.trim() !== "" &&
        linha.cargo.trim() !== "" &&
        linha.salario.trim() !== "" &&
        salarioValido &&
        linha.admissao.trim() !== "" &&
        cpfValido &&
        linha.situacao.trim() !== "" &&
        linha.matricula.trim() !== ""
      );
    });
  }, [linhas]);

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
        NR_CPF_CNPJ: onlyCpfCnpjChars(linha.cpf),
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
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#79B729]" />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              Buscar associado
            </h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Informe o CPF/CNPJ para carregar os dados e adicionar o associado à migração.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onBuscar();
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                CPF do associado(a)
              </label>
              <input
                value={formatCpfCnpjView(cpfBusca)}
                onChange={(event) =>
                  setCpfBusca(onlyCpfCnpjChars(event.target.value).slice(0, 14))
                }
                placeholder="CPF/CNPJ"
                maxLength={18}
                className={INPUT_CLASS}
              />
            </div>

            <button
              type="submit"
              disabled={loadingBusca}
              className={`${BUTTON_PRIMARY_CLASS} w-full md:w-auto`}
            >
              <FaSearch size={13} />
              {loadingBusca ? "Pesquisando..." : "Pesquisar"}
            </button>
          </form>

          {(erro || info) && (
            <div className="mt-4">
              {erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erro}
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-[#006f65]">
                  {info}
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                Associados adicionados
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Revise os dados antes de gerar o arquivo de migração.
              </p>
            </div>

            <span className="text-xs font-semibold text-slate-500">
              {linhas.length} associado(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Nascimento
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Cargo
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Salário
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Admissão
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    CPF
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Situação
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Nova Matrícula
                  </th>
                  <th className="w-[90px] border-b border-slate-200 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {linhas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Nenhum associado adicionado ainda.
                    </td>
                  </tr>
                ) : (
                  linhas.map((linha) => (
                    <tr key={linha.id} className="transition hover:bg-slate-50/70">
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          type="date"
                          value={linha.nascimento}
                          onChange={(event) =>
                            updateLinha(linha.id, "nascimento", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          value={linha.cargo}
                          onChange={(event) =>
                            updateLinha(linha.id, "cargo", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          value={linha.salario}
                          onChange={(event) =>
                            updateLinha(linha.id, "salario", event.target.value)
                          }
                          className={`${INPUT_CLASS} text-right`}
                          placeholder="R$ 0,00"
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          type="date"
                          value={linha.admissao}
                          onChange={(event) =>
                            updateLinha(linha.id, "admissao", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          value={formatCpfCnpjView(linha.cpf)}
                          onChange={(event) =>
                            updateLinha(linha.id, "cpf", event.target.value)
                          }
                          className={INPUT_CLASS}
                          maxLength={14}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          value={linha.situacao}
                          onChange={(event) =>
                            updateLinha(linha.id, "situacao", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <input
                          value={linha.matricula}
                          onChange={(event) =>
                            updateLinha(linha.id, "matricula", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removerLinha(linha.id)}
                          className={BUTTON_REMOVE_CLASS}
                          title="Remover associado"
                          aria-label="Remover associado"
                        >
                          <FaTrash size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={gerar}
            disabled={!formularioValido || loadingGerar}
            className={BUTTON_PRIMARY_CLASS}
          >
            <FaFileAlt size={14} />
            {loadingGerar ? "Gerando..." : "Gerar arquivo"}
          </button>
        </div>
      </div>
    </div>
  );
}
