"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaChevronDown,
  FaPlus,
  FaSave,
  FaSearch,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import {
  buscarContratoPorId,
  buscarEmailsDoContratoSeparados,
  buscarFuncionarioPorEmail,
  cadastrarContratoEmpresa,
  carregarCidadesContrato,
  carregarEmailsFuncionarios,
  carregarSistemasConsignados,
  carregarTiposContrato,
  criarEmailContrato,
  editarContratoEmpresa,
  listarEmailContratoPorContrato,
  listarEmailContratoPorFuncionario,
  removerEmailContrato,
  type ContratoEmpresaPayload,
} from "@/services/cadastro_contratos.service";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

const inputBase =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const inputSelectable =
  "h-12 w-full rounded-xl border border-slate-300 bg-white pl-5 pr-11 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const selectBase =
  "h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-5 pr-11 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const nativeSelectBase =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const nativeDateBase =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  helper,
}: {
  label: string;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function SelectableFieldWrapper({
  children,
  icon = "search",
}: {
  children: React.ReactNode;
  icon?: "search" | "calendar" | "chevron";
}) {
  return (
    <div className="relative">
      {children}

      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon === "calendar" ? (
          <FaCalendarAlt size={14} />
        ) : icon === "chevron" ? (
          <FaChevronDown size={12} />
        ) : (
          <FaSearch size={13} />
        )}
      </span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary" | "success" | "info";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "bg-secondary text-white hover:bg-third",
    danger: "bg-red-600 text-white hover:bg-red-700",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    info: "bg-sky-600 text-white hover:bg-sky-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

type CadastroContratoFormProps = {
  contratoIdProp?: number | null;
  isModal?: boolean;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
};

export function CadastroContratoForm({
  contratoIdProp = null,
  isModal = false,
  onClose,
  onSaved,
}: CadastroContratoFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoIdFromUrl = searchParams.get("id");
  const contratoId = contratoIdProp ?? (contratoIdFromUrl ? Number(contratoIdFromUrl) : null);

  const modoEdicao = !!contratoId;

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contaCapital, setContaCapital] = useState("");
  const [tipoTempoContrato, setTipoTempoContrato] = useState("");
  const [cidade, setCidade] = useState("");
  const [contratoDigitado, setContratoDigitado] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [emailDigitado, setEmailDigitado] = useState("");
  const [listaEmail, setListaEmail] = useState("");
  const [observacao, setObservacao] = useState("");
  const [sistema, setSistema] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [ativo, setAtivo] = useState(false);

  const [cidades, setCidades] = useState<string[]>([]);
  const [contratos, setContratos] = useState<string[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function loadInicial() {
      try {
        setLoadingInicial(true);

        const [cidadesResp, contratosResp, emailsResp, sistemasResp] =
          await Promise.all([
            carregarCidadesContrato(),
            carregarTiposContrato(),
            carregarEmailsFuncionarios(),
            carregarSistemasConsignados(),
          ]);

        setCidades(cidadesResp || []);
        setContratos(contratosResp || []);
        setEmails(emailsResp || []);
        setSistemas(sistemasResp || []);

        if (modoEdicao && contratoId) {
          const contrato = await buscarContratoPorId(Number(contratoId));
          const emailsContrato = await buscarEmailsDoContratoSeparados(
            Number(contratoId)
          );

          setRazaoSocial(contrato.NM_EMPRESA || "");
          setCnpj(formatCnpj(contrato.NR_CNPJ || ""));
          setContaCapital(String(contrato.CD_CONTA_CAPITAL || ""));
          setTipoTempoContrato(contrato.NM_TIPO_TEMPO_CONTRATO || "");
          setCidade(contrato.NM_CIDADE || "");
          setTipoContrato(contrato.NM_TIPO_CONTRATO || "");
          setSistema(contrato.NM_SISTEMA_CONSIG || "");
          setDataInicio(String(contrato.DT_INICIO || "").slice(0, 10));
          setDataFinal(String(contrato.DT_FIM || "").slice(0, 10));
          setObservacao(contrato.OBS_CONTRATO || "");
          setListaEmail(emailsContrato || "");
          setAtivo(Number(contrato.SN_ATIVO || 0) === 1);
        }
      } catch (error: any) {
        console.error(error);
        setErro(
          error?.response?.data?.error ||
            "Não foi possível carregar os dados da tela."
        );
      } finally {
        setLoadingInicial(false);
      }
    }

    loadInicial();
  }, [modoEdicao, contratoId]);

  const mostrarDataFinal = useMemo(
    () => tipoTempoContrato === "DETERMINADO",
    [tipoTempoContrato]
  );

  function adicionarTipo() {
    const value = String(contratoDigitado || "").trim().toUpperCase();
    if (!value) return;

    if (!tipoContrato) {
      setTipoContrato(value);
    } else {
      setTipoContrato((prev) => `${prev}/${value}`);
    }

    setContratoDigitado("");
  }

  function removerTipo() {
    const barraIndex = tipoContrato.lastIndexOf("/");
    if (barraIndex !== -1) {
      setTipoContrato(tipoContrato.substring(0, barraIndex));
    } else {
      setTipoContrato("");
    }
  }

  function adicionarEmail() {
    const value = String(emailDigitado || "").trim();
    if (!value) return;

    if (!listaEmail) {
      setListaEmail(value);
    } else {
      setListaEmail((prev) => `${prev}/${value}`);
    }

    setEmailDigitado("");
  }

  function removerEmailDaLista() {
    const barraIndex = listaEmail.lastIndexOf("/");
    if (barraIndex !== -1) {
      setListaEmail(listaEmail.substring(0, barraIndex));
    } else {
      setListaEmail("");
    }
  }

  function limparCampos() {
    setRazaoSocial("");
    setCnpj("");
    setContaCapital("");
    setTipoTempoContrato("");
    setCidade("");
    setContratoDigitado("");
    setTipoContrato("");
    setEmailDigitado("");
    setListaEmail("");
    setObservacao("");
    setSistema("");
    setDataInicio("");
    setDataFinal("");
    setAtivo(false);
  }

  function validaCampos() {
    if (!razaoSocial.trim()) return "Preencha a razão social.";
    if (!cnpj.trim()) return "Preencha o CNPJ.";
    if (!contaCapital.trim()) return "Preencha a conta capital.";
    if (!tipoTempoContrato) return "Selecione o tipo de tempo de contrato.";
    if (!cidade.trim()) return "Selecione ou preencha a cidade.";
    if (!tipoContrato.trim()) return "Selecione o tipo de contrato.";
    if (!listaEmail.trim()) {
      return "Selecione pelo menos um e-mail para notificação.";
    }
    if (!dataInicio) return "Preencha a data de início do contrato.";

    if (tipoTempoContrato === "DETERMINADO" && !dataFinal) {
      return "Preencha a data final do contrato.";
    }

    return "";
  }

  function buildPayload(): ContratoEmpresaPayload {
    return {
      NR_CNPJ: onlyDigits(cnpj),
      NM_EMPRESA: razaoSocial.trim().toUpperCase(),
      NM_CIDADE: cidade.trim().toUpperCase(),
      NM_TIPO_TEMPO_CONTRATO: tipoTempoContrato,
      CD_CONTA_CAPITAL: contaCapital.trim(),
      NM_TIPO_CONTRATO: tipoContrato.trim().toUpperCase(),
      NM_SISTEMA_CONSIG: sistema.trim().toUpperCase(),
      DT_INICIO: dataInicio,
      DT_FIM:
        tipoTempoContrato === "INDETERMINADO"
          ? null
          : dataFinal || null,
      OBS_CONTRATO: observacao.trim(),
      SN_ATIVO: ativo ? 1 : 0,
    };
  }

  async function salvarEmailContrato(idContrato: number) {
    const listaEmails = listaEmail
      .split("/")
      .map((email) => email.trim())
      .filter(Boolean);

    for (const email of listaEmails) {
      try {
        const funcionario = await buscarFuncionarioPorEmail(email);

        await criarEmailContrato({
          ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO,
          ID_CONTRATO: idContrato,
        });
      } catch (error) {
        console.error(`Erro ao processar o email ${email}:`, error);
      }
    }
  }

  async function editarEmailContrato(idContrato: number) {
    const listaEmailsNovos = listaEmail
      .split("/")
      .map((email) => email.trim())
      .filter(Boolean);

    const responseExistentes = await listarEmailContratoPorContrato(idContrato);

    const emailsExistentes = (responseExistentes || [])
      .map((item: any) => String(item?.FUNCIONARIO?.EMAIL || "").trim())
      .filter(Boolean);

    const emailsParaAdicionar = listaEmailsNovos.filter(
      (email) => !emailsExistentes.includes(email)
    );

    const emailsParaRemover = emailsExistentes.filter(
      (email) => !listaEmailsNovos.includes(email)
    );

    for (const email of emailsParaAdicionar) {
      try {
        const funcionario = await buscarFuncionarioPorEmail(email);

        await criarEmailContrato({
          ID_FUNCIONARIO: funcionario.ID_FUNCIONARIO,
          ID_CONTRATO: idContrato,
        });
      } catch (error) {
        console.error(`Erro ao adicionar o email ${email}:`, error);
      }
    }

    for (const emailRemover of emailsParaRemover) {
      try {
        const funcionario = await buscarFuncionarioPorEmail(emailRemover);
        const emailContrato = await listarEmailContratoPorFuncionario(
          funcionario.ID_FUNCIONARIO
        );

        if (emailContrato?.ID_CONTRATO_EMAIL) {
          await removerEmailContrato(emailContrato.ID_CONTRATO_EMAIL);
        }
      } catch (error) {
        console.error(`Erro ao remover o email ${emailRemover}:`, error);
      }
    }
  }

  async function salvar() {
    try {
      setErro("");
      setInfo("");

      const msg = validaCampos();
      if (msg) {
        setErro(msg);
        return;
      }

      setLoadingSalvar(true);

      if (modoEdicao && contratoId) {
        const response = await editarContratoEmpresa(
          Number(contratoId),
          buildPayload()
        );
        const idContrato =
          response?.ID_CONTRATOS_EMPRESAS || Number(contratoId);

        await editarEmailContrato(idContrato);

        setInfo("Contrato alterado com sucesso.");

        if (isModal && onSaved) {
          await onSaved();
        }

        return;
      }

      const response = await cadastrarContratoEmpresa(buildPayload());
      const idContrato = response?.ID_CONTRATOS_EMPRESAS;

      if (idContrato) {
        await salvarEmailContrato(idContrato);
      }

      limparCampos();
      setInfo("Contrato cadastrado com sucesso.");

      if (isModal && onSaved) {
        await onSaved();
      }
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          `Não foi possível ${modoEdicao ? "alterar" : "cadastrar"} o contrato.`
      );
    } finally {
      setLoadingSalvar(false);
    }
  }

  function irParaConsulta() {
    if (isModal && onClose) {
      onClose();
      return;
    }

    router.push("/auth/consulta_contratos");
  }

  if (loadingInicial) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Carregando dados do contrato...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 ${
        isModal ? "mx-auto w-full max-w-full" : "mx-auto w-full min-w-225"
      }`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Cadastro de contrato
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              {modoEdicao
                ? "Alteração de Contrato de Empresas"
                : "Novo Contrato de Empresa"}
            </h2>
            <p className="mt-2 mb-2 text-sm text-slate-500">
              Preencha os campos abaixo para registrar as informações do contrato.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-60">
            <ActionButton onClick={irParaConsulta} variant="secondary">
              {isModal ? <FaTimes /> : <FaArrowRight />}
              {isModal ? "Fechar" : "Consultar Contratos"}
            </ActionButton>
          </div>
        </div>

        {(erro || info) && (
          <div className="mb-5">
            {erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <Field label="Razão Social">
              <input
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className={inputBase}
                placeholder="Informe a razão social"
              />
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="CNPJ">
              <input
                value={formatCnpj(cnpj)}
                onChange={(e) => setCnpj(e.target.value)}
                className={inputBase}
                maxLength={18}
                placeholder="Informe o CNPJ"
              />
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field label="Conta Capital">
              <input
                value={contaCapital}
                onChange={(e) => setContaCapital(e.target.value)}
                className={inputBase}
                maxLength={10}
                placeholder="Informe a conta capital"
              />
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field
              label="Tipo Tempo Contrato"
              helper="Escolha se o contrato tem prazo final ou não."
            >
              <select
                value={tipoTempoContrato}
                onChange={(e) => setTipoTempoContrato(e.target.value)}
                className={nativeSelectBase}
              >
                <option value="">Selecione</option>
                <option value="DETERMINADO">Determinado</option>
                <option value="INDETERMINADO">Indeterminado</option>
              </select>
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field
              label="Cidade"
              helper="Clique no campo para ver as opções disponíveis."
            >
              <SelectableFieldWrapper icon="chevron">
                <input
                  list="cidades-list"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className={inputSelectable}
                  placeholder="Selecione"
                />
              </SelectableFieldWrapper>
              <datalist id="cidades-list">
                {cidades.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field
              label="Contrato"
              helper="Escolha um tipo e clique em adicionar."
            >
              <SelectableFieldWrapper icon="search">
                <input
                  list="contratos-list"
                  value={contratoDigitado}
                  onChange={(e) => setContratoDigitado(e.target.value)}
                  className={inputSelectable}
                  placeholder="Selecione"
                />
              </SelectableFieldWrapper>
              <datalist id="contratos-list">
                {contratos.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>
        </div>
      </div>

      <Section
        title="Tipos de Contrato"
        subtitle="Adicione os tipos desejados e acompanhe o resultado no campo abaixo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4 flex items-end">
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <ActionButton onClick={adicionarTipo} variant="primary">
                <FaPlus />
                Adicionar
              </ActionButton>

              <ActionButton onClick={removerTipo} variant="danger">
                <FaTrash />
                Remover
              </ActionButton>
            </div>
          </div>

          <div className="md:col-span-12">
            <Field label="Tipos Contratos">
              <input
                readOnly
                value={tipoContrato}
                className={`${inputBase} bg-slate-50`}
                placeholder="Os tipos adicionados aparecerão aqui"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Funcionários a Notificar"
        subtitle="Selecione os e-mails e monte a lista de pessoas que serão notificadas."
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Field
              label="Funcionários a Notificar"
              helper="Selecione um e-mail e clique em adicionar."
            >
              <SelectableFieldWrapper icon="search">
                <input
                  list="emails-list"
                  value={emailDigitado}
                  onChange={(e) => setEmailDigitado(e.target.value)}
                  className={inputSelectable}
                  placeholder="Selecione"
                />
              </SelectableFieldWrapper>

              <datalist id="emails-list">
                {emails.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionButton onClick={adicionarEmail} variant="primary">
              <FaPlus />
              Adicionar
            </ActionButton>

            <ActionButton onClick={removerEmailDaLista} variant="danger">
              <FaTrash />
              Remover
            </ActionButton>
          </div>

          <div>
            <Field
              label="Lista de E-mail"
              helper="Os e-mails adicionados aparecerão aqui, separados por barra."
            >
              <textarea
                readOnly
                value={listaEmail}
                className={`${textareaBase} bg-slate-50`}
                rows={4}
                placeholder="Nenhum e-mail adicionado"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Observações e Sistema"
        subtitle="Inclua informações complementares e selecione o sistema relacionado."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-12">
            <Field
              label="Observação"
              helper="Campo opcional para registrar detalhes importantes."
            >
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className={textareaBase}
                maxLength={250}
                rows={4}
                placeholder="Digite uma observação"
              />
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field
              label="Sistema"
              helper="Selecione o sistema vinculado ao contrato."
            >
              <SelectableFieldWrapper icon="search">
                <input
                  list="sistemas-list"
                  value={sistema}
                  onChange={(e) => setSistema(e.target.value)}
                  className={inputSelectable}
                  placeholder="Selecione"
                />
              </SelectableFieldWrapper>
              <datalist id="sistemas-list">
                {sistemas.map((item, index) => (
                  <option key={`${item}-${index}`} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="md:col-span-6">
            <Field label="Data Início Contrato">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={nativeDateBase}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Status e Vigência"
        subtitle="Revise o status do contrato e conclua o cadastro."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            {mostrarDataFinal ? (
              <Field label="Data Final Contrato">
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className={nativeDateBase}
                />
              </Field>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                A data final só aparece para contratos determinados.
              </div>
            )}
          </div>

          <div className="md:col-span-6">
            <div
              className={`grid gap-3 ${
                modoEdicao ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {modoEdicao ? (
                <button
                  type="button"
                  onClick={() => setAtivo((old) => !old)}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition cursor-pointer ${
                    ativo
                      ? "bg-third text-white hover:bg-secondary"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {ativo ? "Ativo" : "Inativo"}
                </button>
              ) : null}

              <ActionButton
                onClick={salvar}
                disabled={loadingSalvar}
                //variant={modoEdicao ? "info" : "success"}
                variant={modoEdicao ? "success" : "primary"}
              >
                <FaSave />
                {loadingSalvar
                  ? "Salvando..."
                  : modoEdicao
                  ? "Editar"
                  : "Cadastrar"}
              </ActionButton>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}