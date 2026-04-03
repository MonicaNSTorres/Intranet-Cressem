import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  cpf: string;
  estadoCivil: string;
  tipoDocumento: string;
  numeroDocumento: string;
  numeroContrato: string;
  dataContrato: string;
  valorContrato: string;
  cidadeAtendimento: string;
  dataHoje: string;
  avalista: "sim" | "nao";
  prestamistaSicoob: "sim" | "nao";
  prestamistaTerceiros: "sim" | "nao";
  garantiaReal: "sim" | "nao";
};

export async function gerarPdfTermoGarantia(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 50;
  const colW = pageW - margin * 2;
  let y = 40;

  const bottomLimit = () => doc.internal.pageSize.getHeight() - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    const w = 120;
    const h = w * (500 / 1000);

    ensureSpace(h + 40);
    doc.addImage(dataUrl, "PNG", 30, y - 8, w, h);
    y = y - 8 + h + 22;
  } catch {
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE OPÇÃO DE GARANTIA", pageW / 2, y, {
    align: "center",
  });
  y += 30;

  const tableX = margin;
  const tableW = colW;
  const colGarantia = 330;
  const colSim = 70;
  const colNao = tableW - colGarantia - colSim;
  const rowH = 24;

  ensureSpace(150);

  doc.setLineWidth(0.8);
  doc.rect(tableX, y, tableW, rowH * 5);

  doc.line(tableX + colGarantia, y, tableX + colGarantia, y + rowH * 5);
  doc.line(
    tableX + colGarantia + colSim,
    y,
    tableX + colGarantia + colSim,
    y + rowH * 5
  );

  for (let i = 1; i <= 4; i++) {
    doc.line(tableX, y + rowH * i, tableX + tableW, y + rowH * i);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GARANTIAS", tableX + 10, y + 16);
  doc.text("SIM", tableX + colGarantia + colSim / 2, y + 16, {
    align: "center",
  });
  doc.text("NÃO", tableX + colGarantia + colSim + colNao / 2, y + 16, {
    align: "center",
  });

  const rows = [
    { label: "Avalista?", value: o.avalista },
    {
      label: "Seguro Prestamista no Sicoob Cressem?",
      value: o.prestamistaSicoob,
    },
    {
      label: "Seguro Prestamista de Terceiros?",
      value: o.prestamistaTerceiros,
    },
    { label: "Garantia Real?", value: o.garantiaReal },
  ];

  doc.setFont("helvetica", "normal");

  rows.forEach((row, index) => {
    const rowY = y + rowH * (index + 1);
    doc.text(row.label, tableX + 10, rowY + 16);

    doc.setFont("helvetica", "bold");
    doc.text(
      row.value === "sim" ? "X" : "",
      tableX + colGarantia + colSim / 2,
      rowY + 16,
      { align: "center" }
    );
    doc.text(
      row.value === "nao" ? "X" : "",
      tableX + colGarantia + colSim + colNao / 2,
      rowY + 16,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
  });

  y += rowH * 5 + 24;

  const texto = `Eu, ${toUpper(o.nome)}, ${toUpper(
    o.estadoCivil
  )}, portador do ${toUpper(o.tipoDocumento)}: ${
    o.numeroDocumento || "________________"
  }, inscrito no CPF: ${o.cpf || "________________"}, DECLARO para os devidos fins ter feito opção da garantia, acima assinalada, referente ao Contrato nº ${
    o.numeroContrato || "________________"
  } de ${o.dataContrato || "____/____/________"}, no valor total de ${
    o.valorContrato || "R$ 0,00"
  }. Declaro ainda estar ciente de que poderei, a qualquer tempo, mudar a garantia para qualquer outra opção acima descrita.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const textoLines = doc.splitTextToSize(texto, colW);
  const textoHeight = textoLines.length * 14 + 18;

  ensureSpace(textoHeight + 100);

  doc.rect(margin, y, colW, textoHeight);
  doc.text(textoLines, margin + 10, y + 18);
  y += textoHeight + 40;

  doc.setFont("helvetica", "bold");
  doc.text(
    `${toUpper(o.cidadeAtendimento)}, ${o.dataHoje}`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 50;

  const sigW = 240;
  doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.text(toUpper(o.nome || "_______________________________"), pageW / 2, y, {
    align: "center",
  });

  doc.save(`termo_garantia_${sanitize(o.nome || "associado")}.pdf`);
}

function toUpper(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrada");
  const b = await r.blob();
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}