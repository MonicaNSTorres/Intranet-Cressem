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

const initialForm: FichaFormData = {
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
  data_ficha: "",
  observacoes_gerais: "",
  responsavel: "",
  total_debitos: "",
  total_creditos: "",
  liquido_devedor: "",
  ds_email: "",
  sequencial: "",
};

export function FichaDesimpedimentoForm() {
  const [tipo, setTipo] = useState<TipoFicha>("DEVEDOR");
  const [form, setForm] = useState<FichaFormData>(initialForm);
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

      setForm((prev) => ({
        ...prev,
        nome: data.nome || "",
        cpf: data.cpf || cpfLimpo,
        prontuario: data.prontuario || "",
        empresa: data.empresa || "",
        endereco: data.endereco || "",
        nm_bairro: data.nm_bairro || "",
        nm_cidade: data.nm_cidade || "",
        nr_cep: data.nr_cep || "",
        telefone: data.telefone || "",
        ds_email: data.ds_email || "",
      }));

      setInfoCpf("Dados carregados com sucesso.");
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
      setForm(initialForm);
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
    const logoBase64 = await getImageAsBase64("/logo.png");

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
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">CPF do empregado(a)</label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            name="cpf"
            value={formatCpfView(form.cpf)}
            onChange={handleChange}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />
          <button
            onClick={handleBuscarCpf}
            disabled={loadingCpf}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
          >
            {loadingCpf ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {erroCpf && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {erroCpf}
          </div>
        )}

        {infoCpf && (
          <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
            {infoCpf}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoFicha)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="DEVEDOR">DEVEDOR</option>
            <option value="CREDOR">CREDOR</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sequencial</label>
          <input
            readOnly
            value={sequencial ?? "—"}
            className="w-full border px-3 py-2 rounded bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prontuário</label>
          <input
            name="prontuario"
            value={form.prontuario}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
          <input
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
          <input
            name="ds_email"
            value={form.ds_email}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
          <input
            name="endereco"
            value={form.endereco}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
          <input
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Risco</label>
          <input
            name="risco"
            value={form.risco}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Ex: R16"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tempo de associação</label>
          <input
            name="tempo_associado"
            value={form.tempo_associado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data da ficha</label>
          <input
            name="data_ficha"
            type="date"
            value={form.data_ficha}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
          <input
            name="responsavel"
            value={form.responsavel}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
        <textarea
          name="observacao"
          value={form.observacao}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          rows={3}
          placeholder="Observações da ficha"
        />
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">Observações gerais</label>
        <textarea
          name="observacoes_gerais"
          value={form.observacoes_gerais}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          rows={3}
          placeholder="Observações complementares"
        />
      </div>

      <div className="mt-6 rounded-lg border bg-gray-50 px-4 py-3 text-center">
        <p className="text-sm md:text-base font-medium text-gray-700">
          Preencha todos os campos de valores com vírgula.
          <br />
          Exemplo: 2500,60
        </p>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Empréstimos</h3>
        {contasDevedoras.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input
              placeholder="Contrato / Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("devedora", i, "descricao", e.target.value)}
              className="border px-2 py-2 rounded"
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("devedora", i, "valor", e.target.value)}
              className="border px-2 py-2 rounded"
            />
          </div>
        ))}
        <button
          onClick={() => addConta("devedora")}
          className="text-secondary text-md font-semibold mt-1 hover:text-primary cursor-pointer"
        >
          + Adicionar conta devedora
        </button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Contas Credoras</h3>
        {contasCredoras.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input
              placeholder="Tipo / Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("credora", i, "descricao", e.target.value)}
              className="border px-2 py-2 rounded"
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("credora", i, "valor", e.target.value)}
              className="border px-2 py-2 rounded"
            />
          </div>
        ))}
        <button
          onClick={() => addConta("credora")}
          className="text-secondary text-md font-semibold mt-1 hover:text-primary cursor-pointer"
        >
          + Adicionar conta credora
        </button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Contas Bancárias (a subtrair do capital)</h3>
        {contasBancarias.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input
              placeholder="Descrição"
              value={c.descricao}
              onChange={(e) => updateConta("bancaria", i, "descricao", e.target.value)}
              className="border px-2 py-2 rounded"
            />
            <input
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={(e) => updateConta("bancaria", i, "valor", e.target.value)}
              className="border px-2 py-2 rounded"
            />
          </div>
        ))}
        <button
          onClick={() => addConta("bancaria")}
          className="text-secondary text-md font-semibold mt-1 hover:text-primary cursor-pointer"
        >
          + Adicionar conta bancária
        </button>
      </div>

      <div className="mt-6 font-medium space-y-1">
        <p className="text-lg font-semibold">Total Capital: {totalFormatado(contasCredoras)}</p>
        <p className="text-lg font-semibold">Contas Bancárias: {totalFormatado(contasBancarias)}</p>
        <p className="text-lg font-semibold">Total de Débitos: {totalFormatado(contasDevedoras)}</p>
      </div>

      <div className="pt-5 border-t mt-6 flex items-center justify-end">
        <button
          onClick={handleSalvar}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-6 py-2 rounded shadow"
        >
          Salvar ficha
        </button>
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