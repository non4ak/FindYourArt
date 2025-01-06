let express = require('express');
let app = express();
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
require('dotenv').config();
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const bodyParser = require('body-parser');

const galleryRoutes = require('./routes/gallery');
const loginRoutes = require('./routes/login');
const pictureRoutes = require('./routes/picture');
const profileRoutes = require('./routes/profile');
const paintingRoutes = require('./routes/painting');
const cartRoutes = require('./routes/cart');
const editRoutes = require('./routes/edits');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use('/css', express.static(path.join(__dirname, 'views', 'css')));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'fylhtq[yeht',
    database: 'platform'
});

connection.connect(function(err) {
    if (err) {
        console.error('error conecting' + err.stack);
        return;
    }
    console.log('Success')
});

app.use(
    session({
        secret: secret,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    })
);

app.use('/', galleryRoutes);
app.use(pictureRoutes);
app.use(loginRoutes);
app.use(profileRoutes);
app.use(paintingRoutes);
app.use(cartRoutes);
app.use(editRoutes);

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            res.status(500).send('Помилка виходу');
        } else {
            res.redirect('/');
        }
    });
});

app.listen(3000, () => {
    console.log('Success');
})