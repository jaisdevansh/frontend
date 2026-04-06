import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { User } from '../../../shared/models/user.model.js';
import { Admin } from '../../../shared/models/admin.model.js';
import { Host } from '../../../shared/models/Host.js';
import { Staff } from '../../../shared/models/Staff.js';
import mongoose from 'mongoose';
import { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail, sendOtp, verifyOtp, completeOnboarding, googleLogin } from '../controllers/auth.controller.js';
import { protect } from '../../../shared/middlewares/auth.middleware.js';
import { validate } from '../../../shared/middlewares/validator.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, sendOtpSchema, verifyOtpSchema } from '../../../validators/auth.validator.js';

const router = express.Router();

// ── Passport Google Strategy (for web-based OAuth flow) ──────────────────────
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  'https://test-53pw.onrender.com/api/auth/callback/google',
    scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const name  = profile.displayName || '';
        const picture = profile.photos?.[0]?.value || '';
        const googleId = profile.id;

        if (!email) return done(new Error('No email from Google'), null);

        // Find user across all collections in parallel
        const [adminUser, hostUser, staffUser, normalUser] = await Promise.all([
            Admin.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }),
            Host.findOne({  email: { $regex: new RegExp(`^${email}$`, 'i') } }),
            Staff.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }),
            User.findOne({  email: { $regex: new RegExp(`^${email}$`, 'i') } }),
        ]);

        let user = adminUser || hostUser || staffUser || normalUser;

        if (!user) {
            const tempId = new mongoose.Types.ObjectId();
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
                + tempId.toString().substring(18, 22).toUpperCase();
            user = new User({
                _id: tempId,
                name,
                email,
                profileImage: picture || undefined,
                emailVerified: true,
                role: 'user',
                onboardingCompleted: false,
                isActive: true,
                referralCode,
                googleId,
            });
            await user.save();
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// ── Google OAuth Routes ───────────────────────────────────────────────────────

// Step 1: Redirect user to Google login page
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Step 2: Google calls back → generate JWT → deep-link back to app
router.get('/callback/google',
    passport.authenticate('google', { session: false, failureRedirect: 'entry-club://auth?error=google_failed' }),
    (req, res) => {
        try {
            const user = req.user;
            if (!user) return res.redirect('entry-club://auth?error=no_user');

            const token = jwt.sign(
                { userId: user._id, role: user.role, hostId: user.hostId || null },
                process.env.JWT_SECRET || 'supersecretkey123',
                { expiresIn: '7d' }
            );

            const params = new URLSearchParams({
                token,
                role:                user.role || 'user',
                name:                user.name || '',
                email:               user.email || '',
                profileImage:        user.profileImage || '',
                onboardingCompleted: String(user.onboardingCompleted ?? false),
                hostId:              user.hostId?.toString() || '',
            });

            return res.redirect(`entry-club://auth?${params.toString()}`);
        } catch (err) {
            console.error('[Google Callback] Error:', err.message);
            return res.redirect('entry-club://auth?error=server_error');
        }
    }
);

// ── Existing Auth Routes (unchanged) ─────────────────────────────────────────
router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/verifyemail/:token', verifyEmail);
router.post('/verifyemail', verifyEmail);
router.post('/logout', protect, logout);
router.post('/onboarding', protect, completeOnboarding);
router.post('/google', googleLogin); // Legacy: mobile token-based fallback

export default router;
