"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { formatCpfView, fmtBRL, monetizarDigitacao, onlyDigits, parseBRL } from "@/utils/br";
import {
  buscarAssociadoAutorizacaoDebito,
  listarCidadesAutorizacaoDebito,
  buscarContaCorrenteAutorizacaoDebito,
  type CidadeOption,
} from "@/services/autorizacao_debito.service";
import { gerarPdfAutorizacaoDebito } from "@/lib/pdf/gerarPdfAutorizacaoDebito";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";

type ExtraDebito = {
  id: string;
  descricao: string;
  valor: string;
};

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getHojeParts() {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = data.toLocaleString("pt-BR", { month: "long" });
  const ano = String(data.getFullYear());

  return { dia, mes, ano };
}

function normalizarCidade(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function AutorizacaoDebitoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [contaAssociado, setContaAssociado] = useState("");
  const [contasCorrentes, setContasCorrentes] = useState<string[]>([]);
  const [contaManual, setContaManual] = useState(false);
  const [contaCorrente, setContaCorrente] = useState("");
  const [cartao, setCartao] = useState("");
  const [dividaConsolidada, setDividaConsolidada] = useState("");
  const [honras, setHonras] = useState("");
  const [outros, setOutros] = useState("");
  const [labelOutros, setLabelOutros] = useState("Outros");

  const [extras, setExtras] = useState<ExtraDebito[]>([]);

  const [reduzir, setReduzir] = useState("");
  const [cancelar, setCancelar] = useState("");

  const [valorSistema, setValorSistema] = useState("");
  const [acrescimo, setAcrescimo] = useState("");

  const [cidadeAtendimento, setCidadeAtendimento] = useState("");
  const [cidades, setCidades] = useState<CidadeOption[]>([]);

  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function carregarCidades() {
      try {
        const data = await listarCidadesAutorizacaoDebito();
        setCidades(data || []);
      } catch (e: any) {
        setErro(e?.message || "Erro ao carregar cidades.");
      }
    }

    carregarCidades();
  }, []);

  const totalBase = useMemo(() => {
    return (
      parseBRL(contaCorrente) +
      parseBRL(cartao) +
      parseBRL(dividaConsolidada) +
      parseBRL(honras) +
      parseBRL(outros)
    );
  }, [contaCorrente, cartao, dividaConsolidada, honras, outros]);

  const totalExtras = useMemo(() => {
    return extras.reduce((acc, item) => acc + parseBRL(item.valor), 0);
  }, [extras]);

  const total = useMemo(() => totalBase + totalExtras, [totalBase, totalExtras]);

  const cidadeAtendimentoEstaNaLista = useMemo(() => {
    const cidadeSelecionada = normalizarCidade(cidadeAtendimento);

    if (!cidadeSelecionada) return true;

    return cidades.some(
      (cidade) => normalizarCidade(cidade.NM_CIDADE) === cidadeSelecionada
    );
  }, [cidadeAtendimento, cidades]);

  const onBuscar = async () => {
    setErro("");
    setInfo("");
    setContaAssociado("");
    setContasCorrentes([]);
    setContaManual(false);
    setCidadeAtendimento("");

    const clean = onlyDigits(cpf);

    if (!clean) {
      setErro("CPF do associado não preenchido.");
      return;
    }

    try {
      setLoadingBuscar(true);

      const associado = await buscarAssociadoAutorizacaoDebito(clean);

      if (!associado?.found) {
        setNome("");
        setContaManual(true);
        setInfo("CPF não encontrado. Preencha o nome e a conta manualmente.");
        return;
      }

      setNome(associado.nome || "");

      const cidadeAssociado = String(associado.cidade || "").trim();

      if (cidadeAssociado) {
        const cidadeLista = cidades.find(
          (cidade) =>
            normalizarCidade(cidade.NM_CIDADE) === normalizarCidade(cidadeAssociado)
        );

        setCidadeAtendimento(cidadeLista?.NM_CIDADE || cidadeAssociado);
      }

      const contas = await buscarContaCorrenteAutorizacaoDebito(clean);

      const listaContas = (contas || [])
        .map((item: any) => String(item.NR_CONTA_CORRENTE || "").trim())
        .filter(Boolean);

      setContasCorrentes(listaContas);

      if (listaContas.length === 1) {
        setContaAssociado(listaContas[0]);
      }

      if (listaContas.length === 0) {
        setContaManual(true);
        setInfo("Dados do associado carregados, mas nenhuma conta corrente foi encontrada. Digite a conta manualmente.");
      } else {
        setInfo("Dados do associado carregados com sucesso.");
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setNome("");
        setContasCorrentes([]);
        setContaAssociado("");
        setContaManual(true);
        setInfo("CPF não encontrado. Preencha o nome e a conta manualmente.");
      } else {
        setErro(e?.message || "Não foi possível buscar o associado.");
      }
    } finally {
      setLoadingBuscar(false);
    }
  };

  const adicionarExtra = () => {
    setExtras((prev) => [
      ...prev,
      {
        id: gerarId(),
        descricao: "Novo item",
        valor: "",
      },
    ]);
  };

  const removerUltimoExtra = () => {
    setExtras((prev) => prev.slice(0, -1));
  };

  const atualizarExtra = (
    id: string,
    campo: "descricao" | "valor",
    valor: string
  ) => {
    setExtras((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item
      )
    );
  };

  const validarCampos = () => {
    if (!cpf.trim()) return "CPF do associado não preenchido.";
    if (!nome.trim()) return "Nome do associado não preenchido.";
    if (!contaAssociado.trim()) return "Conta do associado não preenchida.";
    if (!cidadeAtendimento.trim()) return "Cidade do atendimento não selecionada.";
    return "";
  };

  const formularioValido = useMemo(() => {
    const cpfValido = onlyDigits(cpf).length === 11;

    if (!cpfValido) return false;
    if (!nome.trim()) return false;
    if (!contaAssociado.trim()) return false;
    if (!cidadeAtendimento.trim()) return false;

    return true;
  }, [cpf, nome, contaAssociado, cidadeAtendimento]);

  const handleGerarPdf = async () => {
    setErro("");
    setInfo("");

    const validacao = validarCampos();

    if (validacao) {
      setErro(validacao);
      return;
    }

    const hoje = getHojeParts();

    const itens = [
      { descricao: "Conta corrente", valor: contaCorrente || "R$ 0,00" },
      { descricao: "Cartão", valor: cartao || "R$ 0,00" },
      { descricao: "Dívida consolidada", valor: dividaConsolidada || "R$ 0,00" },
      { descricao: "Honras e Avais / Prejuízo", valor: honras || "R$ 0,00" },
      { descricao: labelOutros || "Outros", valor: outros || "R$ 0,00" },
      ...extras.map((item) => ({
        descricao: item.descricao || "Novo item",
        valor: item.valor || "R$ 0,00",
      })),
    ];

    await gerarPdfAutorizacaoDebito({
      cidade: cidadeAtendimento,
      dia: hoje.dia,
      mes: hoje.mes,
      ano: hoje.ano,
      nome,
      cpf: formatCpfView(cpf),
      conta: contaAssociado,
      itens,
      total: fmtBRL(total),
      valorSistema: valorSistema || "R$ 0,00",
      acrescimo: acrescimo || "R$ 0,00",
      reduzir,
      cancelar,
    });
  };

  const labelClass =
    "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";
  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10";
  const moneyInputClass = `${inputClass} text-right`;
  const readOnlyMoneyClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-right text-sm text-slate-700 shadow-sm outline-none";
  const sectionClass =
    "mx-5 mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const sectionTitleClass =
    "mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-[#00AE9D]";

  return (
    <div className="min-w-0 mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white pb-5 shadow-sm">
      <SearchForm
        onSearch={onBuscar}
        className="border-b border-emerald-100 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/20 p-5"
      >
        <div>
          <label className={labelClass}>
            CPF associado
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF do associado"
              className="h-10 rounded-xl border-slate-200 text-sm shadow-sm focus:border-[#00AE9D] focus:ring-[#00AE9D]/10"
              inputMode="numeric"
              maxLength={14}
            />
            <button
              type="submit"
              disabled={loadingBuscar}
              className="h-10 rounded-xl bg-secondary px-4 font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {loadingBuscar ? "Buscando..." : "Pesquisar"}
            </button>
          </div>

          {erro && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {erro}
            </div>
          )}

          {info && !erro && (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {info}
            </div>
          )}
        </div>
      </SearchForm>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Dados do associado</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-9">
          <label className={labelClass}>
            Nome associado
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Conta
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            {contaManual ? (
              <input
                value={contaAssociado}
                onChange={(e) => setContaAssociado(e.target.value)}
                className={inputClass}
                placeholder="Digite a conta corrente"
              />
            ) : (
              <select
                value={contaAssociado}
                onChange={(e) => setContaAssociado(e.target.value)}
                className={inputClass}
              >
                <option value="">
                  {contasCorrentes.length > 0
                    ? "Selecione a conta"
                    : "Pesquise o CPF"}
                </option>

                {contasCorrentes.map((conta) => (
                  <option key={conta} value={conta}>
                    {conta}
                  </option>
                ))}
              </select>
            )}

            {contasCorrentes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setContaManual((prev) => !prev);
                  setContaAssociado("");
                }}
                className="h-10 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {contaManual ? "Usar lista" : "Manual"}
              </button>
            )}
          </div>
        </div>

        </div>
      </div>

      <div className="mx-5 mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className={sectionTitleClass}>
            Débitos
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <CampoMoeda
              label="Conta corrente"
              value={contaCorrente}
              setValue={setContaCorrente}
            />
            <CampoMoeda label="Cartão" value={cartao} setValue={setCartao} />
            <CampoMoeda
              label="Dívida Consolidada"
              value={dividaConsolidada}
              setValue={setDividaConsolidada}
            />
            <CampoMoeda
              label="Honras e Avais / Prejuízo"
              value={honras}
              setValue={setHonras}
            />

            <div>
              <label className={labelClass}>
                Descrição do campo adicional base
              </label>
              <input
                value={labelOutros}
                onChange={(e) => setLabelOutros(e.target.value)}
                className={inputClass}
              />
            </div>

            <CampoMoeda
              label={labelOutros || "Outros"}
              value={outros}
              setValue={setOutros}
            />

            {extras.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-dashed border-[#00AE9D]/30 bg-[#00AE9D]/5 p-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <label className={labelClass}>
                      Descrição adicional {index + 1}
                    </label>
                    <input
                      value={item.descricao}
                      onChange={(e) =>
                        atualizarExtra(item.id, "descricao", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className={labelClass}>
                      Valor
                    </label>
                    <input
                      value={item.valor}
                      onChange={(e) =>
                        atualizarExtra(
                          item.id,
                          "valor",
                          monetizarDigitacao(e.target.value)
                        )
                      }
                      className={moneyInputClass}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={adicionarExtra}
                className="h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Adicionar
              </button>

              <button
                type="button"
                onClick={removerUltimoExtra}
                className="h-10 rounded-xl border border-fourth/30 bg-fourth/10 px-4 text-sm font-semibold text-fourth shadow-sm transition hover:bg-fourth hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className={sectionTitleClass}>
              Limites
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelClass}>
                  Reduzir
                </label>
                <input
                  value={reduzir}
                  onChange={(e) => setReduzir(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Cancelar
                </label>
                <input
                  value={cancelar}
                  onChange={(e) => setCancelar(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className={sectionTitleClass}>
              Detalhamento no Sistema
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <CampoMoeda
                label="Valor do Sistema"
                value={valorSistema}
                setValue={setValorSistema}
              />
              <CampoMoeda
                label="Acréscimo"
                value={acrescimo}
                setValue={setAcrescimo}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Fechamento da autorização</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>
            Total
          </label>
          <input
            readOnly
            value={fmtBRL(total)}
            className={readOnlyMoneyClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Cidade do atendimento
          </label>
          <select
            value={cidadeAtendimento}
            onChange={(e) => setCidadeAtendimento(e.target.value)}
            className={inputClass}
          >
            <option value=""></option>
            {!cidadeAtendimentoEstaNaLista && cidadeAtendimento && (
              <option value={cidadeAtendimento}>{cidadeAtendimento}</option>
            )}
            {cidades.map((cidade) => (
              <option key={cidade.ID_CIDADES} value={cidade.NM_CIDADE}>
                {cidade.NM_CIDADE}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      <div className="mx-5 mt-5 flex items-center justify-end border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleGerarPdf}
          disabled={!formularioValido}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition
    ${formularioValido
              ? "bg-secondary hover:bg-primary cursor-pointer"
              : "bg-slate-300 cursor-not-allowed"
            }`}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

type CampoMoedaProps = {
  label: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
};

function CampoMoeda({ label, value, setValue }: CampoMoedaProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => setValue(monetizarDigitacao(e.target.value))}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/10"
        placeholder="R$ 0,00"
      />
    </div>
  );
}
