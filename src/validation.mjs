export class InputError extends Error {
  constructor(message, code = "INVALID_INPUT", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function requireThat(condition, message, code) {
  if (!condition) throw new InputError(message, code);
}
export function number(
  value,
  name,
  { min = 0, max = 1e9, nullable = false } = {},
) {
  if (value === null && nullable) return null;
  requireThat(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    `${name} must be a finite number between ${min} and ${max}`,
  );
  return value;
}
export function text(value, name, { max = 200, optional = false } = {}) {
  if (optional && (value === undefined || value === "")) return "";
  requireThat(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    `${name} must contain 1–${max} characters`,
  );
  return value.trim();
}
export const round = (v) =>
  v === null ? null : Math.round((v + Number.EPSILON) * 10000) / 10000;
export const sum = (xs) =>
  xs.some((x) => x === null) ? null : round(xs.reduce((a, b) => a + b, 0));
export function percentile(xs, p) {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}
export const clone = (x) => structuredClone(x);
export function safeURL(url) {
  text(url, "URL", { max: 2048 });
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new InputError("Enter an absolute HTTP or HTTPS URL", "INVALID_URL");
  }
  requireThat(
    ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password,
    "Only HTTP(S) source URLs without credentials are allowed",
    "INVALID_URL",
  );
  return parsed.href;
}
