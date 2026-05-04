export function validateRut(rut) {
  const clean = rut.replace(/\./g, '').replace(/-/, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul < 7 ? mul + 1 : 2;
  }
  const rem = 11 - (sum % 11);
  const computed = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return dv === computed;
}

export function validateName(name) {
  return /^[\p{L} ]+$/u.test(name.trim());
}
