export const money = (cents: number) =>
  (cents / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function cents(input: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(input.trim())) return null;
  const [a, b = ""] = input.trim().split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}
