const { runDBcommand } = require('../db/connection');

module.exports.getPicture = async (req, res) => {
    try {
        const isLoggedIn = !!req.session.user; 
        const query = `SELECT * FROM paintings WHERE painting_id = ${req.params.id}`;
        const data = await runDBcommand(query);
        res.render("picture.ejs", {paintings: data[0], isLoggedIn})
    }
    catch(err) {
        console.log(err)
        res.status(500).redirect(`/gallery/${req.params.id}`)
    }
};


