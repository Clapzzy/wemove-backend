const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config();

function generateToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
}

function generateRefreshToken(user) {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
}
module.exports = {
  "generateRefreshToken": generateRefreshToken,
  "generateToken": generateToken,
}
