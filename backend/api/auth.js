/**
 * Authentication API
 * Handles admin login/logout with JWT tokens
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import logger from '../utils/logger.js';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * POST /api/auth/login
 * Admin login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Find admin by username
        const admin = await Admin.findByUsername(username);

        if (!admin) {
            logger.warn(`Login attempt failed: User not found - ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await admin.comparePassword(password);

        if (!isValidPassword) {
            logger.warn(`Login attempt failed: Invalid password - ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last login
        await admin.updateLastLogin();

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin._id,
                username: admin.username,
                role: admin.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        logger.info(`Admin logged in: ${username}`);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: admin._id,
                    username: admin.username,
                    role: admin.role
                },
                expiresIn: JWT_EXPIRES_IN
            }
        });

    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if admin still exists and is active
        const admin = await Admin.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: admin._id,
                    username: admin.username,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', (req, res) => {
    // JWT is stateless, so logout is handled client-side
    // This endpoint is for logging purposes
    logger.info('Admin logged out');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * Middleware to protect routes
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const admin = await Admin.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        req.admin = admin;
        next();

    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

export default router;
