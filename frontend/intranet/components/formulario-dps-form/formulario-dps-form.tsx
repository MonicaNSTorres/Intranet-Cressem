"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfFormularioDps } from "@/lib/pdf/gerarPdfFormularioDps";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { buscarCidadesResgate } from "@/services/resgate_capital.service";

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

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

const labelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={labelClass}>{children}</label>;
}

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

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
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
  const [cidadesAtendimento, setCidadesAtendimento] = useState<{ value: string; label: string }[]>([]);
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

    console.log("RETORNO BUSCA ASSOCIADO:", r);

    if (r.found) {
      const data = r.data as any;

      console.log("DATA ASSOCIADO:", data);

      setNome(data.nome || "");
      setNascimento(toDateInput(data.nascimento || ""));

      setDocumento(data.documento || data.rg || "");
      setOrgaoExpedidor(data.orgao || "");

      setTelefone(formatTelefone(data.telefone || ""));

      setRua(data.rua || data.endereco || "");
      setBairro(data.bairro || "");
      setCidade(data.cidade || "");
      setEstado(data.uf || "");
      setCep(formatCep(data.cep || ""));

      setEmail(data.email || "");

      if (data.cidade) {
        setCidadeAtendimento(data.cidade);
      }
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

  useEffect(() => {
    async function carregarCidadesAtendimento() {
      try {
        const lista = await buscarCidadesResgate(); // [{ ID_CIDADES, ID_UF, NM_CIDADE }]
        const opcoes = (lista || [])
          .map((c: any) => {
            const nome = String(c.NM_CIDADE || "").trim();
            return { value: nome, label: nome };
          })
          .filter((c) => c.value.length > 0);

        setCidadesAtendimento(opcoes);
      } catch (e) {
        console.error("Erro ao carregar cidades de atendimento:", e);
        setCidadesAtendimento([]);
      }
    }

    carregarCidadesAtendimento();
  }, []);

  const formularioValido = useMemo(() => {
    const cpfValido = cpf.replace(/\D/g, "").length === 11;

    if (!cpfValido) return false;
    if (!nome.trim()) return false;
    if (!estadoCivil) return false;
    if (!sexo) return false;
    if (!nascimento) return false;
    if (!documento.trim()) return false;
    if (!orgaoExpedidor.trim()) return false;
    if (!telefone.trim()) return false;
    if (telefone.replace(/\D/g, "").length < 10) return false;
    if (!rua.trim()) return false;
    if (!bairro.trim()) return false;
    if (!cidade.trim()) return false;
    if (!estado.trim()) return false;
    if (!cep.trim()) return false;
    if (cep.replace(/\D/g, "").length !== 8) return false;
    if (!email.trim()) return false;

    if (!cidadeAtendimento.trim()) return false;
    if (!diaAtendimento.trim()) return false;

    return true;
  }, [
    cpf,
    nome,
    estadoCivil,
    sexo,
    nascimento,
    documento,
    orgaoExpedidor,
    telefone,
    rua,
    bairro,
    cidade,
    estado,
    cep,
    email,
    cidadeAtendimento,
    diaAtendimento,
  ]);


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
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SectionCard
          title="Consulta do associado"
          description="Busque pelo CPF para carregar os dados disponíveis e ajuste manualmente quando necessário."
        >
          <SearchForm onSearch={onBuscar}>
            <div>
              <FieldLabel>CPF do associado</FieldLabel>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <SearchInput
                  value={formatCpfView(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="CPF (somente números)"
                  className={fieldClass}
                  inputMode="numeric"
                  maxLength={14}
                />
                <SearchButton loading={loading} label="Pesquisar" />
              </div>

              {erro && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              {info && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}
            </div>
          </SearchForm>
        </SectionCard>

        <SectionCard
          title="Dados pessoais"
          description="Informações do proponente principal para preenchimento do termo."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Nome do associado</FieldLabel>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>Estado civil</FieldLabel>
              <select
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
                className={fieldClass}
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

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <FieldLabel>Sexo</FieldLabel>
              <div className="grid h-10 grid-cols-2 gap-3 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="sexo"
                    checked={sexo === "feminino"}
                    onChange={() => setSexo("feminino")}
                  />
                  Feminino
                </label>

                <label className="flex items-center gap-2">
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
              <FieldLabel>Nascimento</FieldLabel>
              <input
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>Celular / telefone</FieldLabel>
              <input
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                className={fieldClass}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Documento e contato">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Nº doc. identificação</FieldLabel>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>Órgão expedidor</FieldLabel>
              <input
                value={orgaoExpedidor}
                onChange={(e) => setOrgaoExpedidor(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>E-mail</FieldLabel>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
        </SectionCard>

        <SectionCard title="Endereço de correspondência">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Endereço de correspondência</FieldLabel>
              <input
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>Bairro</FieldLabel>
              <input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <FieldLabel>Cidade</FieldLabel>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>Estado</FieldLabel>
              <input
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <FieldLabel>CEP</FieldLabel>
              <input
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                className={fieldClass}
                placeholder="00000-000"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Declaração pessoal de saúde e atividades"
          description="Preencha se houver informação do associado. Caso fique em branco, a impressão permanece disponível para preenchimento manual."
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="bg-slate-50 px-4 py-3">
              <h3 className="text-center text-sm font-bold text-slate-900">
                DECLARAÇÃO PESSOAL DE SAÚDE E ATIVIDADES
              </h3>
            </div>

            <div className="divide-y divide-slate-200">
              {DOENCAS_CONFIG.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="text-sm font-medium text-slate-800">
                    {item.label}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={item.key}
                        checked={doencas[item.key] === "sim"}
                        onChange={() => setRespostaDoenca(item.key, "sim")}
                      />
                      Sim
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={item.key}
                        checked={doencas[item.key] === "nao"}
                        onChange={() => setRespostaDoenca(item.key, "nao")}
                      />
                      Não
                    </label>

                    {item.key === "diabetes" && doencas.diabetes === "sim" && (
                      <div className="flex flex-wrap items-center gap-3 rounded-full bg-slate-50 px-3 py-1">
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
                      <div className="flex flex-wrap items-center gap-3 rounded-full bg-slate-50 px-3 py-1">
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
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Declarações e atendimento">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
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

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Cidade do atendimento</FieldLabel>
              <select
                value={cidadeAtendimento}
                onChange={(e) => setCidadeAtendimento(e.target.value)}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {cidadesAtendimento.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Dia do atendimento</FieldLabel>
              <input
                value={diaAtendimento}
                onChange={(e) => setDiaAtendimento(e.target.value)}
                className={fieldClass}
                placeholder="dd/mm/aaaa"
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={gerar}
            disabled={!formularioValido}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${
              formularioValido
                ? "cursor-pointer bg-primary hover:bg-fourth"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
