import jsPDF from "jspdf";

type SolicitacaoBolsaPdfParams = {
  nome: string;
  admissao: string;
  curso: string;
  semestre: string;
  periodo: string;
  universidade: string;
  cidade: string;
  nomeGestor: string;
  dataHoje: {
    dia: string;
    mes: string;
    ano: string;
  };
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

function formatarDataAdmissaoTexto(data: string) {
  if (!data) return "-";

  const date = new Date(`${data}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export async function gerarSolicitacaoBolsaPdf({
  nome,
  admissao,
  curso,
  semestre,
  periodo,
  universidade,
  cidade,
  nomeGestor,
  dataHoje,
}: SolicitacaoBolsaPdfParams) {
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
  doc.text("SOLICITAÇÃO DE BOLSA DE ESTUDOS", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Local e data",
      value: `${safeText(cidade)}, ${safeText(dataHoje.dia)} de ${safeText(dataHoje.mes)} de ${safeText(dataHoje.ano)}.`,
      width: contentW,
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Destinatário", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Diretoria executiva",
      value: "SICOOB CRESSEM",
      width: contentW,
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do funcionário", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(nome).toUpperCase(), width: contentW * 0.62 },
    { label: "Admissão", value: formatarDataAdmissaoTexto(admissao), width: contentW * 0.18 },
    { label: "Gestor", value: safeText(nomeGestor).toUpperCase(), width: contentW * 0.2 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados acadêmicos", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Curso", value: safeText(curso), width: contentW * 0.45 },
    { label: "Trimestre/Semestre", value: safeText(semestre), width: contentW * 0.25 },
    { label: "Período", value: safeText(periodo), width: contentW * 0.3 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Faculdade/Universidade", value: safeText(universidade), width: contentW * 0.62 },
    { label: "Cidade", value: safeText(cidade), width: contentW * 0.38 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Solicitação", margin, y, contentW);
  y += 16;
  y = drawTextBox(
    doc,
    margin,
    y,
    contentW,
    `Prezados Senhores,\n\nVenho através desta solicitar subsídio da Bolsa Parcial de Estudos. Sou funcionário(a) desde ${formatarDataAdmissaoTexto(
      admissao
    )}, matriculado(a) no curso ${safeText(curso)}, no ${safeText(
      semestre
    )}, na Faculdade/Universidade ${safeText(universidade)}, no período ${safeText(
      periodo
    )}. Informo que este curso enquadra-se também nos interesses da empresa, possibilitando minha ascensão interna, pelo qual submeto-me à apreciação desta Diretoria.\n\nDesde já agradeço a oportunidade.\n\nAtenciosamente,`
  );

  y += 42;
  drawSignatureRow(doc, y, margin, contentW, [
    { label: "Assinatura do funcionário", name: safeText(nome).toUpperCase() },
    { label: "Assinatura do gestor", name: safeText(nomeGestor).toUpperCase() },
  ]);
  y += 58;

  drawSectionHeader(doc, "Parecer", margin, y, contentW);
  y += 16;
  y = drawTextBox(
    doc,
    margin,
    y,
    contentW,
    "Parecer: ______________________________________________________________________________________________\n\nConceder: (   ) Sim    (   ) Não       _________ % a conceder.",
    50
  );

  y += 42;
  drawSignatureRow(doc, y, margin, contentW, [
    { label: "Assinatura Diretoria Executiva", name: "" },
    { label: "Assinatura Gestor RH", name: "" },
  ]);

  doc.save(`solicitacao_bolsa_estudo_${sanitizeFileName(nome || "funcionario")}.pdf`);
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
  const h = 24;
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
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  const lines = doc.splitTextToSize(safeText(opts.value), opts.w - 8).slice(0, opts.maxLines ?? 1);
  lines.forEach((line: string, index: number) => {
    doc.text(line, opts.x + 4, opts.y + 17 + index * 9);
  });
}

function drawTextBox(doc: jsPDF, x: number, y: number, w: number, text: string, minH = 92) {
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);

  const paddingX = 6;
  const paddingTop = 10;
  const paddingBottom = 10;
  const lineHeight = 10.8;
  const paragraphGap = 5.5;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const wrappedParagraphs = paragraphs.map((paragraph) =>
    doc.splitTextToSize(paragraph, w - paddingX * 2)
  );
  const totalLines = wrappedParagraphs.reduce((total, lines) => total + lines.length, 0);
  const totalGaps = Math.max(0, wrappedParagraphs.length - 1) * paragraphGap;
  const h = Math.max(minH, paddingTop + paddingBottom + totalLines * lineHeight + totalGaps);

  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(0, 0, 0);

  let lineY = y + paddingTop;
  wrappedParagraphs.forEach((lines, paragraphIndex) => {
    lines.forEach((line: string, lineIndex: number) => {
      const isLastLine = lineIndex === lines.length - 1;
      const shouldJustify = !isLastLine && line.trim().split(/\s+/).length > 4;

      drawTextLine(doc, line, x + paddingX, lineY, w - paddingX * 2, shouldJustify);
      lineY += lineHeight;
    });

    if (paragraphIndex < wrappedParagraphs.length - 1) {
      lineY += paragraphGap;
    }
  });

  return y + h;
}

function drawTextLine(doc: jsPDF, line: string, x: number, y: number, maxW: number, justify: boolean) {
  if (!justify) {
    doc.text(line, x, y);
    return;
  }

  const words = line.trim().split(/\s+/);
  if (words.length <= 1) {
    doc.text(line, x, y);
    return;
  }

  const wordsW = words.reduce((total, word) => total + doc.getTextWidth(word), 0);
  const extraSpace = (maxW - wordsW) / (words.length - 1);
  let cursorX = x;

  words.forEach((word, index) => {
    doc.text(word, cursorX, y);
    cursorX += doc.getTextWidth(word) + (index < words.length - 1 ? extraSpace : 0);
  });
}

function drawSignatureRow(
  doc: jsPDF,
  y: number,
  x: number,
  totalW: number,
  items: Array<{ label: string; name: string }>
) {
  const gap = 28;
  const itemW = (totalW - gap) / 2;

  items.forEach((item, index) => {
    const itemX = x + index * (itemW + gap);
    const lineY = y;

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.75);
    doc.line(itemX + 12, lineY, itemX + itemW - 12, lineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(30, 41, 59);
    doc.text(item.label, itemX + itemW / 2, lineY + 12, { align: "center" });

    if (item.name) {
      doc.setFontSize(7.2);
      doc.text(item.name, itemX + itemW / 2, lineY + 24, { align: "center" });
    }
  });
}

function sanitizeFileName(value: string) {
  return String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "")
    .toLowerCase();
}

async function loadImageDataURL(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem não encontrada: ${url}`);

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  return {
    dataUrl,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    type: blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG",
  };
}
