const express = require('express');
const router = express.Router();

const tokens = require("../model/authTokens")
const jwt = require("jsonwebtoken")
const helperFunctions = require("../helperFunctions")
const user = require('../model/user');
const { default: mongoose } = require('mongoose');


router.post("/token", async (req, res) => {
  const refresh_token = req.body.token
  const found_token = await tokens.findOne({ refreshToken: refresh_token }).limit(1)
  console.log(found_token)
  console.log(refresh_token)
  if (refresh_token == null) return res.sendStatus(401)
  if (found_token == null) return res.sendStatus(403)
  jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    const accessToken = helperFunctions.generateToken({ name: user.name })
    res.json({ accessToken: accessToken })
  })
})


module.exports = router
