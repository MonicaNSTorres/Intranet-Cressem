import jsPDF from "jspdf";

type ValoresTermoCaixa = {
  cedulaTesouraria: number;
  moedaTesouraria: number;
  cedulaCaixa1: number;
  moedaCaixa1: number;
  cedulaCaixa2: number;
  moedaCaixa2: number;
  cedulaCaixa3: number;
  moedaCaixa3: number;
  cedulaCaixa4: number;
  moedaCaixa4: number;
  cedulaAtm63: number;
  moedaAtm63: number;
  cedulaAtm64: number;
  moedaAtm64: number;
  cedulaAtm: number;
  moedaAtm: number;
  cedulaTesoureiroEletronico: number;
  moedaTesoureiroEletronico: number;
  totalGeral: number;
};

type PdfOpts = {
  competencia: string;
  pa: string;
  dataTermo: string;
  responsavel: string;
  tesoureiro: string;
  diretorFinanceiro: string;
  gerente: string;
  valores: ValoresTermoCaixa;
  observacao?: string;
};

export async function gerarPdfTermoMensalCaixa(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 34;
  const contentW = pageW - margin * 2;
  let y = 48;

  const black = 20;
  doc.setDrawColor(black);
  doc.setTextColor(black);
  doc.setLineWidth(0.6);

  const fmt = (n: number) =>
    (n || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (value: string) => {
    if (!value) return "__/__/____";
    const [ano, mes, dia] = value.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatCompetencia = (value: string) => {
    if (!value?.includes("-")) return value;
    const [ano, mes] = value.split("-");
    return `${mes}/${ano}`;
  };

  const getMesCompetencia = (value: string) => {
    if (!value?.includes("-")) return "";
    const [, mes] = value.split("-");

    const meses: Record<string, string> = {
      "01": "janeiro",
      "02": "fevereiro",
      "03": "março",
      "04": "abril",
      "05": "maio",
      "06": "junho",
      "07": "julho",
      "08": "agosto",
      "09": "setembro",
      "10": "outubro",
      "11": "novembro",
      "12": "dezembro",
    };

    return meses[mes] || mes;
  };

  const getAnoCompetencia = (value: string) => {
    if (!value?.includes("-")) return "";
    const [ano] = value.split("-");
    return ano;
  };

  const getDiaTermo = (value: string) => {
    if (!value) return "___";
    const [, , dia] = value.split("-");
    return dia;
  };

  const total = {
    tesouraria: (o.valores.cedulaTesouraria || 0) + (o.valores.moedaTesouraria || 0),
    caixa1: (o.valores.cedulaCaixa1 || 0) + (o.valores.moedaCaixa1 || 0),
    caixa2: (o.valores.cedulaCaixa2 || 0) + (o.valores.moedaCaixa2 || 0),
    caixa3: (o.valores.cedulaCaixa3 || 0) + (o.valores.moedaCaixa3 || 0),
    caixa4: (o.valores.cedulaCaixa4 || 0) + (o.valores.moedaCaixa4 || 0),
    atm63: (o.valores.cedulaAtm63 || 0) + (o.valores.moedaAtm63 || 0),
    atm64: (o.valores.cedulaAtm64 || 0) + (o.valores.moedaAtm64 || 0),
    atm: (o.valores.cedulaAtm || 0) + (o.valores.moedaAtm || 0),
    tesoureiroEletronico:
      (o.valores.cedulaTesoureiroEletronico || 0) +
      (o.valores.moedaTesoureiroEletronico || 0),
  };

  const totalCedulas =
    (o.valores.cedulaTesouraria || 0) +
    (o.valores.cedulaCaixa1 || 0) +
    (o.valores.cedulaCaixa2 || 0) +
    (o.valores.cedulaCaixa3 || 0) +
    (o.valores.cedulaCaixa4 || 0) +
    (o.valores.cedulaAtm63 || 0) +
    (o.valores.cedulaAtm64 || 0) +
    (o.valores.cedulaAtm || 0) +
    (o.valores.cedulaTesoureiroEletronico || 0);

  const totalMoedas =
    (o.valores.moedaTesouraria || 0) +
    (o.valores.moedaCaixa1 || 0) +
    (o.valores.moedaCaixa2 || 0) +
    (o.valores.moedaCaixa3 || 0) +
    (o.valores.moedaCaixa4 || 0) +
    (o.valores.moedaAtm63 || 0) +
    (o.valores.moedaAtm64 || 0) +
    (o.valores.moedaAtm || 0) +
    (o.valores.moedaTesoureiroEletronico || 0);

  const totalGeral = totalCedulas + totalMoedas;

  function cell(
    x: number,
    yCell: number,
    w: number,
    h: number,
    text = "",
    opts?: {
      bold?: boolean;
      fontSize?: number;
      align?: "left" | "center" | "right";
      valign?: "top" | "middle";
      fill?: boolean;
      fillColor?: [number, number, number];
    }
  ) {
    if (opts?.fill) {
      const c = opts.fillColor || [245, 245, 245];
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(x, yCell, w, h, "FD");
    } else {
      doc.rect(x, yCell, w, h);
    }

    if (!text) return;

    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.fontSize || 6.2);

    const align = opts?.align || "center";
    const valign = opts?.valign || "middle";

    let tx = x + w / 2;
    if (align === "left") tx = x + 3;
    if (align === "right") tx = x + w - 3;

    let ty = yCell + h / 2 + 2.2;
    if (valign === "top") ty = yCell + 7;

    const lines = doc.splitTextToSize(text, w - 5);
    const lineHeight = (opts?.fontSize || 6.2) + 1;

    if (lines.length > 1) {
      const totalTextH = lines.length * lineHeight;
      const startY =
        valign === "top" ? yCell + 7 : yCell + h / 2 - totalTextH / 2 + lineHeight - 1;

      lines.forEach((line: string, index: number) => {
        doc.text(line, tx, startY + index * lineHeight, { align });
      });
    } else {
      doc.text(text, tx, ty, { align });
    }

    doc.setFont("helvetica", "normal");
  }

  const headerH = 58;
  const logoW = 170;
  const coopW = 145;
  const titleW = contentW - logoW - coopW;

  cell(margin, y, logoW, headerH, "", {});
  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    doc.addImage(dataUrl, "PNG", margin + 18, y + -7, 100, 80);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("SICOOB", margin + 28, y + 22);
    doc.setFontSize(6);
    doc.text("Cressem", margin + 78, y + 30);
  }

  cell(margin + logoW, y, coopW, headerH, "SICOOB CRESSEM", {
    align: "left",
    valign: "middle",
    fontSize: 6,
  });

  cell(
    margin + logoW + coopW,
    y,
    titleW,
    headerH,
    "TERMO DE CONFERÊNCIA\nDE CAIXA",
    {
      bold: true,
      fontSize: 8,
    }
  );

  y += headerH + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Agência ${toUpper(o.pa || "SEDE")}`, margin, y);
  y += 8;

  const textBoxH = 48;
  doc.rect(margin, y, contentW, textBoxH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.7);

  const dia = getDiaTermo(o.dataTermo);
  const mesExtenso = getMesCompetencia(o.competencia);
  const ano = getAnoCompetencia(o.competencia);
  const dataFormatada = formatDate(o.dataTermo);
  const competencia = formatCompetencia(o.competencia);

  const texto = `Aos ${dia} dias do mês de ${mesExtenso} de ${ano}, no Sicoob Cressem – Cooperativa de Economia e Crédito Mútuo dos Servidores Municipais da Região Metropolitana do Vale do Paraíba e Litoral Norte foi efetuada a conferência dos valores representativos dos saldos de caixa, database ${dataFormatada}, tendo sido encontrado no total, a importância de R$ ${fmt(
    totalGeral
  )} (${numeroPorExtensoSimplificado(
    totalGeral
  )}), constante entre reais e centavos, pelo que lavramos o presente Termo de Conferência.`;

  const textoLinhas = doc.splitTextToSize(texto, contentW - 10);
  doc.text(textoLinhas, margin + 5, y + 10);

  if (o.observacao) {
    const obsLinhas = doc.splitTextToSize(`Obs.: ${o.observacao}`, contentW - 10);
    doc.text(obsLinhas, margin + 5, y + 34);
  }

  y += textBoxH + 8;

  const tableX = margin;
  const tableW = contentW;
  const labelW = 77;
  const colW = (tableW - labelW) / 10;
  const rowH = 22;
  const headerRowH = 24;

  const cols = [
    "Tesouraria",
    "Caixa 1",
    "Caixa 2",
    "Caixa 3",
    "Caixa 4",
    "ATM 63",
    "ATM 64",
    "ATM",
    "Tesoureiro\nEletrônico",
    "TOTAL",
  ];

  cell(tableX, y, labelW, headerRowH, "VALORES (R$)", {
    bold: true,
    fill: true,
    fontSize: 6,
  });

  cols.forEach((col, index) => {
    cell(tableX + labelW + colW * index, y, colW, headerRowH, col, {
      bold: true,
      fill: true,
      fontSize: 5.5,
    });
  });

  y += headerRowH;

  const linhas = [
    {
      label: "Em Cédula",
      values: [
        o.valores.cedulaTesouraria,
        o.valores.cedulaCaixa1,
        o.valores.cedulaCaixa2,
        o.valores.cedulaCaixa3,
        o.valores.cedulaCaixa4,
        o.valores.cedulaAtm63,
        o.valores.cedulaAtm64,
        o.valores.cedulaAtm,
        o.valores.cedulaTesoureiroEletronico,
        totalCedulas,
      ],
      bold: false,
    },
    {
      label: "Em Moeda",
      values: [
        o.valores.moedaTesouraria,
        o.valores.moedaCaixa1,
        o.valores.moedaCaixa2,
        o.valores.moedaCaixa3,
        o.valores.moedaCaixa4,
        o.valores.moedaAtm63,
        o.valores.moedaAtm64,
        o.valores.moedaAtm,
        o.valores.moedaTesoureiroEletronico,
        totalMoedas,
      ],
      bold: false,
    },
    {
      label: "Subtotal",
      values: [
        total.tesouraria,
        total.caixa1,
        total.caixa2,
        total.caixa3,
        total.caixa4,
        total.atm63,
        total.atm64,
        total.atm,
        total.tesoureiroEletronico,
        totalGeral,
      ],
      bold: true,
    },
    {
      label: "Saque no ATM\n(p/fechamento do caixa)",
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bold: false,
    },
    {
      label: "Recebimentos/Pagtos.\nNão Escriturados",
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bold: false,
    },
    {
      label: "Abastecimento ATM /\nRecolhimento ATM",
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bold: false,
    },
    {
      label: "Saldo\nAtualizado",
      values: [
        total.tesouraria,
        total.caixa1,
        total.caixa2,
        total.caixa3,
        total.caixa4,
        total.atm63,
        total.atm64,
        total.atm,
        total.tesoureiroEletronico,
        totalGeral,
      ],
      bold: true,
    },
    {
      label: "Último Saldo\nEscriturado\n(Livro Caixa ou Balancete)",
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bold: false,
    },
    {
      label: "Diferença",
      values: ["", "", "", "", "", "", "", "", "", ""],
      bold: true,
    },
  ];

  linhas.forEach((linha) => {
    cell(tableX, y, labelW, rowH, linha.label, {
      bold: true,
      fontSize: 5.5,
    });

    linha.values.forEach((value, index) => {
      cell(
        tableX + labelW + colW * index,
        y,
        colW,
        rowH,
        value === "" ? "" : fmt(Number(value)),
        {
          bold: linha.bold,
          fontSize: 5.3,
        }
      );
    });

    y += rowH;
  });

  doc.setFontSize(4.8);
  doc.setFont("helvetica", "normal");
  doc.text("* Conforme resultado extraído pelo ATM.", margin + 3, y + 7);
  doc.text(
    "Caso seja necessário, utilize mais de uma via desse formulário, discriminando o total em apenas uma delas.",
    margin + 3,
    y + 13
  );

  y += 26;

  const blankH = 88;
  doc.rect(margin, y, contentW, blankH);
  y += blankH;

  doc.rect(margin, y, contentW, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`São José dos Campos, ${formatDate(o.dataTermo)}`, pageW / 2, y + 11, {
    align: "center",
  });
  y += 16;

  //conferentes
  doc.rect(margin, y, contentW, 16);
  doc.setFont("helvetica", "bold");
  doc.text("CONFERENTE(S):", pageW / 2, y + 11, { align: "center" });
  y += 16;

  const thirdW = contentW / 3;
  const sigH = 50;

  doc.rect(margin, y, thirdW, sigH);
  doc.rect(margin + thirdW, y, thirdW, sigH);
  doc.rect(margin + thirdW * 2, y, thirdW, sigH);

  assinaturaDentro(doc, margin, y, thirdW, sigH, o.responsavel, "COORDENADOR DE TESOURARIA");
  assinaturaDentro(doc, margin + thirdW, y, thirdW, sigH, o.diretorFinanceiro, "DIRETOR FINANCEIRO");
  assinaturaDentro(doc, margin + thirdW * 2, y, thirdW, sigH, o.gerente, "GERENTE");

  y += sigH;

  doc.rect(margin, y, contentW, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("CIÊNCIA DO CONFERENTE(S):", pageW / 2, y + 12, {
    align: "center",
  });
  y += 18;

  const cienciaH = 38;
  doc.rect(margin, y, contentW, cienciaH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(toUpper(o.diretorFinanceiro || ""), pageW / 2, y + 13, {
    align: "center",
  });
  doc.text("DIRETOR FINANCEIRO", pageW / 2, y + 25, {
    align: "center",
  });

  y += cienciaH + 8;

  //responsavel pela consciliacao
  doc.rect(margin, y, contentW, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("RESPONSÁVEL PELA CONCILIAÇÃO:", pageW / 2, y + 14, {
    align: "center",
  });
  y += 22;

  doc.rect(margin, y, contentW, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("Supervisor Administrativo", margin + 40, y + 46);
  doc.text("Analista de Riscos", margin + contentW - 90, y + 46);

  doc.save(
    `termo_de_caixa_${sanitize(o.pa)}_${sanitize(
      formatCompetencia(o.competencia)
    )}.pdf`
  );
}

function assinaturaDentro(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  nome: string,
  cargo: string
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);

  doc.text(toUpper(nome || ""), x + w / 2, y + h - 22, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.text(cargo, x + w / 2, y + h - 11, {
    align: "center",
  });
}

function toUpper(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function sanitize(s: string) {
  return String(s || "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-_.]/g, "");
}

function numeroPorExtensoSimplificado(valor: number) {
  const unidades = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
  ];

  const especiais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];

  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];

  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function ate999(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    const partes: string[] = [];

    if (c) partes.push(centenas[c]);

    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d) partes.push(dezenas[d]);
      if (u) partes.push(unidades[u]);
    }

    return partes.filter(Boolean).join(" e ");
  }

  function inteiroPorExtenso(n: number): string {
    if (n === 0) return "zero";

    const milhoes = Math.floor(n / 1_000_000);
    const milhares = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;

    const partes: string[] = [];

    if (milhoes) {
      partes.push(
        milhoes === 1
          ? "um milhão"
          : `${ate999(milhoes)} milhões`
      );
    }

    if (milhares) {
      partes.push(
        milhares === 1
          ? "mil"
          : `${ate999(milhares)} mil`
      );
    }

    if (resto) {
      partes.push(ate999(resto));
    }

    return partes.join(" e ");
  }

  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);

  const textoReais =
    reais === 1
      ? "um real"
      : `${inteiroPorExtenso(reais)} reais`;

  if (centavos > 0) {
    const textoCentavos =
      centavos === 1
        ? "um centavo"
        : `${inteiroPorExtenso(centavos)} centavos`;

    return `${textoReais} e ${textoCentavos}`;
  }

  return textoReais;
}

async function toDataURL(url: string) {
  const r = await fetch(url);

  if (!r.ok) {
    throw new Error("Logo não encontrado");
  }

  const b = await r.blob();

  return await new Promise<string>((resolve) => {
    const fr = new FileReader();

    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}