const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'campuseats_secret_jwt_key_2026_super_secure';

// Middleware to verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access denied. Malformed token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { user_id, name, email, role }
    next();
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};

// Middleware to authorize specific roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Access requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, JWT_SECRET };
