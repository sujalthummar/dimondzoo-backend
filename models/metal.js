const mongoose = require("mongoose");
let mongoosePaginate = require("mongoose-paginate-v2");

const metalSchema = new mongoose.Schema(
  {
    productid: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    m_id: {
      type: String,
      required: false
    },
    sku_name: {
      type: String,
      // required: true,
    },
    metal: {
      type: String,
      required: true,
    },
    material_wise: [
      {
        material: {
          type: String,
          // required: true,
        },
        diamond_type: {
          type: String,
          required: true,
          // enum: ["Moissanite", "Lab Grown", "Natural-Real-Mined"],
        },
        price: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          // required: true,
        },
        special_price: {
          type: Number,
          // required: true,
        },
        _id: false,
      },
    ],
    size: {
      type: String,
      // required: true,
    },
    photos: [],
  },
  { timestamps: true, strict: false, autoIndex: true }
);

metalSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Metal", metalSchema);
