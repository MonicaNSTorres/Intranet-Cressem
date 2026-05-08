import jsPDF from "jspdf";

type SimNao = "" | "sim" | "nao";
type TipoDiabetes = "" | "tipo1" | "tipo2" | "gestacional";
type TipoHepatite = "" | "a" | "b" | "c";

type DoencasState = {
  tumor: SimNao;
  doenca_coronaria: SimNao;
  avc: SimNao;
  diabetes: SimNao;
  bronquite: SimNao;
  enfisema: SimNao;
  hepatite: SimNao;
  arritmia: SimNao;
  insuficiencia_cardiaca: SimNao;
  hipercolesterolemia: SimNao;
  hipertrigliceridemia: SimNao;
  sincopes: SimNao;
  hipertensao: SimNao;
  renal: SimNao;
};

type PdfOpts = {
  cpf: string;
  nome: string;
  sexo: string;
  estadoCivil: string;
  nascimento: string;
  documento: string;
  orgaoExpedidor: string;
  telefone: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  doencas: DoencasState;
  tipoDiabetes: TipoDiabetes;
  tipoHepatite: TipoHepatite;
  cidadeAtendimento: string;
  diaAtendimento: string;
  assinaturaAssociado: string;
};

const DOENCAS_LABELS: Array<{ key: keyof DoencasState; label: string }> = [
  { key: "tumor", label: "Tumor ou câncer" },
  { key: "doenca_coronaria", label: "Doença coronária" },
  { key: "avc", label: "Acidente vascular cerebral" },
  { key: "diabetes", label: "Diabetes" },
  { key: "bronquite", label: "Bronquite" },
  { key: "enfisema", label: "Enfisema" },
  { key: "hepatite", label: "Hepatites" },
  { key: "arritmia", label: "Arritmia" },
  { key: "insuficiencia_cardiaca", label: "Insuficiência cardíaca" },
  { key: "hipercolesterolemia", label: "Hipercolesterolemia" },
  { key: "hipertrigliceridemia", label: "Hipertrigliceridemia" },
  { key: "sincopes", label: "Síncope" },
  { key: "hipertensao", label: "Hipertensão" },
  { key: "renal", label: "Doença renal / Hemodiálise" },
];

export async function gerarPdfFormularioDps(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const colW = pageW - margin * 2;
  let y = 24;


  const sicoobGreen = {
    r: 121,
    g: 183,
    b: 41,
  };

  const sicoobGreenDark = {
    r: 0,
    g: 54,
    b: 65,
  };

  const sicoobGreenLight = {
    r: 242,
    g: 248,
    b: 235,
  };

  const bottomLimit = () => pageH - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const logo = await loadImageDataURL(logoUrl);

    const maxW = 135;
    const maxH = 42;

    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    ensureSpace(h + 10);

    doc.addImage(logo.dataUrl, "PNG", margin, y, w, h);
    y += h + 8;
  } catch {
    y += 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TERMO DE DECLARAÇÃO PESSOAL DE SAÚDE", pageW / 2, y, {
    align: "center",
  });
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

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

  function drawFieldBox(
    label: string,
    value: string,
    x: number,
    boxY: number,
    w: number,
    h = 24
  ) {
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

  function drawFieldsRow(
    fields: Array<{ label: string; value: string; width: number }>,
    h = 24
  ) {
    ensureSpace(h + 2);

    let x = margin;

    fields.forEach((field) => {
      drawFieldBox(field.label, field.value, x, y, field.width, h);
      x += field.width;
    });

    y += h;
  }

  function writeField(label: string, value: string, x = margin) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label}:`, x, y);

    doc.setFont("helvetica", "normal");
    doc.text(safeText(value), x + doc.getTextWidth(`${label}:`) + 6, y);
  }

  ensureSpace(60);

  drawSectionHeader("Dados do proponente");

  drawFieldsRow([
    { label: "CPF", value: o.cpf, width: 150 },
    { label: "Nome", value: o.nome, width: colW - 150 },
  ]);

  drawFieldsRow([
    { label: "Sexo", value: o.sexo, width: 130 },
    { label: "Estado civil", value: o.estadoCivil, width: 180 },
    { label: "Nascimento", value: o.nascimento, width: colW - 310 },
  ]);

  drawFieldsRow([
    { label: "N° doc. identificação", value: o.documento, width: 210 },
    { label: "Órgão expedidor", value: o.orgaoExpedidor, width: 170 },
    { label: "Celular / telefone", value: o.telefone, width: colW - 380 },
  ]);

  y += 6;

  drawSectionHeader("Endereço e contato");

  drawFieldsRow([
    { label: "Endereço de correspondência", value: o.rua, width: colW },
  ], 27);

  drawFieldsRow([
    { label: "Bairro", value: o.bairro, width: 180 },
    { label: "Cidade", value: o.cidade, width: 210 },
    { label: "Estado", value: o.estado, width: 70 },
    { label: "CEP", value: o.cep, width: colW - 460 },
  ]);

  drawFieldsRow([
    { label: "E-mail", value: o.email, width: colW },
  ]);

  y += 6;

  drawSectionHeader("Declaração pessoal de saúde e atividades");

  doc.setFont("helvetica", "normal");

  const tableX = margin;
  const tableW = colW;

  const perguntaW = 275;
  const simW = 45;
  const naoW = 45;
  const detalheW = tableW - perguntaW - simW - naoW;

  const xPergunta = tableX;
  const xSim = xPergunta + perguntaW;
  const xNao = xSim + simW;
  const xDetalhe = xNao + naoW;

  function formatTipoDiabetes(tipo: TipoDiabetes) {
    if (tipo === "tipo1") return "Tipo 1";
    if (tipo === "tipo2") return "Tipo 2";
    if (tipo === "gestacional") return "Gestacional";
    return "";
  }

  function formatTipoHepatite(tipo: TipoHepatite) {
    if (tipo === "a") return "Hepatite A";
    if (tipo === "b") return "Hepatite B";
    if (tipo === "c") return "Hepatite C";
    return "";
  }

  function getDetalheDoenca(item: { key: keyof DoencasState; label: string }) {
    if (item.key === "diabetes" && o.doencas.diabetes === "sim") {
      return formatTipoDiabetes(o.tipoDiabetes) || "-";
    }

    if (item.key === "hepatite" && o.doencas.hepatite === "sim") {
      return formatTipoHepatite(o.tipoHepatite) || "-";
    }

    return "-";
  }

  function drawCheckbox(centerX: number, centerY: number, checked: boolean) {
    const size = 9;
    const x = centerX - size / 2;
    const yBox = centerY - size / 2;

    doc.setLineWidth(0.7);

    if (checked) {
      doc.setDrawColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
      doc.setFillColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
      doc.rect(x, yBox, size, size, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("X", centerX, centerY + 2.5, { align: "center" });
    } else {
      doc.setDrawColor(148, 163, 184);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, yBox, size, size, "FD");
    }

    doc.setTextColor(0, 0, 0);
  }

  function drawTableHeader() {
    ensureSpace(26);

    doc.setFillColor(sicoobGreenLight.r, sicoobGreenLight.g, sicoobGreenLight.b);
    doc.setDrawColor(sicoobGreen.r, sicoobGreen.g, sicoobGreen.b);
    doc.setLineWidth(0.6);

    doc.rect(tableX, y, tableW, 18, "FD");

    doc.line(xSim, y, xSim, y + 18);
    doc.line(xNao, y, xNao, y + 18);
    doc.line(xDetalhe, y, xDetalhe, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(sicoobGreenDark.r, sicoobGreenDark.g, sicoobGreenDark.b);

    doc.text("Pergunta", xPergunta + 5, y + 12);
    doc.text("Sim", xSim + simW / 2, y + 12, { align: "center" });
    doc.text("Não", xNao + naoW / 2, y + 12, { align: "center" });
    doc.text("Detalhe", xDetalhe + 5, y + 12);

    y += 18;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
  }

  drawTableHeader();

  DOENCAS_LABELS.forEach((item) => {
    const resposta = o.doencas[item.key];
    const detalhe = getDetalheDoenca(item);

    const perguntaLines = doc.splitTextToSize(item.label, perguntaW - 12);
    const detalheLines = doc.splitTextToSize(detalhe, detalheW - 12);

    const rowH = Math.max(
      17,
      perguntaLines.length * 8 + 8,
      detalheLines.length * 8 + 8
    );

    if (y + rowH > bottomLimit()) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);

    doc.rect(tableX, y, tableW, rowH);
    doc.line(xSim, y, xSim, y + rowH);
    doc.line(xNao, y, xNao, y + rowH);
    doc.line(xDetalhe, y, xDetalhe, y + rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(30, 41, 59);

    doc.text(perguntaLines, xPergunta + 5, y + 11.5);

    drawCheckbox(xSim + simW / 2, y + rowH / 2, resposta === "sim");
    drawCheckbox(xNao + naoW / 2, y + rowH / 2, resposta === "nao");

    doc.text(detalheLines, xDetalhe + 5, y + 11.5);

    y += rowH;
  });

  y += 14;

  drawSectionHeader("Declarações");

  const paragrafos = [
    "Declaro, para os devidos fins e efeitos, estar ciente que, conforme os Artigos 765 e 766 do Código Civil Brasileiro, se estiver omitindo circunstâncias que influam na aceitação da proposta ou na taxa de prêmio, perderei o direito à indenização, além de estar obrigado ao pagamento do prêmio vencido.",
    "Declaro, também, que estou fazendo o seguro prestamista para isentar da apresentação de avalista e que, se o quiser poderei fazê-lo em qualquer momento, cessando o pagamento desse seguro.",
  ];

  ensureSpace(70);

  const boxY = y;
  const padding = 8;
  let textY = y + 13;

  doc.setDrawColor(210, 225, 200);
  doc.setFillColor(sicoobGreenLight.r, sicoobGreenLight.g, sicoobGreenLight.b);
  doc.rect(margin, boxY, colW, 64, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(45, 70, 55);

  paragrafos.forEach((texto) => {
    const lines = doc.splitTextToSize(texto, colW - padding * 2);

    lines.forEach((ln: string) => {
      doc.text(ln, margin + padding, textY);
      textY += 9.2;
    });

    textY += 3;
  });

  doc.setTextColor(0, 0, 0);
  y = boxY + 70;

  drawSectionHeader("Atendimento e assinaturas");

  drawFieldsRow([
    { label: "Cidade do atendimento", value: o.cidadeAtendimento, width: colW * 0.65 },
    { label: "Dia do atendimento", value: o.diaAtendimento, width: colW * 0.35 },
  ]);

  ensureSpace(85);

  y += 38;

  const assinaturaW = 220;
  const gapAssinatura = 26;
  const totalAssinaturasW = assinaturaW * 2 + gapAssinatura;
  const assinaturaX1 = (pageW - totalAssinaturasW) / 2;
  const assinaturaX2 = assinaturaX1 + assinaturaW + gapAssinatura;

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.7);

  doc.line(assinaturaX1, y, assinaturaX1 + assinaturaW, y);
  doc.line(assinaturaX2, y, assinaturaX2 + assinaturaW, y);

  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text(
    o.assinaturaAssociado || "Assinatura do Proponente Principal",
    assinaturaX1 + assinaturaW / 2,
    y,
    { align: "center" }
  );

  doc.text("Validação", assinaturaX2 + assinaturaW / 2, y, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);

  doc.save(`formulario_dps_${sanitize(o.nome || "associado")}.pdf`);
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