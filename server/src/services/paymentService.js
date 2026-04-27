async function processPayment({ amount, recipientAccount }) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    transactionId: `sim_${Date.now()}`,
    amount,
    status: 'succeeded',
    provider: 'simulation',
  };
}

module.exports = { processPayment };
