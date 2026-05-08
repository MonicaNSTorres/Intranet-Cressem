import jsPDF from "jspdf";

type Linha = {
  label: string;
  desconto: number;
};

type PdfData = {
  nome: string;
  cpf: string;
  anosAssociacao: Linha;
  correntistaSelects: Linha[];
  regime: Linha[];
  outrosProdutos: Linha[];
  tipoEmprestimo: string;
  valorSolicitado: string;
  quantidadeParcelas: string;
  risco: string;
  seguro: boolean;
  avalista: boolean;
  outros: string;
  divida: string;
  capital: string;
  descontoSolicitacao: string;
  taxaBruta: string;
  descontoTotal: string;
  taxaFinal: string;
  cidade: string;
  data: string;
  atendente: string;
};

type GerarPdfSimuladorDescontoOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

type FieldBox = {
  label: string;
  value: string;
  width: number;
  alignRight?: boolean;
  alignCenter?: boolean;
  maxLines?: number;
};

type Cursor = { y: number };

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

export async function gerarPdfSimuladorDesconto(
  o: PdfData,
  options: GerarPdfSimuladorDescontoOptions = {}
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
  doc.text("SIMULADOR DE DESCONTO", pageW / 2, cursor.y, { align: "center" });
  cursor.y += 20;

  sectionHeader(doc, cursor, pageH, margin, contentW, "Dados do associado");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "CPF/CNPJ", value: o.cpf, width: contentW * 0.34 },
    { label: "Nome", value: o.nome, width: contentW * 0.66 },
  ]);

  sectionHeader(doc, cursor, pageH, margin, contentW, "Pontuação base");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    {
      label: "Anos de associação",
      value: safeText(o.anosAssociacao?.label),
      width: contentW * 0.72,
    },
    {
      label: "Desconto",
      value: fmtTaxa(o.anosAssociacao?.desconto),
      width: contentW * 0.28,
    },
  ]);

  const correntistaLinhas = o.correntistaSelects?.length
    ? o.correntistaSelects
    : [{ label: "-", desconto: 0 }];

  correntistaLinhas.forEach((linha) => {
    fieldsRow(doc, cursor, pageH, margin, contentW, [
      { label: "Correntista", value: safeText(linha.label), width: contentW * 0.72 },
      {
        label: "Desconto",
        value: fmtTaxa(linha.desconto),
        width: contentW * 0.28,
      },
    ]);
  });

  sectionHeader(doc, cursor, pageH, margin, contentW, "Parâmetros do empréstimo");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Tipo", value: labelTipoEmprestimo(o.tipoEmprestimo), width: contentW * 0.38 },
    { label: "Valor solicitado", value: safeText(o.valorSolicitado), width: contentW * 0.32 },
    { label: "Parcelas", value: safeText(o.quantidadeParcelas), width: contentW * 0.3 },
  ]);

  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Risco", value: safeText(o.risco), width: contentW * 0.4 },
    { label: "Taxa bruta %", value: safeText(o.taxaBruta, "-"), width: contentW * 0.2 },
    { label: "Desconto total %", value: safeText(o.descontoTotal, "0.000"), width: contentW * 0.2 },
    { label: "Taxa final %", value: safeText(o.taxaFinal, "-"), width: contentW * 0.2 },
  ]);

  sectionHeader(doc, cursor, pageH, margin, contentW, "Garantias");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Seguro", value: o.seguro ? "Sim" : "Não", width: contentW / 3 },
    { label: "Avalista", value: o.avalista ? "Sim" : "Não", width: contentW / 3 },
    { label: "Outros", value: safeText(o.outros, "Sem"), width: contentW / 3 },
  ]);

  sectionHeader(doc, cursor, pageH, margin, contentW, "Dados sobre conta");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Dívida", value: safeText(o.divida, "R$ 0,00"), width: contentW / 3 },
    { label: "Capital", value: safeText(o.capital, "R$ 0,00"), width: contentW / 3 },
    {
      label: "Desconto sobre solicitação",
      value: safeText(o.descontoSolicitacao, "0.00"),
      width: contentW / 3,
    },
  ]);

  sectionHeader(doc, cursor, pageH, margin, contentW, "Regime de trabalho");
  drawTabelaDescontos(
    doc,
    cursor,
    pageH,
    margin,
    contentW,
    o.regime?.length ? o.regime : [{ label: "-", desconto: 0 }]
  );

  sectionHeader(doc, cursor, pageH, margin, contentW, "Outros produtos");
  drawTabelaDescontos(
    doc,
    cursor,
    pageH,
    margin,
    contentW,
    o.outrosProdutos?.length ? o.outrosProdutos : [{ label: "-", desconto: 0 }]
  );

  sectionHeader(doc, cursor, pageH, margin, contentW, "Dados do atendimento e assinaturas");
  fieldsRow(doc, cursor, pageH, margin, contentW, [
    { label: "Cidade", value: safeText(o.cidade).toUpperCase(), width: contentW * 0.4 },
    { label: "Data", value: formatDateBR(safeText(o.data, "")), width: contentW * 0.3 },
    { label: "Atendente", value: safeText(o.atendente), width: contentW * 0.3 },
  ]);

  ensureSpace(doc, cursor, pageH, margin, 95);
  const sigY = Math.min(cursor.y + 34, pageH - 56);
  drawSignatures(
    doc,
    margin,
    sigY,
    contentW,
    (o.nome || "ASSOCIADO(A)").toUpperCase(),
    (o.atendente || "ATENDENTE").toUpperCase()
  );

  const nomeArquivo =
    options.nomeArquivo || `simulador_desconto_${sanitize(o.nome || "associado")}.pdf`;
  const acao = options.acao || "download";

  if (acao === "print") {
    await printPdf(doc, nomeArquivo);
    return;
  }

  doc.save(nomeArquivo);
}

function ensureSpace(
  doc: jsPDF,
  cursor: Cursor,
  pageH: number,
  margin: number,
  needed: number
) {
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
      alignCenter: field.alignCenter,
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
    alignCenter?: boolean;
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

  const lines = splitWithCut(
    doc,
    safeText(opts.value, ""),
    opts.w - 8,
    opts.maxLines || 1
  );

  if (opts.alignRight && lines.length === 1) {
    doc.text(lines[0], opts.x + opts.w - 4, opts.y + 17, { align: "right" });
  } else if (opts.alignCenter && lines.length === 1) {
    doc.text(lines[0], opts.x + opts.w / 2, opts.y + 17, { align: "center" });
  } else {
    doc.text(lines, opts.x + 4, opts.y + 17);
  }

  doc.setTextColor(0, 0, 0);
}

function drawTabelaDescontos(
  doc: jsPDF,
  cursor: Cursor,
  pageH: number,
  x: number,
  totalW: number,
  linhas: Linha[]
) {
  const rowH = 20;
  const headers = ["Item", "Desconto", "Aplicado"];
  const widthRatios = [0.66, 0.17, 0.17];
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

      if (idx === 0) {
        const text = fitText(doc, safeText(cell, "-"), w - 8);
        doc.text(text, cx + 4, cursor.y + 13);
      } else {
        const text = fitText(doc, safeText(cell, "-"), w - 8);
        doc.text(text, cx + w / 2, cursor.y + 13, { align: "center" });
      }

      cx += w;
    });

    doc.setTextColor(0, 0, 0);
    cursor.y += rowH;
  };

  drawOneRow(headers, true);
  linhas.forEach((linha) => {
    const valor = Number(linha.desconto || 0);
    drawOneRow(
      [safeText(linha.label), fmtTaxa(valor), valor > 0 ? "Sim" : "Não"],
      false
    );
  });
}

function splitWithCut(doc: jsPDF, value: string, width: number, maxLines: number) {
  const raw = doc.splitTextToSize(value || "", Math.max(width, 20)) as string[];
  if (raw.length <= maxLines) return raw.length ? raw : [""];
  return raw.slice(0, maxLines).map((line) => fitText(doc, line, width));
}

function fitText(doc: jsPDF, text: string, maxWidth: number) {
  let t = String(text || "").trim();
  while (t.length > 0 && doc.getTextWidth(t) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t;
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

  drawSignature(doc, x, y, colW, nomeAssociado);
  drawSignature(doc, x + colW + gap, y, colW, nomeAtendente);
  drawSignature(doc, x, y + 40, colW, "Validação");
}

function drawSignature(doc: jsPDF, x: number, y: number, w: number, label: string) {
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + w, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(30, 41, 59);
  doc.text(fitText(doc, safeText(label), w - 8), x + w / 2, y + 12, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
}

function fmtTaxa(v: number | string | null | undefined) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

function formatDateBR(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.includes("/") && value.split("/").length === 3) return value;
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function labelTipoEmprestimo(tipo: string) {
  const t = String(tipo || "").trim().toLowerCase();
  if (t === "trabalhador") return "Crédito Trabalhador";
  if (t === "consignado") return "Consignado";
  if (t === "pessoal") return "Pessoal";
  return safeText(tipo);
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
