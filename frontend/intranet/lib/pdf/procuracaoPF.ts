import jsPDF from "jspdf";

export type PFOpts = {
    // OUTORGANTE (PF)
    outorganteNome?: string;
    outorganteNacionalidade?: string;
    outorganteEstadoCivil?: string;
    outorganteProfissao?: string;
    outorganteDocTipo?: string;  // RG, CNH...
    outorganteDocNumero?: string;
    outorganteCpf?: string;
    outorganteEndereco?: string;
    outorganteNumero?: string;
    outorganteBairro?: string;
    outorganteCep?: string;
    outorganteCidade?: string;
    outorganteUF?: string;

    // OUTORGADO (PF)
    outorgadoNome?: string;
    outorgadoNacionalidade?: string;
    outorgadoEstadoCivil?: string;
    outorgadoProfissao?: string;
    outorgadoDocTipo?: string;
    outorgadoDocNumero?: string;
    outorgadoCpf?: string;
    outorgadoEndereco?: string;
    outorgadoNumero?: string;
    outorgadoBairro?: string;
    outorgadoCep?: string;
    outorgadoCidade?: string;
    outorgadoUF?: string;

    // Demais campos do modelo
    razaoCooperativa?: string; // “Razão social da cooperativa”
    substabelecimento?: string; // ex.: “permitido” / “vedado”
    prazoValidade?: string;     // “até 24 meses”, por extenso
    cidadeData?: string;        // “Cidade - UF”
    dia?: string;
    mes?: string;               // “Agosto”
    ano?: string;
};

export async function gerarPdfProcuracaoPF(o: PFOpts) {
    const left = 60;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 80;

    const get = (v?: string, ph: string = "________________") =>
        (v && String(v).trim()) || ph;

    // (opcional) logo
    try {
        const logoUrl = "/sicoob-cressem-logo.png";
        const dataUrl = await toDataURL(logoUrl);
        const w = 140, h = w * (500 / 1000);
        doc.addImage(dataUrl, "PNG", pageW - left - w, 32, w, h);
    } catch { }

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PROCURAÇÃO", pageW / 2, y, { align: "center" });
    y += 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const write = (t: string, lineHeight = 20) => {
        const linhas = doc.splitTextToSize(t, pageW - 2 * left);
        linhas.forEach((linha: string) => {
            doc.text(linha, left, y, { maxWidth: pageW - 2 * left });
            y += lineHeight;
        });
    };

    // OUTORGANTE
    write(
        `OUTORGANTE: ${get(o.outorganteNome)}; ${get(o.outorganteNacionalidade)}, ${get(o.outorganteEstadoCivil)}, ${get(o.outorganteProfissao)}, ` +
        `${get(o.outorganteDocTipo)} nº ${get(o.outorganteDocNumero)}, CPF nº ${maskCpf(get(o.outorganteCpf, "______________"))}, residente e domiciliado na ${get(o.outorganteEndereco)}` +
        (o.outorganteNumero?.trim() ? `, nº ${get(o.outorganteNumero)}` : "") +
        `, bairro ${get(o.outorganteBairro)}, CEP ${maskCep(get(o.outorganteCep, "________"))}, ${get(o.outorganteCidade)} - ${get(o.outorganteUF)}.`
    );

    // OUTORGADO
    write(
        `OUTORGADO: ${get(o.outorgadoNome)}; ${get(o.outorgadoNacionalidade)}, ${get(o.outorgadoEstadoCivil)}, ${get(o.outorgadoProfissao)}, ` +
        `${get(o.outorgadoDocTipo)} nº ${get(o.outorgadoDocNumero)}, CPF nº ${maskCpf(get(o.outorgadoCpf, "______________"))}, residente e domiciliado na ${get(o.outorgadoEndereco)}` +
        (o.outorgadoNumero?.trim() ? `, nº ${get(o.outorgadoNumero)}` : "") + 
        `, bairro ${get(o.outorgadoBairro)}, CEP ${maskCep(get(o.outorgadoCep, "________"))}, ${get(o.outorgadoCidade)} - ${get(o.outorgadoUF)}.`
    );

    // Cláusula de poderes (texto do seu anexo, compactado em linhas)
    const blocos = [
        `Pelo presente instrumento de mandato, o OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, a quem confere amplos poderes para representá-lo perante a ${get(o.razaoCooperativa, "Razão social da cooperativa")} e ao Banco Cooperativo Sicoob S/A – Banco Sicoob, a fim de associar-se e demitir-se; abrir, movimentar e encerrar contas correntes de depósito à vista e de poupança; retirar cartões eletrônicos, cadastrar e alterar senhas eletrônicas; requisitar, emitir e endossar cheques; fazer saques e retiradas mediante recibos; autorizar débitos, transferências e pagamentos, inclusive por meio de cartas; solicitar saldos e extratos;`,
        `fazer transferências e pagamentos para qualquer parte do País, ou mesmo para o Exterior; realizar aplicações e retiradas financeiras; solicitar operações de crédito; assinar propostas de operações de crédito; emitir, endossar e avalizar contratos e títulos de crédito; penhorar, alienar fiduciariamente ou hipotecar bens de propriedade do OUTORGANTE; utilizar os limites de crédito abertos nas formas e condições propostas; autorizar débitos em conta corrente e/ou de poupança relativos às operações de crédito;`,
        `assinar contratos de câmbio e seus respectivos aditivos; proposta de abertura de cartas de crédito; autorizações de débitos em conta corrente e/ou poupança relativas a operações de câmbio; autorização para fornecimento de moeda estrangeira; carta vinculatória e carta de compromisso; contratar seguros; bem como assinar todos os demais contratos de prestação de serviços e atos necessários ao fiel cumprimento deste mandato, respondendo o OUTORGANTE pelas declarações do OUTORGADO, nos limites do presente, sendo o substabelecimento ${get(o.substabelecimento, "____________")}.`,
        `O presente mandato tem validade de ${get(o.prazoValidade, "________________")} (máximo 2 anos), devendo a sua revogação antecipada ser imediatamente e expressamente comunicada às instituições financeiras supra.`
    ];
    blocos.forEach(b => write(b, 20));

    y += 8;
    // Data/local
    write(`${get(o.cidadeData, "Cidade - UF")}, ${get(o.dia, "__")} de ${get(o.mes, "________")} de ${get(o.ano, "____")}.`);

    // Assinatura
    y += 30;
    const sigW = 340;
    doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
    doc.text(get(o.outorganteNome), pageW / 2, y + 16, { align: "center" });
    doc.text(`CPF ${maskCpf(get(o.outorganteCpf, "______________"))}`, pageW / 2, y + 32, { align: "center" });

    doc.save(`procuracao_pf_${(get(o.outorganteNome) || "outorgante").replace(/\s+/g, "_")}.pdf`);
}

function maskCpf(v: string) { const s = v.replace(/\D/g, ""); return s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : v; }
function maskCnpj(v: string) { const s = v.replace(/\D/g, ""); return s.length === 14 ? `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}` : v; }
function maskCep(v: string) { const s = v.replace(/\D/g, ""); return s.length >= 8 ? `${s.slice(0, 5)}-${s.slice(5, 8)}` : v; }

// ⬇️ Correção: tipagem explícita do retorno e do Promise
async function toDataURL(url: string): Promise<string> {
  const r = await fetch(url);
  const b = await r.blob();
  return await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onloadend = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(b);
  });
}
