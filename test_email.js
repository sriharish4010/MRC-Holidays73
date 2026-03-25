import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const mailOptions = {
    from: process.env.SMTP_FROM,
    to: 'mrcholidays73@gmail.com',
    subject: '📋 Email Delivery Test',
    text: 'If you see this, your SMTP settings in .env are working!',
};

console.log('--- Testing Email Delivery ---');
console.log('User:', process.env.SMTP_USER);
console.log('Port:', process.env.SMTP_PORT);
console.log('Host:', process.env.SMTP_HOST);

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('❌ Email Test Failed!');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
    } else {
        console.log('✅ Email Test Successful!');
        console.log('Response:', info.response);
    }
});
