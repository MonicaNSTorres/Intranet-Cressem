import jsPDF from "jspdf";

export type DeclaracaoResponsabilidadeHoleriteOpts = {
  nome: string;
  cpf: string;
  rg: string;
  mesReferencia: string;
  valor: string;
  prazoMeses: string;
  local: string;
  dataDeclaracao: string;
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

const safeText = (value?: string, fallback = "-") => String(value || "").trim() || fallback;

function toBrFromIso(value: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function formatarMesReferencia(value: string) {
  if (!value) return "";
  if (/^\d{2}\/\d{4}$/.test(value)) return value;
  const [ano, mes] = value.split("-");
  if (!ano || !mes) return value;
  return `${mes}/${ano}`;
}

function sanitize(value: string) {
  return String(value || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export async function gerarPdfDeclaracaoResponsabilidadeHolerite(
  opts: DeclaracaoResponsabilidadeHoleriteOpts
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
  doc.text("DECLARAÇÃO DE RESPONSABILIDADE PARA DESCONTO EM HOLERITE", pageW / 2, y, {
    align: "center",
  });
  y += 24;

  const nome = safeText(opts.nome).toUpperCase();
  const mesReferencia = formatarMesReferencia(opts.mesReferencia);
  const dataDeclaracao = toBrFromIso(opts.dataDeclaracao);
  const prazoTexto = `${safeText(opts.prazoMeses)} ${
    Number(opts.prazoMeses) === 1 ? "mês" : "meses"
  }`;

  drawSectionHeader(doc, "Dados do cooperado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: nome, width: contentW * 0.5 },
    { label: "CPF", value: safeText(opts.cpf), width: contentW * 0.25 },
    { label: "RG", value: safeText(opts.rg), width: contentW * 0.25 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do desconto", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Mês de referência", value: safeText(mesReferencia), width: contentW / 3 },
    { label: "Valor", value: safeText(opts.valor), width: contentW / 3 },
    { label: "Prazo total", value: prazoTexto, width: contentW / 3 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Declaração", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: nome, bold: true },
    { text: ", portador(a) do CPF " },
    { text: `${safeText(opts.cpf)} `, bold: true },
    { text: "e RG " },
    { text: `${safeText(opts.rg)} `, bold: true },
    {
      text:
        "declaro para os devidos fins que estou ciente e de acordo com a realização do desconto de crédito consignado em meu holerite referente ao mês ",
    },
    { text: `${safeText(mesReferencia)} `, bold: true },
    { text: "no valor de " },
    { text: `${safeText(opts.valor)} `, bold: true },
    { text: "no prazo total de " },
    { text: `${prazoTexto} `, bold: true },
    { text: "para a Cooperativa " },
    { text: "SICOOB CRESSEM", bold: true },
    { text: ", respeitando a margem consignável disponível." },
    { text: "\n\n" },
    {
      text:
        "Declaro ainda que assumo total responsabilidade pelos valores descontados, incluindo taxa de manutenção, integralização e parcela do empréstimo consignado, estando ciente das condições acordadas, bem como autorizo a efetivação dos referidos descontos em folha de pagamento.",
    },
    { text: "\n\n" },
    {
      text:
        "Por fim, afirmo que esta autorização é concedida de livre e espontânea vontade, sem qualquer tipo de coação, estando plenamente de acordo com os termos estabelecidos.",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Local e data", value: `${safeText(opts.local)}, ${dataDeclaracao}.`, width: contentW },
  ]);

  y += 44;
  const assinaturaW = 280;
  const assinaturaX = (pageW - assinaturaW) / 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(nome, pageW / 2, y, { align: "center" });

  doc.save(`declaracao_responsabilidade_holerite_${sanitize(opts.nome)}.pdf`);
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
  type ParagraphToken = { text: string; bold?: boolean; lineBreak?: boolean };

  const padding = 6;
  const lineHeight = 9.3;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(8.2);
  const tokens: ParagraphToken[] = parts.flatMap((part) => {
    return part.text.split(/(\n+)/).flatMap((segment) => {
      if (/^\n+$/.test(segment)) return [{ text: "", bold: part.bold, lineBreak: true }];

      const pieces = segment.match(/\S+\s*/g) || [];
      return pieces.map((piece) => ({ text: piece, bold: part.bold }));
    });
  });

  const lines: ParagraphToken[][] = [];
  let currentLine: ParagraphToken[] = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
    if (token.lineBreak) {
      if (currentLine.length > 0) lines.push(currentLine);
      lines.push([]);
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

  const h = Math.max(34, lines.length * lineHeight + padding * 2);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  let textY = y + padding + 6;
  lines.forEach((line) => {
    if (line.length === 0) {
      textY += lineHeight * 0.55;
      return;
    }

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
          const type = dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
          resolve({ dataUrl, width: img.width, height: img.height, type });
        };
        img.onerror = reject;
        img.src = String(reader.result || "");
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }
  );
}
