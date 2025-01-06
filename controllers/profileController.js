const { runDBcommand } = require('../db/connection');
const bcrypt = require('bcrypt');


module.exports.getProfile = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;
        
        if (!isLoggedIn) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const query = `SELECT * FROM User WHERE user_id = ?`;
        const data = await runDBcommand(query, [userId]);

        const paintingsQuery = `SELECT * FROM paintings p INNER JOIN artists a ON p.artist_id = a.artist_id WHERE a.user_id = ?`;
        const paintingsData = await runDBcommand(paintingsQuery, [userId]);

        const paintingsCountQuery = `SELECT COUNT(*) total_count FROM paintings p INNER JOIN artists a ON p.artist_id = a.artist_id WHERE a.user_id = ?`;
        const total_count = await runDBcommand(paintingsCountQuery, [userId]);

        if (paintingsData.length === 0) {
            res.render("profile.ejs", { user: data[0], isLoggedIn, paintings: [], total_count: total_count[0] });
        } else {
            res.render("profile.ejs", { user: data[0], isLoggedIn, paintings: paintingsData, total_count: total_count[0] });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).redirect(`/`);
    }
};

module.exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const data = req.body;

        const checkQuery = `SELECT * FROM User WHERE (email = ? OR phone = ?) AND user_id != ?`;
        const existingUser = await runDBcommand(checkQuery, [data.email, data.phone, userId]);

        if (existingUser.length > 0) {
            res.status(200).json({ success: false, redirect: '/profile', message: 'E-mail або номер телефона вже зайняті' });
            return;
        }

        const updateUserDataQuery = `UPDATE User SET name = ?, surname = ?, email = ?, phone = ?, birth_date = ? WHERE user_id = ?`;
        const updateUserData = await runDBcommand(updateUserDataQuery, [data.name, data.surname, data.email, data.phone, data.age, userId]);

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, redirect: `/profile`, message: 'Помилка' });
    }
};

module.exports.deleteProfile = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.params.id;

        const userQuery = `SELECT * FROM User WHERE user_id = ?`;
        const userData = await runDBcommand(userQuery, [userId]);

        const isMatch = await bcrypt.compare(data.password, userData[0].password);

        if (!isMatch) {
            return res.status(200).json({ success: false, redirect: '/profile', message: 'Невірний пароль' });
        }

        const deleteItemQuery = `DELETE FROM cart_item WHERE cart_id IN (SELECT cart_id FROM cart WHERE user_id = ?)`;
        await runDBcommand(deleteItemQuery, [userId]);
        const deleteCartQuery = `DELETE FROM cart WHERE user_id = ?`;
        await runDBcommand(deleteCartQuery, [userId]);
        const deletePurchaseQuery = `DELETE FROM Purchase WHERE user_id = ?`;
        await runDBcommand(deletePurchaseQuery, [userId]);
        const deleteQuery = `DELETE FROM User WHERE user_id = ?`;
        await runDBcommand(deleteQuery, [userId]);

        res.json({ success: true, redirect: '/logout' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
};






