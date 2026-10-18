/** Normalize PH mobile / landline to E.164 (+63…). Returns null if unusable. */
export function toE164Ph(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Never auto-dial national emergency short codes.
  if (digits === "911" || digits === "117") return null;

  // Other country codes are handled by toE164Intl — do not force +63.
  const hasPlus = raw.trim().startsWith("+");
  if (hasPlus && !digits.startsWith("63")) return null;
  if (
    !hasPlus &&
    !digits.startsWith("0") &&
    !digits.startsWith("9") &&
    !digits.startsWith("63") &&
    digits.length >= 10
  ) {
    return null;
  }

  if (digits.startsWith("63") && (digits.length === 12 || digits.length === 11)) {
    return `+${digits}`;
  }
  // Mobile: 09xxxxxxxxx
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "9") {
    return `+63${digits.slice(1)}`;
  }
  // Landline: 0 + area (2–3) + local — e.g. (032) 346-2847 → 0323462847
  if (
    digits.startsWith("0") &&
    digits.length >= 9 &&
    digits.length <= 10 &&
    digits[1] !== "9"
  ) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+63${digits}`;
  }
  // Area+local without trunk 0 — e.g. 323462847
  if (
    !digits.startsWith("0") &&
    !digits.startsWith("9") &&
    digits.length >= 8 &&
    digits.length <= 9
  ) {
    return `+63${digits}`;
  }
  if (hasPlus && digits.startsWith("63") && digits.length >= 11) {
    return `+${digits}`;
  }
  return null;
}

/** PH mobile only: +639XXXXXXXXX (10 digits after +63, starting with 9). */
export function toE164PhMobile(raw: string | null | undefined): string | null {
  const e164 = toE164Ph(raw);
  if (!e164 || !e164.startsWith("+63")) return null;
  const local = e164.slice(3);
  if (local.length === 10 && local.startsWith("9")) return `+63${local}`;
  return null;
}

/**
 * Any country E.164. PH local formats (09… / 9…) still normalize to +63.
 * Non-PH numbers need a country code (+65…, 65…, +1…).
 */
export function toE164Intl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits === "911" || digits === "117") return null;

  const hasPlus = trimmed.startsWith("+");

  // +09… / +9… typed into an intl field → still PH mobile.
  if (hasPlus && digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (hasPlus && digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }

  if (hasPlus && !digits.startsWith("63")) {
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    return null;
  }

  const phMobile = toE164PhMobile(trimmed);
  if (phMobile) return phMobile;

  const ph = toE164Ph(trimmed);
  if (ph) return ph;

  // Foreign country code pasted without + (e.g. 6591234567, 14155552671).
  if (
    !hasPlus &&
    !digits.startsWith("0") &&
    digits.length >= 10 &&
    digits.length <= 15 &&
    !digits.startsWith("63")
  ) {
    // Avoid treating bare PH mobiles (9XXXXXXXXX) as foreign.
    if (digits.length === 10 && digits.startsWith("9")) return null;
    return `+${digits}`;
  }

  return null;
}

/**
 * Keep the field locked to +63 while typing.
 * Accepts 09… / 9… / 63… paste and rewrites to +63…
 */
export function formatPhMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "+63";
  return `+63${digits}`;
}

/** Free international mobile input: leading +, digits only, max E.164 length. */
export function formatIntlMobileInput(raw: string): string {
  const trimmed = raw.trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "").slice(0, 15);

  // PH local paste (09… / 9…) → +63…
  if (digits.startsWith("0") && digits[1] === "9") {
    digits = `63${digits.slice(1)}`.slice(0, 15);
    return digits ? `+${digits}` : "+";
  }
  if (!hadPlus && digits.length <= 10 && digits.startsWith("9")) {
    digits = `63${digits}`.slice(0, 15);
    return digits ? `+${digits}` : "+";
  }

  if (!digits) return hadPlus || trimmed === "+" || trimmed.length === 0 ? "+" : "";
  return `+${digits}`;
}
