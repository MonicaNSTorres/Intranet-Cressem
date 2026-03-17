import jsPDF from "jspdf";

export type GerarAntecipacaoCapitalPdfData = {
  cpf: string;
  nome: string;
  integralizacao: string;
  taxa: string;
  cidade: string;
  total: string;
};

function getDataHojeExtenso() {
  const hoje = new Date();

  return {
    dia: String(hoje.getDate()).padStart(2, "0"),
    mes: hoje.toLocaleString("pt-BR", { month: "long" }),
    ano: String(hoje.getFullYear()),
  };
}

function quebrarTexto(
  doc: jsPDF,
  texto: string,
  larguraMaxima: number
): string[] {
  return doc.splitTextToSize(texto, larguraMaxima);
}

export function pdfGerarAntecipacaoCapital(
  data: GerarAntecipacaoCapitalPdfData
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { dia, mes, ano } = getDataHojeExtenso();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margemEsquerda = 20;
  const margemDireita = 20;
  const larguraTexto = pageWidth - margemEsquerda - margemDireita;

  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Solicitação de Antecipação de Capital", pageWidth / 2, y, {
    align: "center",
  });

  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const paragrafo1 = `Eu, ${data.nome}, sob nº de CPF: ${data.cpf}, solicito para o Sicoob Cressem a possibilidade de creditar na conta corrente da cooperativa o valor referente à integralização de ${data.integralizacao} e a taxa de manutenção ${data.taxa}, inicial avulsa, dando-se o valor de ${data.total}. Permitindo assim, que ocorra a minha associação à cooperativa antecipadamente.`;

  const paragrafo2 = `Estou ciente que o valor se refere à uma antecipação em caráter excepcional, e que o valor escolhido será descontado em folha a partir da data da associação.`;

  const linhasParagrafo1 = quebrarTexto(doc, paragrafo1, larguraTexto);
  const linhasParagrafo2 = quebrarTexto(doc, paragrafo2, larguraTexto);

  doc.text(linhasParagrafo1, margemEsquerda, y, {
    align: "justify",
    maxWidth: larguraTexto,
  });

  y += linhasParagrafo1.length * 7 + 10;

  doc.text(linhasParagrafo2, margemEsquerda, y, {
    align: "justify",
    maxWidth: larguraTexto,
  });

  y += linhasParagrafo2.length * 7 + 20;

  doc.text(`${data.cidade}, ${dia} de ${mes} de ${ano}.`, margemEsquerda, y);

  doc.save("solicitacao_antecipacao_capital.pdf");
}