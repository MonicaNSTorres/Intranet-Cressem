import jsPDF from "jspdf";

export type StyledPart = { text: string; bold?: boolean };

type ProcuracaoLayoutData = {
  outorgante: StyledPart[];
  outorgado: StyledPart[];
  poderes: string[];
  validade: string;
  localData: string;
  assinaturaNome: string;
  assinaturaDocumento: string;
  nomeArquivo: string;
};

const COLORS = {
  border: { r: 121, g: 183, b: 41 },
  sectionBg: { r: 243, g: 249, b: 239 },
  text: { r: 16, g: 24, b: 40 },
  paragraph: { r: 55, g: 65, b: 81 },
};

export async function gerarPdfProcuracaoPadronizado(data: ProcuracaoLayoutData) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const contentW = pageW - margin * 2;
  let y = 22;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(21);
    doc.setFillColor(COLORS.sectionBg.r, COLORS.sectionBg.g, COLORS.sectionBg.b);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, contentW, 18, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(title.toUpperCase(), margin + 8, y + 12);
    y += 20;
  };

  const drawTextSection = (title: string, paragraphs: string[], bold = false) => {
    const padding = 7;
    const lineHeight = 10;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.6);
    const linesByParagraph = paragraphs.map((paragraph) =>
      doc.splitTextToSize(paragraph, contentW - padding * 2)
    );
    const lineCount = linesByParagraph.reduce((total, lines) => total + lines.length, 0);
    const boxH = lineCount * lineHeight + Math.max(0, paragraphs.length - 1) * 3 + padding * 2;
    ensureSpace(21 + boxH + 4);
    drawSectionHeader(title);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.6);
    doc.setDrawColor(220, 230, 220);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, boxH, "FD");
    doc.setTextColor(COLORS.paragraph.r, COLORS.paragraph.g, COLORS.paragraph.b);
    let textY = y + padding + 6;
    linesByParagraph.forEach((lines, paragraphIndex) => {
      lines.forEach((line: string) => {
        doc.text(line, margin + padding, textY);
        textY += lineHeight;
      });
      if (paragraphIndex < linesByParagraph.length - 1) textY += 3;
    });
    y += boxH + 4;
  };

  const drawStyledTextSection = (title: string, parts: StyledPart[]) => {
    const padding = 7;
    const lineHeight = 10;
    const maxLineWidth = contentW - padding * 2;
    const tokens = parts.flatMap((part) => {
      const pieces = part.text.match(/\S+\s*/g) || [part.text];
      return pieces.map((text) => ({ text, bold: part.bold }));
    });
    const lines: StyledPart[][] = [];
    let currentLine: StyledPart[] = [];
    let currentWidth = 0;

    tokens.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setFontSize(8.6);
      const tokenWidth = doc.getTextWidth(token.text);
      if (currentLine.length > 0 && currentWidth + tokenWidth > maxLineWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      currentLine.push(token);
      currentWidth += tokenWidth;
    });
    if (currentLine.length > 0) lines.push(currentLine);

    const boxH = lines.length * lineHeight + padding * 2;
    ensureSpace(21 + boxH + 4);
    drawSectionHeader(title);
    doc.setDrawColor(220, 230, 220);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, boxH, "FD");
    doc.setTextColor(COLORS.paragraph.r, COLORS.paragraph.g, COLORS.paragraph.b);
    let textY = y + padding + 6;
    lines.forEach((line) => {
      let cursorX = margin + padding;
      line.forEach((token) => {
        doc.setFont("helvetica", token.bold ? "bold" : "normal");
        doc.setFontSize(8.6);
        doc.text(token.text, cursorX, textY);
        cursorX += doc.getTextWidth(token.text);
      });
      textY += lineHeight;
    });
    y += boxH + 4;
  };

  const drawSignature = () => {
    const signatureW = 340;
    ensureSpace(78);
    y += 30;
    const x = (pageW - signatureW) / 2;
    doc.setDrawColor(55, 65, 81);
    doc.setLineWidth(0.6);
    doc.line(x, y, x + signatureW, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(data.assinaturaNome, pageW / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.paragraph.r, COLORS.paragraph.g, COLORS.paragraph.b);
    doc.text(data.assinaturaDocumento, pageW / 2, y + 26, { align: "center" });
  };

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png?v=2");
    const maxW = 124;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    doc.addImage(logo.dataUrl, logo.type, margin, y, width, height, undefined, "MEDIUM");
    y += height + 15;
  } catch {
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  doc.text("PROCURAÇÃO", pageW / 2, y, { align: "center" });
  y += 20;

  drawStyledTextSection("Dados do outorgante", data.outorgante);
  drawStyledTextSection("Dados do outorgado", data.outorgado);
  drawTextSection("Poderes conferidos", data.poderes);
  drawTextSection("Validade e local/data", [data.validade, data.localData]);
  drawSignature();

  doc.save(data.nomeArquivo);
}

async function loadImageDataURL(url: string): Promise<{
  dataUrl: string;
  type: "JPEG" | "PNG";
  width: number;
  height: number;
}> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Logo não encontrada");
  const blob = await response.blob();
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = originalDataUrl;
  });
  const scale = Math.min(420 / image.width, 126 / image.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return { dataUrl: originalDataUrl, type: "PNG", width: image.width, height: image.height };
  }
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    type: "JPEG",
    width: canvas.width,
    height: canvas.height,
  };
}
