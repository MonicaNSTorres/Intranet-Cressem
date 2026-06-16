import jsPDF from "jspdf";

export type DeclaracaoResponsabilidadeHoleriteOpts = {
  nome: string;
  cpf: string;
  rg: string;
  mesReferencia: string;
  valor: string;
  prazoMeses: string;
  local: string;
  dataDeclaracao: string;
};

function toBrFromIso(value: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function formatarMesReferencia(value: string) {
  if (!value) return "";
  if (/^\d{2}\/\d{4}$/.test(value)) return value;
  const [ano, mes] = value.split("-");
  if (!ano || !mes) return value;
  return `${mes}/${ano}`;
}

function sanitize(value: string) {
  return String(value || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

async function loadLogoDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar logo");

  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  return {
    dataUrl,
    width: image.width,
    height: image.height,
  };
}

function escreverParagrafo(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  largura: number,
  lineHeight = 18
) {
  const linhas = doc.splitTextToSize(texto, largura);
  linhas.forEach((linha: string) => {
    doc.text(linha, x, y);
    y += lineHeight;
  });
  return y;
}

type TextoParte = {
  text: string;
  bold?: boolean;
};

function escreverParagrafoComNegrito(
  doc: jsPDF,
  partes: TextoParte[],
  x: number,
  y: number,
  largura: number,
  lineHeight = 18
) {
  let cursorX = x;

  partes.forEach((parte) => {
    const tokens = parte.text.split(/(\s+)/);

    tokens.forEach((token) => {
      if (!token) return;

      const isSpace = /^\s+$/.test(token);
      doc.setFont("helvetica", parte.bold ? "bold" : "normal");

      if (isSpace && cursorX === x) return;

      const tokenWidth = doc.getTextWidth(token);
      if (cursorX + tokenWidth > x + largura && cursorX > x) {
        y += lineHeight;
        cursorX = x;
        if (isSpace) return;
      }

      doc.text(token, cursorX, y);
      cursorX += tokenWidth;
    });
  });

  doc.setFont("helvetica", "normal");
  return y + lineHeight;
}

export async function gerarPdfDeclaracaoResponsabilidadeHolerite(
  o: DeclaracaoResponsabilidadeHoleriteOpts
) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 54;
  const contentW = pageW - margin * 2;
  let y = 48;

  try {
    const logo = await loadLogoDataUrl("/sicoob-cressem-logo.png");
    const maxLogoW = 132;
    const maxLogoH = 54;
    const scale = Math.min(maxLogoW / logo.width, maxLogoH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;

    doc.addImage(
      logo.dataUrl,
      "PNG",
      margin,
      y,
      logoW,
      logoH,
      undefined,
      "MEDIUM"
    );
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("SICOOB CRESSEM", margin, y + 22);
  }

  y += 88;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    "DECLARAÇÃO DE RESPONSABILIDADE PARA DESCONTO EM HOLERITE",
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 42;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const mesReferencia = formatarMesReferencia(o.mesReferencia);
  const dataDeclaracao = toBrFromIso(o.dataDeclaracao);
  const prazoTexto = `${o.prazoMeses} ${Number(o.prazoMeses) === 1 ? "mês" : "meses"}`;

  y = escreverParagrafoComNegrito(
    doc,
    [
      { text: "Eu, " },
      { text: o.nome, bold: true },
      { text: ", portador(a) do CPF " },
      { text: o.cpf, bold: true },
      { text: " e RG " },
      { text: o.rg, bold: true },
      {
        text: ", declaro para os devidos fins que estou ciente e de acordo com a realização do desconto de CRÉDITO CONSIGNADO em meu holerite referente ao mês ",
      },
      { text: mesReferencia, bold: true },
      { text: ", no valor de " },
      { text: o.valor, bold: true },
      { text: ", no prazo total de " },
      { text: prazoTexto, bold: true },
      { text: ", para a Cooperativa " },
      { text: "SICOOB CRESSEM", bold: true },
      { text: ", respeitando a margem consignável disponível." },
    ],
    margin,
    y,
    contentW
  );

  y += 14;

  y = escreverParagrafo(
    doc,
    "Declaro ainda que assumo total responsabilidade pelos valores descontados, incluindo taxa de manutenção, integralização e parcela do empréstimo consignado, estando ciente das condições acordadas, bem como autorizo a efetivação dos referidos descontos em folha de pagamento.",
    margin,
    y,
    contentW
  );

  y += 14;

  y = escreverParagrafo(
    doc,
    "Por fim, afirmo que esta autorização é concedida de livre e espontânea vontade, sem qualquer tipo de coação, estando plenamente de acordo com os termos estabelecidos.",
    margin,
    y,
    contentW
  );

  y += 48;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("LOCAL: ", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(o.local, margin + doc.getTextWidth("LOCAL: "), y);
  doc.setFont("helvetica", "normal");
  const dataLabel = "DATA: ";
  const dataTextoW = doc.getTextWidth(dataLabel) + doc.getTextWidth(dataDeclaracao);
  const dataX = pageW - margin - dataTextoW;
  doc.text(dataLabel, dataX, y);
  doc.setFont("helvetica", "bold");
  doc.text(dataDeclaracao, dataX + doc.getTextWidth(dataLabel), y);

  y += 70;

  doc.setFont("helvetica", "normal");
  doc.text("NOME:__________________________________________", margin, y);

  y += 86;

  const assinaturaW = 320;
  const assinaturaX = (pageW - assinaturaW) / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(assinaturaX, y, assinaturaX + assinaturaW, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(o.nome, pageW / 2, y, { align: "center" });

  doc.save(`declaracao_responsabilidade_holerite_${sanitize(o.nome)}.pdf`);
}
