import jsPDF from "jspdf";

export type DadosCalculadoraJurosCartaoPdf = {
  valorFatura: number;
  vencimento: string;
  diaHoje: string;
  diasAtraso: number;
  multaPerc: number;
  moraPerc: number;
  taxaMensal: number;
  dividaConsolidada: number;
  multa: number;
  mora: number;
  juros: number;
  totalJurosMulta: number;
  totalGeral: number;
  responsavel: string;
};

type GerarPdfCalculadoraJurosCartaoOptions = {
  acao?: "download" | "print";
  nomeArquivo?: string;
};

function formatDateBR(value: string) {
  if (!value) return "-";
  const [ano, mes, dia] = String(value).split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function sanitize(s: string) {
  return String(s || "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-_.]/g, "");
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

  const maxWidth = 405;
  const maxHeight = 126;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (ctx) {
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
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
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

      try {
        frameWindow.addEventListener("afterprint", finalize, { once: true });
      } catch {}

      fallbackTimer = window.setTimeout(() => finalize(), 120000);

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

export async function gerarPdfCalculadoraJurosCartao(
  data: DadosCalculadoraJurosCartaoPdf,
  options: GerarPdfCalculadoraJurosCartaoOptions = {}
) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const colW = pageW - margin * 2;
  let y = 24;

  const sicoobGreen = { r: 121, g: 183, b: 41 };
  const sicoobGreenDark = { r: 0, g: 54, b: 65 };
  const sicoobGreenLight = { r: 242, g: 248, b: 235 };

  const bottomLimit = () => pageH - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  const safeText = (value?: string) => String(value || "-").trim() || "-";

  function drawSectionHeader(title: string) {
    ensureSpace(20);

    doc.setFillColor(sicoobGreenLight.r, sicoobGreenLight.g, sicoobGreenLight.b);
    doc.setDrawColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, colW, 18, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(sicoobGreenDark.r, sicoobGreenDark.g, sicoobGreenDark.b);
    doc.text(title.toUpperCase(), margin + 7, y + 12);

    y += 21;
    doc.setTextColor(0, 0, 0);
  }

  function drawFieldBox(label: string, value: string, x: number, boxY: number, w: number, h = 24) {
    doc.setDrawColor(210, 220, 210);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY, w, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(90, 110, 95);
    doc.text(label.toUpperCase(), x + 4, boxY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(safeText(value), w - 8);
    doc.text(lines.slice(0, 1), x + 4, boxY + 18);

    doc.setTextColor(0, 0, 0);
  }

  function drawFieldsRow(fields: Array<{ label: string; value: string; width: number }>, h = 24) {
    ensureSpace(h + 2);
    let x = margin;
    fields.forEach((field) => {
      drawFieldBox(field.label, field.value, x, y, field.width, h);
      x += field.width;
    });
    y += h;
  }

  try {
    const logo = await loadImageDataURL("/sicoob-cressem-logo.png?v=2");
    const maxW = 135;
    const maxH = 42;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    ensureSpace(h + 10);
    doc.addImage(logo.dataUrl, logo.type, margin, y, w, h, undefined, "MEDIUM");
    y += h + 8;
  } catch {
    y += 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CALCULADORA DE ATRASO - CARTAO DE CREDITO", pageW / 2, y, {
    align: "center",
  });
  y += 20;

  drawSectionHeader("Dados para cálculo");
  drawFieldsRow([
    { label: "Valor da fatura", value: fmtBRL(data.valorFatura), width: colW * 0.45 },
    { label: "Vencimento", value: formatDateBR(data.vencimento), width: colW * 0.275 },
    { label: "Data do cálculo", value: formatDateBR(data.diaHoje), width: colW * 0.275 },
  ]);
  drawFieldsRow([
    { label: "Dias de atraso", value: String(data.diasAtraso), width: colW * 0.3 },
    { label: "Dívida consolidada", value: fmtBRL(data.dividaConsolidada), width: colW * 0.7 },
  ]);

  y += 6;
  drawSectionHeader("Composição dos encargos");
  drawFieldsRow([
    { label: `Multa (${data.multaPerc.toFixed(2)}%)`, value: fmtBRL(data.multa), width: colW / 3 },
    { label: `Mora (${data.moraPerc.toFixed(2)}% a.m.)`, value: fmtBRL(data.mora), width: colW / 3 },
    { label: `Juros (${data.taxaMensal.toFixed(2)}% a.m.)`, value: fmtBRL(data.juros), width: colW / 3 },
  ]);
  drawFieldsRow([
    { label: "Juros + Multa + Mora", value: fmtBRL(data.totalJurosMulta), width: colW },
  ]);

  y += 6;
  drawSectionHeader("Resumo final");

  ensureSpace(44);
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(210, 220, 210);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, colW, 34, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 51);
  doc.text("TOTAL A PAGAR", margin + 10, y + 22);
  doc.setTextColor(0, 107, 63);
  doc.text(fmtBRL(data.totalGeral), margin + colW - 10, y + 22, {
    align: "right",
  });

  doc.setTextColor(0, 0, 0);
  y += 54;

  drawSectionHeader("Responsável");
  drawFieldsRow([{ label: "Responsável pelo cálculo", value: data.responsavel || "INTRANET", width: colW }], 27);
  drawFieldsRow([{ label: "Emitido em", value: new Date().toLocaleString("pt-BR"), width: colW }], 27);

  y += 42;
  ensureSpace(35);
  const assinaturaW = 260;
  const assinaturaX = (pageW - assinaturaW) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(data.responsavel || "INTRANET", pageW / 2, y, { align: "center" });

  const nomeArquivo =
    options.nomeArquivo || `calculadora_juros_cartao_${sanitize(data.responsavel || "intranet")}.pdf`;
  const acao = options.acao || "download";

  if (acao === "print") {
    await printPdf(doc, nomeArquivo);
    return;
  }

  doc.save(nomeArquivo);
}
