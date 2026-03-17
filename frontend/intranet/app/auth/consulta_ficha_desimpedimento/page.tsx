"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import ModalEditarFicha from "@/components/modal-editar-ficha/modal-editar-ficha";
import {
  FaFileSignature,
  FaUserTie,
  FaBuilding,
  FaCalendarAlt,
  FaPencilAlt,
  FaFilePdf,
  FaTrash,
} from "react-icons/fa";
import { ArrowDownToLine } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
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

export default function ConsultaFichaDesimpedimentoPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FichaRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [fichaEditando, setFichaEditando] = useState<FichaRow | null>(null);
  const [tipo, setTipo] = useState<TipoFicha>("DEVEDOR");
  const [form, setForm] = useState<FichaFormData>(initialForm);
  const [contasCredoras, setContasCredoras] = useState<Conta[]>([]);
  const [contasDevedoras, setContasDevedoras] = useState<Conta[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Conta[]>([]);

  const debouncedQ = useDebouncedValue(q, 300);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await listarFichas();
        const lista = Array.isArray(data) ? data : [];

        const termo = debouncedQ.trim().toLowerCase();

        const filtradas = !termo
          ? lista
          : lista.filter((f) =>
              [
                f.TIPO_FICHA,
                String(f.SEQUENCIAL ?? ""),
                f.NOME,
                f.CPF,
                f.DS_EMAIL,
                f.EMPRESA,
                f.PRONTUARIO,
                f.RESPONSAVEL,
                f.RISCO,
              ]
                .filter(Boolean)
                .some((valor) => String(valor).toLowerCase().includes(termo))
            );

        setRows(filtradas);
      } catch (e: any) {
        setError(String(e?.message || "Erro ao carregar"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [debouncedQ, refreshKey]);

  const total = useMemo(() => rows.length, [rows]);

  const totalDevedores = useMemo(
    () => rows.filter((r) => String(r.TIPO_FICHA || "").toUpperCase() === "DEVEDOR").length,
    [rows]
  );

  const totalCredores = useMemo(
    () => rows.filter((r) => String(r.TIPO_FICHA || "").toUpperCase() === "CREDOR").length,
    [rows]
  );

  const totalComResponsavel = useMemo(
    () =>
      rows.filter(
        (r) => !!r.RESPONSAVEL && String(r.RESPONSAVEL).trim() !== ""
      ).length,
    [rows]
  );

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
    const logoBase64 = await getImageAsBase64("/logo-pdf.png");

    const normalize = (v: any) => (v && String(v).trim() !== "" ? v : "-");

    const formatarValor = (valor: any): string => {
      const numero = parseValorMonetario(valor);
      return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    };

    doc.addImage(logoBase64, "PNG", 10, 7, 30, 15);
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

  async function handleExcluir(id: string) {
    const confirmar = window.confirm("Deseja realmente excluir esta ficha?");
    if (!confirmar) return;

    try {
      await excluirFicha(id);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Erro ao excluir ficha:", error);
      alert("Erro ao excluir ficha.");
    }
  }

  async function handleOpenEdit(ficha: FichaRow) {
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

  function handleCloseEdit() {
    setFichaEditando(null);
  }

  function handleRefreshAfterEdit() {
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <BackButton />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700">
              <FaFileSignature size={16} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-gray-900">
                Consulta de Fichas de Desimpedimento
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Consulte as fichas cadastradas e acompanhe um resumo rápido dos registros.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-105">
          <label className="text-xs font-medium text-gray-600">Buscar</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: nome, CPF, empresa, sequencial, responsável..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total encontrado</span>
            <FaFileSignature className="text-secondary" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : total}</p>
          <p className="mt-1 text-xs text-gray-500">Registros retornados na busca atual</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Devedores</span>
            <FaUserTie className="text-secondary" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalDevedores}</p>
          <p className="mt-1 text-xs text-gray-500">Fichas com tipo devedor</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Credores</span>
            <FaBuilding className="text-secondary" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalCredores}</p>
          <p className="mt-1 text-xs text-gray-500">Fichas com tipo credor</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Com responsável</span>
            <FaCalendarAlt className="text-secondary" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">{loading ? "..." : totalComResponsavel}</p>
          <p className="mt-1 text-xs text-gray-500">Registros com responsável informado</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Lista de Fichas
          </h2>
          <div className="text-xs text-gray-500">
            {loading ? "Carregando..." : `${total} encontradas`}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="mt-6 text-center text-sm text-gray-500">
            Nenhuma ficha encontrada.
          </div>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="min-w-225 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Sequencial</th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">CPF</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Empresa</th>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Responsável</th>
                  <th className="px-3 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={String(r.ID_FICHAS)}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="px-3 py-3">
                      {r.TIPO_FICHA ? (
                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {r.TIPO_FICHA}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-3 py-3 font-semibold text-gray-900">
                      {r.SEQUENCIAL ?? "-"}
                    </td>

                    <td className="px-3 py-3 text-gray-700">{r.NOME ?? "-"}</td>

                    <td className="px-3 py-3 text-gray-700">{r.CPF ?? "-"}</td>

                    <td className="px-3 py-3 text-gray-700">{r.DS_EMAIL ?? "-"}</td>

                    <td className="px-3 py-3 text-gray-700">{r.EMPRESA ?? "-"}</td>

                    <td className="px-3 py-3 text-gray-700">
                      {formatarDataPtBr(r.DATA_FICHA)}
                    </td>

                    <td className="px-3 py-3 text-gray-700">{r.RESPONSAVEL ?? "-"}</td>

                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                          title="Editar ficha"
                        >
                          <FaPencilAlt size={13} className="hover:text-secondary" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluir(String(r.ID_FICHAS))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-red-700 cursor-pointer"
                          title="Excluir ficha"
                        >
                          <FaTrash size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const [devedoras, credoras, bancarias] = await Promise.all([
                                listarContasDevedoras(r.ID_FICHAS),
                                listarContasCredoras(r.ID_FICHAS),
                                listarContasBancarias(r.ID_FICHAS),
                              ]);

                              await gerarPdfFicha(
                                {
                                  nome: r.NOME,
                                  cpf: r.CPF,
                                  prontuario: r.PRONTUARIO,
                                  empresa: r.EMPRESA,
                                  endereco: r.ENDERECO,
                                  telefone: r.TELEFONE,
                                  ds_email: r.DS_EMAIL,
                                  responsavel: r.RESPONSAVEL,
                                  data_ficha: r.DATA_FICHA,
                                  tempo_associado: r.TEMPO_ASSOCIADO,
                                  risco: r.RISCO,
                                  observacao: r.OBSERVACAO,
                                  observacoes_gerais: r.OBSERVACOES_GERAIS,
                                  sequencial: r.SEQUENCIAL,
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-emerald-700 cursor-pointer"
                          title="Gerar PDF"
                        >
                          <FaFilePdf size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          * Dados carregados do Oracle via intranet-api. Ordenação mostrando os últimos cadastrados primeiro.
        </p>
      </div>

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
          onClose={handleCloseEdit}
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
              handleCloseEdit();
              handleRefreshAfterEdit();
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

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}