/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

export type ResgateEmprestimoPdfItem = {
  tipo: string;
  contrato: string;
  saldoDevedor: number;
  amortizacao: number;
};

export type ResgateParcelaPdfItem = {
  numero: number;
  data: string;
  valor: number;
};

export type GerarPdfResgateCapitalData = {
  cpfCnpj: string;
  nome: string;
  matricula?: string;
  empresa?: string;
  motivo?: string;
  autorizadoPor?: string;

  saldoCapitalAtual: number;
  totalResgateCapital: number;
  saldoCapitalRestante: number;

  emprestimos: ResgateEmprestimoPdfItem[];

  contaCorrenteNumero?: string;
  contaCorrenteSaldo?: number;
  contaCorrenteAmortizacao?: number;

  cartaoNumero?: string;
  cartaoSaldo?: number;
  cartaoAmortizacao?: number;

  saldoCreditadoConta?: number;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;

  valorPrimeiraParcela?: number;
  dataPrimeiraParcela?: string;
  parcelas: ResgateParcelaPdfItem[];
  totalParcelado?: number;

  cidadeAtendimento?: string;
  dataAtendimento?: string;
  atendente?: string;
};

type GerarPdfResgateCapitalOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

type FieldBox = {
  label: string;
  value: string;
  width: number;
  alignRight?: boolean;
  maxLines?: number;
};

type Cursor = { y: number };

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

export async function gerarPdfResgateCapital(
  data: GerarPdfResgateCapitalData,
  options: GerarPdfResgateCapitalOptions = {}
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;

  const cursor: Cursor = { y: 22 };

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png");
    const maxW = 135;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    doc.addImage(logo.dataUrl, "PNG", margin, cursor.y, w, h);
    cursor.y += h + 8;
  } catch {
    cursor.y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RESGATE PARCIAL DE CAPITAL", pageW / 2, cursor.y, {
    align: "center",
  });
  cursor.y += 20;

  sectionHeader(doc, cursor, pageH, margin, contentW, "Dados do associado");

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "CPF/CNPJ", value: data.cpfCnpj, width: contentW * 0.34 },
    { label: "Nome", value: data.nome, width: contentW * 0.66 },
  ]);

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Matrícula", value: data.matricula || "", width: contentW * 0.33 },
    { label: "Empresa", value: data.empresa || "", width: contentW * 0.67 },
  ]);

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Motivo", value: data.motivo || "", width: contentW * 0.5 },
    { label: "Autorizado por", value: data.autorizadoPor || "", width: contentW * 0.5 },
  ]);

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    {
      label: "Saldo capital atual",
      value: fmtBRL(data.saldoCapitalAtual),
      width: contentW / 3,
    },
    {
      label: "Total do resgate",
      value: fmtBRL(data.totalResgateCapital),
      width: contentW / 3,
    },
    {
      label: "Saldo de capital restante",
      value: fmtBRL(data.saldoCapitalRestante),
      width: contentW / 3,
    },
  ]);

  const emprestimosValidos = (data.emprestimos || []).filter(
    (item) =>
      safeText(item.tipo) ||
      safeText(item.contrato) ||
      Number(item.saldoDevedor || 0) > 0 ||
      Number(item.amortizacao || 0) > 0
  );

  if (emprestimosValidos.length > 0) {
    sectionHeader(doc, cursor, pageH, margin, contentW, "Amortização de empréstimo(s)");

    drawTable(
      doc,
      cursor,
      pageH,
      margin,
      contentW,
      ["Tipo", "Contrato", "Saldo devedor", "Amortização"],
      emprestimosValidos.map((item) => [
        safeText(item.tipo) || "-",
        safeText(item.contrato) || "-",
        fmtBRL(item.saldoDevedor),
        fmtBRL(item.amortizacao),
      ]),
      [0.28, 0.24, 0.24, 0.24],
      [false, false, false, false]
    );
  }

  const temDebitoConta =
    safeText(data.contaCorrenteNumero) ||
    Number(data.contaCorrenteSaldo || 0) > 0 ||
    Number(data.contaCorrenteAmortizacao || 0) > 0;

  const temDebitoCartao =
    safeText(data.cartaoNumero) ||
    Number(data.cartaoSaldo || 0) > 0 ||
    Number(data.cartaoAmortizacao || 0) > 0;

  if (temDebitoConta || temDebitoCartao) {
    sectionHeader(doc, cursor, pageH, margin, contentW, "Amortização de débito(s) em conta");

    const rows: string[][] = [];

    if (temDebitoConta) {
      rows.push([
        `Conta Corrente ${safeText(data.contaCorrenteNumero) || "-"}`,
        fmtBRL(data.contaCorrenteSaldo),
        fmtBRL(data.contaCorrenteAmortizacao),
      ]);
    }

    if (temDebitoCartao) {
      rows.push([
        `Cartão ${safeText(data.cartaoNumero) || "-"}`,
        fmtBRL(data.cartaoSaldo),
        fmtBRL(data.cartaoAmortizacao),
      ]);
    }

    drawTable(
      doc,
      cursor,
      pageH,
      margin,
      contentW,
      ["Número", "Saldo devedor", "Amortização"],
      rows,
      [0.42, 0.29, 0.29],
      [false, false, false]
    );
  }

  if (Number(data.saldoCreditadoConta || 0) > 0) {
    sectionHeader(doc, cursor, pageH, margin, contentW, "Saldo a ser creditado em conta");

    fieldsRow(doc, cursor, pageH, margin, contentW, [
      { label: "Banco", value: data.banco || "", width: contentW * 0.25 },
      { label: "Agência", value: data.agencia || "", width: contentW * 0.25 },
      { label: "Conta", value: data.conta || "", width: contentW * 0.25 },
      { label: "Dígito", value: data.digito || "", width: contentW * 0.25 },
    ]);

    fieldsRow(doc, cursor, pageH, margin, contentW, [
      {
        label: "Saldo creditado",
        value: fmtBRL(data.saldoCreditadoConta),
        width: contentW,
      },
    ]);
  }

  const parcelasValidas = (data.parcelas || []).filter(
    (p) => Number(p.valor || 0) > 0 || safeText(p.data)
  );

  if (parcelasValidas.length > 0) {
    sectionHeader(doc, cursor, pageH, margin, contentW, "Devolução parcelada");

    fieldsRow(doc, cursor, pageH, margin, contentW, [
      {
        label: "Valor da 1ª parcela",
        value: fmtBRL(data.valorPrimeiraParcela || parcelasValidas[0]?.valor || 0),
        width: contentW * 0.5,
      },
      {
        label: "Data da 1ª parcela",
        value: formatDateBR(data.dataPrimeiraParcela || parcelasValidas[0]?.data || ""),
        width: contentW * 0.5,
      },
    ]);

    drawTable(
      doc,
      cursor,
      pageH,
      margin,
      contentW,
      ["Parcela", "Data", "Valor"],
      parcelasValidas.map((item, idx) => [
        `Parcela ${item.numero || idx + 1}`,
        formatDateBR(item.data),
        fmtBRL(item.valor),
      ]),
      [0.32, 0.34, 0.34],
      [false, false, false]
    );

    fieldsRow(doc, cursor, pageH, margin, contentW, [
      {
        label: "Total da devolução parcelada",
        value: fmtBRL(data.totalParcelado ?? parcelasValidas.reduce((acc, p) => acc + Number(p.valor || 0), 0)),
        width: contentW,
      },
    ]);
  }

  sectionHeader(doc, cursor, pageH, margin, contentW, "Dados do atendimento e assinaturas");

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Cidade", value: (data.cidadeAtendimento || "").toUpperCase(), width: contentW * 0.4 },
    { label: "Data", value: formatDateBR(data.dataAtendimento || ""), width: contentW * 0.3 },
    { label: "Atendente", value: data.atendente || "", width: contentW * 0.3 },
  ]);

  ensureSpace(doc, cursor, pageH, margin, 95);
  const sigY = Math.min(cursor.y + 34, pageH - 56);
  drawSignatures(
    doc,
    margin,
    sigY,
    contentW,
    (data.nome || "ASSOCIADO(A)").toUpperCase(),
    (data.atendente || "ATENDENTE").toUpperCase()
  );

  const nomeArquivo =
    options.nomeArquivo || `resgate_capital_${sanitize(data.nome || "associado")}.pdf`;
  const acao = options.acao || "download";

  if (acao === "print") {
    await printPdf(doc, nomeArquivo);
    return;
  }

  doc.save(nomeArquivo);
}

function ensureSpace(doc: jsPDF, cursor: Cursor, pageH: number, margin: number, needed: number) {
  if (cursor.y + needed <= pageH - margin) return;
  doc.addPage();
  cursor.y = margin;
}

function sectionHeader(
  doc: jsPDF,
  cursor: Cursor,
  pageH: number,
  x: number,
  w: number,
  title: string
) {
  ensureSpace(doc, cursor, pageH, x, 22);

  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.setDrawColor(COLORS.green.r, COLORS.green.g, COLORS.green.b);
  doc.setLineWidth(0.55);
  doc.rect(x, cursor.y, w, 16, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(title.toUpperCase(), x + 6, cursor.y + 11);
  doc.setTextColor(0, 0, 0);

  cursor.y += 18;
}

function fieldsRow(
  doc: jsPDF,
  cursor: Cursor,
  pageH: number,
  x: number,
  totalW: number,
  fields: FieldBox[]
) {
  ensureSpace(doc, cursor, pageH, x, 24);

  const h = 22;
  let cursorX = x;

  fields.forEach((field, idx) => {
    const w = idx === fields.length - 1 ? x + totalW - cursorX : field.width;

    drawFieldBox(doc, {
      x: cursorX,
      y: cursor.y,
      w,
      h,
      label: field.label,
      value: field.value,
      alignRight: field.alignRight,
      maxLines: field.maxLines ?? 1,
    });

    cursorX += w;
  });

  cursor.y += h;
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

  const lines = splitWithEllipsis(
    doc,
    safeText(opts.value, ""),
    opts.w - 8,
    opts.maxLines || 1
  );

  if (opts.alignRight && lines.length === 1) {
    doc.text(lines[0], opts.x + opts.w - 4, opts.y + 17, { align: "right" });
  } else {
    doc.text(lines, opts.x + 4, opts.y + 17);
  }

  doc.setTextColor(0, 0, 0);
}

function drawTable(
  doc: jsPDF,
  cursor: Cursor,
  pageH: number,
  x: number,
  totalW: number,
  headers: string[],
  rows: string[][],
  widthRatios: number[],
  alignRight: boolean[]
) {
  const rowH = 20;
  const widths = widthRatios.map((r) => totalW * r);

  const drawOneRow = (cells: string[], isHeader: boolean) => {
    ensureSpace(doc, cursor, pageH, x, rowH + 2);

    let cx = x;
    cells.forEach((cell, idx) => {
      const w = idx === cells.length - 1 ? x + totalW - cx : widths[idx];

      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setFillColor(isHeader ? 248 : 255, isHeader ? 250 : 255, isHeader ? 248 : 255);
      doc.rect(cx, cursor.y, w, rowH, "FD");

      doc.setFont("helvetica", isHeader ? "bold" : "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(isHeader ? 55 : 15, isHeader ? 75 : 23, isHeader ? 95 : 42);

      const text = fitText(doc, safeText(cell, "-"), w - 8, false);
      const right = !isHeader && alignRight[idx];

      if (right) {
        doc.text(text, cx + w - 4, cursor.y + 13, { align: "right" });
      } else {
        doc.text(text, cx + 4, cursor.y + 13);
      }

      cx += w;
    });

    doc.setTextColor(0, 0, 0);
    cursor.y += rowH;
  };

  drawOneRow(headers, true);

  rows.forEach((row) => drawOneRow(row, false));
}

function splitWithEllipsis(doc: jsPDF, value: string, width: number, maxLines: number) {
  const raw = doc.splitTextToSize(value || "", Math.max(width, 20)) as string[];
  if (raw.length <= maxLines) return raw.length ? raw : [""];

  const clipped = raw.slice(0, maxLines);
  clipped[maxLines - 1] = fitText(doc, clipped[maxLines - 1], width, true);
  return clipped;
}

function fitText(doc: jsPDF, text: string, maxWidth: number, withEllipsis = false) {
  const suffix = withEllipsis ? "…" : "";
  let t = String(text || "").trim();

  while (t.length > 0 && doc.getTextWidth(t + suffix) > maxWidth) {
    t = t.slice(0, -1);
  }

  return t + suffix;
}

function drawSignatures(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  nomeAssociado: string,
  nomeAtendente: string
) {
  const gap = 30;
  const colW = (w - gap) / 2;

  // Linha superior: associado e atendente
  drawSignature(doc, x, y, colW, nomeAssociado);
  drawSignature(doc, x + colW + gap, y, colW, nomeAtendente);

  // Linha inferior: validação abaixo do associado
  drawSignature(doc, x, y + 40, colW, "Validação");
}

function drawSignature(doc: jsPDF, x: number, y: number, w: number, label: string) {
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + w, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(30, 41, 59);
  const labelFit = fitText(doc, safeText(label), w - 8, false);
  doc.text(labelFit, x + w / 2, y + 12, { align: "center" });
  doc.setTextColor(0, 0, 0);
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
  const val = String(dateISO).slice(0, 10);
  const [y, m, d] = val.split("-");
  if (!y || !m || !d) return String(dateISO);
  return `${d}/${m}/${y}`;
}

function safeText(v?: string | null, fallback = "-") {
  const s = String(v || "").trim();
  return s || fallback;
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function loadImageDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");

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

  return {
    dataUrl,
    width: img.width,
    height: img.height,
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
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.border = "0";
    iframe.style.pointerEvents = "none";

    let done = false;
    let fallbackTimer: number | undefined;

    const finalize = () => {
      if (done) return;
      done = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {}
      window.URL.revokeObjectURL(blobUrl);
      resolve();
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        finalize();
        return;
      }

      const onAfterPrint = () => {
        finalize();
      };

      try {
        frameWindow.addEventListener("afterprint", onAfterPrint, { once: true });
      } catch {
        // ignore
      }

      // Fallback de segurança: alguns navegadores não disparam afterprint corretamente.
      fallbackTimer = window.setTimeout(() => {
        finalize();
      }, 120000);

      setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch {
          finalize();
        }
      }, 250);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  });
}
