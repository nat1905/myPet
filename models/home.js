const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const homeSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  make: {
    type: String,
  },
  model: {
    type: String,
  },
  year: {
    type: Number,
  },
  pricePerHour: {
    type: Number,
  },
  pricePerWeek: {
    type: Number,
  },

  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Home", homeSchema);
