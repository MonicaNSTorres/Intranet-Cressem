import jsPDF from "jspdf";

export type GerarAntecipacaoCapitalPdfData = {
  cpf: string;
  nome: string;
  integralizacao: string;
  taxa: string;
  cidade: string;
  total: string;
};

type FieldBox = {
  label: string;
  value: string;
  width: number;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

const safeText = (value?: string, fallback = "-") =>
  String(value || "").trim() || fallback;

const onlyDigits = (value = "") => value.replace(/\D/g, "");

const maskCpf = (value = "") => {
  const s = onlyDigits(value).slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
};

function getDataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

export async function pdfGerarAntecipacaoCapital(
  data: GerarAntecipacaoCapitalPdfData
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 28;
  const contentW = pageW - margin * 2;
  let y = 22;

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png");
    const maxW = 135;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, logo.type, margin, y, w, h, undefined, "FAST");
    y += h + 8;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("SOLICITAÇÃO DE ANTECIPAÇÃO DE CAPITAL", pageW / 2, y, {
    align: "center",
  });
  y += 24;

  drawSectionHeader(doc, "Dados do associado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(data.nome).toUpperCase(), width: contentW * 0.68 },
    { label: "CPF", value: maskCpf(data.cpf), width: contentW * 0.32 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Valores da antecipação", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Integralização", value: safeText(data.integralizacao), width: contentW / 3 },
    { label: "Taxa de manutenção", value: safeText(data.taxa), width: contentW / 3 },
    { label: "Total", value: safeText(data.total), width: contentW / 3 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Solicitação", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: safeText(data.nome).toUpperCase(), bold: true },
    { text: ", sob nº de CPF: " },
    { text: maskCpf(data.cpf), bold: true },
    {
      text:
        ", solicito para o Sicoob Cressem a possibilidade de creditar na conta corrente da cooperativa o valor referente à integralização de ",
    },
    { text: `${safeText(data.integralizacao)} `, bold: true },
    { text: "e a taxa de manutenção " },
    { text: `${safeText(data.taxa)}, `, bold: true },
    { text: "inicial avulsa, dando-se o valor de " },
    { text: `${safeText(data.total)}. `, bold: true },
    {
      text:
        "Permitindo assim, que ocorra a minha associação à cooperativa antecipadamente.",
    },
    {
      text:
        "\n\nEstou ciente que o valor se refere à uma antecipação em caráter excepcional, e que o valor escolhido será descontado em folha a partir da data da associação.",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Local e data",
      value: `${safeText(data.cidade)}, ${getDataHoje()}.`,
      width: contentW,
    },
  ]);

  y += 58;
  const assinaturaW = 280;
  const assinaturaX = (pageW - assinaturaW) / 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(data.nome).toUpperCase(), pageW / 2, y, { align: "center" });

  doc.save(`antecipacao_capital_${sanitizeFileName(data.nome || "associado")}.pdf`);
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, w: number) {
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setDrawColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.setLineWidth(0.55);
  doc.rect(x, y, w, 16, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(title.toUpperCase(), x + 6, y + 11);
  doc.setTextColor(0, 0, 0);
}

function drawFieldsRow(doc: jsPDF, y: number, x: number, totalW: number, fields: FieldBox[]) {
  const h = 22;
  let cursorX = x;

  fields.forEach((field, idx) => {
    const w = idx === fields.length - 1 ? x + totalW - cursorX : field.width;
    drawFieldBox(doc, cursorX, y, w, h, field.label, field.value);
    cursorX += w;
  });

  return y + h;
}

function drawFieldBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(90, 110, 95);
  doc.text(label.toUpperCase(), x + 4, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(safeText(value), w - 8).slice(0, 1);
  doc.text(lines, x + 4, y + 17.5, { lineHeightFactor: 1.05 });
  doc.setTextColor(0, 0, 0);
}

function drawParagraphBox(
  doc: jsPDF,
  y: number,
  x: number,
  w: number,
  parts: Array<{ text: string; bold?: boolean }>
) {
  const padding = 7;
  const lineHeight = 10.2;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(8.4);
  const tokens = parts.flatMap((part) => {
    const paragraphs = part.text.split("\n");
    return paragraphs.flatMap((paragraph, index) => {
      const pieces = paragraph.match(/\S+\s*/g) || [paragraph];
      const mapped = pieces.map((piece) => ({ text: piece, bold: part.bold, breakLine: false }));
      if (index < paragraphs.length - 1) {
        mapped.push({ text: "", bold: false, breakLine: true });
      }
      return mapped;
    });
  });

  const lines: Array<Array<{ text: string; bold?: boolean }>> = [];
  let currentLine: Array<{ text: string; bold?: boolean }> = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
    if ("breakLine" in token && token.breakLine) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      return;
    }

    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    const tokenWidth = doc.getTextWidth(token.text);
    if (currentWidth + tokenWidth > maxLineWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
    currentLine.push(token);
    currentWidth += tokenWidth;
  });

  if (currentLine.length > 0) lines.push(currentLine);

  const h = Math.max(48, lines.length * lineHeight + padding * 2);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + padding + 7;
  lines.forEach((line) => {
    let cursorX = x + padding;
    line.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(15, 23, 42);
      doc.text(token.text, cursorX, textY);
      cursorX += doc.getTextWidth(token.text);
    });
    textY += lineHeight;
  });

  doc.setTextColor(0, 0, 0);
  return y + h;
}

async function loadImageDataURL(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Logo não encontrada");

  const blob = await response.blob();
  const originalDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = originalDataUrl;
  });

  return {
    dataUrl: originalDataUrl,
    width: img.width,
    height: img.height,
    type: originalDataUrl.includes("image/jpeg") ? ("JPEG" as const) : ("PNG" as const),
  };
}

function sanitizeFileName(value: string) {
  return String(value || "antecipacao_capital")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}
