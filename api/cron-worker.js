const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { Subscriber } = require('./index.js'); // Assuming model is exported as a named export
require('dotenv').config();

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
    console.log('Starting email sending process...');
    
    const subscribers = await Subscriber.find();
    console.log(`Found ${subscribers.length} subscribers.`);
  
    if (subscribers.length === 0) {
      console.log('No subscribers found.');
      return;
    }
  
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
  
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    console.log('Selected quote:', quote);
  
    for (const subscriber of subscribers) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: subscriber.email,
        subject: 'Daily Inspirational Quote',
        text: `${quote.text} - ${quote.author || 'Unknown'}`,
      };
  
      console.log('Mail options:', mailOptions);
  
      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${subscriber.email}`);
      } catch (error) {
        console.error(`Error sending email to ${subscriber.email}:`, error.message);
      }
    }
  };
  
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