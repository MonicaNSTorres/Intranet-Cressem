import axios from "axios";

export async function listarEstoqueGlpi(busca = "") {
  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/glpi/estoque`,
    {
      params: { busca },
      withCredentials: true,
    }
  );

  return data;
}