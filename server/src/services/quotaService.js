// Cuántos períodos hay entre start y end según la frecuencia
function totalPeriods(frequency, start, end) {
  if (frequency === 'once') return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (frequency === 'weekly')   return Math.max(1, Math.ceil((e - s) / (7  * 24 * 60 * 60 * 1000)));
  if (frequency === 'biweekly') return Math.max(1, Math.ceil((e - s) / (14 * 24 * 60 * 60 * 1000)));
  // monthly
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, months);
}

function periodsElapsed(fund) {
  if (fund.frequency === 'once') return 1;
  const start = new Date(fund.createdAt);
  const now = new Date();
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((now - start) / (7  * 24 * 60 * 60 * 1000)) + 1);
  }
  if (fund.frequency === 'biweekly') {
    return Math.max(1, Math.floor((now - start) / (14 * 24 * 60 * 60 * 1000)) + 1);
  }
  // monthly
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

// Retorna cuántas cuotas le faltan al usuario. 0 = al día.
function pendingQuotas(fund, userContributions) {
  const totalPaid = userContributions.reduce((s, c) => s + c.amount, 0);
  const paid = Math.floor(totalPaid / fund.quotaAmount);
  const due  = periodsElapsed(fund);
  return Math.max(0, due - paid);
}

module.exports = { totalPeriods, periodsElapsed, pendingQuotas };
