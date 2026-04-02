import 'dotenv/config';
import nodemailer from 'nodemailer';

const EMAILS = [
    'mrholidays@gmail.com',
    'mr.holidays@gmail.com',
    'mrcholidays@gmail.com',
    'mr.cholidays@gmail.com',
    'mrholidays73@gmail.com'
];

async function testPermutations() {
    console.log('--- Testing "mr holidays" variations ---');
    const pass = 'hvdenfdqwjvxnkkm';
    
    for (const email of EMAILS) {
        console.log(`\nTesting: ${email}`);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email,
                pass: pass,
            },
        });

        try {
            await transporter.verify();
            console.log(`✅ SUCCESS! Working email: ${email}`);
            process.exit(0);
        } catch (error) {
            console.error(`❌ FAILED: ${error.message.split('\n')[0]}`);
        }
    }
    
    console.log('\n❌ All variations failed.');
    process.exit(1);
}

testPermutations();
