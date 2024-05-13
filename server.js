require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');

const user = require('./rourte/user');
const auth = require('./rourte/auth')
const challenges = require('./rourte/challenges')

app.use(express.json());
app.use(cors());

app.use('/challenge', challenges)
app.use('/auth', auth)
app.use('/user', user);

mongoose.connect(process.env.MONGODB_URL)

/* app.post('/login', (req, res) => {
    const username = req.body.username
    const user = {name: username}
    const webtoken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
    res.json({accessToken : webtoken})
})*/

app.get("/ping", (req, res) => {
  res.json({ ping: "hello" })
})

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

app.listen(port, () => console.log("Running server")); 
