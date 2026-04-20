"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { FaCopy, FaSearch } from "react-icons/fa";
import {
  buscarAssociadoAuditoria,
  buscarDadosAuditoria,
  type AssociadoAuditoriaResponse,
  type AuditoriaResponse,
} from "@/services/auditoria.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

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

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpfCnpj(valor: string) {
  const cleaned = somenteNumeros(valor);

  if (cleaned.length <= 11) {
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

function formatarMoeda(valor: any) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
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
      className={`inline-block min-w-[140px] border-b border-dashed border-gray-400 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#013641] ${className}`}
    />
  );
}

export function AuditoriaForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const cpfCnpjLimpo = useMemo(
    () => somenteNumeros(form.cpf_cnpj),
    [form.cpf_cnpj]
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function preencherFormulario() {
    const documento = somenteNumeros(form.cpf_cnpj);

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
      `3. MARGEM DISPONÍVEL ${form.margem_disponivel || "_____"} `,
      `4. EFETIVO? ${form.efetivo || "_____"} , LÍQUIDO? ${form.liquido || "_____"} `,
      `5. ADMISSÃO NA EMPRESA ${form.admissao || "_____"} `,
      `6. CORRENTISTA? ${form.correntista || "_____"} PORTABILIDADE? ${form.portabilidade || "_____"} `,
      `7. CARTÃO DE CRÉDITO? ${form.cartao || "_____"} `,
      `8. RISCO ${form.risco || "_____"} , BACEN ${form.risco_bacen || "_____"} `,
      `9. BENS MÓVEIS? ${form.bens_moveis || "_____"} , BENS IMÓVEIS? ${form.bens_imoveis || "_____"} `,
      `10. CAPITAL ${form.capital || "_____"} `,
      `11. EMPRÉSTIMO NA COOPERATIVA? ${form.emprestimo_cooperativa || "_____"} `,
      `12. IAP ${form.iap || "_____"} `,
      `13. VALOR VENCIDO NO MERCADO ${form.valor_vencido || "_____"} `,
      `14. VALOR A VENCER NO MERCADO ${form.valor_a_vencer || "_____"} `,
      `15. PREJUÍZO NO MERCADO ${form.prejuizo || "_____"} `,
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
    <div className="mx-auto min-w-0 rounded-xl bg-white p-6 shadow">
      <SearchForm onSearch={preencherFormulario}>
        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {info && !erro && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {info}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
          <p className="text-sm font-medium text-gray-700">
            Digite o CPF/CNPJ, busque os dados automáticos e complete o parecer antes de copiar o texto final.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF/CNPJ
            </label>
            <SearchInput
              value={form.cpf_cnpj}
              onChange={(e) => updateField("cpf_cnpj", formatarCpfCnpj(e.target.value))}
              onBlur={preencherFormulario}
              placeholder="Digite CPF ou CNPJ"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <SearchButton loading={loadingBusca} label="Pesquisar" />
        </div>
      </SearchForm>

      <div className="space-y-4 text-sm text-gray-900">
        <div className="leading-8">
          <span className="font-medium">CPF/CNPJ:</span>{" "}
          <CampoEditavel
            value={form.cpf_cnpj}
            onChange={(value) => updateField("cpf_cnpj", formatarCpfCnpj(value))}
            placeholder="Digite CPF ou CNPJ"
            className="min-w-[180px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-medium">NOME:</span>{" "}
          <CampoEditavel
            value={form.nome}
            onChange={(value) => updateField("nome", value)}
            placeholder="Nome completo"
            className="min-w-[280px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-medium">EMPRESA:</span>{" "}
          <CampoEditavel
            value={form.empresa}
            onChange={(value) => updateField("empresa", value)}
            placeholder="Empresa"
            className="min-w-[240px]"
          />
        </div>

        <div className="leading-8">
          <span className="font-medium">ASSUNTO:</span> Parecer sobre{" "}
          <CampoEditavel
            value={form.assunto}
            onChange={(value) => updateField("assunto", value)}
            placeholder="Digite aqui"
            className="min-w-[220px]"
          />
        </div>

        <h3 className="pt-2 text-base font-semibold text-gray-900">
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
            onChange={(value) => updateField("margem_disponivel", value)}
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
            onChange={(value) => updateField("liquido", value)}
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
            onChange={(value) => updateField("bens_moveis", value)}
            placeholder="R$"
          />
          , Bens imóveis?{" "}
          <CampoEditavel
            value={form.bens_imoveis}
            onChange={(value) => updateField("bens_imoveis", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          10. Capital{" "}
          <CampoEditavel
            value={form.capital}
            onChange={(value) => updateField("capital", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          11. Empréstimo na cooperativa?{" "}
          <CampoEditavel
            value={form.emprestimo_cooperativa}
            onChange={(value) => updateField("emprestimo_cooperativa", value)}
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
            onChange={(value) => updateField("valor_vencido", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          14. Valor a vencer no mercado{" "}
          <CampoEditavel
            value={form.valor_a_vencer}
            onChange={(value) => updateField("valor_a_vencer", value)}
            placeholder="R$"
          />
        </div>

        <div className="leading-8">
          15. Prejuízo no mercado{" "}
          <CampoEditavel
            value={form.prejuizo}
            onChange={(value) => updateField("prejuizo", value)}
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
          <h3 className="mb-2 text-base font-semibold text-gray-900">
            Outras Informações:
          </h3>
          <textarea
            value={form.outrasInformacoes}
            onChange={(e) => updateField("outrasInformacoes", e.target.value)}
            placeholder="Digite mais informações..."
            className="min-h-[100px] w-full rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#013641] focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="pt-2">
          <h3 className="mb-2 text-base font-semibold text-gray-900">
            Parecer Final:
          </h3>
          <textarea
            value={form.parecerFinal}
            onChange={(e) => updateField("parecerFinal", e.target.value)}
            placeholder="Descreva o parecer final aqui..."
            className="min-h-[120px] w-full rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#013641] focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-5">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleCopiar}
            disabled={copiando}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-2 font-semibold text-white shadow transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FaCopy />
            {copiando ? "Copiando..." : "Copiar tudo"}
          </button>
        </div>
      </div>
    </div>
  );
}