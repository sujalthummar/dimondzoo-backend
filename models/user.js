const mongoose = require("mongoose");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");

const addressSchema = new mongoose.Schema(
  {},
  { timestamps: false, strict: false, autoIndex: true }
);

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      // required: true,
    },
    last_name: {
      type: String,
      // required: true,
    },
    profile_pic: {
      type: String,
    },
    email: {
      type: String,
      // required: true,
    },
    // mobile: {
    //   type: String,
    //   // required: true,
    // },
    password: {
      type: String,
      // required: true,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    // salt: String, // random no. generate
    role: {
      type: Number,
      default: 0,
    },
    purchases: [],
    address: [addressSchema],
    otp: {
      type: String,
      required: false,
      index: { expires: 120 },
    },
    meta: {
      meta_title: {
        type: String,
        required: false,
      },
      meta_description: {
        type: String,
        required: false,
      },
    },
  },
  { timestamps: true, strict: false, autoIndex: true }
);

// userSchema
//   .virtual("pass")
//   .set(function (pass) {
//     this._pass = pass;
//     this.salt = uuidv4();
//     this.password = this.securePassword(pass);
//   })
//   .get(function () {
//     return this._pass;
//   });

// userSchema.methods = {
//   authenticate: function (plainPassword) {
//     return this.securePassword(plainPassword) === this.password;
//   },

//   securePassword: function (plainPassword) {
//     if (!plainPassword) return "";
//     try {
//       return crypto
//         .createHmac("sha256", this.salt)
//         .update(plainPassword)
//         .digest("hex");
//     } catch (error) {
//       console.log(error);
//       return "";
//     }
//   },
// };
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const Address = mongoose.model("Address", addressSchema);
const User = mongoose.model("User", userSchema);

module.exports = { User, Address };
