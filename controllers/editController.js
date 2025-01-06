const { runDBcommand } = require('../db/connection');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { formatDate } = require('../db/connection');
const path = require('path');

module.exports.getCategories = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;

        if (!isLoggedIn) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const categoriesQuery = `SELECT * FROM categories`;
        const userData = await runDBcommand(`SELECT * FROM User WHERE user_id = ?`, [userId])
        const categories = await runDBcommand(categoriesQuery);
        res.render('edit-tables.ejs', { isLoggedIn, categories: categories, user: userData[0] });
    } catch (err) {
        console.log(err)
        res.status(500).redirect(`/`);
    }
};

module.exports.getArtists = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const isLoggedIn = !!req.session.user; 

        if (!isLoggedIn) {
            return res.redirect('/login');
        }
        const userData = await runDBcommand(`SELECT * FROM User WHERE user_id = ?`, [userId])

        const artistsQuery = `SELECT a.*, COUNT(p.painting_id) AS paintings_count, SUM(p.price) AS total_price, COUNT(CASE WHEN p.availability = 'sold' THEN 1 END) AS sold_paintings_count FROM artists a LEFT JOIN paintings p ON a.artist_id = p.artist_id GROUP BY a.artist_id`;
        const artists = await runDBcommand(artistsQuery);

        const artistsCount = await runDBcommand(`SELECT COUNT(a.artist_id) as artists_count FROM artists a`)

        res.render('artists-stat.ejs', {isLoggedIn, artists: artists, user: userData[0], artistsCount: artistsCount[0]});
    } catch (err) {
        console.log(err)
        res.status(500).redirect(`/profile`);
    }
};

module.exports.getOrders = async (req, res) => {
    const isLoggedIn = !!req.session.user;
        
    if (!isLoggedIn) {
        return res.redirect('/login');
    }

    const query = req.query.query || '';
    let orders = [];
    const userId = req.session.user.id;
    const minPrice = req.query.minPrice || 0;
    let maxPrice = req.query.maxPrice;
    const sort = req.query.sort || 'desc';

    if (maxPrice === "Infinity") {
        maxPrice = 10000000;
    } else {
        maxPrice = parseFloat(maxPrice);
        if (isNaN(maxPrice)) {
            maxPrice = 10000000;
        }
    }

    const status = req.query.status;
    const method = req.query.method;
    let searchQuery = `SELECT * FROM Purchase WHERE (purchase_id LIKE ? OR city LIKE ? OR country LIKE ?)`;
    const priceSortCondition = ` ORDER BY order_date ${sort === 'desc' ? 'DESC' : 'ASC'}`;
    let params = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (status) {
        searchQuery += ` AND status = ?`;
        params.push(status);
    }

    if (method) {
        searchQuery += ` AND delivery_method = ?`;
        params.push(method);
    }

    searchQuery += ` AND total_price BETWEEN ? AND ?`;
    params.push(minPrice, maxPrice);
    searchQuery += priceSortCondition;

    const userData = await runDBcommand(`SELECT * FROM User WHERE user_id = ?`, [userId]);

    try {
        orders = await runDBcommand(searchQuery, params);

        if (orders.length === 0) {
            res.render('orders.ejs', { isLoggedIn, orders: orders, message: 'Нічого не знайдено', user: userData[0], status: status, deliveryMethod: method, minPrice, maxPrice, sort });
        } else {
            res.render('orders.ejs', { isLoggedIn, orders: orders, message: '', user: userData[0], status: status, deliveryMethod: method, minPrice, maxPrice, sort });
        }
    } catch (err) {
        console.log(err)
        res.status(500).redirect(`/edit-orders`);
    }
};

module.exports.getEditOrders = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;

        if (!isLoggedIn) {
            return res.redirect('/login');
        }

        const purchaseId = req.params.id;
        const userId = req.session.user.id;

        const purchaseQuery = `SELECT * FROM Purchase WHERE purchase_id = ?`;
        const purchaseData = await runDBcommand(purchaseQuery, [purchaseId]);
        const userData = await runDBcommand(`SELECT * FROM User WHERE user_id = ?`, [userId])

        const orderItemsQuery = `SELECT * FROM order_item WHERE purchase_id = ?`;
        const orderItems = await runDBcommand(orderItemsQuery, [purchaseId])

        res.render('edit-order.ejs', { isLoggedIn, order: purchaseData[0], items: orderItems, paymentType: purchaseData[0].payment_type, deliveryMethod: purchaseData[0].delivery_method, user: userData[0] });
    } catch (err) {
        console.log(err)
        res.status(500).redirect(`/`);
    }
};

module.exports.putEditOrders = async (req, res) => {
    try {
        const purchaseId = req.params.purchase_id;
        const data = req.body;

        const updateQuery = `UPDATE Purchase SET total_price = ?, order_date = ?, delivery_method = ?, payment_type = ?, status = ?, delivery_address = ?, city = ?, country = ?, postal_code = ?, recipient_fio = ?, recipient_phone = ?, organization = ? WHERE purchase_id = ?`;
        await runDBcommand(updateQuery, [data.totalPrice, data.orderDate, data.deliveryMethod, data.paymentType, data.status, data.deliveryAddress, data.city, data.country, data.postalCode, data.recipientFio, data.recipientPhone, data.organization, purchaseId]);

        res.status(200).json({success: true, redirect: '/edit-orders'});
    } catch (err) {
        console.log(err);
        res.status(500).json({success: false, redirect: `/edit-orders/edit/${req.params.purchase_id}`, message: 'Помилка'});
    }
};

module.exports.editOrdersDeleteItem = async (req, res) => {
    try {
        const itemId = req.params.item_id;
        const deleteQuery = `DELETE FROM order_item WHERE item_id = ?`;
        const updateQuery = `UPDATE paintings p JOIN order_item oi ON p.painting_id = oi.painting_id SET p.availability = 'available' WHERE oi.item_id = ?`;
        await runDBcommand(updateQuery, [itemId]);
        await runDBcommand(deleteQuery, [itemId]);
        res.status(200).json({success: true, redirect: `/edit-orders/edit/${req.params.purchase_id}`});
    } catch (err) {
        console.log(err);
        res.status(500).json({success: false, redirect: `/edit-orders/edit/${req.params.purchase_id}`, message: 'Помилка'});
    }
};

module.exports.editOrdersDelete = async (req, res) => {
    try {
        const checkQuery = `SELECT * FROM order_item WHERE purchase_id = ?`
        const existingItems = await runDBcommand(checkQuery, [req.params.purchase_id]);

        if (existingItems.length > 0) {
            res.status(200).json({ success: false, redirect: '/edit-orders', message: 'Спершу видаліть предмети замовлення'});
            return;
        }

        const deleteQuery = `DELETE FROM purchase WHERE purchase_id = ?`;
        await runDBcommand(deleteQuery, [req.params.purchase_id]);
        res.status(200).json({ success: true, redirect: '/edit-orders'});
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, redirect: '/edit-orders'});
    }
};

module.exports.editTablesDelete = async (req, res) => {
    try {
        const deleteQuery = `DELETE FROM categories WHERE category_id = ?`;
        const deleteCategoryQuery = `DELETE FROM painting_category WHERE category_id = ?`;
        await runDBcommand(deleteCategoryQuery, [req.params.id]);
        await runDBcommand(deleteQuery, [req.params.id]);
        res.status(200).json({ redirect: '/edit-tables'});
    } catch (err) {
        console.log(err)
        res.status(500).json({ redirect: '/edit-tables'});
    }
};

module.exports.editTablesAdd = async (req, res) => {
    try {
        const data = req.body;

        const checkQuery = `SELECT * FROM categories WHERE category_name = ?`
        const existingCategory = await runDBcommand(checkQuery, [data.name]);

        if (existingCategory.length > 0) {
            res.status(200).json({ success: false, redirect: '/edit-tables', message: 'Така категорія вже існує'});
            return;
        }

        const insertQuery = `INSERT INTO categories (category_name, category_type) VALUES (?, ?)`;
        await runDBcommand(insertQuery, [data.name, data.type]);
        res.status(200).json({ success: true, redirect: '/edit-tables' });
    } catch (err) {
        console.log(err);
        res.status(500).json({success: false, redirect: `/edit-tables`, message: 'Помилка'})
    }
};

module.exports.getArtistStat = async (req, res) => {
    const artistId = req.params.artist_id;
    try {
        const artistQuery = `SELECT a.*, COUNT(p.painting_id) AS paintings_count, SUM(p.price) AS total_price, COUNT(CASE WHEN p.availability = 'sold' THEN 1 END) AS sold_paintings_count FROM artists a LEFT JOIN paintings p ON a.artist_id = p.artist_id WHERE a.artist_id = ? GROUP BY a.artist_id`;
        const artists = await runDBcommand(artistQuery, [artistId]);

        const artist = artists[0];

        const formatedDate = formatDate(artist.birth_date);

        const reportDate = new Date();
        const formattedReportDate = `${("0" + reportDate.getDate()).slice(-2)}-${("0" + (reportDate.getMonth() + 1)).slice(-2)}-${reportDate.getFullYear()} ${("0" + reportDate.getHours()).slice(-2)}:${("0" + reportDate.getMinutes()).slice(-2)}`;

        const doc = new PDFDocument();
        const fileName = `Artist-${artist.artist_id}-stats.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        const fontPath = path.join(__dirname, '..', 'views', 'fonts', 'ArialMT.ttf');  
        doc.font(fontPath); 
        doc.pipe(res);

        doc.fontSize(20).text(`Статистика художника: ${artist.first_name} ${artist.last_name}`);
        doc.moveDown(1); 

        doc.fontSize(12).text(`Ім'я: ${artist.first_name} ${artist.last_name}`);
        doc.text(`Дата народження: ${formatedDate}`);
        doc.text(`Країна: ${artist.country}`);
        doc.text(`Біографія: ${artist.bio ? artist.bio : 'Немає інформації'}`);
        doc.moveDown(2);
        doc.text(`Кількість картин: ${artist.paintings_count}`);
        doc.text(`Загальна ціна картин: $${artist.total_price}`);
        doc.text(`Кількість проданих картин: ${artist.sold_paintings_count}`);
        doc.moveDown(2);
        doc.text(`Дата формування звіту: ${formattedReportDate}`, { align: 'right' });
        doc.end();  
    } catch (err) {
        console.error(err);
        res.status(500).send('Помилка створення PDF');
    }
};

module.exports.editTablesUpdate = async (req, res) => {
    try {
        const data = req.body;
        const categoryId = req.params.id;

        const checkQuery = `SELECT * FROM categories WHERE category_name = ? AND category_id != ?`;
        const existingCategory = await runDBcommand(checkQuery, [data.name, categoryId]);

        if (existingCategory.length > 0) {
            res.status(200).json({ success: false, redirect: '/edit-tables', message: 'Така категорія вже існує'});
            return;
        }

        const updateQuery = `UPDATE categories SET category_name = ?, category_type = ? WHERE category_id = ?`;
        await runDBcommand(updateQuery, [data.name, data.type, categoryId]);
        res.status(200).json({success: true, redirect: '/edit-tables'});
    } catch (err) {
        console.log(err);
        res.status(500).json({success: false, redirect: `/edit-tables`, message: 'Помилка'});
    }
};