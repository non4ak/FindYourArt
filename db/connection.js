const mysql = require('mysql2');

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

function runDBcommand(sqlQuery, params = []) {
    return new Promise((res, rej) => {
        connection.query(sqlQuery, params, (error, results) => {
            if (error) {
                rej(error);
            } else {
                res(results);
            }
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString); 
    const day = ("0" + date.getDate()).slice(-2); 
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}


module.exports = { runDBcommand, formatDate };