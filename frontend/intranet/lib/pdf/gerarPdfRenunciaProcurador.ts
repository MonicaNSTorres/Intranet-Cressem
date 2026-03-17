/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";

type PdfOpts = {
    renuncianteNome: string;
    renuncianteCpf: string;
    renuncianteRg?: string;
    outorganteNomeRazao: string;
    outorganteCpfCnpj: string;
    numeroConta: string;
    cidade: string;
    dia: string;
    mes: string;
    ano: string;
};

export async function gerarPdfRenunciaProcurador(o: PdfOpts) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 60;
    let y = 60;

    try {
        const logoUrl = "/sicoob-cressem-logo.png";
        const dataUrl = await toDataURL(logoUrl);
        const w = 130;
        const h = w * (500 / 1000);
        const marginLeft = 40;
        doc.addImage(dataUrl, "PNG", marginLeft, 40, w, h);
        y = 40 + h + 20; 
        {/*const h = w * (500 / 1000);
        doc.addImage(dataUrl, "PNG", pageW - margin - w, 36, w, h);*/}
    } catch { }

    //y += 52;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RENÚNCIA DE PROCURADOR (A)", pageW / 2, y + 20, { align: "center" });
    y += 62;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const par1 = `Pela presente, informo que renuncio, nesta data, aos poderes a mim concedidos por meio da procuração que me foi outorgada por ${o.outorganteNomeRazao}, ${o.outorganteCpfCnpj}, com finalidade de movimentação da conta ${o.numeroConta}.`;
    const par2 = `A partir da data de entrega deste documento, comprometo-me a não mais praticar qualquer ato representativo em relação à conta citada no parágrafo anterior, bem como devolver o(s) cartão(ões), talonário(s) de cheques ou folha(s) de cheque que estejam em meu poder.`;

    const write = (text: string, lh = 26) => {
        const lines = doc.splitTextToSize(text, pageW - margin * 2);
        lines.forEach((ln: any) => { doc.text(ln, margin, y); y += lh; });
    };

    write(par1);
    write(par2);

    y += 24;
    write(`${o.cidade}, ${o.dia} de ${o.mes} de ${o.ano}.`);

    y += 36;
    const sigW = 360;
    doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
    doc.setFont("helvetica", "bold");
    doc.text(o.renuncianteNome, pageW / 2, y + 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`CPF ${maskCpf(o.renuncianteCpf)}${o.renuncianteRg ? `  •  RG ${o.renuncianteRg}` : ""}`, pageW / 2, y + 36, { align: "center" });

    doc.save(`renuncia_procurador_${o.renuncianteNome.replace(/\s+/g, "_")}.pdf`);
}

function maskCpf(v: string) {
    const s = (v || "").replace(/\D/g, "");
    if (s.length !== 11) return v || "";
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}
async function toDataURL(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("logo not found");
    const b = await r.blob();
    return await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onloadend = () => res(fr.result as string);
        fr.readAsDataURL(b);
    });
}
