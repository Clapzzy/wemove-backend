const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto')
require("dotenv").config();

const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const accessKey = process.env.ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion
})

function generateToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
}

function generateRefreshToken(user) {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
}

const randomImageName = (bytes = 32) => {
  const randomHex = crypto.randomBytes(bytes).toString('hex')

  return `${randomHex}.jpg`
}

async function getImageUrlS3(imageName) {
  const getObjectParams = {
    Bucket: bucketName,
    Key: imageName
  }

  const command = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return url
}

async function uploadBase64ToS3(base64Image) {
  // Remove the "data:image/jpeg;base64," part if it exists
  console.log(base64Image)
  const imageName = randomImageName(64)
  const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, "");

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Body: buffer,
    ContentType: 'image/jpeg'
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);
}

module.exports = {
  "generateRefreshToken": generateRefreshToken,
  "generateToken": generateToken,
  "randomImageName": randomImageName,
  "uploadBase64ToS3": uploadBase64ToS3,
  "getImageUrlS3": getImageUrlS3,
}
