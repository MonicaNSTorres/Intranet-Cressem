/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type ParcelaPdf = {
  NR_CONTRATO?: string;
  NM_CATEGORIA?: string;
  SN_QUITACAO?: number | string;
  DT_PERIODO?: string;
  NR_PARCELA?: string | number;
  VL_PARCELA_CRM?: number | string;
};

type PagamentoPdf = {
  NM_FORMA_PAGAMENTO?: string;
  VL_PAGAMENTO?: number | string;
};

type ReciboFinanceiroPdf = {
  ID_RECIBO_CRM?: number | string;
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA?: string;
  NM_EMPRESA?: string;
  DT_DIA: string;
  CIDADE: string;
  TP_ATENDIMENTO: string;
  OBSERVACAO?: string;
  NM_FUNCIONARIO?: string;
  PARCELAS: ParcelaPdf[];
  PAGAMENTOS: PagamentoPdf[];
};

type GerarPdfReciboFinanceiroOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

export async function gerarPdfReciboFinanceiro(
  recibo: ReciboFinanceiroPdf,
  options: GerarPdfReciboFinanceiroOptions = {}
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

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
    doc.addImage(logo.dataUrl, "PNG", margin, y, w, h);
    y += h + 8;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Recibo de Pagamento", pageW / 2, y, { align: "center" });
  y += 22;

  y = ensureSpace(doc, { currentY: y, needed: 92, margin, pageH });
  drawSectionHeader(doc, "Dados do recibo", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Data", value: formatDateBR(recibo.DT_DIA), width: contentW * 0.2 },
    { label: "Solicitacao", value: safeText(recibo.TP_ATENDIMENTO), width: contentW * 0.4 },
    { label: "Cidade", value: safeText(recibo.CIDADE), width: contentW * 0.4 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "CPF/CNPJ", value: formatCpfCnpj(recibo.NR_CPF_CNPJ), width: contentW * 0.3 },
    { label: "Nome", value: safeText(recibo.NM_ASSOCIADO), width: contentW * 0.7 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Recibo", value: String(recibo.ID_RECIBO_CRM || "Novo"), width: contentW * 0.2 },
    { label: "Matricula", value: safeText(recibo.NR_MATRICULA), width: contentW * 0.2 },
    { label: "Empresa", value: safeText(recibo.NM_EMPRESA), width: contentW * 0.6 },
  ]);

  y += 4;
  y = ensureSpace(doc, { currentY: y, needed: 120, margin, pageH });
  drawSectionHeader(doc, "Pagamentos", margin, y, contentW);
  y += 18;

  const colPagamento = {
    item: 170,
    contrato: 78,
    parcela: 58,
    mesAno: 70,
    quitacao: 72,
    valor: contentW - (170 + 78 + 58 + 70 + 72),
  };

  y = drawTableHeader(doc, y, margin, [
    { label: "ITEM DE PAGAMENTO", width: colPagamento.item },
    { label: "CONTRATO", width: colPagamento.contrato, alignCenter: true },
    { label: "PARCELA", width: colPagamento.parcela, alignCenter: true },
    { label: "MES/ANO", width: colPagamento.mesAno, alignCenter: true },
    { label: "QUITACAO", width: colPagamento.quitacao, alignCenter: true },
    { label: "VALOR A PAGAR", width: colPagamento.valor, alignRight: true },
  ]);

  const parcelas = Array.isArray(recibo.PARCELAS) ? recibo.PARCELAS : [];
  let totalParcelas = 0;

  if (!parcelas.length) {
    y = drawTableRow(doc, y, margin, [
      { value: "Sem pagamentos cadastrados", width: contentW - colPagamento.valor },
      { value: "-", width: colPagamento.valor, alignRight: true },
    ]);
  } else {
    for (const item of parcelas) {
      y = ensureSpace(doc, { currentY: y, needed: 26, margin, pageH });
      const valor = toNumber(item?.VL_PARCELA_CRM);
      totalParcelas += valor;

      y = drawTableRow(doc, y, margin, [
        { value: safeText(item?.NM_CATEGORIA), width: colPagamento.item },
        { value: safeText(item?.NR_CONTRATO), width: colPagamento.contrato, alignCenter: true },
        { value: safeText(item?.NR_PARCELA), width: colPagamento.parcela, alignCenter: true },
        { value: formatMonthYear(item?.DT_PERIODO), width: colPagamento.mesAno, alignCenter: true },
        { value: yesNo(item?.SN_QUITACAO), width: colPagamento.quitacao, alignCenter: true },
        { value: fmtBRL(valor), width: colPagamento.valor, alignRight: true },
      ]);
    }
  }

  y = drawTotalRow(doc, y, margin, contentW, "TOTAL", fmtBRL(totalParcelas));

  y += 6;
  const gapCols = 10;
  const colW = (contentW - gapCols) / 2;
  y = ensureSpace(doc, { currentY: y, needed: 138, margin, pageH });

  drawSectionHeader(doc, "Observacao", margin, y, colW);
  drawSectionHeader(doc, "Forma de pagamento", margin + colW + gapCols, y, colW);

  const pagamentos = Array.isArray(recibo.PAGAMENTOS) ? recibo.PAGAMENTOS : [];
  const totalPagamentos = pagamentos.reduce(
    (acc, item) => acc + toNumber(item?.VL_PAGAMENTO),
    0
  );

  const rightRows = Math.max(1, pagamentos.length);
  const rightTableHeight = 20 + rightRows * 24 + 22;
  const leftBoxHeight = Math.max(96, rightTableHeight);

  const leftY = y + 18;
  drawFieldBox(doc, {
    x: margin,
    y: leftY,
    w: colW,
    h: leftBoxHeight,
    label: "Observacao",
    value: safeText(recibo.OBSERVACAO),
    maxLines: 8,
  });

  let rightY = y + 18;
  const rightFormaW = colW - 110;
  const rightValorW = 110;

  rightY = drawTableHeader(doc, rightY, margin + colW + gapCols, [
    { label: "FORMA", width: rightFormaW },
    { label: "VALOR", width: rightValorW, alignRight: true },
  ]);

  if (!pagamentos.length) {
    rightY = drawTableRow(doc, rightY, margin + colW + gapCols, [
      { value: "Sem forma cadastrada", width: rightFormaW },
      { value: "-", width: rightValorW, alignRight: true },
    ]);
  } else {
    for (const item of pagamentos) {
      rightY = drawTableRow(doc, rightY, margin + colW + gapCols, [
        { value: safeText(item?.NM_FORMA_PAGAMENTO), width: rightFormaW },
        { value: fmtBRL(toNumber(item?.VL_PAGAMENTO)), width: rightValorW, alignRight: true },
      ]);
    }
  }

  rightY = drawTotalRow(
    doc,
    rightY,
    margin + colW + gapCols,
    colW,
    "TOTAL",
    fmtBRL(totalPagamentos)
  );

  y = Math.max(leftY + leftBoxHeight, rightY) + 38;
  y = ensureSpace(doc, { currentY: y, needed: 76, margin, pageH });

  const sigGap = 36;
  const sigW = (contentW - sigGap) / 2;
  const sigY = y + 12;

  drawSignature(doc, margin, sigY, sigW, safeText(recibo.NM_ASSOCIADO), "Associado");
  drawSignature(
    doc,
    margin + sigW + sigGap,
    sigY,
    sigW,
    safeText(recibo.NM_FUNCIONARIO),
    "Responsavel SicoobCressem"
  );

  const nomeArquivo =
    options.nomeArquivo ||
    `recibo_financeiro_${sanitize(recibo.NM_ASSOCIADO || "associado")}_${sanitize(
      String(recibo.ID_RECIBO_CRM || "novo")
    )}.pdf`;

  const acao = options.acao || "download";
  if (acao === "print") {
    await printPdf(doc, nomeArquivo);
    return;
  }

  doc.save(nomeArquivo);
}

type FieldBox = {
  label: string;
  value: string;
  width: number;
  alignRight?: boolean;
  maxLines?: number;
};

type TableCell = {
  value: string;
  width: number;
  alignRight?: boolean;
  alignCenter?: boolean;
};

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

function drawFieldsRow(
  doc: jsPDF,
  y: number,
  x: number,
  totalW: number,
  fields: FieldBox[],
  h = 22
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
      alignRight: field.alignRight,
      maxLines: field.maxLines ?? 1,
    });
    cursorX += w;
  });

  return y + h;
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
    alignRight?: boolean;
    maxLines?: number;
  }
) {
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.rect(opts.x, opts.y, opts.w, opts.h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.1);
  doc.setTextColor(90, 110, 95);
  if (opts.label.trim()) {
    doc.text(opts.label.toUpperCase(), opts.x + 4, opts.y + 7.2);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);

  const lines = splitWithEllipsis(doc, safeText(opts.value), opts.w - 8, opts.maxLines || 1);

  if (opts.alignRight && lines.length === 1) {
    doc.text(lines[0], opts.x + opts.w - 4, opts.y + 17, { align: "right" });
  } else {
    doc.text(lines, opts.x + 4, opts.y + 17);
  }

  doc.setTextColor(0, 0, 0);
}

function drawTableHeader(
  doc: jsPDF,
  y: number,
  x: number,
  cols: Array<{ label: string; width: number; alignRight?: boolean; alignCenter?: boolean }>
) {
  const h = 20;
  let cursor = x;

  for (const col of cols) {
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.setLineWidth(0.45);
    doc.rect(cursor, y, col.width, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);

    if (col.alignRight) {
      doc.text(col.label, cursor + col.width - 6, y + 13, { align: "right" });
    } else if (col.alignCenter) {
      doc.text(col.label, cursor + col.width / 2, y + 13, { align: "center" });
    } else {
      doc.text(col.label, cursor + 6, y + 13);
    }

    cursor += col.width;
  }

  doc.setTextColor(0, 0, 0);
  return y + h;
}

function drawTableRow(doc: jsPDF, y: number, x: number, cells: TableCell[]) {
  const h = 24;
  let cursor = x;

  for (const cell of cells) {
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.rect(cursor, y, cell.width, h, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);

    const lines = splitWithEllipsis(doc, safeText(cell.value), cell.width - 10, 2);

    if (cell.alignRight && lines.length === 1) {
      doc.text(lines[0], cursor + cell.width - 6, y + 16, { align: "right" });
    } else if (cell.alignCenter && lines.length === 1) {
      doc.text(lines[0], cursor + cell.width / 2, y + 16, { align: "center" });
    } else {
      doc.text(lines, cursor + 5, y + 16);
    }

    cursor += cell.width;
  }

  doc.setTextColor(0, 0, 0);
  return y + h;
}

function drawTotalRow(
  doc: jsPDF,
  y: number,
  x: number,
  totalW: number,
  label: string,
  totalFmt: string
) {
  const h = 22;
  const labelW = totalW - 140;
  const valueW = 140;

  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setLineWidth(0.45);

  doc.rect(x, y, labelW, h, "FD");
  doc.rect(x + labelW, y, valueW, h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(label, x + 6, y + 14);
  doc.text(totalFmt, x + labelW + valueW - 6, y + 14, { align: "right" });
  doc.setTextColor(0, 0, 0);

  return y + h;
}

function drawSignature(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  name: string,
  role: string
) {
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + w, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x + w / 2, y + 13, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(`(${role})`, x + w / 2, y + 25, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function splitWithEllipsis(doc: jsPDF, value: string, width: number, maxLines: number) {
  const raw = doc.splitTextToSize(value || "", Math.max(width, 20)) as string[];
  if (raw.length <= maxLines) return raw.length ? raw : [""];

  const clipped = raw.slice(0, maxLines);
  clipped[maxLines - 1] = fitText(doc, clipped[maxLines - 1], width, true);
  return clipped;
}

function fitText(doc: jsPDF, text: string, maxWidth: number, withEllipsis = false) {
  const suffix = withEllipsis ? "..." : "";
  let t = String(text || "").trim();

  while (t.length > 0 && doc.getTextWidth(t + suffix) > maxWidth) {
    t = t.slice(0, -1);
  }

  return t + suffix;
}

function safeText(v?: string | number | null) {
  return String(v || "-").trim() || "-";
}

function yesNo(value?: string | number | null) {
  const n = String(value ?? "").trim();
  if (n === "1") return "SIM";
  if (n === "0") return "NAO";
  return "-";
}

function toNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const n = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmtBRL(value?: number | null) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfCnpj(value?: string | null) {
  const digits = onlyDigits(String(value || ""));
  if (!digits) return "";

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }

  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).slice(0, 10).split("-");
  if (!y || !m || !d) return String(dateISO);
  return `${d}/${m}/${y}`;
}

function formatMonthYear(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m] = String(dateISO).slice(0, 10).split("-");
  if (!y || !m) return "";
  return `${m}/${y}`;
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function loadImageDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo nao encontrado");

  const b = await r.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  return { dataUrl, width: img.width, height: img.height };
}

async function printPdf(doc: jsPDF, nomeArquivo: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    doc.save(nomeArquivo);
    return;
  }

  const blob = doc.output("blob");
  const blobUrl = window.URL.createObjectURL(blob);

  await new Promise<void>((resolve) => {
    const win = window.open(blobUrl, "_blank");
    if (!win) {
      doc.save(nomeArquivo);
      window.URL.revokeObjectURL(blobUrl);
      resolve();
      return;
    }

    let fired = false;
    const cleanup = () => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch {}
    };

    const runPrint = () => {
      if (fired) return;
      fired = true;

      try {
        win.focus();
        win.print();
      } catch {}

      setTimeout(() => {
        cleanup();
        resolve();
      }, 3500);
    };

    try {
      win.addEventListener("load", runPrint, { once: true });
    } catch {}

    setTimeout(runPrint, 900);
  });
}
