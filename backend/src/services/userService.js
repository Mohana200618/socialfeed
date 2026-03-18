import User from '../models/User.js';
import bcrypt from 'bcryptjs';

class UserService {
  async findAll() {
    return await User.findAll();
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findByEmail(email);
  }

  async create(userData) {
    // Hash password
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const user = await User.create(userData);
    return user;
  }

  async update(id, userData) {
    // Hash password if it's being updated
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    return await User.update(id, userData);
  }

  async delete(id) {
    return await User.delete(id);
  }

  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
}

export default new UserService();
