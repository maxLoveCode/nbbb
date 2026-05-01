export function formatPrice(price) {
  if (typeof price !== "number") return "--";
  return `¥${(price / 100).toFixed(2)}`;
}

export function compactText(value = "", max = 140) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export function createSeoDescription(parts = []) {
  return parts.filter(Boolean).join(" | ");
}
