
module.exports.getAddPainting = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const genre_query = `SELECT * FROM categories WHERE category_type = 'Жанр'`;
        const style_query = `SELECT * FROM categories WHERE category_type = 'Стиль'`;

        const genres = await runDBcommand(genre_query);
        const styles = await runDBcommand(style_query);

        const message = req.query.message || '';

        res.render('add-painting.ejs', { genres: genres, styles: styles, message: message });
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/');
    }
};

module.exports.postAddPainting = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const data = req.body;

        const userQuery = `SELECT * FROM User WHERE user_id = ?`;
        const userData = await runDBcommand(userQuery, [userId]);

        const checkQuery = `SELECT * FROM paintings p INNER JOIN artists a ON p.artist_id = a.artist_id WHERE a.user_id = 40 AND p.title = ?`
        const existingPainting = await runDBcommand(checkQuery, [data.title]);

        if (existingPainting.length > 0) {
            res.status(200).json({ redirect: '/profile/add-painting?message=Картина вже існує' });
            return;
        }

        const checkArtistQuery = `SELECT * FROM artists WHERE first_name = ? AND last_name = ?`;
        const existingArtist = await runDBcommand(checkArtistQuery, [data.firstName, data.lastName]);

        let artistId;

        if (existingArtist.length === 0) {
            const insertArtistQuery = `INSERT INTO artists (first_name, last_name, bio, birth_date, country, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
            const insertArtistData = await runDBcommand(insertArtistQuery, [data.firstName, data.lastName, data.bio, data.birthDate, data.country, userId]);
            artistId = insertArtistData.insertId;
        } else {
            artistId = existingArtist[0].artist_id;
        }


        const insertPaintingQuery = `INSERT INTO paintings (title, descript, price, date_created, width, height, material, img_url, artist_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const insertPaintingData = await runDBcommand(insertPaintingQuery, [data.title, data.descript, data.price, data.dateCreated, data.width, data.height, data.material, data.link, artistId]);

        const insertGenreQuery = `INSERT INTO painting_category (category_id, painting_id) VALUES (?, ?)`;
        const insertStyleQuery = `INSERT INTO painting_category (category_id, painting_id) VALUES (?, ?)`;
        const insertGenre = await runDBcommand(insertGenreQuery, [data.genre, insertPaintingData.insertId]);
        const insertStyle = await runDBcommand(insertStyleQuery, [data.style, insertPaintingData.insertId]);

        res.status(200).json({ redirect: '/profile' });
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/')
    }
};

module.exports.deletePainting = async (req, res) => {
    try {
        const paintingId = req.params.painting_id;

        const checkQuery = `SELECT artist_id FROM paintings WHERE painting_id = ?`;
        const artistResult = await runDBcommand(checkQuery, [paintingId]);

        if (artistResult.length === 0) {
            res.status(200).json({ success: false, redirect: '/profile' });
            return;
        }

        const artistId = artistResult[0].artist_id;

        const artistPaintingsQuery = `SELECT COUNT(*) AS paintingCount FROM paintings WHERE artist_id = ?`;
        const artistPaintings = await runDBcommand(artistPaintingsQuery, [artistId]);

        const deleteCategoryQuery = `DELETE FROM painting_category WHERE painting_id = ?`;
        await runDBcommand(deleteCategoryQuery, [paintingId]);

        const deletePaintingQuery = `DELETE FROM paintings WHERE painting_id = ?`;
        await runDBcommand(deletePaintingQuery, [paintingId]);

        if (artistPaintings[0].paintingCount === 1) {
            const deleteArtistQuery = `DELETE FROM artists WHERE artist_id = ?`;
            await runDBcommand(deleteArtistQuery, [artistId]);
        }

        res.status(200).json({ success: true, redirect: '/profile' });
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/profile');
    }
};

module.exports.editPainting = async (req, res) => {
    try {
        const paintingId = req.params.painting_id;

        const userId = req.session.user.id;
        const genre_query = `SELECT * FROM categories WHERE category_type = 'Жанр'`;
        const style_query = `SELECT * FROM categories WHERE category_type = 'Стиль'`;
        const artistQuery = `SELECT * FROM artists a INNER JOIN paintings p ON p.artist_id = a.artist_id WHERE p.painting_id = ?`;
        const selectedGenreQuery = `SELECT c.category_id FROM categories c INNER JOIN painting_category pc ON c.category_id = pc.category_id WHERE pc.painting_id = ? AND c.category_type = 'Жанр'`
        const selectedStyleQuery = `SELECT c.category_id FROM categories c INNER JOIN painting_category pc ON c.category_id = pc.category_id WHERE pc.painting_id = ? AND c.category_type = 'Стиль'`

        const genres = await runDBcommand(genre_query);
        const styles = await runDBcommand(style_query);
        const artistData = await runDBcommand(artistQuery, [paintingId]);
        const selectedGenre = await runDBcommand(selectedGenreQuery, [paintingId]);
        const selectedStyle = await runDBcommand(selectedStyleQuery, [paintingId]);
        const paintingQuery = `SELECT * FROM paintings WHERE painting_id = ?`;
        const paintingData = await runDBcommand(paintingQuery, [paintingId]);

        const styleExists = selectedStyle.length > 0 ? selectedStyle[0] : null;
        const genreExists = selectedGenre.length > 0 ? selectedGenre[0] : null;

        const message = req.query.message || '';

        res.render('edit-painting.ejs', { genres: genres, styles: styles, message: message, painting: paintingData[0], author: artistData[0], selectedGenre: genreExists, selectedStyle: styleExists });
    } catch (err) {
        console.log(err);
        res.status(500).redirect('/')
    }
};

module.exports.putEditPainting = async (req, res) => {
    try {
        const paintingId = req.params.painting_id;
        const userId = req.session.user.id;
        const data = req.body;

        const checkQuery = `SELECT * FROM paintings WHERE (title = ? OR descript = ? OR img_url = ?) AND painting_id != ?`;
        const existingPainting = await runDBcommand(checkQuery, [data.title, data.descript, data.link, paintingId]);

        if (existingPainting.length > 0) {
            res.status(200).json({ success: false, artist: true, redirect: `/profile/edit/${req.params.painting_id}`, message: 'Ці поля мають бути унікальними' });
            return;
        }

        const artistQuery = `SELECT * FROM artists a JOIN paintings p ON p.artist_id = a.artist_id WHERE painting_id = ?`;
        const existingArtist = await runDBcommand(artistQuery, [paintingId]);

        const checkArtistQuery = `SELECT * FROM artists WHERE (first_name = ? AND last_name = ?) AND artist_id != ?`;
        const existsArtist = await runDBcommand(checkArtistQuery, [data.firstName, data.lastName, existingArtist[0].artist_id]);

        if (existsArtist.length > 0) {
            res.status(200).json({ success: true, artist: false, redirect: `/profile/edit/${req.params.painting_id}`, message: 'Ці поля мають бути унікальними' });
            return;
        }

        const updateArtistQuery = `UPDATE artists SET first_name = ?, last_name = ?, bio = ?, birth_date = ?, country = ? WHERE artist_id = ?;`;
        const updateArtist = await runDBcommand(updateArtistQuery, [data.firstName, data.lastName, data.bio, data.birthDate, data.country, existingArtist[0].artist_id])

        const updateQuery = `UPDATE paintings SET title = ?, descript = ?, price = ?, date_created = ?, width = ?, height = ?, material = ?, img_url = ? WHERE painting_id = ?`;
        await runDBcommand(updateQuery, [data.title, data.descript, data.price, data.dateCreated, data.width, data.height, data.material, data.link, paintingId]);

        const deleteQuery = `DELETE FROM painting_category WHERE painting_id = ?`
        await runDBcommand(deleteQuery, paintingId);

        const genreInsertQuery = `INSERT INTO painting_category (painting_id, category_id) VALUES (?, ?)`;
        const styleInsertQuery = `INSERT INTO painting_category (painting_id, category_id) VALUES (?, ?)`;

        await runDBcommand(genreInsertQuery, [paintingId, data.genre]);
        await runDBcommand(styleInsertQuery, [paintingId, data.style]);

        res.status(200).json({ success: true, redirect: '/profile' })
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, artist: false, redirect: `/profile/edit/${req.params.painting_id}`, message: 'Помилка' })
    }
};




