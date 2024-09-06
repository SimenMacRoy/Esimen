const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const port = 3001;

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'IlovePHYSICS2003.',
    database: 'esimen'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get products based on department
app.get('/api/products', (req, res) => {
    const department = req.query.department || 'tout';
    let query = 'SELECT * FROM products';
    let queryParams = [];

    if (department !== 'tout') {
        query += ' WHERE department = ?';
        queryParams.push(department);
    } else {
        query += ' WHERE department IN (?, ?, ?, ?)';
        queryParams.push('Femme', 'Homme', 'Enfant', 'Linge de Maison');
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Server error');
            return;
        }
        res.json(results);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
