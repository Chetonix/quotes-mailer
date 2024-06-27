const cron = require('node-cron');

// ... (your existing code)

// Schedule the cron job for 6:30 PM IST (13:00 UTC)
cron.schedule('30 13 * * *', async () => {
  console.log('Cron job triggered at', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  try {
    const quotes = await fetchQuotes();
    console.log('Fetched quotes:', quotes.length);

    await sendEmails(quotes);
    console.log('Emails sent at', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  } catch (error) {
    console.error('Error during cron job execution:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

console.log('Cron job scheduled for 7:00 PM IST (13:00 UTC)');