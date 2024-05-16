const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const posts = require("../model/posts");


router.post("/add", async (req, res) => {
  try {
    const post = new posts()

    post.userId = req.body.userId
    post.text = req.body.text
    post.datePosted = new Date()

    await post.save()

    return res.status(201).send({ message: "post was succsesfully created" })

  } catch (error) {
    res.status(400).send({ message: error })
  }
})

router.get('/getPosts', async (req, res) => {
  try {
    const postsGotten = await posts.find({}).limit(10)
    return res.status(200).send(postsGotten)

  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

module.exports = router;
