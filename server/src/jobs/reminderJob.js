const cron = require('node-cron');
const { runDailyReminders } = require('../services/notificationService');

cron.schedule('0 9 * * *', async () => {
  try {
    await runDailyReminders();
  } catch (err) {
    console.error('Reminder job failed:', err.message);
  }
});
