import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  cpf: string;
  nascimento: string;
  idadeTexto: string;
  proposta: string;
  valorEmprestimo: string;
  totalParcelas: string;
  dataPrimeiraParcelaEmprestimo: string;
  valorMensalSeguro: string;
  valorTotalSeguro: string;
  taxaJuros: string;
  dataPrimeiraParcelaSeguro: string;
  dataUltimaParcelaSeguro: string;
  cidadeAtendimento: string;
  dataHoje: string;
  mostrarCompetencia: boolean;
  assinaturaAssociado: string;
};

export async function gerarPdfPrevisul(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 50;
  const colW = pageW - margin * 2;
  let y = 40;

  const bottomLimit = () => doc.internal.pageSize.getHeight() - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  try {
    const logoUrl = "/logoPrevisul2.png";
    const dataUrl = await toDataURL(logoUrl);
    const w = 90;
    const h = w * 0.6;

    ensureSpace(h + 20);
    doc.addImage(dataUrl, "PNG", 30, y - 8, w, h);
    y = y - 8 + h + 22;
  } catch {
    ensureSpace(36);
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE ADESÃO AO CONTRATO PRESTAMISTA", pageW / 2, y, {
    align: "center",
  });
  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const intro = `${o.nome}, pessoa física, CPF: ${o.cpf}, nascido em ${o.nascimento}, ${o.idadeTexto || "Idade"}, associado à SICOOB CRESSEM - COOPERATIVA DE ECONOMIA E CRÉDITO MÚTUO DOS SERVIDORES MUNICIPAIS DA REGIÃO METROPOLITANA DO VALE DO PARAÍBA E LITORAL NORTE, representado nos termos de seus atos constitutivos, formaliza pela assinatura do presente Termo, o interesse em aderir ao Contrato de Seguro Prestamista.`;

  const introLines = doc.splitTextToSize(intro, colW);
  introLines.forEach((ln: string) => {
    ensureSpace(14);
    doc.text(ln, margin, y);
    y += 14;
  });

  y += 12;

  drawField(doc, "Proposta nº", o.proposta, margin, y);
  y += 18;
  drawField(doc, "Valor do empréstimo", o.valorEmprestimo, margin, y);
  y += 18;
  drawField(doc, "Total de parcelas", o.totalParcelas, margin, y);
  y += 18;
  drawField(doc, "Data 1ª parcela empréstimo", o.dataPrimeiraParcelaEmprestimo, margin, y);
  y += 28;

  drawField(doc, "Valor mensal do seguro", o.valorMensalSeguro, margin, y);
  y += 18;
  drawField(doc, "Valor total do seguro", o.valorTotalSeguro, margin, y);
  y += 18;
  drawField(doc, "Porcentagem de juros sobre o seguro", o.taxaJuros, margin, y);
  y += 24;

  if (o.mostrarCompetencia) {
    drawField(doc, "Data 1ª parcela seguro", o.dataPrimeiraParcelaSeguro, margin, y);
    y += 18;
    drawField(doc, "Data última parcela seguro", o.dataUltimaParcelaSeguro, margin, y);
    y += 24;

    const competencia =
      "O seguro é pago por competência, ou seja, a partir da contratação, havendo assim a incidência de mais um mês de seguro, pois a primeira parcela do empréstimo vence no mês subsequente, mas tendo de estar segura a partir deste mês.";

    const compLines = doc.splitTextToSize(competencia, colW);
    compLines.forEach((ln: string) => {
      ensureSpace(14);
      doc.text(ln, margin, y);
      y += 14;
    });
    y += 10;
  }

  const textoFinal =
    "A formalização da adesão individual ao seguro será realizada por intermédio do preenchimento e assinatura, pelo proponente, da Proposta de Adesão.";

  const finalLines = doc.splitTextToSize(textoFinal, colW);
  finalLines.forEach((ln: string) => {
    ensureSpace(14);
    doc.text(ln, margin, y);
    y += 14;
  });

  y += 20;
  drawField(doc, "Cidade do atendimento", o.cidadeAtendimento, margin, y);
  y += 18;
  drawField(doc, "Data de hoje", o.dataHoje, margin, y);
  y += 50;

  const assinaturaW = 300;
  const x1 = (pageW - assinaturaW) / 2;
  const x2 = x1 + assinaturaW;

  doc.line(x1, y, x2, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text(o.assinaturaAssociado || "Assinatura do Contratante", pageW / 2, y, {
    align: "center",
  });

  y += 36;
  doc.line(x1, y, x2, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text("Validação", pageW / 2, y, { align: "center" });

  doc.save(`previsul_${sanitize(o.nome || "associado")}.pdf`);
}

function drawField(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(value || "-", x + doc.getTextWidth(`${label}:`) + 6, y);
}

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