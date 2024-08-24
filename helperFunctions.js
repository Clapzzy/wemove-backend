const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto')
require("dotenv").config();

function generateToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
}

function generateRefreshToken(user) {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
}

const randomImageName = (bytes = 32, originalName) => {
  const randomHex = crypto.randomBytes(bytes).toString('hex')
  const imageExtension = originalName.split('.').pop()

  return `${randomHex}.${imageExtension}`
}

module.exports = {
  "generateRefreshToken": generateRefreshToken,
  "generateToken": generateToken,
  "randomImageName": randomImageName,
}
