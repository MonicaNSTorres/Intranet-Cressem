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
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const colW = pageW - margin * 2;
  let y = 24;

  const previsulBlue = { r: 0, g: 94, b: 163 };
  const previsulDark = { r: 0, g: 54, b: 95 };
  const previsulLight = { r: 236, g: 243, b: 250 };

  const bottomLimit = () => pageH - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  const safeText = (value?: string) => String(value || "-").trim() || "-";

  try {
    const logoUrl = "/logoPrevisul2.png?v=2";
    const logo = await loadImageDataURL(logoUrl);

    const maxW = 118;
    const maxH = 40;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    ensureSpace(h + 10);
    doc.addImage(logo.dataUrl, "PNG", margin, y, w, h);
    y += h + 8;
  } catch {
    y += 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TERMO DE ADESÃO AO CONTRATO PRESTAMISTA", pageW / 2, y, {
    align: "center",
  });
  y += 20;

  function drawSectionHeader(title: string) {
    ensureSpace(20);

    doc.setFillColor(previsulLight.r, previsulLight.g, previsulLight.b);
    doc.setDrawColor(previsulBlue.r, previsulBlue.g, previsulBlue.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, colW, 18, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(previsulDark.r, previsulDark.g, previsulDark.b);
    doc.text(title.toUpperCase(), margin + 7, y + 12);

    y += 21;
    doc.setTextColor(0, 0, 0);
  }

  function drawFieldBox(
    label: string,
    value: string,
    x: number,
    boxY: number,
    w: number,
    h = 24
  ) {
    doc.setDrawColor(206, 219, 232);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY, w, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(72, 96, 121);
    doc.text(label.toUpperCase(), x + 4, boxY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    const lines = doc.splitTextToSize(safeText(value), w - 8);
    doc.text(lines.slice(0, 1), x + 4, boxY + 18);

    doc.setTextColor(0, 0, 0);
  }

  function drawFieldsRow(
    fields: Array<{ label: string; value: string; width: number }>,
    h = 24
  ) {
    ensureSpace(h + 2);
    let x = margin;

    fields.forEach((field) => {
      drawFieldBox(field.label, field.value, x, y, field.width, h);
      x += field.width;
    });

    y += h;
  }

  drawSectionHeader("Dados do proponente");

  drawFieldsRow([
    { label: "CPF", value: o.cpf, width: 150 },
    { label: "Nome", value: o.nome, width: colW - 150 },
  ]);

  drawFieldsRow([
    { label: "Nascimento", value: o.nascimento, width: colW * 0.45 },
    { label: "Idade", value: o.idadeTexto, width: colW * 0.55 },
  ]);

  y += 6;
  drawSectionHeader("Adesão ao seguro");

  const introChunks: Array<{ text: string; bold: boolean }> = [
    { text: safeText(o.nome), bold: true },
    { text: ", pessoa física, CPF: ", bold: false },
    { text: safeText(o.cpf), bold: true },
    { text: ", nascido em ", bold: false },
    { text: safeText(o.nascimento), bold: true },
    { text: ", ", bold: false },
    { text: safeText(o.idadeTexto), bold: true },
    {
      text:
        ", associado à SICOOB CRESSEM - COOPERATIVA DE ECONOMIA E CRÉDITO MÚTUO DOS SERVIDORES " +
    `MUNICIPAIS DA REGIÃO METROPOLITANA DO VALE DO PARAÍBA E LITORAL NORTE, representado nos termos de seus atos ` +
        `constitutivos, formaliza pela assinatura do presente Termo, o interesse em aderir ao Contrato de Seguro Prestamista.`,
      bold: false,
    },
  ];

  const introPadding = 8;
  const richLineH = 10.6;
  const richLines = layoutRichLines(doc, introChunks, colW - introPadding * 2, 8.6);
  const introHeight = introPadding + richLines.length * richLineH + introPadding;
  ensureSpace(introHeight + 2);
  const introBoxY = y;

  doc.setDrawColor(206, 219, 232);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, introBoxY, colW, introHeight, "FD");

  doc.setFontSize(8.6);
  doc.setTextColor(30, 41, 59);
  richLines.forEach((line, lineIdx) => {
    let xCursor = margin + introPadding;
    const yLine = introBoxY + introPadding + 8 + lineIdx * richLineH;

    line.forEach((segment) => {
      doc.setFont("helvetica", segment.bold ? "bold" : "normal");
      doc.text(segment.text, xCursor, yLine);
      xCursor += segment.width;
    });
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += introHeight + 8;

  drawSectionHeader("Dados do contrato");

  drawFieldsRow([
    { label: "Proposta nº", value: o.proposta, width: colW * 0.34 },
    { label: "Valor do empréstimo", value: o.valorEmprestimo, width: colW * 0.33 },
    { label: "Total de parcelas", value: o.totalParcelas, width: colW * 0.33 },
  ]);

  drawFieldsRow([
    { label: "Data 1ª parcela do empréstimo", value: o.dataPrimeiraParcelaEmprestimo, width: colW * 0.5 },
    { label: "Taxa de juros sobre o seguro", value: o.taxaJuros, width: colW * 0.5 },
  ]);

  drawFieldsRow([
    { label: "Valor mensal do seguro", value: o.valorMensalSeguro, width: colW * 0.5 },
    { label: "Valor total do seguro", value: o.valorTotalSeguro, width: colW * 0.5 },
  ]);

  if (o.mostrarCompetencia) {
    drawFieldsRow([
      { label: "Data 1ª parcela do seguro", value: o.dataPrimeiraParcelaSeguro, width: colW * 0.5 },
      { label: "Data da última parcela do seguro", value: o.dataUltimaParcelaSeguro, width: colW * 0.5 },
    ]);

    y += 6;
    const competência =
      "O seguro é pago por competência, ou seja, a partir da contratação, havendo assim a incidência de mais um mês de seguro, pois a primeira parcela do empréstimo vence no mês subsequente, mas tendo de estar segura a partir deste mês.";
    const compLines = doc.splitTextToSize(competência, colW - 16);
    const compLineH = 10.2;
    const compBoxH = Math.max(30, compLines.length * compLineH + 16);
    ensureSpace(compBoxH + 4);

    doc.setDrawColor(231, 200, 162);
    doc.setFillColor(255, 248, 240);
    doc.rect(margin, y, colW, compBoxH, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(previsulDark.r, previsulDark.g, previsulDark.b);
    compLines.forEach((line: string, idx: number) => {
      doc.text(line, margin + 8, y + 12 + idx * compLineH);
    });
    doc.setTextColor(0, 0, 0);
    y += compBoxH + 8;
  }

  drawSectionHeader("Declaração");

  const declaracao =
    "A formalização da adesão individual ao seguro será realizada por intermédio do preenchimento e assinatura, pelo proponente, da Proposta de Adesão.";
  const declLines = doc.splitTextToSize(declaracao, colW - 16);
  const declLineH = 10.2;
  const declBoxH = Math.max(28, declLines.length * declLineH + 16);
  ensureSpace(declBoxH + 4);

  doc.setDrawColor(206, 219, 232);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, colW, declBoxH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  declLines.forEach((line: string, idx: number) => {
    doc.text(line, margin + 8, y + 12 + idx * declLineH);
  });
  y += declBoxH + 8;

  drawSectionHeader("Atendimento e assinaturas");

  drawFieldsRow([
    { label: "Cidade do atendimento", value: o.cidadeAtendimento, width: colW * 0.65 },
    { label: "Dia do atendimento", value: o.dataHoje, width: colW * 0.35 },
  ]);

  ensureSpace(95);
  y += 44;

  const assinaturaW = 220;
  const gapAssinatura = 26;
  const totalAssinaturasW = assinaturaW * 2 + gapAssinatura;
  const assinaturaX1 = (pageW - totalAssinaturasW) / 2;
  const assinaturaX2 = assinaturaX1 + assinaturaW + gapAssinatura;

  doc.setDrawColor(previsulBlue.r, previsulBlue.g, previsulBlue.b);
  doc.setLineWidth(0.7);
  doc.line(assinaturaX1, y, assinaturaX1 + assinaturaW, y);
  doc.line(assinaturaX2, y, assinaturaX2 + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(previsulDark.r, previsulDark.g, previsulDark.b);
  doc.text(safeText(o.assinaturaAssociado), assinaturaX1 + assinaturaW / 2, y, {
    align: "center",
  });
  doc.text("Validação", assinaturaX2 + assinaturaW / 2, y, { align: "center" });

  doc.save(`previsul_${sanitize(o.nome || "associado")}.pdf`);
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

function layoutRichLines(
  doc: jsPDF,
  chunks: Array<{ text: string; bold: boolean }>,
  maxWidth: number,
  fontSize: number
) {
  const lines: Array<Array<{ text: string; bold: boolean; width: number }>> = [];
  let currentLine: Array<{ text: string; bold: boolean; width: number }> = [];
  let currentWidth = 0;

  chunks.forEach((chunk) => {
    const tokens = chunk.text.split(/(\s+)/).filter((t) => t.length > 0);

    tokens.forEach((token) => {
      const isSpace = /^\s+$/.test(token);
      doc.setFont("helvetica", chunk.bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const tokenWidth = doc.getTextWidth(token);

      if (currentWidth + tokenWidth > maxWidth && !isSpace && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }

      if (currentLine.length === 0 && isSpace) {
        return;
      }

      currentLine.push({ text: token, bold: chunk.bold, width: tokenWidth });
      currentWidth += tokenWidth;
    });
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

async function loadImageDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");

  const b = await r.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  return {
    dataUrl,
    width: img.width,
    height: img.height,
  };
}
