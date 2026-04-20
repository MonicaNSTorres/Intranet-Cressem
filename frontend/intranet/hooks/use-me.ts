"use client";

import { useEffect, useState } from "react";
import { getMeAdUser, type MeResponse } from "@/services/auth.service";

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMeAdUser();
        setMe(data);
      } catch (error) {
        console.error("Erro ao carregar usuário logado:", error);
        setMe(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    me,
    loading,
    grupos: Array.isArray(me?.grupos) ? me!.grupos! : [],
  };
}