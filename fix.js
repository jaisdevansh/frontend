import mongoose from 'mongoose';

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/stitch_curated_discovery');
        const userSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', userSchema, 'users');
        const result = await User.updateMany(
            {}, 
            { $set: { name: 'Devansh jii', profileImage: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' } }
        );
        console.log('Database forcibly updated. Modified count:', result.modifiedCount);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
