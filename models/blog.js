const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: true,
    },
    post_by: {
      type: String
    },
    description: {
      type: String,
      // required: true,
    },
    banner: [],
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

module.exports = mongoose.model('Blog', blogSchema);