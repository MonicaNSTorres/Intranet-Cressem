"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { formatCpfView, monetizarDigitacao, onlyDigits } from "@/utils/br";
import {
  buscarAssociadoAnaliticoTermoGarantia,
  listarCidadesTermoGarantia,
  type CidadeOption,
} from "@/services/termo_garantia.service";
import { gerarPdfTermoGarantia } from "@/lib/pdf/gerarPdfTermoGarantia";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";


type GarantiaEscolha = "" | "sim" | "nao";
type EstadoCivil =
  | ""
  | "CASADO"
  | "DIVORCIADO"
  | "SEPARADO"
  | "SOLTEIRO"
  | "UNIÃO ESTÁVEL"
  | "VIÚVO";
type TipoDocumento = "" | "RG" | "CNH" | "PPD" | "PASSAPORTE";

function validarCPF(cpf: string) {
  const clean = String(cpf || "").replace(/\D/g, "");

  if (
    !clean ||
    clean.length !== 11 ||
    clean === "00000000000" ||
    clean === "11111111111" ||
    clean === "22222222222" ||
    clean === "33333333333" ||
    clean === "44444444444" ||
    clean === "55555555555" ||
    clean === "66666666666" ||
    clean === "77777777777" ||
    clean === "88888888888" ||
    clean === "99999999999"
  ) {
    return false;
  }

  let soma = 0;
  let resto = 0;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.substring(9, 10), 10)) return false;

  soma = 0;

  for (let i = 1; i <= 10; i++) {
    soma += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

function capitalizeWords(str: string) {
  return String(str || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatarDataBR(data: Date) {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatarDataBRDoInput(valor: string) {
  if (!valor) return "";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function TermoGarantiaForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [nomeReadOnly, setNomeReadOnly] = useState(true);

  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("");
  const [numeroDocumento, setNumeroDocumento] = useState("");

  const [numeroContrato, setNumeroContrato] = useState("");
  const [dataContrato, setDataContrato] = useState("");
  const [valorContrato, setValorContrato] = useState("");

  const [cidadeAtendimento, setCidadeAtendimento] = useState("");

  const [avalista, setAvalista] = useState<GarantiaEscolha>("");
  const [prestamistaSicoob, setPrestamistaSicoob] =
    useState<GarantiaEscolha>("");
  const [prestamistaTerceiros, setPrestamistaTerceiros] =
    useState<GarantiaEscolha>("");
  const [garantiaReal, setGarantiaReal] = useState<GarantiaEscolha>("");

  const [cidades, setCidades] = useState<CidadeOption[]>([]);

  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function carregarCidades() {
      try {
        setLoadingCidades(true);
        const response = await listarCidadesTermoGarantia();
        setCidades(response || []);
      } catch (e: any) {
        setErro(e?.message || "Erro ao carregar cidades.");
      } finally {
        setLoadingCidades(false);
      }
    }

    carregarCidades();
  }, []);

  const dataHojeBR = useMemo(() => formatarDataBR(new Date()), []);

  function resetResultado() {
    setInfo("");
  }

  async function handleBuscarAssociado() {
    setErro("");
    setInfo("");
    resetResultado();

    const cpfLimpo = onlyDigits(cpf);

    if (!cpfLimpo) {
      setErro("CPF não preenchido.");
      return;
    }

    if (!validarCPF(cpfLimpo)) {
      setErro("Informe um CPF válido.");
      return;
    }

    try {
      setLoadingBuscar(true);

      const associado = await buscarAssociadoAnaliticoTermoGarantia(cpfLimpo);

      if (associado?.NM_CLIENTE) {
        setNome(capitalizeWords(associado.NM_CLIENTE));
        setNomeReadOnly(true);
        setInfo("Associado encontrado com sucesso.");
      } else {
        setNome("");
        setNomeReadOnly(false);
        setInfo("CPF não encontrado. Preencha o nome manualmente.");
      }
    } catch {
      setNome("");
      setNomeReadOnly(false);
      setInfo("CPF não encontrado. Preencha o nome manualmente.");
    } finally {
      setLoadingBuscar(false);
    }
  }

  function validarCampos() {
    if (!cpf.trim()) return "CPF não preenchido.";
    if (!validarCPF(cpf)) return "Informe um CPF válido.";
    if (!nome.trim()) return "Nome não preenchido.";
    if (!estadoCivil) return "Estado civil não selecionado.";
    if (!tipoDocumento) return "Tipo de documento não selecionado.";
    if (!numeroDocumento.trim()) return "Número do documento não preenchido.";
    if (!numeroContrato.trim()) return "Número do contrato não preenchido.";
    if (!dataContrato) return "Data do contrato não preenchida.";
    if (!valorContrato.trim()) return "Valor do contrato não preenchido.";
    if (!cidadeAtendimento.trim()) return "Cidade não preenchida.";

    if (!avalista) return "Preencha todas as garantias com SIM ou NÃO.";
    if (!prestamistaSicoob) return "Preencha todas as garantias com SIM ou NÃO.";
    if (!prestamistaTerceiros)
      return "Preencha todas as garantias com SIM ou NÃO.";
    if (!garantiaReal) return "Preencha todas as garantias com SIM ou NÃO.";

    return "";
  }

  async function handleGerarPdf() {
    setErro("");
    setInfo("");

    const mensagem = validarCampos();

    if (mensagem) {
      setErro(mensagem);
      return;
    }

    await gerarPdfTermoGarantia({
      nome: capitalizeWords(nome),
      cpf: formatCpfView(cpf),
      estadoCivil: capitalizeWords(estadoCivil),
      tipoDocumento,
      numeroDocumento,
      numeroContrato,
      dataContrato: formatarDataBRDoInput(dataContrato),
      valorContrato,
      cidadeAtendimento: capitalizeWords(cidadeAtendimento),
      dataHoje: dataHojeBR,
      avalista: avalista as "sim" | "nao",
      prestamistaSicoob: prestamistaSicoob as "sim" | "nao",
      prestamistaTerceiros: prestamistaTerceiros as "sim" | "nao",
      garantiaReal: garantiaReal as "sim" | "nao",
    });
  }

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <SearchForm onSearch={handleBuscarAssociado}>
        {(erro || info) && (
          <div className="mb-6">
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF do associado
            </label>
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => {
                setCpf(e.target.value);
                resetResultado();
              }}
              placeholder="000.000.000-00"
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              inputMode="numeric"
              maxLength={14}
            />
          </div>

          <div className="flex items-end">
            <SearchButton loading={loadingBuscar} label="Pesquisar" />
          </div>
        </div>
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-8">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome
          </label>
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              resetResultado();
            }}
            readOnly={nomeReadOnly}
            className="w-full rounded border px-3 py-2 read-only:bg-gray-50"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Estado civil
          </label>
          <select
            value={estadoCivil}
            onChange={(e) => {
              setEstadoCivil(e.target.value as EstadoCivil);
              resetResultado();
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value=""></option>
            <option value="CASADO">CASADO</option>
            <option value="DIVORCIADO">DIVORCIADO</option>
            <option value="SEPARADO">SEPARADO</option>
            <option value="SOLTEIRO">SOLTEIRO</option>
            <option value="UNIÃO ESTÁVEL">UNIÃO ESTÁVEL</option>
            <option value="VIÚVO">VIÚVO</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Documento
          </label>
          <select
            value={tipoDocumento}
            onChange={(e) => {
              setTipoDocumento(e.target.value as TipoDocumento);
              resetResultado();
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value=""></option>
            <option value="RG">RG</option>
            <option value="CNH">CNH</option>
            <option value="PPD">PPD</option>
            <option value="PASSAPORTE">PASSAPORTE</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Número
          </label>
          <input
            value={numeroDocumento}
            onChange={(e) => {
              setNumeroDocumento(e.target.value);
              resetResultado();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Contrato nº
          </label>
          <input
            value={numeroContrato}
            onChange={(e) => {
              setNumeroContrato(e.target.value);
              resetResultado();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Data
          </label>
          <input
            type="date"
            value={dataContrato}
            onChange={(e) => {
              setDataContrato(e.target.value);
              resetResultado();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Valor
          </label>
          <input
            value={valorContrato}
            onChange={(e) => {
              setValorContrato(monetizarDigitacao(e.target.value));
              resetResultado();
            }}
            placeholder="R$ 0,00"
            className="w-full rounded border px-3 py-2 text-right"
          />
        </div>

        <div className="md:col-span-8">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cidade do atendimento
          </label>
          <select
            value={cidadeAtendimento}
            onChange={(e) => {
              setCidadeAtendimento(e.target.value);
              resetResultado();
            }}
            disabled={loadingCidades}
            className="w-full rounded border px-3 py-2 disabled:bg-gray-50"
          >
            <option value=""></option>
            {cidades.map((cidade) => (
              <option key={cidade.ID_CIDADES} value={cidade.NM_CIDADE}>
                {cidade.NM_CIDADE}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-3 text-left text-sm font-semibold text-gray-700">
                GARANTIAS
              </th>
              <th className="border px-4 py-3 text-center text-sm font-semibold text-gray-700">
                SIM
              </th>
              <th className="border px-4 py-3 text-center text-sm font-semibold text-gray-700">
                NÃO
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="border px-4 py-3 text-sm text-gray-700">
                Avalista?
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="avalista"
                  checked={avalista === "sim"}
                  onChange={() => {
                    setAvalista("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="avalista"
                  checked={avalista === "nao"}
                  onChange={() => {
                    setAvalista("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border px-4 py-3 text-sm text-gray-700">
                Seguro Prestamista no Sicoob Cressem?
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_sicoob"
                  checked={prestamistaSicoob === "sim"}
                  onChange={() => {
                    setPrestamistaSicoob("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_sicoob"
                  checked={prestamistaSicoob === "nao"}
                  onChange={() => {
                    setPrestamistaSicoob("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border px-4 py-3 text-sm text-gray-700">
                Seguro Prestamista de Terceiros?
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_terceiros"
                  checked={prestamistaTerceiros === "sim"}
                  onChange={() => {
                    setPrestamistaTerceiros("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_terceiros"
                  checked={prestamistaTerceiros === "nao"}
                  onChange={() => {
                    setPrestamistaTerceiros("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border px-4 py-3 text-sm text-gray-700">
                Garantia Real?
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="garantia_real"
                  checked={garantiaReal === "sim"}
                  onChange={() => {
                    setGarantiaReal("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border px-4 py-3 text-center">
                <input
                  type="radio"
                  name="garantia_real"
                  checked={garantiaReal === "nao"}
                  onChange={() => {
                    setGarantiaReal("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded border bg-gray-50 p-4 text-justify text-sm leading-7 text-gray-800">
        <p>
          Eu, <strong>{capitalizeWords(nome) || "NOMEASSOCIADO"}</strong>,{" "}
          <strong>{capitalizeWords(estadoCivil) || "RELACIONAMENTO"}</strong>,
          portador do <strong>{tipoDocumento || "DOCUMENTO"}</strong>:{" "}
          <strong>{numeroDocumento || "NUMERODOCUMENTO"}</strong>, inscrito no
          CPF: <strong>{formatCpfView(cpf) || "NUMCPF"}</strong>, DECLARO para
          os devidos fins ter feito opção da garantia, acima assinalada,
          referente ao Contrato nº{" "}
          <strong>{numeroContrato || "NUMEROCONTRATO"}</strong> de{" "}
          <strong>{formatarDataBRDoInput(dataContrato) || "DATACONTRATO"}</strong>,
          no valor total de <strong>{valorContrato || "VALORCONTRATO"}</strong>.
          Declaro ainda estar ciente de que poderei, a qualquer tempo, mudar a
          garantia para qualquer outra opção acima descrita.
        </p>
      </div>

      <div className="mt-10 text-center text-gray-800">
        <p className="text-base">
          <strong>{capitalizeWords(cidadeAtendimento) || "CIDADE"}</strong>,{" "}
          <strong>{dataHojeBR || "DATADEHOJE"}</strong>
        </p>
      </div>

      <div className="mt-16 text-center text-gray-800">
        <p className="mx-auto w-full max-w-md border-t border-slate-500 pt-3">
          {capitalizeWords(nome) || "NOMEASSOCIADOASSINATURA"}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end border-t pt-5">
        <button
          type="button"
          onClick={handleGerarPdf}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary"
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}