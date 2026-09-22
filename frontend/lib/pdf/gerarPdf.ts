import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  cpf: string;
  matricula: string;
  empresa?: string;
  atendente?: string;
  dataPrimeiroDesconto?: string;
  valorAnterior?: number | string;
  valorNovo?: number | string;
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
  muted: { r: 71, g: 84, b: 103 },
};

export async function gerarPdfAssociado(opts: PdfOpts) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;
  const logo = await loadImageDataURL("/sicoob-cressem-logo.png");

  renderVia(doc, opts, "Via do associado", margin, 22, contentW, pageW, logo);

  const dividerY = pageH / 2;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.45);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, dividerY, pageW - margin, dividerY);
  doc.setLineDashPattern([], 0);

  renderVia(doc, opts, "Via da cooperativa", margin, dividerY + 18, contentW, pageW, logo);

  doc.save(`comprovante_integralizacao_${sanitizeFileName(opts.nome || "associado")}.pdf`);
}

function renderVia(
  doc: jsPDF,
  opts: PdfOpts,
  via: string,
  margin: number,
  startY: number,
  contentW: number,
  pageW: number,
  logo: Awaited<ReturnType<typeof loadImageDataURL>>
) {
  let y = startY;

  if (logo) {
    const maxW = 104;
    const maxH = 32;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, logo.type, margin, y, w, h, undefined, "FAST");
  }

  doc.setFillColor(238, 252, 247);
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(pageW - margin - 116, y + 2, 116, 18, 9, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(0, 110, 101);
  doc.text(via.toUpperCase(), pageW - margin - 58, y + 14, { align: "center" });

  y += 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.6);
  doc.setTextColor(0, 0, 0);
  doc.text("COMPROVANTE - ALTERAÇÃO DE INTEGRALIZAÇÃO", pageW / 2, y, {
    align: "center",
  });
  y += 20;

  drawSectionHeader(doc, "Dados do associado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(opts.nome).toUpperCase(), width: contentW * 0.44 },
    { label: "CPF", value: maskCpf(opts.cpf), width: contentW * 0.22 },
    { label: "Matrícula", value: safeText(opts.matricula), width: contentW * 0.16 },
    { label: "Empresa", value: safeText(opts.empresa), width: contentW * 0.18 },
  ]);

  y += 3;
  drawSectionHeader(doc, "Dados da alteração", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Valor anterior", value: formatBRL(opts.valorAnterior), width: contentW / 3 },
    { label: "Valor novo", value: formatBRL(opts.valorNovo), width: contentW / 3 },
    {
      label: "Data 1º desconto",
      value: formatDateBR(opts.dataPrimeiroDesconto),
      width: contentW / 3,
    },
  ]);

  y += 3;
  drawSectionHeader(doc, "Autorização", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: safeText(opts.nome).toUpperCase(), bold: true },
    { text: ", inscrito(a) no CPF " },
    { text: `${maskCpf(opts.cpf)} `, bold: true },
    { text: "e matrícula " },
    { text: safeText(opts.matricula), bold: true },
    { text: ", associado(a) ao " },
    { text: "SICOOB CRESSEM", bold: true },
    { text: ", autorizo a alteração da minha integralização mensal de cotas partes de " },
    { text: `${formatBRL(opts.valorAnterior)} `, bold: true },
    { text: "para " },
    { text: `${formatBRL(opts.valorNovo)}.`, bold: true },
  ]);

  y += 3;
  drawSectionHeader(doc, "Atendimento", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Atendente", value: safeText(opts.atendente), width: contentW * 0.62 },
    {
      label: "Local e data",
      value: `São José dos Campos, ${new Date().toLocaleDateString("pt-BR")}.`,
      width: contentW * 0.38,
    },
  ]);

  y += 42;
  const lineW = 236;
  const lineX = (pageW - lineW) / 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.65);
  doc.line(lineX, y, lineX + lineW, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(opts.nome).toUpperCase(), pageW / 2, y, { align: "center" });
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, w: number) {
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setDrawColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.setLineWidth(0.55);
  doc.rect(x, y, w, 16, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
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
  doc.setFontSize(5.8);
  doc.setTextColor(90, 110, 95);
  doc.text(label.toUpperCase(), x + 4, y + 7.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(safeText(value), w - 8).slice(0, 1);
  doc.text(lines, x + 4, y + 17, { lineHeightFactor: 1.05 });
  doc.setTextColor(0, 0, 0);
}

function drawParagraphBox(
  doc: jsPDF,
  y: number,
  x: number,
  w: number,
  parts: Array<{ text: string; bold?: boolean }>
) {
  const padding = 6;
  const lineHeight = 8.8;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(7.8);
  const tokens = parts.flatMap((part) => {
    const pieces = part.text.match(/\S+\s*/g) || [part.text];
    return pieces.map((piece) => ({ text: piece, bold: part.bold }));
  });

  const lines: Array<Array<{ text: string; bold?: boolean }>> = [];
  let currentLine: Array<{ text: string; bold?: boolean }> = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
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

  const h = Math.max(24, lines.length * lineHeight + padding * 2);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + padding + 6;
  lines.forEach((line) => {
    let cursorX = x + padding;
    line.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(token.text, cursorX, textY);
      cursorX += doc.getTextWidth(token.text);
    });
    textY += lineHeight;
  });

  doc.setTextColor(0, 0, 0);
  return y + h;
}

function safeText(value?: string, fallback = "-") {
  return String(value || "").trim() || fallback;
}

function formatDateBR(dateStr?: string) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function formatBRL(v: number | string | undefined) {
  if (v === "" || v === undefined || v === null) return "R$ -";

  if (typeof v === "string") {
    const normalized = v
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = Number(normalized);
    if (!isFinite(n)) return v;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function maskCpf(v: string) {
  const s = (v || "").replace(/\D/g, "");
  if (s.length !== 11) return v || "";
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

async function loadImageDataURL(url: string): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  type: "JPEG" | "PNG";
} | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const dataUrl = String(reader.result || "");
          resolve({
            dataUrl,
            width: img.width,
            height: img.height,
            type: dataUrl.includes("image/jpeg") ? "JPEG" : "PNG",
          });
        };
        img.onerror = reject;
        img.src = String(reader.result || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sanitizeFileName(value: string) {
  return String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
