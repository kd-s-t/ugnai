"use client";

import Link from "next/link";
import { Shield, UserRound } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { AuthGate } from "@/components/AuthGate";

export default function LoginChoosePage() {
  return (
    <AuthGate mode="guest">
      <AuthCard
        title="Login"
        subtitle="Choose how you use UGNAI."
        footer={
          <>
            New here?{" "}
            <Link
              href="/register"
              className="text-[var(--accent)] hover:underline"
            >
              Register
            </Link>
          </>
        }
      >
        <div className="space-y-3">
          <Link
            href="/login/officer"
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-4 transition hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
          >
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--accent)]"
              aria-hidden
            >
              <Shield className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-[var(--foreground)]">
                Officer
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Captain, MDRRMO, or LGU: command center
              </span>
            </span>
          </Link>
          <Link
            href="/login/citizen"
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-4 transition hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
          >
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--accent)]"
              aria-hidden
            >
              <UserRound className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-[var(--foreground)]">
                Citizen
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Report hazards and track your submissions
              </span>
            </span>
          </Link>
        </div>
      </AuthCard>
    </AuthGate>
  );
}
