function isFundExpired(fund) {
  return new Date(fund.deadline) <= new Date();
}

module.exports = { isFundExpired };
