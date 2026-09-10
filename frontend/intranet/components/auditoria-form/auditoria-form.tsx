"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { FaCopy, FaSearch } from "react-icons/fa";
import {
  buscarAssociadoAuditoria,
  buscarDadosAuditoria,
  type AssociadoAuditoriaResponse,
  type AuditoriaResponse,
} from "@/services/auditoria.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";

type CampoInlineKey =
  | "cpf_cnpj"
  | "nome"
  | "empresa"
  | "assunto"
  | "atualizacao"
  | "pd_operacao"
  | "bacen_codigo"
  | "taxa_juros"
  | "parcelas"
  | "margem_disponivel"
  | "efetivo"
  | "liquido"
  | "admissao"
  | "correntista"
  | "portabilidade"
  | "cartao"
  | "risco"
  | "risco_bacen"
  | "bens_moveis"
  | "bens_imoveis"
  | "capital"
  | "emprestimo_cooperativa"
  | "iap"
  | "valor_vencido"
  | "valor_a_vencer"
  | "prejuizo"
  | "serasa_score"
  | "restricao"
  | "dps";

type FormState = Record<CampoInlineKey, string> & {
  outrasInformacoes: string;
  parecerFinal: string;
};

const initialState: FormState = {
  cpf_cnpj: "",
  nome: "",
  empresa: "",
  assunto: "",
  atualizacao: "",
  pd_operacao: "",
  bacen_codigo: "",
  taxa_juros: "",
  parcelas: "",
  margem_disponivel: "",
  efetivo: "",
  liquido: "",
  admissao: "",
  correntista: "",
  portabilidade: "",
  cartao: "",
  risco: "",
  risco_bacen: "",
  bens_moveis: "",
  bens_imoveis: "",
  capital: "",
  emprestimo_cooperativa: "",
  iap: "",
  valor_vencido: "",
  valor_a_vencer: "",
  prejuizo: "",
  serasa_score: "",
  restricao: "",
  dps: "",
  outrasInformacoes: "",
  parecerFinal: "Após uma análise detalhada da sua solicitação de crédito, devido ",
};

function onlyCpfCnpjChars(valor: string) {
  return String(valor || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function formatarCpfCnpj(valor: string) {
  const cleaned = onlyCpfCnpjChars(valor).slice(0, 14);

  if (cleaned.length <= 11 && !/[A-Z]/.test(cleaned)) {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return cleaned
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatarDataCurta(data?: string | null) {
  if (!data) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano.slice(-2)}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split("/");
    return `${dia}/${mes}/${ano.slice(-2)}`;
  }

  return data;
}

function parseMoeda(valor: any) {
  if (valor === null || valor === undefined || valor === "") return NaN;
  if (typeof valor === "number") return valor;

  let texto = String(valor).trim();
  if (!texto) return NaN;

  texto = texto.replace(/\s/g, "").replace(/R\$/gi, "");

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, "");
  }

  const numero = Number(texto);
  return Number.isNaN(numero) ? NaN : numero;
}

function formatarMoeda(valor: any) {
  const numero = parseMoeda(valor);

  if (Number.isNaN(numero)) return String(valor || "");

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatarCampoMoeda(valor: string) {
  return valor ? formatarMoeda(valor) : "_____";
}

function formatarMoedaDigitada(valor: string) {
  if (!valor) return "";

  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";

  return formatarMoeda(Number(digitos) / 100);
}

function CampoEditavel({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`inline-block min-h-10 min-w-[140px] rounded-t-lg border-b border-dashed border-slate-300 bg-slate-50/50 px-2 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#00AE9D] focus:bg-[#00AE9D]/5 ${className}`}
    />
  );
}

export function AuditoriaForm() {
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!info || erro) return;

    requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [info, erro]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateFieldMoeda(field: CampoInlineKey, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: formatarMoedaDigitada(value),
    }));
  }

  async function preencherFormulario() {
    const documento = onlyCpfCnpjChars(form.cpf_cnpj);

    if (!documento) {
      setErro("Digite um CPF ou CNPJ para buscar os dados.");
      setInfo("");
      return;
    }

    try {
      setLoadingBusca(true);
      setErro("");
      setInfo("");

      const [associado, auditoria] = await Promise.all([
        buscarAssociadoAuditoria(documento),
        buscarDadosAuditoria(documento),
      ]);

      aplicarDadosAssociado(associado);
      aplicarDadosAuditoria(auditoria);

      setInfo("Dados preenchidos com sucesso.");
    } catch (error: any) {
      console.error("Erro ao preencher auditoria:", error);
      setErro(
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        "Não foi possível preencher os dados automaticamente."
      );
    } finally {
      setLoadingBusca(false);
    }
  }

  function aplicarDadosAssociado(associado?: AssociadoAuditoriaResponse | null) {
    if (!associado) return;

    setForm((prev) => ({
      ...prev,
      nome: associado.NM_CLIENTE || prev.nome,
      empresa: associado.NM_EMPRESA || prev.empresa,
      iap: String(associado.NR_IAP || prev.iap || ""),
      admissao: formatarDataCurta(associado.DT_ADMISSA || ""),
      correntista: associado.NR_ANO_CORRENTISTA ? "Sim" : "Não",
      portabilidade: associado.NR_MESES_PORTABILIDADE ? "Sim" : "Não",
      cartao: associado.NR_CARTAO ? "Sim" : "Não",
      capital:
        associado.SL_CONTA_CAPITAL !== undefined && associado.SL_CONTA_CAPITAL !== null
          ? formatarMoeda(associado.SL_CONTA_CAPITAL)
          : prev.capital,
      efetivo: associado.SN_VINCULO_EMPREGATICIO ? "Sim" : "Não",
    }));
  }

  function aplicarDadosAuditoria(auditoria?: AuditoriaResponse | null) {
    if (!auditoria) return;

    setForm((prev) => ({
      ...prev,
      valor_vencido:
        auditoria.VL_VENCIDO !== undefined && auditoria.VL_VENCIDO !== null
          ? formatarMoeda(auditoria.VL_VENCIDO)
          : prev.valor_vencido,
      valor_a_vencer:
        auditoria.VL_A_VENCER !== undefined && auditoria.VL_A_VENCER !== null
          ? formatarMoeda(auditoria.VL_A_VENCER)
          : prev.valor_a_vencer,
      prejuizo:
        auditoria.VL_PREJUIZO !== undefined && auditoria.VL_PREJUIZO !== null
          ? formatarMoeda(auditoria.VL_PREJUIZO)
          : prev.prejuizo,
      risco_bacen: auditoria.DESC_MV_RSC_BACEN_ATT || prev.risco_bacen,
      risco: auditoria.DSC_NV_RSC_LIMITE || prev.risco,
    }));
  }

  function obterTextoFormatado() {
    const linhas = [
      `CPF/CNPJ: ${form.cpf_cnpj || "_____"} `,
      `NOME: ${form.nome || "_____"} `,
      `EMPRESA: ${form.empresa || "_____"} `,
      `ASSUNTO: PARECER SOBRE ${form.assunto || "_____"} `,
      ``,
      `DESTACAMOS OS SEGUINTES PONTOS:`,
      `1. ATUALIZAÇÃO CADASTRAL EM DIA? ${form.atualizacao || "_____"} `,
      `2. PD OPERAÇÃO ${form.pd_operacao || "_____"} (BACEN ${form.bacen_codigo || "_____"}), TAXA DE JUROS ${form.taxa_juros || "_____"} EM ${form.parcelas || "_____"} DE ACORDO COM A POLÍTICA DE CRÉDITO.`,
      `3. MARGEM DISPONÍVEL ${formatarCampoMoeda(form.margem_disponivel)} `,
      `4. EFETIVO? ${form.efetivo || "_____"} , LÍQUIDO? ${formatarCampoMoeda(form.liquido)} `,
      `5. ADMISSÃO NA EMPRESA ${form.admissao || "_____"} `,
      `6. CORRENTISTA? ${form.correntista || "_____"} PORTABILIDADE? ${form.portabilidade || "_____"} `,
      `7. CARTÃO DE CRÉDITO? ${form.cartao || "_____"} `,
      `8. RISCO ${form.risco || "_____"} , BACEN ${form.risco_bacen || "_____"} `,
      `9. BENS MÓVEIS? ${formatarCampoMoeda(form.bens_moveis)} , BENS IMÓVEIS? ${formatarCampoMoeda(form.bens_imoveis)} `,
      `10. CAPITAL ${formatarCampoMoeda(form.capital)} `,
      `11. EMPRÉSTIMO NA COOPERATIVA? ${formatarCampoMoeda(form.emprestimo_cooperativa)} `,
      `12. IAP ${form.iap || "_____"} `,
      `13. VALOR VENCIDO NO MERCADO ${formatarCampoMoeda(form.valor_vencido)} `,
      `14. VALOR A VENCER NO MERCADO ${formatarCampoMoeda(form.valor_a_vencer)} `,
      `15. PREJUÍZO NO MERCADO ${formatarCampoMoeda(form.prejuizo)} `,
      `16. SERASA SCORE ${form.serasa_score || "_____"} , RESTRIÇÃO? ${form.restricao || "_____"} `,
      `17. DPS ${form.dps || "_____"} `,
      ``,
      `OUTRAS INFORMAÇÕES:`,
      `${form.outrasInformacoes || "_____"} `,
      ``,
      `PARECER FINAL:`,
      `${form.parecerFinal || "_____"} `,
    ];

    return linhas.join("\n").toUpperCase();
  }

  async function handleCopiar() {
    try {
      setCopiando(true);
      setErro("");
      setInfo("");

      const texto = obterTextoFormatado();

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setInfo("Formulário copiado com sucesso.");
    } catch (error) {
      console.error("Erro ao copiar formulário:", error);
      setErro("Não foi possível copiar. Tente novamente.");
    } finally {
      setCopiando(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <SearchForm onSearch={preencherFormulario}>
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
            Parecer de crédito
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Busque o associado, revise os dados e copie o texto final para uso no processo.
          </p>
        </div>

        <div className="p-5">
          <div ref={feedbackRef} />
          {erro && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {erro}
            </div>
          )}

          {info && !erro && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              {info}
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Digite o CPF/CNPJ, busque os dados automáticos e complete o parecer antes de copiar o texto final.
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full md:max-w-sm">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                CPF/CNPJ
              </label>
              <SearchInput
                value={form.cpf_cnpj}
                onChange={(e) => updateField("cpf_cnpj", formatarCpfCnpj(e.target.value))}
                onBlur={preencherFormulario}
                placeholder="Digite CPF ou CNPJ"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
              />
            </div>

            <button
              type="submit"
              disabled={loadingBusca}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#79B729] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00AE9D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSearch />
              {loadingBusca ? "Buscando..." : "Pesquisar"}
            </button>
          </div>
        </div>
      </SearchForm>

      <div className="space-y-4 border-t border-slate-100 px-5 py-5 text-sm leading-relaxed text-slate-900">
        <div className="leading-8">
          <span className="font-black text-slate-800">CPF/CNPJ:</span>{" "}
          <CampoEditavel
            value={form.cpf_cnpj}
            onChange={(value) => updateField("cpf_cnpj", formatarCpfCnpj(value))}
            placeholder="Digite CPF ou CNPJ"
            className="min-w-[180px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-black text-slate-800">NOME:</span>{" "}
          <CampoEditavel
            value={form.nome}
            onChange={(value) => updateField("nome", value)}
            placeholder="Nome completo"
            className="min-w-[280px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-black text-slate-800">EMPRESA:</span>{" "}
          <CampoEditavel
            value={form.empresa}
            onChange={(value) => updateField("empresa", value)}
            placeholder="Empresa"
            className="min-w-[240px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-black text-slate-800">ASSUNTO:</span> Parecer sobre{" "}
          <CampoEditavel
            value={form.assunto}
            onChange={(value) => updateField("assunto", value)}
            placeholder="Digite aqui"
            className="min-w-[220px]"
          />
        </div>

        <h3 className="flex items-center gap-2 pt-2 text-base font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#C7D300]">
          Destacamos os seguintes pontos:
        </h3>

        <div className="leading-8">
          1. Atualização cadastral em dia?{" "}
          <CampoEditavel
            value={form.atualizacao}
            onChange={(value) => updateField("atualizacao", value)}
            placeholder="Sim/Não"
          />
        </div>

        <div className="leading-8">
          2. PD Operação{" "}
          <CampoEditavel
            value={form.pd_operacao}
            onChange={(value) => updateField("pd_operacao", value)}
            placeholder="Número"
          />{" "}
          (Bacen{" "}
          <CampoEditavel
            value={form.bacen_codigo}
            onChange={(value) => updateField("bacen_codigo", value)}
            placeholder="Código"
          />
          ), taxa de juros{" "}
          <CampoEditavel
            value={form.taxa_juros}
            onChange={(value) => updateField("taxa_juros", value)}
            placeholder="Ex: 2,5%"
          />{" "}
          em{" "}
          <CampoEditavel
            value={form.parcelas}
            onChange={(value) => updateField("parcelas", value)}
            placeholder="Parcelas"
          />{" "}
          de acordo com a política de crédito.
        </div>

        <div className="leading-8">
          3. Margem disponível{" "}
          <CampoEditavel
            value={form.margem_disponivel}
            onChange={(value) => updateFieldMoeda("margem_disponivel", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          4. Efetivo?{" "}
          <CampoEditavel
            value={form.efetivo}
            onChange={(value) => updateField("efetivo", value)}
            placeholder="Sim/Não"
          />
          , Líquido?{" "}
          <CampoEditavel
            value={form.liquido}
            onChange={(value) => updateFieldMoeda("liquido", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          5. Admissão na empresa{" "}
          <CampoEditavel
            value={form.admissao}
            onChange={(value) => updateField("admissao", value)}
            placeholder="Data"
          />
        </div>

        <div className="leading-8">
          6. Correntista?{" "}
          <CampoEditavel
            value={form.correntista}
            onChange={(value) => updateField("correntista", value)}
            placeholder="Sim/Não"
          />{" "}
          Portabilidade?{" "}
          <CampoEditavel
            value={form.portabilidade}
            onChange={(value) => updateField("portabilidade", value)}
            placeholder="Sim/Não"
          />
        </div>

        <div className="leading-8">
          7. Cartão de crédito?{" "}
          <CampoEditavel
            value={form.cartao}
            onChange={(value) => updateField("cartao", value)}
            placeholder="Sim/Não"
          />
        </div>

        <div className="leading-8">
          8. Risco{" "}
          <CampoEditavel
            value={form.risco}
            onChange={(value) => updateField("risco", value)}
            placeholder="Risco"
          />
          , Bacen{" "}
          <CampoEditavel
            value={form.risco_bacen}
            onChange={(value) => updateField("risco_bacen", value)}
            placeholder="Risco"
          />
        </div>

        <div className="leading-8">
          9. Bens móveis?{" "}
          <CampoEditavel
            value={form.bens_moveis}
            onChange={(value) => updateFieldMoeda("bens_moveis", value)}
            placeholder="R$"
          />
          , Bens imóveis?{" "}
          <CampoEditavel
            value={form.bens_imoveis}
            onChange={(value) => updateFieldMoeda("bens_imoveis", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          10. Capital{" "}
          <CampoEditavel
            value={form.capital}
            onChange={(value) => updateFieldMoeda("capital", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          11. Empréstimo na cooperativa?{" "}
          <CampoEditavel
            value={form.emprestimo_cooperativa}
            onChange={(value) => updateFieldMoeda("emprestimo_cooperativa", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          12. IAP{" "}
          <CampoEditavel
            value={form.iap}
            onChange={(value) => updateField("iap", value)}
            placeholder="Número"
          />
        </div>

        <div className="leading-8">
          13. Valor vencido no mercado{" "}
          <CampoEditavel
            value={form.valor_vencido}
            onChange={(value) => updateFieldMoeda("valor_vencido", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          14. Valor a vencer no mercado{" "}
          <CampoEditavel
            value={form.valor_a_vencer}
            onChange={(value) => updateFieldMoeda("valor_a_vencer", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          15. Prejuízo no mercado{" "}
          <CampoEditavel
            value={form.prejuizo}
            onChange={(value) => updateFieldMoeda("prejuizo", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          16. Serasa Score{" "}
          <CampoEditavel
            value={form.serasa_score}
            onChange={(value) => updateField("serasa_score", value)}
            placeholder="Pontuação"
          />
          , restrição?{" "}
          <CampoEditavel
            value={form.restricao}
            onChange={(value) => updateField("restricao", value)}
            placeholder="Sim/Não"
          />
        </div>

        <div className="leading-8">
          17. DPS{" "}
          <CampoEditavel
            value={form.dps}
            onChange={(value) => updateField("dps", value)}
            placeholder="Digite aqui"
            className="min-w-[220px]"
          />
        </div>

        <div className="pt-2">
          <h3 className="mb-2 flex items-center gap-2 text-base font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]">
            Outras Informações:
          </h3>
          <textarea
            value={form.outrasInformacoes}
            onChange={(e) => updateField("outrasInformacoes", e.target.value)}
            placeholder="Digite mais informações..."
            className="min-h-[96px] w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:bg-white focus:ring-2 focus:ring-[#00AE9D]/10"
          />
        </div>

        <div className="pt-2">
          <h3 className="mb-2 flex items-center gap-2 text-base font-black text-slate-950 before:h-2 before:w-2 before:rounded-full before:bg-[#79B729]">
            Parecer Final:
          </h3>
          <textarea
            value={form.parecerFinal}
            onChange={(e) => updateField("parecerFinal", e.target.value)}
            placeholder="Descreva o parecer final aqui..."
            className="min-h-[96px] w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:bg-white focus:ring-2 focus:ring-[#00AE9D]/10"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleCopiar}
            disabled={copiando}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#79B729] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FaCopy />
            {copiando ? "Copiando..." : "Copiar tudo"}
          </button>
        </div>
      </div>
    </div>
  );
}