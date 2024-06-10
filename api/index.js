const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();


const app = express();

app.use(bodyParser.json());

// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

// Define Subscriber schema and model
const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

app.post('/api/subscribe', async (req, res) => {
  const email = req.body.email;
  if (email) {
    try {
      const subscriber = new Subscriber({ email });
      await subscriber.save();
      res.json({ message: 'Subscription successful!' });
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error code
        res.status(400).json({ message: 'Email already subscribed.' });
      } else {
        res.status(500).json({ message: 'Internal server error.' });
      }
    }
  } else {
    res.status(400).json({ message: 'Invalid email.' });
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
  const subscribers = await Subscriber.find();

  if (subscribers.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  for (const subscriber of subscribers) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: 'Daily Inspirational Quote',
      text: `${quote.text} - ${quote.author || 'Unknown'}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${subscriber.email}`);
    } catch (error) {
      console.error(`Error sending email to ${subscriber.email}:`, error);
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
