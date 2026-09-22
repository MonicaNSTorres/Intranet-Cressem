"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaFilePdf, FaSave } from "react-icons/fa";
import {
  atualizarTermoMensalCaixa,
  criarTermoMensalCaixa,
  listarPAsTermoMensalCaixa,
  obterTermoMensalCaixaPorId,
  PAOption,
} from "@/services/termos_mensais_caixa.service";
import { gerarPdfTermoMensalCaixa } from "@/lib/pdf/gerarPdfTermoMensalCaixa";

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function competenciaAtual() {
  const hoje = new Date();

  return {
    ano: String(hoje.getFullYear()),
    mes: String(hoje.getMonth() + 1).padStart(2, "0"),
  };
}

function anosDisponiveis() {
  const anoAtual = new Date().getFullYear();

  return Array.from({ length: 8 }, (_, index) => String(anoAtual - index));
}

function parseValor(value: string) {
  if (!value) return 0;

  return (
    Number(
      value
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
    ) || 0
  );
}

function formatarMoedaDigitacao(value: string) {
  const somenteNumeros = value.replace(/\D/g, "");

  if (!somenteNumeros) return "";

  const numero = Number(somenteNumeros) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarValorCarregado(value?: number) {
  if (!value) return "";

  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type TermoMensalCaixaFormProps = {
  id?: number;
};

export function TermoMensalCaixaForm({ id }: TermoMensalCaixaFormProps) {
  const router = useRouter();
  const atual = competenciaAtual();

  const [mes, setMes] = useState(atual.mes);
  const [ano, setAno] = useState(atual.ano);
  const [pa, setPa] = useState("");
  const [pas, setPas] = useState<PAOption[]>([]);
  const [dataTermo, setDataTermo] = useState("");

  const [responsavel, setResponsavel] = useState("");
  const [tesoureiro, setTesoureiro] = useState("");
  const [diretorFinanceiro, setDiretorFinanceiro] = useState("");
  const [gerente, setGerente] = useState("");

  const [cedulaTesouraria, setCedulaTesouraria] = useState("");
  const [moedaTesouraria, setMoedaTesouraria] = useState("");

  const [cedulaCaixa1, setCedulaCaixa1] = useState("");
  const [moedaCaixa1, setMoedaCaixa1] = useState("");

  const [cedulaCaixa2, setCedulaCaixa2] = useState("");
  const [moedaCaixa2, setMoedaCaixa2] = useState("");

  const [cedulaCaixa3, setCedulaCaixa3] = useState("");
  const [moedaCaixa3, setMoedaCaixa3] = useState("");

  const [cedulaCaixa4, setCedulaCaixa4] = useState("");
  const [moedaCaixa4, setMoedaCaixa4] = useState("");

  const [cedulaAtm63, setCedulaAtm63] = useState("");
  const [moedaAtm63, setMoedaAtm63] = useState("");

  const [cedulaAtm64, setCedulaAtm64] = useState("");
  const [moedaAtm64, setMoedaAtm64] = useState("");

  const [cedulaAtm, setCedulaAtm] = useState("");
  const [moedaAtm, setMoedaAtm] = useState("");

  const [cedulaTesoureiroEletronico, setCedulaTesoureiroEletronico] =
    useState("");
  const [moedaTesoureiroEletronico, setMoedaTesoureiroEletronico] =
    useState("");

  const [observacao, setObservacao] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const competencia = `${ano}-${mes}`;

  const totalGeral =
    parseValor(cedulaTesouraria) +
    parseValor(moedaTesouraria) +
    parseValor(cedulaCaixa1) +
    parseValor(moedaCaixa1) +
    parseValor(cedulaCaixa2) +
    parseValor(moedaCaixa2) +
    parseValor(cedulaCaixa3) +
    parseValor(moedaCaixa3) +
    parseValor(cedulaCaixa4) +
    parseValor(moedaCaixa4) +
    parseValor(cedulaAtm63) +
    parseValor(moedaAtm63) +
    parseValor(cedulaAtm64) +
    parseValor(moedaAtm64) +
    parseValor(cedulaAtm) +
    parseValor(moedaAtm) +
    parseValor(cedulaTesoureiroEletronico) +
    parseValor(moedaTesoureiroEletronico);

  useEffect(() => {
    async function carregarPAs() {
      try {
        const response = await listarPAsTermoMensalCaixa();
        setPas(response.data || []);
      } catch (error) {
        console.error(error);
      }
    }

    carregarPAs();
  }, []);

  useEffect(() => {
    async function carregarTermo() {
      if (!id) return;

      try {
        setCarregando(true);
        setErroFormulario("");

        const response = await obterTermoMensalCaixaPorId(id);
        const termo = response.data;
        const dados = termo.DS_DADOS_FORMULARIO;

        if (termo.DT_COMPETENCIA?.includes("-")) {
          const [anoBanco, mesBanco] = termo.DT_COMPETENCIA.split("-");
          setAno(anoBanco);
          setMes(mesBanco);
        }

        setPa(termo.NM_PA || "");
        setDataTermo(dados?.dataTermo || "");
        setResponsavel(dados?.responsavel || "");
        setTesoureiro(dados?.tesoureiro || "");
        setDiretorFinanceiro(dados?.diretorFinanceiro || "");
        setGerente(dados?.gerente || "");
        setObservacao(dados?.observacao || "");

        setCedulaTesouraria(
          formatarValorCarregado(dados?.valores?.cedulaTesouraria)
        );
        setMoedaTesouraria(
          formatarValorCarregado(dados?.valores?.moedaTesouraria)
        );

        setCedulaCaixa1(formatarValorCarregado(dados?.valores?.cedulaCaixa1));
        setMoedaCaixa1(formatarValorCarregado(dados?.valores?.moedaCaixa1));

        setCedulaCaixa2(formatarValorCarregado(dados?.valores?.cedulaCaixa2));
        setMoedaCaixa2(formatarValorCarregado(dados?.valores?.moedaCaixa2));

        setCedulaCaixa3(formatarValorCarregado(dados?.valores?.cedulaCaixa3));
        setMoedaCaixa3(formatarValorCarregado(dados?.valores?.moedaCaixa3));

        setCedulaCaixa4(formatarValorCarregado(dados?.valores?.cedulaCaixa4));
        setMoedaCaixa4(formatarValorCarregado(dados?.valores?.moedaCaixa4));

        setCedulaAtm63(formatarValorCarregado(dados?.valores?.cedulaAtm63));
        setMoedaAtm63(formatarValorCarregado(dados?.valores?.moedaAtm63));

        setCedulaAtm64(formatarValorCarregado(dados?.valores?.cedulaAtm64));
        setMoedaAtm64(formatarValorCarregado(dados?.valores?.moedaAtm64));

        setCedulaAtm(formatarValorCarregado(dados?.valores?.cedulaAtm));
        setMoedaAtm(formatarValorCarregado(dados?.valores?.moedaAtm));

        setCedulaTesoureiroEletronico(
          formatarValorCarregado(
            dados?.valores?.cedulaTesoureiroEletronico
          )
        );
        setMoedaTesoureiroEletronico(
          formatarValorCarregado(
            dados?.valores?.moedaTesoureiroEletronico
          )
        );
      } catch (error: any) {
        setErroFormulario(
          error?.message || "Erro ao carregar termo mensal caixa."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarTermo();
  }, [id]);

  function montarDadosFormulario() {
    return {
      dataTermo,
      responsavel,
      tesoureiro,
      diretorFinanceiro,
      gerente,
      valores: {
        cedulaTesouraria: parseValor(cedulaTesouraria),
        moedaTesouraria: parseValor(moedaTesouraria),
        cedulaCaixa1: parseValor(cedulaCaixa1),
        moedaCaixa1: parseValor(moedaCaixa1),
        cedulaCaixa2: parseValor(cedulaCaixa2),
        moedaCaixa2: parseValor(moedaCaixa2),
        cedulaCaixa3: parseValor(cedulaCaixa3),
        moedaCaixa3: parseValor(moedaCaixa3),
        cedulaCaixa4: parseValor(cedulaCaixa4),
        moedaCaixa4: parseValor(moedaCaixa4),
        cedulaAtm63: parseValor(cedulaAtm63),
        moedaAtm63: parseValor(moedaAtm63),
        cedulaAtm64: parseValor(cedulaAtm64),
        moedaAtm64: parseValor(moedaAtm64),
        cedulaAtm: parseValor(cedulaAtm),
        moedaAtm: parseValor(moedaAtm),
        cedulaTesoureiroEletronico: parseValor(cedulaTesoureiroEletronico),
        moedaTesoureiroEletronico: parseValor(moedaTesoureiroEletronico),
        totalGeral,
      },
      observacao,
    };
  }

  function validarCampos() {
    if (!pa.trim()) return "Informe o PA.";
    if (!dataTermo.trim()) return "Informe a data do termo.";
    if (!responsavel.trim()) return "Informe o responsável.";
    return null;
  }

  async function salvar() {
    try {
      const erro = validarCampos();

      if (erro) {
        setErroFormulario(erro);
        return;
      }

      setLoading(true);
      setErroFormulario("");

      if (id) {
        await atualizarTermoMensalCaixa(id, {
          competencia,
          pa,
          dadosFormulario: montarDadosFormulario(),
          status: "RASCUNHO",
          usuarioAtualizacao: "INTRANET",
        });
      } else {
        await criarTermoMensalCaixa({
          competencia,
          pa,
          dadosFormulario: montarDadosFormulario(),
          status: "RASCUNHO",
          usuarioCriacao: "INTRANET",
        });
      }

      router.replace("/auth/termos_mensais_caixa");
    } catch (error: any) {
      setErroFormulario(error?.message || "Erro ao salvar termo mensal caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function gerarPdf() {
    const erro = validarCampos();

    if (erro) {
      setErroFormulario(erro);
      return;
    }

    setErroFormulario("");

    await gerarPdfTermoMensalCaixa({
      competencia,
      pa,
      dataTermo,
      responsavel,
      tesoureiro,
      diretorFinanceiro,
      gerente,
      valores: montarDadosFormulario().valores,
      observacao,
    });
  }

  const mensagem = erroFormulario;

  if (carregando) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Carregando dados do termo...
      </div>
    );
  }

  return (
    <div className="mx-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      {mensagem && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Mês
          </label>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            {meses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Ano
          </label>
          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            {anosDisponiveis().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            PA
          </label>
          <select
            value={pa}
            onChange={(e) => setPa(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">Selecione o PA</option>

            {pas.map((item) => (
              <option key={item.ID_PA_ATUALIZADA} value={item.NM_FANTASIA}>
                {item.NR_PA} - {item.NM_FANTASIA}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Data do termo
          </label>
          <input
            type="date"
            value={dataTermo}
            onChange={(e) => setDataTermo(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
          />
        </div>
      </div>

      <div className="mt-6 border-t pt-6">
        <h2 className="text-base font-semibold text-gray-900">
          Responsáveis
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            placeholder="Responsável"
          />

          <input
            value={tesoureiro}
            onChange={(e) => setTesoureiro(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            placeholder="Tesoureiro"
          />

          <input
            value={diretorFinanceiro}
            onChange={(e) => setDiretorFinanceiro(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            placeholder="Diretor Financeiro"
          />

          <input
            value={gerente}
            onChange={(e) => setGerente(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            placeholder="Gerente"
          />
        </div>
      </div>

      <div className="mt-6 border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Valores da conferência
          </h2>

          <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            Total:{" "}
            {totalGeral.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Local</th>
                <th className="px-4 py-3 text-left">Cédulas</th>
                <th className="px-4 py-3 text-left">Moedas</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {[
                [
                  "Tesouraria",
                  cedulaTesouraria,
                  setCedulaTesouraria,
                  moedaTesouraria,
                  setMoedaTesouraria,
                ],
                [
                  "Caixa 1",
                  cedulaCaixa1,
                  setCedulaCaixa1,
                  moedaCaixa1,
                  setMoedaCaixa1,
                ],
                [
                  "Caixa 2",
                  cedulaCaixa2,
                  setCedulaCaixa2,
                  moedaCaixa2,
                  setMoedaCaixa2,
                ],
                [
                  "Caixa 3",
                  cedulaCaixa3,
                  setCedulaCaixa3,
                  moedaCaixa3,
                  setMoedaCaixa3,
                ],
                [
                  "Caixa 4",
                  cedulaCaixa4,
                  setCedulaCaixa4,
                  moedaCaixa4,
                  setMoedaCaixa4,
                ],
                [
                  "ATM 63",
                  cedulaAtm63,
                  setCedulaAtm63,
                  moedaAtm63,
                  setMoedaAtm63,
                ],
                [
                  "ATM 64",
                  cedulaAtm64,
                  setCedulaAtm64,
                  moedaAtm64,
                  setMoedaAtm64,
                ],
                ["ATM", cedulaAtm, setCedulaAtm, moedaAtm, setMoedaAtm],
                [
                  "Tesoureiro Eletrônico",
                  cedulaTesoureiroEletronico,
                  setCedulaTesoureiroEletronico,
                  moedaTesoureiroEletronico,
                  setMoedaTesoureiroEletronico,
                ],
              ].map(([label, cedula, setCedula, moeda, setMoeda]: any) => (
                <tr key={label}>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {label}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      value={cedula}
                      onChange={(e) =>
                        setCedula(formatarMoedaDigitacao(e.target.value))
                      }
                      className="h-10 w-full rounded-xl border border-gray-300 px-3 text-right text-sm"
                      placeholder="0,00"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      value={moeda}
                      onChange={(e) =>
                        setMoeda(formatarMoedaDigitacao(e.target.value))
                      }
                      className="h-10 w-full rounded-xl border border-gray-300 px-3 text-right text-sm"
                      placeholder="0,00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Observação
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-gray-300 px-3 py-3 text-sm"
          placeholder="Observações adicionais sobre a conferência."
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/auth/termos_mensais_caixa")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700"
        >
          <FaArrowLeft size={12} />
          Voltar
        </button>

        {/*<button
          type="button"
          onClick={gerarPdf}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <FaFilePdf size={12} />
          Gerar PDF
        </button>*/}

        <button
          type="button"
          onClick={salvar}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white hover:bg-primary disabled:bg-gray-300"
        >
          <FaSave size={12} />
          {loading ? "Salvando..." : id ? "Salvar alterações" : "Salvar"}
        </button>
      </div>
    </div>
  );
}