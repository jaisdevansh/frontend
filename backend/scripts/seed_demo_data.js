import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../shared/models/user.model.js';
import { Event } from '../shared/models/Event.js';
import { FoodOrder } from '../shared/models/FoodOrder.js';
import { EventPresence } from '../shared/models/EventPresence.js';
import { MenuItem } from '../shared/models/MenuItem.js';
import { Message } from '../shared/models/Message.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stitch_curated_discovery';

const seedDemoData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('💎 Connected to MongoDB...');

        // 0. Reset Collections for clean demo state
        await User.deleteMany({});
        await Event.deleteMany({});
        await FoodOrder.deleteMany({});
        await EventPresence.deleteMany({});
        await MenuItem.deleteMany({});
        await Message.deleteMany({});
        console.log('🧹 Database reset completed.');
        const hostData = {
            _id: '507f1f77bcf86cd799439001',
            name: 'Elite Lounge',
            username: 'elite_lounge_demo_unique',
            role: 'host',
            onboardingCompleted: true
        };
        let host = await User.findOneAndUpdate({ _id: hostData._id }, hostData, { upsert: true, new: true });
        console.log('✅ Host ID:', host._id);

        // 2. Get or Create Event
        const eventData = {
            _id: '507f1f77bcf86cd799439101',
            title: 'Neon Nights',
            hostId: host._id,
            hostModel: 'User',
            date: new Date(),
            startTime: '21:00',
            status: 'LIVE',
            locationData: { address: 'BKC, Mumbai', lat: 19.076, lng: 72.877 }
        };
        let event = await Event.findOneAndUpdate({ _id: eventData._id }, eventData, { upsert: true, new: true });
        console.log('✅ Event ID:', event._id);

        // 3. Get or Create MenuItem
        let menuItem = await MenuItem.findOneAndUpdate(
            { name: 'Crystal Mojito', eventId: event._id },
            { name: 'Crystal Mojito', price: 1200, category: 'Drinks', eventId: event._id },
            { upsert: true, new: true }
        );
        console.log('✅ MenuItem ID:', menuItem._id);

        // 4. Create Radar Users with Fixed IDs for Local Testing
        const guestSpecs = [
            { id: '507f1f77bcf86cd799439011', name: 'Alina' },
            { id: '507f1f77bcf86cd799439012', name: 'Marcus' },
            { id: '507f1f77bcf86cd799439013', name: 'Maya' }
        ];
        const guests = [];
        for(let spec of guestSpecs) {
            let u = await User.findOneAndUpdate(
                { _id: spec.id },
                { name: spec.name, role: 'user', onboardingCompleted: true, profileImage: 'https://ui-avatars.com/api/?name='+spec.name, username: spec.name.toLowerCase() + '_demo' },
                { upsert: true, new: true }
            );
            guests.push(u);
            await EventPresence.findOneAndUpdate(
                { userId: u._id, eventId: event._id },
                { visibility: true, lastSeen: new Date(), lat: 19.076, lng: 72.877 },
                { upsert: true }
            );
        }
        console.log('✅ 📡 Radar Ready.');

        // 5. Create Waiter Orders
        // Try to find ANY waiter or use host as waiter for demo
        let waiter = await User.findOne({ role: 'waiter' });
        if(!waiter) waiter = host; 

        await FoodOrder.deleteMany({ totalAmount: 99999 }); // Demo marker

        await FoodOrder.create([
            {
                userId: guests[0]._id,
                hostId: host._id,
                eventId: event._id,
                items: [{ menuItemId: menuItem._id, quantity: 1, price: 1200, name: 'Crystal Mojito' }],
                totalAmount: 99999, // marker
                subtotal: 99999, // marker
                status: 'confirmed',
                paymentStatus: 'paid',
                zone: 'VIP',
                tableId: 'T1'
            },
            {
                userId: guests[1]._id,
                hostId: host._id,
                eventId: event._id,
                type: 'gift',
                senderId: guests[1]._id,
                receiverId: guests[2]._id,
                items: [{ menuItemId: menuItem._id, quantity: 1, price: 1200, name: 'Crystal Mojito' }],
                totalAmount: 99999,
                subtotal: 99999,
                status: 'confirmed',
                paymentStatus: 'paid',
                zone: 'Dance Floor',
                tableId: 'Floor'
            }
        ]);
        console.log('✅ 🍽️ Waiter Orders Ready.');
        
        // 6. Create Chat Messages
        await Message.deleteMany({ content: /Seed/ });
        const chatSeeds = [
            { senderId: guests[0]._id, receiverId: guests[1]._id, msg: "Hey Marcus! Loving the music here." },
            { senderId: guests[1]._id, receiverId: guests[0]._id, msg: "Definitely! The energy is amazing. Seed." },
            { senderId: guests[2]._id, receiverId: guests[0]._id, msg: "Hi Alina, want to join our table? Seed." }
        ];
        for(let s of chatSeeds) {
            await Message.create({
                sender: s.senderId,
                receiver: s.receiverId,
                content: s.msg,
                isRead: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 10) // 10 mins ago
            });
        }
        console.log('✅ 💬 Chat Seeds Ready.');

        console.log('\n🚀 ALL SET! Check the app now.');
        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.errors) console.error(err.errors);
        process.exit(1);
    }
};

seedDemoData();
