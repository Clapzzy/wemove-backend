require("dotenv").config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');

//All routes
const user = require('./rourte/user');
const auth = require('./rourte/auth')
const challenges = require('./rourte/challenges')
const posts = require("./rourte/post")
const leaderboard = require("./rourte/leaderboard")

app.use('/leaderboard', leaderboard)
app.use('/challenges', challenges)
app.use('/auth', auth)
app.use('/user', user);
app.use('/posts', posts)


app.use(express.json());
app.use(cors());

/* app.post('/login', (req, res) => {
    const username = req.body.username
    const user = {name: username}
    const webtoken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
    res.json({accessToken : webtoken})
})*/

mongoose.connect(process.env.MONGODB_URL)

app.post("/ping", (req, res) => {
  console.log(req.body.username)
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
