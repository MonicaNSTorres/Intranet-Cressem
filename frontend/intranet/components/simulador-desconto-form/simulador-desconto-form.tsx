"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  formatCpfView,
  fmtBRL,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
  hojeBR,
} from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import {
  buscarAssociadoAnaliticoSimulador,
  buscarTaxaParcelaPorNumero,
  buscarUsuarioLogado,
  listarAnosAssociado,
  listarAnosCorrentista,
  listarClassificacaoRisco,
  listarCidades,
  listarCorrentista,
  listarOutrosProdutos,
  listarPortabilidadeSalario,
  listarTaxaParcela,
  listarTempoRegime,
  salvarSimulacaoDesconto,
  type AnosAssociadoOption,
  type AnosCorrentistaOption,
  type ClassificacaoRiscoOption,
  type CidadeOption,
  type CorrentistaOption,
  type OutrosProdutosOption,
  type PortabilidadeSalarioOption,
  type TaxaParcelaOption,
  type TempoRegimeOption,
} from "@/services/simulador_desconto.service";
import { gerarPdfSimuladorDesconto } from "@/lib/pdf/gerarPdfSimuladorDesconto";

type TipoEmprestimo = "" | "trabalhador" | "consignado" | "pessoal";

type DynamicCheckboxItem = {
  id: string;
  label: string;
  value: number;
};

function sumChecked(items: DynamicCheckboxItem[], checkedMap: Record<string, boolean>) {
  return items.reduce((acc, item) => acc + (checkedMap[item.id] ? item.value : 0), 0);
}

function normalizeLabel(text: string) {
  return String(text || "").trim();
}

function capitalizeText(text: string) {
  if (!text) return "";
  const minusculas = [
    "e",
    "ou",
    "de",
    "do",
    "da",
    "dos",
    "das",
    "a",
    "o",
    "as",
    "os",
    "com",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "há",
  ];
  const siglas = ["R$", "RDC", "CPF", "CNPJ", "IAP", "SICOOB"];

  return text
    .toLowerCase()
    .split(" ")
    .map((palavra, index) => {
      const upper = palavra.toUpperCase();
      if (siglas.includes(upper)) return upper;
      if (index !== 0 && minusculas.includes(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

function mapAnosAssociadoToDesconto(
  anos: number,
  tabela: AnosAssociadoOption[]
) {
  if (!tabela.length) return 0;

  const itemExato = tabela.find((item) => Number(item.ID_ANOS_ASSOCIADO) === anos);
  if (itemExato) return Number(itemExato.VL_ANOS_ASSOCIADO || 0);

  const ordenado = [...tabela].sort(
    (a, b) => Number(a.ID_ANOS_ASSOCIADO) - Number(b.ID_ANOS_ASSOCIADO)
  );

  const ultimoValido = ordenado
    .filter((item) => Number(item.ID_ANOS_ASSOCIADO) <= anos)
    .at(-1);

  return Number(ultimoValido?.VL_ANOS_ASSOCIADO || 0);
}

function mapAnosCorrentistaToDesconto(
  anos: number,
  tabela: AnosCorrentistaOption[]
) {
  if (!tabela.length) return 0;

  const itemExato = tabela.find(
    (item) => Number(item.ID_ANOS_CORRENTISTA) === anos
  );
  if (itemExato) return Number(itemExato.VL_CORRENTISTA || 0);

  const ordenado = [...tabela].sort(
    (a, b) => Number(a.ID_ANOS_CORRENTISTA) - Number(b.ID_ANOS_CORRENTISTA)
  );

  const ultimoValido = ordenado
    .filter((item) => Number(item.ID_ANOS_CORRENTISTA) <= anos)
    .at(-1);

  return Number(ultimoValido?.VL_CORRENTISTA || 0);
}

function mapPortabilidadeToInfo(
  meses: number,
  tabela: PortabilidadeSalarioOption[]
) {
  if (!tabela.length || !meses || meses <= 0) {
    return {
      label: "Sem Portabilidade Salário",
      desconto: 0,
    };
  }

  const ordenada = [...tabela].sort(
    (a, b) =>
      Number(a.ID_PORTABILIDADE_SALARIO) - Number(b.ID_PORTABILIDADE_SALARIO)
  );

  if (meses <= 6) {
    const item = ordenada[0];
    return {
      label: item?.DESC_PORTABILIDADE_SALARIO || "Portabilidade Salário",
      desconto: Number(item?.VL_PORTABILIDADE_SALARIO || 0),
    };
  }

  const item = ordenada.at(-1);
  return {
    label:
      item?.DESC_PORTABILIDADE_SALARIO ||
      "Portabilidade Salário há mais de 6 meses",
    desconto: Number(item?.VL_PORTABILIDADE_SALARIO || 0),
  };
}

function toShortRiskCode(item?: ClassificacaoRiscoOption | null) {
  if (!item) return "";
  return String(item.VL_CLASSIFICACAO_RISCO ?? "").slice(0, 2);
}

export function SimuladorDescontoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");

  const [anosAssociado, setAnosAssociado] = useState(0);
  const [anosCorrentista, setAnosCorrentista] = useState(0);
  const [mesesPortabilidade, setMesesPortabilidade] = useState(0);

  const [tipoEmprestimo, setTipoEmprestimo] = useState<TipoEmprestimo>("");
  const [valorEmprestimo, setValorEmprestimo] = useState("");
  const [valorDivida, setValorDivida] = useState("");
  const [valorCapital, setValorCapital] = useState("");
  const [classificacaoRisco, setClassificacaoRisco] = useState("");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [taxaBrutaInput, setTaxaBrutaInput] = useState("");

  const [checkCorrentista, setCheckCorrentista] = useState<Record<string, boolean>>({});
  const [checkTempo, setCheckTempo] = useState<Record<string, boolean>>({});
  const [checkProdutos, setCheckProdutos] = useState<Record<string, boolean>>({});

  const [seguro, setSeguro] = useState(false);
  const [avalista, setAvalista] = useState(false);
  const [outrosGarantias, setOutrosGarantias] = useState(false);
  const [outrasGarantiasTexto, setOutrasGarantiasTexto] = useState("");

  const [cidadeAtendimento, setCidadeAtendimento] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState(hojeBR());
  const [atendente, setAtendente] = useState("");

  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");
  const [processado, setProcessado] = useState(false);
  const [loadingComplementar, setLoadingComplementar] = useState(false);
  const [loadingTabelas, setLoadingTabelas] = useState(false);

  const [anosAssociadoOptions, setAnosAssociadoOptions] = useState<AnosAssociadoOption[]>([]);
  const [anosCorrentistaOptions, setAnosCorrentistaOptions] = useState<AnosCorrentistaOption[]>([]);
  const [cidadesOptions, setCidadesOptions] = useState<CidadeOption[]>([]);
  const [riscoOptions, setRiscoOptions] = useState<ClassificacaoRiscoOption[]>([]);
  const [correntistaOptions, setCorrentistaOptions] = useState<CorrentistaOption[]>([]);
  const [outrosProdutosOptions, setOutrosProdutosOptions] = useState<OutrosProdutosOption[]>([]);
  const [portabilidadeOptions, setPortabilidadeOptions] = useState<PortabilidadeSalarioOption[]>([]);
  const [taxaParcelaOptions, setTaxaParcelaOptions] = useState<TaxaParcelaOption[]>([]);
  const [tempoRegimeOptions, setTempoRegimeOptions] = useState<TempoRegimeOption[]>([]);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  useEffect(() => {
    async function carregarTabelas() {
      try {
        setLoadingTabelas(true);

        const [
          anosAssoc,
          anosCorr,
          cidades,
          riscos,
          correntistas,
          produtos,
          portabilidades,
          taxasParcela,
          tempos,
        ] = await Promise.all([
          listarAnosAssociado(),
          listarAnosCorrentista(),
          listarCidades(),
          listarClassificacaoRisco(),
          listarCorrentista(),
          listarOutrosProdutos(),
          listarPortabilidadeSalario(),
          listarTaxaParcela(),
          listarTempoRegime(),
        ]);

        setAnosAssociadoOptions(anosAssoc || []);
        setAnosCorrentistaOptions(anosCorr || []);
        setCidadesOptions(cidades || []);
        setRiscoOptions(riscos || []);
        setCorrentistaOptions(correntistas || []);
        setOutrosProdutosOptions(produtos || []);
        setPortabilidadeOptions(portabilidades || []);
        setTaxaParcelaOptions(taxasParcela || []);
        setTempoRegimeOptions(tempos || []);
      } catch (e: any) {
        setErroLocal(e?.message || "Erro ao carregar dados auxiliares do simulador.");
      } finally {
        setLoadingTabelas(false);
      }
    }

    carregarTabelas();
  }, []);

  useEffect(() => {
    async function carregarUsuarioLogado() {
      try {
        const usuario = await buscarUsuarioLogado();

        if (usuario?.nome_completo) {
          setAtendente(usuario.nome_completo);
        } else if (usuario?.username) {
          setAtendente(usuario.username);
        }
      } catch (e) {
        console.error("Erro ao carregar usuário logado:", e);
      }
    }

    carregarUsuarioLogado();
  }, []);

  function resetResultados() {
    setProcessado(false);
    setInfoLocal("");
  }

  const correntistaItems = useMemo<DynamicCheckboxItem[]>(
    () =>
      correntistaOptions.map((item) => ({
        id: `correntista_${item.ID_CORRENTISTA}`,
        label: item.DESC_TEXTO,
        value: Number(item.VL_CORRENTISTA || 0),
      })),
    [correntistaOptions]
  );

  const tempoRegimeItems = useMemo<DynamicCheckboxItem[]>(
    () =>
      tempoRegimeOptions.map((item) => ({
        id: `tempo_${item.ID_TEMPO_REGIME}`,
        label: item.DESC_TEMPO_REGIME,
        value: Number(item.VL_TEMPO_REGIME || 0),
      })),
    [tempoRegimeOptions]
  );

  const outrosProdutosItems = useMemo<DynamicCheckboxItem[]>(
    () =>
      outrosProdutosOptions.map((item) => ({
        id: `produto_${item.ID_OUTROS_PRODUTOS}`,
        label: item.NM_PRODUTO,
        value: Number(item.VL_PRODUTO || 0),
      })),
    [outrosProdutosOptions]
  );

  const valorEmprestimoNum = useMemo(
    () => parseBRL(valorEmprestimo),
    [valorEmprestimo]
  );
  const valorDividaNum = useMemo(() => parseBRL(valorDivida), [valorDivida]);
  const valorCapitalNum = useMemo(() => parseBRL(valorCapital), [valorCapital]);

  const valorAnosAssociado = useMemo(
    () => mapAnosAssociadoToDesconto(anosAssociado, anosAssociadoOptions),
    [anosAssociado, anosAssociadoOptions]
  );

  const valorAnosCorrentista = useMemo(
    () => mapAnosCorrentistaToDesconto(anosCorrentista, anosCorrentistaOptions),
    [anosCorrentista, anosCorrentistaOptions]
  );

  const portabilidadeInfo = useMemo(
    () => mapPortabilidadeToInfo(mesesPortabilidade, portabilidadeOptions),
    [mesesPortabilidade, portabilidadeOptions]
  );

  const valorPortabilidade = portabilidadeInfo.desconto;

  const valorCorrentista = useMemo(
    () => sumChecked(correntistaItems, checkCorrentista),
    [correntistaItems, checkCorrentista]
  );

  const valorTempo = useMemo(
    () => sumChecked(tempoRegimeItems, checkTempo),
    [tempoRegimeItems, checkTempo]
  );

  const valorOutrosProdutos = useMemo(
    () => sumChecked(outrosProdutosItems, checkProdutos),
    [outrosProdutosItems, checkProdutos]
  );

  const descontoPrevioPercent = useMemo(() => {
    if (!valorEmprestimoNum || !valorCapitalNum) return 0;
    const base = valorDividaNum + valorEmprestimoNum;
    if (base <= 0) return 0;
    const desc = ((valorCapitalNum - base) / base) * 100;
    return Number.isFinite(desc) ? desc : 0;
  }, [valorCapitalNum, valorDividaNum, valorEmprestimoNum]);

  const descontoPrevioTotal = useMemo(() => {
    if (descontoPrevioPercent < 20) return 0;
    if (descontoPrevioPercent <= 40) return 0.01;
    if (descontoPrevioPercent <= 60) return 0.02;
    if (descontoPrevioPercent <= 80) return 0.03;
    if (descontoPrevioPercent <= 100) return 0.04;
    if (descontoPrevioPercent <= 200) return 0.05;
    if (descontoPrevioPercent <= 300) return 0.06;
    return 0.07;
  }, [descontoPrevioPercent]);

  const descontoTotalBruto = useMemo(() => {
    return (
      valorAnosAssociado +
      valorAnosCorrentista +
      valorPortabilidade +
      valorCorrentista +
      valorTempo +
      valorOutrosProdutos +
      descontoPrevioTotal
    );
  }, [
    valorAnosAssociado,
    valorAnosCorrentista,
    valorPortabilidade,
    valorCorrentista,
    valorTempo,
    valorOutrosProdutos,
    descontoPrevioTotal,
  ]);

  const riscoSelecionado = useMemo(
    () =>
      riscoOptions.find(
        (x) => String(x.ID_CLASSIFICACAO_RISCO) === String(classificacaoRisco)
      ) || null,
    [classificacaoRisco, riscoOptions]
  );

  const classificacaoNum = Number(riscoSelecionado?.VL_CLASSIFICACAO_RISCO || 0);

  const descontoTotal = useMemo(() => {
    if (!classificacaoRisco) return 0;
    if (classificacaoNum < 4) return descontoTotalBruto;
    if (classificacaoNum === 4) return Number((descontoTotalBruto / 2).toFixed(3));
    return 0;
  }, [classificacaoNum, classificacaoRisco, descontoTotalBruto]);

  const classificacaoDescricao = useMemo(() => {
    if (!classificacaoRisco) return "";
    if (classificacaoNum < 4) return "Desconto total (100% das taxas)";
    if (classificacaoNum === 4) return "Desconto total (50% das taxas)";
    return "Sem direito a desconto";
  }, [classificacaoNum, classificacaoRisco]);

  const taxaBruta = useMemo(() => {
    const parsed = Number(
      String(taxaBrutaInput || "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }, [taxaBrutaInput]);

  const taxaFinal = useMemo(() => {
    if (tipoEmprestimo === "pessoal") return 0;
    return Number((taxaBruta - descontoTotal).toFixed(3));
  }, [descontoTotal, taxaBruta, tipoEmprestimo]);

  const riscoLabel = useMemo(() => {
    return riscoSelecionado?.DESC_CLASSIFICACAO || "";
  }, [riscoSelecionado]);

  const cidadeExisteNaLista = useMemo(() => {
    if (!cidadeAtendimento.trim()) return true;
    return cidadesOptions.some(
      (item) =>
        normalizeLabel(item.NM_CIDADE).toUpperCase() ===
        normalizeLabel(cidadeAtendimento).toUpperCase()
    );
  }, [cidadeAtendimento, cidadesOptions]);

  useEffect(() => {
    async function preencherTaxaParcela() {
      if (tipoEmprestimo === "pessoal") {
        setTaxaBrutaInput("");
        return;
      }

      if (!quantidadeParcelas.trim()) return;

      try {
        const taxaLocal = taxaParcelaOptions.find(
          (item) => String(item.NR_PARCELA).trim() === String(quantidadeParcelas).trim()
        );

        if (taxaLocal) {
          setTaxaBrutaInput(String(Number(taxaLocal.PERC_TAXA_PARCELA || 0).toFixed(2)));
          return;
        }

        const taxaApi = await buscarTaxaParcelaPorNumero(quantidadeParcelas);
        if (taxaApi?.PERC_TAXA_PARCELA !== undefined && taxaApi?.PERC_TAXA_PARCELA !== null) {
          setTaxaBrutaInput(String(Number(taxaApi.PERC_TAXA_PARCELA).toFixed(2)));
        }
      } catch {
        // silencioso
      }
    }

    preencherTaxaParcela();
  }, [quantidadeParcelas, tipoEmprestimo, taxaParcelaOptions]);

  async function onBuscar() {
    setErroLocal("");
    setInfoLocal("");
    resetResultados();

    const r = await buscar(cpf);

    if (r.found) {
      setNome(r.data.nome || "");
    }

    try {
      setLoadingComplementar(true);

      const clean = onlyDigits(cpf);
      const dados = await buscarAssociadoAnaliticoSimulador(clean);

      if (dados) {
        setNome(dados.NM_CLIENTE || r.data?.nome || "");
        setValorCapital(fmtBRL(Number(dados.SL_CONTA_CAPITAL || 0)));
        setValorDivida(fmtBRL(Number(dados.SL_DEVEDOR_DIA || 0)));
        setCidadeAtendimento(dados.NM_CIDADE || "");
        setAnosAssociado(Number(dados.NR_ANO_ASSOCIADO || 0));
        setAnosCorrentista(Number(dados.NR_ANO_CORRENTISTA || 0));
        setMesesPortabilidade(Number(dados.NR_MESES_PORTABILIDADE || 0));

        const nextCorrentista: Record<string, boolean> = {};
        correntistaOptions.forEach((item) => {
          const label = normalizeLabel(item.DESC_TEXTO).toUpperCase();
          const key = `correntista_${item.ID_CORRENTISTA}`;

          if (label.includes("CART")) {
            nextCorrentista[key] = Number(dados.NR_CARTAO || 0) >= 1;
          } else if (label.includes("IAP")) {
            nextCorrentista[key] = Number(dados.NR_IAP || 0) >= 5;
          } else {
            nextCorrentista[key] = false;
          }
        });
        setCheckCorrentista(nextCorrentista);

        const nextProdutos: Record<string, boolean> = {};
        outrosProdutosOptions.forEach((item) => {
          const label = normalizeLabel(item.NM_PRODUTO).toUpperCase();
          const key = `produto_${item.ID_OUTROS_PRODUTOS}`;

          if (label.includes("CONSOR")) {
            nextProdutos[key] = Number(dados.NR_CONSORCIO || 0) >= 1;
          } else if (label.includes("SEGURO")) {
            nextProdutos[key] = Number(dados.NR_SEGUROS || 0) >= 1;
          } else {
            nextProdutos[key] = false;
          }
        });
        setCheckProdutos(nextProdutos);
      }

      setInfoLocal("Dados do associado carregados. Continue a simulação.");
    } catch (e: any) {
      setErroLocal(
        e?.message || "Não foi possível carregar os dados do associado."
      );
    } finally {
      setLoadingComplementar(false);
    }
  }

  function toggleMapValue(
    id: string,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) {
    setter((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      resetResultados();
      return next;
    });
  }

  function validar() {
    if (loadingTabelas) return "Aguarde o carregamento das tabelas auxiliares.";
    if (!cpf.trim()) return "CPF do associado não preenchido.";
    if (!nome.trim()) return "Nome do associado não preenchido.";
    if (!tipoEmprestimo) return "Tipo de empréstimo não selecionado.";
    if (!valorEmprestimo.trim()) return "Valor solicitado não preenchido.";
    if (!valorDivida.trim()) return "Valor da dívida não preenchido.";
    if (!valorCapital.trim()) return "Valor do capital não preenchido.";
    if (!classificacaoRisco) return "Classificação de risco não selecionada.";

    if (
      (tipoEmprestimo === "consignado" || tipoEmprestimo === "trabalhador") &&
      !quantidadeParcelas.trim()
    ) {
      return "Quantidade de parcelas não preenchida.";
    }

    if (
      (tipoEmprestimo === "consignado" || tipoEmprestimo === "trabalhador") &&
      !taxaBrutaInput.trim()
    ) {
      return "Taxa bruta não preenchida.";
    }

    if (!cidadeAtendimento.trim()) return "Cidade do atendimento não preenchida.";
    if (!cidadeExisteNaLista) return "Cidade do atendimento inválida.";
    if (!atendente.trim()) return "Nome do atendente não preenchido.";
    return "";
  }

  async function processar() {
    setErroLocal("");
    setInfoLocal("");

    const erroValidacao = validar();
    if (erroValidacao) {
      setErroLocal(erroValidacao);
      return;
    }

    const payload = {
      NM_TIPO_EMPRESTIMO: tipoEmprestimo.toUpperCase(),
      VL_EMPRESTIMO: valorEmprestimoNum,
      VL_DIVIDA: valorDividaNum,
      VL_CAPITAL: valorCapitalNum,
      VL_DESCONTO_TOTAL: descontoTotal.toFixed(3),
      PERC_TAXA_PARCELA:
        tipoEmprestimo === "pessoal" ? "0" : taxaBruta.toFixed(2),
      DESC_NUMERO_PARCELA:
        tipoEmprestimo === "pessoal" ? "" : quantidadeParcelas.toUpperCase(),
      NR_TAXA_FINAL:
        tipoEmprestimo === "pessoal" ? "0" : taxaFinal.toFixed(3),
      NM_CLASSIFICACAO_RISCO: toShortRiskCode(riscoSelecionado),
      SN_SEGURO: seguro ? "SIM" : "NAO",
      SN_AVALISTA: avalista ? "SIM" : "NAO",
      SN_OUTRAS_GARANTIAS:
        outrosGarantias && outrasGarantiasTexto.trim()
          ? outrasGarantiasTexto.toUpperCase()
          : "SEM OUTRAS GARANTIAS",
      NM_CIDADE: cidadeAtendimento.toUpperCase(),
      NM_ATENDENTE: atendente.toUpperCase(),
      NM_ASSOCIADO: nome.toUpperCase(),
      NR_CPF_CNPJ: onlyDigits(cpf),
    };

    try {
      await salvarSimulacaoDesconto(payload);
      setProcessado(true);
      setInfoLocal("Simulação processada com sucesso.");
    } catch (e: any) {
      setErroLocal(e?.message || "Não foi possível processar a simulação.");
    }
  }

  async function gerarPdf() {
    const erroValidacao = validar();
    if (erroValidacao) {
      setErroLocal(erroValidacao);
      return;
    }

    await gerarPdfSimuladorDesconto({
      nome,
      cpf: formatCpfView(cpf),
      anosAssociacao: {
        label: `${anosAssociado} ano(s)`,
        desconto: valorAnosAssociado,
      },
      correntistaSelects: [
        {
          label: `${anosCorrentista} ano(s) de correntista`,
          desconto: valorAnosCorrentista,
        },
        {
          label: portabilidadeInfo.label,
          desconto: valorPortabilidade,
        },
      ],
      regime: tempoRegimeItems
        .filter((item) => checkTempo[item.id])
        .map((item) => ({
          label: item.label,
          desconto: item.value,
        })),
      outrosProdutos: [
        ...outrosProdutosItems
          .filter((item) => checkProdutos[item.id])
          .map((item) => ({
            label: item.label,
            desconto: item.value,
          })),
        ...correntistaItems
          .filter((item) => checkCorrentista[item.id])
          .map((item) => ({
            label: item.label,
            desconto: item.value,
          })),
      ],
      tipoEmprestimo,
      valorSolicitado: valorEmprestimo,
      quantidadeParcelas:
        tipoEmprestimo === "pessoal" ? "-" : quantidadeParcelas || "-",
      risco: riscoLabel,
      seguro,
      avalista,
      outros: outrosGarantias
        ? outrasGarantiasTexto || "OUTRAS GARANTIAS"
        : "Sem",
      divida: valorDivida,
      capital: valorCapital,
      descontoSolicitacao: descontoPrevioTotal.toFixed(2),
      taxaBruta: tipoEmprestimo === "pessoal" ? "" : taxaBruta.toFixed(2),
      descontoTotal: descontoTotal.toFixed(3),
      taxaFinal: tipoEmprestimo === "pessoal" ? "" : taxaFinal.toFixed(3),
      cidade: cidadeAtendimento,
      data: dataAtendimento,
      atendente,
    });
  }

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          CPF do associado
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={formatCpfView(cpf)}
            onChange={(e) => {
              setCpf(e.target.value);
              resetResultados();
            }}
            placeholder="CPF/CNPJ"
            className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={18}
          />
          <button
            onClick={onBuscar}
            disabled={loading || loadingComplementar || loadingTabelas}
            className="cursor-pointer rounded bg-secondary px-6 py-2 font-semibold text-white hover:bg-primary hover:shadow-md disabled:opacity-70"
          >
            {loading || loadingComplementar ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {(erro || erroLocal) && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erroLocal || erro}
          </div>
        )}

        {(info || infoLocal) && !(erro || erroLocal) && (
          <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {infoLocal || info}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome do associado
          </label>
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Tipo de empréstimo
          </label>
          <select
            value={tipoEmprestimo}
            onChange={(e) => {
              setTipoEmprestimo(e.target.value as TipoEmprestimo);
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="trabalhador">Crédito Trabalhador</option>
            <option value="consignado">Consignado</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Anos de associação
          </label>
          <input
            readOnly
            value={anosAssociado ? `${anosAssociado} ano(s)` : ""}
            className="w-full rounded border bg-gray-50 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Anos de correntista Sicoob
          </label>
          <input
            readOnly
            value={
              anosCorrentista || anosCorrentista === 0
                ? `${anosCorrentista} ano(s)`
                : ""
            }
            className="w-full rounded border bg-gray-50 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Portabilidade salário
          </label>
          <input
            readOnly
            value={portabilidadeInfo.label}
            className="w-full rounded border bg-gray-50 px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Valor solicitado
          </label>
          <input
            value={valorEmprestimo}
            onChange={(e) => {
              setValorEmprestimo(monetizarDigitacao(e.target.value));
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2 text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Dívida
          </label>
          <input
            value={valorDivida}
            onChange={(e) => {
              setValorDivida(monetizarDigitacao(e.target.value));
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2 text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Capital
          </label>
          <input
            value={valorCapital}
            onChange={(e) => {
              setValorCapital(monetizarDigitacao(e.target.value));
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2 text-right"
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Desconto associação
          </label>
          <input
            readOnly
            value={valorAnosAssociado.toFixed(2)}
            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Desconto correntista
          </label>
          <input
            readOnly
            value={valorAnosCorrentista.toFixed(2)}
            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Desconto portabilidade
          </label>
          <input
            readOnly
            value={valorPortabilidade.toFixed(2)}
            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Desconto sobre solicitação %
          </label>
          <input
            readOnly
            value={descontoPrevioTotal.toFixed(2)}
            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Classificação do risco
          </label>
          <select
            value={classificacaoRisco}
            onChange={(e) => {
              setClassificacaoRisco(e.target.value);
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Selecione</option>
            {riscoOptions.map((item) => (
              <option
                key={item.ID_CLASSIFICACAO_RISCO}
                value={item.ID_CLASSIFICACAO_RISCO}
              >
                {item.DESC_CLASSIFICACAO}
              </option>
            ))}
          </select>
        </div>

        {tipoEmprestimo !== "pessoal" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Quantidade de parcelas
              </label>
              <select
                value={quantidadeParcelas}
                onChange={(e) => {
                  setQuantidadeParcelas(e.target.value);
                  resetResultados();
                }}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">Selecione</option>
                {taxaParcelaOptions.map((item) => (
                  <option
                    key={item.ID_TAXA_PARCELA_SIMULADOR}
                    value={item.NR_PARCELA}
                  >
                    {item.NR_PARCELA}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Taxa bruta %
              </label>
              <input
                value={taxaBrutaInput}
                onChange={(e) => {
                  setTaxaBrutaInput(e.target.value);
                  resetResultados();
                }}
                className="w-full rounded border px-3 py-2 text-right"
                placeholder="Ex: 2,49"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Correntista Sicoob e outros produtos
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {correntistaItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700"
            >
              <span>{capitalizeText(item.label)}</span>
              <input
                type="checkbox"
                checked={!!checkCorrentista[item.id]}
                onChange={() => toggleMapValue(item.id, setCheckCorrentista)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Regime de trabalho
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tempoRegimeItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700"
            >
              <span>{capitalizeText(item.label)}</span>
              <input
                type="checkbox"
                checked={!!checkTempo[item.id]}
                onChange={() => toggleMapValue(item.id, setCheckTempo)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Outros produtos
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {outrosProdutosItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700"
            >
              <span>{capitalizeText(item.label)}</span>
              <input
                type="checkbox"
                checked={!!checkProdutos[item.id]}
                onChange={() => toggleMapValue(item.id, setCheckProdutos)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Garantias</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700">
            <span>Seguro</span>
            <input
              type="checkbox"
              checked={seguro}
              onChange={(e) => {
                setSeguro(e.target.checked);
                resetResultados();
              }}
            />
          </label>

          <label className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700">
            <span>Avalista</span>
            <input
              type="checkbox"
              checked={avalista}
              onChange={(e) => {
                setAvalista(e.target.checked);
                resetResultados();
              }}
            />
          </label>

          <label className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700">
            <span>Outros</span>
            <input
              type="checkbox"
              checked={outrosGarantias}
              onChange={(e) => {
                setOutrosGarantias(e.target.checked);
                resetResultados();
              }}
            />
          </label>
        </div>

        {outrosGarantias && (
          <div className="mt-3">
            <input
              value={outrasGarantiasTexto}
              onChange={(e) => {
                setOutrasGarantiasTexto(e.target.value);
                resetResultados();
              }}
              placeholder="Outras garantias"
              className="w-full rounded border px-3 py-2"
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cidade do atendimento
          </label>
          <input
            list="cidades-simulador"
            value={cidadeAtendimento}
            onChange={(e) => {
              setCidadeAtendimento(e.target.value);
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2"
          />
          <datalist id="cidades-simulador">
            {cidadesOptions.map((item) => (
              <option key={item.ID_CIDADES} value={item.NM_CIDADE} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome do atendente
          </label>
          <input
            value={atendente}
            onChange={(e) => {
              setAtendente(e.target.value);
              resetResultados();
            }}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Data do atendimento
          </label>
          <input
            value={dataAtendimento}
            onChange={(e) => setDataAtendimento(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        {(tipoEmprestimo === "consignado" || tipoEmprestimo === "trabalhador") && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Taxa bruta %
              </label>
              <input
                readOnly
                value={taxaBruta ? taxaBruta.toFixed(2) : ""}
                className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Desconto total %
              </label>
              <input
                readOnly
                value={descontoTotal.toFixed(3)}
                className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Taxa final %
              </label>
              <input
                readOnly
                value={taxaFinal.toFixed(3)}
                className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
              />
            </div>
          </>
        )}

        {tipoEmprestimo === "pessoal" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Desconto total %
            </label>
            <input
              readOnly
              value={descontoTotal.toFixed(3)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
            />
          </div>
        )}
      </div>

      <div className="mt-6 rounded border bg-gray-50 p-4 text-sm text-gray-700">
        <p>
          <strong>Classificação aplicada:</strong> {classificacaoDescricao || "-"}
        </p>
        <p className="mt-1">
          <strong>Soma dos descontos parciais:</strong> {descontoTotalBruto.toFixed(3)}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t pt-5">
        <button
          onClick={processar}
          disabled={loadingTabelas}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Processar simulação
        </button>

        <button
          onClick={gerarPdf}
          disabled={!processado}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}