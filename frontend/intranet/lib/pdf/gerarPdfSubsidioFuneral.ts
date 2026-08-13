import jsPDF from "jspdf";

export type PdfSubsidioFuneralOpts = {
  nomeSolicitante: string;
  cpfSolicitante: string;
  parentesco: string;
  profissaoSolicitante?: string;
  nomeAssociado: string;
  cpfAssociado: string;
  matriculaAssociado?: string;
  localTrabalho?: string;
  cargoAssociado?: string;
  dataAssociacao?: string;
  dataObito: string;
  valorSolicitado: string;
  valorAprovado: string;
  prestadorServico: string;
  cpfCnpjPrestador?: string;
  titularConta?: string;
  cpfTitularConta?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  local: string;
  dataDocumento: string;
  funcionarioGerador?: string;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

type FieldBox = {
  label: string;
  value: string;
  width: number;
  maxLines?: number;
  alignRight?: boolean;
};

type TextoParte = {
  text: string;
  bold?: boolean;
};

function safeText(value?: string) {
  return String(value || "-").trim() || "-";
}

function sanitize(value: string) {
  return String(value || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function toBrFromIso(value: string) {
  if (!value) return "-";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

async function loadImageDataURL(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Logo nao encontrada");

  const blob = await response.blob();
  const originalDataUrl = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = originalDataUrl;
  });

  const maxWidth = 420;
  const maxHeight = 126;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      dataUrl: originalDataUrl,
      width: img.width,
      height: img.height,
      type: "PNG" as const,
    };
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    type: "PNG" as const,
  };
}

function ensureSpace(
  doc: jsPDF,
  opts: { currentY: number; needed: number; margin: number; pageH: number }
) {
  if (opts.currentY + opts.needed <= opts.pageH - opts.margin) return opts.currentY;
  doc.addPage();
  return opts.margin;
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

function drawFieldBox(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value: string;
    maxLines?: number;
    alignRight?: boolean;
  }
) {
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.rect(opts.x, opts.y, opts.w, opts.h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(90, 110, 95);
  doc.text(opts.label.toUpperCase(), opts.x + 4, opts.y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);

  const maxLines = opts.maxLines || 1;
  const lines = doc.splitTextToSize(safeText(opts.value), opts.w - 8).slice(0, maxLines);
  const textX = opts.alignRight ? opts.x + opts.w - 4 : opts.x + 4;
  doc.text(lines, textX, opts.y + 18, { align: opts.alignRight ? "right" : "left" });
  doc.setTextColor(0, 0, 0);
}

function drawFieldsRow(
  doc: jsPDF,
  y: number,
  x: number,
  totalW: number,
  fields: FieldBox[],
  h = 26
) {
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
      alignRight: field.alignRight,
    });
    cursorX += w;
  });

  return y + h + 1;
}

function writeParagraphBoldParts(
  doc: jsPDF,
  parts: TextoParte[],
  x: number,
  y: number,
  width: number,
  lineHeight = 10
) {
  let cursorX = x;

  parts.forEach((part) => {
    const tokens = part.text.match(/\S+\s*/g) || [part.text];
    tokens.forEach((token) => {
      if (!token) return;
      doc.setFont("helvetica", part.bold ? "bold" : "normal");
      const tokenWidth = doc.getTextWidth(token);
      if (cursorX + tokenWidth > x + width && cursorX > x) {
        y += lineHeight;
        cursorX = x;
      }
      doc.text(token, cursorX, y);
      cursorX += tokenWidth;
    });
  });

  doc.setFont("helvetica", "normal");
  return y + lineHeight;
}

function drawSignature(doc: jsPDF, x: number, y: number, w: number, name: string, role: string) {
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + w, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(15, 23, 42);
  doc.text(safeText(name), x + w / 2, y + 12, { align: "center", maxWidth: w - 8 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(80, 95, 110);
  doc.text(role, x + w / 2, y + 23, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

export async function gerarPdfSubsidioFuneral(o: PdfSubsidioFuneralOpts) {
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
  let y = 22;

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png?v=2");
    const maxW = 135;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    doc.addImage(
      logo.dataUrl,
      logo.type,
      margin,
      y,
      logo.width * scale,
      logo.height * scale,
      undefined,
      "MEDIUM"
    );
    y += logo.height * scale + 8;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 54, 65);
  doc.text("Autorização para Pagamento de Subsídio Funeral", pageW / 2, y, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
  y += 26;

  y = ensureSpace(doc, { currentY: y, needed: 88, margin, pageH });
  drawSectionHeader(doc, "Solicitante", margin, y, contentW);
  y += 18;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: o.nomeSolicitante, width: contentW * 0.56 },
    { label: "CPF", value: o.cpfSolicitante, width: contentW * 0.22 },
    { label: "Parentesco", value: o.parentesco, width: contentW * 0.22 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Profissão", value: safeText(o.profissaoSolicitante), width: contentW * 0.65 },
    { label: "Data da solicitação", value: toBrFromIso(o.dataDocumento), width: contentW * 0.35 },
  ]);

  y += 3;
  y = ensureSpace(doc, { currentY: y, needed: 112, margin, pageH });
  drawSectionHeader(doc, "Beneficiário: associado falecido", margin, y, contentW);
  y += 18;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: o.nomeAssociado, width: contentW * 0.55 },
    { label: "CPF", value: o.cpfAssociado, width: contentW * 0.25 },
    { label: "Matrícula", value: safeText(o.matriculaAssociado), width: contentW * 0.2 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Local de trabalho", value: safeText(o.localTrabalho), width: contentW * 0.5 },
    { label: "Cargo", value: safeText(o.cargoAssociado), width: contentW * 0.3 },
    { label: "Data de associação", value: toBrFromIso(o.dataAssociacao || ""), width: contentW * 0.2 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Data do óbito", value: toBrFromIso(o.dataObito), width: contentW },
  ]);

  y += 3;
  y = ensureSpace(doc, { currentY: y, needed: 88, margin, pageH });
  drawSectionHeader(doc, "Valores e prestador de serviço", margin, y, contentW);
  y += 18;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Valor solicitado", value: o.valorSolicitado, width: contentW * 0.25 },
    { label: "Valor liberado", value: o.valorAprovado, width: contentW * 0.25 },
    { label: "Prestador de serviço", value: o.prestadorServico, width: contentW * 0.5 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "CPF/CNPJ do prestador", value: safeText(o.cpfCnpjPrestador), width: contentW },
  ]);

  y += 3;
  y = ensureSpace(doc, { currentY: y, needed: 88, margin, pageH });
  drawSectionHeader(doc, "Conta para recebimento", margin, y, contentW);
  y += 18;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Titular da conta", value: safeText(o.titularConta), width: contentW * 0.5 },
    { label: "CPF do titular", value: safeText(o.cpfTitularConta), width: contentW * 0.25 },
    { label: "Tipo de conta", value: safeText(o.tipoConta), width: contentW * 0.25 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Banco", value: safeText(o.banco), width: contentW * 0.45 },
    { label: "Agência", value: safeText(o.agencia), width: contentW * 0.25 },
    { label: "Conta", value: safeText(o.conta), width: contentW * 0.3 },
  ]);

  y += 7;
  y = ensureSpace(doc, { currentY: y, needed: 78, margin, pageH });
  drawSectionHeader(doc, "Declaração e autorização", margin, y, contentW);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(35, 45, 55);
  y = writeParagraphBoldParts(
    doc,
    [
      { text: "Declaro que as informacoes apresentadas nesta solicitacao sao verdadeiras e autorizo o encaminhamento interno do pedido de subsidio funeral do(a) associado(a) " },
      { text: o.nomeAssociado, bold: true },
      { text: ", conforme documentos anexados, para analise da diretoria e posterior pagamento pela cooperativa " },
      { text: "SICOOB CRESSEM", bold: true },
      { text: "." },
    ],
    margin + 6,
    y,
    contentW - 12,
    10.2
  );

  y += 24;
  y = ensureSpace(doc, { currentY: y, needed: 150, margin, pageH });
  const sigGap = 34;
  const sigTopW = (contentW - sigGap) / 2;
  const sigTopY = y + 28;
  drawSignature(doc, margin, sigTopY, sigTopW, o.nomeSolicitante, "Solicitante");
  drawSignature(
    doc,
    margin + sigTopW + sigGap,
    sigTopY,
    sigTopW,
    safeText(o.funcionarioGerador),
    "Funcionário(a) responsável"
  );

  const sigDiretoriaW = contentW * 0.56;
  const sigDiretoriaX = margin + (contentW - sigDiretoriaW) / 2;
  drawSignature(
    doc,
    sigDiretoriaX,
    sigTopY + 58,
    sigDiretoriaW,
    "Diretoria",
    "Assinatura da diretoria"
  );

  doc.save(`autorizacao_subsidio_funeral_${sanitize(o.nomeSolicitante)}.pdf`);
}
