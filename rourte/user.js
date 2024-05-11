const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const user = require('../model/user');

router.post('/login', async (req, res) => {
  let foundUser = await user.findOne({ email: req.body.email })
  if (foundUser === null) {
    return res.status(400).send({
      message: "User not found."
    });
  }
  else {
    if (foundUser.validatePassword(req.body.password)) {
      return res.status(201).send({
        message: "User found.",
      })
    }
    else {
      return res.status(400).send({
        message: "Invalid Password"
      })
    }
  }
})

router.post('/signup', async (req, res) => {
  try {
    let newUser = new user();

    newUser.username = req.body.username
    newUser.email = req.body.email
    newUser.display_name = req.body.display_name
    newUser.birthday = req.body.birthday

    newUser.SetPassword(req.body.password);
    const access_token = helperFunctions.generateToken({ userId: newUser._id })
    const refresh_token = helperFunctions.generateRefreshToken({ userId: newUser._id })
    newUser.refreshToken = refresh_token
    await newUser.save()
    return res.status(201).send({
      access_token: access_token,
      refresh_token: refresh_token,
      message: "User created successfully."
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      message: "Falied to create a user",
      'error': error
    })
  }
});

module.exports = router;
