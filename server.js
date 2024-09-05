const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3306;

// MySQL Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',   // your MySQL username
  password: 'WhatIs5!',   // your MySQL password
  database: 'esimen'  // your MySQL database name
});

// Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    return;
  }
  console.log('Connected to MySQL Database');
});

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// API route to get products
app.get('/api/products', (req, res) => {
  const sql = 'SELECT * FROM products';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
