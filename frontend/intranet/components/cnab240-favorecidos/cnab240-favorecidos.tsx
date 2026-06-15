"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  FaAddressBook,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaPen,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUniversity,
  FaUsers,
} from "react-icons/fa";

import {
  atualizarFavorecido,
  criarFavorecido,
  excluirFavorecido,
  listarFavorecidos,
  type CnabFavorecido,
  type CnabFavorecidoPayload,
} from "@/services/cnab240_favorecidos.service";

const initialForm: CnabFavorecidoPayload = {
  CPF: "",
  IDCLIENTE: "",
  BANCO: "",
  AGENCIA: "",
  CONTA: "",
  DV_CONTA: "",
  NOME: "",
  ENDERECO: "",
  NUMERO: "",
  COMPLEMENTO: "",
  BAIRRO: "",
  CEP: "",
  CEP_COMPLEMENTO: "",
  CIDADE: "",
  UF: "",
};

export function Cnab240FavorecidosForm() {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">(
    "success"
  );

  const [favorecidos, setFavorecidos] = useState<CnabFavorecido[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [resumo, setResumo] = useState({
    totalFavorecidos: 0,
    totalBancos: 0,
    totalCidades: 0,
  });

  const [modalAberta, setModalAberta] = useState(false);
  const [favorecidoSelecionado, setFavorecidoSelecionado] =
    useState<CnabFavorecido | null>(null);

  const [form, setForm] = useState<CnabFavorecidoPayload>(initialForm);

  async function carregar(pagina = page) {
    try {
      setLoading(true);

      const result = await listarFavorecidos({
        busca: buscaAplicada,
        page: pagina,
        limit,
      });

      setFavorecidos(result.data);
      setTotal(result.total);
      setPage(result.page);
      setLimit(result.limit);
      setTotalPages(result.totalPages);
      setResumo(result.resumo);
    } catch (error) {
      console.error(error);
      mostrarMensagem("Não foi possível carregar os favorecidos.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, buscaAplicada]);

  async function buscarCep(cep: string) {
    const cepLimpo = onlyDigits(cep);

    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data?.erro) {
        mostrarMensagem("CEP não encontrado.", "error");
        return;
      }

      setForm((old) => ({
        ...old,
        ENDERECO: data.logradouro || old.ENDERECO,
        BAIRRO: data.bairro || old.BAIRRO,
        CIDADE: data.localidade || old.CIDADE,
        UF: data.uf || old.UF,
        CEP: formatCep(cepLimpo),
      }));
    } catch (error) {
      console.error(error);
      mostrarMensagem("Erro ao buscar CEP.", "error");
    }
  }

  function aplicarBusca() {
    setBuscaAplicada(busca);
    setPage(1);
  }

  function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  function onlyDigits(value: string) {
    return String(value || "").replace(/\D/g, "");
  }

  function onlyCpfCnpjChars(value: string) {
    return String(value || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
  }

  function formatCpfCnpj(value: string) {
    const clean = onlyCpfCnpjChars(value).slice(0, 14);

    if (clean.length > 11 || /[A-Z]/.test(clean)) {
      return clean
        .replace(/^(.{2})(.)/, "$1.$2")
        .replace(/^(.{2})\.(.{3})(.)/, "$1.$2.$3")
        .replace(/\.(.{3})(.)/, ".$1/$2")
        .replace(/(.{4})(.)$/, "$1-$2");
    }

    return clean
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function formatCep(value: string) {
    const digits = onlyDigits(value).slice(0, 8);

    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
  }

  function abrirNovo() {
    setFavorecidoSelecionado(null);
    setForm(initialForm);
    setMensagem("");
    setModalAberta(true);
  }

  function abrirEdicao(item: CnabFavorecido) {
    setFavorecidoSelecionado(item);

    setForm({
      CPF: formatCpfCnpj(item.CPF || ""),
      IDCLIENTE: item.IDCLIENTE || "",
      BANCO: item.BANCO || "",
      AGENCIA: item.AGENCIA || "",
      CONTA: item.CONTA || "",
      DV_CONTA: item.DV_CONTA || "",
      NOME: item.NOME || "",
      ENDERECO: item.ENDERECO || "",
      NUMERO: item.NUMERO || "",
      COMPLEMENTO: item.COMPLEMENTO || "",
      BAIRRO: item.BAIRRO || "",
      CEP: formatCep(`${item.CEP || ""}${item.CEP_COMPLEMENTO || ""}`),
      CEP_COMPLEMENTO: item.CEP_COMPLEMENTO || "",
      CIDADE: item.CIDADE || "",
      UF: item.UF || "",
    });

    setMensagem("");
    setModalAberta(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberta(false);
    setFavorecidoSelecionado(null);
    setForm(initialForm);
  }

  function updateField(field: keyof CnabFavorecidoPayload, value: string) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function montarPayload(): CnabFavorecidoPayload {
    const cepDigits = onlyDigits(form.CEP || "");

    return {
      ...form,
      CPF: onlyCpfCnpjChars(form.CPF || ""),
      BANCO: onlyDigits(form.BANCO || ""),
      AGENCIA: onlyDigits(form.AGENCIA || ""),
      CONTA: onlyDigits(form.CONTA || ""),
      DV_CONTA: String(form.DV_CONTA || "").trim(),
      CEP: cepDigits.slice(0, 5),
      CEP_COMPLEMENTO: cepDigits.slice(5, 8) || form.CEP_COMPLEMENTO || "000",
      UF: String(form.UF || "").toUpperCase().slice(0, 2),
      NOME: String(form.NOME || "").toUpperCase(),
      ENDERECO: String(form.ENDERECO || "").toUpperCase(),
      COMPLEMENTO: String(form.COMPLEMENTO || "").toUpperCase(),
      BAIRRO: String(form.BAIRRO || "").toUpperCase(),
      CIDADE: String(form.CIDADE || "").toUpperCase(),
    };
  }

  async function salvarFavorecido() {
    try {
      setSalvando(true);
      setMensagem("");

      const payload = montarPayload();

      if (!payload.CPF) {
        mostrarMensagem("Informe o CPF/CNPJ do favorecido.", "error");
        return;
      }

      if (!payload.NOME) {
        mostrarMensagem("Informe o nome do favorecido.", "error");
        return;
      }

      if (favorecidoSelecionado?.ID_FAVORECIDO) {
        await atualizarFavorecido(favorecidoSelecionado.ID_FAVORECIDO, payload);
        mostrarMensagem("Favorecido atualizado com sucesso.", "success");
      } else {
        await criarFavorecido(payload);
        mostrarMensagem("Favorecido cadastrado com sucesso.", "success");
        setPage(1);
      }

      fecharModal();
      await carregar(favorecidoSelecionado ? page : 1);
    } catch (error: any) {
      console.error(error);
      mostrarMensagem(
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        "Erro ao salvar favorecido.",
        "error"
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerFavorecido() {
    if (!favorecidoSelecionado?.ID_FAVORECIDO) return;

    const confirmar = window.confirm("Deseja realmente excluir este favorecido?");

    if (!confirmar) return;

    try {
      setSalvando(true);

      await excluirFavorecido(favorecidoSelecionado.ID_FAVORECIDO);

      mostrarMensagem("Favorecido excluído com sucesso.", "success");
      fecharModal();

      const proximaPagina =
        favorecidos.length === 1 && page > 1 ? page - 1 : page;

      setPage(proximaPagina);
      await carregar(proximaPagina);
    } catch (error: any) {
      console.error(error);
      mostrarMensagem(
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        "Erro ao excluir favorecido.",
        "error"
      );
    } finally {
      setSalvando(false);
    }
  }

  const primeiroRegistro = total === 0 ? 0 : (page - 1) * limit + 1;
  const ultimoRegistro = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {mensagem && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagem === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
            }`}
        >
          {mensagem}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <CardResumo
              titulo="Favorecidos"
              valor={String(resumo.totalFavorecidos)}
              icon={<FaUsers />}
              cor="text-[#00AE9D]"
            />

            <CardResumo
              titulo="Bancos cadastrados"
              valor={String(resumo.totalBancos)}
              icon={<FaUniversity />}
              cor="text-blue-600"
            />

            <CardResumo
              titulo="Cidades"
              valor={String(resumo.totalCidades)}
              icon={<FaMapMarkerAlt />}
              cor="text-[#79B729]"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-96">
              <FaSearch className="absolute left-4 top-4 text-slate-400" />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aplicarBusca();
                }}
                placeholder="Buscar por CPF/CNPJ ou nome..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 cursor-pointer"
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>

              <button
                type="button"
                onClick={aplicarBusca}
                disabled={loading}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>

              <button
                type="button"
                onClick={abrirNovo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-primary cursor-pointer"
              >
                <FaPlus />
                Novo favorecido
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    CPF/CNPJ
                  </th>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    Nome
                  </th>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    Banco
                  </th>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    Agência
                  </th>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    Conta
                  </th>
                  <th className="px-4 text-left text-xs font-bold uppercase text-slate-400">
                    Cidade/UF
                  </th>
                  <th className="px-4 text-right text-xs font-bold uppercase text-slate-400">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-sm text-slate-500"
                    >
                      Carregando favorecidos...
                    </td>
                  </tr>
                ) : favorecidos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-sm text-slate-500"
                    >
                      Nenhum favorecido encontrado.
                    </td>
                  </tr>
                ) : (
                  favorecidos.map((item) => (
                    <tr key={item.ID_FAVORECIDO} className="bg-slate-50">
                      <td className="rounded-l-2xl px-4 py-4 text-sm text-slate-700">
                        {formatCpfCnpj(item.CPF || "")}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        {item.NOME}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.BANCO || "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.AGENCIA || "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.CONTA
                          ? `${item.CONTA}-${item.DV_CONTA || ""}`
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.CIDADE ? `${item.CIDADE}/${item.UF || ""}` : "-"}
                      </td>

                      <td className="rounded-r-2xl px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
                        >
                          <FaPen />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando{" "}
              <span className="font-semibold text-slate-700">
                {primeiroRegistro}
              </span>{" "}
              até{" "}
              <span className="font-semibold text-slate-700">
                {ultimoRegistro}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-slate-700">{total}</span>{" "}
              favorecidos
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((old) => Math.max(old - 1, 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft />
                Anterior
              </button>

              <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((old) => Math.min(old + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Favorecido CNAB240
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    {favorecidoSelecionado
                      ? "Editar favorecido"
                      : "Novo favorecido"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Mantenha os dados bancários atualizados para geração correta
                    das remessas CNAB240.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] space-y-6 overflow-y-auto p-6">
              <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FaAddressBook className="text-primary" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Dados do favorecido
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="CPF/CNPJ"
                    value={form.CPF || ""}
                    onChange={(v) => updateField("CPF", formatCpfCnpj(v))}
                    placeholder="CPF ou CNPJ"
                  />

                  <Input
                    label="ID Cliente"
                    value={form.IDCLIENTE || ""}
                    onChange={(v) => updateField("IDCLIENTE", v)}
                    placeholder="Opcional"
                  />

                  <Input
                    label="Nome"
                    value={form.NOME || ""}
                    onChange={(v) => updateField("NOME", v)}
                    placeholder="Nome do favorecido"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FaUniversity className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Dados bancários
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                  <Input
                    label="Banco"
                    value={form.BANCO || ""}
                    onChange={(v) =>
                      updateField("BANCO", onlyDigits(v).slice(0, 3))
                    }
                    placeholder="033"
                  />

                  <Input
                    label="Agência"
                    value={form.AGENCIA || ""}
                    onChange={(v) =>
                      updateField("AGENCIA", onlyDigits(v).slice(0, 5))
                    }
                    placeholder="00093"
                  />

                  <Input
                    label="Conta"
                    value={form.CONTA || ""}
                    onChange={(v) =>
                      updateField("CONTA", onlyDigits(v).slice(0, 12))
                    }
                    placeholder="000015000001"
                  />

                  <Input
                    label="DV"
                    value={form.DV_CONTA || ""}
                    onChange={(v) => updateField("DV_CONTA", v.slice(0, 1))}
                    placeholder="3"
                  />

                  <Input
                    label="UF"
                    value={form.UF || ""}
                    onChange={(v) =>
                      updateField("UF", v.toUpperCase().slice(0, 2))
                    }
                    placeholder="SP"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-secondary" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Endereço
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Input
                    label="CEP"
                    value={form.CEP || ""}
                    onChange={(v) => {
                      const cepFormatado = formatCep(v);
                      updateField("CEP", cepFormatado);

                      const cepLimpo = onlyDigits(cepFormatado);

                      if (cepLimpo.length === 8) {
                        buscarCep(cepLimpo);
                      }
                    }}
                    placeholder="00000-000"
                  />

                  <Input
                    label="Cidade"
                    value={form.CIDADE || ""}
                    onChange={(v) => updateField("CIDADE", v)}
                    placeholder="Cidade"
                  />

                  <Input
                    label="Bairro"
                    value={form.BAIRRO || ""}
                    onChange={(v) => updateField("BAIRRO", v)}
                    placeholder="Bairro"
                  />

                  <Input
                    label="Número"
                    value={form.NUMERO || ""}
                    onChange={(v) => updateField("NUMERO", v)}
                    placeholder="Número"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Endereço"
                      value={form.ENDERECO || ""}
                      onChange={(v) => updateField("ENDERECO", v)}
                      placeholder="Rua, avenida..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Complemento"
                      value={form.COMPLEMENTO || ""}
                      onChange={(v) => updateField("COMPLEMENTO", v)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-between">
              <div>
                {favorecidoSelecionado && (
                  <button
                    type="button"
                    onClick={removerFavorecido}
                    disabled={salvando}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60 cursor-pointer"
                  >
                    <FaTrash />
                    Excluir
                  </button>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarFavorecido}
                  disabled={salvando}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition hover:bg-secondary disabled:opacity-60 cursor-pointer"
                >
                  <FaSave />
                  {salvando ? "Salvando..." : "Salvar favorecido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
  icon,
  cor,
}: {
  titulo: string;
  valor: string;
  icon: React.ReactNode;
  cor: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {titulo}
          </p>

          <h3 className="mt-2 text-3xl font-bold text-slate-800">{valor}</h3>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 ${cor}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
      />
    </div>
  );
}