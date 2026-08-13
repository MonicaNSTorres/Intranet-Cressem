/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type Opts = {
  nome: string;
  matricula: string;
  percentual: 20 | 30;
  prontuario?: string;
  cidade: string;
  dataCabecalho: string;
  acao: "Ativar" | "Cancelar";
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

const safeText = (value?: string | number, fallback = "-") =>
  String(value ?? "").trim() || fallback;

export async function gerarPdfAdiantamentoSalarial(o: Opts) {
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
  doc.text("ADIANTAMENTO SALARIAL", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Dados do atendimento", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Local e data", value: `${safeText(o.cidade)}, ${safeText(o.dataCabecalho)}`, width: contentW },
  ]);

  y += 4;
  drawSectionHeader(doc, "Destinatário", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: "PAULO DE TARSO DOS SANTOS CUNHA", width: contentW * 0.68 },
    { label: "Cargo", value: "Diretor Operacional", width: contentW * 0.32 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Cooperativa", value: "SICOOB Cressem", width: contentW },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do funcionário", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(o.nome).toUpperCase(), width: contentW * 0.72 },
    { label: "Matrícula", value: safeText(o.matricula), width: contentW * 0.28 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Ação solicitada", value: safeText(o.acao), width: contentW * 0.5 },
    { label: "Percentual", value: `${o.percentual}% (${o.percentual === 20 ? "vinte" : "trinta"} por cento)`, width: contentW * 0.5 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Solicitação", margin, y, contentW);
  y += 16;

  const verbo = o.acao === "Ativar" ? "ativar" : "cancelar";
  y = drawTextBox(doc, y, margin, contentW, [
    `Solicito a V. Sa., ${verbo} o adiantamento salarial, referente a ${o.percentual}% (${o.percentual === 20 ? "vinte" : "trinta"} por cento) de minha remuneração.`,
  ], { minHeight: 38, fontSize: 9.4, lineHeight: 13 });

  y += 72;
  const signatureW = 280;
  const signatureX = (pageW - signatureW) / 2;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(signatureX, y, signatureX + signatureW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(o.nome).toUpperCase(), pageW / 2, y, { align: "center" });

  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text("Funcionário(a) do SICOOB Cressem", pageW / 2, y, { align: "center" });

  if (o.matricula) {
    y += 12;
    doc.text(`Matrícula: ${o.matricula}`, pageW / 2, y, { align: "center" });
  }

  doc.save(`adiantamento_salarial_${sanitizeFileName(o.nome || "funcionario")}.pdf`);
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

function drawTextBox(
  doc: jsPDF,
  y: number,
  x: number,
  w: number,
  paragraphs: string[],
  options: {
    minHeight?: number;
    fontSize?: number;
    lineHeight?: number;
    indentFirstLine?: number;
    boldFirstContentLine?: boolean;
  } = {}
) {
  const paddingX = 8;
  const paddingY = 8;
  const fontSize = options.fontSize ?? 9;
  const lineHeight = options.lineHeight ?? 12;
  const maxLineWidth = w - paddingX * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  const renderedLines: Array<{ text: string; indent: number; bold?: boolean }> = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const indent = paragraphIndex === 0 ? options.indentFirstLine ?? 0 : 0;
    const lines = doc.splitTextToSize(safeText(paragraph), maxLineWidth - indent);
    lines.forEach((line: string, lineIndex: number) => {
      renderedLines.push({
        text: line,
        indent: lineIndex === 0 ? indent : 0,
        bold: options.boldFirstContentLine && paragraphIndex === 1,
      });
    });
    if (paragraphIndex < paragraphs.length - 1) {
      renderedLines.push({ text: "", indent: 0 });
    }
  });

  const h = Math.max(options.minHeight ?? 34, renderedLines.length * lineHeight + paddingY * 2);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + paddingY + fontSize;
  renderedLines.forEach((line) => {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(15, 23, 42);
    if (line.text) doc.text(line.text, x + paddingX + line.indent, textY);
    textY += lineHeight;
  });

  doc.setTextColor(0, 0, 0);
  return y + h;
}

function sanitizeFileName(value: string) {
  return String(value || "adiantamento_salarial")
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
