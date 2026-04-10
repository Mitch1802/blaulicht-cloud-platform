export type CheckStatus = "ok" | "missing" | "damaged";

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  ok: "OK",
  missing: "Fehlt",
  damaged: "Beschädigt",
};

export const CHECK_STATUS_OPTIONS: Array<{ value: CheckStatus; label: string }> = [
  { value: "ok", label: "OK" },
  { value: "missing", label: "Fehlt" },
  { value: "damaged", label: "Beschädigt" },
];

