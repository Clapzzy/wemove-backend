const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const user = require('../model/user');

router.get("/search", async (req, res) => {
  try {
    const searchKeyword = req.query.searchKeyword
    const lastId = req.query.lastId
    if (searchKeyword == '') {
      return res.status(400).send({ message: 'Search input should not be empty!!!' })
    }

    const regexPattern = new RegExp(searchKeyword, 'i')

    if (lastId == null) {
      const users = await user.find({ 'username': { $regex: regexPattern } }, { username: 1, displayName: 1, picture: 1, }).sort({ _id: 1 }).limit(3)
      return res.status(201).send(users)
    }

    const users = await user.find({ 'username': { $regex: regexPattern }, _id: { $gt: lastId } }, { username: 1, displayName: 1, picture: 1, }).sort({ _id: 1 }).limit(3)

    return res.status(201).send(users)

  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

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
    newUser.displayName = req.body.displayName
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
