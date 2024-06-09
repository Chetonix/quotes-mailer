const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

let subscribers = [];

app.post('/subscribe', (req, res) => {
  const email = req.body.email;
  if (email && !subscribers.includes(email)) {
    subscribers.push(email);
    res.json({ message: 'Subscription successful!' });
  } else {
    res.status(400).json({ message: 'Invalid email or already subscribed.' });
  }
});

const fetchQuotes = async () => {
  try {
    const response = await axios.get('https://type.fit/api/quotes');
    return response.data;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
};

const sendEmails = async (quotes) => {
  if (subscribers.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  for (const email of subscribers) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Daily Inspirational Quote',
      text: `${quote.text} - ${quote.author || 'Unknown'}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error(`Error sending email to ${email}:`, error);
    }
  }
};

const cron = require('node-cron');
cron.schedule('0 8 * * *', async () => {
  const quotes = await fetchQuotes();
  await sendEmails(quotes);
  console.log('Emails sent at 8 AM');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
