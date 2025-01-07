const bcrypt = require('bcrypt');
const { runDBcommand } = require('../db/connection');

module.exports.getLoginPage = (req, res) => {
    res.render('login.ejs');
};

module.exports.postLogin = async (req, res) => {
    try {
        const data = req.body;
        const query = `SELECT * FROM User WHERE username = ? OR email = ?`;
        const checkLogin = await runDBcommand(query, [data.login, data.login]);

        if (checkLogin.length === 0) {
            res.status(200).json({ success: false, redirect: '/login', message: 'Невірний логін або пароль'});
            return;
        }

        const isMatch = await bcrypt.compare(data.password, checkLogin[0].password);
        if (!isMatch) {
            res.status(200).json({ success: false, redirect: '/login', message: 'Невірний логін або пароль'});
            return;
        }

        req.session.user = { id: checkLogin[0].user_id, username: checkLogin[0].username };
        res.status(201).json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/');
    }
};

module.exports.getRegisterPage = (req, res) => {
    const message = req.query.message || '';

    res.render('register.ejs', { message: message, inputData: {}}); 
};

module.exports.postRegister = async (req, res) => {
    try {
            const data = req.body;  
            const hashedPassword = await bcrypt.hash(data.password, 10);
    
            const checkQuery = `SELECT * FROM User WHERE username = ? OR email = ?`
            const existingUser = await runDBcommand(checkQuery, [data.username, data.email]);
    
            if (existingUser.length > 0) {
                res.status(200).json({ success: false, redirect: '/register', message: 'Логін або пароль вже зайняті'});
                return;
            }
    
            const query = `INSERT INTO User (username, password, email, role) VALUES (?, ?, ?, ?)`;
            const addToDatabase = await runDBcommand(query, [data.username, hashedPassword, data.email, "user"]);
    
            req.session.user = { id: addToDatabase.insertId, username: addToDatabase.username };
            res.status(201).json({ redirect: '/' });
        } catch (err) {
            console.log(err);   
            res.status(500).redirect('/')
        }
};