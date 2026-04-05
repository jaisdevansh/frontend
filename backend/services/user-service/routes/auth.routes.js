import express from 'express';
import { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail, sendOtp, verifyOtp, completeOnboarding, googleLogin } from '../controllers/auth.controller.js';
import { protect } from '../../../shared/middlewares/auth.middleware.js';
import { validate } from '../../../shared/middlewares/validator.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, sendOtpSchema, verifyOtpSchema } from '../../../validators/auth.validator.js';

const router = express.Router();

router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/verifyemail/:token', verifyEmail);
router.post('/verifyemail', verifyEmail); // Also support POST with body

// Logout requires token to know who to logout
router.post('/logout', protect, logout);
router.post('/onboarding', protect, completeOnboarding);
router.post('/google', googleLogin); // Google OAuth login

export default router;
