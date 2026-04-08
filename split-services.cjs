/**
 * split-services.cjs
 * Splits backend into two self-contained, independently deployable services:
 *   backend-user/   — User-facing APIs
 *   backend-admin/  — Admin, Host, Staff APIs
 *
 * Run from: codebase/
 *   node split-services.cjs
 */
const fs   = require('fs');
const path = require('path');

const ROOT       = __dirname;
const BACKEND    = path.join(ROOT, 'backend');
const USER_SVC   = path.join(ROOT, 'backend-user');
const ADMIN_SVC  = path.join(ROOT, 'backend-admin');

// ─── helpers ──────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
    if (!fs.existsSync(src)) { console.log(`  [SKIP] ${src}`); return; }
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
    }
    console.log(`  [OK] ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
}

function copyFile(src, dest) {
    if (!fs.existsSync(src)) { console.log(`  [SKIP] ${path.relative(ROOT,src)}`); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  [OK] ${path.relative(ROOT,src)} → ${path.relative(ROOT,dest)}`);
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [CREATED] ${path.relative(ROOT, filePath)}`);
}

// ─── shared DEPS for package.json ─────────────────────────────────────────────
const DEPS = {
    "@google/generative-ai": "^0.24.1",
    "@upstash/redis": "^1.37.0",
    "bcryptjs": "^2.4.3",
    "cloudinary": "^2.9.0",
    "compression": "^1.8.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.5.1",
    "firebase-admin": "^13.7.0",
    "helmet": "^7.1.0",
    "ioredis": "^5.10.1",
    "joi": "^17.12.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.2.1",
    "morgan": "^1.10.0",
    "multer": "^2.1.1",
    "node-cache": "^5.1.2",
    "nodemailer": "^8.0.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "rate-limit-redis": "^4.3.1",
    "razorpay": "^2.9.6",
    "resend": "^6.10.0",
    "socket.io": "^4.8.3",
    "twilio": "^5.13.1",
    "winston": "^3.19.0"
};

const nixpacks = `[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = []

[start]
cmd = "node server.js"
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🟢  BACKEND-USER
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🟢  Building backend-user ...\n');
fs.mkdirSync(USER_SVC, { recursive: true });

// Shared infra
copyDir(path.join(BACKEND, 'shared'),     path.join(USER_SVC, 'shared'));
copyDir(path.join(BACKEND, 'middleware'), path.join(USER_SVC, 'middleware'));
copyDir(path.join(BACKEND, 'logs'),       path.join(USER_SVC, 'logs'));
copyDir(path.join(BACKEND, 'validators'), path.join(USER_SVC, 'validators'));
copyDir(path.join(BACKEND, 'config'),     path.join(USER_SVC, 'config'));

// User-service routes & controllers
copyDir(path.join(BACKEND, 'services', 'user-service'), path.join(USER_SVC, 'services', 'user-service'));

// Shared services (cache, notification, twilio)
copyFile(path.join(BACKEND, 'services', 'cache.service.js'),        path.join(USER_SVC, 'services', 'cache.service.js'));
copyFile(path.join(BACKEND, 'services', 'notification.service.js'), path.join(USER_SVC, 'services', 'notification.service.js'));
copyFile(path.join(BACKEND, 'services', 'twilio.service.js'),       path.join(USER_SVC, 'services', 'twilio.service.js'));

// Controllers needed by user routes (events, bookings for browsing/booking)
copyDir(path.join(BACKEND, 'controllers'), path.join(USER_SVC, 'controllers'));

// Socket
copyFile(path.join(BACKEND, 'socket.js'), path.join(USER_SVC, 'socket.js'));

// .env
copyFile(path.join(BACKEND, '.env'), path.join(USER_SVC, '.env'));
copyFile(path.join(BACKEND, '.nvmrc'), path.join(USER_SVC, '.nvmrc'));
copyFile(path.join(BACKEND, '.gitignore'), path.join(USER_SVC, '.gitignore'));

// package.json
writeFile(path.join(USER_SVC, 'package.json'), JSON.stringify({
    name: 'stitch-user-api',
    version: '1.0.0',
    description: 'User-facing API for Stitch',
    main: 'server.js',
    type: 'module',
    scripts: { start: 'node server.js', dev: 'nodemon server.js' },
    engines: { node: '20.x' },
    dependencies: DEPS,
    devDependencies: { nodemon: '^3.1.0' }
}, null, 2));

writeFile(path.join(USER_SVC, 'nixpacks.toml'), nixpacks);

// server.js for user service
writeFile(path.join(USER_SVC, 'server.js'), `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';

dotenv.config();

import { logger } from './logs/logger.js';

const NODE_ENV  = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3001;

// ── User Routes ────────────────────────────────────────────────────────────────
import authRoutes           from './services/user-service/routes/auth.routes.js';
import userRoutes           from './services/user-service/routes/user.routes.js';
import aiRoutes             from './services/user-service/routes/ai.routes.js';
import notificationRoutes   from './services/user-service/routes/notification.routes.js';
import paymentRoutes        from './services/user-service/routes/payment.routes.js';
import discoveryRoutes      from './services/user-service/routes/discovery.routes.js';
import drinkRequestRoutes   from './services/user-service/routes/drinkRequest.routes.js';
import radarRoutes          from './services/user-service/routes/radar.routes.js';
import floorRoutes          from './services/user-service/routes/floor.routes.js';
import chatRoutes           from './services/user-service/routes/chat.routes.js';
import walletRoutes         from './services/user-service/routes/wallet.routes.js';
import couponRoutes         from './services/user-service/routes/coupon.routes.js';
import referralRewardRoutes from './services/user-service/routes/referralReward.routes.js';
import supportRoutes        from './services/user-service/routes/support.routes.js';
import { errorHandler }     from './middleware/error.js';

// ── App Setup ─────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.options('*', cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { success: false, message: 'Too many requests' } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(NODE_ENV === 'production' ? morgan('combined') : morgan('dev'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/',       (_, res) => res.json({ status: 'active', service: 'user-api', env: NODE_ENV }));
app.get('/health', (_, res) => res.status(200).json({ success: true, service: 'user-api', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',                    authRoutes);
app.use('/api/auth',                authRoutes);
app.use('/user',                    userRoutes);
app.use('/discovery',               discoveryRoutes);
app.use('/support',                 supportRoutes);
app.use('/api/v1/support',          aiRoutes);
app.use('/api/v1/notifications',    notificationRoutes);
app.use('/api/v1/payments',         paymentRoutes);
app.use('/api/v1/drink-requests',   drinkRequestRoutes);
app.use('/api/v1/radar',            radarRoutes);
app.use('/api/v1/floors',           floorRoutes);
app.use('/api/v1/chat',             chatRoutes);
app.use('/api/v1/wallet',           walletRoutes);
app.use('/api/v1/coupons',          couponRoutes);
app.use('/api/v1/referral',         referralRewardRoutes);
app.use('/invite',                  referralRewardRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));
app.use(errorHandler);

// ── DB + Start ────────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        if (!MONGO_URI) { logger.error('MONGO_URI missing'); process.exit(1); }
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 50 });
        logger.info('✔ MongoDB connected (user-api)');

        const { initSocket } = await import('./socket.js');
        const { initLocationRevealService } = await import('./services/user-service/services/locationReveal.service.js');
        const { initIssueEscalationService } = await import('./services/user-service/services/issueEscalation.service.js');

        const server = app.listen(PORT, '0.0.0.0', () => logger.info(\`🚀 User API on port \${PORT}\`));
        server.keepAliveTimeout = 65000;
        server.headersTimeout   = 66000;
        initSocket(server);
        initLocationRevealService();
        initIssueEscalationService();

        // Cache warm-up
        setTimeout(async () => {
            try {
                const { Event }        = await import('./shared/models/Event.js');
                const { User }         = await import('./shared/models/user.model.js');
                const { cacheService } = await import('./services/cache.service.js');
                try { await User.collection.dropIndex('email_1'); } catch(_) {}
                try { await User.collection.dropIndex('phone_1'); } catch(_) {}
                await User.syncIndexes();
                const today = new Date(); today.setHours(0,0,0,0);
                const events = await Event.find({ status: 'LIVE', date: { $gte: today } })
                    .select('title date startTime coverImage locationVisibility isLocationRevealed locationData floorCount tickets floors hostId hostModel attendeeCount')
                    .sort({ date: 1 }).lean();
                await cacheService.set('events_all_guest_v11', events, 120);
                logger.info('⚡ Cache warm-up complete');
            } catch(e) { logger.warn('[Cache] ' + e.message); }
        }, 3000);

    } catch(err) { logger.error(err.message); process.exit(1); }
};

startServer();
process.on('uncaughtException',  (err) => { logger.error('Uncaught Exception',  err); process.exit(1); });
process.on('unhandledRejection', (err) => { logger.error('Unhandled Rejection', err); process.exit(1); });
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔵  BACKEND-ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🔵  Building backend-admin ...\n');
fs.mkdirSync(ADMIN_SVC, { recursive: true });

// Shared infra
copyDir(path.join(BACKEND, 'shared'),     path.join(ADMIN_SVC, 'shared'));
copyDir(path.join(BACKEND, 'middleware'), path.join(ADMIN_SVC, 'middleware'));
copyDir(path.join(BACKEND, 'logs'),       path.join(ADMIN_SVC, 'logs'));
copyDir(path.join(BACKEND, 'validators'), path.join(ADMIN_SVC, 'validators'));
copyDir(path.join(BACKEND, 'config'),     path.join(ADMIN_SVC, 'config'));

// Admin service routes & controllers
copyDir(path.join(BACKEND, 'services', 'admin-service'), path.join(ADMIN_SVC, 'services', 'admin-service'));

// Auth routes (admin/host login via same OTP system)
copyDir(path.join(BACKEND, 'services', 'user-service'), path.join(ADMIN_SVC, 'services', 'user-service'));

// Shared services
copyFile(path.join(BACKEND, 'services', 'cache.service.js'),        path.join(ADMIN_SVC, 'services', 'cache.service.js'));
copyFile(path.join(BACKEND, 'services', 'notification.service.js'), path.join(ADMIN_SVC, 'services', 'notification.service.js'));
copyFile(path.join(BACKEND, 'services', 'twilio.service.js'),       path.join(ADMIN_SVC, 'services', 'twilio.service.js'));

// All controllers (host/admin routes reference them)
copyDir(path.join(BACKEND, 'controllers'), path.join(ADMIN_SVC, 'controllers'));

// Socket
copyFile(path.join(BACKEND, 'socket.js'), path.join(ADMIN_SVC, 'socket.js'));

// .env
copyFile(path.join(BACKEND, '.env'), path.join(ADMIN_SVC, '.env'));
copyFile(path.join(BACKEND, '.nvmrc'), path.join(ADMIN_SVC, '.nvmrc'));
copyFile(path.join(BACKEND, '.gitignore'), path.join(ADMIN_SVC, '.gitignore'));

// package.json
writeFile(path.join(ADMIN_SVC, 'package.json'), JSON.stringify({
    name: 'stitch-admin-api',
    version: '1.0.0',
    description: 'Admin/Host/Staff API for Stitch',
    main: 'server.js',
    type: 'module',
    scripts: { start: 'node server.js', dev: 'nodemon server.js' },
    engines: { node: '20.x' },
    dependencies: DEPS,
    devDependencies: { nodemon: '^3.1.0' }
}, null, 2));

writeFile(path.join(ADMIN_SVC, 'nixpacks.toml'), nixpacks);

// server.js for admin service
writeFile(path.join(ADMIN_SVC, 'server.js'), `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';

dotenv.config();

import { logger } from './logs/logger.js';

const NODE_ENV  = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;
const PORT      = process.env.PORT || 3002;

// ── Auth (shared — host/admin also log in via OTP) ────────────────────────────
import authRoutes    from './services/user-service/routes/auth.routes.js';

// ── Admin / Host / Staff Routes ───────────────────────────────────────────────
import adminRoutes    from './services/admin-service/routes/admin.routes.js';
import adminChatRoutes from './services/admin-service/routes/adminChat.routes.js';
import analyticsRoutes from './services/admin-service/routes/analytics.routes.js';
import hostRoutes     from './services/admin-service/routes/host.routes.js';
import staffRoutes    from './services/admin-service/routes/staff.routes.js';
import waiterRoutes   from './services/admin-service/routes/waiter.routes.js';
import securityRoutes from './services/admin-service/routes/security.routes.js';
import { errorHandler } from './middleware/error.js';

// ── App Setup ─────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.options('*', cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { success: false, message: 'Too many requests' } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(NODE_ENV === 'production' ? morgan('combined') : morgan('dev'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/',       (_, res) => res.json({ status: 'active', service: 'admin-api', env: NODE_ENV }));
app.get('/health', (_, res) => res.status(200).json({ success: true, service: 'admin-api', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',             authRoutes);      // host/admin login
app.use('/api/auth',         authRoutes);
app.use('/admin',            adminRoutes);
app.use('/admin-chat',       adminChatRoutes);
app.use('/host',             hostRoutes);
app.use('/analytics',        analyticsRoutes);
app.use('/api/v1/staff',     staffRoutes);
app.use('/api/v1/waiter',    waiterRoutes);
app.use('/api/v1/security',  securityRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));
app.use(errorHandler);

// ── DB + Start ────────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        if (!MONGO_URI) { logger.error('MONGO_URI missing'); process.exit(1); }
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 50 });
        logger.info('✔ MongoDB connected (admin-api)');

        const { initSocket } = await import('./socket.js');

        const server = app.listen(PORT, '0.0.0.0', () => logger.info(\`🚀 Admin API on port \${PORT}\`));
        server.keepAliveTimeout = 65000;
        server.headersTimeout   = 66000;
        initSocket(server);

        // Pre-warm admin stats cache
        setTimeout(async () => {
            try {
                const { Host }    = await import('./shared/models/Host.js');
                const { Booking } = await import('./shared/models/booking.model.js');
                const { User }    = await import('./shared/models/user.model.js');
                const { cacheService } = await import('./services/cache.service.js');
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
                logger.info('⚡ Admin cache warm-up complete');
            } catch(e) { logger.warn('[AdminCache] ' + e.message); }
        }, 3000);

    } catch(err) { logger.error(err.message); process.exit(1); }
};

startServer();
process.on('uncaughtException',  (err) => { logger.error('Uncaught Exception',  err); process.exit(1); });
process.on('unhandledRejection', (err) => { logger.error('Unhandled Rejection', err); process.exit(1); });
`);

// ─── Done ─────────────────────────────────────────────────────────────────────
console.log(`
✅ DONE!

Folder structure:
  codebase/
    backend/         ← Original (untouched)
    backend-user/    ← User API (independent)
    backend-admin/   ← Admin/Host/Staff API (independent)
    mobile/          ← React Native app

Next steps:
  1. cd codebase/backend-user  && npm install
  2. cd codebase/backend-admin && npm install

  3. Test locally:
     node server.js  (from backend-user  — runs on :3001)
     node server.js  (from backend-admin — runs on :3002)

Render deployment:
  Service 1: Root dir = codebase/backend-user  | Start = node server.js
  Service 2: Root dir = codebase/backend-admin | Start = node server.js
`);
