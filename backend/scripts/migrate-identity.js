import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stitch';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;

        // 1. Migrate Hosts
        console.log('Migrating Hosts...');
        const hostsResult = await db.collection('hosts').updateMany(
            { name: { $exists: false } },
            [
                {
                    $set: {
                        name: { $ifNull: ['$fullName', 'Authorized Partner'] }
                    }
                },
                {
                    $unset: 'fullName'
                }
            ]
        );
        console.log(`Updated ${hostsResult.modifiedCount} hosts.`);

        // 2. Migrate Users
        console.log('Migrating Users...');
        // For users, if name doesn't exist, build it from firstName and lastName
        const usersResult = await db.collection('users').updateMany(
            { name: { $exists: false } },
            [
                {
                    $set: {
                        name: {
                            $trim: {
                                input: {
                                    $concat: [
                                        { $ifNull: ['$firstName', ''] },
                                        ' ',
                                        { $ifNull: ['$lastName', ''] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unset: ['firstName', 'lastName']
                }
            ]
        );
        console.log(`Updated ${usersResult.modifiedCount} users.`);

        // 3. Migrate Staff
        console.log('Migrating Staff...');
        const staffResult = await db.collection('staffs').updateMany(
            { name: { $exists: false } },
            [
                {
                    $set: {
                        name: { $ifNull: ['$fullName', 'Staff Member'] }
                    }
                },
                {
                    $unset: ['fullName', 'firstName', 'lastName']
                }
            ]
        );
        console.log(`Updated ${staffResult.modifiedCount} staff members.`);

        // 4. Migrate Admins
        console.log('Migrating Admins...');
        const adminsResult = await db.collection('admins').updateMany(
            { name: { $exists: false } },
            [
                {
                    $set: {
                        name: { $ifNull: ['$fullName', 'Admin'] }
                    }
                },
                {
                    $unset: 'fullName'
                }
            ]
        );
        console.log(`Updated ${adminsResult.modifiedCount} admins.`);

        console.log('Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
