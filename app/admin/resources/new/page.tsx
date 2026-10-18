"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { CommandShell } from "@/components/CommandShell";
import { CommandContentSkeleton } from "@/components/PageLoadSkeleton";
import { mintShortageInstanceId } from "@/lib/workspace/reportNeed";

function MintAndOpen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const epic = searchParams.get("epic")?.trim().toUpperCase() || "RS-001";
    const id = mintShortageInstanceId(epic);
    router.replace(`/admin/resources/${encodeURIComponent(id)}`);
  }, [router, searchParams]);

  return <CommandContentSkeleton fill />;
}

/** Each Review shortage click mints a new plan id, then opens its desk. */
export default function NewShortagePlanPage() {
  return (
    <AuthGate mode="protected" role="officer">
      <CommandShell fill>
        <Suspense fallback={<CommandContentSkeleton fill />}>
          <MintAndOpen />
        </Suspense>
      </CommandShell>
    </AuthGate>
  );
}
