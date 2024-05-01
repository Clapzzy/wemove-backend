const mongoose = require('mongoose');
const crypto = require('crypto');
const { type } = require('os');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true
  },
  hash: {
    type: String,
  },
  salt: {
    type: String,
  },
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  refreshToken: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
  hobbies: [String]
})





userSchema.methods.SetPassword = function(password) {

  this.salt = crypto.randomBytes(16).toString("hex")

  this.hash = crypto.pbkdf2Sync(password, this.salt, 1001, 64, "sha512").toString("hex")

}

userSchema.methods.validatePassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 1001, 64, "sha512").toString("hex")
  return this.hash === hash
}


module.exports = mongoose.model("user", userSchema)
