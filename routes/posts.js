const express = require('express');
const router = express.Router();
const Post = require('../model/post');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const upload = require('express-fileupload');

router.use(upload());

router.use((req, res, next) => {
    const token = req.cookies.auth;
    if (token) {
        jwt.verify(token, 'your-secret-key', (err, decoded) => {
            if (err) {
                res.status(401).redirect("/login");
            } else {
                req.username = decoded.username;
                next();
            }
        });
    } else {
        res.status(401).redirect("/login");
    }
});

router.get('/create', (req, res) => {
    const username = req.username;
    res.render('create', { username });
});

router.post('/create', async (req, res) => {
    try {
        const { content, image_url } = req.body;
        const username = req.username;
        const postTitle = username;

        let image;

        // Check if the user provided an image file
        if (req.files && req.files.image_file && req.files.image_file.name) {
            const uploadedImage = req.files.image_file;
            const imagePath = `/uploads/${Date.now()}_${uploadedImage.name}`;
            await uploadedImage.mv(`public${imagePath}`);
            image = imagePath;
        } else if (image_url) {
            // If image URL is provided
            image = image_url;
        } else {
            // Handle case where no image is provided
            image = null; // or any default image path you want to set
        }

        const newPost = new Post({ title: postTitle, content, image });
        await newPost.save();
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/edit', async (req, res) => {
    const username = req.username;
    const posts = await Post.find({});
    res.render('edit', { username, posts });
});

module.exports = router;
