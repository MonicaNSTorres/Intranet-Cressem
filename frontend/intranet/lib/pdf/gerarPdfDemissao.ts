import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ParcelaDemissao = {
  numero: number;
  data: string;
  valor: string;
};

export type GerarPdfDemissaoData = {
  tipoFormulario: "CREDOR" | "DEVEDOR";
  cpf: string;
  nome: string;
  matricula: string;
  empresa: string;
  telefone: string;

  saldoCapital: string;
  possuiConvenioOdontologico?: string;
  debitoConta: string;
  debitoEmprestimo: string;
  debitoCartao: string;
  convenioOdontologico?: string;
  totalDebitos: string;
  saldoFinal: string;

  banco: string;
  agencia: string;
  conta: string;
  digito: string;

  primeiraParcelaValor: string;
  primeiraParcelaData: string;
  totalDevolucaoParcelada: string;
  parcelas: ParcelaDemissao[];

  motivoDemissao: string;
  dataRetorno: string;

  reciboTransferencia: string;
  reciboPix: string;
  reciboDebitoConta: string;
  reciboTotal: string;

  cidadeAtendimento: string;
  dataAtendimento: string;
  atendente: string;
};

type JsPdfWithLastAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const GREEN = { r: 121, g: 183, b: 41 };
const GREEN_DARK = { r: 0, g: 54, b: 65 };
const GREEN_LIGHT = { r: 242, g: 248, b: 235 };
type StyledPart = { text: string; bold?: boolean };

function safeText(value?: string) {
  return String(value || "-").trim() || "-";
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function loadImageDataURL(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Logo nao encontrada");

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  return { dataUrl, width: img.width, height: img.height };
}

export async function gerarPdfDemissao(data: GerarPdfDemissaoData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const contentW = pageW - margin * 2;
  let y = 20;

  const getFinalY = () => {
    const d = doc as JsPdfWithLastAutoTable;
    return d.lastAutoTable?.finalY ?? y;
  };

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

  const drawParagraphBox = (title: string, paragraphs: string[]) => {
    const padding = 6;
    const lineHeight = 9.5;
    const paragraphGap = 3;
    const linesByParagraph = paragraphs.map((p) =>
      doc.splitTextToSize(p, contentW - padding * 2)
    );
    const linesCount = linesByParagraph.reduce((acc, lines) => acc + lines.length, 0);
    const contentHeight =
      linesCount * lineHeight + Math.max(0, paragraphs.length - 1) * paragraphGap;
    const boxH = contentHeight + padding * 2;

    ensureSpace(22 + boxH + 3);
    drawSectionHeader(title);

    doc.setDrawColor(220, 230, 220);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentW, boxH, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(40, 55, 70);

    let textY = y + padding + 6;
    linesByParagraph.forEach((lines, index) => {
      lines.forEach((line: string) => {
        doc.text(line, margin + padding, textY);
        textY += lineHeight;
      });
      if (index < linesByParagraph.length - 1) {
        textY += paragraphGap;
      }
    });

    y += boxH + 3;
    doc.setTextColor(0, 0, 0);
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

  const drawStyledText = (
    parts: StyledPart[],
    startX: number,
    startY: number,
    maxLineWidth: number
  ) => {
    const lineHeight = 9;
    doc.setFontSize(8.2);
    doc.setTextColor(40, 55, 70);

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

    ensureSpace(lines.length * lineHeight + 10);
    let textY = startY;

    lines.forEach((line) => {
      let cursorX = startX;
      line.forEach((token) => {
        doc.setFont("helvetica", token.bold ? "bold" : "normal");
        doc.text(token.text, cursorX, textY);
        cursorX += doc.getTextWidth(token.text);
      });
      textY += lineHeight;
    });

    return textY;
  };

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png");
    const maxW = 140;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    doc.addImage(logo.dataUrl, "PNG", margin, y, w, h);
    y += h + 8;
  } catch {
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(
    `TERMO DE DEMISSAO ESPONTANEA ${data.tipoFormulario === "CREDOR" ? "CREDORA" : "DEVEDORA"}`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 14;

  drawSectionHeader("Dados do associado");
  drawFieldsRow([
    { label: "CPF/CNPJ", value: data.cpf, width: 170 },
    { label: "Nome", value: data.nome, width: contentW - 170 },
  ]);
  drawFieldsRow([
    { label: "Matricula", value: data.matricula, width: contentW * 0.25 },
    { label: "Empresa", value: data.empresa, width: contentW * 0.5 },
    { label: "Telefone", value: data.telefone, width: contentW * 0.25 },
  ]);

  drawStyledParagraphBox("Solicitacao", [
    { text: "Eu, " },
    { text: `${safeText(data.nome)}`, bold: true },
    { text: ", " },
    ...(safeText(data.matricula) !== "-"
      ? [{ text: "matricula " }, { text: safeText(data.matricula), bold: true }, { text: ", " }]
      : []),
    { text: "CPF/CNPJ " },
    { text: safeText(data.cpf), bold: true },
    {
      text:
        ", associado(a) desta Cooperativa de Credito, venho solicitar meu desligamento do quadro associativo, bem como o ressarcimento de minha integralizacao de capital ate a presente data, segundo as normas vigentes.",
    },
  ]);

  drawSectionHeader("Resumo financeiro");
  drawFieldsRow([
    { label: "Saldo conta capital", value: data.saldoCapital, width: contentW * 0.34 },
    {
      label: "Possui convenio odontologico",
      value: safeText(data.possuiConvenioOdontologico || "Não"),
      width: contentW * 0.26,
    },
    { label: "Convenio odontologico", value: data.convenioOdontologico || "R$ 0,00", width: contentW * 0.4 },
  ]);
  drawFieldsRow([
    { label: "Debito conta", value: data.debitoConta, width: contentW / 3 },
    { label: "Debito emprestimo", value: data.debitoEmprestimo, width: contentW / 3 },
    { label: "Debito cartao", value: data.debitoCartao, width: contentW - (contentW / 3) * 2 },
  ]);
  drawFieldsRow([
    { label: "Total de debitos", value: data.totalDebitos, width: contentW / 2 },
    {
      label: data.tipoFormulario === "CREDOR" ? "Total a devolver" : "Total a pagar",
      value: data.saldoFinal,
      width: contentW / 2,
    },
  ]);

  if (data.tipoFormulario === "CREDOR") {
    drawSectionHeader("Dados bancarios e devolucao");
    drawFieldsRow([
      { label: "Banco", value: data.banco, width: contentW * 0.2 },
      { label: "Agencia", value: data.agencia, width: contentW * 0.25 },
      { label: "Conta", value: data.conta, width: contentW * 0.35 },
      { label: "Digito", value: data.digito, width: contentW * 0.2 },
    ]);
    drawFieldsRow([
      { label: "Valor da 1a parcela", value: data.primeiraParcelaValor, width: contentW / 2 },
      { label: "Data da 1a parcela", value: data.primeiraParcelaData, width: contentW / 2 },
    ]);
    drawFieldsRow([
      { label: "Total devolucao parcelada", value: data.totalDevolucaoParcelada, width: contentW },
    ]);

    ensureSpace(100);
    autoTable(doc, {
      startY: y + 2,
      head: [["Parcela", "Data", "Valor"]],
      body:
        data.parcelas.length > 0
          ? data.parcelas.map((p) => [String(p.numero), safeText(p.data), safeText(p.valor)])
          : [["-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8.1, textColor: [30, 41, 59], cellPadding: 3.8 },
      headStyles: {
        fillColor: [GREEN_LIGHT.r, GREEN_LIGHT.g, GREEN_LIGHT.b],
        textColor: [GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b],
      },
      margin: { left: margin, right: margin },
      tableWidth: contentW,
    });
    y = getFinalY() + 7;
  } else {
    drawSectionHeader("Recibo");
    const docLabel =
      String(data.cpf || "").replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";
    ensureSpace(95);
    const reciboParts: StyledPart[] = [
      { text: "Recebi do(a) Sr(a) " },
      { text: safeText(data.nome), bold: true },
      { text: `, ${docLabel}: ` },
      { text: safeText(data.cpf), bold: true },
      ...(safeText(data.matricula) !== "-"
        ? [{ text: ", matricula " }, { text: safeText(data.matricula), bold: true }]
        : []),
      { text: ", a quantia de " },
      { text: safeText(data.reciboTotal), bold: true },
      { text: ", pagos da seguinte forma:" },
    ];
    y = drawStyledText(reciboParts, margin + 2, y + 10, contentW - 4) + 2;

    ensureSpace(85);
    autoTable(doc, {
      startY: y + 2,
      head: [["Forma de pagamento", "Valor"]],
      body: [
        ["Transferencia", safeText(data.reciboTransferencia)],
        ["Pix", safeText(data.reciboPix)],
        ["Debito em C/C", safeText(data.reciboDebitoConta)],
        ["Total a pagar", safeText(data.reciboTotal)],
      ],
      theme: "grid",
      styles: { fontSize: 8.1, textColor: [30, 41, 59], cellPadding: 3.8 },
      headStyles: {
        fillColor: [GREEN_LIGHT.r, GREEN_LIGHT.g, GREEN_LIGHT.b],
        textColor: [GREEN_DARK.r, GREEN_DARK.g, GREEN_DARK.b],
      },
      margin: { left: margin, right: margin },
      tableWidth: contentW,
    });
    y = getFinalY() + 6;

    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text("Setor Financeiro", margin + 2, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Referente ao pagamento do saldo devedor da demissao espontanea (desligamento do quadro associativo).",
      margin + 2,
      y + 18
    );
    y += 22;
  }

  drawParagraphBox("Consideracoes finais", [
    "Ao solicitar a demissao, tenho ciencia de que minha conta corrente no Sicoob Cressem podera ser encerrada, devendo regularizar debitos pendentes, incluindo cheque especial, cartao de credito e demais obrigacoes vinculadas.",
    "Em caso de seguros com debito em conta, portabilidade de salario/chave PIX, TAG e debitos automaticos, o cancelamento e a manutencao passam a ser de minha responsabilidade.",
    "Declaro, ainda, ciencia de que o convenio odontologico sera cancelado automaticamente, exigindo novo contrato em caso de retorno ao quadro associativo.",
  ]);

  drawSectionHeader("Outras informacoes");
  drawFieldsRow([{ label: "Motivo da demissao", value: data.motivoDemissao, width: contentW }]);
  drawFieldsRow([
    { label: "Cidade do atendimento", value: data.cidadeAtendimento, width: contentW * 0.4 },
    { label: "Dia do atendimento", value: data.dataAtendimento, width: contentW * 0.3 },
    { label: "Data de retorno", value: data.dataRetorno, width: contentW * 0.3 },
  ]);

  ensureSpace(130);
  y += 42;

  const assinaturaW = 220;
  const gap = 28;
  const totalW = assinaturaW * 2 + gap;
  const x1 = (pageW - totalW) / 2;
  const x2 = x1 + assinaturaW + gap;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(x1, y, x1 + assinaturaW, y);
  doc.line(x2, y, x2 + assinaturaW, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(safeText(data.nome), x1 + assinaturaW / 2, y, { align: "center" });
  doc.text(safeText(data.atendente || "Atendente"), x2 + assinaturaW / 2, y, { align: "center" });

  y += 30;
  doc.line(x1, y, x1 + assinaturaW, y);
  y += 15;
  doc.text("Validação", x1 + assinaturaW / 2, y, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.save(`demissao_${sanitize(data.nome || "associado")}.pdf`);
}



