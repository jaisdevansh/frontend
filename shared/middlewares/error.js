import { logger } from '../../logs/logger.js';

export const errorHandler = (error, req, res, next) => {
    logger.error(`Error on ${req.method} ${req.url}:`, error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate key error: Resource already exists'
        });
    }

    if (error.name === 'ValidationError') {
        const details = Object.values(error.errors || {}).map(e => e.message).join(', ') || error.message;
        return res.status(400).json({ success: false, message: 'Validation Error', details });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format or resource not found' });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    // Default error
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message || 'Internal Server Error',
        data: {}
    });
};
