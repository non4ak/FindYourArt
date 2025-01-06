const { runDBcommand } = require('../db/connection');

module.exports.getGallery = async(req, res) => {
    const isLoggedIn = !!req.session.user;
    const query = req.query.query || '';
    const minPrice = req.query.minPrice || 0;
    let maxPrice = req.query.maxPrice;
    const sort = req.query.sort || 'none';

    if (maxPrice === "Infinity") {
        maxPrice = 10000000;  
    } else {
        maxPrice = parseFloat(maxPrice); 
        if (isNaN(maxPrice)) {
            maxPrice = 10000000; 
        }
    }

    const categoriesCountQuery = `SELECT c.category_name, COUNT(pc.painting_id) AS painting_count 
                                  FROM categories c 
                                  LEFT JOIN painting_category pc 
                                  ON c.category_id = pc.category_id 
                                  GROUP BY c.category_name`;

    const genre_query = `SELECT * FROM categories WHERE category_type = 'Жанр'`;
    const style_query = `SELECT * FROM categories WHERE category_type = 'Стиль'`;

    try {
        const categoryCounts = await runDBcommand(categoriesCountQuery);
        const genres = await runDBcommand(genre_query);
        const styles = await runDBcommand(style_query);

        const category = req.query.category;
        const categoryStyle = req.query.style;

        let data = [];
        let categoryCondition = '';
        let params = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];
        const priceCondition = `AND p.price BETWEEN ? AND ?`; 
        const priceSortCondition = `ORDER BY p.price ${sort === 'desc' ? 'DESC' : 'ASC'}`;

        if (category) {
            categoryCondition += ` AND p.painting_id IN (
                SELECT pc.painting_id 
                FROM painting_category pc
                JOIN categories c ON pc.category_id = c.category_id
                WHERE c.category_name = ?
            )`;
            params.push(category);
        }

        if (categoryStyle) {
            categoryCondition += ` AND p.painting_id IN (
                SELECT pc.painting_id 
                FROM painting_category pc
                JOIN categories c ON pc.category_id = c.category_id
                WHERE c.category_name = ?
            )`;
            params.push(categoryStyle);
        }

        params.push(minPrice, maxPrice);

        let searchQuery = `SELECT *, LEFT(p.descript, 100) AS short_description 
                           FROM paintings p 
                           JOIN artists a ON p.artist_id = a.artist_id 
                           WHERE ((p.title LIKE ? OR p.descript LIKE ?) 
                           OR (a.first_name LIKE ? OR a.last_name LIKE ?))`;

        let fullQuery = searchQuery + categoryCondition + priceCondition;

        if (sort !== 'none') {
            fullQuery += priceSortCondition;
        }

        data = await runDBcommand(fullQuery, params);

        if (data.length === 0) {
            res.render("gallery", { paintings: data, message: 'Нічого не знайдено', genres, styles, category, categoryStyle, categoryCounts, isLoggedIn, minPrice, maxPrice, sort });
        } else {
            res.render("gallery", { paintings: data, message: '', genres, styles, category, categoryStyle, categoryCounts, isLoggedIn, minPrice, maxPrice, sort });
        }
    } catch (error) {
        console.error('Помилка виконання SQL-запиту:', error);
        res.status(500).send('Сталася помилка під час виконання запиту');
    }
}



