import { gerarPdfProcuracaoPadronizado, type StyledPart } from "./procuracaoLayout";

export type PJOpts = {
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
  razaoCooperativa?: string;
  substabelecimento?: string;
  prazoValidade?: string;
  cidadeData?: string;
  dia?: string;
  mes?: string;
  ano?: string;
};

export async function gerarPdfProcuracaoPJ(o: PJOpts) {
  const get = (value?: string, placeholder = "________________") =>
    (value && String(value).trim()) || placeholder;
  const razaoSocial = get(o.razaoSocial);
  const cnpj = maskCnpj(get(o.cnpj, "________________"));

  const representanteCpf = maskCpf(get(o.representanteCpf, "______________"));
  const outorgante: StyledPart[] = [
    { text: "OUTORGANTE: " },
    { text: razaoSocial, bold: true },
    { text: "; inscrita no CNPJ sob o nº " },
    { text: cnpj, bold: true },
    { text: `, sediada na ${get(o.sedeEndereco)}, nº ${get(o.sedeNumero)}, bairro ${get(o.sedeBairro)}, CEP ${maskCep(get(o.sedeCep, "________"))}, ${get(o.sedeCidade)} - ${get(o.sedeUF)}, representada neste instrumento por ` },
    { text: get(o.representanteNome), bold: true },
    { text: `, ${get(o.representanteNacionalidade)}, ${get(o.representanteEstadoCivil)}, ${get(o.representanteProfissao)}, ${get(o.representanteDocTipo)} nº ` },
    { text: get(o.representanteDocNumero), bold: true },
    { text: ", CPF nº " },
    { text: representanteCpf, bold: true },
    { text: `, residente e domiciliado na ${get(o.representanteEnd)}, nº ${get(o.representanteNum)}, bairro ${get(o.representanteBairro)}, CEP ${maskCep(get(o.representanteCep, "________"))}, ${get(o.representanteCid)} - ${get(o.representanteUF)}.` },
  ];

  const cpfOutorgado = maskCpf(get(o.outorgadoCpf, "______________"));
  const outorgado: StyledPart[] = [
    { text: "OUTORGADO: " },
    { text: get(o.outorgadoNome), bold: true },
    { text: `; ${get(o.outorgadoNacionalidade)}, ${get(o.outorgadoEstadoCivil)}, ${get(o.outorgadoProfissao)}, ${get(o.outorgadoDocTipo)} nº ` },
    { text: get(o.outorgadoDocNumero), bold: true },
    { text: ", CPF nº " },
    { text: cpfOutorgado, bold: true },
    { text: `, residente e domiciliado na ${get(o.outorgadoEndereco)}, nº ${get(o.outorgadoNumero)}, bairro ${get(o.outorgadoBairro)}, CEP ${maskCep(get(o.outorgadoCep, "________"))}, ${get(o.outorgadoCidade)} - ${get(o.outorgadoUF)}.` },
  ];

  const poderes = [
    `Pelo presente instrumento de mandato, o OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, a quem confere amplos poderes para representá-lo perante a ${get(o.razaoCooperativa, "Razão social da cooperativa")} e ao Banco Cooperativo Sicoob S/A – Banco Sicoob, a fim de associar-se e demitir-se; abrir, movimentar e encerrar contas correntes de depósito à vista e de poupança; retirar cartões eletrônicos, cadastrar e alterar senhas eletrônicas; requisitar, emitir e endossar cheques; fazer saques e retiradas mediante recibos; autorizar débitos, transferências e pagamentos, inclusive por meio de cartas; solicitar saldos e extratos;`,
    "fazer transferências e pagamentos para qualquer parte do País, ou mesmo para o Exterior; realizar aplicações e retiradas financeiras; solicitar operações de crédito; assinar propostas de operações de crédito; emitir, endossar e avalizar contratos e títulos de crédito; penhorar, alienar fiduciariamente ou hipotecar bens; utilizar limites de crédito; autorizar débitos relativos às operações de crédito;",
    `assinar contratos de câmbio e aditivos; propostas de abertura de cartas de crédito; autorizações de débito em conta; autorização para fornecimento de moeda estrangeira; carta vinculatória e de compromisso; contratar seguros; bem como assinar os demais contratos e atos necessários, respondendo o OUTORGANTE pelas declarações do OUTORGADO, nos limites deste mandato, sendo o substabelecimento ${get(o.substabelecimento, "____________")}.`,
  ];

  await gerarPdfProcuracaoPadronizado({
    outorgante,
    outorgado,
    poderes,
    validade: `O presente mandato tem validade de ${get(o.prazoValidade, "________________")} (máximo 2 anos), devendo a sua revogação antecipada ser imediatamente e expressamente comunicada às instituições financeiras supra.`,
    localData: `${get(o.cidadeData, "Cidade - UF")}, ${get(o.dia, "__")} de ${get(o.mes, "________")} de ${get(o.ano, "____")}.`,
    assinaturaNome: razaoSocial,
    assinaturaDocumento: `CNPJ ${cnpj}`,
    nomeArquivo: `procuracao_pj_${razaoSocial.replace(/\s+/g, "_")}.pdf`,
  });
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : value;
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 14 ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}` : value;
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : value;
}
