import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
