const mongoose = require("mongoose");

const ProductCartSchema = mongoose.Schema(
    {
        product : {
            type : mongoose.Types.ObjectId,
            // ref : "Product"
        },
        first_name: {
            type : String
        },
        last_name: {
            type : String
        },
        email: {
            type : String
        },
        adderess : {
            type: String,
            required: true,
        },
        mobile : {
            type: String,
            required: true
        },
        // count : Number,
        amount : {
            type: String,
            required: true
        }
    },
    { timestamps: true, strict: false, autoIndex: true }
);

const ProductCart = mongoose.model("ProductCart", ProductCartSchema);

const orderSchema = new mongoose.Schema(
    {
        userid: mongoose.Types.ObjectId,
        // customerDetail: {},
        status: {
            type: String
        },
        address: {},
        products: [],
        transactionid: {
            type: String
        },
        amount: Number
    },
    { timestamps: true, strict: false, autoIndex: true }
  );
  
// const Order = mongoose.model("Order", orderSchema);

  module.exports = mongoose.model("Order", orderSchema);
  