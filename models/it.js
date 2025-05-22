const mongoose = require('mongoose');

const itSchema = new mongoose.Schema({
  prodName: {
    type: String,
    required: true,
    trim: true,
  },
  prodDesc: {
    type: String,
    required: true
  },
  prodCat: {
    type: String,
    required: true,
    enum: [
      'Laptops',
      'Desktops',
      'Hardware',
      'Printers & Accessories',
      'UPS & Projectors',
      'Starlink',
      'Server',
      'Copiers',
    ],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  availability: {
    type: Boolean,
    required: true,
  },
  images: {
    type: [String], // Store image paths or URLs
    validate: {
      validator: arrayLimit,
      message: 'You must upload between 1 and 6 images.',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Custom validator for images array length
function arrayLimit(val) {
  return Array.isArray(val) && val.length >= 1 && val.length <= 6;
}

module.exports = mongoose.model('It', itSchema);
