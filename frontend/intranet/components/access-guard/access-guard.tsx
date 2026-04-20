"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { AccessRule, canAccess } from "@/lib/access-control";

type Props = {
  rule: AccessRule;
  children: ReactNode;
  fallbackPath?: string;
};

export function AccessGuard({
  rule,
  children,
  fallbackPath = "/auth/home",
}: Props) {
  const router = useRouter();
  const meResult = useMe() as any;

  const user =
    meResult?.user ??
    meResult?.me ??
    meResult?.data ??
    meResult?.usuario ??
    null;

  const loading = Boolean(
    meResult?.loading ??
      meResult?.isLoading ??
      meResult?.pending
  );

  const allowed = useMemo(() => canAccess(user, rule), [user, rule]);

  useEffect(() => {
    if (loading) return;
    if (!allowed) router.replace(fallbackPath);
  }, [allowed, fallbackPath, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Carregando permissões...
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}