// models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Invalid email format'], // Basic email validation
  },
  password: {
    type: String,
    required: true,
    
  },
  resetCode: {
    type: String, // Reset code for password recovery
    default: null, // Optional, null by default
  },
});

module.exports = mongoose.model('Admin', adminSchema);
