const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDB() {
    try {
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        console.log(columns.map(c => c.Field));
    } catch (e) {
        console.error("DB Error:", e);
    }
    process.exit();
}

testDB();
