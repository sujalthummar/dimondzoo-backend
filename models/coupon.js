const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: true,
    },
    description: {
      type: String,
      // required: true,
    },
  },
  { timestamps: true, strict: false, autoIndex: true }
);

module.exports = mongoose.model('Coupon', couponSchema);