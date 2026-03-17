import jsPDF from "jspdf";

type ResidenciaOpts = {
    nome: string;
    cpf: string;
    rg: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    dia: string;
    mes: string;
    ano: string;
};

export async function gerarPdfDeclaracaoResidencia(opts: ResidenciaOpts) {
    const {
        nome, cpf, rg, endereco, numero,
        complemento, bairro, cidade, uf, cep,
        dia, mes, ano
    } = opts;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    let y = 120;

    const logoUrl = "/sicoob-cressem-logo.png";
    const logo = await tryFetchAsDataURL(logoUrl);
    if (logo) {
        const w = 100; // largura
        const h = w * (500 / 1000);
        const marginLeft = 40;
        doc.addImage(logo, "PNG", marginLeft, 40, w, h);
        y = 40 + h + 20; // espaço abaixo do logo
    }

    y += 40;

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DECLARAÇÃO DE RESIDÊNCIA", pageW / 2, y, { align: "center" });
    y += 40;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Texto com linhas sublinhadas
    y += 40;
    doc.text(
        `Eu, ${nome || "__________________________"}, `,
        60, y
    ); y += 26;
    doc.text(
        `inscrito(a) no CPF ${cpf || "________________"} e no RG ${rg || "________________"},`,
        60, y
    ); y += 26;
    doc.text(
        "declaro para fins de comprovação de residência, sob penas da Lei (art. 2º da Lei 7.115/83)",
        60, y
    ); y += 26;
    {
        // monta a parte até "bairro ..." (quebra AQUI)
        const p1: string[] = [];
        p1.push(`que resido no endereço ${endereco || "__________________________"}`);
        if (numero?.trim()) p1.push(`nº ${numero.trim()}`);
        if (complemento?.trim()) p1.push(`complemento ${complemento.trim()}`);
        if (bairro?.trim()) p1.push(`bairro ${bairro.trim()}`);

        const linha1 = p1.join(" ");

        // monta a parte depois do bairro (cidade/UF e opcionalmente CEP)
        const p2: string[] = [];
        // vírgula logo após o bairro (se houver), senão depois do endereço/nº/complemento
        const terminaComVirgula = !!(bairro?.trim() || complemento?.trim() || numero?.trim());
        const cidadeUf = `cidade ${cidade || "____________"}, UF ${uf || "___"}`;
        p2.push(terminaComVirgula ? `${cidadeUf}` : `${cidadeUf}`);
        if (cep?.trim()) p2.push(`, CEP ${cep.trim()}`);

        const linha2 = p2.join("");

        // alinhamento e largura úteis (margem 60 dos dois lados)
        const xLeft = 60;
        const maxW = pageW - 120;

        // Se quiser centralizar as linhas, troque por:
        // doc.text(linha1, pageW / 2, y, { maxWidth: maxW, align: "center" });
        // y += 22;
        // doc.text(linha2, pageW / 2, y, { maxWidth: maxW, align: "center" });

        // Mantendo alinhado à esquerda como o resto do documento:
        doc.text(linha1, xLeft, y, { maxWidth: maxW });
        y += 26;
        doc.text(linha2, xLeft, y, { maxWidth: maxW });
        y += 26; // altura entre as linhas
    }


    /*doc.text(
        `complemento ${complemento || "__________"} bairro ${bairro || "____________________"}, cidade ${cidade || "____________"}, UF ${uf || "___"}`,
        60, y
    ); y += 22;
    doc.text(`CEP ${cep || "________________"}`, 60, y);
    y += 40;*/

    y += 60;

    // Data e local
    doc.text(
        `${cidade || "________________"}, ${dia || "___"} de ${mes || "________"} de ${ano || "20__"}.`,
        60, y
    ); y += 60;


    const marginLeft = 60;
    const lineWidth = 250;

    doc.line(marginLeft, y, marginLeft + lineWidth, y);

    doc.text("Assinatura do declarante", marginLeft, y + 16, { align: "left" });

    doc.save(
        `declaracao_residencia_${(nome || "associado").replace(/\s+/g, "_")}.pdf`
    );

}

async function tryFetchAsDataURL(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}