require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

// === Load Gmail OAuth2 Credentials ===
const CREDENTIALS = require('./credentials.json');
const { client_id, client_secret, redirect_uris } = CREDENTIALS.installed; // or .installed if your JSON uses that

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// === Insert your refresh token here ===
oAuth2Client.setCredentials({
  refresh_token: 'refresh_token: process.env.GMAIL_REFRESH_TOKEN'
});

// === Email PDF Endpoint ===
app.post('/send-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { email, name, transaction } = req.body;
    const file = fs.readFileSync(req.file.path);

    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'egypt.in.frankfurt@gmail.com',
        clientId: client_id,
        clientSecret: client_secret,
        refreshToken: oAuth2Client.credentials.refresh_token,
        accessToken: accessToken.token
      }
    });

    await transport.sendMail({
      from: 'القنصلية المصرية في فرانكفورت <egypt.in.frankfurt@gmail.com>',
      to: email,
      subject: 'تم تسجيل طلبك بنجاح',
      text: `عزيزي ${name}،\n\nتم تسجيل طلبك من نوع: ${transaction}.\nيرجى الاطلاع على المرفق.`,
      attachments: [
        {
          filename: req.file.originalname,
          content: file
        }
      ]
    });

    fs.unlinkSync(req.file.path); // Clean up uploaded file
    res.status(200).send('Email sent');
  } catch (error) {
    console.error(error);
    res.status(500).send('Email failed');
  }
});

app.listen(3000, () => {
  console.log('✅ Email server running at http://localhost:3000');
});
