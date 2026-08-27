import jsPDF from "jspdf";

type PdfOpts = {
  tipoFormulario: "CANCELAMENTO" | "RETORNO";
  empresaCancelamento?: string;
  solicita?: string;
  nome: string;
  matricula: string;
  cpf: string;
  empresaRetorno?: string;
  motivoRetorno?: string;
  dataInicio?: string;
  dataFim?: string;
  documento?: string;
  reativacaoMeses?: string;
  dataHoje: string;
  atendente: string;
};

const COLORS = {
  border: { r: 121, g: 183, b: 41 },
  sectionBg: { r: 243, g: 249, b: 239 },
  text: { r: 16, g: 24, b: 40 },
  label: { r: 71, g: 85, b: 105 },
  paragraph: { r: 55, g: 65, b: 81 },
};

type Field = { label: string; value?: string; width: number };
type PdfImage = { dataUrl: string; width: number; height: number; type: "PNG" | "JPEG" };

export async function gerarPdfAdiantamentoSalarialEmprestimo(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const contentW = pageW - margin * 2;
  let y = 22;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(21);
    doc.setFillColor(COLORS.sectionBg.r, COLORS.sectionBg.g, COLORS.sectionBg.b);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, y, contentW, 18, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(title.toUpperCase(), margin + 8, y + 12);
    y += 20;
  };

  const drawFieldsRow = (fields: Field[], h = 26) => {
    ensureSpace(h + 3);
    let x = margin;
    fields.forEach((field) => {
      doc.setDrawColor(210, 220, 210);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.rect(x, y, field.width, h, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(COLORS.label.r, COLORS.label.g, COLORS.label.b);
      doc.text(field.label.toUpperCase(), x + 4, y + 7.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(doc.splitTextToSize(safeText(field.value), field.width - 8)[0], x + 4, y + 19);
      x += field.width;
    });
    y += h + 2;
  };

  const drawParagraphSection = (title: string, paragraphs: string[], emphasizedBorder = false) => {
    const padding = 7;
    const lineHeight = 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    const linesByParagraph = paragraphs.map((paragraph) => doc.splitTextToSize(paragraph, contentW - padding * 2));
    const lineCount = linesByParagraph.reduce((total, lines) => total + lines.length, 0);
    const boxH = lineCount * lineHeight + Math.max(0, paragraphs.length - 1) * 3 + padding * 2;
    ensureSpace(21 + boxH + 4);
    drawSectionHeader(title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setDrawColor(
      emphasizedBorder ? COLORS.border.r : 220,
      emphasizedBorder ? COLORS.border.g : 230,
      emphasizedBorder ? COLORS.border.b : 220
    );
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(emphasizedBorder ? 0.6 : 0.4);
    doc.rect(margin, y, contentW, boxH, "FD");
    doc.setTextColor(COLORS.paragraph.r, COLORS.paragraph.g, COLORS.paragraph.b);
    let textY = y + padding + 6;
    linesByParagraph.forEach((lines, index) => {
      lines.forEach((line: string) => {
        doc.text(line, margin + padding, textY);
        textY += lineHeight;
      });
      if (index < linesByParagraph.length - 1) textY += 3;
    });
    y += boxH + 4;
  };

  const drawSignatures = (topGap = 22) => {
    const signatureW = 190;
    const x1 = margin + 28;
    const x2 = pageW - margin - 28 - signatureW;
    ensureSpace(topGap + 46);
    y += topGap;
    doc.setDrawColor(55, 65, 81);
    doc.setLineWidth(0.6);
    doc.line(x1, y, x1 + signatureW, y);
    doc.line(x2, y, x2 + signatureW, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(o.nome).toUpperCase(), x1 + signatureW / 2, y + 13, { align: "center" });
    doc.text(safeText(o.atendente).toUpperCase(), x2 + signatureW / 2, y + 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.label.r, COLORS.label.g, COLORS.label.b);
    doc.text("ASSOCIADO(A)", x1 + signatureW / 2, y + 24, { align: "center" });
    doc.text("ATENDENTE", x2 + signatureW / 2, y + 24, { align: "center" });
  };

  const drawTitle = (title: string) => {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(title, pageW / 2, y, { align: "center" });
    y += 18;
  };

  const drawInstitutionalLines = (lines: string[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    lines.forEach((line) => {
      ensureSpace(10);
      doc.text(line, pageW / 2, y, { align: "center" });
      y += 10;
    });
    y += 2;
  };

  const drawLogos = async (partnerLogo?: string, partnerMax = { w: 124, h: 42 }) => {
    const [sicoob, partner] = await Promise.all([
      loadImageDataURL("/sicoob-cressem-logo.png?v=2").catch(() => null),
      partnerLogo ? loadImageDataURL(partnerLogo).catch(() => null) : Promise.resolve(null),
    ]);
    const fit = (image: PdfImage, maxW: number, maxH: number) => {
      const scale = Math.min(maxW / image.width, maxH / image.height);
      return { w: image.width * scale, h: image.height * scale };
    };
    const sicoobFit = sicoob ? fit(sicoob, 124, 42) : null;
    const partnerFit = partner ? fit(partner, partnerMax.w, partnerMax.h) : null;
    const headerH = Math.max(sicoobFit?.h ?? 0, partnerFit?.h ?? 0);
    if (!headerH) {
      y += 10;
      return;
    }
    ensureSpace(headerH + 14);
    if (sicoob && sicoobFit) doc.addImage(sicoob.dataUrl, sicoob.type, margin, y, sicoobFit.w, sicoobFit.h, undefined, "MEDIUM");
    if (partner && partnerFit) {
      doc.addImage(partner.dataUrl, partner.type, pageW - margin - partnerFit.w, y, partnerFit.w, partnerFit.h, undefined, "MEDIUM");
    }
    y += headerH + 14;
  };

  if (o.tipoFormulario === "RETORNO") {
    await drawLogos();
    drawTitle("SOLICITAÇÃO DE RETORNO DE ADIANTAMENTO SALARIAL");
    drawSectionHeader("Dados do associado");
    drawFieldsRow([{ label: "Data", value: o.dataHoje, width: contentW * 0.32 }, { label: "Empresa", value: o.empresaRetorno, width: contentW * 0.68 }]);
    drawFieldsRow([{ label: "Nome do associado", value: o.nome, width: contentW * 0.68 }, { label: "Matrícula", value: o.matricula, width: contentW * 0.32 }]);
    drawParagraphSection("Solicitação", [
      `À ${safeText(o.empresaRetorno)} — A/C: DRH - Folha de Pagamento.`,
      `Prezados Senhores,\n\nSolicito a V. Sas, ${String(o.solicita || "").toLowerCase()} o adiantamento salarial do(a) funcionário(a), associado(a) da CRESSEM, o(a) Sr(a) ${safeText(o.nome)}, matrícula ${safeText(o.matricula)}.`,
      `Motivo reativação: ${safeText(o.motivoRetorno)}.\n\nAtenciosamente,`,
    ]);
    drawSignatures();
    doc.save(`adiantamento_retorno_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "IPSM") {
    await drawLogos("/logoipsm.png", { w: 100, h: 34 });
    drawTitle("CANCELAMENTO DE ADIANTAMENTO SALARIAL");
    drawSectionHeader("Dados do associado");
    drawFieldsRow([{ label: "Nome do associado", value: o.nome, width: contentW * 0.68 }, { label: "Matrícula", value: o.matricula, width: contentW * 0.32 }]);
    drawFieldsRow([{ label: "Início do cancelamento", value: o.dataInicio, width: contentW / 2 }, { label: "Fim do cancelamento", value: o.dataFim, width: contentW / 2 }]);
    drawParagraphSection("Solicitação", [
      "Ao Instituto de Previdência do Servidor Municipal - IPSM.",
      `Solicito cancelamento do meu adiantamento a partir de ${safeText(o.dataInicio)} até ${safeText(o.dataFim)}.`,
    ]);
    drawSignatures(52);
    doc.save(`adiantamento_ipsm_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "URBAM") {
    await drawLogos("/logourban.png");
    drawTitle("CANCELAMENTO DE ADIANTAMENTO SALARIAL");
    drawSectionHeader("Dados do associado");
    drawFieldsRow([{ label: "Matrícula", value: o.matricula, width: contentW * 0.28 }, { label: "Nome", value: o.nome, width: contentW * 0.48 }, { label: "Data", value: o.dataHoje, width: contentW * 0.24 }]);
    drawFieldsRow([{ label: "Início da suspensão", value: o.dataInicio, width: contentW / 2 }, { label: "Fim da suspensão", value: o.dataFim, width: contentW / 2 }]);
    drawParagraphSection("Declaração", [
      `Solicito suspensão do adiantamento salarial, a partir de ${safeText(o.dataInicio)} a ${safeText(o.dataFim)}, em razão de empréstimo na Cressem.`,
      "Desde já, estou ciente que o adiantamento estará suspenso até a quitação do referido empréstimo, ocasião em que a Cressem informará à área de Recursos Humanos da Urbam, em impresso próprio, até o dia 05 (cinco) do mês seguinte à quitação, a solicitação de retorno do pagamento do referido adiantamento salarial.",
    ], true);
    drawSignatures(66);
    doc.save(`adiantamento_urbam_${sanitize(o.nome || "associado")}.pdf`);
    return;
  }

  if (o.empresaCancelamento === "PMSJC") {
    await drawLogos("/logopmsjc.png");
    drawInstitutionalLines(["DEPARTAMENTO DE RECURSOS HUMANOS", "DIVISÃO DE ADMINISTRAÇÃO DE PESSOAL", "SUPERVISÃO DE CADASTRO E ASSENTAMENTO DE PESSOAL"]);
    drawTitle("CANCELAMENTO DE ADIANTAMENTO SALARIAL");
    drawSectionHeader("Dados do associado");
    drawFieldsRow([{ label: "Nome", value: o.nome, width: contentW * 0.48 }, { label: "Matrícula", value: o.matricula, width: contentW * 0.2 }, { label: "RG", value: o.documento, width: contentW * 0.32 }]);
    drawFieldsRow([{ label: "CPF", value: o.cpf, width: contentW * 0.35 }, { label: "Reativação após", value: `${safeText(o.reativacaoMeses)} meses`, width: contentW * 0.3 }, { label: "Data", value: `São José dos Campos, ${safeText(o.dataHoje)}.`, width: contentW * 0.35 }]);
    drawFieldsRow([{ label: "Cancelar a partir de", value: o.dataInicio, width: contentW / 2 }, { label: "Até", value: o.dataFim, width: contentW / 2 }]);
    drawParagraphSection("Autorização", [
      `Eu, ${safeText(o.nome)}, matrícula ${safeText(o.matricula)}, RG: ${safeText(o.documento)} e CPF: ${safeText(o.cpf)}, autorizo, em caráter irrevogável, o cancelamento do meu adiantamento salarial. Estando ciente que somente poderei reativá-lo após ${safeText(o.reativacaoMeses)} meses.`,
      `OBS.: Cancelar a partir de ${safeText(o.dataInicio)} à ${safeText(o.dataFim)}.`,
    ]);
    drawSignatures(66);
    doc.save(`adiantamento_pmsjc_${sanitize(o.nome || "associado")}.pdf`);
  }
}

function safeText(value?: string) {
  return String(value || "-").trim() || "-";
}

function sanitize(value: string) {
  return value.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function loadImageDataURL(url: string): Promise<PdfImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Logo não encontrado");
  const blob = await response.blob();
  const sourceDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = sourceDataUrl;
  });
  const scale = Math.min(560 / image.width, 220 / image.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl: sourceDataUrl, width: image.width, height: image.height, type: "PNG" };
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), width: canvas.width, height: canvas.height, type: "JPEG" };
}
