import jsPDF from "jspdf";

type ResidenciaOpts = {
    nome: string;
    cpf: string;
    rg: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    cidadeRodape: string;
    uf: string;
    cep: string;
    dia: string;
    mes: string;
    ano: string;
};

export async function gerarPdfDeclaracaoResidencia(opts: ResidenciaOpts) {
    const {
        nome, cpf, rg, endereco, numero,
        complemento, bairro, cidade, cidadeRodape, uf, cep,
        dia, mes, ano
    } = opts;

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
  doc.text("DECLARAÇÃO DE RESIDÊNCIA", pageW / 2, y, { align: "center" });
  y += 24;

  drawSectionHeader(doc, "Dados do declarante", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(opts.nome), width: contentW * 0.5 },
    { label: "CPF", value: maskCpf(opts.cpf), width: contentW * 0.25 },
    { label: "RG", value: maskCpf(opts.rg), width: contentW * 0.25 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Endereço declarado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Endereço", value: formatEndereco(opts), width: contentW * 0.7 },
    { label: "CEP", value: maskCep(opts.cep), width: contentW * 0.3 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Bairro", value: safeText(opts.bairro), width: contentW * 0.34 },
    { label: "Cidade", value: safeText(opts.cidade), width: contentW * 0.46 },
    { label: "UF", value: safeText(opts.uf).toUpperCase(), width: contentW * 0.2 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Declaração", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: safeText(opts.nome), bold: true },
    { text: ", inscrito(a) no CPF " },
    { text: `${maskCpf(opts.cpf)} `, bold: true },
    { text: "e no RG " },
    { text: maskCpf(opts.rg), bold: true },
    {
      text:
        ", declaro para fins de comprovação de residência, sob as penas da Lei (art. 2º da Lei 7.115/83), que resido no endereço informado neste documento.",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Local e data", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Local e data",
      value: `${safeText(opts.cidadeRodape || opts.cidade)}, ${safeText(opts.dia)} de ${safeText(opts.mes)} de ${safeText(opts.ano)}.`,
      width: contentW,
    },
  ]);

  y += 50;
  const assinaturaW = 260;
  const assinaturaX = (pageW - assinaturaW) / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

        const xLeft = 60;
        const maxW = pageW - 120;

        doc.text(linha1, xLeft, y, { maxWidth: maxW });
        y += 26;
        doc.text(linha2, xLeft, y, { maxWidth: maxW });
        y += 26;//altura entre as linhas
    }


    /*doc.text(
        `complemento ${complemento || "__________"} bairro ${bairro || "____________________"}, cidade ${cidade || "____________"}, UF ${uf || "___"}`,
        60, y
    ); y += 22;
    doc.text(`CEP ${cep || "________________"}`, 60, y);
    y += 40;*/

    y += 60;

    doc.text(
        `${cidadeRodape || "________________"}, ${dia || "___"} de ${mes || "________"} de ${ano || "20__"}.`,
        60, y
    );


    const marginLeft = 60;
    const lineWidth = 250;

    doc.line(marginLeft, y, marginLeft + lineWidth, y);

    doc.text("Assinatura do declarante", marginLeft, y + 16, { align: "left" });

    doc.save(
        `declaracao_residencia_${(nome || "associado").replace(/\s+/g, "_")}.pdf`
    );

  doc.save(`declaracao_residencia_${sanitizeFileName(opts.nome || "declarante")}.pdf`);
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

function formatEndereco(opts: ResidenciaOpts) {
  const partes = [safeText(opts.endereco)];
  if (opts.numero?.trim()) partes.push(`nº ${opts.numero.trim()}`);
  if (opts.complemento?.trim()) partes.push(opts.complemento.trim());
  return partes.join(", ");
}

function sanitizeFileName(value: string) {
  return String(value || "declaracao_residencia")
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
