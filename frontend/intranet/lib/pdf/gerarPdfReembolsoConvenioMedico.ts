import jsPDF from "jspdf";

type ReembolsoConvenioMedicoPdfParams = {
  dataHoje: string;
  nome: string;
  matricula: string;
  setor: string;
  empresaConvenio: string;
  mensalidade: string;
  valorReembolso: string;
  nomeDiretor: string;
  cargoDiretor: string;
  nomeRh: string;
  cargoRh: string;
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

export async function gerarReembolsoConvenioMedicoPdf({
  dataHoje,
  nome,
  matricula,
  setor,
  empresaConvenio,
  mensalidade,
  valorReembolso,
  nomeDiretor,
  cargoDiretor,
  nomeRh,
  cargoRh,
}: ReembolsoConvenioMedicoPdfParams) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;
  let y = 22;

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
    y += h + 10;
  } catch {
    y += 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("SOLICITAÇÃO DE REEMBOLSO DE CONVÊNIO MÉDICO", pageW / 2, y, {
    align: "center",
  });
  y += 25;

  drawSectionHeader(doc, "Dados do empregado", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nome do funcionário", value: safeText(nome).toUpperCase(), width: contentW * 0.58 },
    { label: "Matrícula", value: safeText(matricula), width: contentW * 0.18 },
    { label: "Data", value: safeText(dataHoje), width: contentW * 0.24 },
  ]);
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Setor", value: safeText(setor).toUpperCase(), width: contentW },
  ]);

  y += 4;
  drawSectionHeader(doc, "Dados do convênio", margin, y, contentW);
  y += 16;
  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Empresa do convênio",
      value: safeText(empresaConvenio).toUpperCase(),
      width: contentW * 0.5,
      maxLines: 2,
    },
    { label: "Mensalidade", value: safeText(mensalidade), width: contentW * 0.25 },
    { label: "Valor a reembolsar", value: safeText(valorReembolso), width: contentW * 0.25 },
  ]);

  y += 4;
  drawSectionHeader(doc, "Solicitação", margin, y, contentW);
  y += 16;
  y = drawParagraphBox(doc, y, margin, contentW, [
    { text: "Solicito o cadastramento para futuros reembolsos das mensalidades do meu convênio médico " },
    { text: safeText(empresaConvenio).toUpperCase(), bold: true },
    { text: ", no valor mensal de " },
    { text: safeText(mensalidade), bold: true },
    { text: ", com valor a reembolsar de " },
    { text: safeText(valorReembolso), bold: true },
    { text: "." },
  ]);

  y += 4;
  y = drawPagedTextSection(doc, y, margin, contentW, pageH, "Regras e condições do benefício", [
    "Abaixo, assino a presente, dando autorização para crédito em meu holerite:",
    "ASSISTÊNCIA MÉDICA HOSPITALAR E ODONTOLÓGICA",
    'A cooperativa de crédito poderá fornecer um plano de saúde e de assistência odontológica padrão aos empregados, com cobertura médica e hospitalar, arcando com 80% (oitenta por cento) do valor da "mensalidade".',
    "Parágrafo Primeiro - Caso o empregado tenha, na composição do valor pago de convênio médico, co-participação, taxas, juros de mora e fator moderador, estes não serão reembolsados, sendo os custos por conta do próprio empregado.",
    "Parágrafo Segundo - O reembolso de que trata esta cláusula está limitado ao valor máximo de R$ 600,00 (seiscentos reais).",
    "Parágrafo Terceiro - Para os dependentes, considerados de acordo com o artigo 16 da Lei 8.213/91, a cooperativa poderá intermediar uma negociação coletiva para que o custo individual seja menor que o ofertado no mercado comercial, sendo que o custo será inteiramente de responsabilidade do empregado.",
    "Parágrafo Quarto - Se o empregado optar por fazer um plano de saúde similar ao que a Cooperativa oferece e mantém convênio, poderá se cadastrar particularmente em outro convênio que o atenda e solicitar o reembolso de 80% (oitenta por cento) sobre a mensalidade paga do titular.",
    "Parágrafo Quinto - Tratando-se de Cooperativa de Crédito que conceda assistência médica hospitalar e odontológica, ao empregado dispensado sem justa causa fica assegurado o direito de continuar usufruindo dessa assistência por um período de 30 (trinta) dias, contados do último dia de trabalho efetivo.",
    "Parágrafo Sexto - Se o empregado tiver 15 (quinze) ou mais anos de serviço prestado à mesma empresa, o período nesta cláusula fica ampliado para 90 (noventa) dias.",
    'Parágrafo Sétimo - Todos os meses, antes do dia 15 de cada mês, o funcionário deverá apresentar formulário preenchido e assinado e autorizado pela diretoria no primeiro mês e, nos demais meses: contrato, boleto, comprovante de pagamento e outros. O principal é o documento onde consta o valor exato da "mensalidade" do funcionário titular do convênio médico.',
    "Parágrafo Oitavo - Caso o funcionário esqueça ou se atrase na entrega destes documentos acima descritos, ficará sem receber o reembolso. Cabe somente à Diretoria Executiva determinar o pagamento da mensalidade fora do prazo e não reembolsada, mediante explanação e justificativas por escrito do funcionário, sempre no próximo holerite.",
  ]);

  ensureSpace(190);
  y += 52;
  y = drawSignatureRow(doc, y, margin, contentW, [
    { label: safeText(nome).toUpperCase(), caption: "Assinatura do funcionário" },
    { label: safeText(nomeDiretor).toUpperCase(), caption: safeText(cargoDiretor, "Diretoria") },
  ]);

  y += 62;
  ensureSpace(96);
  drawSignatureRow(doc, y, margin, contentW, [
    { label: safeText(nomeRh).toUpperCase(), caption: safeText(cargoRh, "Gestão de Pessoas") },
    { label: "", caption: "" },
  ]);

  doc.save(`reembolso_convenio_medico_${sanitizeFileName(nome || "funcionario")}.pdf`);
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
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(safeText(opts.value), opts.w - 8).slice(0, opts.maxLines ?? 1);
  doc.text(lines, opts.x + 4, opts.y + 18, { lineHeightFactor: 1.05 });
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
  const lineHeight = 10;
  const maxLineWidth = w - padding * 2;

  doc.setFontSize(8.6);
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

  let textY = y + padding + 7;
  lines.forEach((line) => {
    let cursorX = x + padding;
    line.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      doc.setFontSize(8.6);
      doc.setTextColor(15, 23, 42);
      doc.text(token.text, cursorX, textY);
      cursorX += doc.getTextWidth(token.text);
    });
    textY += lineHeight;
  });

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

    if (!signature.label && !signature.caption) return;

    doc.line(signatureX + 18, y, signatureX + signatureW - 18, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.text(signature.label, centerX, y + 13, { align: "center", maxWidth: signatureW - 12 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text(signature.caption, centerX, y + 24, { align: "center", maxWidth: signatureW - 12 });
  });

  doc.setTextColor(0, 0, 0);
  return y + 34;
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
    paragraph.match(/^(Parágrafo (Primeiro|Segundo|Terceiro|Quarto|Quinto|Sexto|Sétimo|Oitavo) - |ASSISTÊNCIA MÉDICA HOSPITALAR E ODONTOLÓGICA)/)?.[0] || "";

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
