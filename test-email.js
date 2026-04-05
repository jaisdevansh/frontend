import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = async () => {
    try {
        console.log('Testing SMTP connection...');
        console.log('Email:', process.env.SMTP_EMAIL);
        
        let pass = process.env.SMTP_PASSWORD;
        if(pass) pass = pass.replace(/\s+/g, '');
        console.log('Password Length:', pass?.length);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: pass
            }
        });

        await transporter.verify();
        console.log('✅ SMTP Connection Successful!');
        
        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: process.env.SMTP_EMAIL, // Send to self
            subject: 'Test Email from Entry Club',
            text: 'If you are reading this, nodemailer is working!'
        });
        
        console.log('✅ Test email sent:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Error:', error.message);
    }
};

testEmail();
