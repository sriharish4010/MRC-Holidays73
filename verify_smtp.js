import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

console.log('--- SMTP Diagnostic Test ---');
console.log('User:', process.env.SMTP_USER);
console.log('Pass Length:', process.env.SMTP_PASS?.length);

transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: 'mrcholidays73@gmail.com',
    subject: '🚨 SMTP Diagnostic',
    text: 'If you see this, the App Password is correct.',
}, (error, info) => {
    if (error) {
        console.error('❌ SMTP Error Detected:');
        console.error('Code:', error.code);
        console.error('Response Code:', error.responseCode);
        console.error('Message:', error.message);
        console.dir(error, { depth: null });
    } else {
        console.log('✅ SMTP Success!');
        console.log('Response:', info.response);
    }
    process.exit();
});
