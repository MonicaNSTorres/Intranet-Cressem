import jsPDF from "jspdf";

type RendimentosOpts = {
  destinatario?: string;
  valorMensal?: string | number;
  atividade?: string;
  cidade?: string;
  dia?: string;
  mes?: string;
  ano?: string;
  nome?: string;
  cpf?: string;
};

type FieldBox = {
  label: string;
  value: string;
  width: number;
  maxLines?: number;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

const onlyDigits = (value = "") => value.replace(/\D/g, "");
const safeText = (value?: string | number, fallback = "-") =>
  String(value ?? "").trim() || fallback;

export async function gerarPdfDeclaracaoRendimentos(opts: RendimentosOpts) {
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
  doc.text("DECLARAÇÃO DE RENDIMENTOS", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Dados do declarante", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(opts.nome), width: contentW * 0.72 },
    { label: "CPF", value: maskCpf(opts.cpf), width: contentW * 0.28 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados da declaração", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Destinatário", value: safeText(opts.destinatario), width: contentW * 0.58 },
    { label: "Valor mensal", value: formatBRL(opts.valorMensal), width: contentW * 0.42 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Atividade", value: safeText(opts.atividade), width: contentW, maxLines: 1 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Declaração", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Declaro à " },
    { text: `${safeText(opts.destinatario)} `, bold: true },
    {
      text:
        "para fins de confecção de cadastro e análise de crédito, que obtenho mensalmente rendimentos no valor de ",
    },
    { text: `${formatBRL(opts.valorMensal)} `, bold: true },
    { text: "provenientes de minha atividade " },
    { text: `${safeText(opts.atividade)}. `, bold: true },
    {
      newParagraph: true,
      text:
        "Assumo o compromisso de informar a essa cooperativa, imediatamente, eventual desenquadramento à presente situação e estou ciente de que a falsidade na prestação destas informações me sujeitará às penalidades previstas na legislação criminal, relativa à falsidade ideológica (art. 299 do Código Penal).",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Local e data",
      value: `${safeText(opts.cidade)}, ${pad2(opts.dia)}/${pad2(opts.mes)}/${safeText(opts.ano)}.`,
      width: contentW,
    },
  ]);

  y += 54;
  const assinaturaW = 260;
  const assinaturaX = (pageW - assinaturaW) / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(opts.nome, "Assinatura do declarante").toUpperCase(), pageW / 2, y, {
    align: "center",
  });

  doc.save(`declaracao_rendimentos_${sanitizeFileName(opts.nome || "declarante")}.pdf`);
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
    drawFieldBox(doc, {
      x: cursorX,
      y,
      w,
      h,
      label: field.label,
      value: field.value,
      maxLines: field.maxLines ?? 1,
    });
    cursorX += w;
  });

  return y + h;
}

function drawFieldBox(
  doc: jsPDF,
  opts: { x: number; y: number; w: number; h: number; label: string; value: string; maxLines?: number }
) {
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(opts.x, opts.y, opts.w, opts.h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(90, 110, 95);
  doc.text(opts.label.toUpperCase(), opts.x + 4, opts.y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(safeText(opts.value), opts.w - 8).slice(0, opts.maxLines ?? 1);
  doc.text(lines, opts.x + 4, opts.y + 17.5, { lineHeightFactor: 1.05 });
  doc.setTextColor(0, 0, 0);
}

function drawParagraphBox(
  doc: jsPDF,
  y: number,
  x: number,
  w: number,
  parts: Array<{ text: string; bold?: boolean; newParagraph?: boolean }>
) {
  const padding = 7;
  const lineHeight = 10.4;
  const paragraphGap = 4;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(8.2);
  const tokens = parts.flatMap((part) => {
    const pieces = part.text.match(/\S+\s*/g) || [part.text];
    return pieces.map((piece, index) => ({
      text: piece,
      bold: part.bold,
      newParagraph: part.newParagraph && index === 0,
    }));
  });

  const lines: Array<{ tokens: Array<{ text: string; bold?: boolean }>; gapBefore?: boolean }> = [];
  let currentLine: Array<{ text: string; bold?: boolean }> = [];
  let currentWidth = 0;
  let nextLineHasGap = false;

  tokens.forEach((token) => {
    if (token.newParagraph && currentLine.length > 0) {
      lines.push({ tokens: currentLine });
      currentLine = [];
      currentWidth = 0;
      nextLineHasGap = true;
    }

    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    const tokenWidth = doc.getTextWidth(token.text);
    if (currentWidth + tokenWidth > maxLineWidth && currentLine.length > 0) {
      lines.push({ tokens: currentLine, gapBefore: nextLineHasGap });
      currentLine = [];
      currentWidth = 0;
      nextLineHasGap = false;
    }
    currentLine.push(token);
    currentWidth += tokenWidth;
  });

  if (currentLine.length > 0) {
    lines.push({ tokens: currentLine, gapBefore: nextLineHasGap });
  }

  const h = Math.max(
    40,
    lines.length * lineHeight + lines.filter((line) => line.gapBefore).length * paragraphGap + padding * 2
  );
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + padding + 6;
  lines.forEach((line) => {
    if (line.gapBefore) textY += paragraphGap;
    let cursorX = x + padding;
    line.tokens.forEach((token) => {
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

function formatBRL(value?: string | number) {
  if (value === undefined || value === null || value === "") return "R$ ____________";

  const raw = String(value).trim();
  if (/^R\$\s?/.test(raw)) return raw;

  const normalized = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);

  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : `R$ ${raw}`;
}

function pad2(value?: string) {
  const s = String(value || "").replace(/\D/g, "");
  return s ? s.padStart(2, "0") : "__";
}

function maskCpf(value = "") {
  const s = onlyDigits(value).slice(0, 11);
  if (s.length !== 11) return safeText(value, "______________________________");
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

function sanitizeFileName(value: string) {
  return String(value || "declaracao_rendimentos")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
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

  const maxWidth = 720;
  const maxHeight = 224;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
      type: "PNG" as const,
    };
  }

  return {
    dataUrl: originalDataUrl,
    width: img.width,
    height: img.height,
    type: "PNG" as const,
  };
}
