"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfFormularioDps } from "@/lib/pdf/gerarPdfFormularioDps";

type EstadoCivil =
  | ""
  | "CASADO"
  | "DIVORCIADO"
  | "SEPARADO"
  | "SOLTEIRO"
  | "UNIAO ESTAVEL"
  | "VIUVO";

type Sexo = "" | "feminino" | "masculino";
type SimNao = "" | "sim" | "nao";
type TipoDiabetes = "" | "tipo1" | "tipo2" | "gestacional";
type TipoHepatite = "" | "a" | "b" | "c";

type DoencaKey =
  | "tumor"
  | "doenca_coronaria"
  | "avc"
  | "diabetes"
  | "bronquite"
  | "enfisema"
  | "hepatite"
  | "arritmia"
  | "insuficiencia_cardiaca"
  | "hipercolesterolemia"
  | "hipertrigliceridemia"
  | "sincopes"
  | "hipertensao"
  | "renal";

type DoencasState = Record<DoencaKey, SimNao>;

const DOENCAS_CONFIG: Array<{ key: DoencaKey; label: string }> = [
  { key: "tumor", label: "Tumor ou câncer?" },
  { key: "doenca_coronaria", label: "Doença coronária?" },
  { key: "avc", label: "Acidente vascular cerebral (derrame cerebral)?" },
  { key: "diabetes", label: "Diabetes?" },
  { key: "bronquite", label: "Bronquite?" },
  { key: "enfisema", label: "Enfisema?" },
  { key: "hepatite", label: "Hepatites?" },
  { key: "arritmia", label: "Arritmia?" },
  { key: "insuficiencia_cardiaca", label: "Insuficiência cardíaca?" },
  { key: "hipercolesterolemia", label: "Hipercolesterolemia (colesterol elevado)?" },
  { key: "hipertrigliceridemia", label: "Hipertrigliceridemia (triglicerídeos elevados)?" },
  { key: "sincopes", label: "Síncope (desmaios)?" },
  { key: "hipertensao", label: "Hipertensão?" },
  { key: "renal", label: "Doença Renal / Hemodiálise?" },
];

const initialDoencas: DoencasState = {
  tumor: "",
  doenca_coronaria: "",
  avc: "",
  diabetes: "",
  bronquite: "",
  enfisema: "",
  hepatite: "",
  arritmia: "",
  insuficiencia_cardiaca: "",
  hipercolesterolemia: "",
  hipertrigliceridemia: "",
  sincopes: "",
  hipertensao: "",
  renal: "",
};

function formatTelefone(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function toBrFromIso(value?: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

export function FormularioDpsForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [sexo, setSexo] = useState<Sexo>("");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>("");
  const [nascimento, setNascimento] = useState("");
  const [documento, setDocumento] = useState("");
  const [orgaoExpedidor, setOrgaoExpedidor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [email, setEmail] = useState("");
  const [cidadeAtendimento, setCidadeAtendimento] = useState("");
  const [diaAtendimento, setDiaAtendimento] = useState(hojeBR());

  const [doencas, setDoencas] = useState<DoencasState>(initialDoencas);
  const [tipoDiabetes, setTipoDiabetes] = useState<TipoDiabetes>("");
  const [tipoHepatite, setTipoHepatite] = useState<TipoHepatite>("");

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    const r = await buscar(cpf);

    if (r.found) {
      setNome(r.data.nome || "");
      setDocumento(r.data.rg || "");
      setRua(r.data.rua || r.data.endereco || "");
      setBairro(r.data.bairro || "");
      setCidade(r.data.cidade || "");
      setEstado(r.data.uf || "");
      setCep(formatCep(r.data.cep || ""));
      setEmail("");
    }
  };

  const assinaturaAssociado = useMemo(() => nome || "Assinatura do Proponente Principal", [nome]);

  function setRespostaDoenca(key: DoencaKey, value: SimNao) {
    setDoencas((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === "diabetes" && value !== "sim") {
      setTipoDiabetes("");
    }

    if (key === "hepatite" && value !== "sim") {
      setTipoHepatite("");
    }
  }

  const gerar = async () => {
    await gerarPdfFormularioDps({
      cpf: formatCpfView(cpf),
      nome,
      sexo,
      estadoCivil,
      nascimento: toBrFromIso(nascimento),
      documento,
      orgaoExpedidor,
      telefone,
      rua,
      bairro,
      cidade,
      estado,
      cep,
      email,
      doencas,
      tipoDiabetes,
      tipoHepatite,
      cidadeAtendimento,
      diaAtendimento,
      assinaturaAssociado,
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          CPF do associado
        </label>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={formatCpfView(cpf)}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="CPF (somente números)"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />
          <button
            onClick={onBuscar}
            disabled={loading}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
          >
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {erro && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {erro}
          </div>
        )}

        {info && (
          <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
            {info}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do associado
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Estado civil
          </label>
          <select
            value={estadoCivil}
            onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
            className="w-full border px-3 py-2 rounded bg-white"
          >
            <option value="">Selecione</option>
            <option value="CASADO">CASADO</option>
            <option value="DIVORCIADO">DIVORCIADO</option>
            <option value="SEPARADO">SEPARADO</option>
            <option value="SOLTEIRO">SOLTEIRO</option>
            <option value="UNIAO ESTAVEL">UNIÃO ESTÁVEL</option>
            <option value="VIUVO">VIÚVO</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Sexo
          </label>

          <div className="grid grid-cols-2 gap-3 rounded border px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="sexo"
                checked={sexo === "feminino"}
                onChange={() => setSexo("feminino")}
              />
              Feminino
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="sexo"
                checked={sexo === "masculino"}
                onChange={() => setSexo("masculino")}
              />
              Masculino
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nascimento
          </label>
          <input
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Celular / telefone
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            className="w-full border px-3 py-2 rounded"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nº doc. identificação
          </label>
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Órgão expedidor
          </label>
          <input
            value={orgaoExpedidor}
            onChange={(e) => setOrgaoExpedidor(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Endereço de correspondência
          </label>
          <input
            value={rua}
            onChange={(e) => setRua(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Bairro
          </label>
          <input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cidade
          </label>
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Estado
          </label>
          <input
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CEP
          </label>
          <input
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            className="w-full border px-3 py-2 rounded"
            placeholder="00000-000"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          E-mail
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div className="mt-6">
        <div className="border rounded overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800 text-center">
              DECLARAÇÃO PESSOAL DE SAÚDE E ATIVIDADES
            </h3>
          </div>

          <div className="px-4 py-4 space-y-4">
            {DOENCAS_CONFIG.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="text-sm text-gray-800">
                  {item.label}

                  {item.key === "diabetes" && doencas.diabetes === "sim" && (
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_diabetes"
                          checked={tipoDiabetes === "tipo1"}
                          onChange={() => setTipoDiabetes("tipo1")}
                        />
                        Tipo 1
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_diabetes"
                          checked={tipoDiabetes === "tipo2"}
                          onChange={() => setTipoDiabetes("tipo2")}
                        />
                        Tipo 2
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_diabetes"
                          checked={tipoDiabetes === "gestacional"}
                          onChange={() => setTipoDiabetes("gestacional")}
                        />
                        Gestacional
                      </label>
                    </div>
                  )}

                  {item.key === "hepatite" && doencas.hepatite === "sim" && (
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_hepatite"
                          checked={tipoHepatite === "a"}
                          onChange={() => setTipoHepatite("a")}
                        />
                        A
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_hepatite"
                          checked={tipoHepatite === "b"}
                          onChange={() => setTipoHepatite("b")}
                        />
                        B
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipo_hepatite"
                          checked={tipoHepatite === "c"}
                          onChange={() => setTipoHepatite("c")}
                        />
                        C
                      </label>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name={item.key}
                    checked={doencas[item.key] === "sim"}
                    onChange={() => setRespostaDoenca(item.key, "sim")}
                  />
                  Sim
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name={item.key}
                    checked={doencas[item.key] === "nao"}
                    onChange={() => setRespostaDoenca(item.key, "nao")}
                  />
                  Não
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm text-gray-700 border rounded p-4 bg-gray-50">
        <p>
          Declaro, para os devidos fins e efeitos, estar ciente que, conforme os
          Artigos 765 e 766 do Código Civil Brasileiro, se estiver omitindo
          circunstâncias que influam na aceitação da proposta ou na taxa de prêmio,
          perderei o direito à indenização, além de estar obrigado ao pagamento do
          prêmio vencido.
        </p>
        <p>
          Declaro, também, que estou fazendo o seguro prestamista para isentar da
          apresentação de avalista e que, se o quiser poderei fazê-lo em qualquer
          momento, cessando o pagamento desse seguro.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cidade do atendimento
          </label>
          <input
            value={cidadeAtendimento}
            onChange={(e) => setCidadeAtendimento(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Cidade do atendimento"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Dia do atendimento
          </label>
          <input
            value={diaAtendimento}
            onChange={(e) => setDiaAtendimento(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="dd/mm/aaaa"
          />
        </div>
      </div>

      <div className="mt-6 border rounded p-4 bg-white">
        <div className="space-y-5 text-sm text-gray-700">
          <div>
            <div className="border-b border-gray-400 w-full mb-2" />
            <p className="text-center">{assinaturaAssociado}</p>
          </div>

          <div>
            <div className="border-b border-gray-400 w-full mb-2" />
            <p className="text-center">Validação</p>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t mt-6 flex items-center justify-end">
        <button
          onClick={gerar}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}