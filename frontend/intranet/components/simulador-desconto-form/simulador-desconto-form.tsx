"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCpfView,
  fmtBRL,
  monetizarDigitacao,
  onlyDigits,
  parseBRL,
  hojeBR,
} from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { FaTimes } from "react-icons/fa";
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
  listarTaxaTrabalhador,
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
  type TaxaTrabalhadorOption,
  type TempoRegimeOption,
} from "@/services/simulador_desconto.service";
import { gerarPdfSimuladorDesconto } from "@/lib/pdf/gerarPdfSimuladorDesconto";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type TipoEmprestimo = "" | "trabalhador" | "consignado" | "pessoal";

type DynamicCheckboxItem = {
  id: string;
  label: string;
  value: number;
};

type ParcelaTaxaItem = {
  id: string;
  nrParcela: string;
  taxa: number;
};

function sumChecked(items: DynamicCheckboxItem[], checkedMap: Record<string, boolean>) {
  return items.reduce((acc, item) => acc + (checkedMap[item.id] ? item.value : 0), 0);
}

function normalizeLabel(text: string) {
  return String(text || "").trim();
}

function upperText(text?: string | null) {
  return String(text || "").toUpperCase();
}

function pickAnosAssociadoIdFromAnos(
  anos: number,
  tabela: AnosAssociadoOption[]
) {
  if (!tabela.length) return "";

  const parseFaixa = (label: string) => {
    const txt = normalizeLabel(label).toUpperCase();

    const ateMatch = txt.match(/AT[EÉ]\s*(\d+)/);
    if (ateMatch) {
      const max = Number(ateMatch[1]);
      if (Number.isFinite(max)) return { min: 0, max };
    }

    const entreMatch = txt.match(/(?:DE\s*)?(\d+)\s*A\s*(\d+)/);
    if (entreMatch) {
      const min = Number(entreMatch[1]);
      const max = Number(entreMatch[2]);
      if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
    }

    const maisDeMatch = txt.match(/MAIS\s*DE\s*(\d+)/);
    if (maisDeMatch) {
      const min = Number(maisDeMatch[1]);
      if (Number.isFinite(min)) return { min: min + 0.0001, max: Number.POSITIVE_INFINITY };
    }

    return null;
  };

  const porFaixa = tabela.find((item) => {
    const faixa = parseFaixa(String(item.DESC_ANOS_ASSOCIADO || ""));
    if (!faixa) return false;
    return anos >= faixa.min && anos <= faixa.max;
  });
  if (porFaixa) return String(porFaixa.ID_ANOS_ASSOCIADO);

  const exato = tabela.find((item) => Number(item.ID_ANOS_ASSOCIADO) === anos);
  if (exato) return String(exato.ID_ANOS_ASSOCIADO);

  const ordenado = [...tabela].sort(
    (a, b) => Number(a.ID_ANOS_ASSOCIADO) - Number(b.ID_ANOS_ASSOCIADO)
  );
  const ultimoValido = ordenado
    .filter((item) => Number(item.ID_ANOS_ASSOCIADO) <= anos)
    .at(-1);

  return String(ultimoValido?.ID_ANOS_ASSOCIADO || "");
}

function pickAnosCorrentistaIdFromAnos(
  anos: number,
  tabela: AnosCorrentistaOption[]
) {
  if (!tabela.length) return "";

  const parseFaixa = (label: string) => {
    const txt = normalizeLabel(label).toUpperCase();

    const ateMatch = txt.match(/AT[EÉ]\s*(\d+)/);
    if (ateMatch) {
      const max = Number(ateMatch[1]);
      if (Number.isFinite(max)) return { min: 0, max };
    }

    const entreMatch = txt.match(/(?:DE\s*)?(\d+)\s*A\s*(\d+)/);
    if (entreMatch) {
      const min = Number(entreMatch[1]);
      const max = Number(entreMatch[2]);
      if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
    }

    const maisDeMatch = txt.match(/MAIS\s*DE\s*(\d+)/);
    if (maisDeMatch) {
      const min = Number(maisDeMatch[1]);
      if (Number.isFinite(min)) return { min: min + 0.0001, max: Number.POSITIVE_INFINITY };
    }

    return null;
  };

  const porFaixa = tabela.find((item) => {
    const faixa = parseFaixa(String(item.DESC_CORRENTISTA || ""));
    if (!faixa) return false;
    return anos >= faixa.min && anos <= faixa.max;
  });
  if (porFaixa) return String(porFaixa.ID_ANOS_CORRENTISTA);

  const exato = tabela.find(
    (item) => Number(item.ID_ANOS_CORRENTISTA) === anos
  );
  if (exato) return String(exato.ID_ANOS_CORRENTISTA);

  const ordenado = [...tabela].sort(
    (a, b) => Number(a.ID_ANOS_CORRENTISTA) - Number(b.ID_ANOS_CORRENTISTA)
  );
  const ultimoValido = ordenado
    .filter((item) => Number(item.ID_ANOS_CORRENTISTA) <= anos)
    .at(-1);

  return String(ultimoValido?.ID_ANOS_CORRENTISTA || "");
}

function pickPortabilidadeIdFromMeses(
  meses: number,
  tabela: PortabilidadeSalarioOption[]
) {
  if (!tabela.length) return "";

  const ordenada = [...tabela].sort(
    (a, b) =>
      Number(a.ID_PORTABILIDADE_SALARIO) - Number(b.ID_PORTABILIDADE_SALARIO)
  );

  if (!meses || meses <= 0) {
    const semPortabilidade = ordenada.find((item) =>
      normalizeLabel(item.DESC_PORTABILIDADE_SALARIO)
        .toUpperCase()
        .includes("SEM PORTABILIDADE")
    );
    return String(semPortabilidade?.ID_PORTABILIDADE_SALARIO || "");
  }

  if (meses <= 6) {
    return String(ordenada[0]?.ID_PORTABILIDADE_SALARIO || "");
  }

  return String(ordenada.at(-1)?.ID_PORTABILIDADE_SALARIO || "");
}

export function SimuladorDescontoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");

  const [anosAssociado, setAnosAssociado] = useState(0);
  const [anosCorrentista, setAnosCorrentista] = useState(0);
  const [selectedAnosAssociadoId, setSelectedAnosAssociadoId] = useState("");
  const [selectedAnosCorrentistaId, setSelectedAnosCorrentistaId] = useState("");
  const [selectedPortabilidadeId, setSelectedPortabilidadeId] = useState("");

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
  const [dataAtendimento] = useState(hojeBR());
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
  const [taxaTrabalhadorOptions, setTaxaTrabalhadorOptions] = useState<TaxaTrabalhadorOption[]>([]);
  const [tempoRegimeOptions, setTempoRegimeOptions] = useState<TempoRegimeOption[]>([]);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();
  const alertaRef = useRef<HTMLDivElement | null>(null);

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
          taxasTrabalhador,
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
          listarTaxaTrabalhador(),
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
        setTaxaTrabalhadorOptions(taxasTrabalhador || []);
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

  useEffect(() => {
    if (!(erro || erroLocal)) return;
    requestAnimationFrame(() => {
      alertaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [erro, erroLocal]);

  useEffect(() => {
    if (!anosAssociadoOptions.length) return;
    if (anosAssociado <= 0) return;
    if (selectedAnosAssociadoId) return;

    const id = pickAnosAssociadoIdFromAnos(anosAssociado, anosAssociadoOptions);
    if (id) setSelectedAnosAssociadoId(id);
  }, [anosAssociado, anosAssociadoOptions, selectedAnosAssociadoId]);

  useEffect(() => {
    if (!anosCorrentistaOptions.length) return;
    if (anosCorrentista <= 0) return;
    if (selectedAnosCorrentistaId) return;

    const id = pickAnosCorrentistaIdFromAnos(
      anosCorrentista,
      anosCorrentistaOptions
    );
    if (id) setSelectedAnosCorrentistaId(id);
  }, [anosCorrentista, anosCorrentistaOptions, selectedAnosCorrentistaId]);

  function resetResultados() {
    setProcessado(false);
    setInfoLocal("");
  }

  function limparFormulario() {
    setCpf("");
    setNome("");

    setAnosAssociado(0);
    setAnosCorrentista(0);
    setSelectedAnosAssociadoId("");
    setSelectedAnosCorrentistaId("");
    setSelectedPortabilidadeId("");

    setTipoEmprestimo("");
    setValorEmprestimo("");
    setValorDivida("");
    setValorCapital("");
    setClassificacaoRisco("");
    setQuantidadeParcelas("");
    setTaxaBrutaInput("");

    setCheckCorrentista({});
    setCheckTempo({});
    setCheckProdutos({});

    setSeguro(false);
    setAvalista(false);
    setOutrosGarantias(false);
    setOutrasGarantiasTexto("");

    setCidadeAtendimento("");

    setErroLocal("");
    setInfoLocal("");
    setProcessado(false);
    setLoadingComplementar(false);
  }

  function subirParaAlerta() {
    requestAnimationFrame(() => {
      alertaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  const correntistaItemsOrdenados = useMemo<DynamicCheckboxItem[]>(() => {
    return [...correntistaItems].sort((a, b) => {
      const aIap = upperText(a.label).includes("IAP");
      const bIap = upperText(b.label).includes("IAP");
      if (aIap && !bIap) return 1;
      if (!aIap && bIap) return -1;
      return 0;
    });
  }, [correntistaItems]);

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

  const anosAssociadoSelecionado = useMemo(
    () =>
      anosAssociadoOptions.find(
        (item) => String(item.ID_ANOS_ASSOCIADO) === selectedAnosAssociadoId
      ) || null,
    [anosAssociadoOptions, selectedAnosAssociadoId]
  );

  const anosCorrentistaSelecionado = useMemo(
    () =>
      anosCorrentistaOptions.find(
        (item) => String(item.ID_ANOS_CORRENTISTA) === selectedAnosCorrentistaId
      ) || null,
    [anosCorrentistaOptions, selectedAnosCorrentistaId]
  );

  const portabilidadeSelecionada = useMemo(
    () =>
      portabilidadeOptions.find(
        (item) =>
          String(item.ID_PORTABILIDADE_SALARIO) === selectedPortabilidadeId
      ) || null,
    [portabilidadeOptions, selectedPortabilidadeId]
  );

  const valorAnosAssociado = Number(
    anosAssociadoSelecionado?.VL_ANOS_ASSOCIADO || 0
  );
  const valorAnosCorrentista = Number(
    anosCorrentistaSelecionado?.VL_CORRENTISTA || 0
  );
  const valorPortabilidade = Number(
    portabilidadeSelecionada?.VL_PORTABILIDADE_SALARIO || 0
  );
  const portabilidadeLabel =
    portabilidadeSelecionada?.DESC_PORTABILIDADE_SALARIO ||
    "Sem Portabilidade Salário";

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

  const parcelasComTaxa = useMemo<ParcelaTaxaItem[]>(() => {
    if (tipoEmprestimo === "trabalhador") {
      return taxaTrabalhadorOptions.map((item) => ({
        id: `trabalhador_${item.ID_TAXA}`,
        nrParcela: String(item.NR_PARCELA || "").trim(),
        taxa: Number(item.TX_PARCELA || 0),
      }));
    }

    return taxaParcelaOptions.map((item) => ({
      id: `consignado_${item.ID_TAXA_PARCELA_SIMULADOR}`,
      nrParcela: String(item.NR_PARCELA || "").trim(),
      taxa: Number(item.PERC_TAXA_PARCELA || 0),
    }));
  }, [tipoEmprestimo, taxaParcelaOptions, taxaTrabalhadorOptions]);

  const descontoPrevioPercent = useMemo(() => {
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
        setQuantidadeParcelas("");
        setTaxaBrutaInput("");
        return;
      }

      if (!quantidadeParcelas.trim()) return;

      try {
        const taxaLocal = parcelasComTaxa.find(
          (item) =>
            String(item.nrParcela).trim() === String(quantidadeParcelas).trim()
        );

        if (taxaLocal) {
          setTaxaBrutaInput(String(Number(taxaLocal.taxa || 0).toFixed(2)));
          return;
        }

        if (tipoEmprestimo === "consignado") {
          const taxaApi = await buscarTaxaParcelaPorNumero(quantidadeParcelas);
          if (taxaApi?.PERC_TAXA_PARCELA !== undefined && taxaApi?.PERC_TAXA_PARCELA !== null) {
            setTaxaBrutaInput(String(Number(taxaApi.PERC_TAXA_PARCELA).toFixed(2)));
          }
        }
      } catch {
        // silencioso
      }
    }

    preencherTaxaParcela();
  }, [quantidadeParcelas, tipoEmprestimo, parcelasComTaxa]);

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
        setValorDivida(fmtBRL(Number(0)));
        setCidadeAtendimento(dados.NM_CIDADE || "");
        const anosAssoc = Number(dados.NR_ANO_ASSOCIADO || 0);
        const anosCorr = Number(dados.NR_ANO_CORRENTISTA || 0);
        const mesesPort = Number(dados.NR_MESES_PORTABILIDADE || 0);

        setAnosAssociado(anosAssoc);
        setAnosCorrentista(anosCorr);
        setSelectedAnosAssociadoId(
          pickAnosAssociadoIdFromAnos(anosAssoc, anosAssociadoOptions)
        );
        setSelectedAnosCorrentistaId(
          pickAnosCorrentistaIdFromAnos(anosCorr, anosCorrentistaOptions)
        );
        setSelectedPortabilidadeId(
          pickPortabilidadeIdFromMeses(mesesPort, portabilidadeOptions)
        );

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
    if (!cpf.trim()) return "CPF/CNPJ do associado nao preenchido.";
    if (!nome.trim()) return "Nome do associado não preenchido.";
    if (!selectedAnosAssociadoId) return "Anos de associação não selecionado.";
    if (!selectedAnosCorrentistaId) return "Anos de correntista não selecionado.";
    if (!selectedPortabilidadeId) return "Portabilidade salário não selecionada.";
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
      subirParaAlerta();
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
      NM_CLASSIFICACAO_RISCO: riscoLabel,
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
      subirParaAlerta();
      return;
    }

    await gerarPdfSimuladorDesconto({
      nome,
      cpf: formatCpfView(cpf),
      anosAssociacao: {
        label:
          anosAssociadoSelecionado?.DESC_ANOS_ASSOCIADO ||
          "Anos de associação",
        desconto: valorAnosAssociado,
      },
      correntistaSelects: [
        {
          label:
            anosCorrentistaSelecionado?.DESC_CORRENTISTA ||
            "Anos de correntista",
          desconto: valorAnosCorrentista,
        },
        {
          label: portabilidadeLabel,
          desconto: valorPortabilidade,
        },
      ],
      regime: tempoRegimeItems
        .map((item) => ({
          label: item.label,
          desconto: checkTempo[item.id] ? item.value : 0,
        })),
      outrosProdutos: [
        ...outrosProdutosItems
          .map((item) => ({
            label: item.label,
            desconto: checkProdutos[item.id] ? item.value : 0,
          })),
        ...correntistaItems
          .map((item) => ({
            label: item.label,
            desconto: checkCorrentista[item.id] ? item.value : 0,
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
      <SearchForm onSearch={onBuscar}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[280px_1fr_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF/CNPJ do associado
            </label>
            <SearchInput
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
          </div>

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

          <div className="md:self-end">
            <SearchButton
              loading={loading || loadingComplementar}
              label="Pesquisar"
            />
          </div>

          <div className="md:self-end">
            <button
              type="button"
              onClick={limparFormulario}
              className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FaTimes />
              Limpar
            </button>
          </div>

          {(erro || erroLocal) && (
            <div
              ref={alertaRef}
              className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-4"
            >
              {erroLocal || erro}
            </div>
          )}

          {(info || infoLocal) && !(erro || erroLocal) && (
            <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:col-span-4">
              {infoLocal || info}
            </div>
          )}
        </div>
      </SearchForm>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Anos de associacao ininterruptos
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_130px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Anos de associacao
            </label>
            <select
              value={selectedAnosAssociadoId}
              onChange={(e) => {
                setSelectedAnosAssociadoId(e.target.value);
                resetResultados();
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {anosAssociadoOptions.map((item) => (
                <option
                  key={item.ID_ANOS_ASSOCIADO}
                  value={item.ID_ANOS_ASSOCIADO}
                >
                  {upperText(item.DESC_ANOS_ASSOCIADO)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Desconto associacao
            </label>
            <input
              readOnly
              value={valorAnosAssociado.toFixed(2)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right font-medium tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Correntista Sicoob e outros produtos
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_130px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Anos de correntista Sicoob
            </label>
            <select
              value={selectedAnosCorrentistaId}
              onChange={(e) => {
                setSelectedAnosCorrentistaId(e.target.value);
                resetResultados();
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {anosCorrentistaOptions.map((item) => (
                <option
                  key={item.ID_ANOS_CORRENTISTA}
                  value={item.ID_ANOS_CORRENTISTA}
                >
                  {upperText(item.DESC_CORRENTISTA)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Desconto correntista
            </label>
            <input
              readOnly
              value={valorAnosCorrentista.toFixed(2)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right font-medium tabular-nums"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_130px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Portabilidade salario
            </label>
            <select
              value={selectedPortabilidadeId}
              onChange={(e) => {
                setSelectedPortabilidadeId(e.target.value);
                resetResultados();
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {portabilidadeOptions.map((item) => (
                <option
                  key={item.ID_PORTABILIDADE_SALARIO}
                  value={item.ID_PORTABILIDADE_SALARIO}
                >
                  {upperText(item.DESC_PORTABILIDADE_SALARIO)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Desconto portabilidade
            </label>
            <input
              readOnly
              value={valorPortabilidade.toFixed(2)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right font-medium tabular-nums"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {correntistaItemsOrdenados.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm text-gray-700"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!checkCorrentista[item.id]}
                  onChange={() => toggleMapValue(item.id, setCheckCorrentista)}
                />
                <span className="uppercase">{upperText(item.label)}</span>
              </div>
              <span className="min-w-[3rem] text-right font-medium tabular-nums text-gray-600">
                {checkCorrentista[item.id] ? item.value.toFixed(2) : ""}
              </span>
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
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!checkTempo[item.id]}
                  onChange={() => toggleMapValue(item.id, setCheckTempo)}
                />
                <span className="uppercase">{upperText(item.label)}</span>
              </div>
              <span className="min-w-[3rem] text-right font-medium tabular-nums text-gray-600">
                {checkTempo[item.id] ? item.value.toFixed(2) : ""}
              </span>
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
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!checkProdutos[item.id]}
                  onChange={() => toggleMapValue(item.id, setCheckProdutos)}
                />
                <span className="uppercase">{upperText(item.label)}</span>
              </div>
              <span className="min-w-[3rem] text-right font-medium tabular-nums text-gray-600">
                {checkProdutos[item.id] ? item.value.toFixed(2) : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Emprestimo</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Tipo de emprestimo
            </label>
            <select
              value={tipoEmprestimo}
              onChange={(e) => {
                setTipoEmprestimo(e.target.value as TipoEmprestimo);
                setQuantidadeParcelas("");
                setTaxaBrutaInput("");
                resetResultados();
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              <option value="trabalhador">CREDITO TRABALHADOR</option>
              <option value="consignado">CONSIGNADO</option>
              <option value="pessoal">PESSOAL</option>
            </select>
          </div>

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
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Dados sobre conta
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Divida
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

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Desconto sobre solicitacao %
            </label>
            <input
              readOnly
              value={descontoPrevioTotal.toFixed(2)}
              className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Classificacao do risco para desconto
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Classificacao do risco
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
                  {parcelasComTaxa.map((item) => (
                    <option key={item.id} value={item.nrParcela}>
                      {item.nrParcela}
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

        <div className="mt-4 rounded border bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            <strong>Classificacao aplicada:</strong> {classificacaoDescricao || "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Garantias</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={seguro}
              onChange={(e) => {
                setSeguro(e.target.checked);
                resetResultados();
              }}
            />
            <span className="uppercase">SEGURO</span>
          </label>

          <label className="flex items-center gap-3 rounded border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={avalista}
              onChange={(e) => {
                setAvalista(e.target.checked);
                resetResultados();
              }}
            />
            <span className="uppercase">AVALISTA</span>
          </label>

          <label className="flex items-center gap-3 rounded border px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={outrosGarantias}
              onChange={(e) => {
                setOutrosGarantias(e.target.checked);
                resetResultados();
              }}
            />
            <span className="uppercase">OUTROS</span>
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

      <div className="mt-6 rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Dados do atendimento
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Cidade do atendimento
            </label>
            <select
              value={cidadeAtendimento}
              onChange={(e) => {
                setCidadeAtendimento(e.target.value);
                resetResultados();
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {cidadesOptions.map((item) => (
                <option key={item.ID_CIDADES} value={item.NM_CIDADE}>
                  {upperText(item.NM_CIDADE)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Dia do atendimento
            </label>
            <input
              readOnly
              value={dataAtendimento}
              className="w-full rounded border bg-gray-50 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-3">
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

      {processado && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
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
      )}

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
