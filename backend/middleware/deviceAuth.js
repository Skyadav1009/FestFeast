/**
 * Device Token Middleware
 * Handles anonymous device-based authentication via JWT
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'festfeast-default-secret-change-in-production';

/**
 * Generate a new device token
 * @returns {Object} { deviceId, token }
 */
export const generateDeviceToken = () => {
  const deviceId = crypto.randomUUID();
  
  const token = jwt.sign(
    { 
      deviceId,
      type: 'device',
      createdAt: new Date().toISOString()
    },
    JWT_SECRET,
    { expiresIn: '365d' } // Token valid for 1 year
  );
  
  return { deviceId, token };
};

/**
 * Verify and decode a device token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const verifyDeviceToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Express middleware to handle device tokens
 * - Extracts device token from Authorization header or query param
 * - Verifies the token
 * - Attaches deviceId to req.deviceId
 * - If no valid token, generates a new one and attaches it
 */
export const deviceAuthMiddleware = (req, res, next) => {
  // Try to get token from Authorization header or query param
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  } else if (req.headers['x-device-token']) {
    token = req.headers['x-device-token'];
  }
  
  if (token) {
    const decoded = verifyDeviceToken(token);
    if (decoded && decoded.deviceId) {
      req.deviceId = decoded.deviceId;
      req.deviceToken = token;
      return next();
    }
  }
  
  // No valid token - generate a new one
  const { deviceId, token: newToken } = generateDeviceToken();
  req.deviceId = deviceId;
  req.deviceToken = newToken;
  req.isNewDevice = true;
  
  next();
};

/**
 * Strict device auth - requires valid token, returns 401 if missing
 */
export const requireDeviceToken = (req, res, next) => {
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-device-token']) {
    token = req.headers['x-device-token'];
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Device token required'
    });
  }
  
  const decoded = verifyDeviceToken(token);
  if (!decoded || !decoded.deviceId) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired device token'
    });
  }
  
  req.deviceId = decoded.deviceId;
  req.deviceToken = token;
  next();
};

export default {
  generateDeviceToken,
  verifyDeviceToken,
  deviceAuthMiddleware,
  requireDeviceToken
};
