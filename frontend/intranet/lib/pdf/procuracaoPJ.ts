import jsPDF from "jspdf";

export type PJOpts = {
    // OUTORGANTE (PJ)
    razaoSocial?: string;
    cnpj?: string;
    sedeEndereco?: string;
    sedeNumero?: string;
    sedeBairro?: string;
    sedeCep?: string;
    sedeCidade?: string;
    sedeUF?: string;
    representanteNome?: string;
    representanteNacionalidade?: string;
    representanteEstadoCivil?: string;
    representanteProfissao?: string;
    representanteDocTipo?: string;
    representanteDocNumero?: string;
    representanteCpf?: string;
    representanteEnd?: string;
    representanteNum?: string;
    representanteBairro?: string;
    representanteCep?: string;
    representanteCid?: string;
    representanteUF?: string;

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

    // Demais
    razaoCooperativa?: string;
    substabelecimento?: string;
    prazoValidade?: string;
    cidadeData?: string;
    dia?: string;
    mes?: string;
    ano?: string;
};

export async function gerarPdfProcuracaoPJ(o: PJOpts) {
    const left = 60;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 80;

    const get = (v?: string, ph: string = "________________") =>
        (v && String(v).trim()) || ph;

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

    // OUTORGANTE (PJ)
    write(
        `OUTORGANTE: ${get(o.razaoSocial)}; inscrita no CNPJ sob o nº ${maskCnpj(get(o.cnpj, "________________"))}, sediada na ${get(o.sedeEndereco)}, nº ${get(o.sedeNumero)}, bairro ${get(o.sedeBairro)}, CEP ${maskCep(get(o.sedeCep, "________"))}, ${get(o.sedeCidade)} - ${get(o.sedeUF)}, representada neste instrumento por ${get(o.representanteNome)}, ${get(o.representanteNacionalidade)}, ${get(o.representanteEstadoCivil)}, ${get(o.representanteProfissao)}, ${get(o.representanteDocTipo)} nº ${get(o.representanteDocNumero)}, CPF nº ${maskCpf(get(o.representanteCpf, "______________"))}, residente e domiciliado na ${get(o.representanteEnd)}, nº ${get(o.representanteNum)}, bairro ${get(o.representanteBairro)}, CEP ${maskCep(get(o.representanteCep, "________"))}, ${get(o.representanteCid)} - ${get(o.representanteUF)}.`
    );

    // OUTORGADO (PF)
    write(
        `OUTORGADO: ${get(o.outorgadoNome)}; ${get(o.outorgadoNacionalidade)}, ${get(o.outorgadoEstadoCivil)}, ${get(o.outorgadoProfissao)}, ${get(o.outorgadoDocTipo)} nº ${get(o.outorgadoDocNumero)}, CPF nº ${maskCpf(get(o.outorgadoCpf, "______________"))}, residente e domiciliado na ${get(o.outorgadoEndereco)}, nº ${get(o.outorgadoNumero)}, bairro ${get(o.outorgadoBairro)}, CEP ${maskCep(get(o.outorgadoCep, "________"))}, ${get(o.outorgadoCidade)} - ${get(o.outorgadoUF)}.`
    );

    // Cláusula de poderes (texto do seu anexo)
    const blocos = [
        `Pelo presente instrumento de mandato, o OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, a quem confere amplos poderes para representá-lo perante a ${get(o.razaoCooperativa, "Razão social da cooperativa")} e ao Banco Cooperativo Sicoob S/A – Banco Sicoob, a fim de associar-se e demitir-se; abrir, movimentar e encerrar contas correntes de depósito à vista e de poupança; retirar cartões eletrônicos, cadastrar e alterar senhas eletrônicas; requisitar, emitir e endossar cheques; fazer saques e retiradas mediante recibos; autorizar débitos, transferências e pagamentos, inclusive por meio de cartas; solicitar saldos e extratos;`,
        `fazer transferências e pagamentos para qualquer parte do País, ou mesmo para o Exterior; realizar aplicações e retiradas financeiras; solicitar operações de crédito; assinar propostas de operações de crédito; emitir, endossar e avalizar contratos e títulos de crédito; penhorar, alienar fiduciariamente ou hipotecar bens; utilizar limites de crédito; autorizar débitos relativos às operações de crédito;`,
        `assinar contratos de câmbio e aditivos; propostas de abertura de cartas de crédito; autorizações de débito em conta; autorização para fornecimento de moeda estrangeira; carta vinculatória e de compromisso; contratar seguros; bem como assinar os demais contratos e atos necessários, respondendo o OUTORGANTE pelas declarações do OUTORGADO, nos limites deste mandato, sendo o substabelecimento ${get(o.substabelecimento, "____________")}.`,
        `O presente mandato tem validade de ${get(o.prazoValidade, "________________")} (máximo 2 anos), devendo a sua revogação antecipada ser imediatamente e expressamente comunicada às instituições financeiras supra.`
    ];
    blocos.forEach(b => write(b, 20));

    y += 8;
    write(`${get(o.cidadeData, "Cidade - UF")}, ${get(o.dia, "__")} de ${get(o.mes, "________")} de ${get(o.ano, "____")}.`);

    // Assinatura (razão social + CNPJ)
    y += 30;
    const sigW = 360;
    doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
    doc.text(get(o.razaoSocial), pageW / 2, y + 16, { align: "center" });
    doc.text(`CNPJ ${maskCnpj(get(o.cnpj, "________________"))}`, pageW / 2, y + 32, { align: "center" });

    doc.save(`procuracao_pj_${(get(o.razaoSocial) || "outorgante").replace(/\s+/g, "_")}.pdf`);
}

function maskCpf(v: string) { const s = v.replace(/\D/g, ""); return s.length === 11 ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : v; }
function maskCnpj(v: string) { const s = v.replace(/\D/g, ""); return s.length === 14 ? `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}` : v; }
function maskCep(v: string) { const s = v.replace(/\D/g, ""); return s.length >= 8 ? `${s.slice(0, 5)}-${s.slice(5, 8)}` : v; }
