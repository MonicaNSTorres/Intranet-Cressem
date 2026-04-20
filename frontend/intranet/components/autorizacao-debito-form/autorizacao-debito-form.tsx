"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { formatCpfView, fmtBRL, monetizarDigitacao, onlyDigits, parseBRL } from "@/utils/br";
import {
  buscarAssociadoAutorizacaoDebito,
  listarCidadesAutorizacaoDebito,
  type CidadeOption,
} from "@/services/autorizacao_debito.service";
import { gerarPdfAutorizacaoDebito } from "@/lib/pdf/gerarPdfAutorizacaoDebito";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

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

export function AutorizacaoDebitoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [contaAssociado, setContaAssociado] = useState("");

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

  const onBuscar = async () => {
    setErro("");
    setInfo("");

    const clean = onlyDigits(cpf);

    if (!clean) {
      setErro("CPF do associado não preenchido.");
      return;
    }

    try {
      setLoadingBuscar(true);

      const associado = await buscarAssociadoAutorizacaoDebito(clean);

      if (!associado?.found) {
        setErro("Associado não encontrado.");
        return;
      }

      setNome(associado.nome || "");
      setInfo("Dados do associado carregados com sucesso.");
    } catch (e: any) {
      setErro(e?.message || "Não foi possível buscar o associado.");
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

  return (
    <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
      <SearchForm onSearch={onBuscar}>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            CPF associado
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF do associado"
              className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              inputMode="numeric"
              maxLength={14}
            />
            <SearchButton loading={loadingBuscar} label="Pesquisar" />
          </div>

          {erro && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {info && !erro && (
            <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {info}
            </div>
          )}
        </div>
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-9">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nome associado
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Conta
          </label>
          <input
            value={contaAssociado}
            onChange={(e) => setContaAssociado(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded border p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">
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
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descrição do campo adicional base
              </label>
              <input
                value={labelOutros}
                onChange={(e) => setLabelOutros(e.target.value)}
                className="w-full rounded border px-3 py-2"
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
                className="rounded border border-dashed border-gray-300 p-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Descrição adicional {index + 1}
                    </label>
                    <input
                      value={item.descricao}
                      onChange={(e) =>
                        atualizarExtra(item.id, "descricao", e.target.value)
                      }
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
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
                      className="w-full rounded border px-3 py-2 text-right"
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
                className="rounded border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Adicionar
              </button>

              <button
                type="button"
                onClick={removerUltimoExtra}
                className="rounded border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded border p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">
              Limites
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Reduzir
                </label>
                <input
                  value={reduzir}
                  onChange={(e) => setReduzir(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Cancelar
                </label>
                <input
                  value={cancelar}
                  onChange={(e) => setCancelar(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded border p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">
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

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Total
          </label>
          <input
            readOnly
            value={fmtBRL(total)}
            className="w-full rounded border bg-gray-50 px-3 py-2 text-right"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cidade do atendimento
          </label>
          <select
            value={cidadeAtendimento}
            onChange={(e) => setCidadeAtendimento(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value=""></option>
            {cidades.map((cidade) => (
              <option key={cidade.ID_CIDADES} value={cidade.NM_CIDADE}>
                {cidade.NM_CIDADE}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 border-t pt-5 flex items-center justify-end">
        <button
          onClick={handleGerarPdf}
          className="inline-flex items-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary"
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
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => setValue(monetizarDigitacao(e.target.value))}
        className="w-full rounded border px-3 py-2 text-right"
        placeholder="R$ 0,00"
      />
    </div>
  );
}