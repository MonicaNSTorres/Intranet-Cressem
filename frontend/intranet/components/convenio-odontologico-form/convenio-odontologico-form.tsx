"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Search,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { FaSave } from "react-icons/fa";

import {
  listarBeneficiarios,
  buscarBeneficiarioPorId,
  listarTiposBeneficiario,
  listarEmpresasOdonto,
  listarOperadoras,
  listarPlanos,
  buscarValorVigentePlano,
  editarBeneficiario,
  criarBeneficiario,
  inativarBeneficiario,
  type BeneficiarioOdonto,
  type TipoBeneficiario,
  type EmpresaOdonto,
  type Operadora,
  type PlanoOdonto,
} from "@/services/convenio_odontologico.service";

import { buscarFuncionarioPorCpf } from "@/services/associado.service";

import { getMeAdUser } from "@/services/auth.service";

function formatarCpf(valor?: string | null) {
  const digits = String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (!digits) return "";

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(
      3,
      6
    )}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(
    3,
    6
  )}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function limparCpf(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

function formatarMoeda(valor?: number | null) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor?: string | null) {
  if (!valor) return "—";

  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return data.toLocaleDateString("pt-BR");
}

function normalizeDateForInput(value?: string | null) {
  if (!value) return "";

  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
}

export function ConvenioOdontologicoForm() {
  const [beneficiarios, setBeneficiarios] = useState<
    BeneficiarioOdonto[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");

  const [modalNovoAberta, setModalNovoAberta] = useState(false);

  const [somenteAtivos, setSomenteAtivos] = useState(true);

  const [beneficiarioEditando, setBeneficiarioEditando] =
    useState<BeneficiarioOdonto | null>(null);

  const [beneficiarioVisualizando, setBeneficiarioVisualizando] =
    useState<BeneficiarioOdonto | null>(null);

  async function carregarBeneficiarios() {
    try {
      setLoading(true);

      const data = await listarBeneficiarios(somenteAtivos);

      setBeneficiarios(data);
    } catch (error) {
      console.error(
        "Erro ao carregar beneficiários:",
        error
      );

      alert("Erro ao carregar beneficiários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarBeneficiarios();
  }, [somenteAtivos]);

  const beneficiariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const numeros = busca.replace(/\D/g, "");

    if (!termo) {
      return beneficiarios;
    }

    return beneficiarios.filter((item) => {
      const nome = String(
        item.NM_BENEFICIARIO || ""
      ).toLowerCase();

      const cpf = String(item.NR_CPF || "").replace(
        /\D/g,
        ""
      );

      const plano = String(
        item.NM_PLANO || ""
      ).toLowerCase();

      const operadora = String(
        item.NM_OPERADORA || ""
      ).toLowerCase();

      return (
        nome.includes(termo) ||
        plano.includes(termo) ||
        operadora.includes(termo) ||
        (numeros !== "" && cpf.includes(numeros))
      );
    });
  }, [beneficiarios, busca]);

  function handleNovo() {
    setModalNovoAberta(true);
  }

  async function handleVisualizar(
    item: BeneficiarioOdonto
  ) {
    try {
      const data = await buscarBeneficiarioPorId(
        item.ID_BENEFICIARIO
      );

      setBeneficiarioVisualizando(data);
    } catch (error) {
      console.error(
        "Erro ao buscar beneficiário:",
        error
      );

      alert("Erro ao carregar beneficiário.");
    }
  }

  async function handleEditar(
    item: BeneficiarioOdonto
  ) {
    try {
      const data = await buscarBeneficiarioPorId(
        item.ID_BENEFICIARIO
      );

      setBeneficiarioEditando(data);
    } catch (error) {
      console.error(
        "Erro ao buscar beneficiário para edição:",
        error
      );

      alert(
        "Erro ao carregar dados do beneficiário."
      );
    }
  }

  async function handleInativar(
    item: BeneficiarioOdonto
  ) {
    let mensagem =
      `Deseja realmente inativar o beneficiário "${item.NM_BENEFICIARIO}"?`;

    if (
      item.CD_TIPO_BENEFICIARIO === "TITULAR"
    ) {
      mensagem =
        `Deseja realmente inativar o titular "${item.NM_BENEFICIARIO}"?\n\n` +
        "Os dependentes ativos vinculados a este titular também serão inativados.";
    }

    const confirmar =
      window.confirm(mensagem);

    if (!confirmar) return;

    try {
      const usuario = await getMeAdUser();

      await inativarBeneficiario(
        item.ID_BENEFICIARIO,
        {
          nomeUsuario:
            usuario?.nome_completo ||
            usuario?.username ||
            "",
          loginUsuario:
            usuario?.username || "",
          observacao:
            "Beneficiário inativado pela tela de gestão do Convênio Odontológico.",
        }
      );

      alert(
        "Beneficiário inativado com sucesso."
      );

      await carregarBeneficiarios();
    } catch (error: any) {
      console.error(
        "Erro ao inativar beneficiário:",
        error
      );

      alert(
        error?.response?.data?.error ||
        "Erro ao inativar beneficiário."
      );
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />

        <div className="space-y-5 p-5 md:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Beneficiários cadastrados
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Consulte, edite e gerencie os
                beneficiários dos convênios
                odontológicos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleNovo}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
            >
              <UserPlus size={17} />

              Novo beneficiário
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={busca}
                onChange={(e) =>
                  setBusca(e.target.value)
                }
                placeholder="Pesquisar por nome, CPF, plano ou operadora"
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm">
              <input
                type="checkbox"
                checked={somenteAtivos}
                onChange={(e) =>
                  setSomenteAtivos(
                    e.target.checked
                  )
                }
              />

              Somente ativos
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">
                    Nome
                  </th>

                  <th className="px-4 py-3">
                    CPF
                  </th>

                  <th className="px-4 py-3">
                    Tipo
                  </th>

                  <th className="px-4 py-3">
                    Empresa
                  </th>

                  <th className="px-4 py-3">
                    Operadora
                  </th>

                  <th className="px-4 py-3">
                    Plano
                  </th>

                  <th className="px-4 py-3">
                    Valor
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Carregando
                      beneficiários...
                    </td>
                  </tr>
                ) : beneficiariosFiltrados.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Nenhum beneficiário
                      encontrado.
                    </td>
                  </tr>
                ) : (
                  beneficiariosFiltrados.map(
                    (item) => (
                      <tr
                        key={
                          item.ID_BENEFICIARIO
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {
                            item.NM_BENEFICIARIO
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatarCpf(
                            item.NR_CPF
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {item.NM_TIPO_BENEFICIARIO ||
                            item.CD_TIPO_BENEFICIARIO ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {item.NM_EMPRESA ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {item.NM_OPERADORA ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {item.NM_PLANO ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatarMoeda(
                            item.VL_MENSALIDADE
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {item.SN_ATIVO ===
                            1 ? (
                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              Inativo
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex justify-end gap-2">

                            <button
                              type="button"
                              title="Visualizar"
                              onClick={() =>
                                handleVisualizar(
                                  item
                                )
                              }
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-primary"
                            >
                              <Eye size={16} />
                            </button>

                            {item.SN_ATIVO ===
                              1 && (
                                <button
                                  type="button"
                                  title="Editar"
                                  onClick={() =>
                                    handleEditar(
                                      item
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-secondary cursor-pointer"
                                >
                                  <Pencil
                                    size={15}
                                  />

                                  Editar
                                </button>
                              )}

                            {item.SN_ATIVO ===
                              1 && (
                                <button
                                  type="button"
                                  title="Inativar"
                                  onClick={() =>
                                    handleInativar(
                                      item
                                    )
                                  }
                                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50"
                                >
                                  <UserX
                                    size={16}
                                  />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <p className="text-xs text-gray-500">
              {
                beneficiariosFiltrados.length
              }{" "}
              beneficiário(s)
              encontrado(s).
            </p>
          )}
        </div>
      </div>

      <ModalEditarBeneficiario
        open={!!beneficiarioEditando}
        beneficiario={
          beneficiarioEditando
        }
        onClose={() =>
          setBeneficiarioEditando(null)
        }
        onSuccess={
          carregarBeneficiarios
        }
      />

      <ModalNovoBeneficiario
        open={modalNovoAberta}
        onClose={() => setModalNovoAberta(false)}
        onSuccess={carregarBeneficiarios}
      />

      <ModalVisualizarBeneficiario
        beneficiario={
          beneficiarioVisualizando
        }
        onClose={() =>
          setBeneficiarioVisualizando(
            null
          )
        }
      />
    </>
  );
}

type EditarForm = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  idTipoBeneficiario: string;
  idEmpresa: string;
  idOperadora: string;
  idPlano: string;
  idTitular: string;
  nrMatricula: string;
  observacao: string;
};

const initialEditarForm: EditarForm = {
  nome: "",
  cpf: "",
  dataNascimento: "",
  idTipoBeneficiario: "",
  idEmpresa: "",
  idOperadora: "",
  idPlano: "",
  idTitular: "",
  nrMatricula: "",
  observacao: "",
};

type NovoBeneficiarioForm = {
  nome: string;
  cpf: string;
  dataNascimento: string;
  nrMatricula: string;
  idTipoBeneficiario: string;
  idEmpresa: string;
  idOperadora: string;
  idPlano: string;
  idTitular: string;
  observacao: string;
};

const initialNovoBeneficiarioForm: NovoBeneficiarioForm = {
  nome: "",
  cpf: "",
  dataNascimento: "",
  nrMatricula: "",
  idTipoBeneficiario: "",
  idEmpresa: "",
  idOperadora: "",
  idPlano: "",
  idTitular: "",
  observacao: "",
};

function ModalNovoBeneficiario({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] =
    useState<NovoBeneficiarioForm>(
      initialNovoBeneficiarioForm
    );

  const [tipos, setTipos] =
    useState<TipoBeneficiario[]>([]);

  const [loadingCpf, setLoadingCpf] = useState(false);
  const [mensagemCpf, setMensagemCpf] = useState<string | null>(null);

  const [empresas, setEmpresas] =
    useState<EmpresaOdonto[]>([]);

  const [operadoras, setOperadoras] =
    useState<Operadora[]>([]);

  const [planos, setPlanos] =
    useState<PlanoOdonto[]>([]);

  const [titulares, setTitulares] =
    useState<BeneficiarioOdonto[]>([]);

  const [valorPlano, setValorPlano] =
    useState<number | null>(null);

  const [loadingDados, setLoadingDados] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const tipoSelecionado = tipos.find(
    (item) =>
      String(item.ID_TIPO_BENEFICIARIO) ===
      form.idTipoBeneficiario
  );

  const dependente =
    tipoSelecionado?.CD_TIPO_BENEFICIARIO ===
    "DEPENDENTE";

  useEffect(() => {
    if (!open) return;

    async function carregarDados() {
      try {
        setLoadingDados(true);
        setError(null);
        setSuccess(null);
        setMensagemCpf(null);
        setLoadingCpf(false);

        const [
          tiposData,
          empresasData,
          operadorasData,
          beneficiariosData,
        ] = await Promise.all([
          listarTiposBeneficiario(),
          listarEmpresasOdonto(),
          listarOperadoras(),
          listarBeneficiarios(true),
        ]);

        setTipos(tiposData);
        setEmpresas(empresasData);
        setOperadoras(operadorasData);

        setTitulares(
          beneficiariosData.filter(
            (item) =>
              item.CD_TIPO_BENEFICIARIO ===
              "TITULAR" &&
              item.SN_ATIVO === 1
          )
        );

        setPlanos([]);
        setValorPlano(null);

        setForm(
          initialNovoBeneficiarioForm
        );
      } catch (err) {
        console.error(
          "Erro ao carregar dados do cadastro:",
          err
        );

        setError(
          "Não foi possível carregar os dados necessários para o cadastro."
        );
      } finally {
        setLoadingDados(false);
      }
    }

    carregarDados();
  }, [open]);

  function handleTipoChange(
    value: string
  ) {
    const tipo = tipos.find(
      (item) =>
        String(
          item.ID_TIPO_BENEFICIARIO
        ) === value
    );

    setForm((prev) => ({
      ...prev,
      idTipoBeneficiario: value,
      idTitular:
        tipo?.CD_TIPO_BENEFICIARIO ===
          "DEPENDENTE"
          ? prev.idTitular
          : "",
    }));
  }

  async function handleOperadoraChange(
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      idOperadora: value,
      idPlano: "",
    }));

    setPlanos([]);
    setValorPlano(null);

    if (!value) return;

    try {
      const data = await listarPlanos(
        Number(value)
      );

      setPlanos(data);
    } catch (err) {
      console.error(
        "Erro ao carregar planos:",
        err
      );

      setPlanos([]);

      setError(
        "Não foi possível carregar os planos da operadora."
      );
    }
  }

  async function handlePlanoChange(
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      idPlano: value,
    }));

    setValorPlano(null);

    if (!value) return;

    try {
      const data =
        await buscarValorVigentePlano(
          Number(value)
        );

      setValorPlano(
        Number(data.VL_MENSALIDADE)
      );
    } catch (err) {
      console.error(
        "Erro ao buscar valor vigente:",
        err
      );

      setValorPlano(null);

      setError(
        "O plano selecionado não possui valor vigente cadastrado."
      );
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSuccess(null);
    setError(null);

    const cpfLimpo = limparCpf(
      form.cpf
    );

    if (!form.nome.trim()) {
      setError(
        "Informe o nome do beneficiário."
      );
      return;
    }

    if (cpfLimpo.length !== 11) {
      setError(
        "Informe um CPF válido com 11 dígitos."
      );
      return;
    }

    if (!form.dataNascimento) {
      setError(
        "Informe a data de nascimento."
      );
      return;
    }

    if (!form.idTipoBeneficiario) {
      setError(
        "Selecione o tipo de beneficiário."
      );
      return;
    }

    if (!form.idEmpresa) {
      setError(
        "Selecione a empresa."
      );
      return;
    }

    if (!form.idOperadora) {
      setError(
        "Selecione a operadora."
      );
      return;
    }

    if (!form.idPlano) {
      setError(
        "Selecione o plano."
      );
      return;
    }

    if (
      dependente &&
      !form.idTitular
    ) {
      setError(
        "Selecione o titular responsável pelo dependente."
      );
      return;
    }

    try {
      setLoading(true);

      const usuario =
        await getMeAdUser();

      await criarBeneficiario({
        nome: form.nome.trim(),

        cpf: cpfLimpo,

        dataNascimento:
          form.dataNascimento,

        idTipoBeneficiario:
          Number(
            form.idTipoBeneficiario
          ),

        idEmpresa:
          Number(form.idEmpresa),

        idPlano:
          Number(form.idPlano),

        idTitular:
          dependente
            ? Number(
              form.idTitular
            )
            : null,

        nrMatricula:
          form.nrMatricula.trim() ||
          null,

        observacao:
          form.observacao.trim() ||
          null,

        nomeUsuario:
          usuario?.nome_completo ||
          usuario?.username ||
          "",

        loginUsuario:
          usuario?.username || "",
      });

      setSuccess(
        "Beneficiário cadastrado com sucesso."
      );

      await onSuccess();

      setTimeout(() => {
        setForm(
          initialNovoBeneficiarioForm
        );

        setValorPlano(null);
        setPlanos([]);

        onClose();
      }, 700);
    } catch (err: any) {
      console.error(
        "Erro ao cadastrar beneficiário:",
        err
      );

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err?.message ||
        "Erro ao cadastrar beneficiário."
      );
    } finally {
      setLoading(false);
    }
  }

  async function buscarDadosAssociadoPorCpf(cpf: string) {
    const cpfLimpo = limparCpf(cpf);

    setMensagemCpf(null);

    if (cpfLimpo.length !== 11) {
      return;
    }

    try {
      setLoadingCpf(true);

      const data = await buscarFuncionarioPorCpf(cpfLimpo);

      if (!data.found) {
        setMensagemCpf(
          "CPF não localizado na base de associados. Os dados poderão ser preenchidos manualmente."
        );

        return;
      }

      let idEmpresaEncontrada = "";

      if (data.empresa) {
        const empresaEncontrada = empresas.find(
          (item) =>
            String(item.NM_EMPRESA || "")
              .trim()
              .toUpperCase() ===
            String(data.empresa || "")
              .trim()
              .toUpperCase()
        );

        if (empresaEncontrada) {
          idEmpresaEncontrada = String(
            empresaEncontrada.ID_EMPRESA
          );
        }
      }

      setForm((prev) => ({
        ...prev,

        cpf: cpfLimpo,

        nome:
          data.nome ||
          prev.nome,

        nrMatricula:
          data.matricula ||
          prev.nrMatricula,

        dataNascimento:
          normalizeDateForInput(
            data.nascimento
          ) ||
          prev.dataNascimento,

        idEmpresa:
          idEmpresaEncontrada ||
          prev.idEmpresa,
      }));

      setMensagemCpf(
        "Dados do associado carregados automaticamente."
      );
    } catch (error) {
      console.error(
        "Erro ao consultar associado por CPF:",
        error
      );

      setMensagemCpf(
        "Não foi possível consultar os dados do associado."
      );
    } finally {
      setLoadingCpf(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Gestão de beneficiários
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-800">
                Novo beneficiário
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre um novo beneficiário e vincule-o ao plano odontológico.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[78vh] space-y-5 overflow-y-auto p-6"
        >
          {loadingDados ? (
            <div className="py-14 text-center text-sm font-medium text-slate-500">
              Carregando dados para cadastro...
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Cadastro
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados do beneficiário
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Informe os dados básicos da pessoa que será incluída no
                    convênio odontológico.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label="Nome *"
                    value={form.nome}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        nome: value,
                      }))
                    }
                    required
                  />

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      CPF *
                    </label>

                    <div className="relative">
                      <input
                        value={formatarCpf(form.cpf)}
                        onChange={(e) => {
                          const cpfLimpo = limparCpf(e.target.value);

                          setForm((prev) => ({
                            ...prev,
                            cpf: cpfLimpo,
                          }));

                          setMensagemCpf(null);

                          if (cpfLimpo.length === 11) {
                            buscarDadosAssociadoPorCpf(cpfLimpo);
                          }
                        }}
                        inputMode="numeric"
                        maxLength={14}
                        required
                        placeholder="000.000.000-00"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />

                      {loadingCpf && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                          Buscando...
                        </span>
                      )}
                    </div>

                    {mensagemCpf && (
                      <p
                        className={`mt-1 text-xs ${mensagemCpf.includes("carregados")
                          ? "text-emerald-600"
                          : "text-amber-600"
                          }`}
                      >
                        {mensagemCpf}
                      </p>
                    )}
                  </div>

                  <Field
                    label="Data de nascimento *"
                    value={
                      form.dataNascimento
                    }
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        dataNascimento:
                          value,
                      }))
                    }
                    type="date"
                    required
                  />

                  <Field
                    label="Matrícula"
                    value={
                      form.nrMatricula
                    }
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        nrMatricula:
                          value,
                      }))
                    }
                  />

                  <SelectField
                    label="Tipo de beneficiário *"
                    value={
                      form.idTipoBeneficiario
                    }
                    onChange={
                      handleTipoChange
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    {tipos.map(
                      (item) => (
                        <option
                          key={
                            item.ID_TIPO_BENEFICIARIO
                          }
                          value={
                            item.ID_TIPO_BENEFICIARIO
                          }
                        >
                          {
                            item.NM_TIPO_BENEFICIARIO
                          }
                        </option>
                      )
                    )}
                  </SelectField>

                  <SelectField
                    label="Empresa *"
                    value={form.idEmpresa}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        idEmpresa: value,
                      }))
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    {empresas.map(
                      (item) => (
                        <option
                          key={
                            item.ID_EMPRESA
                          }
                          value={
                            item.ID_EMPRESA
                          }
                        >
                          {
                            item.NM_EMPRESA
                          }
                        </option>
                      )
                    )}
                  </SelectField>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Convênio
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Plano e vínculo
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Escolha a operadora e o plano. O valor vigente será
                    carregado automaticamente.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SelectField
                    label="Operadora *"
                    value={
                      form.idOperadora
                    }
                    onChange={
                      handleOperadoraChange
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    {operadoras.map(
                      (item) => (
                        <option
                          key={
                            item.ID_OPERADORA
                          }
                          value={
                            item.ID_OPERADORA
                          }
                        >
                          {
                            item.NM_OPERADORA
                          }
                        </option>
                      )
                    )}
                  </SelectField>

                  <SelectField
                    label="Plano *"
                    value={form.idPlano}
                    onChange={
                      handlePlanoChange
                    }
                    disabled={
                      !form.idOperadora
                    }
                  >
                    <option value="">
                      {form.idOperadora
                        ? "Selecione"
                        : "Selecione primeiro a operadora"}
                    </option>

                    {planos.map(
                      (item) => (
                        <option
                          key={
                            item.ID_PLANO
                          }
                          value={
                            item.ID_PLANO
                          }
                        >
                          {item.NM_PLANO}
                        </option>
                      )
                    )}
                  </SelectField>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Valor vigente
                    </label>

                    <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm">
                      {formatarMoeda(
                        valorPlano
                      )}
                    </div>
                  </div>

                  {dependente && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <SelectField
                        label="Titular responsável *"
                        value={
                          form.idTitular
                        }
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            idTitular:
                              value,
                          }))
                        }
                      >
                        <option value="">
                          Selecione o titular responsável
                        </option>

                        {titulares.map(
                          (item) => (
                            <option
                              key={
                                item.ID_BENEFICIARIO
                              }
                              value={
                                item.ID_BENEFICIARIO
                              }
                            >
                              {
                                item.NM_BENEFICIARIO
                              }{" "}
                              -{" "}
                              {formatarCpf(
                                item.NR_CPF
                              )}
                            </option>
                          )
                        )}
                      </SelectField>
                    </div>
                  )}
                </div>

                {dependente && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs leading-5 text-amber-800">
                      <strong>
                        Dependente:
                      </strong>{" "}
                      selecione o titular
                      responsável pelo vínculo.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Informações adicionais
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Observações
                  </h3>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Observação
                  </label>

                  <textarea
                    value={
                      form.observacao
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        observacao:
                          e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Informe alguma observação, se necessário."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingDados ||
                loadingCpf
              }
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={16} />

              {loading
                ? "Cadastrando..."
                : "Cadastrar beneficiário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalEditarBeneficiario({
  open,
  beneficiario,
  onClose,
  onSuccess,
}: {
  open: boolean;
  beneficiario: BeneficiarioOdonto | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] =
    useState<EditarForm>(
      initialEditarForm
    );

  const [tipos, setTipos] =
    useState<TipoBeneficiario[]>([]);

  const [empresas, setEmpresas] =
    useState<EmpresaOdonto[]>([]);

  const [operadoras, setOperadoras] =
    useState<Operadora[]>([]);

  const [planos, setPlanos] =
    useState<PlanoOdonto[]>([]);

  const [titulares, setTitulares] =
    useState<BeneficiarioOdonto[]>([]);

  const [valorPlano, setValorPlano] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadingDados, setLoadingDados] =
    useState(false);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const tipoSelecionado =
    tipos.find(
      (item) =>
        String(
          item.ID_TIPO_BENEFICIARIO
        ) === form.idTipoBeneficiario
    );

  const dependente =
    tipoSelecionado?.CD_TIPO_BENEFICIARIO ===
    "DEPENDENTE";


  useEffect(() => {
    if (!open || !beneficiario) {
      return;
    }

    const beneficiarioAtual = beneficiario;

    async function carregar() {
      try {
        setLoadingDados(true);

        const [
          tiposData,
          empresasData,
          operadorasData,
          titularesData,
        ] = await Promise.all([
          listarTiposBeneficiario(),
          listarEmpresasOdonto(),
          listarOperadoras(),
          listarBeneficiarios(true),
        ]);

        setTipos(tiposData);
        setEmpresas(empresasData);
        setOperadoras(operadorasData);

        setTitulares(
          titularesData.filter(
            (item) =>
              item.CD_TIPO_BENEFICIARIO === "TITULAR" &&
              item.ID_BENEFICIARIO !== beneficiarioAtual.ID_BENEFICIARIO
          )
        );

        const idOperadora = beneficiarioAtual.ID_OPERADORA
          ? String(beneficiarioAtual.ID_OPERADORA)
          : "";

        let planosData: PlanoOdonto[] = [];

        if (idOperadora) {
          planosData = await listarPlanos(Number(idOperadora));
          setPlanos(planosData);
        } else {
          setPlanos([]);
        }

        setForm({
          nome: beneficiarioAtual.NM_BENEFICIARIO || "",
          cpf: beneficiarioAtual.NR_CPF || "",
          dataNascimento: normalizeDateForInput(
            beneficiarioAtual.DT_NASCIMENTO
          ),
          idTipoBeneficiario: beneficiarioAtual.ID_TIPO_BENEFICIARIO
            ? String(beneficiarioAtual.ID_TIPO_BENEFICIARIO)
            : "",
          idEmpresa: beneficiarioAtual.ID_EMPRESA
            ? String(beneficiarioAtual.ID_EMPRESA)
            : "",
          idOperadora,
          idPlano: beneficiarioAtual.ID_PLANO
            ? String(beneficiarioAtual.ID_PLANO)
            : "",
          idTitular: beneficiarioAtual.ID_TITULAR
            ? String(beneficiarioAtual.ID_TITULAR)
            : "",
          nrMatricula: beneficiarioAtual.NR_MATRICULA || "",
          observacao: beneficiarioAtual.DS_OBSERVACAO || "",
        });

        if (beneficiarioAtual.ID_PLANO) {
          try {
            const valor = await buscarValorVigentePlano(
              beneficiarioAtual.ID_PLANO
            );

            setValorPlano(Number(valor.VL_MENSALIDADE));
          } catch {
            setValorPlano(null);
          }
        }

        setSuccess(null);
        setError(null);
      } catch (err) {
        console.error(
          "Erro ao carregar dados do modal:",
          err
        );

        setError(
          "Erro ao carregar dados para edição."
        );
      } finally {
        setLoadingDados(false);
      }
    }

    carregar();
  }, [open, beneficiario]);

  async function handleOperadoraChange(
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      idOperadora: value,
      idPlano: "",
    }));

    setValorPlano(null);

    if (!value) {
      setPlanos([]);
      return;
    }

    try {
      const data =
        await listarPlanos(
          Number(value)
        );

      setPlanos(data);
    } catch (error) {
      console.error(
        "Erro ao carregar planos:",
        error
      );

      setPlanos([]);
    }
  }

  async function handlePlanoChange(
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      idPlano: value,
    }));

    setValorPlano(null);

    if (!value) return;

    try {
      const data =
        await buscarValorVigentePlano(
          Number(value)
        );

      setValorPlano(
        Number(
          data.VL_MENSALIDADE
        )
      );
    } catch (error) {
      console.error(
        "Erro ao buscar valor:",
        error
      );

      setValorPlano(null);
    }
  }

  function handleTipoChange(
    value: string
  ) {
    const tipo = tipos.find(
      (item) =>
        String(
          item.ID_TIPO_BENEFICIARIO
        ) === value
    );

    setForm((prev) => ({
      ...prev,

      idTipoBeneficiario:
        value,

      idTitular:
        tipo?.CD_TIPO_BENEFICIARIO ===
          "DEPENDENTE"
          ? prev.idTitular
          : "",
    }));
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!beneficiario) return;

    setLoading(true);

    setSuccess(null);
    setError(null);

    try {
      if (
        limparCpf(form.cpf).length !==
        11
      ) {
        throw new Error(
          "Informe um CPF válido."
        );
      }

      if (
        dependente &&
        !form.idTitular
      ) {
        throw new Error(
          "Selecione o titular responsável pelo dependente."
        );
      }

      const usuario =
        await getMeAdUser();

      await editarBeneficiario(
        beneficiario.ID_BENEFICIARIO,
        {
          nome: form.nome.trim(),

          cpf: limparCpf(
            form.cpf
          ),

          dataNascimento:
            form.dataNascimento,

          idTipoBeneficiario:
            Number(
              form.idTipoBeneficiario
            ),

          idEmpresa:
            Number(form.idEmpresa),

          idPlano:
            Number(form.idPlano),

          idTitular:
            dependente
              ? Number(
                form.idTitular
              )
              : null,

          nrMatricula:
            form.nrMatricula ||
            null,

          observacao:
            form.observacao ||
            null,

          nomeUsuario:
            usuario?.nome_completo ||
            usuario?.username ||
            "",

          loginUsuario:
            usuario?.username ||
            "",
        }
      );

      setSuccess(
        "Beneficiário atualizado com sucesso."
      );

      await onSuccess();

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error(
        "Erro ao editar beneficiário:",
        err
      );

      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao atualizar beneficiário."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open || !beneficiario) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Gestão de beneficiários
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-800">
                Editar beneficiário
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Atualize os dados cadastrais, plano e vínculo do beneficiário.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[78vh] space-y-5 overflow-y-auto p-6"
        >
          {loadingDados ? (
            <div className="py-14 text-center text-sm font-medium text-slate-500">
              Carregando dados do beneficiário...
            </div>
          ) : (
            <>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Cadastro
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Dados do beneficiário
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Informações principais utilizadas para identificação do
                    beneficiário no convênio odontológico.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label="Nome *"
                    value={form.nome}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        nome: value,
                      }))
                    }
                    required
                  />

                  <Field
                    label="CPF *"
                    value={formatarCpf(form.cpf)}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        cpf: limparCpf(value),
                      }))
                    }
                    required
                  />

                  <Field
                    label="Data de nascimento *"
                    value={form.dataNascimento}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        dataNascimento: value,
                      }))
                    }
                    type="date"
                    required
                  />

                  <Field
                    label="Matrícula"
                    value={form.nrMatricula}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        nrMatricula: value,
                      }))
                    }
                  />

                  <SelectField
                    label="Tipo de beneficiário *"
                    value={form.idTipoBeneficiario}
                    onChange={handleTipoChange}
                  >
                    <option value="">Selecione</option>

                    {tipos.map((item) => (
                      <option
                        key={item.ID_TIPO_BENEFICIARIO}
                        value={item.ID_TIPO_BENEFICIARIO}
                      >
                        {item.NM_TIPO_BENEFICIARIO}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Empresa *"
                    value={form.idEmpresa}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        idEmpresa: value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>

                    {empresas.map((item) => (
                      <option
                        key={item.ID_EMPRESA}
                        value={item.ID_EMPRESA}
                      >
                        {item.NM_EMPRESA}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Convênio
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Plano e vínculo
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Selecione a operadora e o plano. O valor vigente será
                    carregado automaticamente.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SelectField
                    label="Operadora *"
                    value={form.idOperadora}
                    onChange={handleOperadoraChange}
                  >
                    <option value="">Selecione</option>

                    {operadoras.map((item) => (
                      <option
                        key={item.ID_OPERADORA}
                        value={item.ID_OPERADORA}
                      >
                        {item.NM_OPERADORA}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Plano *"
                    value={form.idPlano}
                    onChange={handlePlanoChange}
                    disabled={!form.idOperadora}
                  >
                    <option value="">
                      {form.idOperadora
                        ? "Selecione"
                        : "Selecione primeiro a operadora"}
                    </option>

                    {planos.map((item) => (
                      <option
                        key={item.ID_PLANO}
                        value={item.ID_PLANO}
                      >
                        {item.NM_PLANO}
                      </option>
                    ))}
                  </SelectField>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Valor vigente
                    </label>

                    <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm">
                      {formatarMoeda(valorPlano)}
                    </div>
                  </div>

                  {dependente && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <SelectField
                        label="Titular responsável *"
                        value={form.idTitular}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            idTitular: value,
                          }))
                        }
                      >
                        <option value="">
                          Selecione o titular responsável
                        </option>

                        {titulares.map((item) => (
                          <option
                            key={item.ID_BENEFICIARIO}
                            value={item.ID_BENEFICIARIO}
                          >
                            {item.NM_BENEFICIARIO} -{" "}
                            {formatarCpf(item.NR_CPF)}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  )}
                </div>

                {dependente && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs leading-5 text-amber-800">
                      <strong>Dependente:</strong> é obrigatório manter o
                      beneficiário vinculado a um titular ativo.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                    Integração
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Conta Capital
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Dados consultados automaticamente na Conta Capital. Estas
                    informações não podem ser alteradas por esta tela.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ReadOnlyField
                    label="Conta Capital"
                    value={beneficiario.NR_CONTA_CAPITAL}
                  />

                  <ReadOnlyField
                    label="Situação"
                    value={beneficiario.SN_CONTA_CAPITAL}
                  />

                  <ReadOnlyField
                    label="Integralização indeterminada"
                    value={
                      beneficiario.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA
                    }
                  />

                  <ReadOnlyField
                    label="Matrícula Conta Capital"
                    value={formatarData(
                      beneficiario.DT_MATRICULA_CONTA_CAPITAL
                    )}
                  />

                  <ReadOnlyField
                    label="Saída Conta Capital"
                    value={formatarData(
                      beneficiario.DT_SAIDA_CONTA_CAPITAL
                    )}
                  />

                  <ReadOnlyField
                    label="Posição"
                    value={formatarData(
                      beneficiario.DT_MOVIMENTO_CONTA_CAPITAL
                    )}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Informações adicionais
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Observações
                  </h3>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Observação
                  </label>

                  <textarea
                    value={form.observacao}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        observacao: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Informe alguma observação sobre o beneficiário, se necessário."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || loadingDados}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSave />

              {loading
                ? "Salvando alterações..."
                : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalVisualizarBeneficiario({
  beneficiario,
  onClose,
}: {
  beneficiario: BeneficiarioOdonto | null;
  onClose: () => void;
}) {
  if (!beneficiario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Detalhes do cadastro
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-800">
                Beneficiário
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Consulte as informações cadastrais, plano e dados da Conta
                Capital.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Cadastro
              </p>

              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Dados do beneficiário
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Informações principais do beneficiário no convênio odontológico.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReadOnlyField
                label="Nome"
                value={beneficiario.NM_BENEFICIARIO}
              />

              <ReadOnlyField
                label="CPF"
                value={formatarCpf(beneficiario.NR_CPF)}
              />

              <ReadOnlyField
                label="Matrícula"
                value={beneficiario.NR_MATRICULA}
              />

              <ReadOnlyField
                label="Tipo"
                value={
                  beneficiario.NM_TIPO_BENEFICIARIO ||
                  beneficiario.CD_TIPO_BENEFICIARIO
                }
              />

              <ReadOnlyField
                label="Empresa"
                value={beneficiario.NM_EMPRESA}
              />

              <ReadOnlyField
                label="Plano"
                value={beneficiario.NM_PLANO}
              />

              <ReadOnlyField
                label="Operadora"
                value={beneficiario.NM_OPERADORA}
              />

              <ReadOnlyField
                label="Titular"
                value={beneficiario.NM_TITULAR}
              />

              <ReadOnlyField
                label="Data de nascimento"
                value={formatarData(beneficiario.DT_NASCIMENTO)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Convênio
              </p>

              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Plano odontológico
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dados do plano atualmente vinculado ao beneficiário.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReadOnlyField
                label="Operadora"
                value={beneficiario.NM_OPERADORA}
              />

              <ReadOnlyField
                label="Plano"
                value={beneficiario.NM_PLANO}
              />

              <ReadOnlyField
                label="Forma de cobrança"
                value={
                  beneficiario.TP_COBRANCA === "POR_PESSOA"
                    ? "Por pessoa"
                    : beneficiario.TP_COBRANCA === "POR_PLANO"
                      ? "Por plano"
                      : beneficiario.TP_COBRANCA
                }
              />

              <ReadOnlyField
                label="Valor vigente"
                value={formatarMoeda(beneficiario.VL_MENSALIDADE)}
              />

              <ReadOnlyField
                label="Data de inclusão"
                value={formatarData(beneficiario.DT_INCLUSAO_PLANO)}
              />

              <ReadOnlyField
                label="Data de exclusão"
                value={formatarData(beneficiario.DT_EXCLUSAO_PLANO)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                Integração
              </p>

              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Conta Capital
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Informações consultadas automaticamente na Conta Capital.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReadOnlyField
                label="Conta Capital"
                value={beneficiario.NR_CONTA_CAPITAL}
              />

              <ReadOnlyField
                label="Situação"
                value={beneficiario.SN_CONTA_CAPITAL}
              />

              <ReadOnlyField
                label="Integralização indeterminada"
                value={
                  beneficiario.SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA
                }
              />

              <ReadOnlyField
                label="Matrícula Conta Capital"
                value={formatarData(
                  beneficiario.DT_MATRICULA_CONTA_CAPITAL
                )}
              />

              <ReadOnlyField
                label="Saída Conta Capital"
                value={formatarData(
                  beneficiario.DT_SAIDA_CONTA_CAPITAL
                )}
              />

              <ReadOnlyField
                label="Posição"
                value={formatarData(
                  beneficiario.DT_MOVIMENTO_CONTA_CAPITAL
                )}
              />
            </div>
          </div>

          {beneficiario.DS_OBSERVACAO && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Informações adicionais
                </p>

                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  Observações
                </h3>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {beneficiario.DS_OBSERVACAO}
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {children}
      </select>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
        {value === null ||
          value === undefined ||
          String(value).trim() === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}