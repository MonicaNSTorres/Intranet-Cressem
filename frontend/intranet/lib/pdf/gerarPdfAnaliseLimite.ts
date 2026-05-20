/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type Opts = {
  tipoFormulario: "PF" | "PJ";
  cpf: string;
  nome: string;
  celular: string;
  empresa?: string;

  contaCorrente: string;
  salarioBruto: number;
  salarioLiquido: number;
  portabilidade?: string;
  efetivo?: string;
  cessaoCredito: string;
  dataPagamento?: string;
  carteira: string;
  iap: string;

  ocorrenciaCRM: string;
  obsCRM?: string;

  risco: string;
  pd: string;
  crl: number;
  capital: number;
  divida: number;
  restricoes: string;
  quaisRestricoes?: string;

  sugestaoLimite?: number;
  sugestaoLimiteCartao?: number;
  sugestaoLimiteCheque?: number;
  cartao: string;
  cartaoAtual: number;
  cartaoAprovado: number;
  especial: string;
  especialAtual: number;
  especialAprovado: number;

  dataEnvio: string;
};

type GerarPdfAnaliseLimiteOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

const COLORS = {
  green: { r: 121, g: 183, b: 41 },
  dark: { r: 0, g: 54, b: 65 },
  light: { r: 242, g: 248, b: 235 },
  border: { r: 210, g: 220, b: 210 },
};

export async function gerarPdfAnaliseLimite(
  o: Opts,
  options: GerarPdfAnaliseLimiteOptions = {}
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

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

    doc.addImage(logo.dataUrl, logo.type || "PNG", margin, y, w, h);
    y += h + 8;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ANÁLISE DE CONCESSÃO DE NOVOS LIMITES", pageW / 2, y, {
    align: "center",
  });

  y += 16;

  y += 8;

  drawSectionHeader(doc, "Dados do associado", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "CPF/CNPJ", value: o.cpf, width: contentW * 0.34 },
    { label: "Nome", value: o.nome, width: contentW * 0.66 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Celular", value: o.celular, width: contentW * 0.34 },
    {
      label: o.tipoFormulario === "PF" ? "Empresa" : "Tipo",
      value: o.tipoFormulario === "PF" ? o.empresa || "" : "Pessoa Jurídica",
      width: contentW * 0.66,
    },
  ]);

  y += 4;

  drawSectionHeader(doc, "Informações bancárias e salariais", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Conta Corrente", value: o.contaCorrente, width: contentW * 0.5 },
    {
      label: o.tipoFormulario === "PJ" ? "Faturamento Mensal" : "Salário Bruto",
      value: fmtBRL(o.salarioBruto),
      width: contentW * 0.5,
    },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: o.tipoFormulario === "PJ" ? "Faturamento Anual" : "Salário Líquido",
      value: fmtBRL(o.salarioLiquido),
      width: contentW * 0.5,
    },
    {
      label: o.tipoFormulario === "PF" ? "Portabilidade" : "Cessão de Crédito",
      value: o.tipoFormulario === "PF" ? yesNoText(o.portabilidade) : yesNoText(o.cessaoCredito),
      width: contentW * 0.5,
    },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: o.tipoFormulario === "PF" ? "Funcionário Efetivo" : "Nível Carteira",
      value: o.tipoFormulario === "PF" ? yesNoText(o.efetivo) : o.carteira,
      width: contentW * 0.5,
    },
    {
      label: o.tipoFormulario === "PF" ? "Cessão de Crédito" : "Números IAP",
      value: o.tipoFormulario === "PF" ? yesNoText(o.cessaoCredito) : o.iap,
      width: contentW * 0.5,
    },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    {
      label: "Data Pagamento",
      value: o.cessaoCredito === "1" ? formatDateBR(o.dataPagamento || "") : "",
      width: contentW * 0.5,
    },
    {
      label: o.tipoFormulario === "PF" ? "Nível Carteira" : "Números IAP",
      value: o.tipoFormulario === "PF" ? o.carteira : o.iap,
      width: contentW * 0.5,
    },
  ]);

  if (o.tipoFormulario === "PF") {
    y = drawFieldsRow(doc, y, margin, contentW, [
      { label: "Números IAP", value: o.iap, width: contentW },
    ]);
  }

  y += 4;

  drawSectionHeader(doc, "Status CRM e observações", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Ocorrência CRM", value: yesNoText(o.ocorrenciaCRM), width: contentW * 0.32 },
    { label: "Observação", value: o.obsCRM || "", width: contentW * 0.68, maxLines: 1 },
  ]);

  y += 4;

  drawSectionHeader(doc, "Indicadores de risco / financeiros", margin, y, contentW);
  y += 18;

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Risco", value: o.risco, width: contentW * 0.5 },
    { label: "PD", value: o.pd, width: contentW * 0.5 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "CRL", value: fmtBRL(o.crl), width: contentW * 0.5 },
    { label: "Capital", value: fmtBRL(o.capital), width: contentW * 0.5 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Dívida", value: fmtBRL(o.divida), width: contentW * 0.5 },
    { label: "Restrições", value: yesNoText(o.restricoes), width: contentW * 0.5 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Quais", value: o.quaisRestricoes || "", width: contentW },
  ]);

  y += 4;

  drawSectionHeader(doc, "Sugestão de limite e aprovações", margin, y, contentW);
  y += 18;

  const sugestaoCartao =
    typeof o.sugestaoLimiteCartao === "number"
      ? o.sugestaoLimiteCartao
      : (o.sugestaoLimite ?? 0);
  const sugestaoCheque =
    typeof o.sugestaoLimiteCheque === "number"
      ? o.sugestaoLimiteCheque
      : (o.sugestaoLimite ?? 0);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Cartão", value: yesNoText(o.cartao), width: contentW * 0.25 },
    { label: "Limite Cartão Atual", value: fmtBRL(o.cartaoAtual), width: contentW * 0.25 },
    { label: "Sugestão Limite Cartão", value: fmtBRL(sugestaoCartao), width: contentW * 0.25 },
    { label: "Limite Cartão Aprovado", value: fmtBRL(o.cartaoAprovado), width: contentW * 0.25 },
  ]);

  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Cheque Especial", value: yesNoText(o.especial), width: contentW * 0.25 },
    { label: "Limite Especial Atual", value: fmtBRL(o.especialAtual), width: contentW * 0.25 },
    { label: "Sugestão Limite Cheque", value: fmtBRL(sugestaoCheque), width: contentW * 0.25 },
    { label: "Limite Especial Aprovado", value: fmtBRL(o.especialAprovado), width: contentW * 0.25 },
  ]);

  y += 6;

  drawSectionHeader(doc, "Data da análise e assinaturas", margin, y, contentW);
  y += 18;
  y = drawFieldsRow(doc, y, margin, contentW, [
    { label: "Data", value: formatDateBR(o.dataEnvio), width: contentW },
  ]);

  const sigY = Math.min(y + 44, pageH - 56);
  drawSignatures(doc, margin, sigY, contentW);

  const nomeArquivo =
    options.nomeArquivo || `analise_limite_${sanitize(o.nome || "associado")}.pdf`;
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
    const w = idx === fields.length - 1
      ? x + totalW - cursorX
      : field.width;

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

function drawSignatures(doc: jsPDF, x: number, y: number, w: number) {
  const gap = 24;
  const colW = (w - gap * 2) / 3;

  drawSignature(doc, x, y, colW, "Assinatura Colaborador");
  drawSignature(doc, x + colW + gap, y, colW, "Assinatura Gerência");
  drawSignature(doc, x + (colW + gap) * 2, y, colW, "Assinatura Diretoria");
}

function drawSignature(doc: jsPDF, x: number, y: number, w: number, label: string) {
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + w, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(30, 41, 59);
  doc.text(label, x + w / 2, y + 12, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function safeText(v?: string | null) {
  return String(v || "-").trim() || "-";
}

function fmtBRL(value?: number | null) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function yesNoText(value?: string | null) {
  if (value === "1") return "Sim";
  if (value === "0") return "Não";
  return "";
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).slice(0, 10).split("-");
  if (!y || !m || !d) return String(dateISO);
  return `${d}/${m}/${y}`;
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function loadImageDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");

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

  // Mantém transparência (PNG) e reduz com folga menor para preservar mais nitidez.
  // Ainda otimiza tamanho, mas com melhor qualidade visual do logo.
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

      // Fallback de segurança para navegadores que não disparam afterprint.
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
