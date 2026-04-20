"use client";

type Props = {
  loading?: boolean;
  label?: string;
};

export function SearchButton({ loading, label = "Buscar" }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="bg-secondary text-white font-semibold px-6 py-2 rounded-lg 
      hover:bg-primary cursor-pointer hover:shadow-md transition flex items-center justify-center min-w-[120px]"
    >
      {loading ? "Buscando..." : label}
    </button>
  );
}