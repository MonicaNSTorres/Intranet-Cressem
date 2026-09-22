"use client";

import { useParams } from "next/navigation";
import { LeilaoAoVivoDetalhe } from "@/components/leilao-ao-vivo-detalhe/leilao-ao-vivo-detalhe";

export default function LeilaoAoVivoDetalhePage() {
  const params = useParams();
  const id = Number(params.id);

  return <LeilaoAoVivoDetalhe idLeilao={id} />;
}