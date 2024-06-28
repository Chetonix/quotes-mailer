const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
const { createBackgroundWorker } = require('render-background-worker');


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

// Export the Subscriber model as a named export
module.exports.Subscriber = Subscriber;

app.post('/api/subscribe', async (req, res) => {
  const email = req.body.email;
  if (email) {
    try {
      const subscriber = new Subscriber({ email });
      await subscriber.save();

      // Set up the transporter for sending the email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Define the mail options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Subscription Confirmation',
        text: 'Thank you for subscribing to our daily inspirational quotes!',
      };

      // Send the confirmation email
      await transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${email}`);

      res.json({ message: 'Subscription successful! Confirmation email sent.' });
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

createBackgroundWorker('./cron-worker.js'); // Path to your cron worker script


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
