const mongoose = require('mongoose');
const challengeSchema = new mongoose.Schema({
  description: {
    type: String,
    require: true,
  },
  type: {
    type: String,
    require: true
  },
  typeTimeFrame: {
    type: String,
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 3,
  },
  challengeID: {
    type: Number,
  }
})

module.exports = mongoose.model('challenge', challengeSchema)
