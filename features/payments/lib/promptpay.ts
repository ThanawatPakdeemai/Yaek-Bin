export function promptpayId(input: string): string | null {
  if (!/^[\d\s-]+$/.test(input)) return null;
  const v = input.replace(/[\s-]/g, "");
  if (/^0[689]\d{8}$/.test(v)) return v;
  if (/^[1-8]\d{12}$/.test(v)) {
    const sum = [...v.slice(0, 12)].reduce(
      (s, d, i) => s + Number(d) * (13 - i),
      0,
    );
    if ((11 - (sum % 11)) % 10 === Number(v[12])) return v;
  }
  return null;
}
