/**
 * Entry Club - Push Notification Test Script
 * Use this to verify FCM delivery from the backend.
 * 
 * Usage: node test-push.js <userId|role> <title> <body> [type]
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DeviceToken from './models/DeviceToken.js';

dotenv.config();

const serviceAccountPath = path.resolve('./config/serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account key not found at ./config/serviceAccountKey.json');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const MONGO_URI = process.env.MONGO_URI;

const sendPush = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const [,, target, title, body, type] = process.argv;

        if (!target || !title || !body) {
            console.log('Usage: node test-push.js <userId|role> <title> <body> [type]');
            process.exit(1);
        }

        // Check if target is a role or a userId
        let tokens = [];
        if (['user', 'waiter', 'security', 'admin'].includes(target)) {
            tokens = await DeviceToken.find({ role: target });
            console.log(`🔍 Found ${tokens.length} devices for role: ${target}`);
        } else {
            tokens = await DeviceToken.find({ userId: target });
            console.log(`🔍 Found ${tokens.length} devices for user: ${target}`);
        }

        if (tokens.length === 0) {
            console.log('❌ No active device tokens found for target');
            process.exit(1);
        }

        const registrationTokens = tokens.map(t => t.fcmToken);
        const message = {
            notification: { title, body },
            data: { 
                type: type || 'system',
                click_action: 'FLUTTER_NOTIFICATION_CLICK' 
            },
            tokens: registrationTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`🚀 Successfully matched and sent ${response.successCount} notifications.`);
        if (response.failureCount > 0) {
            console.log(`⚠️ Failed to send to ${response.failureCount} devices.`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`   - Error: ${resp.error.message}`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

sendPush();
