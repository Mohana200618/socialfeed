import request from 'supertest';
import app from '../src/app.js';

describe('User API', () => {
  describe('GET /api/users', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
    });
  });
});
