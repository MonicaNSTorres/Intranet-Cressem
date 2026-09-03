"use client";
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

function normalizarTextoComparacao(str: string) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
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

  function failWithScroll(message: string) {
    setInfo("");
    setErro(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return false;
  }

  useEffect(() => {
    async function carregarCidades() {
      try {
        setLoadingCidades(true);
        const response = await listarCidadesTermoGarantia();
        setCidades(response || []);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Erro ao carregar cidades.";
        failWithScroll(message);
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

  function resolverCidadeAtendimento(cidade?: string) {
    const cidadeNormalizada = normalizarTextoComparacao(cidade || "");

    if (!cidadeNormalizada) {
      return "";
    }

    return (
      cidades.find(
        (item) => normalizarTextoComparacao(item.NM_CIDADE) === cidadeNormalizada
      )?.NM_CIDADE || ""
    );
  }

  async function handleBuscarAssociado() {
    setErro("");
    setInfo("");
    resetResultado();
    setCidadeAtendimento("");

    const cpfLimpo = onlyDigits(cpf);

    if (!cpfLimpo) {
      failWithScroll("CPF não preenchido.");
      return;
    }

    if (!validarCPF(cpfLimpo)) {
      failWithScroll("Informe um CPF válido.");
      return;
    }

    try {
      setLoadingBuscar(true);

      const associado = await buscarAssociadoAnaliticoTermoGarantia(cpfLimpo);

      if (associado?.NM_CLIENTE) {
        setNome(capitalizeWords(associado.NM_CLIENTE));
        setNomeReadOnly(true);

        const cidadeEncontrada = resolverCidadeAtendimento(associado.NM_CIDADE);

        if (cidadeEncontrada) {
          setCidadeAtendimento(cidadeEncontrada);
        }

        setInfo(
          cidadeEncontrada
            ? "Associado encontrado com sucesso. Cidade preenchida automaticamente."
            : "Associado encontrado com sucesso. Selecione a cidade do atendimento."
        );
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

  const formularioValido = useMemo(() => {
    const cpfValido = validarCPF(cpf);

    if (!cpfValido) return false;

    if (!nome.trim()) return false;
    if (!estadoCivil) return false;
    if (!tipoDocumento) return false;
    if (!numeroDocumento.trim()) return false;

    if (!numeroContrato.trim()) return false;
    if (!dataContrato) return false;

    if (!valorContrato.trim()) return false;
    if (onlyDigits(valorContrato).length === 0) return false;

    if (!cidadeAtendimento.trim()) return false;

    if (!avalista) return false;
    if (!prestamistaSicoob) return false;
    if (!prestamistaTerceiros) return false;
    if (!garantiaReal) return false;

    return true;
  }, [
    cpf,
    nome,
    estadoCivil,
    tipoDocumento,
    numeroDocumento,
    numeroContrato,
    dataContrato,
    valorContrato,
    cidadeAtendimento,
    avalista,
    prestamistaSicoob,
    prestamistaTerceiros,
    garantiaReal,
  ]);

  async function handleGerarPdf() {
    setErro("");
    setInfo("");

    const mensagem = validarCampos();

    if (mensagem) {
      failWithScroll(mensagem);
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

  const fieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/20";
  const readOnlyFieldClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm outline-none";
  const labelClass =
    "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600";
  const sectionClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const sectionTitleClass =
    "flex items-center gap-2 px-5 py-4 text-base font-black text-slate-950";

  return (
    <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SearchForm onSearch={handleBuscarAssociado} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className={labelClass}>
              CPF do associado
            </label>
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => {
                setCpf(e.target.value);
                setCidadeAtendimento("");
                resetResultado();
              }}
              placeholder="000.000.000-00"
              className={fieldClass}
              inputMode="numeric"
              maxLength={14}
            />
          </div>

          <div className="flex items-end">
            <SearchButton loading={loadingBuscar} label="Pesquisar" />
          </div>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}
      </SearchForm>

      <section className={`mt-5 ${sectionClass}`}>
        <h2 className={sectionTitleClass}>
          <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
          Dados do associado e contrato
        </h2>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-5 md:grid-cols-12">
        <div className="md:col-span-8">
          <label className={labelClass}>
            Nome
          </label>
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              resetResultado();
            }}
            readOnly={nomeReadOnly}
            className={nomeReadOnly ? readOnlyFieldClass : fieldClass}
          />
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Estado civil
          </label>
          <select
            value={estadoCivil}
            onChange={(e) => {
              setEstadoCivil(e.target.value as EstadoCivil);
              resetResultado();
            }}
            className={fieldClass}
          >
            <option value="">Selecione</option>
            <option value="CASADO">CASADO</option>
            <option value="DIVORCIADO">DIVORCIADO</option>
            <option value="SEPARADO">SEPARADO</option>
            <option value="SOLTEIRO">SOLTEIRO</option>
            <option value="UNIÃO ESTÁVEL">UNIÃO ESTÁVEL</option>
            <option value="VIÚVO">VIÚVO</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Documento
          </label>
          <select
            value={tipoDocumento}
            onChange={(e) => {
              setTipoDocumento(e.target.value as TipoDocumento);
              resetResultado();
            }}
            className={fieldClass}
          >
            <option value="">Selecione</option>
            <option value="RG">RG</option>
            <option value="CNH">CNH</option>
            <option value="PPD">PPD</option>
            <option value="PASSAPORTE">PASSAPORTE</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Número
          </label>
          <input
            value={numeroDocumento}
            onChange={(e) => {
              setNumeroDocumento(e.target.value);
              resetResultado();
            }}
            className={fieldClass}
          />
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Contrato nº
          </label>
          <input
            value={numeroContrato}
            onChange={(e) => {
              setNumeroContrato(e.target.value);
              resetResultado();
            }}
            className={fieldClass}
          />
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Data
          </label>
          <input
            type="date"
            value={dataContrato}
            onChange={(e) => {
              setDataContrato(e.target.value);
              resetResultado();
            }}
            className={fieldClass}
          />
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Valor
          </label>
          <input
            value={valorContrato}
            onChange={(e) => {
              setValorContrato(monetizarDigitacao(e.target.value));
              resetResultado();
            }}
            placeholder="R$ 0,00"
            className={`${fieldClass} text-left`}
          />
        </div>

        <div className="md:col-span-4">
          <label className={labelClass}>
            Cidade do atendimento
          </label>
          <select
            value={cidadeAtendimento}
            onChange={(e) => {
              setCidadeAtendimento(e.target.value);
              resetResultado();
            }}
            disabled={loadingCidades}
            className={`${fieldClass} disabled:bg-slate-50`}
          >
            <option value="">Selecione</option>
            {cidades.map((cidade) => (
              <option key={cidade.ID_CIDADES} value={cidade.NM_CIDADE}>
                {cidade.NM_CIDADE}
              </option>
            ))}
          </select>
        </div>
        </div>
      </section>

      <section className={`mt-5 overflow-hidden ${sectionClass}`}>
        <h2 className={sectionTitleClass}>
          <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
          Garantias
        </h2>

        <div className="border-t border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-700">
                GARANTIAS
              </th>
              <th className="border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700">
                SIM
              </th>
              <th className="border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700">
                NÃO
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Avalista?
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="avalista"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={avalista === "sim"}
                  onChange={() => {
                    setAvalista("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="avalista"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={avalista === "nao"}
                  onChange={() => {
                    setAvalista("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Seguro Prestamista no Sicoob Cressem?
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_sicoob"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={prestamistaSicoob === "sim"}
                  onChange={() => {
                    setPrestamistaSicoob("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_sicoob"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={prestamistaSicoob === "nao"}
                  onChange={() => {
                    setPrestamistaSicoob("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Seguro Prestamista de Terceiros?
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_terceiros"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={prestamistaTerceiros === "sim"}
                  onChange={() => {
                    setPrestamistaTerceiros("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="prestamista_terceiros"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={prestamistaTerceiros === "nao"}
                  onChange={() => {
                    setPrestamistaTerceiros("nao");
                    resetResultado();
                  }}
                />
              </td>
            </tr>

            <tr>
              <td className="border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Garantia Real?
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="garantia_real"
                  className="h-4 w-4 accent-[#00AE9D]"
                  checked={garantiaReal === "sim"}
                  onChange={() => {
                    setGarantiaReal("sim");
                    resetResultado();
                  }}
                />
              </td>
              <td className="border border-slate-200 px-4 py-3 text-center">
                <input
                  type="radio"
                  name="garantia_real"
                  className="h-4 w-4 accent-[#00AE9D]"
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
      </section>

      <section className={`mt-5 ${sectionClass}`}>
        <h2 className={sectionTitleClass}>
          <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
          Prévia do texto
        </h2>

      <div className="border-t border-slate-200 bg-slate-50 p-5 text-justify text-sm leading-7 text-slate-800">
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
      </section>

      <div className="mt-6 flex items-center justify-end border-t pt-5">
        <button
          type="button"
          onClick={handleGerarPdf}
          disabled={!formularioValido}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition
    ${formularioValido
              ? "bg-[#79B729] text-white hover:bg-[#00AE9D] cursor-pointer"
              : "bg-slate-300 text-white cursor-not-allowed"
            }`}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}