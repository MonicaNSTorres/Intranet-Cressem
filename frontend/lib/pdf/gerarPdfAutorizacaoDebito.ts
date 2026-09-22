import jsPDF from "jspdf";

type ItemDebito = {
  descricao: string;
  valor: string;
};

type GerarPdfAutorizacaoDebitoParams = {
  cidade: string;
  dia: string;
  mes: string;
  ano: string;
  nome: string;
  cpf: string;
  conta: string;
  itens: ItemDebito[];
  total: string;
  valorSistema: string;
  acrescimo: string;
  reduzir: string;
  cancelar: string;
};

type StyledPart = { text: string; bold?: boolean };

const GREEN = { r: 121, g: 183, b: 41 };
const GREEN_DARK = { r: 0, g: 54, b: 65 };
const GREEN_LIGHT = { r: 242, g: 248, b: 235 };

function safeText(value?: string, fallback = "-") {
  return String(value || "").trim() || fallback;
}

function sanitizeFileName(value: string) {
  return String(value || "autorizacao_debito")
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

export async function gerarPdfAutorizacaoDebito({
  cidade,
  dia,
  mes,
  ano,
  nome,
  cpf,
  conta,
  itens,
  total,
  valorSistema,
  acrescimo,
  reduzir,
  cancelar,
}: GerarPdfAutorizacaoDebitoParams) {
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
  let y = 20;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(24);
    doc.setFillColor(GREEN_LIGHT.r, GREEN_LIGHT.g, GREEN_LIGHT.b);
    doc.setDrawColor(GREEN.r, GREEN.g, GREEN.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, contentW, 18, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b);
    doc.text(title.toUpperCase(), margin + 8, y + 12);

    doc.setTextColor(0, 0, 0);
    y += 20;
  };

  const drawFieldBox = (
    label: string,
    value: string,
    x: number,
    boxY: number,
    w: number,
    h = 24
  ) => {
    doc.setDrawColor(210, 220, 210);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY, w, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(90, 110, 95);
    doc.text(label.toUpperCase(), x + 4, boxY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(safeText(value), w - 8);
    doc.text(lines.slice(0, 1), x + 4, boxY + 18);
    doc.setTextColor(0, 0, 0);
  };

  const drawFieldsRow = (
    fields: Array<{ label: string; value: string; width: number }>,
    h = 24
  ) => {
    ensureSpace(h + 2);
    let x = margin;
    fields.forEach((field) => {
      drawFieldBox(field.label, field.value, x, y, field.width, h);
      x += field.width;
    });
    y += h + 1;
  };

  const drawStyledParagraphBox = (title: string, parts: StyledPart[]) => {
    const padding = 6;
    const lineHeight = 9.5;
    const maxLineWidth = contentW - padding * 2;

    doc.setFontSize(8.4);
    const tokens: StyledPart[] = parts.flatMap((part) => {
      const pieces = part.text.match(/\S+\s*/g) || [part.text];
      return pieces.map((piece) => ({ text: piece, bold: part.bold }));
    });

    const lines: StyledPart[][] = [];
    let currentLine: StyledPart[] = [];
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

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    const boxH = lines.length * lineHeight + padding * 2;
    ensureSpace(22 + boxH + 3);
    drawSectionHeader(title);

    doc.setDrawColor(220, 230, 220);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentW, boxH, "FD");

    let textY = y + padding + 6;
    lines.forEach((line) => {
      let cursorX = margin + padding;
      line.forEach((token) => {
        doc.setFont("helvetica", token.bold ? "bold" : "normal");
        doc.setFontSize(8.4);
        doc.setTextColor(40, 55, 70);
        doc.text(token.text, cursorX, textY);
        cursorX += doc.getTextWidth(token.text);
      });
      textY += lineHeight;
    });

    y += boxH + 3;
    doc.setTextColor(0, 0, 0);
  };

  const drawSimpleTable = (
    title: string,
    rows: Array<{ descricao: string; valor: string }>,
    totalValue?: string
  ) => {
    drawSectionHeader(title);

    const descW = contentW * 0.68;
    const valueW = contentW - descW;
    const rowH = 24;

    const drawHeader = () => {
      ensureSpace(rowH);
      doc.setDrawColor(210, 220, 210);
      doc.setFillColor(GREEN_LIGHT.r, GREEN_LIGHT.g, GREEN_LIGHT.b);
      doc.rect(margin, y, descW, rowH, "FD");
      doc.rect(margin + descW, y, valueW, rowH, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b);
      doc.text("DESCRIÇÃO", margin + 6, y + 15);
      doc.text("VALOR", margin + descW + valueW - 6, y + 15, { align: "right" });
      doc.setTextColor(0, 0, 0);
      y += rowH;
    };

    const drawRow = (descricao: string, valor: string, bold = false) => {
      ensureSpace(rowH);
      doc.setDrawColor(220, 230, 220);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, descW, rowH, "FD");
      doc.rect(margin + descW, y, valueW, rowH, "FD");

      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(safeText(descricao), margin + 6, y + 15);
      doc.text(safeText(valor, "R$ 0,00"), margin + contentW - 6, y + 15, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
      y += rowH;
    };

    drawHeader();
    rows.forEach((row) => drawRow(row.descricao, row.valor));

    if (totalValue !== undefined) {
      drawRow("TOTAL", totalValue, true);
    }

    y += 6;
  };

  const drawSingleValueSection = (title: string, value: string) => {
    if (!String(value || "").trim()) return;

    drawSectionHeader(title);
    drawFieldsRow([{ label: title, value, width: contentW }], 24);
    y += 6;
  };

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png");
    const maxW = 140;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    doc.addImage(logo.dataUrl, logo.type, margin, y, w, h, undefined, "FAST");
    y += h + 8;
  } catch {
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text("AUTORIZAÇÃO DE DÉBITO", pageW / 2, y, { align: "center" });
  y += 14;

  const dataAutorizacao = `${safeText(dia, "DD")} de ${safeText(
    mes,
    "MÊS"
  )} de ${safeText(ano, "AAAA")}`;

  drawSectionHeader("Dados do associado");
  drawFieldsRow([
    { label: "Nome", value: nome, width: contentW * 0.5 },
    { label: "CPF/CNPJ", value: cpf, width: contentW * 0.25 },
    { label: "Conta corrente", value: conta, width: contentW * 0.25 },
  ]);

  drawFieldsRow([
    { label: "Cidade", value: cidade, width: contentW * 0.5 },
    { label: "Data", value: dataAutorizacao, width: contentW * 0.5 },
  ]);

  drawStyledParagraphBox("Autorização", [
    { text: "Eu, " },
    { text: safeText(nome, "NOME"), bold: true },
    { text: ", inscrito(a) no CPF/CNPJ " },
    { text: safeText(cpf, "CPF/CNPJ"), bold: true },
    { text: ", titular da conta corrente " },
    { text: safeText(conta, "CONTA"), bold: true },
    {
      text:
        ", autorizo o Banco da CRESSEM a debitar o valor em aberto na minha conta corrente e/ou cartão de crédito, com o empréstimo creditado na mesma.",
    },
  ]);

  drawSimpleTable(
    "Parcelas e valores",
    itens.length > 0 ? itens : [{ descricao: "-", valor: "R$ 0,00" }],
    total
  );

  drawSectionHeader("Detalhamento no sistema");
  drawFieldsRow([
    { label: "Valor do sistema", value: valorSistema || "R$ 0,00", width: contentW / 2 },
    { label: "Acréscimo agência", value: acrescimo || "R$ 0,00", width: contentW / 2 },
  ]);
  y += 6;

  drawSingleValueSection("Reduzir", reduzir);
  drawSingleValueSection("Cancelar", cancelar);

  ensureSpace(95);
  y += 36;

  const assinaturaW = 260;
  const assinaturaX = (pageW - assinaturaW) / 2;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(nome, "NOME DO ASSOCIADO"), pageW / 2, y, {
    align: "center",
  });

  y += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(safeText(cpf, "CPF/CNPJ"), pageW / 2, y, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  doc.save(`autorizacao_debito_${sanitizeFileName(nome)}.pdf`);
}
