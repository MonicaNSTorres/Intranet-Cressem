import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  matricula: string;
  instituicao: string;
  descritivo: string;
  valorPago: number;
  valorFixo: number;
  totalReembolsar: number;
  dataEntrega: string;
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

const fmtBRL = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function gerarPdfAuxilioCreche(opts: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;
  let y = 22;

  const valorPago = Number(opts.valorPago || 0);
  const teto = Number(opts.valorFixo || 0);
  const totalReembolsar = Math.min(Number(opts.totalReembolsar || valorPago), teto || valorPago);
  const ensureSpace = (height: number) => {
    if (y + height <= pageH - margin) return;
    doc.addPage();
    y = margin;
  };

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
  doc.text("SOLICITAÇÃO DE REEMBOLSO DE AUXÍLIO CRECHE OU BABÁ", pageW / 2, y, {
    align: "center",
  });
  y += 24;

  drawSectionHeader(doc, "Dados do empregado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome", value: safeText(opts.nome).toUpperCase(), width: contentW * 0.62 },
    { label: "Matrícula", value: safeText(opts.matricula), width: contentW * 0.18 },
    { label: "Data de entrega", value: safeText(opts.dataEntrega), width: contentW * 0.2 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do reembolso", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Creche / Instituição",
      value: safeText(opts.instituicao).toUpperCase(),
      width: contentW,
      maxLines: 2,
    },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Valor total pago", value: fmtBRL(valorPago), width: contentW / 3 },
    { label: "Teto do benefício", value: fmtBRL(teto), width: contentW / 3 },
    { label: "Total a reembolsar", value: fmtBRL(totalReembolsar), width: contentW / 3 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Solicitação", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Eu, " },
    { text: safeText(opts.nome).toUpperCase(), bold: true },
    { text: ", matrícula " },
    { text: `${safeText(opts.matricula)}, `, bold: true },
    {
      text:
        "solicito cadastramento para futuros reembolsos do meu auxílio creche ou babá efetuado junto a ",
    },
    { text: safeText(opts.instituicao).toUpperCase(), bold: true },
    { text: "." },
  ]);

  y += 4;
  drawSectionHeader(doc, "Valores e orientação", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Valor total pago: " },
    { text: `${fmtBRL(valorPago)}. `, bold: true },
    { text: "Total a reembolsar: " },
    { text: `${fmtBRL(totalReembolsar)}. `, bold: true },
    {
      text:
        "Todo mês deverá ser apresentado ao RH o boleto e o comprovante de pagamento dentro do prazo estabelecido.",
    },
  ]);

  y += 4;
  drawSectionHeader(doc, "Descritivo", margin, y, contentW);
  y += 16;
  y = drawTextBox(doc, y, margin, contentW, safeText(opts.descritivo), 24);

  y += 4;
  y = drawPagedTextSection(doc, y, margin, contentW, pageH, "Regras e condições do benefício", [
    `A partir de 01/07/2024, a cooperativa reembolsará aos seus empregados, o valor de ${fmtBRL(teto)} para cada filho até a idade de 83 (oitenta e três) meses, as despesas realizadas e comprovadas com internamento deste em creches e instituições análogas de sua livre escolha.`,
    "Parágrafo Primeiro - Idênticos reembolsos e procedimentos previstos na cláusula Auxílio Creche/Auxílio Babá estendem-se aos empregados ou empregadas que tenham filhos excepcionais ou deficientes físicos que exijam cuidados permanentes, sem limite de idade, desde que tal condição seja comprovada por atestado fornecido pelo INSS ou instituição por ele autorizada, ou, ainda, por médico pertencente a Convênio mantido pela cooperativa.",
    "Parágrafo Segundo - Quando ambos os cônjuges forem empregados na mesma cooperativa, o pagamento não será cumulativo, obrigando-se os empregados a designarem, por escrito, à Cooperativa, o cônjuge que deverá perceber o benefício.",
    "Parágrafo Terceiro - O auxílio Creche não será cumulativo com o auxílio babá, devendo o beneficiário fazer opção escrita por um ou outro, para cada filho.",
    "Parágrafo Quarto - As concessões e vantagens contidas nesta cláusula atendem ao disposto nos incisos XXV e XXVI do artigo 7º da Constituição da República, ao disposto nos §§ 1º e 2º do artigo 389 da CLT e na Portaria MTP nº 671, de 8 de novembro de 2021 (DOU 11.11.2021) em seus Capítulos VII e VIII.",
    "Parágrafo Quinto - O auxílio babá será pago desde que o empregado comprove, com regular anotação de carteira profissional, haver contratado empregada doméstica (babá), para tomar conta de seu filho.",
    "Parágrafo Sexto - Não será devido o Auxílio Creche/Auxílio Babá nos casos de pagamento do décimo terceiro salário da empregada doméstica (babá).",
    "Todos os meses, antes do dia 15 de cada mês, o funcionário deverá apresentar o contrato ou o boleto onde constem o nome do seu filho, o nome da instituição de ensino e o valor a ser pago, bem como o comprovante deste pagamento efetuado em instituição bancária.",
    "Caso o funcionário esqueça ou se atrase na entrega destes documentos acima descritos, o mesmo ficará sem receber o reembolso. Enviar documentação até o dia 13 de cada mês para receber no fim do mês no holerite.",
    "Cabe somente à Diretoria Executiva determinar o pagamento da mensalidade fora do prazo e não reembolsada, mediante explanação e justificativas por escrito do funcionário.",
  ]);

  y += 4;
  ensureSpace(96);
  drawSectionHeader(doc, "Declaração", margin, y, contentW);
  y += 16;
  y = drawTextBox(
    doc,
    y,
    margin,
    contentW,
    "Abaixo, assino a presente solicitação, dando ciência das regras internas do benefício e autorização para crédito em holerite, conforme análise e aprovação da cooperativa.",
    28
  );

  ensureSpace(126);
  y += 18;
  y = drawApprovalBox(doc, y, margin, contentW);
  y += 52;
  y = drawSignatureRow(doc, y, margin, contentW, [
    { label: safeText(opts.nome).toUpperCase(), caption: "Assinatura do solicitante" },
    { label: "DIRETORIA EXECUTIVA", caption: "Assinatura da diretoria" },
  ]);

  doc.save(`auxilio_creche_${sanitizeFileName(opts.nome || "funcionario")}.pdf`);
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

function drawTextBox(doc: jsPDF, y: number, x: number, w: number, text: string, minHeight: number) {
  const padding = 6;
  const lineHeight = 9.3;
  const lines = doc.splitTextToSize(safeText(text), w - padding * 2) as string[];
  const h = Math.max(minHeight, lines.length * lineHeight + padding * 2);

  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(lines, x + padding, y + padding + 6, { lineHeightFactor: 1.05 });
  doc.setTextColor(0, 0, 0);

  return y + h;
}

function drawSignatureRow(
  doc: jsPDF,
  y: number,
  x: number,
  totalW: number,
  signatures: Array<{ label: string; caption: string }>
) {
  const gap = 32;
  const signatureW = (totalW - gap) / 2;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.setTextColor(30, 41, 59);

  signatures.forEach((signature, index) => {
    const signatureX = x + index * (signatureW + gap);
    const centerX = signatureX + signatureW / 2;

    doc.line(signatureX + 18, y, signatureX + signatureW - 18, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.text(signature.label, centerX, y + 13, { align: "center", maxWidth: signatureW - 12 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text(signature.caption, centerX, y + 24, { align: "center" });
  });

  doc.setTextColor(0, 0, 0);
  return y + 34;
}

function drawApprovalBox(doc: jsPDF, y: number, x: number, w: number) {
  const h = 24;

  doc.setDrawColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setLineWidth(0.55);
  doc.rect(x, y, w, h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("APROVAÇÃO DA DIRETORIA:", x + 6, y + 15);

  doc.setFont("helvetica", "normal");
  doc.text("(   ) APROVADO", x + 128, y + 15);
  doc.text("DATA: ____/____/________", x + 240, y + 15);

  doc.setTextColor(0, 0, 0);
  return y + h;
}

function drawPagedTextSection(
  doc: jsPDF,
  y: number,
  x: number,
  w: number,
  pageH: number,
  title: string,
  paragraphs: string[]
) {
  const marginBottom = 28;
  const padding = 6;
  const lineHeight = 9.2;
  const paragraphGap = 3;

  const addHeader = () => {
    drawSectionHeader(doc, title, x, y, w);
    y += 16;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageH - marginBottom) return;
    doc.addPage();
    y = 28;
    addHeader();
  };

  addHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);

  const getBoldPrefix = (paragraph: string) =>
    paragraph.match(/^(Parágrafo (Primeiro|Segundo|Terceiro|Quarto|Quinto|Sexto) - )/)?.[1] || "";

  const wrappedParagraphs = paragraphs.map((paragraph) => ({
    lines: doc.splitTextToSize(paragraph, w - padding * 2) as string[],
    boldPrefix: getBoldPrefix(paragraph),
  }));

  const getBlockHeight = (block: typeof wrappedParagraphs) => {
    const textHeight = block.reduce((total, paragraph) => total + paragraph.lines.length * lineHeight, 0);
    const gapsHeight = Math.max(0, block.length - 1) * paragraphGap;
    return Math.max(24, textHeight + gapsHeight + padding * 2);
  };

  const drawParagraphLines = (paragraph: (typeof wrappedParagraphs)[number], textY: number) => {
    const [firstLine, ...otherLines] = paragraph.lines;

    if (paragraph.boldPrefix && firstLine?.startsWith(paragraph.boldPrefix)) {
      doc.setFont("helvetica", "bold");
      doc.text(paragraph.boldPrefix, x + padding, textY);

      doc.setFont("helvetica", "normal");
      doc.text(firstLine.slice(paragraph.boldPrefix.length), x + padding + doc.getTextWidth(paragraph.boldPrefix), textY);

      if (otherLines.length) {
        doc.text(otherLines, x + padding, textY + lineHeight, { lineHeightFactor: 1.05 });
      }
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.text(paragraph.lines, x + padding, textY, { lineHeightFactor: 1.05 });
  };

  const drawBlock = (block: typeof wrappedParagraphs) => {
    const h = getBlockHeight(block);

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.rect(x, y, w, h, "FD");

    let textY = y + padding + 6;
    block.forEach((paragraph, lineIndex) => {
      drawParagraphLines(paragraph, textY);
      textY += paragraph.lines.length * lineHeight + (lineIndex === block.length - 1 ? 0 : paragraphGap);
    });

    y += h + 3;
  };

  let block: typeof wrappedParagraphs = [];

  wrappedParagraphs.forEach((paragraph) => {
    const nextBlock = [...block, paragraph];
    const nextHeight = getBlockHeight(nextBlock);

    if (block.length > 0 && y + nextHeight > pageH - marginBottom) {
      drawBlock(block);
      doc.addPage();
      y = 28;
      addHeader();
      block = [paragraph];
      return;
    }

    block = nextBlock;
  });

  if (block.length) drawBlock(block);

  doc.setTextColor(0, 0, 0);
  return y;
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
          const type = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG";
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

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "")
    .toLowerCase();
}
