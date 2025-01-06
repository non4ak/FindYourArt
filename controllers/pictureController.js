const { runDBcommand } = require('../db/connection');

module.exports.getPicture = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user; 
        const query = `SELECT * FROM paintings WHERE painting_id = ${req.params.id}`;
        const data = await runDBcommand(query);

        const artistQuery = `SELECT a.*, COUNT(p.painting_id) AS paintings_count, SUM(p.price) AS total_price, COUNT(CASE WHEN p.availability = 'sold' THEN 1 END) AS sold_paintings_count FROM artists a LEFT JOIN paintings p ON a.artist_id = p.artist_id WHERE p.painting_id = ${req.params.id} GROUP BY a.artist_id`;
        const artistData = await runDBcommand(artistQuery)
        res.render("picture.ejs", {paintings: data[0], isLoggedIn, artist: artistData[0]});
    }
    catch(err) {
        console.log(err)
        res.status(500).redirect(`/gallery/${req.params.id}`)
    }
};


