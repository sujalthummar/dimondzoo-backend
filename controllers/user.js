const mongoose = require("mongoose");
const { User, Address } = require("../models/user");
const responseManager = require("../utilities/responseManager");
const { validationResult } = require("express-validator");

// exports.getUserById = (req, res, next, id) => {
//   User.findById(id)
//     .exec()
//     .then((user) => {
//       if (!user) {
//         return res.status(400).json({
//           error: "No User found",
//         });
//       }
//       req.profile = user;
//       next();
//     })
//     .catch((err) => res.status(400).json({ error: "Sonething went wrong!!" }));
// };

// exports.getUser = (req, res) => {
//   req.profile.salt = undefined;
//   req.profile.password = undefined;
//   req.profile.__v = undefined;

//   return res.json(req.profile);
// };

// exports.updateUser = (req, res) => {
//   User.findByIdAndUpdate(
//     { _id: req.profile._id },
//     { $set: req.body },
//     { new: true, useFindAndModify: false }
//   )
//     .then((user) => {
//       user.salt = undefined;
//       user.password = undefined;

//       return res.json(user);
//     })
//     .catch((err) => res.status(400).json({ error: "Something went wrong!!" }));
// };

// exports.userPurchaseList = (req, res) => {
//   Order.find({ user: req.profile._id })
//     .populate("user", "_id name")
//     .exec()
//     .then((err, order) => {
//       if (!order) {
//         return res.status(400).json("No Order Found");
//       }

//       return res.json(order);
//     })
//     .catch((err) => res.status(400).json({ error: "Something went wrong!!" }));
// };

// exports.pushOrderInPurchaseList = (req, res, next) => {
//   let purchases = [];

//   req.body.order.products.forEach((product) => {
//     purchases.push({
//       _id: product._id,
//       name: product.name,
//       description: product.description,
//       category: product.category,
//       quantity: product.quantity,
//       amount: req.body.order.amount,
//       transaction_id: req.body.order.transaction_id,
//     });
//   });

//   User.findOneAndUpdate(
//     { _id: req.profile._id },
//     { $push: { purchases: purchases } },
//     { new: true }
//   )
//     .then((purchases) => {
//       next();
//     })
//     .catch((err) => res.status(400).json("Something went wrong"));

//   next();
// };

exports.getUser = async (req, res) => {
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .populate([
        { path: "address", populate: { path: "_id", model: Address , select: "-__v"} },
      ])
      .select("-otp -password -createdAt -updatedAt -__v")
      .lean();
    if (userData && userData.verified == true) {
      return responseManager.onSuccess("User profile", userData, res);
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to get user profile" },
      res
    );
  }
};

exports.getAllUser = async (req, res) => {
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();
    const { page, limit } = req.query;
    const p = Number(page) ? Number(page) : 1;
    const l = Number(limit) ? Number(limit) : 10;

    if (userData && userData.verified == true) {
      User.countDocuments()
        .then((totalRecords) => {
          return User.find()
            .sort({ _id: -1 })
            .skip((p - 1) * l)
            .limit(l)
            // .select("-googleId -purchases -address -profile_pic -password -otp -createdAt -updatedAt -__v")
            .select("first_name last_name email verified role")
            .lean()
            .then((userList) => {
              return responseManager.onSuccess(
                "User list",
                { list: userList, total: totalRecords },
                res
              );
            })
            .catch((error) => {
              return responseManager.onError(error, res);
            });
        })
        .catch((error) => {
          return responseManager.onError(error, res);
        });
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to get user list" },
      res
    );
  }
};

exports.updateUser = async (req, res) => {
  const { first_name, last_name, email } = req.body;

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
      let userData = await User.findById(req.token.userid)
        .select("-password -role -createdAt -updatedAt -__v")
        .lean();

      if (userData && userData.verified == true) {
        const obj = {
          first_name: first_name,
          last_name: last_name,
          email: email,
        };
        await User.findByIdAndUpdate(req.token.userid, obj);

        let userData = await User.findById(req.token.userid)
          .select("-password -role -createdAt -updatedAt -__v")
          .lean();

        return responseManager.onSuccess("User profile updated", userData, res);
      } else {
        return responseManager.badrequest(
          { message: "User not verified" },
          res
        );
      }
    } else {
      return responseManager.badrequest(
        { message: "Invalid token to update user profile" },
        res
      );
    }
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
};

exports.removeUser = async (req, res) => {
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      const { userid } = req.body;

      if (
        userid &&
        userid != "" &&
        mongoose.Types.ObjectId.isValid(userid)
      ) {
        await User.findByIdAndRemove(userid);
        return responseManager.onSuccess(
          "User removed successfully",  
          1,
          res
        );
      } else {
        return responseManager.badrequest(
          { message: "Invalid user id to remove product" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to remove product" },
      res
    );
  }
};

exports.address = async (req, res) => {
  const {
    addressid,
    first_name,
    last_name,
    address1,
    address2,
    city,
    post_code,
    country,
    state,
    mobile,
    default_address,
  } = req.body;

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    let userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    const defaultData = await Address.findOne({
      userid: req.token.userid,
      default_address: true,
    }).lean();

    if (userData && userData.verified == true) {
      if (defaultData != null && default_address == true) {
        await Address.findByIdAndUpdate(defaultData._id, {
          default_address: false,
        });
      }
      if (
        addressid &&
        addressid != "" &&
        mongoose.Types.ObjectId.isValid(addressid)
      ) {
        const obj = {
          userid: req.token.userid,
          first_name: first_name,
          last_name: last_name,
          address1: address1,
          address2: address2 ? address2 : "",
          city: city,
          state: state,
          post_code: post_code,
          country: country,
          mobile:mobile,
          default_address: default_address,
        };
        await Address.findByIdAndUpdate(addressid, obj);

        let addressData = await Address.findById(addressid)
          .select("-createdAt -updatedAt -__v")
          .lean();
        return responseManager.onSuccess("Address updated", addressData, res);
      } else {
        const obj = {
          userid: req.token.userid,
          first_name: first_name,
          last_name: last_name,
          address1: address1,
          address2: address2 ? address2 : "",
          city: city,
          state: state,
          post_code: post_code,
          country: country,
          mobile: mobile,
          default_address: default_address,
        };
        const addressData = await Address.create(obj);
        await User.findByIdAndUpdate(req.token.userid, {
          $push: { address: { _id: addressData._id } },
        });

        return responseManager.onSuccess(
          "Address added successfully",
          addressData,
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to update user profile" },
      res
    );
  }
};

exports.removeAddress = async (req, res) => {
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    const userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      const { addressid } = req.body;

      if (
        addressid &&
        addressid != "" &&
        mongoose.Types.ObjectId.isValid(addressid)
      ) {
        const da = await User.findByIdAndUpdate(
          req.token.userid,
          {
            $pull: {
              address: { _id: addressid },
            },
          },
          { new: true }
        );
        await Address.findByIdAndRemove(addressid);
        return responseManager.onSuccess(
          "Address removed successfully",
          1,
          res
        );
      } else {
        return responseManager.badrequest(
          { message: "Invalid address id remove address" },
          res
        );
      }
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to remove product" },
      res
    );
  }
};

exports.listAddress = async (req, res) => {
  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    Address.find({ userid: req.token.userid })
      .sort({ _id: -1 })
      .lean()
      .then((addressData) => {
        return responseManager.onSuccess("Address list", addressData, res);
      })
      .catch((error) => {
        return responseManager.onError(error, res);
      });
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to get address" },
      res
    );
  }
};
