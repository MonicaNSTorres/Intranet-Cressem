import jsPDF from "jspdf";

type PdfOpts = {
  dataHoje: string;
  ccb: string;
  nomeAssociado: string;
  cpfAssociado: string;
  empresa: string;
  nomeConjugue: string;
  cpfConjugue: string;
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
const safeText = (value?: string, fallback = "-") => String(value || "").trim() || fallback;

const maskCpf = (value = "") => {
  const s = onlyDigits(value).slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
};

export async function gerarPdfAdendoContratual(o: PdfOpts) {
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
  doc.text("ADENDO CONTRATUAL", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Dados do contrato", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "CCB", value: safeText(o.ccb), width: contentW * 0.55 },
    { label: "Data", value: safeText(o.dataHoje), width: contentW * 0.45 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do associado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(o.nomeAssociado), width: contentW * 0.7 },
    { label: "CPF", value: maskCpf(o.cpfAssociado), width: contentW * 0.3 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Empresa", value: safeText(o.empresa), width: contentW, maxLines: 1 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do cônjuge", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(o.nomeConjugue), width: contentW * 0.7 },
    { label: "CPF", value: maskCpf(o.cpfConjugue), width: contentW * 0.3 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Adendo", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "No caso de falecimento do(a) " },
    { text: "ASSOCIADO(A)", bold: true },
    { text: ", as obrigações e responsabilidades quanto a esta CCB de número " },
    { text: `${safeText(o.ccb)} `, bold: true },
    {
      text:
        "passarão aos herdeiros, até o limite das forças da herança, ou far-se-á a quitação do saldo devedor oriundo desta CCB através de descontos mensais em folha de pagamento do(a) pensionista titular, que corrobora este artigo através de sua anuência abaixo.",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Local e data", value: `São José dos Campos, ${safeText(o.dataHoje)}.`, width: contentW },
  ]);

  y += 58;
  const assinaturaW = 280;
  const assinaturaX = (pageW - assinaturaW) / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(o.nomeConjugue, "Assinatura do cônjuge").toUpperCase(), pageW / 2, y, {
    align: "center",
  });

  y += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`CPF: ${maskCpf(o.cpfConjugue)}`, pageW / 2, y, { align: "center" });

  doc.save(`adendo_contratual_${sanitize(o.nomeAssociado || "associado")}.pdf`);
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
  parts: Array<{ text: string; bold?: boolean }>
) {
  const padding = 7;
  const lineHeight = 10.4;
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

  const h = Math.max(42, lines.length * lineHeight + padding * 2);
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

function sanitize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-_.]/g, "")
    .toLowerCase();
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

async function loadImageDataURL(url: string) {
  const originalDataUrl = await toDataURL(url);

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
