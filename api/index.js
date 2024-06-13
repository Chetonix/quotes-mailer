const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');

const app = express();

const corsOptions = {
  origin: 'https://quotes-mailer.onrender.com', // Allow only this origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions)); // Allows requests only from specified origin



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
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
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


// Cron job to send emails at 8 AM IST
cron.schedule('0 2 * * *', async () => {
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



console.log('Cron job scheduled');



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
