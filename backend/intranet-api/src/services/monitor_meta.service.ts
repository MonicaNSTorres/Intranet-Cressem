import { sendEmail } from "./email.service";
import { oracleExecute, oracleExecuteCommit, oracleExecuteManyCommit } from "./oracle.service";

type GenericRow = Record<string, unknown>;

type RegistrarMonitorParams = {
  tela: string;
  tema: string;
  periodo: string;
  fonte: string;
  dtFimPeriodo: string;
  rows: GenericRow[];
  gravarCarga?: boolean;
  gravarResultado?: boolean;
};

const SQL_INSERT_CARGA = `
  INSERT INTO DBACRESSEM.MONITOR_META_CARGA (
    DT_EXECUCAO,
    NM_TEMA,
    NM_FONTE,
    QTD_LINHAS,
    QTD_DISTINTAS,
    DT_MAX,
    NM_STATUS,
    NM_DETALHES
  ) VALUES (
    SYSDATE,
    :nm_tema,
    :nm_fonte,
    :qtd_linhas,
    :qtd_distintas,
    TO_DATE(:dt_max, 'DD/MM/YYYY'),
    :nm_status,
    :nm_detalhes
  )
`;

const SQL_INSERT_RESULTADO = `
  INSERT INTO DBACRESSEM.MONITOR_META_RESULTADO (
    DT_EXECUCAO,
    NM_TELA,
    NM_TEMA,
    DT_PERIODO,
    CV_ENTIDADE,
    NM_JSON,
    NM_STATUS,
    NM_DETALHES
  ) VALUES (
    SYSDATE,
    :nm_tela,
    :nm_tema,
    :dt_periodo,
    :cv_entidade,
    :nm_json,
    :nm_status,
    :nm_detalhes
  )
`;

const SQL_INSERT_ALERTA = `
  INSERT INTO DBACRESSEM.MONITOR_META_ALERTA (
    DT_EXECUCAO,
    NM_GRAVIDADE,
    NM_REGRA,
    NM_ENTIDADE,
    VL_ENCONTRADO,
    VL_ESPERADO,
    SN_RESOLVIDO,
    NM_OBSERVACAO
  )
  SELECT
    SYSDATE,
    :nm_gravidade,
    :nm_regra,
    :nm_entidade,
    :vl_encontrado,
    :vl_esperado,
    0,
    :nm_observacao
  FROM DUAL
  WHERE NOT EXISTS (
    SELECT 1
    FROM DBACRESSEM.MONITOR_META_ALERTA A
    WHERE A.SN_RESOLVIDO = 0
      AND A.NM_REGRA = :nm_regra
      AND A.NM_ENTIDADE = :nm_entidade
      AND NVL(A.VL_ENCONTRADO, ' ') = NVL(:vl_encontrado, ' ')
      AND NVL(A.VL_ESPERADO, ' ') = NVL(:vl_esperado, ' ')
      AND NVL(A.NM_OBSERVACAO, ' ') = NVL(:nm_observacao, ' ')
  )
`;

type VariacaoDetectada = {
  entidade: string;
  metrica: string;
  valorAtual: number;
  valorAnterior: number;
  variacaoPerc: number;
  gravidade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  ordemAlfabetica?: string;
};

type MetaMensalDivergente = {
  entidade: string;
  nomePa: string;
  valorAtual: number;
  valorEsperado: number;
  diferenca: number;
};

type MetaMensalEsperada = {
  nomePa: string;
  valorEsperado: number;
};

type MetaMensalFuncionarioEsperada = {
  nomeFuncionario: string;
  valorEsperado: number;
};

type MetaMensalFuncionarioDivergente = {
  entidade: string;
  nomeFuncionario: string;
  valorAtual: number;
  valorEsperado: number;
  diferenca: number;
};

const ORDEM_PADRAO_PA = [
  "SICOOB CRESSEM",
  "SEDE",
  "SUL",
  "CAMPOS DO JORDÃO",
  "AGÊNCIA PARAIBUNA",
  "CAÇAPAVA",
  "CRUZEIRO",
  "AGENCIA JAMBEIRO",
  "SANTO ANTÔNIO DO PINHAL",
  "JACAREÍ",
  "SANTA BRANCA",
  "TAUBATÉ",
  "UBATUBA",
  "CARAGUATATUBA",
  "SÃO SEBASTIÃO",
  "ILHABELA",
  "SALESÓPOLIS",
  "TAPIRAÍ",
  "SETOR PJ",
];

const NUMERO_PA_PADRAO = [
  "4317",
  "0",
  "1",
  "2",
  "4",
  "5",
  "7",
  "8",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "95",
];

const METAS_MENSAIS_ENTRADA_COOPERADOS: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 124 },
    { nomePa: "SEDE", valorEsperado: 60 },
    { nomePa: "SUL", valorEsperado: 2 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 4 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 9 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 10 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 8 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 2 },
    { nomePa: "JACAREÍ", valorEsperado: 7 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 2 },
    { nomePa: "UBATUBA", valorEsperado: 8 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 1 },
    { nomePa: "ILHABELA", valorEsperado: 2 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 8 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 126 },
    { nomePa: "SEDE", valorEsperado: 68 },
    { nomePa: "SUL", valorEsperado: 5 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 4 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 16 },
    { nomePa: "CAÇAPAVA", valorEsperado: 1 },
    { nomePa: "CRUZEIRO", valorEsperado: 4 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 11 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 1 },
    { nomePa: "JACAREÍ", valorEsperado: 5 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 7 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 2 },
    { nomePa: "ILHABELA", valorEsperado: 1 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 189 },
    { nomePa: "SEDE", valorEsperado: 76 },
    { nomePa: "SUL", valorEsperado: 10 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 6 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 18 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2 },
    { nomePa: "CRUZEIRO", valorEsperado: 14 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 12 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 2 },
    { nomePa: "JACAREÍ", valorEsperado: 5 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 3 },
    { nomePa: "UBATUBA", valorEsperado: 17 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 4 },
    { nomePa: "ILHABELA", valorEsperado: 9 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 10 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 170 },
    { nomePa: "SEDE", valorEsperado: 69 },
    { nomePa: "SUL", valorEsperado: 8 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 6 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 21 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2 },
    { nomePa: "CRUZEIRO", valorEsperado: 7 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 17 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 8 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 10 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 3 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 5 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 13 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 184 },
    { nomePa: "SEDE", valorEsperado: 48 },
    { nomePa: "SUL", valorEsperado: 12 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 7 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 22 },
    { nomePa: "CAÇAPAVA", valorEsperado: 3 },
    { nomePa: "CRUZEIRO", valorEsperado: 16 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 17 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 1 },
    { nomePa: "JACAREÍ", valorEsperado: 10 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 16 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 8 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 22 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_ENTRADA_COOPERADOS: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "ADRIANA BATISTA DENARI DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 4 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 2 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 3 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 1 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 1 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 0 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 0 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 1 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 22 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 3 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 3 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 8 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 4 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 5 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 0 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 2 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 5 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 2 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 0 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 0 },
    { nomeFuncionario: "KEZIA YORRANA PEREIRA DA SILVA GUALBERTO", valorEsperado: 0 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 5 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 2 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 6 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 2 },
    { nomeFuncionario: "MARILU DUARTE DA SILVA", valorEsperado: 0 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 0 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 1 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 1 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 2 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 4 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 2 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 1 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 1 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 7 },
  ],
  2: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 1 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 4 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 1 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 3 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 4 },
    { nomeFuncionario: "ANDERSON HENRIQUE DE JESUS", valorEsperado: 1 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 0 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 0 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 2 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 2 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 0 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 7 },
    { nomeFuncionario: "CLENDIZA ROCHA DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 5 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 7 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 3 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 6 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 3 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 10 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 5 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 1 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 3 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 2 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 0 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 1 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 4 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 4 },
    { nomeFuncionario: "LUCAS ITNER ANDRADE", valorEsperado: 0 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 0 },
    { nomeFuncionario: "MARILU DUARTE DA SILVA", valorEsperado: 0 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 1 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 6 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 2 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 6 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 0 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 1 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 0 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 4 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 1 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 6 },
  ],
  3: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 4 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 4 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 2 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 3 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 10 },
    { nomeFuncionario: "ANDERSON HENRIQUE DE JESUS", valorEsperado: 0 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 3 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 0 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 2 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 10 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 0 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 19 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 6 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 5 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 12 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 9 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 0 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 0 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 4 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 2 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 5 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 0 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 3 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 3 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 2 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 0 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 3 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 3 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 3 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 1 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 2 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 1 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 3 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 6 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 7 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 10 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 4 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 3 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 0 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 12 },
  ],
  4: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 3 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 9 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 5 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 11 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 1 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 2 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 3 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 6 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 1 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 17 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 3 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 5 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 4 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 8 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 3 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 6 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 7 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 4 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 11 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 1 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 1 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 7 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 5 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 6 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 3 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 1 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 3 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 4 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 3 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 2 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 13 },
  ],
  5: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 4 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 9 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 1 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 6 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 10 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 9 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 1 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 12 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 3 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 11 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 3 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 6 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 5 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 14 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 10 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 6 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 5 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 1 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 3 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 3 },
    { nomeFuncionario: "KEZIA YORRANA PEREIRA DA SILVA GUALBERTO", valorEsperado: 4 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 6 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 4 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 7 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 1 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 3 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 3 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 1 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 7 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 1 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 4 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 1 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 6 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 1 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_CONTA_CORRENTE_ABERTAS: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "ADRIANA BATISTA DENARI DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 4 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 3 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 3 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 1 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 1 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 1 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 22 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 4 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 3 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 9 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 5 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 1 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 5 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 2 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 6 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 9 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 2 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 5 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 4 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 6 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 1 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 2 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 6 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 2 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 3 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 3 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 5 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 7 },
  ],
  2: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 2 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 5 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 4 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 4 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 6 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 2 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 2 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 10 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 5 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 8 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 4 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 6 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 3 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 8 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 4 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 5 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 2 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 3 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 1 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 9 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 4 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 1 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 1 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 3 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 6 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 2 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 8 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 5 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 3 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 3 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 5 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 9 },
  ],
  3: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 4 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 4 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 2 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 4 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 10 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 3 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 4 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 2 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 9 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 1 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 19 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 2 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 6 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 4 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 14 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 10 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 4 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 3 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 5 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 8 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 4 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 4 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 4 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 5 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 4 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 2 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 3 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 1 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 4 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 8 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 8 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 2 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 11 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 3 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 4 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 13 },
  ],
  4: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 4 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 10 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 4 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 9 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 1 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 3 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 2 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 7 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 2 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 21 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 5 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 5 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 4 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 11 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 3 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 8 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 2 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 5 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 4 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 11 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 3 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 1 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 1 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 11 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 6 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 7 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 1 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 2 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 4 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 4 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 3 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 2 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 5 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 1 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 6 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 2 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 13 },
  ],
  5: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 4 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 10 },
    { nomeFuncionario: "ANA CAROLINA MOTA HESPANHA RODRIGUES", valorEsperado: 1 },
    { nomeFuncionario: "ANA CLARA DE SEIXAS RODRIGUES DOS SANTOS", valorEsperado: 1 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 6 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 11 },
    { nomeFuncionario: "ARTHUR HENRIQUE DE OLIVEIRA ALVARENGA", valorEsperado: 4 },
    { nomeFuncionario: "BRUNA ROBERTA OLIVEIRA DOS REIS SILVA", valorEsperado: 1 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 11 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 4 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 11 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 3 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 5 },
    { nomeFuncionario: "ELOA CRISTINA PRUDENTE", valorEsperado: 6 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 15 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 10 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 1 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "GILMAR APARECIDO CAVALCANTE DO PRADO", valorEsperado: 6 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 5 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 7 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 3 },
    { nomeFuncionario: "JANAINA DE LIMA TONETTO", valorEsperado: 1 },
    { nomeFuncionario: "KEZIA YORRANA PEREIRA DA SILVA GUALBERTO", valorEsperado: 3 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 7 },
    { nomeFuncionario: "LILIAN ALESSANDRA BICUDO", valorEsperado: 7 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 6 },
    { nomeFuncionario: "LUCIENE LENZI DE CARVALHO GARCIA", valorEsperado: 2 },
    { nomeFuncionario: "MAYARA MARIELI SILVA", valorEsperado: 2 },
    { nomeFuncionario: "MONICA COSTA DE MORAES", valorEsperado: 5 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 2 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 3 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 1 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 8 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 2 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 3 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 3 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 6 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 1 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_SEGURO_GERAIS_NOVO: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 1053.94 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 584.9 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 4211.78 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 531.39 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 478.8 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 1169.8 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 2552.6 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 7362.1 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 389.4 },
    { nomeFuncionario: "MARILU DUARTE DA SILVA", valorEsperado: 389.4 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 1347 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 433.51 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 5580.5 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 1884.19 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 584.9 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 10140.99 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 2643.23 },
  ],
  2: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 1814.87 },
    { nomeFuncionario: "ANDERSON HENRIQUE DE JESUS", valorEsperado: 906.17 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 1596.26 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 5662.7 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 584.9 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 584.9 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 2673.24 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 4184.62 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 903.96 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 3254.68 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 706.43 },
    { nomeFuncionario: "MARILU DUARTE DA SILVA", valorEsperado: 1557.6 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 778.8 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 1277.3 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 719.8 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 584.9 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 2542.58 },
  ],
  3: [
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 1466.2 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 2886.37 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 5044.28 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 1588.77 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 7271.36 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 389.4 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 14435.38 },
    { nomeFuncionario: "MATHEUS GUILHERME COSTA SANTANA", valorEsperado: 389.4 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 389.4 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 389.4 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 887.9 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 3756.8 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 389.4 },
  ],
  4: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 389.4 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 373.47 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 4352.8 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 389.4 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 4123.48 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 887.9 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 802.8 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 6961.84 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 478.8 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 3705.71 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 1872.9 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 2722.73 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 401.05 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 389.4 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 1754.7 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 1872.38 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 1354.43 },
  ],
  5: [
    { nomeFuncionario: "ADRIANA BATISTA DENARI DOS SANTOS", valorEsperado: 1098.95 },
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 2518.58 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 3226.08 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 4615.34 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 389.4 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 478.8 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 1301.48 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 7946.86 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 4812.82 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 2030.02 },
    { nomeFuncionario: "PAMELA MICHELE MATTIAZZO", valorEsperado: 1537.51 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 3473.29 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 887.9 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 8633.48 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 3400.55 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_SEGURO_VENDA_NOVA: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 173.24 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 257.6 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 144.36 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 42.6 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 143.9 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 217.72 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 18.17 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 24.91 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 264.75 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 21.16 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 35.26 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 178.78 },
  ],
  2: [
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 69.27 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 64.29 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 88.48 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 84.54 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 58.45 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 50.8 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 40.35 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 46.78 },
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 30.7 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 53.17 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 157.5 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 71.04 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 37.2 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 115.61 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 52.74 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 1174.4 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 235.99 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 702.84 },
  ],
  3: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 87.03 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 139.15 },
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 27.12 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 36.59 },
    { nomeFuncionario: "ANTONIO CARLOS DE ABREU FARIA", valorEsperado: 29.14 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 138.08 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 267.47 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 315.73 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 119.67 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 482.39 },
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 64.49 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 85.52 },
    { nomeFuncionario: "FLAVIA CRISTINA VICTOR AZZOLINI", valorEsperado: 53.72 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 50.22 },
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 59.46 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 166.73 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 183.6 },
    { nomeFuncionario: "IAN DE MOURA PEREIRA E SILVA", valorEsperado: 351.37 },
    { nomeFuncionario: "ISABELA GARCIA MONTEIRO", valorEsperado: 43.41 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 117.06 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 296.39 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 287.32 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 31.81 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 97.65 },
    { nomeFuncionario: "NATHALIA VICTORIA MOREIRA MACHADO", valorEsperado: 60.81 },
    { nomeFuncionario: "PEDRO PAULO BITTENCOURT DE FARIA BARROS", valorEsperado: 53.72 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 162.08 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 234.34 },
    { nomeFuncionario: "STEPHANIE CAMILA MATOS SILVA", valorEsperado: 467.13 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 84.97 },
    { nomeFuncionario: "VITORIA CAROLINE DOS SANTOS", valorEsperado: 153.22 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 322.81 },
  ],
  4: [
    { nomeFuncionario: "ADRIANA BATISTA DENARI DOS SANTOS", valorEsperado: 276.02 },
    { nomeFuncionario: "ANA RAQUEL BARROS LOPES DE CAMPOS", valorEsperado: 34.37 },
    { nomeFuncionario: "CAROLINA BIANCA ALVARENGA DAUANNY", valorEsperado: 101.64 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 4064.54 },
    { nomeFuncionario: "CLEIDIANA DA SILVA", valorEsperado: 216.24 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 131.43 },
    { nomeFuncionario: "GABRIELLI CRISTINE ROSA VIEIRA DOS SANTOS", valorEsperado: 124.89 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 156.86 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 105.43 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 50.8 },
    { nomeFuncionario: "JENNYFFER HELENA RODRIGUES DE JESUS", valorEsperado: 26.94 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 237.53 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 101.73 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 34.16 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 430.78 },
  ],
  5: [
    { nomeFuncionario: "FERNANDA ALVES PEREIRA DE SOUZA", valorEsperado: 56.6 },
    { nomeFuncionario: "JULIA PAOLA PIMENTEL FERREIRA", valorEsperado: 76.25 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 151.02 },
    { nomeFuncionario: "NATALIA GARCIA DOS SANTOS", valorEsperado: 278.68 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_SEGURO_RURAL: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

const METAS_MENSAIS_FUNCIONARIO_PREVIDENCIA_MI: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 1 },
  ],
  2: [
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 1 },
  ],
  3: [],
  4: [],
  5: [],
};

const METAS_MENSAIS_FUNCIONARIO_PREVIDENCIA_VGBL: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [],
  2: [],
  3: [
    { nomeFuncionario: "ANA KARINA SANTOS COELHO SENADOR", valorEsperado: 1 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 1 },

  ],
  4: [
    { nomeFuncionario: "GEICE DOS REIS", valorEsperado: 1 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 1 },
  ],
  5: [
    { nomeFuncionario: "GABRIELLE ALVES DOS SANTOS", valorEsperado: 1 },
  ],
};

const METAS_MENSAIS_FUNCIONARIO_CONSORCIO: Record<
  number,
  MetaMensalFuncionarioEsperada[]
> = {
  1: [
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 112895 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 21000 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 73474 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 23051 },
  ],
  2: [
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 30000 },
    { nomeFuncionario: "FILLIP DE CARVALHO MIDOES E SILVA", valorEsperado: 7500 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 17500 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 217101 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 15250 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 23776 },
  ],
  3: [
    { nomeFuncionario: "ADRIANO CASTRO SPEGIORIN", valorEsperado: 9000 },
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 14500 },
    { nomeFuncionario: "CARLA GLASSER PANSERA DE FREITAS", valorEsperado: 71862 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 1283292 },
    { nomeFuncionario: "DIOMAR MORAES DE SOUSA RAMOS", valorEsperado: 44272 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 46711 },
    { nomeFuncionario: "LARISSA ROBERTA DA SILVA SOUSA", valorEsperado: 300000 },
    { nomeFuncionario: "LUANA ANDRESA DE OLIVEIRA", valorEsperado: 50242 },
    { nomeFuncionario: "RAISSA STEFANI SANCHES DA SILVA", valorEsperado: 7500 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 439328 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 102748 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 277293 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 24200 },
  ],
  4: [
    { nomeFuncionario: "AMANDA APARECIDA MEIRELES", valorEsperado: 30000 },
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 427500 },
    { nomeFuncionario: "FABIANA RUFINO RESENDE", valorEsperado: 12000 },
    { nomeFuncionario: "HEITOR PEIXOTO DE SOUZA", valorEsperado: 61757 },
    { nomeFuncionario: "ISIS GRASIELA SANCHES RONDON", valorEsperado: 3500 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 101700 },
    { nomeFuncionario: "GUSTAVO COLAFRANCESCO AMIM SOARES", valorEsperado: 102928 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 330000 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 12000 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 48033 },
  ],
  5: [
    { nomeFuncionario: "CHRISTIAN JESUS SIQUEIRA", valorEsperado: 198500 },
    { nomeFuncionario: "ROBERTA RAMOS DIAS", valorEsperado: 34309 },
    { nomeFuncionario: "THIAGO SILVERIO DOS REIS", valorEsperado: 1001626 },
    { nomeFuncionario: "VERA LUCIA ZAGO", valorEsperado: 7500 },
    { nomeFuncionario: "YASMIN DE QUEIROZ LEMOS RIBEIRO", valorEsperado: 54774 },
  ],
};

const METAS_MENSAIS_CONTA_CORRENTE_ABERTAS: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 149 },
    { nomePa: "SEDE", valorEsperado: 41 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 13 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 9 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2 },
    { nomePa: "CRUZEIRO", valorEsperado: 11 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 9 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 1 },
    { nomePa: "JACAREÍ", valorEsperado: 9 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 2 },
    { nomePa: "UBATUBA", valorEsperado: 9 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 2 },
    { nomePa: "ILHABELA", valorEsperado: 1 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 8 },
    { nomePa: "SETOR PJ", valorEsperado: 31 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 164 },
    { nomePa: "SEDE", valorEsperado: 58 },
    { nomePa: "SUL", valorEsperado: 4 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 13 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 16 },
    { nomePa: "CAÇAPAVA", valorEsperado: 1 },
    { nomePa: "CRUZEIRO", valorEsperado: 5 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 12 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 1 },
    { nomePa: "JACAREÍ", valorEsperado: 8 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 7 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 3 },
    { nomePa: "ILHABELA", valorEsperado: 4 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 30 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 210 },
    { nomePa: "SEDE", valorEsperado: 48 },
    { nomePa: "SUL", valorEsperado: 11 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 13 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 18 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2 },
    { nomePa: "CRUZEIRO", valorEsperado: 16 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 12 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 3 },
    { nomePa: "JACAREÍ", valorEsperado: 6 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 3 },
    { nomePa: "UBATUBA", valorEsperado: 20 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 2 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 5 },
    { nomePa: "ILHABELA", valorEsperado: 5 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 10 },
    { nomePa: "SETOR PJ", valorEsperado: 36 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 198 },
    { nomePa: "SEDE", valorEsperado: 42 },
    { nomePa: "SUL", valorEsperado: 11 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 9 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 20 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2 },
    { nomePa: "CRUZEIRO", valorEsperado: 12 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 17 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 8 },
    { nomePa: "SANTA BRANCA", valorEsperado: 1 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 14 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 2 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 1 },
    { nomePa: "ILHABELA", valorEsperado: 7 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 12 },
    { nomePa: "SETOR PJ", valorEsperado: 39 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 198 },
    { nomePa: "SEDE", valorEsperado: 28 },
    { nomePa: "SUL", valorEsperado: 12 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 14 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 23 },
    { nomePa: "CAÇAPAVA", valorEsperado: 3 },
    { nomePa: "CRUZEIRO", valorEsperado: 17 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 17 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 2 },
    { nomePa: "JACAREÍ", valorEsperado: 13 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1 },
    { nomePa: "UBATUBA", valorEsperado: 18 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 1 },
    { nomePa: "ILHABELA", valorEsperado: 5 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 21 },
    { nomePa: "SETOR PJ", valorEsperado: 22 },
  ],
};

const METAS_MENSAIS_CONSORCIO: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 230420 },
    { nomePa: "SEDE", valorEsperado: 94474 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 135946 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 311127 },
    { nomePa: "SEDE", valorEsperado: 22750 },
    { nomePa: "SUL", valorEsperado: 17500 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 270877 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 3481485 },
    { nomePa: "SEDE", valorEsperado: 887592 },
    { nomePa: "SUL", valorEsperado: 66393 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 50242 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 58772 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 150000 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 300000 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 71862 },
    { nomePa: "SETOR PJ", valorEsperado: 1896624 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1129418 },
    { nomePa: "SEDE", valorEsperado: 178957 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 12000 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 30000 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 908461 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1296709 },
    { nomePa: "SEDE", valorEsperado: 41809 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 45000 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 1209900 },
  ],
};

const METAS_MENSAIS_EMPRESTIMO_BANCOOB: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 52692.47 },
    { nomePa: "SEDE", valorEsperado: 15213.51 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 2586.62 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 34892.34 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 133920.83 },
    { nomePa: "SEDE", valorEsperado: 67250.8 },
    { nomePa: "SUL", valorEsperado: 30057.5 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 27964.31 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 8648.22 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 356462.63 },
    { nomePa: "SEDE", valorEsperado: 26287.73 },
    { nomePa: "SUL", valorEsperado: 39171.98 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 20684.66 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 88585.01 },
    { nomePa: "CAÇAPAVA", valorEsperado: 75379.57 },
    { nomePa: "CRUZEIRO", valorEsperado: 24152.89 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1408.81 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 80791.98 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 67022.05 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 36113.92 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 26788.69 },
    { nomePa: "CAÇAPAVA", valorEsperado: 4119.44 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 88178.71 },
    { nomePa: "SEDE", valorEsperado: 10302.34 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 20597.62 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 50043.71 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 7235.04 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_PORTABILIDADE: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 5787 },
    { nomePa: "SEDE", valorEsperado: 3998 },
    { nomePa: "SUL", valorEsperado: 238 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 152 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 290 },
    { nomePa: "CAÇAPAVA", valorEsperado: 278 },
    { nomePa: "CRUZEIRO", valorEsperado: 120 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 243 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 11 },
    { nomePa: "JACAREÍ", valorEsperado: 78 },
    { nomePa: "SANTA BRANCA", valorEsperado: 4 },
    { nomePa: "TAUBATÉ", valorEsperado: 7 },
    { nomePa: "UBATUBA", valorEsperado: 149 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 18 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 11 },
    { nomePa: "ILHABELA", valorEsperado: 106 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 1 },
    { nomePa: "TAPIRAÍ", valorEsperado: 111 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 5768 },
    { nomePa: "SEDE", valorEsperado: 3946 },
    { nomePa: "SUL", valorEsperado: 240 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 152 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 191 },
    { nomePa: "CAÇAPAVA", valorEsperado: 279 },
    { nomePa: "CRUZEIRO", valorEsperado: 122 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 230 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 12 },
    { nomePa: "JACAREÍ", valorEsperado: 78 },
    { nomePa: "SANTA BRANCA", valorEsperado: 4 },
    { nomePa: "TAUBATÉ", valorEsperado: 9 },
    { nomePa: "UBATUBA", valorEsperado: 202 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 15 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 16 },
    { nomePa: "ILHABELA", valorEsperado: 107 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 6 },
    { nomePa: "TAPIRAÍ", valorEsperado: 159 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 5871 },
    { nomePa: "SEDE", valorEsperado: 3936 },
    { nomePa: "SUL", valorEsperado: 240 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 154 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 285 },
    { nomePa: "CAÇAPAVA", valorEsperado: 274 },
    { nomePa: "CRUZEIRO", valorEsperado: 120 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 248 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 13 },
    { nomePa: "JACAREÍ", valorEsperado: 80 },
    { nomePa: "SANTA BRANCA", valorEsperado: 2 },
    { nomePa: "TAUBATÉ", valorEsperado: 11 },
    { nomePa: "UBATUBA", valorEsperado: 201 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 16 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 19 },
    { nomePa: "ILHABELA", valorEsperado: 105 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 6 },
    { nomePa: "TAPIRAÍ", valorEsperado: 161 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 5895 },
    { nomePa: "SEDE", valorEsperado: 3910 },
    { nomePa: "SUL", valorEsperado: 246 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 162 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 293 },
    { nomePa: "CAÇAPAVA", valorEsperado: 271 },
    { nomePa: "CRUZEIRO", valorEsperado: 118 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 261 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 12 },
    { nomePa: "JACAREÍ", valorEsperado: 83 },
    { nomePa: "SANTA BRANCA", valorEsperado: 4 },
    { nomePa: "TAUBATÉ", valorEsperado: 13 },
    { nomePa: "UBATUBA", valorEsperado: 207 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 17 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 19 },
    { nomePa: "ILHABELA", valorEsperado: 105 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 6 },
    { nomePa: "TAPIRAÍ", valorEsperado: 168 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 5690 },
    { nomePa: "SEDE", valorEsperado: 3924 },
    { nomePa: "SUL", valorEsperado: 247 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 166 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 292 },
    { nomePa: "CAÇAPAVA", valorEsperado: 265 },
    { nomePa: "CRUZEIRO", valorEsperado: 122 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 72 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 12 },
    { nomePa: "JACAREÍ", valorEsperado: 80 },
    { nomePa: "SANTA BRANCA", valorEsperado: 4 },
    { nomePa: "TAUBATÉ", valorEsperado: 12 },
    { nomePa: "UBATUBA", valorEsperado: 184 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 19 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 15 },
    { nomePa: "ILHABELA", valorEsperado: 104 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 5 },
    { nomePa: "TAPIRAÍ", valorEsperado: 167 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_VOLUME_TRANSACOES: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 8382500.88 },
    { nomePa: "SEDE", valorEsperado: 6625718.63 },
    { nomePa: "SUL", valorEsperado: 239641.09 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 182048.17 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 320339.32 },
    { nomePa: "CAÇAPAVA", valorEsperado: 187326.6 },
    { nomePa: "CRUZEIRO", valorEsperado: 129619.54 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 167722.21 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 23425.84 },
    { nomePa: "JACAREÍ", valorEsperado: 78568.52 },
    { nomePa: "SANTA BRANCA", valorEsperado: 50 },
    { nomePa: "TAUBATÉ", valorEsperado: 15009.84 },
    { nomePa: "UBATUBA", valorEsperado: 156827.8 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 16000.18 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 12572.06 },
    { nomePa: "ILHABELA", valorEsperado: 146123.35 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 859.6 },
    { nomePa: "TAPIRAÍ", valorEsperado: 80648.13 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 7596971.3 },
    { nomePa: "SEDE", valorEsperado: 5794396.84 },
    { nomePa: "SUL", valorEsperado: 198810.32 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 152289.8 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 295566.45 },
    { nomePa: "CAÇAPAVA", valorEsperado: 219374.97 },
    { nomePa: "CRUZEIRO", valorEsperado: 116634.98 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 146996.94 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 21596.93 },
    { nomePa: "JACAREÍ", valorEsperado: 158326.02 },
    { nomePa: "SANTA BRANCA", valorEsperado: 2383.67 },
    { nomePa: "TAUBATÉ", valorEsperado: 17021.8 },
    { nomePa: "UBATUBA", valorEsperado: 136945.14 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 21292.69 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 68548.63 },
    { nomePa: "ILHABELA", valorEsperado: 173121.71 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 9018.05 },
    { nomePa: "TAPIRAÍ", valorEsperado: 64646.36 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 8947395.82 },
    { nomePa: "SEDE", valorEsperado: 7072544.64 },
    { nomePa: "SUL", valorEsperado: 234738.3 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 181254.35 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 325395.53 },
    { nomePa: "CAÇAPAVA", valorEsperado: 184692.82 },
    { nomePa: "CRUZEIRO", valorEsperado: 119240.43 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 188890.63 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 18340.65 },
    { nomePa: "JACAREÍ", valorEsperado: 189551.37 },
    { nomePa: "SANTA BRANCA", valorEsperado: 2813.55 },
    { nomePa: "TAUBATÉ", valorEsperado: 32813.03 },
    { nomePa: "UBATUBA", valorEsperado: 125468.77 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 13858.45 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 37394.27 },
    { nomePa: "ILHABELA", valorEsperado: 171539.55 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 11640 },
    { nomePa: "TAPIRAÍ", valorEsperado: 37219.48 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 8775053.44 },
    { nomePa: "SEDE", valorEsperado: 6645182.38 },
    { nomePa: "SUL", valorEsperado: 235526.34 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 167533.95 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 334363.6 },
    { nomePa: "CAÇAPAVA", valorEsperado: 200378.29 },
    { nomePa: "CRUZEIRO", valorEsperado: 124188.32 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 180872.3 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 19769.93 },
    { nomePa: "JACAREÍ", valorEsperado: 283338.65 },
    { nomePa: "SANTA BRANCA", valorEsperado: 3494 },
    { nomePa: "TAUBATÉ", valorEsperado: 42025.82 },
    { nomePa: "UBATUBA", valorEsperado: 157635.39 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 32111.95 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 127137.03 },
    { nomePa: "ILHABELA", valorEsperado: 173350.22 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 9798.46 },
    { nomePa: "TAPIRAÍ", valorEsperado: 38346.81 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 9075990.32 },
    { nomePa: "SEDE", valorEsperado: 6926613.58 },
    { nomePa: "SUL", valorEsperado: 238438.41 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 213932.59 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 397710.18 },
    { nomePa: "CAÇAPAVA", valorEsperado: 233315.29 },
    { nomePa: "CRUZEIRO", valorEsperado: 134544.09 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 219332.56 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 19344.46 },
    { nomePa: "JACAREÍ", valorEsperado: 224964.7 },
    { nomePa: "SANTA BRANCA", valorEsperado: 3502.68 },
    { nomePa: "TAUBATÉ", valorEsperado: 24276.23 },
    { nomePa: "UBATUBA", valorEsperado: 153404.5 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 21014.31 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 27218.94 },
    { nomePa: "ILHABELA", valorEsperado: 176989.19 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 4804.32 },
    { nomePa: "TAPIRAÍ", valorEsperado: 56584.29 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_SEGURO_GERAIS_NOVO: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 44659.15 },
    { nomePa: "SEDE", valorEsperado: 32674.98 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 1053.94 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 5580.5 },
    { nomePa: "SANTA BRANCA", valorEsperado: 2466.83 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 389.4 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 2493.5 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 30801.92 },
    { nomePa: "SEDE", valorEsperado: 15378.13 },
    { nomePa: "SUL", valorEsperado: 3189.85 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 906.17 },
    { nomePa: "CAÇAPAVA", valorEsperado: 2673.24 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 468.21 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 1596.26 },
    { nomePa: "UBATUBA", valorEsperado: 6590.06 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 54751.37 },
    { nomePa: "SEDE", valorEsperado: 47900.08 },
    { nomePa: "SUL", valorEsperado: 3130.48 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 834.44 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 2886.37 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 34076.25 },
    { nomePa: "SEDE", valorEsperado: 27068.65 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 3970.78 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 389.4 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 401.05 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 373.47 },
    { nomePa: "UBATUBA", valorEsperado: 1872.9 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 49994.29 },
    { nomePa: "SEDE", valorEsperado: 42178.78 },
    { nomePa: "SUL", valorEsperado: 253.79 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 1611.27 },
    { nomePa: "CRUZEIRO", valorEsperado: 389.4 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 3226.08 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 797.46 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 1537.51 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_SEGURO_GERAIS_RENOVADO: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 120737.14 },
    { nomePa: "SEDE", valorEsperado: 109383.71 },
    { nomePa: "SUL", valorEsperado: 4298.73 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 478.8 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 1374.9 },
    { nomePa: "CAÇAPAVA", valorEsperado: 5201 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 87999.35 },
    { nomePa: "SEDE", valorEsperado: 81295.99 },
    { nomePa: "SUL", valorEsperado: 3591.76 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 1038.71 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 958.49 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 377.55 },
    { nomePa: "ILHABELA", valorEsperado: 736.85 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 83371.58 },
    { nomePa: "SEDE", valorEsperado: 74027.66 },
    { nomePa: "SUL", valorEsperado: 3519.91 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 1557.12 },
    { nomePa: "CAÇAPAVA", valorEsperado: 1669.71 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 681.13 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 1916.05 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 120600.89 },
    { nomePa: "SEDE", valorEsperado: 108231.18 },
    { nomePa: "SUL", valorEsperado: 5013.35 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 372.91 },
    { nomePa: "CAÇAPAVA", valorEsperado: 5107.01 },
    { nomePa: "CRUZEIRO", valorEsperado: 1487.04 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 389.4 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 113479.3 },
    { nomePa: "SEDE", valorEsperado: 93125.62 },
    { nomePa: "SUL", valorEsperado: 4353.69 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 4020.85 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 5948.46 },
    { nomePa: "CRUZEIRO", valorEsperado: 1611.27 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 4419.41 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_SEGURO_VENDA_NOVA: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1886.39 },
    { nomePa: "SEDE", valorEsperado: 1369.81 },
    { nomePa: "SUL", valorEsperado: 39.17 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 67.48 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 42.6 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 21.16 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 144.36 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 129.92 },
    { nomePa: "ILHABELA", valorEsperado: 71.89 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 3382.26 },
    { nomePa: "SEDE", valorEsperado: 2921.46 },
    { nomePa: "SUL", valorEsperado: 38.66 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 50.8 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 108.91 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 69.27 },
    { nomePa: "UBATUBA", valorEsperado: 77.55 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 115.61 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 6587.38 },
    { nomePa: "SEDE", valorEsperado: 4749.9 },
    { nomePa: "SUL", valorEsperado: 217.16 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 43.41 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 68.4 },
    { nomePa: "CAÇAPAVA", valorEsperado: 155.28 },
    { nomePa: "CRUZEIRO", valorEsperado: 456.81 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 258.82 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 76.95 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 351.81 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 70.76 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 138.08 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 6203.96 },
    { nomePa: "SEDE", valorEsperado: 5445.09 },
    { nomePa: "SUL", valorEsperado: 84.91 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 34.37 },
    { nomePa: "CAÇAPAVA", valorEsperado: 151.83 },
    { nomePa: "CRUZEIRO", valorEsperado: 131.43 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 237.53 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 118.8 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
  ],
};

const METAS_MENSAIS_SEGURO_RURAL: Record<number, MetaMensalEsperada[]> = {
  1: ORDEM_PADRAO_PA.map((nomePa) => ({ nomePa, valorEsperado: 0 })),
  2: ORDEM_PADRAO_PA.map((nomePa) => ({ nomePa, valorEsperado: 0 })),
  3: ORDEM_PADRAO_PA.map((nomePa) => ({ nomePa, valorEsperado: 0 })),
  4: ORDEM_PADRAO_PA.map((nomePa) => ({ nomePa, valorEsperado: 0 })),
  5: ORDEM_PADRAO_PA.map((nomePa) => ({ nomePa, valorEsperado: 0 })),
};

const METAS_MENSAIS_SEGURO_ARRECADACAO: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 128995.63 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 130576.25 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 136773.01 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 148929.1 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 53200.29 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_FATURAMENTO_SIPAG: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1285631.15 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 426512.4 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 37545.48 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 173410.35 },
    { nomePa: "SETOR PJ", valorEsperado: 648162.92 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1426319.98 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 5 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 626267.16 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 60.01 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 236864.88 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 168116.75 },
    { nomePa: "SETOR PJ", valorEsperado: 395006.18 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1293772.32 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 5 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 466565.09 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 77 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 151115.36 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 1470.1 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 205160.64 },
    { nomePa: "SETOR PJ", valorEsperado: 469379.13 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1052160.28 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 411784.17 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 14049.62 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 25357.5 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 195488.52 },
    { nomePa: "SETOR PJ", valorEsperado: 405480.47 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1682184.21 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 630231.2 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 154347.79 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 11619 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 334834.28 },
    { nomePa: "SETOR PJ", valorEsperado: 551151.94 },
  ],
};

const METAS_MENSAIS_LIQUIDACAO_BAIXA: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 4234373.68 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 67 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 155240.88 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 7449.67 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 39116.92 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 43510.41 },
    { nomePa: "UBATUBA", valorEsperado: 8560.94 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 371138.5 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 157520.98 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 3451768.38 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 4110666.77 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 28128.2 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 136999.24 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 152333.94 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 42515.29 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 190212.3 },
    { nomePa: "UBATUBA", valorEsperado: 11159.41 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 375418.03 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 141165.93 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 3032734.43 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 4693905.69 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 28018.65 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 216571.4 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 133614.16 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 161532.84 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 172294.08 },
    { nomePa: "UBATUBA", valorEsperado: 5562.26 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 481173.61 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 2590.77 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 3492547.92 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 4969282.53},
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 27854.93 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 280246.25 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 129251.72 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 161120.42 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 193099.85 },
    { nomePa: "UBATUBA", valorEsperado: 4863 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 374551.2 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 3723.66 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 3794571.5 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 4951652.62 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 27593.33 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 433908.95 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 122046.82 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 164960.33 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 316175.64 },
    { nomePa: "UBATUBA", valorEsperado: 4768 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 436634.96 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 190 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 3445374.59 },
  ],
};

const METAS_MENSAIS_PREVIDENCIA_MI: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1 },
    { nomePa: "SEDE", valorEsperado: 1 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 1 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 0 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 0 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 1 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

const METAS_MENSAIS_PREVIDENCIA_VGBL: Record<number, MetaMensalEsperada[]> = {
  1: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 0 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  2: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1 },
    { nomePa: "SEDE", valorEsperado: 0 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 1 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  3: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 3 },
    { nomePa: "SEDE", valorEsperado: 3 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  4: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 2 },
    { nomePa: "SEDE", valorEsperado: 2 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
  5: [
    { nomePa: "SICOOB CRESSEM", valorEsperado: 1 },
    { nomePa: "SEDE", valorEsperado: 1 },
    { nomePa: "SUL", valorEsperado: 0 },
    { nomePa: "CAMPOS DO JORDÃO", valorEsperado: 0 },
    { nomePa: "AGÊNCIA PARAIBUNA", valorEsperado: 0 },
    { nomePa: "CAÇAPAVA", valorEsperado: 0 },
    { nomePa: "CRUZEIRO", valorEsperado: 0 },
    { nomePa: "AGENCIA JAMBEIRO", valorEsperado: 0 },
    { nomePa: "SANTO ANTÔNIO DO PINHAL", valorEsperado: 0 },
    { nomePa: "JACAREÍ", valorEsperado: 0 },
    { nomePa: "SANTA BRANCA", valorEsperado: 0 },
    { nomePa: "TAUBATÉ", valorEsperado: 0 },
    { nomePa: "UBATUBA", valorEsperado: 0 },
    { nomePa: "CARAGUATATUBA", valorEsperado: 0 },
    { nomePa: "SÃO SEBASTIÃO", valorEsperado: 0 },
    { nomePa: "ILHABELA", valorEsperado: 0 },
    { nomePa: "SALESÓPOLIS", valorEsperado: 0 },
    { nomePa: "TAPIRAÍ", valorEsperado: 0 },
    { nomePa: "SETOR PJ", valorEsperado: 0 },
  ],
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskEntityForEmail(entity: string): string {
  if (!entity.startsWith("CPF:")) return entity;
  const digits = entity.replace(/\D/g, "");
  if (digits.length < 4) return "CPF:***";
  return `CPF:***${digits.slice(-4)}`;
}

function normalizeEntityKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
}

function buildEntityKey(row: GenericRow, idx: number): string {
  const numeroPa = normalizeEntityKey(row.numero_pa);
  if (numeroPa) return `PA:${numeroPa}`;

  const cpf = normalizeEntityKey(row.cpf_funcionario ?? row.nr_cpf_responsavel_cadastro);
  if (cpf) return `CPF:${cpf}`;

  const nome = normalizeEntityKey(row.nm_funcionario);
  if (nome) return `FUNC:${nome}`;

  return `LINHA:${idx + 1}`;
}

function distinctEntityCount(rows: GenericRow[]) {
  const keys = new Set<string>();
  rows.forEach((row, idx) => keys.add(buildEntityKey(row, idx)));
  return keys.size;
}

function toNumberSafe(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    const normalized = trimmed.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function getAlertThresholdPerc() {
  const raw = String(process.env.MONITOR_META_ALERT_LIMITE_PERC || "").trim();
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 15;
}

function isMonitorAlertEnabled() {
  const raw = String(process.env.MONITOR_META_ALERT_ENABLED || "true")
    .trim()
    .toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(raw);
}

function getMonitorAlertRecipients() {
  const configured = String(process.env.MONITOR_META_ALERT_EMAIL_TO || "").trim();
  if (configured) {
    return configured
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return ["marcelo.bueno@sicoob.com.br"];
}

function parseBrDate(value: string): Date | null {
  const raw = String(value || "").trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function normalizeNomeMeta(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeNumeroPaMeta(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));

  return raw.replace(/\D/g, "");
}

function getNumeroPaMeta(nomePa: string): string {
  const nomeNormalizado = normalizeNomeMeta(nomePa);
  const idx = ORDEM_PADRAO_PA.findIndex((pa) => normalizeNomeMeta(pa) === nomeNormalizado);
  return idx === -1 ? "" : NUMERO_PA_PADRAO[idx] || "";
}

function valoresMetaIguais(valorEncontrado: number, valorEsperado: number) {
  return Math.round(valorEncontrado * 100) === Math.round(valorEsperado * 100);
}

function getPeriodoMesCompleto(periodo: string) {
  const [dtInicioRaw, dtFimRaw] = String(periodo || "").split("|");
  const dtInicio = parseBrDate(dtInicioRaw || "");
  const dtFim = parseBrDate(dtFimRaw || "");

  if (!dtInicio || !dtFim) return null;
  if (dtInicio.getFullYear() !== dtFim.getFullYear()) return null;
  if (dtInicio.getMonth() !== dtFim.getMonth()) return null;
  if (dtInicio.getDate() !== 1) return null;

  const ultimoDiaMes = new Date(dtInicio.getFullYear(), dtInicio.getMonth() + 1, 0);
  ultimoDiaMes.setHours(0, 0, 0, 0);

  if (dtFim.getTime() !== ultimoDiaMes.getTime()) return null;

  return {
    ano: dtInicio.getFullYear(),
    mes: dtInicio.getMonth() + 1,
    label: `${String(dtInicio.getMonth() + 1).padStart(2, "0")}/${dtInicio.getFullYear()}`,
  };
}

function getValorProducaoMensal(row: GenericRow) {
  const candidates = [
    "producao_mensal",
    "novos_cooperados",
    "novoscooperados",
    "producao_semanal",
    "feito_no_mes_vigente",
  ];

  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return toNumberSafe(row[key]);
    }
  }

  return NaN;
}

function getMetasMensaisPorTema(tema: string, mes: number) {
  if (tema === "entrada_cooperados") {
    return METAS_MENSAIS_ENTRADA_COOPERADOS[mes] || [];
  }

  if (tema === "conta_corrente_abertas") {
    return METAS_MENSAIS_CONTA_CORRENTE_ABERTAS[mes] || [];
  }

  if (tema === "consorcio") {
    return METAS_MENSAIS_CONSORCIO[mes] || [];
  }

  if (tema === "emprestimo_bancoob") {
    return METAS_MENSAIS_EMPRESTIMO_BANCOOB[mes] || [];
  }

  if (tema === "portabilidade") {
    return METAS_MENSAIS_PORTABILIDADE[mes] || [];
  }

  if (tema === "volume_transacoes") {
    return METAS_MENSAIS_VOLUME_TRANSACOES[mes] || [];
  }

  if (tema === "seguro_gerais_novo") {
    return METAS_MENSAIS_SEGURO_GERAIS_NOVO[mes] || [];
  }

  if (tema === "seguro_gerais_renovado") {
    return METAS_MENSAIS_SEGURO_GERAIS_RENOVADO[mes] || [];
  }

  if (tema === "seguro_venda_nova") {
    return METAS_MENSAIS_SEGURO_VENDA_NOVA[mes] || [];
  }

  if (tema === "seguro_rural") {
    return METAS_MENSAIS_SEGURO_RURAL[mes] || [];
  }

  if (tema === "seguro_arrecadacao") {
    return METAS_MENSAIS_SEGURO_ARRECADACAO[mes] || [];
  }

  if (tema === "faturamento_sipag") {
    return METAS_MENSAIS_FATURAMENTO_SIPAG[mes] || [];
  }

  if (tema === "liquidacao_baixa") {
    return METAS_MENSAIS_LIQUIDACAO_BAIXA[mes] || [];
  }

  if (tema === "saldo_previdencia_mi") {
    return METAS_MENSAIS_PREVIDENCIA_MI[mes] || [];
  }

  if (tema === "saldo_previdencia_vgbl") {
    return METAS_MENSAIS_PREVIDENCIA_VGBL[mes] || [];
  }

  return [];
}

function getMetasMensaisFuncionarioPorTema(tema: string, mes: number) {
  if (tema === "entrada_cooperados") {
    return METAS_MENSAIS_FUNCIONARIO_ENTRADA_COOPERADOS[mes] || [];
  }

  if (tema === "conta_corrente_abertas") {
    return METAS_MENSAIS_FUNCIONARIO_CONTA_CORRENTE_ABERTAS[mes] || [];
  }

  if (tema === "seguro_gerais_novo") {
    return METAS_MENSAIS_FUNCIONARIO_SEGURO_GERAIS_NOVO[mes] || [];
  }

  if (tema === "seguro_venda_nova") {
    return METAS_MENSAIS_FUNCIONARIO_SEGURO_VENDA_NOVA[mes] || [];
  }

  if (tema === "seguro_rural") {
    return METAS_MENSAIS_FUNCIONARIO_SEGURO_RURAL[mes] || [];
  }

  if (tema === "saldo_previdencia_mi") {
    return METAS_MENSAIS_FUNCIONARIO_PREVIDENCIA_MI[mes] || [];
  }

  if (tema === "saldo_previdencia_vgbl") {
    return METAS_MENSAIS_FUNCIONARIO_PREVIDENCIA_VGBL[mes] || [];
  }

  if (tema === "consorcio") {
    return METAS_MENSAIS_FUNCIONARIO_CONSORCIO[mes] || [];
  }

  return [];
}

function getTituloMetaMensal(tema: string) {
  if (tema === "entrada_cooperados") return "Cooperados novos";
  if (tema === "conta_corrente_abertas") return "Conta corrente novas";
  if (tema === "consorcio") return "Consorcio";
  if (tema === "emprestimo_bancoob") return "Emprestimo Bancoob";
  if (tema === "portabilidade") return "PortabSal";
  if (tema === "volume_transacoes") return "Cartoes - VOLUME_TRANSACOES_DIARIO";
  if (tema === "seguro_gerais_novo") return "Seguro Gerais novos";
  if (tema === "seguro_gerais_renovado") return "Seguro Gerais renovacoes";
  if (tema === "seguro_venda_nova") return "Seguro Venda Nova";
  if (tema === "seguro_rural") return "Seguro Rural";
  if (tema === "seguro_arrecadacao") return "Seguro Vida Arrecadacao";
  if (tema === "faturamento_sipag") return "Sipag - FATURAMENTO_SIPAG_DIARIO";
  if (tema === "liquidacao_baixa") return "Cobranca - MOVIMENTO_LIQUIDACOES_BAIXA";
  if (tema === "saldo_previdencia_mi") return "Previdencia MI";
  if (tema === "saldo_previdencia_vgbl") return "Previdencia VGBL";
  return tema;
}

function getTituloMetaMensalFuncionario(tema: string) {
  if (tema === "entrada_cooperados") return "Funcionarios - Cooperados novos";
  if (tema === "conta_corrente_abertas") return "Funcionarios - Conta corrente novas";
  if (tema === "consorcio") return "Funcionarios - Consorcio";
  if (tema === "saldo_previdencia_mi") return "Funcionarios - Previdencia MI";
  if (tema === "saldo_previdencia_vgbl") return "Funcionarios - Previdencia VGBL";
  return `Funcionarios - ${getTituloMetaMensal(tema)}`;
}

function getRegraMetaMensal(tema: string) {
  if (tema === "entrada_cooperados") return "META_MENSAL_ENTRADA_COOPERADOS";
  if (tema === "conta_corrente_abertas") return "META_MENSAL_CONTA_CORRENTE_ABERTAS";
  if (tema === "consorcio") return "META_MENSAL_CONSORCIO";
  if (tema === "emprestimo_bancoob") return "META_MENSAL_EMPRESTIMO_BANCOOB";
  if (tema === "portabilidade") return "META_MENSAL_PORTABILIDADE";
  if (tema === "volume_transacoes") return "META_MENSAL_VOLUME_TRANSACOES_DIARIO";
  if (tema === "seguro_gerais_novo") return "META_MENSAL_SEGURO_GERAIS_NOVO";
  if (tema === "seguro_gerais_renovado") return "META_MENSAL_SEGURO_GERAIS_RENOVADO";
  if (tema === "seguro_venda_nova") return "META_MENSAL_SEGURO_VENDA_NOVA";
  if (tema === "seguro_rural") return "META_MENSAL_SEGURO_RURAL";
  if (tema === "seguro_arrecadacao") return "META_MENSAL_SEGURO_ARRECADACAO";
  if (tema === "faturamento_sipag") return "META_MENSAL_FATURAMENTO_SIPAG_DIARIO";
  if (tema === "liquidacao_baixa") return "META_MENSAL_MOVIMENTO_LIQUIDACOES_BAIXA";
  if (tema === "saldo_previdencia_mi") return "META_MENSAL_PREVIDENCIA_MI";
  if (tema === "saldo_previdencia_vgbl") return "META_MENSAL_PREVIDENCIA_VGBL";
  return `META_MENSAL_${tema.toUpperCase()}`;
}

function getRegraMetaMensalFuncionario(tema: string) {
  if (tema === "entrada_cooperados") return "META_MENSAL_FUNCIONARIO_ENTRADA_COOPERADOS";
  if (tema === "conta_corrente_abertas") return "META_MENSAL_FUNCIONARIO_CONTA_CORRENTE_ABERTAS";
  if (tema === "seguro_gerais_novo") return "META_MENSAL_FUNCIONARIO_SEGURO_GERAIS_NOVO";
  if (tema === "seguro_venda_nova") return "META_MENSAL_FUNCIONARIO_SEGURO_VENDA_NOVA";
  if (tema === "seguro_rural") return "META_MENSAL_FUNCIONARIO_SEGURO_RURAL";
  if (tema === "saldo_previdencia_mi") return "META_MENSAL_FUNCIONARIO_PREVIDENCIA_MI";
  if (tema === "saldo_previdencia_vgbl") return "META_MENSAL_FUNCIONARIO_PREVIDENCIA_VGBL";
  if (tema === "consorcio") return "META_MENSAL_FUNCIONARIO_CONSORCIO";
  return `META_MENSAL_FUNCIONARIO_${tema.toUpperCase()}`;
}

function getOrdemPaMeta(nomePa: string) {
  const nomeNormalizado = normalizeNomeMeta(nomePa);
  const idx = ORDEM_PADRAO_PA.findIndex((pa) => normalizeNomeMeta(pa) === nomeNormalizado);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function isTemaMetaFinanceira(tema: string) {
  return [
    "volume_transacoes",
    "consorcio",
    "emprestimo_bancoob",
    "seguro_gerais_novo",
    "seguro_gerais_renovado",
    "seguro_venda_nova",
    "seguro_rural",
    "seguro_arrecadacao",
    "faturamento_sipag",
    "liquidacao_baixa",
  ].includes(tema);
}

function formatarValorMetaMensal(tema: string, valor: number) {
  if (isTemaMetaFinanceira(tema)) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

function montarHtmlAlertaDadosAusentes(
  tela: string,
  tema: string,
  periodoLabel: string,
  totalEsperado: number
) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h3 style="margin:0 0 10px;">Alerta de Dados Ausentes ou Zerados</h3>
      <p style="margin:0 0 6px;"><strong>Tela:</strong> ${escapeHtml(tela)}</p>
      <p style="margin:0 0 6px;"><strong>Tema:</strong> ${escapeHtml(tema)}</p>
      <p style="margin:0 0 14px;"><strong>Periodo:</strong> ${escapeHtml(periodoLabel)}</p>
      <p style="margin:0 0 14px;">
        A producao mensal do periodo veio zerada para todos os PAs com meta cadastrada.
        Isso normalmente indica ausencia de carga, dados apagados ou base ainda nao reprocessada.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Situacao</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Esperado total</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Encontrado total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px;border:1px solid #ddd;">Base do periodo sem producao encontrada</td>
            <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, totalEsperado))}</td>
            <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function montarHtmlAlertaMetaMensal(
  tela: string,
  tema: string,
  periodoLabel: string,
  divergencias: MetaMensalDivergente[]
) {
  const linhas = [...divergencias]
    .sort((a, b) => {
      const byOrdem = getOrdemPaMeta(a.nomePa) - getOrdemPaMeta(b.nomePa);
      if (byOrdem !== 0) return byOrdem;
      return a.nomePa.localeCompare(b.nomePa);
    })
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.nomePa)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.valorEsperado))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.valorAtual))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.diferenca))}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h3 style="margin:0 0 10px;">Alerta de Meta Mensal por PA</h3>
      <p style="margin:0 0 6px;"><strong>Tela:</strong> ${escapeHtml(tela)}</p>
      <p style="margin:0 0 6px;"><strong>Tema:</strong> ${escapeHtml(tema)}</p>
      <p style="margin:0 0 14px;"><strong>Periodo:</strong> ${escapeHtml(periodoLabel)}</p>
      <p style="margin:0 0 14px;">A producao mensal fechada ficou diferente da meta esperada configurada.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">PA</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Esperado</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Encontrado</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Diferenca</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
      <p style="margin-top:12px;color:#666;">Total de divergencias nesta execucao: ${divergencias.length}</p>
    </div>
  `;
}

function montarHtmlAlertaMetaMensalFuncionario(
  tela: string,
  tema: string,
  periodoLabel: string,
  divergencias: MetaMensalFuncionarioDivergente[]
) {
  const linhas = [...divergencias]
    .sort((a, b) => a.nomeFuncionario.localeCompare(b.nomeFuncionario))
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.nomeFuncionario)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.valorEsperado))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.valorAtual))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(formatarValorMetaMensal(tema, item.diferenca))}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h3 style="margin:0 0 10px;">Alerta de Meta Mensal por Funcionario</h3>
      <p style="margin:0 0 6px;"><strong>Tela:</strong> ${escapeHtml(tela)}</p>
      <p style="margin:0 0 6px;"><strong>Tema:</strong> ${escapeHtml(tema)}</p>
      <p style="margin:0 0 14px;"><strong>Periodo:</strong> ${escapeHtml(periodoLabel)}</p>
      <p style="margin:0 0 14px;">A producao mensal fechada por funcionario ficou diferente da meta esperada configurada.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Funcionario</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Esperado</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Encontrado</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Diferenca</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
      <p style="margin-top:12px;color:#666;">Total de divergencias nesta execucao: ${divergencias.length}</p>
    </div>
  `;
}

function getInicioSemanaAtual() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay(); // 0 domingo ... 6 sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diffToMonday);
  return now;
}

function addDias(date: Date, dias: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + dias);
  next.setHours(0, 0, 0, 0);
  return next;
}

function deveMonitorarPeriodo(dtFimPeriodo: string) {
  const dtFim = parseBrDate(dtFimPeriodo);
  if (!dtFim) return false;
  const inicioSemanaAtual = getInicioSemanaAtual();
  const inicioSemanaAnterior = addDias(inicioSemanaAtual, -7);
  // Monitora somente períodos finalizados antes da semana anterior.
  // A semana atual e a anterior podem estar com dados atrasados.
  return dtFim < inicioSemanaAnterior;
}

function calcularVariacaoPercentual(atual: number, anterior: number) {
  if (anterior === 0) {
    if (atual === 0) return 0;
    return 100;
  }
  return Math.abs(((atual - anterior) / Math.abs(anterior)) * 100);
}

function houveAlteracaoReal(atual: number, anterior: number) {
  return Math.abs(atual - anterior) > 1e-9;
}

function calcularGravidade(variacaoPerc: number): VariacaoDetectada["gravidade"] {
  if (variacaoPerc >= 50) return "CRITICA";
  if (variacaoPerc >= 30) return "ALTA";
  if (variacaoPerc >= 15) return "MEDIA";
  return "BAIXA";
}

function compareEntidade(a: string, b: string) {
  const paA = /^PA:(\d+)$/.exec(a);
  const paB = /^PA:(\d+)$/.exec(b);

  if (paA && paB) {
    return Number(paA[1]) - Number(paB[1]);
  }

  if (paA) return -1;
  if (paB) return 1;

  return a.localeCompare(b);
}

function getOrdemAlfabeticaFuncionario(row: GenericRow): string | null {
  const nome = normalizeEntityKey(row.nm_funcionario);
  if (nome) return nome;
  return null;
}

function getMetricKey(row: GenericRow): string | null {
  const candidates = [
    "producao_semanal",
    "feito_no_mes_vigente",
    "producao_mensal",
    "producao_vigente",
  ];

  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return key;
    }
  }
  return null;
}

async function buscarValoresAnteriores(
  tela: string,
  tema: string,
  periodo: string,
  entidades: string[],
  metrica: string
) {
  if (!entidades.length) return new Map<string, number>();
  if (!/^[A-Za-z0-9_]+$/.test(metrica)) return new Map<string, number>();

  const bindNames = entidades.map((_, idx) => `:ent_${idx}`);
  const binds: Record<string, string> = {
    nm_tela: tela,
    nm_tema: tema,
    dt_periodo: periodo,
  };
  entidades.forEach((value, idx) => {
    binds[`ent_${idx}`] = value;
  });

  const jsonPath = `$.${metrica}`;

  const sql = `
    SELECT
      X.CV_ENTIDADE,
      JSON_VALUE(
        X.NM_JSON,
        '${jsonPath}'
        RETURNING NUMBER
        NULL ON EMPTY
        NULL ON ERROR
      ) AS VALOR_ANTERIOR
    FROM (
      SELECT
        R.CV_ENTIDADE,
        R.NM_JSON,
        ROW_NUMBER() OVER (
          PARTITION BY R.CV_ENTIDADE
          ORDER BY R.DT_EXECUCAO DESC, R.ID_MONITOR_META_RESULTADO DESC
        ) AS RN
      FROM DBACRESSEM.MONITOR_META_RESULTADO R
      WHERE R.NM_TELA = :nm_tela
        AND R.NM_TEMA = :nm_tema
        AND R.DT_PERIODO = :dt_periodo
        AND R.CV_ENTIDADE IN (${bindNames.join(", ")})
    ) X
    WHERE X.RN = 1
  `;

  const result = await oracleExecute(sql, binds, {});
  const output = new Map<string, number>();

  for (const row of (result.rows || []) as Array<any>) {
    const entidade = normalizeEntityKey(row.CV_ENTIDADE);
    const valor = toNumberSafe(row.VALOR_ANTERIOR);
    if (entidade && !Number.isNaN(valor)) {
      output.set(entidade, valor);
    }
  }

  return output;
}

function montarHtmlAlerta(
  tela: string,
  tema: string,
  periodo: string,
  variacoes: VariacaoDetectada[]
) {
  const variacoesOrdenadas = [...variacoes].sort((a, b) => {
    if (a.ordemAlfabetica && b.ordemAlfabetica) {
      const byNome = a.ordemAlfabetica.localeCompare(b.ordemAlfabetica);
      if (byNome !== 0) return byNome;
    }

    const byEntidade = compareEntidade(a.entidade, b.entidade);
    if (byEntidade !== 0) return byEntidade;
    return a.metrica.localeCompare(b.metrica);
  });

  const linhas = variacoesOrdenadas
    .slice(0, 40)
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(maskEntityForEmail(item.entidade))}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.metrica)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.valorAnterior)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.valorAtual)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.variacaoPerc.toFixed(2))}%</td>
          <td style="padding:6px;border:1px solid #ddd;">${escapeHtml(item.gravidade)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">
      <h3 style="margin:0 0 10px;">Alerta de Monitoramento de Metas</h3>
      <p style="margin:0 0 6px;"><strong>Tela:</strong> ${escapeHtml(tela)}</p>
      <p style="margin:0 0 6px;"><strong>Tema:</strong> ${escapeHtml(tema)}</p>
      <p style="margin:0 0 14px;"><strong>Período:</strong> ${escapeHtml(periodo)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Entidade</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Métrica</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Anterior</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Atual</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Variação</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Gravidade</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
      <p style="margin-top:12px;color:#666;">Total de alertas nesta execução: ${variacoes.length}</p>
    </div>
  `;
}

async function processarAlertasVariacao(
  tela: string,
  tema: string,
  periodo: string,
  rows: GenericRow[],
  dtFimPeriodo: string
) {
  if (!isMonitorAlertEnabled()) return;
  if (!deveMonitorarPeriodo(dtFimPeriodo)) return;

  const limite = getAlertThresholdPerc();
  const maxRows = 500;
  const rowsToCheck = rows.slice(0, maxRows);

  const candidatosPorMetrica = new Map<
    string,
    Array<{ entidade: string; valorAtual: number; ordemAlfabetica?: string }>
  >();

  rowsToCheck.forEach((row, idx) => {
    const entidade = buildEntityKey(row, idx);
    const metrica = getMetricKey(row);
    if (!metrica) return;

    const valorAtual = toNumberSafe(row[metrica]);
    if (Number.isNaN(valorAtual)) return;
    const ordemAlfabetica = getOrdemAlfabeticaFuncionario(row) || undefined;

    const lista = candidatosPorMetrica.get(metrica) || [];
    lista.push({ entidade, valorAtual, ordemAlfabetica });
    candidatosPorMetrica.set(metrica, lista);
  });

  const variacoesInseridas: VariacaoDetectada[] = [];

  for (const [metrica, candidatos] of candidatosPorMetrica.entries()) {
    const anteriores = await buscarValoresAnteriores(
      tela,
      tema,
      periodo,
      candidatos.map((item) => item.entidade),
      metrica
    );

    for (const candidato of candidatos) {
      const valorAnterior = anteriores.get(candidato.entidade);
      if (valorAnterior === undefined) continue;

      if (!houveAlteracaoReal(candidato.valorAtual, valorAnterior)) continue;

      const variacaoPerc = calcularVariacaoPercentual(candidato.valorAtual, valorAnterior);
      if (variacaoPerc <= limite) continue;

      const gravidade = calcularGravidade(variacaoPerc);
      const observacao =
        `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
        `Metrica=${metrica};Variacao=${variacaoPerc.toFixed(2)}%`;

      const insertResult = await oracleExecuteCommit(
        SQL_INSERT_ALERTA,
        {
          nm_gravidade: gravidade,
          nm_regra: `VARIACAO_${metrica.toUpperCase()}`,
          nm_entidade: candidato.entidade,
          vl_encontrado: String(candidato.valorAtual),
          vl_esperado: String(valorAnterior),
          nm_observacao: observacao,
        },
        {}
      );

      if ((insertResult.rowsAffected || 0) > 0) {
        variacoesInseridas.push({
          entidade: candidato.entidade,
          metrica,
          valorAtual: candidato.valorAtual,
          valorAnterior,
          variacaoPerc,
          gravidade,
          ordemAlfabetica: candidato.ordemAlfabetica,
        });
      }
    }
  }

  if (!variacoesInseridas.length) return;

  const recipients = getMonitorAlertRecipients();
  if (!recipients.length) return;

  const subject = `[ALERTA MONITOR META] ${tema} - ${tela} - ${variacoesInseridas.length} ocorrência(s)`;
  const html = montarHtmlAlerta(tela, tema, periodo, variacoesInseridas);

  await sendEmail(recipients, subject, html);
}

async function processarAlertasMetaMensalFuncionario(
  tela: string,
  tema: string,
  periodo: string,
  rows: GenericRow[],
  dtFimPeriodo: string
) {
  if (!isMonitorAlertEnabled()) return 0;
  if (!deveMonitorarPeriodo(dtFimPeriodo)) return 0;

  const periodoMes = getPeriodoMesCompleto(periodo);
  if (!periodoMes) return 0;

  const metasEsperadas = getMetasMensaisFuncionarioPorTema(tema, periodoMes.mes);
  if (!metasEsperadas.length) return 0;

  const rowsPorFuncionario = new Map<string, GenericRow>();
  rows.forEach((row) => {
    const nomeFuncionario = normalizeNomeMeta(
      row.nm_funcionario ?? row.nm_funcionario_nome ?? row.nome_funcionario
    );
    if (nomeFuncionario) rowsPorFuncionario.set(nomeFuncionario, row);
  });

  const getRowMetaFuncionario = (meta: MetaMensalFuncionarioEsperada) =>
    rowsPorFuncionario.get(normalizeNomeMeta(meta.nomeFuncionario));

  const metasComValorEsperado = metasEsperadas.filter((meta) => meta.valorEsperado !== 0);
  const totalEsperadoComMeta = metasComValorEsperado.reduce(
    (total, meta) => total + meta.valorEsperado,
    0
  );
  const totalEncontradoComMeta = metasComValorEsperado.reduce((total, meta) => {
    const row = getRowMetaFuncionario(meta);
    const valorAtual = row ? getValorProducaoMensal(row) : NaN;
    return total + (Number.isNaN(valorAtual) ? 0 : valorAtual);
  }, 0);

  if (metasComValorEsperado.length > 0 && totalEsperadoComMeta > 0 && totalEncontradoComMeta === 0) {
    const observacao =
      `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
      `Mes=${periodoMes.label};Metrica=${tema}_mensal_funcionario;Tipo=DADOS_AUSENTES`;

    const insertResult = await oracleExecuteCommit(
      SQL_INSERT_ALERTA,
      {
        nm_gravidade: "CRITICA",
        nm_regra: `${getRegraMetaMensalFuncionario(tema)}_DADOS_AUSENTES`,
        nm_entidade: `BASE:${getTituloMetaMensalFuncionario(tema)}`,
        vl_encontrado: "0",
        vl_esperado: String(totalEsperadoComMeta),
        nm_observacao: observacao,
      },
      {}
    );

    if ((insertResult.rowsAffected || 0) > 0) {
      const recipients = getMonitorAlertRecipients();
      if (recipients.length) {
        const subject =
          `[ALERTA DADOS AUSENTES] ${getTituloMetaMensalFuncionario(tema)} - ${periodoMes.label}`;
        const html = montarHtmlAlertaDadosAusentes(
          tela,
          tema,
          periodoMes.label,
          totalEsperadoComMeta
        );
        await sendEmail(recipients, subject, html);
      }
    }

    return 1;
  }

  const divergenciasInseridas: MetaMensalFuncionarioDivergente[] = [];
  let totalDivergenciasDetectadas = 0;

  for (const meta of metasEsperadas) {
    const row = getRowMetaFuncionario(meta);
    const valorAtual = row ? getValorProducaoMensal(row) : NaN;
    const valorEncontrado = Number.isNaN(valorAtual) ? 0 : valorAtual;

    if (valoresMetaIguais(valorEncontrado, meta.valorEsperado)) continue;

    totalDivergenciasDetectadas += 1;
    const diferenca = valorEncontrado - meta.valorEsperado;
    const observacao =
      `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
      `Mes=${periodoMes.label};Metrica=${tema}_mensal_funcionario`;

    const insertResult = await oracleExecuteCommit(
      SQL_INSERT_ALERTA,
      {
        nm_gravidade: "ALTA",
        nm_regra: getRegraMetaMensalFuncionario(tema),
        nm_entidade: `FUNC:${meta.nomeFuncionario}`,
        vl_encontrado: String(valorEncontrado),
        vl_esperado: String(meta.valorEsperado),
        nm_observacao: observacao,
      },
      {}
    );

    if ((insertResult.rowsAffected || 0) > 0) {
      divergenciasInseridas.push({
        entidade: `FUNC:${meta.nomeFuncionario}`,
        nomeFuncionario: meta.nomeFuncionario,
        valorAtual: valorEncontrado,
        valorEsperado: meta.valorEsperado,
        diferenca,
      });
    }
  }

  if (!divergenciasInseridas.length) return totalDivergenciasDetectadas;

  const recipients = getMonitorAlertRecipients();
  if (!recipients.length) return totalDivergenciasDetectadas;

  const subject =
    `[ALERTA META MENSAL] ${getTituloMetaMensalFuncionario(tema)} - ${periodoMes.label} - ` +
    `${divergenciasInseridas.length} divergencia(s)`;
  const html = montarHtmlAlertaMetaMensalFuncionario(
    tela,
    tema,
    periodoMes.label,
    divergenciasInseridas
  );

  await sendEmail(recipients, subject, html);

  return totalDivergenciasDetectadas;
}

async function processarAlertasMetaMensal(
  tela: string,
  tema: string,
  periodo: string,
  rows: GenericRow[],
  dtFimPeriodo: string
) {
  if (!isMonitorAlertEnabled()) return 0;
  if (!deveMonitorarPeriodo(dtFimPeriodo)) return 0;

  const periodoMes = getPeriodoMesCompleto(periodo);
  if (!periodoMes) return 0;

  if (tela === "producao_meta_funcionario") {
    return processarAlertasMetaMensalFuncionario(tela, tema, periodo, rows, dtFimPeriodo);
  }

  const metasEsperadas = getMetasMensaisPorTema(tema, periodoMes.mes);
  if (!metasEsperadas.length) return 0;

  const rowsPorNomePa = new Map<string, GenericRow>();
  const rowsPorNumeroPa = new Map<string, GenericRow>();

  rows.forEach((row) => {
    const nomePa = normalizeNomeMeta(row.nome_pa ?? row.nome_fantasia ?? row.nm_fantasia);
    if (nomePa) rowsPorNomePa.set(nomePa, row);

    const numeroPa = normalizeNumeroPaMeta(row.numero_pa ?? row.nr_pa);
    if (numeroPa) rowsPorNumeroPa.set(numeroPa, row);
  });

  const getRowMetaMensal = (meta: MetaMensalEsperada) => {
    const numeroPa = getNumeroPaMeta(meta.nomePa);
    if (numeroPa && rowsPorNumeroPa.has(numeroPa)) {
      return rowsPorNumeroPa.get(numeroPa);
    }

    return rowsPorNomePa.get(normalizeNomeMeta(meta.nomePa));
  };

  const metasComValorEsperado = metasEsperadas.filter((meta) => meta.valorEsperado !== 0);
  const totalEsperadoComMeta = metasComValorEsperado.reduce(
    (total, meta) => total + meta.valorEsperado,
    0
  );
  const totalEncontradoComMeta = metasComValorEsperado.reduce((total, meta) => {
    const row = getRowMetaMensal(meta);
    const valorAtual = row ? getValorProducaoMensal(row) : NaN;
    return total + (Number.isNaN(valorAtual) ? 0 : valorAtual);
  }, 0);

  if (metasComValorEsperado.length > 0 && totalEsperadoComMeta > 0 && totalEncontradoComMeta === 0) {
    const observacao =
      `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
      `Mes=${periodoMes.label};Metrica=${tema}_mensal;Tipo=DADOS_AUSENTES`;

    const insertResult = await oracleExecuteCommit(
      SQL_INSERT_ALERTA,
      {
        nm_gravidade: "CRITICA",
        nm_regra: `${getRegraMetaMensal(tema)}_DADOS_AUSENTES`,
        nm_entidade: `BASE:${getTituloMetaMensal(tema)}`,
        vl_encontrado: "0",
        vl_esperado: String(totalEsperadoComMeta),
        nm_observacao: observacao,
      },
      {}
    );

    if ((insertResult.rowsAffected || 0) > 0) {
      const recipients = getMonitorAlertRecipients();
      if (recipients.length) {
        const subject =
          `[ALERTA DADOS AUSENTES] ${getTituloMetaMensal(tema)} - ${periodoMes.label}`;
        const html = montarHtmlAlertaDadosAusentes(
          tela,
          tema,
          periodoMes.label,
          totalEsperadoComMeta
        );
        await sendEmail(recipients, subject, html);
      }
    }

    return 1;
  }

  const divergenciasInseridas: MetaMensalDivergente[] = [];
  let totalDivergenciasDetectadas = 0;

  for (const meta of metasEsperadas) {
    const row = getRowMetaMensal(meta);
    const valorAtual = row ? getValorProducaoMensal(row) : NaN;
    const valorEncontrado = Number.isNaN(valorAtual) ? 0 : valorAtual;

    if (valoresMetaIguais(valorEncontrado, meta.valorEsperado)) continue;

    totalDivergenciasDetectadas += 1;
    const diferenca = valorEncontrado - meta.valorEsperado;
    const observacao =
      `Tela=${tela};Tema=${tema};Periodo=${periodo};` +
      `Mes=${periodoMes.label};Metrica=${tema}_mensal`;

    const insertResult = await oracleExecuteCommit(
      SQL_INSERT_ALERTA,
      {
        nm_gravidade: "ALTA",
        nm_regra: getRegraMetaMensal(tema),
        nm_entidade: `PA:${meta.nomePa}`,
        vl_encontrado: String(valorEncontrado),
        vl_esperado: String(meta.valorEsperado),
        nm_observacao: observacao,
      },
      {}
    );

    if ((insertResult.rowsAffected || 0) > 0) {
      divergenciasInseridas.push({
        entidade: `PA:${meta.nomePa}`,
        nomePa: meta.nomePa,
        valorAtual: valorEncontrado,
        valorEsperado: meta.valorEsperado,
        diferenca,
      });
    }
  }

  if (!divergenciasInseridas.length) return totalDivergenciasDetectadas;

  const recipients = getMonitorAlertRecipients();
  if (!recipients.length) return totalDivergenciasDetectadas;

  const subject =
    `[ALERTA META MENSAL] ${getTituloMetaMensal(tema)} - ${periodoMes.label} - ` +
    `${divergenciasInseridas.length} divergencia(s)`;
  const html = montarHtmlAlertaMetaMensal(
    tela,
    tema,
    periodoMes.label,
    divergenciasInseridas
  );

  await sendEmail(recipients, subject, html);
  return totalDivergenciasDetectadas;
}

export async function registrarMonitorMeta(params: RegistrarMonitorParams) {
  const rows = params.rows ?? [];
  const qtdLinhas = rows.length;
  const qtdDistintas = distinctEntityCount(rows);
  const gravarCarga = params.gravarCarga ?? true;
  const gravarResultado = params.gravarResultado ?? true;

  if (gravarCarga) {
    await oracleExecuteCommit(
      SQL_INSERT_CARGA,
      {
        nm_tema: params.tema,
        nm_fonte: params.fonte,
        qtd_linhas: qtdLinhas,
        qtd_distintas: qtdDistintas,
        dt_max: params.dtFimPeriodo,
        nm_status: "OK",
        nm_detalhes: `Registros monitorados: ${qtdLinhas}`,
      },
      {}
    );
  }

  if (!qtdLinhas) return;

  let totalDivergenciasMetaMensal = 0;

  try {
    totalDivergenciasMetaMensal = await processarAlertasMetaMensal(
      params.tela,
      params.tema,
      params.periodo,
      rows,
      params.dtFimPeriodo
    );
  } catch (alertErr) {
    console.error("[MONITOR_META] Falha ao processar alertas de meta mensal:", alertErr);
  }

  if (totalDivergenciasMetaMensal === 0) {
    try {
      await processarAlertasVariacao(
        params.tela,
        params.tema,
        params.periodo,
        rows,
        params.dtFimPeriodo
      );
    } catch (alertErr) {
      console.error("[MONITOR_META] Falha ao processar alertas de variação:", alertErr);
    }
  }

  if (!gravarResultado) return;

  const binds = rows.map((row, idx) => ({
    nm_tela: params.tela,
    nm_tema: params.tema,
    dt_periodo: params.periodo,
    cv_entidade: buildEntityKey(row, idx),
    nm_json: JSON.stringify(row),
    nm_status: "OK",
    nm_detalhes: null,
  }));

  await oracleExecuteManyCommit(SQL_INSERT_RESULTADO, binds, {});
}
