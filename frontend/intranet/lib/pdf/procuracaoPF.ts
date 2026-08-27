import { gerarPdfProcuracaoPadronizado, type StyledPart } from "./procuracaoLayout";

export type PFOpts = {
  outorganteNome?: string;
  outorganteNacionalidade?: string;
  outorganteEstadoCivil?: string;
  outorganteProfissao?: string;
  outorganteDocTipo?: string;
  outorganteDocNumero?: string;
  outorganteCpf?: string;
  outorganteEndereco?: string;
  outorganteNumero?: string;
  outorganteBairro?: string;
  outorganteCep?: string;
  outorganteCidade?: string;
  outorganteUF?: string;
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

export async function gerarPdfProcuracaoPF(o: PFOpts) {
  const get = (value?: string, placeholder = "________________") =>
    (value && String(value).trim()) || placeholder;
  const nomeOutorgante = get(o.outorganteNome);
  const cpfOutorgante = maskCpf(get(o.outorganteCpf, "______________"));

  const outorgante: StyledPart[] = [
    { text: "OUTORGANTE: " },
    { text: nomeOutorgante, bold: true },
    { text: `; ${get(o.outorganteNacionalidade)}, ${get(o.outorganteEstadoCivil)}, ${get(o.outorganteProfissao)}, ${get(o.outorganteDocTipo)} nº ` },
    { text: get(o.outorganteDocNumero), bold: true },
    { text: ", CPF nº " },
    { text: cpfOutorgante, bold: true },
    { text: `, residente e domiciliado na ${get(o.outorganteEndereco)}` },
    { text: o.outorganteNumero?.trim() ? `, nº ${get(o.outorganteNumero)}` : "" },
    { text: `, bairro ${get(o.outorganteBairro)}, CEP ${maskCep(get(o.outorganteCep, "________"))}, ${get(o.outorganteCidade)} - ${get(o.outorganteUF)}.` },
  ];

  const cpfOutorgado = maskCpf(get(o.outorgadoCpf, "______________"));
  const outorgado: StyledPart[] = [
    { text: "OUTORGADO: " },
    { text: get(o.outorgadoNome), bold: true },
    { text: `; ${get(o.outorgadoNacionalidade)}, ${get(o.outorgadoEstadoCivil)}, ${get(o.outorgadoProfissao)}, ${get(o.outorgadoDocTipo)} nº ` },
    { text: get(o.outorgadoDocNumero), bold: true },
    { text: ", CPF nº " },
    { text: cpfOutorgado, bold: true },
    { text: `, residente e domiciliado na ${get(o.outorgadoEndereco)}` },
    { text: o.outorgadoNumero?.trim() ? `, nº ${get(o.outorgadoNumero)}` : "" },
    { text: `, bairro ${get(o.outorgadoBairro)}, CEP ${maskCep(get(o.outorgadoCep, "________"))}, ${get(o.outorgadoCidade)} - ${get(o.outorgadoUF)}.` },
  ];

  const poderes = [
    `Pelo presente instrumento de mandato, o OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, a quem confere amplos poderes para representá-lo perante a ${get(o.razaoCooperativa, "Razão social da cooperativa")} e ao Banco Cooperativo Sicoob S/A – Banco Sicoob, a fim de associar-se e demitir-se; abrir, movimentar e encerrar contas correntes de depósito à vista e de poupança; retirar cartões eletrônicos, cadastrar e alterar senhas eletrônicas; requisitar, emitir e endossar cheques; fazer saques e retiradas mediante recibos; autorizar débitos, transferências e pagamentos, inclusive por meio de cartas; solicitar saldos e extratos;`,
    "fazer transferências e pagamentos para qualquer parte do País, ou mesmo para o Exterior; realizar aplicações e retiradas financeiras; solicitar operações de crédito; assinar propostas de operações de crédito; emitir, endossar e avalizar contratos e títulos de crédito; penhorar, alienar fiduciariamente ou hipotecar bens de propriedade do OUTORGANTE; utilizar os limites de crédito abertos nas formas e condições propostas; autorizar débitos em conta corrente e/ou de poupança relativos às operações de crédito;",
    `assinar contratos de câmbio e seus respectivos aditivos; proposta de abertura de cartas de crédito; autorizações de débitos em conta corrente e/ou poupança relativas a operações de câmbio; autorização para fornecimento de moeda estrangeira; carta vinculatória e carta de compromisso; contratar seguros; bem como assinar todos os demais contratos de prestação de serviços e atos necessários ao fiel cumprimento deste mandato, respondendo o OUTORGANTE pelas declarações do OUTORGADO, nos limites do presente, sendo o substabelecimento ${get(o.substabelecimento, "____________")}.`,
  ];

  await gerarPdfProcuracaoPadronizado({
    outorgante,
    outorgado,
    poderes,
    validade: `O presente mandato tem validade de ${get(o.prazoValidade, "________________")} (máximo 2 anos), devendo a sua revogação antecipada ser imediatamente e expressamente comunicada às instituições financeiras supra.`,
    localData: `${get(o.cidadeData, "Cidade - UF")}, ${get(o.dia, "__")} de ${get(o.mes, "________")} de ${get(o.ano, "____")}.`,
    assinaturaNome: nomeOutorgante,
    assinaturaDocumento: `CPF ${cpfOutorgante}`,
    nomeArquivo: `procuracao_pf_${nomeOutorgante.replace(/\s+/g, "_")}.pdf`,
  });
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : value;
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : value;
}
