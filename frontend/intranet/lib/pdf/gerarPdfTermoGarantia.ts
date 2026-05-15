import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  cpf: string;
  estadoCivil: string;
  tipoDocumento: string;
  numeroDocumento: string;
  numeroContrato: string;
  dataContrato: string;
  valorContrato: string;
  cidadeAtendimento: string;
  dataHoje: string;
  avalista: "sim" | "nao";
  prestamistaSicoob: "sim" | "nao";
  prestamistaTerceiros: "sim" | "nao";
  garantiaReal: "sim" | "nao";
};

export async function gerarPdfTermoGarantia(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const colW = pageW - margin * 2;
  let y = 24;

  const sicoobGreen = { r: 121, g: 183, b: 41 };
  const sicoobGreenDark = { r: 0, g: 54, b: 65 };
  const sicoobGreenLight = { r: 242, g: 248, b: 235 };

  const bottomLimit = () => pageH - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  const safeText = (value?: string) => String(value || "-").trim() || "-";

  try {
    const logoUrl = "/sicoob-cressem-logo.png?v=2";
    const logo = await loadImageDataURL(logoUrl);

    const maxW = 135;
    const maxH = 42;
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
  doc.text("TERMO DE OPÇÃO DE GARANTIA", pageW / 2, y, { align: "center" });
  y += 20;

  function drawSectionHeader(title: string) {
    ensureSpace(20);

    doc.setFillColor(sicoobGreenLight.r, sicoobGreenLight.g, sicoobGreenLight.b);
    doc.setDrawColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, colW, 18, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(sicoobGreenDark.r, sicoobGreenDark.g, sicoobGreenDark.b);
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
    h = 24,
    boldValue = false
  ) {
    doc.setDrawColor(210, 220, 210);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY, w, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(90, 110, 95);
    doc.text(label.toUpperCase(), x + 4, boxY + 7.5);

    doc.setFont("helvetica", boldValue ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    const lines = doc.splitTextToSize(safeText(value), w - 8);
    doc.text(lines.slice(0, 1), x + 4, boxY + 18);

    doc.setTextColor(0, 0, 0);
  }

  function drawFieldsRow(
    fields: Array<{ label: string; value: string; width: number; boldValue?: boolean }>,
    h = 24
  ) {
    ensureSpace(h + 2);
    let x = margin;

    fields.forEach((field) => {
      drawFieldBox(field.label, field.value, x, y, field.width, h, Boolean(field.boldValue));
      x += field.width;
    });

    y += h;
  }

  drawSectionHeader("Dados do proponente");

  const propW1 = Math.round(colW * 0.33);
  const propRemaining = colW - propW1;
  const propW2 = Math.round(propRemaining * 0.33);
  const propW3 = propRemaining - propW2;

  drawFieldsRow([
    { label: "CPF", value: o.cpf, width: propW1 },
    { label: "Nome", value: toUpper(o.nome), width: colW - propW1 },
  ]);

  drawFieldsRow([
    { label: "Estado civil", value: toUpper(o.estadoCivil), width: propW1 },
    { label: "Tipo de documento", value: toUpper(o.tipoDocumento), width: propW2 },
    { label: "Número do documento", value: safeText(o.numeroDocumento), width: propW3 },
  ]);

  y += 6;
  drawSectionHeader("Dados do contrato");

  const contratoW1 = Math.round(colW * 0.24);
  const contratoW2 = Math.round(colW * 0.19);
  const contratoW3 = Math.round(colW * 0.23);
  const contratoW4 = colW - contratoW1 - contratoW2 - contratoW3;
  drawFieldsRow([
    { label: "Contrato nº", value: safeText(o.numeroContrato), width: contratoW1 },
    { label: "Data do contrato", value: safeText(o.dataContrato), width: contratoW2 },
    { label: "Valor do contrato", value: safeText(o.valorContrato), width: contratoW3, boldValue: true },
    { label: "Cidade do atendimento", value: toUpper(o.cidadeAtendimento), width: contratoW4 },
  ]);

  y += 6;
  drawSectionHeader("Garantias");

  const tableX = margin;
  const tableY = y;
  const tableW = colW;
  const rowH = 24;
  const headerH = 24;
  const colGarantia = tableW * 0.72;
  const colSim = tableW * 0.14;
  const colNao = tableW - colGarantia - colSim;

  const garantias = [
    { label: "Avalista?", value: o.avalista },
    { label: "Seguro Prestamista no Sicoob Cressem?", value: o.prestamistaSicoob },
    { label: "Seguro Prestamista de Terceiros?", value: o.prestamistaTerceiros },
    { label: "Garantia Real?", value: o.garantiaReal },
  ];

  const tableH = headerH + garantias.length * rowH;
  ensureSpace(tableH + 2);

  doc.setDrawColor(210, 220, 210);
  doc.setLineWidth(0.6);
  doc.rect(tableX, tableY, tableW, tableH);

  doc.setFillColor(248, 250, 248);
  doc.rect(tableX, tableY, tableW, headerH, "FD");

  doc.line(tableX + colGarantia, tableY, tableX + colGarantia, tableY + tableH);
  doc.line(
    tableX + colGarantia + colSim,
    tableY,
    tableX + colGarantia + colSim,
    tableY + tableH
  );

  for (let i = 0; i <= garantias.length; i++) {
    doc.line(tableX, tableY + headerH + i * rowH, tableX + tableW, tableY + headerH + i * rowH);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(sicoobGreenDark.r, sicoobGreenDark.g, sicoobGreenDark.b);
  doc.text("GARANTIAS", tableX + 8, tableY + 15);
  doc.text("SIM", tableX + colGarantia + colSim / 2, tableY + 15, { align: "center" });
  doc.text("NÃO", tableX + colGarantia + colSim + colNao / 2, tableY + 15, {
    align: "center",
  });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);

  garantias.forEach((g, idx) => {
    const rowY = tableY + headerH + idx * rowH;
    doc.text(g.label, tableX + 8, rowY + 15);

    doc.setFont("helvetica", "bold");
    doc.text(g.value === "sim" ? "X" : "", tableX + colGarantia + colSim / 2, rowY + 15, {
      align: "center",
    });
    doc.text(
      g.value === "nao" ? "X" : "",
      tableX + colGarantia + colSim + colNao / 2,
      rowY + 15,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
  });

  doc.setTextColor(0, 0, 0);
  y += tableH + 8;

  drawSectionHeader("Declaração");

  const declaracaoChunks: Array<{ text: string; bold: boolean }> = [
    { text: "Eu, ", bold: false },
    { text: toUpper(o.nome), bold: true },
    { text: ", ", bold: false },
    { text: toUpper(o.estadoCivil), bold: true },
    { text: ", portador do ", bold: false },
    { text: toUpper(o.tipoDocumento), bold: true },
    { text: ": ", bold: false },
    { text: safeText(o.numeroDocumento), bold: true },
    { text: ", inscrito no CPF: ", bold: false },
    { text: safeText(o.cpf), bold: true },
    {
      text:
        ", DECLARO para os devidos fins ter feito opção da garantia, acima assinalada, referente ao Contrato nº ",
      bold: false,
    },
    { text: safeText(o.numeroContrato), bold: false },
    { text: " de ", bold: false },
    { text: safeText(o.dataContrato), bold: false },
    { text: ", no valor total de ", bold: false },
    { text: safeText(o.valorContrato), bold: true },
    {
      text:
        ". Declaro ainda estar ciente de que poderei, a qualquer tempo, mudar a garantia para qualquer outra opção acima descrita.",
      bold: false,
    },
  ];

  const declLineH = 10.2;
  const richDeclLines = layoutRichLines(doc, declaracaoChunks, colW - 16, 8.3);
  const declLinesCount = Math.max(1, richDeclLines.length);
  const declBoxH = Math.max(36, declLinesCount * declLineH + 16);
  ensureSpace(declBoxH + 4);

  doc.setDrawColor(210, 220, 210);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, colW, declBoxH, "FD");
  doc.setFontSize(8.3);
  richDeclLines.forEach((line, idx) => {
    let xCursor = margin + 8;
    const yLine = y + 12 + idx * declLineH;

    line.forEach((segment) => {
      doc.setFont("helvetica", segment.bold ? "bold" : "normal");
      doc.text(segment.text, xCursor, yLine);
      xCursor += segment.width;
    });
  });
  doc.setFont("helvetica", "normal");
  y += declBoxH + 8;

  drawSectionHeader("Atendimento e assinaturas");

  drawFieldsRow([
    { label: "Dia do atendimento", value: safeText(o.dataHoje), width: colW },
  ]);

  ensureSpace(90);
  y += 44;

  const assinaturaW = 220;
  const gapAssinatura = 26;
  const totalAssinaturasW = assinaturaW * 2 + gapAssinatura;
  const assinaturaX1 = (pageW - totalAssinaturasW) / 2;
  const assinaturaX2 = assinaturaX1 + assinaturaW + gapAssinatura;

  doc.setDrawColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
  doc.setLineWidth(0.7);
  doc.line(assinaturaX1, y, assinaturaX1 + assinaturaW, y);
  doc.line(assinaturaX2, y, assinaturaX2 + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(sicoobGreenDark.r, sicoobGreenDark.g, sicoobGreenDark.b);
  doc.text(toUpper(safeText(o.nome)), assinaturaX1 + assinaturaW / 2, y, {
    align: "center",
  });
  doc.text("Validação", assinaturaX2 + assinaturaW / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  doc.save(`termo_garantia_${sanitize(o.nome || "associado")}.pdf`);
}

function toUpper(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
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
  if (!r.ok) throw new Error("Logo não encontrada");

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
