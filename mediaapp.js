const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Added JWT module
const User = require('./model/user');
const Post = require('./model/post');
const updPosts = require('./routes/posts');
const application = express();
const port = 3000;

application.set('view engine', 'ejs');
application.use(cookieParser());
application.use(bodyParser.urlencoded({ extended: true }));
application.use(express.static('public'));

// Connect to MongoDB
const databaseUri = 'mongodb://localhost:27017/mydb';
mongoose.connect(databaseUri)
    .then(() => console.log("DB connected"))
    .catch(err => console.log(`error ${err}`));

// Middleware to check JWT authentication
application.use((req, res, next) => {
    const token = req.cookies.auth;
    if (token) {
        jwt.verify(token, 'your-secret-key', (err, decoded) => {
            if (err) {
                // If JWT verification fails, redirect to login page
                res.status(401).redirect("/login");
            } else {
                // If JWT is valid, set isAuthenticated to true
                req.isAuthenticated = true;
                next();
            }
        });
    } else {
        // If no token found, set isAuthenticated to false
        req.isAuthenticated = false;
        next();
    }
});

// Routes

application.get("/", async (req, res) => {
    try {
        const token = req.cookies.auth;
        if (!token) {
            return res.status(401).redirect("/login");
        }
        jwt.verify(token, 'your-secret-key', async (err, decoded) => {
            if (err) {
                return res.status(401).redirect("/login");
            }
            const curruser = decoded.username;
            const posts = await Post.find({});
            res.render('home', { posts, curruser });
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('home', { error: "Internal server error" });
    }
});

application.get("/logout", (req, res) => {
    res.clearCookie("auth");
    res.status(200).redirect("/login");
});

application.get("/login", (req, res) => {
    res.render('login');
});

application.get("/register", (req, res) => {
    res.render('register', { "error": "" });
});

application.get("/about", (req, res) => {
    res.render('about', { "error": "" });
});

application.get("/contact", (req, res) => {
    res.render('contact', { "error": "" });
});

application.post('/register', async (req, res) => {
    console.log(req.body);
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            res.status(401).render('register', { 'error': "Enter username and password" });
            return;
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            res.status(400).render('register', { "error": "Username already exists" });
            return;
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword
        });
        await newUser.save();
        res.status(201).redirect('/login');
    } catch (error) {
        console.log(error);
        res.status(500).render('register', { 'error': "Internal server error" });
    }
});

application.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ username: user.username }, 'your-secret-key');
            res.cookie('auth', token);
            res.status(201).redirect('/');
        } else {
            res.status(500).render('login', { 'error': "Incorrect username/password" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).render('login', { 'error': "Internal server error" });
    }
});

application.use('/posts', updPosts);

// Start the server
application.listen(port, () => {
    console.log(`Media App is running on http://localhost:${port}`);
});
