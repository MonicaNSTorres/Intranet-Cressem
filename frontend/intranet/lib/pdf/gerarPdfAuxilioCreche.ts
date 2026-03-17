import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  matricula: string;
  instituicao: string;
  descritivo: string;
  valorPago: number;
  valorFixo: number;//545,87
  totalReembolsar: number;
  dataEntrega: string;
};

export async function gerarPdfAuxilioCreche(o: PdfOpts) {
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

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const TETO = o.valorFixo ?? 545.87;
  const totalReembolsarCalc = Math.min(o.valorPago || 0, TETO);

  //fonte global
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    const w = 120;
    const h = w * (500 / 1000);

    ensureSpace(h + 200);
    //alinha a esquerda
    doc.addImage(dataUrl, "PNG", 30, y - 8, w, h);

    y = y - 8 + h + 22;
  } catch {
    ensureSpace(36);
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    "SOLICITAÇÃO DE REEMBOLSO DE AUXÍLIO CRECHE OU BABÁ",
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 36;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  //linha nome + matricula
  const leftText = "Eu, ";
  doc.text(leftText, margin, y);
  const nameX = margin + doc.getTextWidth(leftText);
  doc.setFont("helvetica", "bold");
  doc.text(toUpper(o.nome), nameX, y);

  const matricLabel = "Matric:";
  const matricLabelW = doc.getTextWidth(matricLabel);
  const matricValue = toUpper(o.matricula || "");
  const matricValueW = doc.getTextWidth(matricValue);
  const gap = 8;
  const matricX = margin + colW - (matricLabelW + gap + matricValueW);
  doc.text(matricLabel, matricX, y);
  doc.setFont("helvetica", "normal");
  doc.text(matricValue, matricX + matricLabelW + gap, y);
  y += 16;

  //instituicao
  const base = "solicito cadastramento para futuros reembolsos do meu AUXÍLIO CRECHE OU BABÁ efetuado junto a (ao): ";
  const inst = toUpper(
    o.instituicao || "__________________________________________"
  );
  const lines = doc.splitTextToSize(base, colW);
  lines.forEach((ln: string) => {
    doc.text(ln, margin, y);
    y += 14;
  });
  doc.setFont("helvetica", "bold");
  const instLines = doc.splitTextToSize(inst, colW);
  instLines.forEach((ln: string) => {
    doc.text(ln, margin, y);
    y += 14;
  });
  doc.setFont("helvetica", "normal");

  {/* //valor pago e o aviso na mesma linha
  const vtLabel = "Valor total pago:";
  doc.text(vtLabel, margin, y);
  const vtNumX = margin + doc.getTextWidth(vtLabel) + 6;
  doc.setFont("helvetica", "bold");
  doc.text(fmtBRL(o.valorPago || 0), vtNumX, y);
  doc.setFont("helvetica", "normal");
  doc.text("TODO MÊS APRESENTER AO RH O BOLETO E O COMPROVANTE DE PAGAMENTO.", margin + colW, y, {
    align: "right",
  });
  y += 16;
  */}

  // valor pago
  const vtLabel = "Valor total pago:";
  doc.text(vtLabel, margin, y);

  const vtNumX = margin + doc.getTextWidth(vtLabel) + 6;
  doc.setFont("helvetica", "bold");
  doc.text(fmtBRL(o.valorPago || 0), vtNumX, y);
  y += 14; // espaço após valor pago

  // total que deve reembolsar
  doc.setFont("helvetica", "normal");
  const trLabel = "TOTAL A REEMBOLSAR:";
  doc.text(trLabel, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(fmtBRL(totalReembolsarCalc), margin + doc.getTextWidth(trLabel) + 8, y);
  y += 18; // espaço após total

  // aviso por último
  doc.setFont("helvetica", "normal");
  doc.text(
    "TODO MÊS APRESENTAR AO RH O BOLETO E O COMPROVANTE DE PAGAMENTO.",
    margin,
    y
  );
  y += 20; // espaço extra antes de continuar

  doc.setFont("helvetica", "normal");
  doc.text(
    "Abaixo, assino a presente, dando autorização para crédito em meu holerite:",
    margin,
    y
  );
  y += 36;

  //assinatura
  const sigW = 300;
  doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text(toUpper(o.nome || "_______________________________"), pageW / 2, y, {
    align: "center",
  });
  y += 30;

  //descritivo
  doc.setFont("helvetica", "bold");
  doc.text("Descritivo:", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");

  const write = (t: string, lh = 14) => {
    const lines = doc.splitTextToSize(t, colW);
    lines.forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += lh;
    });
  };

  write(
    `A partir de 01/07/2024, a cooperativa reembolsará aos seus empregados, o valor de ${fmtBRL(
      o.valorFixo
    )} (quinhentos e dezessete reais e quarenta e dois centavos), para cada filho até a idade de 83 (oitenta e três) meses, as despesas realizadas e comprovadas com internamento deste em creches e instituições análogas de sua livre escolha.`
  );

  y = writeParagraphWithBoldHeading(doc, "Parágrafo Primeiro", "Idênticos reembolsos e procedimentos previstos na cláusula Auxílio Creche/Auxílio Babá estendem-se aos empregados ou empregadas que tenham filhos excepcionais ou deficientes físicos que exijam cuidados permanentes, sem limite de idade, desde que tal condição seja comprovada por atestado fornecido pelo INSS ou instituição por ele autorizada, ou, ainda, por médico pertencente a Convênio mantido pela cooperativa.", margin, y, colW);
  y = writeParagraphWithBoldHeading(doc, "Parágrafo Segundo", "Quando ambos os cônjuges forem empregados na mesma cooperativa, o pagamento não será cumulativo, obrigando-se os empregados a designarem, por escrito, à Cooperativa, o cônjuge que deverá perceber o benefício.", margin, y, colW);
  y = writeParagraphWithBoldHeading(doc, "Parágrafo Terceiro", "O auxílio Creche não será cumulativo com o auxílio babá, devendo beneficiário fazer opção escrita por um ou outro, para cada filho.", margin, y, colW);
  y = writeParagraphWithBoldHeading(doc, "Parágrafo Quarto", "As concessões vantagens contidas nesta cláusula atendem aos dispostos dos incisos XXV e XXVI do artigo 7º da Constituição da República, ao disposto nos §§ 1º e 2º do artigo 389 da CLT e na Portaria MTP nº 671, de 8 de novembro de 2021 (DOU 11.11.2021) em seus Capítulos VII e VIII.", margin, y, colW);

  write("Todos os meses, antes do dia 15 de cada mês, o funcionário deverá apresentar o contrato ou o boleto onde constam o nome do seu filho, o nome da instituição de ensino e o valor a ser pago, bem como o comprovante deste pagamento efetuado em instituição bancária.");
  write("Caso o funcionário esqueça ou se atrase na entrega destes documentos acima descritos, o mesmo ficará sem receber o reembolso. Enviar documentação até o dia 13 de cada mês para receber no fim do mês no holerite.");
  write("Cabe, somente à Diretoria Executiva, determinar o pagamento da mensalidade fora do prazo e não reembolsadas, mediante explanação e justificativas por escrito, do funcionário.");

  y += 36;

  doc.setFont("helvetica", "bold");
  doc.text("APROVADO:", margin, y);
  const aprovLineW = 240;
  const aprovLineX1 = margin + 80;
  const aprovLineX2 = aprovLineX1 + aprovLineW;
  doc.line(aprovLineX1, y - 4, aprovLineX2, y - 4);
  doc.text("Diretoria Executiva", (aprovLineX1 + aprovLineX2) / 2, y + 12, {
    align: "center",
  });
  y += 28;

  doc.text("Gestão de Pessoas", margin, y);
  const rightLabel = "Data de entrega:";
  const rightValue = o.dataEntrega || "__/__/____";
  doc.text(rightLabel, pageW - margin - doc.getTextWidth(rightLabel) - 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(rightValue, pageW - margin, y, { align: "right" });

  doc.save(`auxilio_creche_${sanitize(o.nome || "funcionario")}.pdf`);
}

function toUpper(s?: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

function writeParagraphWithBoldHeading(
  doc: jsPDF,
  heading: string,
  body: string,
  x: number,
  y: number,
  maxW: number
) {
  doc.setFont("helvetica", "bold");
  const head = `${heading} — `;
  doc.text(head, x, y);
  const xBody = x + doc.getTextWidth(head);
  doc.setFont("helvetica", "normal");
  const firstLineRoom = maxW - doc.getTextWidth(head);
  const words = body.split(" ");
  let line = "";
  let isFirst = true;
  const lh = 14;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    const width = doc.getTextWidth(test);
    const room = isFirst ? firstLineRoom : maxW;
    if (width > room) {
      doc.text(line, isFirst ? xBody : x, y);
      y += lh;
      line = w;
      isFirst = false;
    } else {
      line = test;
    }
  }
  if (line) doc.text(line, isFirst ? xBody : x, y);
  return y + lh;
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");
  const b = await r.blob();
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}
