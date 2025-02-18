const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { User } = require("../models/user");
var jwt = require("jsonwebtoken");
var { expressjwt } = require("express-jwt");
const { v4: uuidv4 } = require("uuid");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const helper = require("../utilities/helper");

// const accountSid = process.env.OTPSID;
// const authToken = process.env.OTPAUTH;
// const client = require('twilio')(accountSid, authToken);
const responseManager = require("../utilities/responseManager");
const { transporter } = require("../utilities/helper");

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.CLIENT_ID,
//       clientSecret: process.env.CLIENT_SECRET,
//       callbackURL: "/api/google/callback",
//       scope: ["profile", "email"],
//     },
//     function (accessToken, refreshToken, profile, callback) {
//       // User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       //   return cb(err, user);
//       // });
//       console.log("profile : ", profile);
//       callback(null, profile);
//     }
//   )
// );
// // passport.use(User.createStrategy());

// passport.serializeUser(function (user, done) {
//   done(null, user.id);
// });
// passport.deserializeUser(function (id, done) {
//   User.findById(id).then((user) => {
//     done(null, user);
//   });
// });

passport.use(User.createStrategy());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://api.goldtouchjewels.com/api/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: ["profile", "email"],
    },
    function (accessToken, refreshToken, profile, cb) {
      const userData = profile._json;
      User.findOne({ email: userData.email })
        .lean()
        .then((user) => {
          if (user !== null && user.verified == true) {
            helper
              .generateAccessToken({
                userid: user._id.toString(),
              })
              .then((tok) => {
                return cb(null, user, { token: tok });
              })
              .catch((err) => {
                return cb(err, null);
              });
          } else {
            // console.log("test");
            User.findOrCreate(
              {
                googleId: userData.sub,
                first_name: userData.given_name,
                last_name: userData.family_name,
                email: userData.email,
                profile_pic: userData.picture,
                verified: true,
                // verified: userData.email_verified,
              }
              // function (err, user) {
              //   return cb(err, user);
              // }
            )
              .then(() => {
                User.findOne({ email: userData.email })
                  .lean()
                  .then((fuser) => {
                    let mailOptions = {
                      from: process.env.EMAIL, // Sender address
                      to: fuser.email, // List of recipients
                      subject: "Welcome To Gold Touch", // Subject line
                      // text: "Hello, Your otp is " + otp, // Plain text body
                      html: `<b>Hello ${fuser.first_name} ${fuser.last_name}, Welcome to Gold Touch!</b>`, // HTML body (optional)
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                      if (error) {
                        // console.log("Error:", error);
                      } else {
                        // console.log("Email sent:", info.response);
                      }
                    });
                    helper
                      .generateAccessToken({
                        userid: new mongoose.Types.ObjectId(
                          fuser._id
                        ).toString(),
                      })
                      .then((tok) => {
                        return cb(null, fuser, { token: tok });
                      })
                      .catch((err) => {
                        return cb(err, null);
                      });
                    // return responseManager.onSuccess(
                  })
                  .catch((err) => {
                    // Handle errors
                    return cb(err, null);
                  });

                //   "User login successfully",
                //   { token: getToken },
                //   res
                // );
              })
              .catch((err) => {
                // Handle errors
                return cb(err, null);
              });
          }
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// exports.signup = async (req, res) => {
//   console.log(user);
//   const user = new User(req.body);
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(422).json({
//       error: errors.array()[0].msg,
//     });
//   }
//   await user
//     .save()
//     .then((user) =>
//       res.json({
//         name: user.name,
//         mobile: user.mobile,
//         email: user.email,
//       })
//     )
//     .catch((error) => {
//       return res.status(400).json({
//         error: "Not able to signup user",
//       });
//     });

// let digits = "0123456789";
// for (let i = 0; i < 4; i++) {
//   OTP += digits[Math.floor(Math.random() * 10)];
// }

//   let otpTo = "+91"+user.mobile;
//   console.log(otpTo);
//   // await client.messages.create({
//   //   body : `Hi, please verify your otp ${OTP}.`, from: '+15418978833', to: otpTo
//   // })
//   //   .then(message => console.log(message.sid, "res : ", message))

// };

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    const userData = await User.findOne({ email }).select("otp").lean();
    if (userData && userData != null) {
      const password = userData.otp;
      const dec_otp = await helper.passwordDecryptor(password);
      if (dec_otp == otp) {
        await User.findByIdAndUpdate(userData._id, {
          verified: true,
          otp: null,
        });
        return responseManager.onSuccess("User verified successfully", 1, res);
      } else {
        return responseManager.badrequest({ message: "Wrong otp" }, res);
      }
    } else {
      return responseManager.badrequest(
        { message: "User does not exist" },
        res
      );
    }
    // if (userData.otp != otp) {
    //   return res.status(400).json({ error: "wrong otp." });
    // } else {
    //   return res.status(200).json({ message: "OTP verified." });
    // }
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
};

exports.forgotPassword = async (req, res) => {
  // if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
  const { email } = req.body;
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    const userData = await User.findOne({ email })
      .select("email verified")
      .lean();
    if (userData && userData != null) {
      if (userData && userData.verified == true) {
        const otp = await helper.otpGenerator();

        let mailOptions = {
          from: process.env.EMAIL, // Sender address
          to: email, // List of recipients
          subject: "OTP", // Subject line
          text: "Hello, Your otp is " + otp, // Plain text body
          // html: "<b>Hello, this is a test email from <i>Node.js</i>!</b>" + otp, // HTML body (optional)
        };
        const enc_otp = await helper.passwordEncryptor(otp);
        await User.findByIdAndUpdate(userData._id, { otp: enc_otp });
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            // console.log("Error:", error);
          } else {
            // console.log("Email sent:", info.response);
          }
          return responseManager.onSuccess("Otp send successfully", 1, res);
        });
      } else {
        return responseManager.badrequest(
          { message: "User not verified" },
          res
        );
      }
    } else {
      return responseManager.badrequest(
        { message: "User does not exist" },
        res
      );
    }
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
  // } else {
  //   return responseManager.badrequest(
  //     { message: "Invalid token to update password" },
  //     res
  //   );
  // }
};

// exports.signin = (req, res) => {
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(422).json({
//       error: errors.array()[0].msg,
//     });
//   }

//   const { mobile, pass } = req.body;

//   User.findOne({ mobile })
//     .then((user) => {
//       if (!user) {
//         return res.status(400).json({
//           error: "User mobile does not exists",
//         });
//       }

//       if (!user.authenticate(pass)) {
//         return res.status(401).json({
//           error: "Incorrect mobile or password",
//         });
//       }

//       // create token
//       const token = jwt.sign({ _id: user._id }, process.env.LOGIN_SECRET);

//       // put token in cookie
//       res.cookie("token", token, { expire: new Date() + 30 });

//       // send response to frontend
//       const { _id, name, email, mobile, role } = user;

//       return res.json({ token, user: { _id, name, email, mobile, role } });
//     })
//     .catch((error) =>
//       res.status(400).json({ error: "Sonething went wrong!!" })
//     );
// };

// exports.signout = (req, res) => {
//   res.clearCookie("token");
//   res.json({
//     message: "User signout successfully",
//   });
// };

//  protected routes
// exports.isSignedIn = expressjwt({
//   secret: process.env.LOGIN_SECRET,
//   algorithms: ["HS256"],
//   userProperty: "auth",
// });

// custom middlewares
// exports.isAuthenticated = (req, res, next) => {
//   let checker = req.profile && req.auth && req.profile._id == req.auth._id;

//   if (!checker) {
//     return res.status(403).json({
//       error: "ACCESS DENIED!!",
//     });
//   }
//   next();
// };

// exports.isAdmin = (req, res, next) => {
//   if (req.profile.role === 0) {
//     return res.status(403).json({
//       error: "You are not authorized",
//     });
//   }
//   next();
// };

exports.signup = async (req, res) => {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { first_name, last_name, mobile, email, password } = req.body;
  // const noError =  await responseManager.schemaError(req, res);
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    
    const enc_password = await helper.passwordEncryptor(password);
    const checkExisting = await User.findOne({ email: email }).lean();

    if (checkExisting == null) {

      const otp = await helper.otpGenerator();
      // console.log(otp);
      const enc_otp = await helper.passwordEncryptor(otp);

      const obj = {
        first_name: first_name,
        last_name: last_name,
        mobile: mobile,
        email: email,
        password: enc_password,
        verified: true,
        otp: enc_otp,
      };
      console.log("hello1");

      const data = await User.create(obj);
      console.log("hello2");

      let mailOptions = {
        from: process.env.EMAIL, // Sender address
        to: email, // List of recipients
        subject: "Welcome To Gold Touch", // Subject line
        // text: "Hello, Your otp is " + otp, // Plain text body
        html: `<b>Hello ${first_name} ${last_name}, Welcome to Gold Touch!</b>`, // HTML body (optional)
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          // console.log("Error:", error);
        } else {
          // console.log("Email sent:", info.response);
        }
        return responseManager.onSuccess(
          "User created successfully, please verify",
          {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            mobile: data.mobile,
            verified: data.verified,
          },
          res
        );
      });
    } else {
      if (checkExisting.verified == false) {
        const otp = await helper.otpGenerator();
        // console.log(otp);
        const enc_otp = await helper.passwordEncryptor(otp);

        const obj = {
          first_name: first_name,
          last_name: last_name,
          mobile: mobile,
          email: email,
          password: enc_password,
          verified: false,
          otp: enc_otp,
        };

        const data = await User.findByIdAndUpdate(checkExisting._id, obj);
        return responseManager.onSuccess(
          "User created successfully, please verify",
          {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            mobile: data.mobile,
            verified: data.verified,
          },
          res
        );
      } else {
        return responseManager.badrequest(
          { message: "User already exist" },
          res
        );
      }
    }
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
};

exports.signin = async (req, res) => {
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
  );
  res.setHeader("Access-Control-Allow-Methods", "*");
  const { mobile, password, email } = req.body;

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    const userData = await User.findOne({ email: email }).lean();
    if (userData && userData != null) {
      if (userData && userData !== null && userData.verified == true) {
        const userPassword = await helper.passwordDecryptor(userData.password);
        if (userPassword == password) {
          const getToken = await helper.generateAccessToken({
            userid: userData._id.toString(),
          });
          // await res.cookie("token", getToken, {expire: new Date() + 30});

          return responseManager.onSuccess(
            "User login successfully",
            { token: getToken },
            res
          );
        } else {
          return responseManager.badrequest(
            { message: "Invalid credentials" },
            res
          );
        }
      } else {
        return responseManager.badrequest(
          { message: "User not verified" },
          res
        );
      }
    } else {
      return responseManager.badrequest(
        { message: "User does not exist" },
        res
      );
    }
    // return responseManager.onSuccess("errors.array()[0].msg", userData, res);
    // return console.log("userData", res.json(userData));
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
};

exports.makeAdmin = async (req, res) => {
  const { email } = req.body;

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    const userData = await User.findOne({ email }).select("role").lean();
    if (userData && userData != null) {
      await User.findByIdAndUpdate(userData._id, {
        role: 1,
      });
      return responseManager.onSuccess("You are now admin", 1, res);
    } else {
      return responseManager.badrequest(
        { message: "User does not exist" },
        res
      );
    }
  }
  // if (userData.otp != otp) {
  //   return res.status(400).json({ error: "wrong otp." });
  // } else {
  //   return res.status(200).json({ message: "OTP verified." });
  // }
  else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
};

exports.changePassword = async (req, res) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    const { old_password, new_password, email } = req.body;

    const userData = await User.findOne({ email })
      .select("email password")
      .lean();
    const dec_password = await helper.passwordDecryptor(userData.password);

    // if (dec_password == old_password) {
    const enc_password = await helper.passwordEncryptor(new_password);

    await User.findByIdAndUpdate(userData._id, {
      password: enc_password,
    });

    return responseManager.onSuccess("Password changed successfully", 1, res);
    // } else {
    //   return responseManager.badrequest(
    //     { message: "Old password does not match" },
    //     res
    //   );
    // }
  } else {
    return responseManager.schemaError(errors.array()[0].msg, res);
  }
  // if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
  //   const userData = await User.findById(req.token.userid)
  //     .select("verified password")
  //     .lean();

  //   if (userData && userData.verified == true) {

  //   } else {
  //     return responseManager.badrequest({ message: "User not verified" }, res);
  //   }
  // } else {
  //   return responseManager.badrequest(
  //     { message: "Invalid token to change password" },
  //     res
  //   );
  // }
};

exports.unverifyUser = async (req, res) => {
  const { userid } = req.body;

  if (req.token.userid && mongoose.Types.ObjectId.isValid(req.token.userid)) {
    let userData = await User.findById(req.token.userid)
      .select("verified")
      .lean();

    if (userData && userData.verified == true) {
      let userChangeData = await User.findById(userid)
        .select("verified")
        .lean();

      await User.findByIdAndUpdate(userid, {
        verified: !userChangeData.verified,
      });

      return responseManager.onSuccess("User status updated", 1, res);
    } else {
      return responseManager.badrequest({ message: "User not verified" }, res);
    }
  } else {
    return responseManager.badrequest(
      { message: "Invalid token to update user" },
      res
    );
  }
};
