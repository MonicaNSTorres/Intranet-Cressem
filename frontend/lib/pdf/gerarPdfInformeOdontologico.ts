import jsPDF from "jspdf";

export type DependenteInformeOdontologico = {
  cpf?: string;
  nome: string;
  parentesco?: string;
  valorAnual: number;
};

export type InformeOdontologicoOpts = {
  anoCalendario: number;

  cpfTitular: string;
  nomeTitular: string;

  valorProprioTitular: number;
  valorTotalFamilia: number;

  dependentes?: DependenteInformeOdontologico[];
};

export async function gerarPdfInformeOdontologico(
  opts: InformeOdontologicoOpts
) {
  const {
    anoCalendario,
    cpfTitular,
    nomeTitular,
    valorProprioTitular,
    valorTotalFamilia,
    dependentes = [],
  } = opts;

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const left = 50;
  const right = 50;
  const maxW = pageW - left - right;

  let y = 55;

  try {
    const logoUrl = "/hapvida-odonto-logo-branco.png";
    const logo = await toDataURL(logoUrl);

    doc.addImage(
      logo.dataUrl,
      logo.type,
      left - 10,
      y - 40,
      125,
      83,
      undefined,
      "FAST"
    );
  } catch {
  }


  y = 145;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);

  doc.text(
    "COMPROVANTE DE PAGAMENTOS DE SERVIÇOS",
    pageW / 2,
    y,
    {
      align: "center",
    }
  );

  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(
    "Convênio Odontológico - Hapvida / São Francisco Odonto",
    pageW / 2,
    y,
    {
      align: "center",
    }
  );

  y += 18;

  doc.setFont("helvetica", "bold");

  doc.text(
    `Ano Calendário: ${anoCalendario}`,
    pageW / 2,
    y,
    {
      align: "center",
    }
  );

  y += 25;

  doc.setDrawColor(190);
  doc.setLineWidth(0.7);

  doc.line(
    left,
    y,
    pageW - right,
    y
  );

  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text(
    "TITULAR",
    left,
    y
  );

  y += 24;

  doc.setFontSize(9);

  desenharCampo(
    doc,
    "CPF",
    maskCpf(cpfTitular),
    left,
    y
  );

  y += 20;

  desenharCampo(
    doc,
    "Nome",
    nomeTitular,
    left,
    y
  );

  y += 24;

  desenharCampo(
    doc,
    "Valor anual individual",
    formatBRL(valorProprioTitular),
    left,
    y
  );

  y += 22;

  doc.setFillColor(
    245,
    247,
    247
  );

  doc.setDrawColor(
    210,
    215,
    215
  );

  doc.roundedRect(
    left,
    y,
    maxW,
    42,
    5,
    5,
    "FD"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Valor total anual do grupo familiar:",
    left + 12,
    y + 26
  );

  doc.setFontSize(12);

  doc.text(
    formatBRL(
      valorTotalFamilia
    ),
    pageW - right - 12,
    y + 26,
    {
      align: "right",
    }
  );

  y += 70;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "DEPENDENTES",
    left,
    y
  );

  y += 22;

  const colNome = left;
  const colParentesco = 345;
  const colValor = pageW - right;

  desenharCabecalhoTabela(
    doc,
    colNome,
    colParentesco,
    colValor,
    y
  );

  y += 21;

  if (
    dependentes.length === 0
  ) {
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      "Não há dependentes vinculados a este titular no período.",
      left,
      y
    );

    y += 20;
  } else {
    for (
      const dependente
      of dependentes
    ) {
      if (y > pageH - 100) {
        doc.addPage();

        y = 60;

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(10);

        doc.text(
          `Dependentes - ${nomeTitular}`,
          left,
          y
        );

        y += 25;

        desenharCabecalhoTabela(
          doc,
          colNome,
          colParentesco,
          colValor,
          y
        );

        y += 21;
      }

      const nome =
        String(
          dependente.nome ||
            ""
        );

      const parentesco =
        String(
          dependente.parentesco ||
            "-"
        );

      const linhasNome =
        doc.splitTextToSize(
          nome,
          270
        );

      const alturaLinha =
        Math.max(
          20,
          linhasNome.length *
            10 +
            6
        );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.text(
        linhasNome,
        colNome,
        y
      );

      doc.text(
        parentesco,
        colParentesco,
        y
      );

      doc.text(
        formatValorDependente(
          dependente.valorAnual
        ),
        colValor,
        y,
        {
          align: "right",
        }
      );

      y += alturaLinha;

      /*doc.setDrawColor(225);

      doc.line(
        left,
        y - 7,
        pageW - right,
        y - 7
      );*/
    }
  }

  y += 20;

  if (y > pageH - 115) {
    doc.addPage();

    y = 60;
  }

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    90,
    90,
    90
  );

  const observacao =
    "Os valores apresentados neste comprovante correspondem aos pagamentos registrados no convênio odontológico durante o ano-calendário informado.";

  const linhasObservacao =
    doc.splitTextToSize(
      observacao,
      maxW
    );

  doc.text(
    linhasObservacao,
    left,
    y
  );

  adicionarRodapes(doc);

  doc.setTextColor(
    0,
    0,
    0
  );

  const nomeArquivo =
    `informe_odontologico_${anoCalendario}_${somenteNumeros(
      cpfTitular
    )}.pdf`;

  doc.save(nomeArquivo);
}

function desenharCampo(
  doc: jsPDF,
  label: string,
  valor: string,
  x: number,
  y: number
) {
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    `${label}:`,
    x,
    y
  );

  const larguraLabel =
    doc.getTextWidth(
      `${label}:`
    );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    String(valor || "-"),
    x + larguraLabel + 6,
    y
  );
}

function desenharCabecalhoTabela(
  doc: jsPDF,
  colNome: number,
  colParentesco: number,
  colValor: number,
  y: number
) {
  const pageW =
    doc.internal.pageSize.getWidth();

  doc.setFillColor(
    245,
    247,
    247
  );

  doc.rect(
    colNome,
    y - 13,
    pageW -
      colNome -
      50,
    21,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    40,
    40,
    40
  );

  doc.text(
    "Beneficiário",
    colNome + 5,
    y
  );

  doc.text(
    "Parentesco",
    colParentesco,
    y
  );

  doc.text(
    "Valor anual",
    colValor,
    y,
    {
      align: "right",
    }
  );
}

function adicionarRodapes(
  doc: jsPDF
) {
  const totalPaginas =
    doc.getNumberOfPages();

  for (
    let pagina = 1;
    pagina <= totalPaginas;
    pagina++
  ) {
    doc.setPage(pagina);

    const pageW =
      doc.internal.pageSize.getWidth();

    const pageH =
      doc.internal.pageSize.getHeight();

    doc.setDrawColor(215);

    doc.line(
      50,
      pageH - 45,
      pageW - 50,
      pageH - 45
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.setTextColor(
      120,
      120,
      120
    );

    doc.text(
      "Documento gerado pela Intranet Sicoob Cressem.",
      50,
      pageH - 28
    );

    doc.text(
      `Página ${pagina} de ${totalPaginas}`,
      pageW - 50,
      pageH - 28,
      {
        align: "right",
      }
    );
  }
}

function formatBRL(
  valor: number | string
) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return "R$ 0,00";
  }

  if (
    typeof valor ===
    "string"
  ) {
    const clean =
      valor
        .replace(/\./g, "")
        .replace(",", ".");

    const numero =
      Number(clean);

    return Number.isFinite(
      numero
    )
      ? numero.toLocaleString(
          "pt-BR",
          {
            style:
              "currency",
            currency:
              "BRL",
          }
        )
      : `R$ ${valor}`;
  }

  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatValorDependente(
  valor: number
) {
  if (
    Number(valor || 0) ===
    0
  ) {
    return "-";
  }

  return formatBRL(
    valor
  );
}

function somenteNumeros(
  valor?: string
) {
  return String(
    valor || ""
  ).replace(
    /\D/g,
    ""
  );
}

function maskCpf(
  valor?: string
) {
  const cpf =
    somenteNumeros(
      valor
    );

  if (
    cpf.length !==
    11
  ) {
    return (
      valor ||
      "______________"
    );
  }

  return `${cpf.slice(
    0,
    3
  )}.${cpf.slice(
    3,
    6
  )}.${cpf.slice(
    6,
    9
  )}-${cpf.slice(9)}`;
}

async function toDataURL(
  url: string
): Promise<{
  dataUrl: string;
  type: "JPEG" | "PNG";
}> {
  const res =
    await fetch(url);

  if (!res.ok) {
    throw new Error(
      "Logo não encontrada"
    );
  }

  const blob =
    await res.blob();

  const originalDataUrl =
    await new Promise<string>(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onloadend =
          () =>
            resolve(
              reader.result as string
            );

        reader.onerror =
          reject;

        reader.readAsDataURL(
          blob
        );
      }
    );

  const img =
    await new Promise<HTMLImageElement>(
      (
        resolve,
        reject
      ) => {
        const image =
          new Image();

        image.onload =
          () =>
            resolve(
              image
            );

        image.onerror =
          reject;

        image.src =
          originalDataUrl;
      }
    );

  const maxWidth = 420;
  const maxHeight = 420;

  const scale =
    Math.min(
      maxWidth /
        img.width,
      maxHeight /
        img.height,
      1
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    Math.round(
      img.width *
        scale
    );

  canvas.height =
    Math.round(
      img.height *
        scale
    );

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    return {
      dataUrl:
        originalDataUrl,
      type: "PNG",
    };
  }

  ctx.fillStyle =
    "#FFFFFF";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    img,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return {
    dataUrl:
      canvas.toDataURL(
        "image/jpeg",
        0.72
      ),

    type: "JPEG",
  };
}