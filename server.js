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
            p.created_at,
            i.image_url
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

        // Grouping images by product_id
        const productsMap = {};

        results.forEach(row => {
            const { product_id, name, description, price, stock, created_at, image_url } = row;

            if (!productsMap[product_id]) {
                productsMap[product_id] = {
                    product_id,
                    name,
                    description,
                    price,
                    stock,
                    created_at,
                    images: [] // Initialize an empty array to store images
                };
            }

            // Push each image into the product's images array
            if (image_url) {
                productsMap[product_id].images.push(image_url);
            }
        });

        // Convert the map to an array
        const productsArray = Object.values(productsMap);

        res.json(productsArray);  // Return the fetched products with images as JSON
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

    db.query(query, [product_id], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            res.status(500).send('Server error');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('Product not found');
            return;
        }

        // Grouping images for the single product
        const product = {
            product_id: results[0].product_id,
            name: results[0].name,
            description: results[0].description,
            price: results[0].price,
            stock: results[0].stock,
            images: []
        };

        results.forEach(row => {
            if (row.image_url) {
                product.images.push(row.image_url);
            }
        });

        res.json(product);  // Return the product with all associated images
    });
});

app.get('/api/categories', (req, res) => {
    const departmentName = req.query.department;

    if (!departmentName) {
        return res.status(400).send('Department name is required');
    }

    // Query to fetch categories based on department name
    const query = `
        SELECT c.category_id, c.category_name
        FROM CATEGORY c
        JOIN DEPARTMENT_CATEGORY dc ON c.category_id = dc.category_id
        JOIN DEPARTMENT d ON dc.department_id = d.department_id
        WHERE d.department_name = ?
    `;

    db.query(query, [departmentName], (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            res.status(500).send('Server error');
            return;
        }

        res.json(results);  // Return the fetched categories as JSON
    });
});

// API to fetch products by category_id
app.get('/api/products_cat', (req, res) => {
    const categoryId = req.query.category_id;
    const departmentName = req.query.departmentName;

    if (!categoryId || !departmentName) {
        return res.status(400).json({ error: 'Category ID and Department Name are required' });
    }

    // Modified query to filter by both category_id and department_name
    const query = `
        SELECT p.product_id, p.name, p.description, p.price, p.stock, i.image_url
        FROM products p
        JOIN department d ON p.department_id = d.department_id
        LEFT JOIN product_images i ON p.product_id = i.product_id
        WHERE p.category_id = ? AND d.department_name = ?;
    `;

    db.query(query, [categoryId, departmentName], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        // Grouping images by product
        const productsMap = {};

        results.forEach(row => {
            const { product_id, name, description, price, stock, image_url } = row;

            if (!productsMap[product_id]) {
                productsMap[product_id] = {
                    product_id,
                    name,
                    description,
                    price,
                    stock,
                    images: [] // Initialize an empty array to store images
                };
            }

            // Push each image into the product's images array
            if (image_url) {
                productsMap[product_id].images.push(image_url);
            }
        });

        // Convert the map to an array
        const productsArray = Object.values(productsMap);

        res.json(productsArray); // Send the products with their associated images
    });
});

// API endpoint to search categories based on user input
app.get('/api/search-categories', (req, res) => {
    const searchQuery = req.query.query || '';

    if (searchQuery.length < 1) {
        return res.status(400).send('Search query is too short');
    }

    const query = `
        SELECT 
            c.category_id, 
            c.category_name, 
            d.department_name
        FROM 
            CATEGORY c
        JOIN 
            DEPARTMENT_CATEGORY dc ON c.category_id = dc.category_id
        JOIN 
            DEPARTMENT d ON dc.department_id = d.department_id
        WHERE 
            c.category_name LIKE ? OR d.department_name LIKE ?
    `;
    const queryParams = [`%${searchQuery}%`, `%${searchQuery}%`];

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching search results:', err);
            return res.status(500).send('Server error');
        }
        res.json(results);  // Return the matched categories and departments as JSON
    });
});




// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
