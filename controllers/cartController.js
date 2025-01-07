const { runDBcommand } = require('../db/connection');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { formatDate } = require('../db/connection');
const path = require('path');


module.exports.getCart = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;
        const userId = req.session.user.id;
        const cartQuery = `SELECT p.* FROM cart_item ci JOIN paintings p ON ci.painting_id = p.painting_id WHERE ci.cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const paintingsData = await runDBcommand(cartQuery, [userId]);

        const totalPriceQuery = `SELECT SUM(p.price * ci.items_count) AS total_sum FROM cart_item ci JOIN paintings p ON ci.painting_id = p.painting_id WHERE ci.cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const totalPrice = await runDBcommand(totalPriceQuery, [userId]);

        const totalCountQuery = `SELECT COUNT(*) AS total_count FROM cart_item WHERE cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const totalCount = await runDBcommand(totalCountQuery, [userId]);

        if (paintingsData.length === 0) {
            res.render("cart.ejs", { paintings: [], isLoggedIn, message: 'Кошик поки що пустий', total_sum: [0], total_count: totalCount[0] });
            return;
        } else {
            res.render("cart.ejs", { paintings: paintingsData, isLoggedIn, message: '', total_sum: totalPrice[0], total_count: totalCount[0] });
        }

    }
    catch (err) {
        console.log(err)
        res.status(500).redirect(`/`)
    }
};

module.exports.addToCart = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;
        
        if (!isLoggedIn) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const paintingId = req.params.paintingId;
        let result = await runDBcommand('SELECT * FROM cart WHERE user_id = ?', [userId]);
        let cartId = result.length ? result[0].cart_id : null;

        if (!cartId) {
            const insertResult = await runDBcommand('INSERT INTO cart (user_id) VALUES (?)', [userId]);
            cartId = insertResult.insertId;
        }

        const checkQuery = `SELECT p.painting_id FROM paintings p INNER JOIN artists a ON p.artist_id = a.artist_id WHERE p.painting_id = ? AND a.user_id = ?`;
        const paintingOfUser = await runDBcommand(checkQuery, [paintingId, userId]);

        if (paintingOfUser.length > 0) {
            res.redirect(`/picture/${paintingId}`);
            return;
        }

        const existingItem = await runDBcommand('SELECT * FROM cart_item WHERE cart_id = ? AND painting_id = ?', [cartId, paintingId]);

        if (existingItem.length > 0) {
            return res.redirect('/cart');
        }

        const insertIntoItem = await runDBcommand('INSERT INTO cart_item (cart_id, painting_id, items_count) VALUES (?, ?, ?)', [cartId, paintingId, 1]);
        res.redirect(`/cart`);
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/');
    }

};

module.exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const paintingId = req.params.painting_id;

        const query = `DELETE FROM cart_item WHERE cart_id = (SELECT cart_id FROM cart WHERE user_id = ?) AND painting_id = ?`;
        await runDBcommand(query, [userId, paintingId]);

        res.redirect('/cart');
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/cart');
    }
};

module.exports.getPurchase = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user;
        userId = req.session.user.id;

        const cartQuery = `SELECT p.* FROM cart_item ci JOIN paintings p ON ci.painting_id = p.painting_id WHERE ci.cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const paintingsData = await runDBcommand(cartQuery, [userId]);

        const totalPriceQuery = `SELECT SUM(p.price * ci.items_count) AS total_sum FROM cart_item ci JOIN paintings p ON ci.painting_id = p.painting_id WHERE ci.cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const totalPrice = await runDBcommand(totalPriceQuery, [userId]);

        if (paintingsData.length === 0) {
            res.render("cart.ejs", { paintings: [], isLoggedIn, message: 'Спочатку додайте предмети до кошика', total_sum: totalPrice[0], total_count: 0 });
            return;
        } else {
            const userQuery = `SELECT * FROM User WHERE user_id = ?`;
            const userData = await runDBcommand(userQuery, [userId]);

            res.render('purchase.ejs', { paintings: paintingsData, user: userData[0], total_sum: totalPrice[0] });
        }
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/cart');
    }
};

module.exports.postPurchase = async (req, res) => {
    try {
        const data = req.body;
        userId = req.session.user.id;
        const cartQuery = `SELECT p.* FROM cart_item ci JOIN paintings p ON ci.painting_id = p.painting_id WHERE ci.cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        const paintingsData = await runDBcommand(cartQuery, [userId]);

        paintingsData.forEach(painting => {
            painting.price = parseFloat(painting.price);
        });

        const totalSum = paintingsData.reduce((sum, painting) => sum + painting.price, 0);

        recipFIO = data.surname + " " + data.name;
        const insertPurchaseQuery = `INSERT INTO Purchase (delivery_address, city, postal_code, country, recipient_fio, recipient_phone, organization, user_id, delivery_method, payment_type, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const insertPurchaseData = await runDBcommand(insertPurchaseQuery, [data.deliveryAddress, data.city, data.postCode, data.country, recipFIO, data.phone, data.organizationName, userId, data.deliveryMethod, data.paymentType, totalSum, 'В обробці']);

        const purchaseId = insertPurchaseData.insertId;

        const paintingIds = paintingsData.map(painting => painting.painting_id);
        const query = `UPDATE paintings SET availability = 'sold' WHERE painting_id IN (?)`;

        await runDBcommand(query, [paintingIds]);

        const values = paintingsData.map(painting => `(1, ${painting.price}, ${painting.painting_id}, ${purchaseId})`).join(', ');

        const insertOrderItemQuery = `INSERT INTO order_item (items_count, price, painting_id, purchase_id) VALUES ${values}`;
        await runDBcommand(insertOrderItemQuery);

        const clearCartQuery = `DELETE FROM cart_item WHERE cart_id = (SELECT cart_id FROM cart WHERE user_id = ?)`;
        await runDBcommand(clearCartQuery, [userId]);

        res.status(200).json({ redirect: `/cart/purchase/confirmation/${purchaseId}` });
    } catch (err) {
        console.log(err);
        res.status(500).json({ redirect: `/cart/purchase` });;
    }
};

module.exports.getPurchaseConfirm = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user; 
        const purchaseId = req.params.purchaseId;
        res.render('confirmation.ejs', {isLoggedIn, purchaseId}); 
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/cart');
    }
};

module.exports.purchaseDownload = async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const orderData = await runDBcommand(`SELECT * FROM Purchase WHERE purchase_id = ?`, [orderId]);
        const orderItems = await runDBcommand(`SELECT p.painting_id, p.title, p.price FROM paintings p JOIN order_item oi ON oi.painting_id = p.painting_id WHERE oi.purchase_id = ?`, [orderId]);

        if (orderData.length === 0) {
            return res.status(404).send('Замовлення не знайдено');
        }

        const order = orderData[0];

        const formatedDate = formatDate(order.order_date);

        const doc = new PDFDocument();
        const fileName = `Reciept-${order.purchase_id}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        const fontPath = path.join(__dirname, '..', 'views', 'fonts', 'ArialMT.ttf');  
        doc.font(fontPath); 
        doc.pipe(res);
        doc.fontSize(20).text('Квитанція', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Замовлення № ${order.purchase_id}`, { align: 'center' });
        doc.moveDown(2); 
        doc.fontSize(12).text('Інформація про клієнта', { underline: true });
        doc.fontSize(10).text(`Отримувач: ${order.recipient_fio}`);
        doc.text(`Телефон: ${order.recipient_phone}`);
        doc.text(`Адреса доставки: ${order.delivery_address}, ${order.city}, ${order.country}, ${order.postal_code}`);
        doc.moveDown();
        doc.text('Спосіб доставки:', { underline: true });
        doc.text(`${order.delivery_method}`);
        doc.moveDown();
        doc.text('Оплата:', { underline: true });
        doc.text(`Загальна сума: ${order.total_price} $`);
        doc.moveDown();
        doc.text('Товари у замовленні:', { underline: true });
        doc.moveDown();
        orderItems.forEach(item => {
            doc.fontSize(10).text(`- ${item.title}: 1 x ${item.price} $`);
        });
        doc.moveDown(2);  
        doc.fontSize(12).text('Загальна сума:', { underline: true });
        doc.fontSize(14).text(`${order.total_price} $`);
        doc.moveDown();
        doc.fontSize(10).text('Дякуємо за покупку! Ваше замовлення буде оброблено найближчим часом.');
        doc.moveDown();
        doc.text(`Дата замовлення: ${formatedDate}`, { align: 'right' });
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Помилка створення PDF');
    }
};

