function periodsElapsed(fund) {
  if (fund.frequency === 'once') return 1;
  const start = new Date(fund.createdAt);
  const now = new Date();
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
  }
  // monthly
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

// Returns how many quotas the user still owes. 0 means up to date.
function pendingQuotas(fund, userContributions) {
  const totalPaid = userContributions.reduce((s, c) => s + c.amount, 0);
  const paid = Math.floor(totalPaid / fund.quotaAmount);
  const due  = periodsElapsed(fund);
  return Math.max(0, due - paid);
}

module.exports = { periodsElapsed, pendingQuotas };
