let mongoose = require("mongoose");
let mongoDB = mongoose.createConnection(process.env.MONGO_CONNECT);
mongoose.set('runValidators',true)
module.exports = mongoDB;
