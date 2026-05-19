/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type DespesaPdf = {
  TP_DESPESA?: string;
  DESC_DESPESA?: string;
  VALOR?: number | string;
};

type Opts = {
  idSolicitacao: string | number;
  nomeFuncionario: string;
  cpfFuncionario: string;
  cidade: string;
  dtIda: string;
  dtVolta: string;
  justificativa: string;
  nrBanco: string;
  agencia: string;
  nrConta: string;
  andamento: string;
  despesas: DespesaPdf[];

  nmFinanceiro?: string;
  parecerFinanceiro?: string;
  nmGerencia?: string;
  parecerGerencia?: string;
  nmGerenciaSup?: string;
  parecerGerenciaSup?: string;
  nmDiretoria?: string;
  parecerDiretoria?: string;
  parecerFinal?: string;
};

type GerarPdfSolicitacaoReembolsoOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

export async function gerarPdfSolicitacaoReembolso(
  o: Opts,
  options: GerarPdfSolicitacaoReembolsoOptions = {}
) {
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
    const w = logo.width * scale;
    const h = logo.height * scale;

    doc.addImage(logo.dataUrl, logo.type, margin, y, w, h, undefined, "MEDIUM");
    y += h + 8;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Reembolso de Despesas - N° ${String(o.idSolicitacao || "")}`, pageW / 2, y, {
    align: "center",
  });
  y += 24;

  y = ensureSpace(doc, { currentY: y, needed: 40, margin, pageH });
  drawSectionHeader(doc, "Dados da solicitacao", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "ID Solicitacao", value: String(o.idSolicitacao || ""), width: contentW * 0.34 },
    { label: "Status", value: o.andamento || "", width: contentW * 0.33 },
    { label: "Data Emissao", value: formatDateBR(todayISO()), width: contentW * 0.33 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Funcionario", value: o.nomeFuncionario || "", width: contentW * 0.7 },
    { label: "CPF", value: formatCpfView(o.cpfFuncionario || ""), width: contentW * 0.3 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Ida", value: formatDateBR(o.dtIda || ""), width: contentW * 0.2 },
    { label: "Volta", value: formatDateBR(o.dtVolta || ""), width: contentW * 0.2 },
    { label: "Cidade", value: o.cidade || "", width: contentW * 0.4 },
    { label: "Data Solicitação", value: formatDateBR(todayISO()), width: contentW * 0.2 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Nr. Banco", value: o.nrBanco || "", width: contentW / 3 },
    { label: "Agencia", value: o.agencia || "", width: contentW / 3 },
    { label: "Nr. Conta", value: o.nrConta || "", width: contentW / 3 },
  ]);

  y = drawFieldsRow(
    doc,
    y,
    margin,
    contentW,
    [{ label: "Justificativa", value: o.justificativa || "", width: contentW, maxLines: 3 }],
    36
  );

  y += 4;
  y = ensureSpace(doc, { currentY: y, needed: 40, margin, pageH });
  drawSectionHeader(doc, "Despesas informadas", margin, y, contentW);
  y += 18;

  const colTipoW = contentW * 0.22;
  const colDescW = contentW * 0.58;
  const colValorW = contentW * 0.2;
  y = drawExpenseHeaderRow(doc, y, margin, [colTipoW, colDescW, colValorW]);

  const despesas = Array.isArray(o.despesas) ? o.despesas : [];
  let total = 0;

  if (!despesas.length) {
    y = drawExpenseDataRow(
      doc,
      y,
      margin,
      [colTipoW, colDescW, colValorW],
      ["-", "Sem despesas informadas", "-"]
    );
  } else {
    for (const d of despesas) {
      y = ensureSpace(doc, { currentY: y, needed: 28, margin, pageH });
      y = drawExpenseDataRow(
        doc,
        y,
        margin,
        [colTipoW, colDescW, colValorW],
        [safeText(d?.TP_DESPESA), safeText(d?.DESC_DESPESA), fmtBRL(toNumber(d?.VALOR))]
      );
      total += toNumber(d?.VALOR);
    }
  }

  y = drawExpenseTotalRow(
    doc,
    y,
    margin,
    [colTipoW, colDescW, colValorW],
    fmtBRL(total)
  );

  y += 4;
  y = ensureSpace(doc, { currentY: y, needed: 160, margin, pageH });
  drawSectionHeader(doc, "Pareceres e aprovacoes", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Financeiro", value: safeText(o.nmFinanceiro), width: contentW * 0.4 },
    { label: "Parecer Financeiro", value: safeText(o.parecerFinanceiro), width: contentW * 0.6, maxLines: 2 },
  ], 28);

  if (hasText(o.nmGerencia) || hasText(o.parecerGerencia)) {
    y = drawFieldsRow(doc, y, margin, contentW, [
      { label: "Gerencia", value: safeText(o.nmGerencia), width: contentW * 0.4 },
      { label: "Parecer Gerencia", value: safeText(o.parecerGerencia), width: contentW * 0.6, maxLines: 2 },
    ], 28);
  }

  if (hasText(o.nmGerenciaSup) || hasText(o.parecerGerenciaSup)) {
    y = drawFieldsRow(doc, y, margin, contentW, [
      { label: "Gerencia Superior", value: safeText(o.nmGerenciaSup), width: contentW * 0.4 },
      { label: "Parecer Gerencia Superior", value: safeText(o.parecerGerenciaSup), width: contentW * 0.6, maxLines: 2 },
    ], 28);
  }

  if (hasText(o.nmDiretoria) || hasText(o.parecerDiretoria)) {
    y = drawFieldsRow(doc, y, margin, contentW, [
      { label: "Diretoria", value: safeText(o.nmDiretoria), width: contentW * 0.4 },
      { label: "Parecer Diretoria", value: safeText(o.parecerDiretoria), width: contentW * 0.6, maxLines: 2 },
    ], 28);
  }

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Parecer Final", value: safeText(o.parecerFinal || o.andamento), width: contentW },
  ]);

  const nomeArquivo =
    options.nomeArquivo ||
    `reembolso_${sanitize(String(o.idSolicitacao || "solicitacao"))}.pdf`;

  if (options.acao === "print") {
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
  if (opts.label.trim()) doc.text(opts.label.toUpperCase(), opts.x + 4, opts.y + 7.2);

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

function drawExpenseHeaderRow(
  doc: jsPDF,
  y: number,
  x: number,
  colWidths: number[]
) {
  const h = 20;
  const headers = ["TIPO", "DESCRICAO", "VALOR"];
  let cursor = x;
  for (let i = 0; i < headers.length; i++) {
    const w = colWidths[i];
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.setLineWidth(0.45);
    doc.rect(cursor, y, w, h, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    if (i === 2) {
      doc.text(headers[i], cursor + w - 6, y + 13, { align: "right" });
    } else {
      doc.text(headers[i], cursor + 6, y + 13);
    }
    cursor += w;
  }
  doc.setTextColor(0, 0, 0);
  return y + h;
}

function drawExpenseDataRow(
  doc: jsPDF,
  y: number,
  x: number,
  colWidths: number[],
  values: [string, string, string]
) {
  const h = 24;
  let cursor = x;
  for (let i = 0; i < colWidths.length; i++) {
    const w = colWidths[i];
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.45);
    doc.rect(cursor, y, w, h, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    const text = safeText(values[i]);
    const lines = splitWithEllipsis(doc, text, w - 10, 2);
    if (i === 2 && lines.length === 1) {
      doc.text(lines[0], cursor + w - 6, y + 16, { align: "right" });
    } else {
      doc.text(lines, cursor + 5, y + 16);
    }
    cursor += w;
  }
  doc.setTextColor(0, 0, 0);
  return y + h;
}

function drawExpenseTotalRow(
  doc: jsPDF,
  y: number,
  x: number,
  colWidths: number[],
  totalFmt: string
) {
  const h = 22;
  const labelW = colWidths[0] + colWidths[1];
  const valueW = colWidths[2];

  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setLineWidth(0.45);
  doc.rect(x, y, labelW, h, "FD");
  doc.rect(x + labelW, y, valueW, h, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("TOTAL DESPESAS", x + 6, y + 14);
  doc.text(totalFmt, x + labelW + valueW - 6, y + 14, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return y + h;
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
  while (t.length > 0 && doc.getTextWidth(t + suffix) > maxWidth) t = t.slice(0, -1);
  return t + suffix;
}

function safeText(v?: string | null) {
  return String(v || "-").trim() || "-";
}

function hasText(v?: string | null) {
  return String(v || "").trim().length > 0;
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

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).slice(0, 10).split("-");
  if (!y || !m || !d) return String(dateISO);
  return `${d}/${m}/${y}`;
}

function formatCpfView(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return String(value || "");
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadImageDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo nao encontrado");

  const b = await r.blob();
  const originalDataUrl = await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = originalDataUrl;
  });

  const maxWidth = 560;
  const maxHeight = 174;
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
      // Se popup bloquear, faz download como fallback confiável.
      doc.save(nomeArquivo);
      window.URL.revokeObjectURL(blobUrl);
      resolve();
      return;
    }

    const cleanup = () => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch { }
    };

    // Aguarda o PDF carregar na nova aba e só então abre o print.
    const onLoaded = () => {
      try {
        win.focus();
        win.print();
      } catch { }
      // Dá tempo para o spool do "Microsoft Print to PDF" consumir o documento.
      setTimeout(() => {
        cleanup();
        resolve();
      }, 4000);
    };

    try {
      win.addEventListener("load", onLoaded, { once: true });
      // fallback em navegadores que não disparam load para blob/pdf
      setTimeout(onLoaded, 900);
    } catch {
      setTimeout(onLoaded, 900);
    }
  });
}
