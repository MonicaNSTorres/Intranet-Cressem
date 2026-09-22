import jsPDF from "jspdf";

type AutorizacaoDescontoOpts = {
  nome: string;
  cpf: string;
  atendente: string;
  taxaManutencao: number;
  integralizacao: number;
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

const safeText = (value?: string, fallback = "-") => String(value || "").trim() || fallback;
const onlyDigits = (value = "") => value.replace(/\D/g, "");

const maskCpf = (value = "") => {
  const s = onlyDigits(value).slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
};

const fmtBRL = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function gerarPdfAutorizacaoDescontoTaxaIntegralizacao(
  opts: AutorizacaoDescontoOpts
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
  doc.text("AUTORIZAÇÃO DE DESCONTO", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Dados do associado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(opts.nome).toUpperCase(), width: contentW * 0.68 },
    { label: "CPF", value: maskCpf(opts.cpf), width: contentW * 0.32 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Valores autorizados", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Taxa de manutenção", value: fmtBRL(opts.taxaManutencao), width: contentW / 3 },
    { label: "Integralização", value: fmtBRL(opts.integralizacao), width: contentW / 3 },
    {
      label: "Total",
      value: fmtBRL(opts.taxaManutencao + opts.integralizacao),
      width: contentW / 3,
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Autorização", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: safeText(opts.nome).toUpperCase(), bold: true },
    { text: ", sob nº de CPF " },
    { text: maskCpf(opts.cpf), bold: true },
    {
      text:
        ", associado(a) ao Sicoob Cressem, autorizo o desconto da taxa de manutenção no valor de ",
    },
    { text: `${fmtBRL(opts.taxaManutencao)} `, bold: true },
    { text: "e integralização no valor de " },
    { text: `${fmtBRL(opts.integralizacao)}, `, bold: true },
    { text: "totalizando o valor de " },
    { text: fmtBRL(opts.taxaManutencao + opts.integralizacao), bold: true },
    { text: "." },
  ]);

  y += 4;
  const hoje = new Date().toLocaleDateString("pt-BR");
  drawSectionHeader(doc, "Atendimento", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Atendente", value: safeText(opts.atendente), width: contentW },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Local e data", value: `São José dos Campos, ${hoje}.`, width: contentW },
  ]);

  y += 50;
  const assinaturaW = 280;
  const assinaturaX = (pageW - assinaturaW) / 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Assinatura do associado", pageW / 2, y, { align: "center" });

  doc.save(`autorizacao_desconto_${sanitizeFileName(opts.nome || "associado")}.pdf`);
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
  const padding = 6;
  const lineHeight = 9.3;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(8.2);
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

  const h = Math.max(34, lines.length * lineHeight + padding * 2);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + padding + 6;
  lines.forEach((line) => {
    let cursorX = x + padding;
    line.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setFontSize(8.2);
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
  const blob = await response.blob();

  return new Promise<{ dataUrl: string; width: number; height: number; type: "PNG" | "JPEG" }>(
    (resolve, reject) => {
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
    }
  );
}

function sanitizeFileName(value: string) {
  return String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
