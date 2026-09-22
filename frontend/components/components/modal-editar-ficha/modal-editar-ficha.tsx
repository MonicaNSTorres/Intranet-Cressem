"use client";

import { X } from "lucide-react";
import { Conta, FichaFormData } from "@/services/ficha-desimpedimento.service";

type ModalEditarFichaProps = {
  form: FichaFormData;
  contasCredoras: Conta[];
  contasDevedoras: Conta[];
  contasBancarias: Conta[];
  setContasCredoras: React.Dispatch<React.SetStateAction<Conta[]>>;
  setContasDevedoras: React.Dispatch<React.SetStateAction<Conta[]>>;
  setContasBancarias: React.Dispatch<React.SetStateAction<Conta[]>>;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export default function ModalEditarFicha({
  form,
  contasCredoras,
  contasDevedoras,
  contasBancarias,
  setContasCredoras,
  setContasDevedoras,
  setContasBancarias,
  onChange,
  onClose,
  onSave,
}: ModalEditarFichaProps) {
  const tipoAtual = (form.tipo || "DEVEDOR") as "DEVEDOR" | "CREDOR";

  const parseValorMonetario = (valor: string | number | null | undefined): number => {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") return valor;

    const clean = String(valor).trim().replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalNumerico = (contas: Conta[]): number => {
    return contas.reduce((sum, conta) => sum + parseValorMonetario(conta.valor), 0);
  };

  const totalFormatado = (contas: Conta[]) =>
    totalNumerico(contas).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });

  const addConta = (tipo: "devedora" | "credora" | "bancaria") => {
    const novaConta: Conta = { descricao: "", valor: "" };

    if (tipo === "devedora") {
      setContasDevedoras((prev) => [...prev, novaConta]);
      return;
    }

    if (tipo === "credora") {
      setContasCredoras((prev) => [...prev, novaConta]);
      return;
    }

    setContasBancarias((prev) => [...prev, novaConta]);
  };

  const updateConta = (
    tipo: "devedora" | "credora" | "bancaria",
    index: number,
    field: keyof Conta,
    value: string
  ) => {
    if (tipo === "devedora") {
      setContasDevedoras((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
      );
      return;
    }

    if (tipo === "credora") {
      setContasCredoras((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
      );
      return;
    }

    setContasBancarias((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removerConta = (tipo: "devedora" | "credora" | "bancaria", index: number) => {
    if (tipo === "devedora") {
      setContasDevedoras((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    if (tipo === "credora") {
      setContasCredoras((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    setContasBancarias((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Editar Ficha de Desimpedimento</h2>
            <p className="text-sm text-gray-500 mt-1">
              Atualize os dados da ficha e salve as alterações.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={onChange}
                className="w-full rounded border px-3 py-2"
              >
                <option value="DEVEDOR">DEVEDOR</option>
                <option value="CREDOR">CREDOR</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sequencial</label>
              <input
                name="sequencial"
                value={form.sequencial}
                onChange={onChange}
                className="w-full rounded border px-3 py-2 bg-gray-50"
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="nome"
              placeholder="Nome"
              value={form.nome}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="cpf"
              placeholder="CPF"
              value={form.cpf}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="prontuario"
              placeholder="Prontuário"
              value={form.prontuario}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="empresa"
              placeholder="Empresa"
              value={form.empresa}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="endereco"
              placeholder="Endereço"
              value={form.endereco}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="ds_email"
              placeholder="E-mail"
              value={form.ds_email}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="nm_bairro"
              placeholder="Bairro"
              value={form.nm_bairro}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="nm_cidade"
              placeholder="Cidade"
              value={form.nm_cidade}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="nr_cep"
              placeholder="CEP"
              value={form.nr_cep}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="telefone"
              placeholder="Telefone"
              value={form.telefone}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />
          </div>

          <div className="mt-4">
            <textarea
              name="observacao"
              placeholder="Observação"
              value={form.observacao}
              onChange={onChange}
              className="w-full border px-3 py-2 rounded min-h-[90px]"
            />
          </div>

          <div className="mt-6 rounded-lg border bg-gray-50 px-4 py-3 text-center">
            <p className="text-sm md:text-base font-medium text-gray-700">
              Preencha os valores no padrão com vírgula.
              <br />
              Exemplo: 2500,60
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Empréstimos</h3>

            {contasDevedoras.map((c, i) => (
              <div key={`devedora-${i}`} className="grid grid-cols-1 md:grid-cols-[1fr_180px_110px] gap-2 mb-2">
                <input
                  placeholder="Contrato / Descrição"
                  value={c.descricao}
                  onChange={(e) => updateConta("devedora", i, "descricao", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <input
                  placeholder="Valor (R$)"
                  value={c.valor}
                  onChange={(e) => updateConta("devedora", i, "valor", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <button
                  type="button"
                  onClick={() => removerConta("devedora", i)}
                  className="rounded bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addConta("devedora")}
              className="text-green-700 text-md font-semibold mt-1 hover:text-green-500 cursor-pointer"
            >
              + Adicionar conta devedora
            </button>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Contas Credoras</h3>

            {contasCredoras.map((c, i) => (
              <div key={`credora-${i}`} className="grid grid-cols-1 md:grid-cols-[1fr_180px_110px] gap-2 mb-2">
                <input
                  placeholder="Tipo / Descrição"
                  value={c.descricao}
                  onChange={(e) => updateConta("credora", i, "descricao", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <input
                  placeholder="Valor (R$)"
                  value={c.valor}
                  onChange={(e) => updateConta("credora", i, "valor", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <button
                  type="button"
                  onClick={() => removerConta("credora", i)}
                  className="rounded bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addConta("credora")}
              className="text-green-700 text-md font-semibold mt-1 hover:text-green-500 cursor-pointer"
            >
              + Adicionar conta credora
            </button>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Contas Bancárias (a subtrair do capital)</h3>

            {contasBancarias.map((c, i) => (
              <div key={`bancaria-${i}`} className="grid grid-cols-1 md:grid-cols-[1fr_180px_110px] gap-2 mb-2">
                <input
                  placeholder="Descrição"
                  value={c.descricao}
                  onChange={(e) => updateConta("bancaria", i, "descricao", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <input
                  placeholder="Valor (R$)"
                  value={c.valor}
                  onChange={(e) => updateConta("bancaria", i, "valor", e.target.value)}
                  className="border px-2 py-2 rounded"
                />
                <button
                  type="button"
                  onClick={() => removerConta("bancaria", i)}
                  className="rounded bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100"
                >
                  Remover
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addConta("bancaria")}
              className="text-green-700 text-md font-semibold mt-1 hover:text-green-500 cursor-pointer"
            >
              + Adicionar conta bancária
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="risco"
              placeholder="Risco (ex: R16)"
              value={form.risco}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="tempo_associado"
              placeholder="Tempo de associação"
              value={form.tempo_associado}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="data_ficha"
              type="date"
              value={form.data_ficha}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />

            <input
              name="responsavel"
              placeholder="Responsável"
              value={form.responsavel}
              onChange={onChange}
              className="border px-3 py-2 rounded"
            />
          </div>

          <div className="mt-4">
            <textarea
              name="observacoes_gerais"
              placeholder="Observações gerais"
              value={form.observacoes_gerais}
              onChange={onChange}
              className="w-full border px-3 py-2 rounded min-h-25"
            />
          </div>

          <div className="mt-6 rounded-xl border bg-gray-50 p-4">
            <p className="text-lg font-semibold">Total Capital: {totalFormatado(contasCredoras)}</p>
            <p className="text-lg font-semibold">Contas Bancárias: {totalFormatado(contasBancarias)}</p>

            {tipoAtual === "DEVEDOR" && (
              <p className="text-lg font-semibold">Total de Débitos: {totalFormatado(contasDevedoras)}</p>
            )}

            {tipoAtual === "CREDOR" && (
              <p className="text-lg font-semibold">Total de Débitos: {totalFormatado(contasDevedoras)}</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-white px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-secondary px-5 py-2 font-semibold text-white hover:bg-primary cursor-pointer"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}