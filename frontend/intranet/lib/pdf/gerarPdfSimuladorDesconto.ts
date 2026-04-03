import jsPDF from "jspdf";

type Linha = {
  label: string;
  desconto: number;
};

type PdfData = {
  nome: string;
  cpf: string;
  anosAssociacao: Linha;
  correntistaSelects: Linha[];
  regime: Linha[];
  outrosProdutos: Linha[];
  tipoEmprestimo: string;
  valorSolicitado: string;
  quantidadeParcelas: string;
  risco: string;
  seguro: boolean;
  avalista: boolean;
  outros: string;
  divida: string;
  capital: string;
  descontoSolicitacao: string;
  taxaBruta: string;
  descontoTotal: string;
  taxaFinal: string;
  cidade: string;
  data: string;
  atendente: string;
};

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");
  const b = await r.blob();

  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}

function drawTable(
  doc: jsPDF,
  title: string,
  rows: Linha[],
  x: number,
  y: number,
  width: number
) {
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.rect(x, y, width, 18);
  doc.text("Tipo", x + 8, y + 12);
  doc.text("Desconto", x + width - 70, y + 12);
  y += 18;

  doc.setFont("helvetica", "normal");

  const finalRows = rows.length ? rows : [{ label: "—", desconto: 0 }];

  finalRows.forEach((row) => {
    doc.rect(x, y, width, 18);
    doc.text(row.label || "—", x + 8, y + 12);
    doc.text(String(row.desconto ?? ""), x + width - 60, y + 12);
    y += 18;
  });

  return y + 12;
}

export async function gerarPdfSimuladorDesconto(o: PdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const colW = pageW - margin * 2;
  let y = 34;

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    doc.addImage(dataUrl, "PNG", 30, y - 8, 120, 60);
    y += 64;
  } catch {
    y += 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Simulador de desconto", pageW / 2, y, { align: "center" });
  y += 26;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${o.nome}`, margin, y);
  doc.text(`CPF/CNPJ: ${o.cpf}`, pageW - margin, y, { align: "right" });
  y += 24;

  y = drawTable(doc, "Anos de associação ininterruptos", [o.anosAssociacao], margin, y, colW);

  y = drawTable(doc, "Correntista Sicoob", o.correntistaSelects, margin, y, colW);

  y = drawTable(doc, "Regime de trabalho", o.regime, margin, y, colW);

  y = drawTable(doc, "Outros produtos", o.outrosProdutos, margin, y, colW);

  doc.setFont("helvetica", "bold");
  doc.text("Empréstimo", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Tipo de empréstimo: ${o.tipoEmprestimo}`, margin, y);
  doc.text(`Valor solicitado: ${o.valorSolicitado}`, pageW - margin, y, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text("Classificação do risco para desconto", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Quantidade de parcelas: ${o.quantidadeParcelas}`, margin, y);
  doc.text(`Risco: ${o.risco}`, pageW - margin, y, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text("Garantias", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Seguro: ${o.seguro ? "Sim" : "Não"}`, margin, y);
  doc.text(`Avalista: ${o.avalista ? "Sim" : "Não"}`, margin + 160, y);
  doc.text(`Outros: ${o.outros || "Sem"}`, margin + 310, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text("Dados sobre conta", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Dívida: ${o.divida}`, margin, y);
  doc.text(`Capital: ${o.capital}`, margin + 180, y);
  doc.text(`Desconto sobre solicitação: ${o.descontoSolicitacao}`, margin + 340, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text("Taxas", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  if (o.tipoEmprestimo === "pessoal") {
    doc.text(`Desconto total %: ${o.descontoTotal}`, margin, y);
  } else {
    doc.text(`Taxa Bruta %: ${o.taxaBruta}`, margin, y);
    doc.text(`Desconto total %: ${o.descontoTotal}`, margin + 180, y);
    doc.text(`Taxa Final %: ${o.taxaFinal}`, margin + 360, y);
  }
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.text("Dados do atendimento", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Cidade: ${o.cidade}`, margin, y);
  doc.text(`Data: ${o.data}`, margin + 220, y);
  doc.text(`Atendente: ${o.atendente}`, margin + 360, y);
  y += 50;

  const lineW = 190;
  doc.line(margin, y, margin + lineW, y);
  doc.line(pageW - margin - lineW, y, pageW - margin, y);
  y += 16;
  doc.text(o.nome, margin + lineW / 2, y, { align: "center" });
  doc.text(o.atendente, pageW - margin - lineW / 2, y, { align: "center" });
  y += 40;
  doc.line(margin, y, margin + lineW, y);
  y += 16;
  doc.text("Validação", margin + lineW / 2, y, { align: "center" });

  doc.save(`simulador_desconto_${sanitize(o.nome || "associado")}.pdf`);
}