const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');  // Add the CORS package
const path = require('path');
const app = express();
const port = 3006;

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

// Enable CORS for all routes
app.use(cors());

// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get products based on department
app.get('/api/products', (req, res) => {
    const departmentName = req.query.department || 'tout';

    let query = `
        SELECT 
            p.product_id,
            p.name,
            p.description,
            p.price,
            p.stock,
            i.image_url,
            p.created_at  -- Add the created_at field for sorting
        FROM 
            PRODUCTS p
        JOIN 
            DEPARTMENT d ON p.department_id = d.department_id
        LEFT JOIN 
            PRODUCT_IMAGES i ON p.product_id = i.product_id
    `;
    
    let queryParams = [];

    if (departmentName !== 'tout') {
        query += ' WHERE d.department_name = ?';
        queryParams.push(departmentName);
    }

    // Order by created_at in descending order to get the most recent products first
    query += ' ORDER BY p.created_at DESC';

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Server error');
            return;
        }

        res.json(results);  // Return the fetched products as JSON
    });
});

app.get('/api/products/:product_id', (req, res) => {
    const product_id = req.params.product_id;

    const query = `
        SELECT 
            p.product_id,
            p.name,
            p.description,
            p.price,
            p.stock,
            i.image_url
        FROM 
            PRODUCTS p
        LEFT JOIN 
            PRODUCT_IMAGES i ON p.product_id = i.product_id
        WHERE 
            p.product_id = ?
    `;

    db.query(query, [product_id], (err, result) => {
        if (err) {
            console.error('Error fetching product:', err);
            res.status(500).send('Server error');
            return;
        }

        if (result.length === 0) {
            res.status(404).send('Product not found');
            return;
        }

        res.json(result[0]);  // Return the product details as JSON
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
