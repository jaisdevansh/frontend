import jwt from 'jsonwebtoken';
import { User } from '../../shared/models/user.model.js';
import { Admin } from '../../shared/models/admin.model.js';
import { Host } from '../../shared/models/Host.js';
import { Staff } from '../../shared/models/Staff.js';
import { cacheService } from '../../services/cache.service.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies first, then auth header
        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized to access this route', data: {} });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');

        // ⚡ HIGH-PERFORMANCE ROLE & STATUS VALIDATION (Sub-ms via Redis)
        // Correct segments - this catches if a user is deactivated or their role changes
        const CACHE_KEY = `auth_status_${decoded.userId}`;
        let cached = await cacheService.get(CACHE_KEY);
        
        let userRole = decoded.role;
        let isActive = true;

        if (!cached) {
            const projection = 'role isActive';
             // Atomic, fast lookup
            const user = await User.findById(decoded.userId).select(projection).lean() ||
                   await Host.findById(decoded.userId).select(projection).lean() ||
                   await Staff.findById(decoded.userId).select(projection).lean() ||
                   await Admin.findById(decoded.userId).select(projection).lean();
            
            if (user) {
                userRole = user.role;
                isActive = user.isActive;
                await cacheService.set(CACHE_KEY, { role: userRole, isActive }, 120); // 2 min cache
            } else {
                return res.status(401).json({ success: false, message: 'Record missing from registry.' });
            }
        } else {
            userRole = cached.role;
            isActive = cached.isActive;
        }

        if (!isActive) {
            return res.status(401).json({ success: false, message: 'Your administrative session has been revoked.' });
        }

        req.user = { ...decoded, role: userRole }; // Attach updated role
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token is invalid or expired', data: {} });
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user && (req.user.role?.toUpperCase() === 'ADMIN' || req.user.role?.toUpperCase() === 'SUPERADMIN')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
};
