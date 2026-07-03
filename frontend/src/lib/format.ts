/**
 * Formate un montant selon la devise de l'utilisateur.
 * `FCFA` est l'alias local du XOF/XAF — Intl ne l'accepte pas, on l'affiche en suffixe manuellement.
 */
export function formatMoney(amount: number, currency = "FCFA"): string {
  // Guard NaN/Infinity : mieux vaut afficher "0 FCFA" que "NaN FCFA" ou "∞ FCFA".
  const safe = Number.isFinite(amount) ? amount : 0;
  if (currency === "FCFA" || currency === "XOF" || currency === "XAF") {
    return `${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(Math.round(safe))} FCFA`;
  }
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${new Intl.NumberFormat("fr-FR").format(safe)} ${currency}`;
  }
}

export function formatDate(input: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

/** Format compact pour les axes de graphes : "03 mai" sans année. */
export function formatDateShort(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function formatDateRelative(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d);
  return formatDate(d);
}

/** Pour l'<input type="date" />: yyyy-mm-dd */
export function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
export function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
export function startOfWeek(d = new Date()): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // lundi = 0
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}
export function startOfDay(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
export function endOfDay(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}
