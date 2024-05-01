const mongoose = require("mongoose")

const tokenSchema = new mongoose.Schema({
  refreshToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: () => Date.now()
  },
  user: {
    type: mongoose.SchemaTypes.ObjectId,
  },
})


module.exports = mongoose.model("jwtRefreshTokens", tokenSchema)
