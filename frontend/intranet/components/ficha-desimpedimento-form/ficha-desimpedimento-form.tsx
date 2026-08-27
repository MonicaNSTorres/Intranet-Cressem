"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { ArrowDownToLine, SquarePen, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ModalEditarFicha from "@/components/modal-editar-ficha/modal-editar-ficha";
import {
  buscarAssociadoPorCpf,
  buscarProximoSequencial,
  criarFicha,
  editarFicha,
  excluirFicha,
  listarContasBancarias,
  listarContasCredoras,
  listarContasDevedoras,
  listarFichas,
  type Conta,
  type FichaFormData,
  type FichaRow,
  type TipoFicha,
} from "@/services/ficha-desimpedimento.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { getMeAdUser } from "@/services/auth.service";

function hojeIso() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function criarFormInicial(responsavel = ""): FichaFormData {
  return {
  nome: "",
  cpf: "",
  tipo: "",
  prontuario: "",
  empresa: "",
  endereco: "",
  nm_bairro: "",
  nm_cidade: "",
  nr_cep: "",
  telefone: "",
  observacao: "",
  risco: "",
  tempo_associado: "",
  data_ficha: hojeIso(),
  observacoes_gerais: "",
  responsavel,
  total_debitos: "",
  total_creditos: "",
  liquido_devedor: "",
  ds_email: "",
  sequencial: "",
  };
}

function formatarTempoAssociacao(dataMatricula?: string) {
  const partes = String(dataMatricula || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return "";

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const hoje = new Date();
  const hojeUtc = new Date(
    Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  );
  const criarDataAjustada = (anoBase: number, mesBase: number, diaBase: number) => {
    const ultimoDiaDoMes = new Date(
      Date.UTC(anoBase, mesBase + 1, 0)
    ).getUTCDate();

    return new Date(Date.UTC(anoBase, mesBase, Math.min(diaBase, ultimoDiaDoMes)));
  };
  const inicio = criarDataAjustada(ano, mes - 1, dia);

  if (
    inicio.getUTCFullYear() !== ano ||
    inicio.getUTCMonth() !== mes - 1 ||
    inicio.getUTCDate() !== dia ||
    inicio > hojeUtc
  ) {
    return "";
  }

  let anos = hojeUtc.getUTCFullYear() - ano;
  let marcoAnual = criarDataAjustada(ano + anos, mes - 1, dia);

  if (marcoAnual > hojeUtc) {
    anos -= 1;
    marcoAnual = criarDataAjustada(ano + anos, mes - 1, dia);
  }

  let meses =
    (hojeUtc.getUTCFullYear() - marcoAnual.getUTCFullYear()) * 12 +
    hojeUtc.getUTCMonth() -
    marcoAnual.getUTCMonth();
  let marcoMensal = criarDataAjustada(
    marcoAnual.getUTCFullYear(),
    marcoAnual.getUTCMonth() + meses,
    marcoAnual.getUTCDate()
  );

  if (marcoMensal > hojeUtc) {
    meses -= 1;
    marcoMensal = criarDataAjustada(
      marcoAnual.getUTCFullYear(),
      marcoAnual.getUTCMonth() + meses,
      marcoAnual.getUTCDate()
    );
  }

  const dias = Math.round(
    (hojeUtc.getTime() - marcoMensal.getTime()) / (24 * 60 * 60 * 1000)
  );

  const unidade = (valor: number, singular: string, plural: string) =>
    `${valor} ${valor === 1 ? singular : plural}`;

  return [
    unidade(anos, "ano", "anos"),
    unidade(meses, "mês", "meses"),
    unidade(dias, "dia", "dias"),
  ].join(", ");
}

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const readOnlyFieldClass = `${fieldClass} bg-slate-50 text-slate-600`;
const textareaClass =
  "min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
const addButtonClass =
  "mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/15 hover:text-secondary";

export function FichaDesimpedimentoForm() {
  const [tipo, setTipo] = useState<TipoFicha>("DEVEDOR");
  const [form, setForm] = useState<FichaFormData>(() => criarFormInicial());
  const [responsavelAtual, setResponsavelAtual] = useState("");
  const [contasCredoras, setContasCredoras] = useState<Conta[]>([]);
  const [contasDevedoras, setContasDevedoras] = useState<Conta[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Conta[]>([]);
  const [sequencial, setSequencial] = useState<number | null>(null);
  const [fichas, setFichas] = useState<FichaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fichaEditando, setFichaEditando] = useState<FichaRow | null>(null);
  const [loadingCpf, setLoadingCpf] = useState(false);
  const [erroCpf, setErroCpf] = useState("");
  const [infoCpf, setInfoCpf] = useState("");

  useEffect(() => {
    carregarFichas();
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarResponsavel() {
      try {
        const usuario = await getMeAdUser();
        const nome = String(usuario?.nome_completo || usuario?.username || "").trim();
        if (!ativo || !nome) return;
        setResponsavelAtual(nome);
        setForm((prev) => ({ ...prev, responsavel: nome }));
      } catch (error) {
        console.error("Erro ao carregar usuário responsável:", error);
      }
    }

    carregarResponsavel();
    return () => {
      ativo = false;
    };
  }, []);

  async function carregarFichas() {
    try {
      setLoading(true);
      const data = await listarFichas();
      setFichas(data);
    } catch (error) {
      console.error("Erro ao buscar fichas:", error);
      alert("Erro ao carregar fichas.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "tipo") {
      setTipo(value as TipoFicha);
    }
  }

  function parseValorMonetario(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") return valor;

    const clean = String(valor).trim().replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  function totalNumerico(contas: Conta[]): number {
    return contas.reduce((sum, conta) => sum + parseValorMonetario(conta.valor), 0);
  }

  function totalFormatado(contas: Conta[]) {
    return totalNumerico(contas).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  function formatCpfView(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function addConta(tipoConta: "devedora" | "credora" | "bancaria") {
    const novaConta = { descricao: "", valor: "" };

    if (tipoConta === "devedora") {
      setContasDevedoras((prev) => [...prev, novaConta]);
      return;
    }

    if (tipoConta === "credora") {
      setContasCredoras((prev) => [...prev, novaConta]);
      return;
    }

    setContasBancarias((prev) => [...prev, novaConta]);
  }

  function updateConta(
    tipoConta: "devedora" | "credora" | "bancaria",
    index: number,
    field: keyof Conta,
    value: string
  ) {
    if (tipoConta === "devedora") {
      const updated = [...contasDevedoras];
      updated[index][field] = value;
      setContasDevedoras(updated);
      return;
    }

    if (tipoConta === "credora") {
      const updated = [...contasCredoras];
      updated[index][field] = value;
      setContasCredoras(updated);
      return;
    }

    const updated = [...contasBancarias];
    updated[index][field] = value;
    setContasBancarias(updated);
  }

  function montarEnderecoCompleto(data: any) {
    return [
      data.endereco,
      data.nm_bairro,
      data.nm_cidade,
      data.nr_cep,
    ]
      .filter((v) => v && String(v).trim() !== "")
      .map((v) => String(v).trim())
      .join(", ");
  }

  async function handleBuscarCpf() {
    const cpfLimpo = form.cpf.replace(/\D/g, "");

    setErroCpf("");
    setInfoCpf("");

    if (cpfLimpo.length !== 11) {
      setErroCpf("CPF inválido. Digite os 11 números.");
      return;
    }

    try {
      setLoadingCpf(true);

      const data = await buscarAssociadoPorCpf(cpfLimpo);
      const tempoAssociado = formatarTempoAssociacao(data.dt_matricula_associacao);

      setForm((prev) => ({
        ...prev,
        nome: data.nome || "",
        cpf: data.cpf || cpfLimpo,
        prontuario: data.prontuario || "",
        empresa: data.empresa || "",
        endereco: montarEnderecoCompleto(data),
        nm_bairro: data.nm_bairro || "",
        nm_cidade: data.nm_cidade || "",
        nr_cep: data.nr_cep || "",
        telefone: data.telefone || "",
        ds_email: data.ds_email || "",
        tempo_associado: tempoAssociado,
      }));

      setInfoCpf("Dados carregados com sucesso.");
      console.log(data);
    } catch (error) {
      console.error("Erro ao buscar associado:", error);
      setErroCpf("Erro ao buscar associado por CPF.");
    } finally {
      setLoadingCpf(false);
    }
  }

  async function handleSalvar() {
    try {
      const proximo = await buscarProximoSequencial();
      setSequencial(proximo);

      await criarFicha({
        ...form,
        sequencial: proximo,
        tipo,
        contasDevedoras,
        contasCredoras,
        contasBancarias,
      });

      alert("Ficha salva com sucesso!");
      setForm(criarFormInicial(responsavelAtual));
      setTipo("DEVEDOR");
      setContasDevedoras([]);
      setContasCredoras([]);
      setContasBancarias([]);
      setSequencial(null);
      setErroCpf("");
      setInfoCpf("");
      await carregarFichas();
    } catch (error: any) {
      console.error("Erro ao salvar ficha:", error);
      alert(error?.response?.data?.details || "Erro ao salvar ficha.");
    }
  }

  async function handleExcluir(id: string) {
    const confirmar = window.confirm("Deseja realmente excluir esta ficha?");
    if (!confirmar) return;

    try {
      await excluirFicha(id);
      setFichas((prev) => prev.filter((item) => item.ID_FICHAS !== id));
    } catch (error) {
      console.error("Erro ao excluir ficha:", error);
      alert("Erro ao excluir ficha.");
    }
  }

  async function handleEditar(ficha: FichaRow) {
    try {
      setTipo(ficha.TIPO_FICHA);

      setForm({
        nome: ficha.NOME || "",
        cpf: ficha.CPF || "",
        tipo: ficha.TIPO_FICHA || "",
        prontuario: ficha.PRONTUARIO || "",
        empresa: ficha.EMPRESA || "",
        endereco: ficha.ENDERECO || "",
        nm_bairro: ficha.NM_BAIRRO || "",
        nm_cidade: ficha.NM_CIDADE || "",
        nr_cep: ficha.NR_CEP || "",
        telefone: ficha.TELEFONE || "",
        observacao: ficha.OBSERVACAO || "",
        risco: ficha.RISCO || "",
        tempo_associado: ficha.TEMPO_ASSOCIADO || "",
        data_ficha: ficha.DATA_FICHA || "",
        observacoes_gerais: ficha.OBSERVACOES_GERAIS || "",
        responsavel: ficha.RESPONSAVEL || "",
        total_debitos: String(ficha.TOTAL_DEBITOS || ""),
        total_creditos: String(ficha.TOTAL_CREDITOS || ""),
        liquido_devedor: String(ficha.LIQUIDO_DEVEDOR || ""),
        ds_email: ficha.DS_EMAIL || "",
        sequencial: String(ficha.SEQUENCIAL || ""),
      });

      const [devedoras, credoras, bancarias] = await Promise.all([
        listarContasDevedoras(ficha.ID_FICHAS),
        listarContasCredoras(ficha.ID_FICHAS),
        listarContasBancarias(ficha.ID_FICHAS),
      ]);

      const mapConta = (item: any): Conta => ({
        descricao: item.DESCRICAO ?? item.descricao ?? "",
        valor: item.VALOR ?? item.valor ?? "",
      });

      setContasDevedoras(devedoras.map(mapConta));
      setContasCredoras(credoras.map(mapConta));
      setContasBancarias(bancarias.map(mapConta));
      setFichaEditando(ficha);
    } catch (error) {
      console.error("Erro ao carregar ficha para edição:", error);
      alert("Erro ao carregar dados da ficha.");
    }
  }

  function formatarDataPtBr(value: any): string {
    if (!value) return "-";

    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    }

    const d = value instanceof Date ? value : new Date(value);
    if (!isNaN(d.getTime())) {
      const [y, m, dd] = d.toISOString().slice(0, 10).split("-");
      return `${dd}/${m}/${y}`;
    }

    return "-";
  }

  async function getImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function gerarPdfFicha(
    ficha: any,
    devedoras: Conta[] = [],
    credoras: Conta[] = [],
    bancarias: Conta[] = []
  ) {
    const doc = new jsPDF();
    const logoBase64 = await getImageAsBase64("/sicoob-cressem-logo.png");

    const normalize = (v: any) => (v && String(v).trim() !== "" ? v : "-");

    const formatarValor = (valor: any): string => {
      const numero = parseValorMonetario(valor);
      return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    };

    doc.addImage(logoBase64, "PNG", 10, 7, 20, 15);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("FICHA DE DESIMPEDIMENTO", 105, 15, { align: "center" });

    const dadosTopo = [
      ["Sequencial", normalize(ficha.sequencial)],
      ["Associado", normalize(ficha.nome)],
      ["CPF", normalize(ficha.cpf)],
      ["Prontuário", normalize(ficha.prontuario)],
      ["Empresa", normalize(ficha.empresa)],
      ["Email", normalize(ficha.ds_email)],
      ["Endereço", normalize(ficha.endereco)],
      ["Telefone", normalize(ficha.telefone)],
      ["Responsável", normalize(ficha.responsavel)],
      ["Data", formatarDataPtBr(ficha.data_ficha)],
      ["Tempo de Associação", normalize(ficha.tempo_associado)],
      ["Risco", normalize(ficha.risco)],
      ["Observação", normalize(ficha.observacao)],
      ["Observações Gerais", normalize(ficha.observacoes_gerais)],
    ];

    autoTable(doc, {
      startY: 25,
      theme: "plain",
      body: dadosTopo.map(([label, valor]) => [
        { content: `${label}:`, styles: { fontStyle: "bold" } },
        valor,
      ]),
      styles: { fontSize: 10, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 140 },
      },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text("Contas Credoras", 10, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Descrição", "Valor (R$)"]],
      body:
        credoras.length > 0
          ? credoras.map((c) => [normalize(c.descricao), formatarValor(c.valor)])
          : [["-", "-"]],
      theme: "grid",
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.text("Contas Bancárias", 10, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Descrição", "Valor (R$)"]],
      body:
        bancarias.length > 0
          ? bancarias.map((c) => [normalize(c.descricao), formatarValor(c.valor)])
          : [["-", "-"]],
      theme: "grid",
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.text("Empréstimos", 10, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Descrição", "Valor (R$)"]],
      body:
        devedoras.length > 0
          ? devedoras.map((c) => [normalize(c.descricao), formatarValor(c.valor)])
          : [["-", "-"]],
      theme: "grid",
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.text(`Total Capital: ${formatarValor(totalNumerico(credoras))}`, 10, y);
    y += 6;
    doc.text(`Contas Bancárias: ${formatarValor(totalNumerico(bancarias))}`, 10, y);
    y += 6;
    doc.text(`Total Débitos: ${formatarValor(totalNumerico(devedoras))}`, 10, y);

    doc.save(`Ficha_${String(ficha.nome || "desimpedimento").replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <div className="mx-auto overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />
      <div className="space-y-6 p-5 md:p-6">
      <SearchForm onSearch={handleBuscarCpf}>
        <div>
          <label className={labelClass}>CPF do empregado(a)</label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <SearchInput
              name="cpf"
              value={formatCpfView(form.cpf)}
              onChange={handleChange}
              placeholder="CPF (somente números)"
              className={fieldClass}
              inputMode="numeric"
              maxLength={14}
            />
            <SearchButton loading={loading} label="Pesquisar" />
          </div>

          {erroCpf && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {erroCpf}
            </div>
          )}

          {infoCpf && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {infoCpf}
            </div>
          )}
        </div>
      </SearchForm>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 md:p-5">
        <div>
          <label className={labelClass}>Tipo</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoFicha)}
            className={fieldClass}
          >
            <option value="DEVEDOR">DEVEDOR</option>
            <option value="CREDOR">CREDOR</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Sequencial</label>
          <input
            readOnly
            value={sequencial ?? "—"}
            className={readOnlyFieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Nome</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Prontuário</label>
          <input
            name="prontuario"
            value={form.prontuario}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Empresa</label>
          <input
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>E-mail</label>
          <input
            name="ds_email"
            value={form.ds_email}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Endereço</label>
          <input
            name="endereco"
            value={form.endereco}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Telefone</label>
          <input
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Risco</label>
          <input
            name="risco"
            value={form.risco}
            onChange={handleChange}
            className={fieldClass}
            placeholder="Ex: R16"
          />
        </div>

        <div>
          <label className={labelClass}>Tempo de associação</label>
          <input
            name="tempo_associado"
            value={form.tempo_associado}
            readOnly
            className={readOnlyFieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Data da ficha</label>
          <input
            name="data_ficha"
            type="date"
            value={form.data_ficha}
            readOnly
            className={readOnlyFieldClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Responsável</label>
          <input
            name="responsavel"
            value={form.responsavel}
            readOnly
            className={readOnlyFieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observação</label>
        <textarea
          name="observacao"
          value={form.observacao}
          onChange={handleChange}
          className={textareaClass}
          rows={3}
          placeholder="Observações da ficha"
        />
      </div>

      <div>
        <label className={labelClass}>Observações gerais</label>
        <textarea
          name="observacoes_gerais"
          value={form.observacoes_gerais}
          onChange={handleChange}
          className={textareaClass}
          rows={3}
          placeholder="Observações complementares"
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-amber-800 md:text-base">
          Preencha todos os campos de valores com vírgula.
          <br />
          Exemplo: 2500,60
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="mb-3 text-base font-semibold text-title">Empréstimos</h3>
        {contasDevedoras.map((c, i) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              placeholder="Contrato / Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("devedora", i, "descricao", e.target.value)}
              className={fieldClass}
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("devedora", i, "valor", e.target.value)}
              className={fieldClass}
            />
          </div>
        ))}
        <button
          onClick={() => addConta("devedora")}
          className={addButtonClass}
        >
          + Adicionar conta devedora
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="mb-3 text-base font-semibold text-title">Contas Credoras</h3>
        {contasCredoras.map((c, i) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              placeholder="Tipo / Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("credora", i, "descricao", e.target.value)}
              className={fieldClass}
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("credora", i, "valor", e.target.value)}
              className={fieldClass}
            />
          </div>
        ))}
        <button
          onClick={() => addConta("credora")}
          className={addButtonClass}
        >
          + Adicionar conta credora
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="mb-3 text-base font-semibold text-title">Contas Bancárias (a subtrair do capital)</h3>
        {contasBancarias.map((c, i) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              placeholder="Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("bancaria", i, "descricao", e.target.value)}
              className={fieldClass}
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("bancaria", i, "valor", e.target.value)}
              className={fieldClass}
            />
          </div>
        ))}
        <button
          onClick={() => addConta("bancaria")}
          className={addButtonClass}
        >
          + Adicionar conta bancária
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <span className={labelClass}>Total Capital</span>
          <p className="text-xl font-bold text-emerald-800">{totalFormatado(contasCredoras)}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <span className={labelClass}>Contas Bancárias</span>
          <p className="text-xl font-bold text-sky-800">{totalFormatado(contasBancarias)}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <span className={labelClass}>Total de Débitos</span>
          <p className="text-xl font-bold text-red-800">{totalFormatado(contasDevedoras)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 pt-5">
        <button
          onClick={handleSalvar}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
        >
          Salvar ficha
        </button>
      </div>
      </div>

      {/*<div className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Fichas Salvas</h3>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-2">Tipo</th>
                  <th className="border px-2 py-2">Sequencial</th>
                  <th className="border px-2 py-2">Nome</th>
                  <th className="border px-2 py-2">CPF</th>
                  <th className="border px-2 py-2">Email</th>
                  <th className="border px-2 py-2">Empresa</th>
                  <th className="border px-2 py-2">Data</th>
                  <th className="border px-2 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((ficha) => (
                  <tr key={ficha.ID_FICHAS} className="hover:bg-gray-50">
                    <td className="border px-2 py-2">{ficha.TIPO_FICHA}</td>
                    <td className="border px-2 py-2">{ficha.SEQUENCIAL}</td>
                    <td className="border px-2 py-2">{ficha.NOME}</td>
                    <td className="border px-2 py-2">{ficha.CPF}</td>
                    <td className="border px-2 py-2">{ficha.DS_EMAIL}</td>
                    <td className="border px-2 py-2">{ficha.EMPRESA}</td>
                    <td className="border px-2 py-2">{formatarDataPtBr(ficha.DATA_FICHA)}</td>
                    <td className="border px-2 py-2">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          onClick={() => handleEditar(ficha)}
                          className="text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <SquarePen size={18} />
                          Editar
                        </button>

                        <button
                          onClick={() => handleExcluir(ficha.ID_FICHAS)}
                          className="text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={18} />
                          Excluir
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const [devedoras, credoras, bancarias] = await Promise.all([
                                listarContasDevedoras(ficha.ID_FICHAS),
                                listarContasCredoras(ficha.ID_FICHAS),
                                listarContasBancarias(ficha.ID_FICHAS),
                              ]);

                              await gerarPdfFicha(
                                {
                                  nome: ficha.NOME,
                                  cpf: ficha.CPF,
                                  prontuario: ficha.PRONTUARIO,
                                  empresa: ficha.EMPRESA,
                                  endereco: ficha.ENDERECO,
                                  telefone: ficha.TELEFONE,
                                  ds_email: ficha.DS_EMAIL,
                                  responsavel: ficha.RESPONSAVEL,
                                  data_ficha: ficha.DATA_FICHA,
                                  tempo_associado: ficha.TEMPO_ASSOCIADO,
                                  risco: ficha.RISCO,
                                  observacao: ficha.OBSERVACAO,
                                  observacoes_gerais: ficha.OBSERVACOES_GERAIS,
                                  sequencial: ficha.SEQUENCIAL,
                                },
                                devedoras.map((item: any) => ({
                                  descricao: item.DESCRICAO ?? item.descricao ?? "",
                                  valor: item.VALOR ?? item.valor ?? "",
                                })),
                                credoras.map((item: any) => ({
                                  descricao: item.DESCRICAO ?? item.descricao ?? "",
                                  valor: item.VALOR ?? item.valor ?? "",
                                })),
                                bancarias.map((item: any) => ({
                                  descricao: item.DESCRICAO ?? item.descricao ?? "",
                                  valor: item.VALOR ?? item.valor ?? "",
                                }))
                              );
                            } catch (error) {
                              console.error("Erro ao gerar PDF:", error);
                              alert("Erro ao gerar PDF.");
                            }
                          }}
                          className="text-green-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowDownToLine size={18} />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>*/}

      {fichaEditando && (
        <ModalEditarFicha
          form={form}
          contasCredoras={contasCredoras}
          contasDevedoras={contasDevedoras}
          contasBancarias={contasBancarias}
          setContasCredoras={setContasCredoras}
          setContasDevedoras={setContasDevedoras}
          setContasBancarias={setContasBancarias}
          onChange={handleChange}
          onClose={() => setFichaEditando(null)}
          onSave={async () => {
            try {
              await editarFicha({
                id: fichaEditando.ID_FICHAS,
                ...form,
                tipo: (form.tipo || tipo) as "DEVEDOR" | "CREDOR",
                contasDevedoras,
                contasCredoras,
                contasBancarias,
              });

              alert("Ficha atualizada!");
              setFichaEditando(null);
              await carregarFichas();
            } catch (error) {
              console.error(error);
              alert("Erro ao atualizar ficha.");
            }
          }}
        />
      )}
    </div>
  );
}
