import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

console.log('Connecting to URI:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, {}).then(() => {
    console.log('Connected!');
    process.exit(0);
}).catch(err => {
    console.log('Error:', err.message);
    process.exit(1);
});
