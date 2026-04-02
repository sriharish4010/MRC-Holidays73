import 'dotenv/config';
import nodemailer from 'nodemailer';

const email = 'mrholidays73@gmail.com';
const pass = 'hvdenfdqwjvxnkkm';

async function test() {
    console.log(`--- Testing: ${email} ---`);
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email,
            pass: pass,
        },
    });

    try {
        await transporter.verify();
        console.log(`✅ SUCCESS! Found working email: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error(`❌ FAILED: ${error.message}`);
        process.exit(1);
    }
}

test();
