"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { gerarPdfDeclaracaoResidencia } from "@/lib/pdf/gerarPdfResidencia";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { formatCpfView, onlyDigits } from "@/utils/br";
import { useCep } from "@/hooks/use-cep";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import {
  listarCidadesAutorizacaoDebito,
  type CidadeOption,
} from "@/services/autorizacao_debito.service";

type Assoc = {
  nome: string;
  cpf: string;
  rg: string;

  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

const formatRgView = (v: string) => {
  return formatCpfView((v || "").replace(/\D/g, "").slice(0, 11));
};

const maskCepView = (v: string) => {
  const s = (v || "").replace(/\D/g, "").slice(0, 8);
  if (s.length <= 5) return s;
  return `${s.slice(0, 5)}-${s.slice(5)}`;
};

const CIDADE_PADRAO = "São José dos Campos";

const hojeISO = () => {
  const hoje = new Date();
  const offset = hoje.getTimezoneOffset() * 60000;
  return new Date(hoje.getTime() - offset).toISOString().slice(0, 10);
};

const dataPartsFromIso = (iso: string) => {
  const [ano = "", mesNum = "", dia = ""] = (iso || "").split("-");
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const mesIdx = Math.max(0, Math.min(11, Number(mesNum) - 1));
  const mes = meses[isNaN(mesIdx) ? 0 : mesIdx];
  return { dia, mes, ano };
};

export function DeclaracaoResidenciaForm() {
  const [tipoPessoa, setTipoPessoa] = useState<"associado" | "nao_associado" | null>(null);

  const [cpfBusca, setCpfBusca] = useState("");
  const [data, setData] = useState<Assoc | null>(null);

  const [cidadeRodape, setCidadeRodape] = useState(CIDADE_PADRAO);
  const [dataDeclaracao, setDataDeclaracao] = useState(hojeISO);
  const [cidades, setCidades] = useState<CidadeOption[]>([]);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const { loadingCep, erroCep, infoCep, buscar: buscarCep, limparMensagens } = useCep();

  useEffect(() => {
    let ativo = true;
    listarCidadesAutorizacaoDebito()
      .then((lista) => {
        if (ativo) setCidades(lista || []);
      })
      .catch(() => {
        if (ativo) setCidades([]);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const emptyAssoc: Assoc = {
    nome: "",
    cpf: "",
    rg: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
  };

  const handleSelecionarAssociado = () => {
    setTipoPessoa("associado");
    setCpfBusca("");
    setData(null);
    setCidadeRodape(CIDADE_PADRAO);
    setDataDeclaracao(hojeISO());
  };

  const handleSelecionarNaoAssociado = () => {
    setTipoPessoa("nao_associado");
    setCpfBusca("");
    setData({ ...emptyAssoc });
    setCidadeRodape(CIDADE_PADRAO);
    setDataDeclaracao(hojeISO());
  };

  const isAssociado = tipoPessoa === "associado";
  const isNaoAssociado = tipoPessoa === "nao_associado";

  const onBuscar = async () => {
    setData(null);

    const r = await buscar(cpfBusca);
    if (r.found) {
      const assocData = r.data;

      if (!assocData) {
        const cpf = onlyDigits(cpfBusca);
        setData({ ...emptyAssoc, cpf, rg: cpf });
        return;
      }

      const cpf = assocData.cpf || onlyDigits(cpfBusca);
      const assoc: Assoc = {
        ...emptyAssoc,
        nome: assocData.nome || "",
        cpf,
        rg: cpf,
        cidade: assocData.cidade || "",
        bairro: assocData.bairro || "",
        rua: assocData.rua || "",
        uf: assocData.uf || "",
        cep: assocData.cep || "",
      };

      setData(assoc);
      setCidadeRodape(CIDADE_PADRAO);
    } else {
      const cpf = onlyDigits(cpfBusca);
      setData({ ...emptyAssoc, cpf, rg: cpf });
    }
  };

  const onGerarPdf = async () => {
    if (!data) return;

    const { dia, mes, ano } = dataPartsFromIso(dataDeclaracao);

    await gerarPdfDeclaracaoResidencia({
      nome: data.nome,
      cpf: data.cpf,
      rg: data.rg,
      endereco: data.rua,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      cidadeRodape,
      uf: data.uf,
      cep: onlyDigits(data.cep),

      dia,
      mes,
      ano: ano || new Date().getFullYear().toString(),
    });
  };

  const onBuscarCep = async (cepValue?: string) => {
    if (!data || !isNaoAssociado) return;

    const cepAtual = onlyDigits(cepValue ?? data.cep);

    if (cepAtual.length !== 8) return;

    const r = await buscarCep(cepAtual);

    if (!r.found || !r.data) return;

    const cepData = r.data;

    setData((prev) =>
      prev
        ? {
          ...prev,
          cep: cepData.cep || cepAtual,
          rua: cepData.rua || prev.rua,
          complemento: prev.complemento || cepData.complemento || "",
          bairro: cepData.bairro || prev.bairro,
          cidade: cepData.cidade || prev.cidade,
          uf: cepData.uf || prev.uf,
        }
        : prev
    );

    setCidadeRodape((prev) => prev || cepData.cidade || "");
  };

  const formularioCompleto =
    !!data &&
    !!data.nome?.trim() &&
    !!onlyDigits(data.cpf)?.trim() &&
    !!data.rg?.trim() &&
    !!data.rua?.trim() &&
    !!data.bairro?.trim() &&
    !!data.cidade?.trim() &&
    !!data.uf?.trim() &&
    !!onlyDigits(data.cep)?.trim() &&
    !!cidadeRodape?.trim() &&
    !!dataDeclaracao?.trim();

  const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const sectionTitleClass = "flex items-center gap-2 text-base font-bold text-title before:block before:h-2 before:w-2 before:rounded-full before:bg-primary";
  const inputClass = "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100";
  const buttonPrimary = "inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300";
  const buttonSecondary = "inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-title shadow-sm transition hover:border-primary hover:text-primary";

  return (
    <div className="mx-auto min-w-225 space-y-5">
      <SearchForm onSearch={onBuscar}>
        <div className={`${cardClass} p-5`}>
          <h2 className={sectionTitleClass}>Tipo de declaração</h2>
          <p className="mt-1 text-sm text-paragraph">Selecione o tipo e preencha os dados para gerar o PDF.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSelecionarAssociado}
              className={`h-10 rounded-xl border px-4 text-sm font-semibold transition
            ${isAssociado
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-title hover:border-primary hover:text-primary"
                }`}
            >
              Associado
            </button>

            <button
              type="button"
              onClick={handleSelecionarNaoAssociado}
              className={`h-10 rounded-xl border px-4 text-sm font-semibold transition
            ${isNaoAssociado
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-title hover:border-primary hover:text-primary"
                }`}
            >
              Não associado
            </button>
          </div>

          {isAssociado && (
            <p className="mt-4 text-sm text-paragraph">
              Digite o CPF para preencher automaticamente. Complete os dados se necessário.
            </p>
          )}

          {isNaoAssociado && (
            <p className="mt-4 text-sm text-paragraph">
              Preencha os dados manualmente para gerar a declaração.
            </p>
          )}

          {isAssociado && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <SearchInput
                value={formatCpfView(cpfBusca)}
                onChange={(e) => setCpfBusca(e.target.value)}
                placeholder="CPF (somente números)"
                className={inputClass}
                inputMode="numeric"
                maxLength={14}
              />
              <SearchButton loading={loading} label="Pesquisar" />
            </div>
          )}

          {erro && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {info && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-secondary">
              {info}
            </div>
          )}

          {erroCep && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erroCep}
            </div>
          )}

          {infoCep && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-secondary">
              {infoCep}
            </div>
          )}
        </div>
      </SearchForm>

      {data && (
        <div className={`${cardClass} p-5`}>
          <h2 className={sectionTitleClass}>Dados da declaração</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {isAssociado ? (
              <>
                <InputRO label="Nome completo" value={data.nome} inputClass={inputClass} />
                <InputRO label="CPF" value={formatCpfView(data.cpf)} inputClass={inputClass} />
                <InputRW
                  label="RG"
                  value={formatRgView(data.rg)}
                  onChange={(v) =>
                    setData({
                      ...data,
                      rg: onlyDigits(v),
                    })
                  }
                  inputClass={inputClass}
                />
              </>
            ) : (
              <>
                <InputRW label="Nome completo" value={data.nome} onChange={(v) => setData({ ...data, nome: v })} inputClass={inputClass} />
                <InputRW
                  label="CPF"
                  value={formatCpfView(data.cpf)}
                  onChange={(v) => {
                    const cpf = onlyDigits(v);
                    setData({ ...data, cpf, rg: cpf });
                  }}
                  inputClass={inputClass}
                />
                <InputRW
                  label="RG"
                  value={formatRgView(data.rg)}
                  onChange={(v) =>
                    setData({
                      ...data,
                      rg: onlyDigits(v),
                    })
                  }
                  inputClass={inputClass}
                />
              </>
            )}

            <InputRW label="Rua" value={data.rua} onChange={(v) => setData({ ...data, rua: v })} inputClass={inputClass} />
            {/*<InputRW label="Número" value={data.numero} onChange={(v) => setData({ ...data, numero: v })} />*/}
            <InputRW
              label="Complemento"
              value={data.complemento}
              onChange={(v) => setData({ ...data, complemento: v })}
              inputClass={inputClass}
            />
            <InputRW label="Bairro" value={data.bairro} onChange={(v) => setData({ ...data, bairro: v })} inputClass={inputClass} />
            <InputRW label="Cidade" value={data.cidade} onChange={(v) => setData({ ...data, cidade: v })} inputClass={inputClass} />
            <InputRW label="UF" value={data.uf} onChange={(v) => setData({ ...data, uf: v.toUpperCase().slice(0, 2) })} inputClass={inputClass} />
            <InputRW
              label="CEP"
              value={maskCepView(data.cep)}
              onChange={(v) => {
                const cepDigitado = onlyDigits(v).slice(0, 8);
                setData({ ...data, cep: cepDigitado });

                if (cepDigitado.length < 8) {
                  limparMensagens();
                }
              }}
              onBlur={() => {
                if (isNaoAssociado) {
                  onBuscarCep();
                }
              }}
              inputClass={inputClass}
            />
          </div>

          {loadingCep && (
            <div className="mt-2 text-xs text-paragraph">
              Buscando endereço pelo CEP...
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Cidade (no rodapé)</label>
              <select
                value={cidadeRodape}
                onChange={(e) => setCidadeRodape(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {cidades.map((item) => (
                  <option key={item.ID_CIDADES} value={item.NM_CIDADE}>
                    {item.NM_CIDADE}
                  </option>
                ))}
              </select>
            </div>

            <InputRW
              label="Data da declaração"
              type="date"
              value={dataDeclaracao}
              onChange={setDataDeclaracao}
              inputClass={inputClass}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={isAssociado ? handleSelecionarAssociado : handleSelecionarNaoAssociado}
              className={buttonSecondary}
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onGerarPdf}
              disabled={!formularioCompleto}
              className={buttonPrimary}
              title="Gerar PDF igual ao modelo"
            >
              Gerar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InputRO({ label, value, inputClass }: { label: string; value: string; inputClass: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</label>
      <input readOnly value={value} className={`${inputClass} bg-slate-50`} />
    </div>
  );
}

function InputRW({
  label,
  value,
  onChange,
  onBlur,
  readOnly = false,
  type = "text",
  inputClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  type?: string;
  inputClass: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        readOnly={readOnly}
        className={inputClass}
      />
    </div>
  );
}
