const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        payment: {},
        status: {
            type: String
        },
        orderid: {
            type: String
        },
        transactionid: {
            type: String
        },
        amount: Number
    },
    { timestamps: true, strict: false, autoIndex: true }
  );
  
// const Order = mongoose.model("Order", orderSchema);

  module.exports = mongoose.model("Payment", paymentSchema);
  