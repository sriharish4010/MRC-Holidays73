import 'dotenv/config';
import nodemailer from 'nodemailer';

const EMAILS = [
    'mrcholidays73@gmail.com',
    'perumalloganathan007@gmail.com',
    'sriharish4010@gmail.com'
];

const PASSWORDS = [
    'hvde nfdq wjvx nkkm',  // Original (with spaces)
    'hvdenfdqwjvxnkkm'      // No spaces
];

const PORTS = [587, 465];

async function testPermutations() {
    console.log('--- SMTP Multi-Diagnostic Test ---');
    
    for (const email of EMAILS) {
        for (const pass of PASSWORDS) {
            for (const port of PORTS) {
                console.log(`\nTesting: ${email} | Port: ${port} | Pass: ${pass.includes(' ') ? 'with spaces' : 'no spaces'}`);
                
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: port,
                    secure: port === 465,
                    auth: {
                        user: email,
                        pass: pass,
                    },
                });

                try {
                    await transporter.verify();
                    console.log(`✅ SUCCESS! Found working combination: ${email} | ${port} | ${pass}`);
                    process.exit(0);
                } catch (error) {
                    console.error(`❌ FAILED: ${error.message.split('\n')[0]}`);
                }
            }
        }
    }
    
    console.log('\n❌ All combinations failed.');
    process.exit(1);
}

testPermutations();
