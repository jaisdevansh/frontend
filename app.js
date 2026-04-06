import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';

// Load Environment Variables FIRST
dotenv.config();

import { logger } from './logs/logger.js';

const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

// ── Import Routes from correct service locations ──────────────────────────────
import authRoutes       from './services/user-service/routes/auth.routes.js';
import userRoutes       from './services/user-service/routes/user.routes.js';
import aiRoutes         from './services/user-service/routes/ai.routes.js';
import notificationRoutes from './services/user-service/routes/notification.routes.js';
import paymentRoutes    from './services/user-service/routes/payment.routes.js';
import discoveryRoutes  from './services/user-service/routes/discovery.routes.js';
import drinkRequestRoutes from './services/user-service/routes/drinkRequest.routes.js';
import radarRoutes      from './services/user-service/routes/radar.routes.js';
import floorRoutes      from './services/user-service/routes/floor.routes.js';
import chatRoutes       from './services/user-service/routes/chat.routes.js';
import walletRoutes     from './services/user-service/routes/wallet.routes.js';
import couponRoutes     from './services/user-service/routes/coupon.routes.js';
import referralRewardRoutes from './services/user-service/routes/referralReward.routes.js';
import supportRoutes    from './services/user-service/routes/support.routes.js';

import adminRoutes      from './services/admin-service/routes/admin.routes.js';
import adminChatRoutes  from './services/admin-service/routes/adminChat.routes.js';
import analyticsRoutes  from './services/admin-service/routes/analytics.routes.js';
import hostRoutes       from './services/admin-service/routes/host.routes.js';
import staffRoutes      from './services/admin-service/routes/staff.routes.js';
import waiterRoutes     from './services/admin-service/routes/waiter.routes.js';
import securityRoutes   from './services/admin-service/routes/security.routes.js';

import { errorHandler } from './middleware/error.js';

// ── App Setup ─────────────────────────────────────────────────────────────────
const app = express();

// 0. Trust Proxy (for Railway/Fly/Render/Nginx)
app.set('trust proxy', 1);

// 1. Security
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.options('*', cors());

// 2. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// 3. Core Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize()); // Passport for Google OAuth

// 4. Logging
if (NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// ── Health / Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'active', environment: NODE_ENV, message: 'Entry Club API Server Running' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ success: true, timestamp: new Date().toISOString() });
});

// ── 5. Routes ──────────────────────────────────────────────────────────────────
// Auth & User
app.use('/auth', authRoutes);        // Legacy OTP-based routes
app.use('/api/auth', authRoutes);    // New Google OAuth routes (/api/auth/google, /api/auth/callback/google)
app.use('/user', userRoutes);

// Discovery
app.use('/discovery', discoveryRoutes);

// Admin & Platform Management
app.use('/admin', adminRoutes);
app.use('/admin-chat', adminChatRoutes);
app.use('/host', hostRoutes);
app.use('/analytics', analyticsRoutes);

// Support
app.use('/support', supportRoutes);

// Feature APIs
app.use('/api/v1/support', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/drink-requests', drinkRequestRoutes);
app.use('/api/v1/radar', radarRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/waiter', waiterRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/floors', floorRoutes);
app.use('/api/v1/chat', chatRoutes);

// Economics
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/referral', referralRewardRoutes);
app.use('/invite', referralRewardRoutes);

// ── 6. 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// ── 7. Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── 8. DB + Server Startup ────────────────────────────────────────────────────
import { initSocket } from './socket.js';
import { initLocationRevealService } from './services/user-service/services/locationReveal.service.js';
import { initIssueEscalationService } from './services/user-service/services/issueEscalation.service.js';

const startServer = async () => {
    try {
        if (!MONGO_URI) {
            logger.error('✘ MONGO_URI is missing. Please check your .env file.');
            process.exit(1);
        }

        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 50,
        });

        logger.info('✔ MongoDB connected successfully');

        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server started on port ${PORT} | Environment: ${NODE_ENV}`);
        });

        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        initSocket(server);
        logger.info('🔌 Socket.io Layer initialized successfully');

        // Start Background Jobs
        initLocationRevealService();
        initIssueEscalationService();

        // 🔥 CACHE WARM-UP: Pre-fetch heavy queries right after boot so first user request is instant
        setTimeout(async () => {
            try {
                const { Event } = await import('./shared/models/Event.js');
                const { User } = await import('./shared/models/user.model.js');
                const { Host } = await import('./shared/models/Host.js');
                const { Booking } = await import('./shared/models/booking.model.js');
                const { cacheService } = await import('./services/cache.service.js');

                // 🚨 CRITICAL: Force fix MongoDB E11000 legacy duplicate key constraint issues
                try {
                    await User.collection.dropIndex('email_1');
                } catch(e) {} // ignore if it doesn't exist
                try {
                    await User.collection.dropIndex('phone_1');
                } catch(e) {}
                await User.syncIndexes();

                // 1. Pre-warm: Live Events (most accessed endpoint)
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const liveEvents = await Event.find({ status: 'LIVE', date: { $gte: startOfToday } })
                    .select('title date startTime coverImage locationVisibility isLocationRevealed locationData floorCount tickets floors hostId hostModel attendeeCount')
                    .sort({ date: 1 })
                    .lean();
                await cacheService.set('events_all_guest_v11', liveEvents, 120);

                // 2. Pre-warm: Admin Stats
                const [userCount, activeHosts, totalHosts, pendingHosts, totalBookings, revenueAgg] = await Promise.all([
                    User.countDocuments({ role: 'user' }),
                    Host.countDocuments({ role: 'HOST', hostStatus: 'ACTIVE' }),
                    Host.countDocuments({ role: 'HOST' }),
                    Host.countDocuments({ hostStatus: { $in: ['INVITED', 'KYC_PENDING'] } }),
                    Booking.countDocuments({ status: { $in: ['approved', 'active', 'completed'] } }),
                    Booking.aggregate([{ $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$pricePaid' } } }])
                ]);
                await cacheService.set('admin_dashboard_stats', {
                    users: userCount, activeHosts, hosts: totalHosts,
                    pendingHosts, bookings: totalBookings,
                    totalRevenue: revenueAgg[0]?.total || 0,
                    updatedAt: new Date()
                }, 300);

                logger.info('⚡ Cache warm-up complete — all hot paths pre-loaded');
            } catch (e) {
                logger.warn('[Cache Warm-up] Non-critical warm-up error: ' + e.message);
            }
        }, 3000); // 3s after boot — gives DB connection time to stabilize

    } catch (error) {
        logger.error(`✘ Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

startServer();

// ── Process Safety Handlers ───────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL: Uncaught Exception!', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    logger.error('CRITICAL: Unhandled Promise Rejection!', err);
    process.exit(1);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected! Attempting to reconnect automatically...');
});

mongoose.connection.on('reconnected', () => {
    logger.info('✔ MongoDB reconnected successfully.');
});

export default app;
