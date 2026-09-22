"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaEdit, FaInfoCircle, FaPlus, FaSave, FaSearch, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  buscarConvenioPorCpfTitular,
  criarHistoricoConvenioOdonto,
  downloadCsvPessoasOdontologicasTitular,
  editarPessoaOdonto,
  listarFatorAjuste,
  listarParentesco,
  type FatorAjuste,
  type Parentesco,
  type PessoaOdonto,
} from "@/services/convenio_odonto.service";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function isValidCpf(cpf: string) {
  const value = onlyDigits(cpf);
  if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(value[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(value[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;

  return rest === Number(value[10]);
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function fmtBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

const buttonPrimary =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";

const buttonSecondary =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

const buttonAuxiliary =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

const buttonInfoCompact =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

const buttonEditCompact =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-secondary/30 bg-secondary/10 text-secondary shadow-sm transition hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: PessoaOdonto | null;
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--title)]">Outras Informações</h3>
            <p className="mt-1 text-sm text-slate-500">Dados complementares do conveniado.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--text-darken-placeholder)] bg-white text-slate-600 shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <Field label="Nascimento">
            <input
              readOnly
              value={String(item.DT_NASCIMENTO || "").slice(0, 10)}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>

          <Field label="Nome da Mãe">
            <input
              readOnly
              value={item.NM_MAE || ""}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>

          <Field label="Cidade">
            <input
              readOnly
              value={item.NM_CIDADE || ""}
              className={`${inputBase} bg-slate-50`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  open,
  onClose,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: PessoaOdonto | null;
  onSaved: () => Promise<void>;
}) {
  const [fatores, setFatores] = useState<FatorAjuste[]>([]);
  const [parentescos, setParentescos] = useState<Parentesco[]>([]);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [erro, setErro] = useState("");

  const [nome, setNome] = useState("");
  const [cpfUsuario, setCpfUsuario] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [codCartao, setCodCartao] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [nomeMae, setNomeMae] = useState("");
  const [cidade, setCidade] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    async function carregarListas() {
      try {
        const [fatoresResp, parentescosResp] = await Promise.all([
          listarFatorAjuste(),
          listarParentesco(),
        ]);

        setFatores(fatoresResp);
        setParentescos(parentescosResp);
      } catch (error) {
        console.error(error);
        setErro("Não foi possível carregar os dados da modal.");
      }
    }

    if (open) carregarListas();
  }, [open]);

  useEffect(() => {
    if (!item) return;

    setErro("");
    setNome(item.NM_USUARIO || "");
    setCpfUsuario(formatCpf(item.NR_CPF_USUARIO || ""));
    setParentesco(item.DESC_PARENTESCO || "");
    setPlanoId(String(item.ID_CONVENIO_FATOR_AJUSTE || ""));
    setCodCartao(item.CD_CARTAO || "");
    setDataNascimento(item.DT_NASCIMENTO ? String(item.DT_NASCIMENTO).slice(0, 10) : "");
    setNomeMae(item.NM_MAE || "");
    setCidade(item.NM_CIDADE || "");
    setAtivo(Number(item.SN_ATIVO || 0) === 1);
  }, [item]);

  const planosDisponiveis = useMemo(() => {
    if (!item?.ID_OPERADORA) return [];
    return fatores.filter(
      (fator) => String(fator.ID_OPERADORA) === String(item.ID_OPERADORA)
    );
  }, [fatores, item]);

  async function salvarEdicao() {
    try {
      setErro("");

      if (!item?.ID_CONVENIO_PESSOAS) {
        setErro("Registro sem ID para alteração.");
        return;
      }

      if (!nome.trim()) {
        setErro("Nome é obrigatório.");
        return;
      }

      if (!isValidCpf(cpfUsuario)) {
        setErro("CPF inválido.");
        return;
      }

      if (!parentesco) {
        setErro("Parentesco é obrigatório.");
        return;
      }

      if (!planoId) {
        setErro("Plano é obrigatório.");
        return;
      }

      if (!dataNascimento) {
        setErro("Data de nascimento é obrigatória.");
        return;
      }

      if (!nomeMae.trim()) {
        setErro("Nome da mãe é obrigatório.");
        return;
      }

      if (!cidade.trim()) {
        setErro("Cidade é obrigatória.");
        return;
      }

      setLoadingSalvar(true);

      await criarHistoricoConvenioOdonto({
        CD_PLANO: item.CD_PLANO || null,
        NR_CPF_TITULAR: item.NR_CPF_TITULAR || null,
        CD_MATRICULA: item.CD_MATRICULA || null,
        NM_EMPRESA: item.NM_EMPRESA || null,
        NR_CNPJ_EMPRESA: item.NR_CNPJ_EMPRESA || null,
        NM_USUARIO: item.NM_USUARIO || null,
        NR_CPF_USUARIO: item.NR_CPF_USUARIO || null,
        DT_INCLUSAO: item.DT_INCLUSAO ? String(item.DT_INCLUSAO).slice(0, 10) : null,
        DT_EXCLUSAO: item.DT_EXCLUSAO ? String(item.DT_EXCLUSAO).slice(0, 10) : null,
        NM_PARENTESCO: item.DESC_PARENTESCO || null,
        SN_ATIVO: Number(item.SN_ATIVO || 0),
        NM_ATENDENTE_CADASTRO: item.NM_ATENDENTE_CADASTRO || null,
        NM_ATENDENTE_EDICAO: "INTRANET",
        DT_NASCIMENTO: item.DT_NASCIMENTO ? String(item.DT_NASCIMENTO).slice(0, 10) : null,
        NM_MAE: item.NM_MAE || null,
        NM_CIDADE: item.NM_CIDADE || null,
        VL_FATOR_AJUSTE: Number(item.VL_AJUSTE || 0),
        NM_PLANO_FATOR_AJUSTE: item.NM_FATOR_AJUSTE || null,
        NM_OPERADORA: item.DESC_CONVENIO || null,
      });

      await editarPessoaOdonto(Number(item.ID_CONVENIO_PESSOAS), {
        ...item,
        NM_USUARIO: nome.trim().toUpperCase(),
        NR_CPF_USUARIO: onlyDigits(cpfUsuario),
        DESC_PARENTESCO: parentesco.trim().toUpperCase(),
        ID_CONVENIO_FATOR_AJUSTE: Number(planoId),
        CD_CARTAO: codCartao || null,
        DT_NASCIMENTO: dataNascimento,
        NM_MAE: nomeMae.trim().toUpperCase(),
        NM_CIDADE: cidade.trim().toUpperCase(),
        SN_ATIVO: ativo ? 1 : 0,
        DT_EXCLUSAO: ativo ? null : item.DT_EXCLUSAO || todayISO(),
        NM_ATENDENTE_EDICAO: "INTRANET",
      });

      await onSaved();
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível salvar a alteração."
      );
    } finally {
      setLoadingSalvar(false);
    }
  }

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--title)]">Editar Conveniado</h3>
            <p className="mt-1 text-sm text-slate-500">Atualize os dados do conveniado selecionado.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--text-darken-placeholder)] bg-white text-slate-600 shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <Field label="Nome">
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputBase} />
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="CPF">
                <input value={cpfUsuario} onChange={(e) => setCpfUsuario(e.target.value)} maxLength={14} className={inputBase} />
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Status">
                <button
                  type="button"
                  onClick={() => setAtivo((old) => !old)}
                  className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-sm transition ${ativo
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    : "border-fourth/30 bg-fourth/10 text-fourth hover:bg-fourth hover:text-white"
                    }`}
                >
                  {ativo ? "Ativo" : "Inativo"}
                </button>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Parentesco">
                <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={inputBase}>
                  <option value=""></option>
                  {parentescos.map((p, idx) => (
                    <option key={`${p.NM_PARENTESCO}-${idx}`} value={p.NM_PARENTESCO}>
                      {p.NM_PARENTESCO}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Plano">
                <select value={planoId} onChange={(e) => setPlanoId(e.target.value)} className={inputBase}>
                  <option value=""></option>
                  {planosDisponiveis.map((plano) => (
                    <option key={plano.ID_CONVENIO_FATOR_AJUSTE} value={String(plano.ID_CONVENIO_FATOR_AJUSTE)}>
                      {plano.NM_FATOR_AJUSTE}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Cod. Cartão">
                <input value={codCartao} onChange={(e) => setCodCartao(e.target.value)} className={inputBase} />
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Data de Nascimento">
                <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={inputBase} />
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Cidade">
                <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputBase}>
                  <option value=""></option>
                  <option value="CAMPOS DO JORDAO">Campos do Jordão</option>
                  <option value="JACAREI">Jacareí</option>
                  <option value="SAO JOSE DOS CAMPOS">São José dos Campos</option>
                </select>
              </Field>
            </div>

            <div className="md:col-span-4">
              <Field label="Valor atual">
                <input readOnly value={fmtBRL(Number(item.VL_AJUSTE || 0))} className={`${inputBase} bg-slate-50`} />
              </Field>
            </div>

            <div className="md:col-span-12">
              <Field label="Nome da Mãe">
                <input value={nomeMae} onChange={(e) => setNomeMae(e.target.value)} className={inputBase} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={buttonSecondary}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={salvarEdicao}
              disabled={loadingSalvar}
              className={buttonPrimary}
            >
              <FaSave />
              {loadingSalvar ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConvenioOdontoConsultaForm() {
  const router = useRouter();

  const [cpf, setCpf] = useState("");
  const [convenioNome, setConvenioNome] = useState("");
  const [mostrarApenasAtivos, setMostrarApenasAtivos] = useState<"" | "1" | "0">("");
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingBaixar, setLoadingBaixar] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [items, setItems] = useState<PessoaOdonto[]>([]);
  const [itemModal, setItemModal] = useState<PessoaOdonto | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const cpfBusca = onlyDigits(cpf);


  const [itemEditModal, setItemEditModal] = useState<PessoaOdonto | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);

  const itemsFiltrados = useMemo(() => {
    if (mostrarApenasAtivos === "1") {
      return items.filter((item) => Number(item.SN_ATIVO || 0) === 1);
    }

    if (mostrarApenasAtivos === "0") {
      return items;
    }

    return [];
  }, [items, mostrarApenasAtivos]);

  const gastoMensal = useMemo(() => {
    return itemsFiltrados.reduce((acc, item) => {
      if (Number(item.SN_ATIVO || 0) !== 1) return acc;
      return acc + Number(item.VL_AJUSTE || 0);
    }, 0);
  }, [itemsFiltrados]);

  function abrirModal(item: PessoaOdonto) {
    setItemModal(item);
    setOpenModal(true);
  }

  function fecharModal() {
    setOpenModal(false);
    setItemModal(null);
  }

  function abrirModalEdicao(item: PessoaOdonto) {
    setItemEditModal(item);
    setOpenEditModal(true);
  }

  function fecharModalEdicao() {
    setOpenEditModal(false);
    setItemEditModal(null);
  }

  async function onBuscar() {
    try {
      setErro("");
      setInfo("");
      setConvenioNome("");
      setItems([]);

      if (!cpfBusca) {
        setErro("Informe o CPF do titular.");
        return;
      }

      if (!isValidCpf(cpfBusca)) {
        setErro("Informe um CPF válido.");
        return;
      }

      if (!mostrarApenasAtivos) {
        setErro("Selecione se deseja mostrar apenas conveniados ativos ou não.");
        return;
      }

      setLoadingBuscar(true);

      const response = await buscarConvenioPorCpfTitular(cpfBusca);

      if (!response || response.length === 0) {
        setErro("Não foi encontrado nenhum registro associado ao CPF solicitado.");
        return;
      }

      setItems(response);
      setConvenioNome(response[0]?.DESC_CONVENIO || "");
      setInfo("Consulta realizada com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Ocorreu um erro ao buscar os dados. Tente novamente."
      );
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function onBaixarCsv() {
    try {
      if (!cpfBusca) {
        setErro("Informe um CPF do titular para baixar o relatório.");
        return;
      }

      setLoadingBaixar(true);
      await downloadCsvPessoasOdontologicasTitular(cpfBusca);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error || "Não foi possível baixar o relatório CSV."
      );
    } finally {
      setLoadingBaixar(false);
    }
  }

  function irParaCadastroDependente() {
    if (!cpfBusca) {
      setErro("Informe o CPF do titular antes de cadastrar dependente.");
      return;
    }

    router.push(`/auth/cadastro_convenio_odonto?cpf=${cpfBusca}`);
  }

  return (
    <>
      <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#79B729]" />
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[var(--title)]">Consulta do titular</h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">Informe o CPF e escolha o filtro de visualização para consultar os conveniados.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px_220px]">
            <Field label="CPF do titular">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <input
                  value={formatCpf(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className={inputBase}
                  inputMode="numeric"
                  maxLength={14}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onBuscar();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={onBuscar}
                  disabled={loadingBuscar}
                  className={buttonPrimary}
                >
                  <FaSearch />
                  {loadingBuscar ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </Field>

            <Field label="Convênio">
              <input
                readOnly
                value={convenioNome}
                className={`${inputBase} bg-slate-50`}
              />
            </Field>

            <Field label="Ação">
              <button
                type="button"
                onClick={irParaCadastroDependente}
                className={`${buttonAuxiliary} w-full`}
              >
                <FaPlus />
                Cadastrar dependente
              </button>
            </Field>
          </div>

          {(erro || info) && (
            <div className="mt-4">
              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erro}
                </div>
              ) : (
                <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-[#006f65]">
                  {info}
                </div>
              )}
            </div>
          )}
        </div>

        <Section title="Filtros da Consulta">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <span className="text-sm font-medium text-slate-700">
              Deseja mostrar apenas conveniados ativos?
            </span>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="ativos"
                value="1"
                checked={mostrarApenasAtivos === "1"}
                onChange={() => setMostrarApenasAtivos("1")}
                className="h-4 w-4 accent-primary"
              />
              Sim
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="ativos"
                value="0"
                checked={mostrarApenasAtivos === "0"}
                onChange={() => setMostrarApenasAtivos("0")}
                className="h-4 w-4 accent-primary"
              />
              Não
            </label>
          </div>
        </Section>

        {itemsFiltrados.length > 0 && (
          <>
            <Section title="Conveniados">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                      <th className="border-b border-slate-200 px-4 py-3">Nome</th>
                      <th className="border-b border-slate-200 px-4 py-3">CPF Pessoa</th>
                      <th className="border-b border-slate-200 px-4 py-3">Cod. Cartão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Parentesco</th>
                      <th className="border-b border-slate-200 px-4 py-3">Plano</th>
                      <th className="border-b border-slate-200 px-4 py-3">Inclusão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Exclusão</th>
                      <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-sm text-slate-700">
                    {itemsFiltrados.map((item, index) => (
                      <tr
                        key={`${item.ID_CONVENIO_PESSOAS || index}-${item.NR_CPF_USUARIO}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.NM_USUARIO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatCpf(item.NR_CPF_USUARIO || "")}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.CD_CARTAO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {String(item.DESC_PARENTESCO || "").trim().toUpperCase() === "TITULAR" ? (
                            <span className="inline-flex rounded-full border border-third/40 bg-third/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--title)]">
                              {item.DESC_PARENTESCO}
                            </span>
                          ) : (
                            item.DESC_PARENTESCO || ""
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {item.NM_FATOR_AJUSTE || ""}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(item.DT_INCLUSAO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(item.DT_EXCLUSAO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {fmtBRL(Number(item.VL_AJUSTE || 0))}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModal(item)}
                              className={buttonInfoCompact}
                              title="Ver mais informações"
                            >
                              <FaInfoCircle size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(item)}
                              className={buttonEditCompact}
                              title="Editar conveniado"
                            >
                              <FaEdit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Totais e Relatório">
              <div className="grid gap-4 md:grid-cols-[320px_240px]">
                <Field label="Gasto total mensal">
                  <input
                    readOnly
                    value={fmtBRL(gastoMensal)}
                    className={`${inputBase} bg-slate-50 font-semibold`}
                  />
                </Field>

                <Field label="Relatório">
                  <button
                    type="button"
                    onClick={onBaixarCsv}
                    disabled={loadingBaixar}
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaDownload />
                    {loadingBaixar ? "Baixando..." : "Relatório Contratantes"}
                  </button>
                </Field>
              </div>
            </Section>
          </>
        )}
        </div>
      </div>

      <InfoModal open={openModal} onClose={fecharModal} item={itemModal} />

      <EditModal
        open={openEditModal}
        onClose={fecharModalEdicao}
        item={itemEditModal}
        onSaved={async () => {
          fecharModalEdicao();
          await onBuscar();
          setInfo("Registro alterado com sucesso.");
        }}
      />
    </>
  );
}