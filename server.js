const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');  // Add the CORS package
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const pdfkit = require('pdfkit'); // For invoice generation
const PDFDocument = require('pdfkit');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const app = express();
const multer = require('multer');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PIRk7DIrmiE2Hgb3odn47yqCN3ojcMsp70vzrz93fqUIeOxtl35xvqdzBNX8Tji2UkxtdJvnWxgNDpRlPS80AA900horxTCdC');
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

app.use(express.json());

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

// Endpoint to check if a user is registered
app.post('/api/users/check', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const query = 'SELECT * FROM USERS WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }

        if (results.length > 0) {
            const user = results[0];
            const isPasswordMatch = await bcrypt.compare(password, user.password);

            if (isPasswordMatch) {
                res.json({
                    isRegistered: true,
                    userData: {
                        name: user.name,
                        surname: user.surname,
                        phone: user.phone,
                        email: user.email,
                        address: user.postal_address,
                        profilePicture: user.profile_picture,
                        user_id: user.user_id
                    },
                });
            } else {
                res.status(401).json({ error: 'Incorrect password.' });
            }
        } else {
            res.json({ isRegistered: false });
        }
    });
});

// Endpoint to register a new user
app.post('/api/users/register', async (req, res) => {
    const { name, surname, email, password, phone, address } = req.body;

    if (!name || !surname || !email || !password || !phone || !address) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO USERS (name, surname, email, password, phone, postal_address) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [name, surname, email, hashedPassword, phone, address], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }

            // Fetch the newly created user_id
            const getUserIdQuery = 'SELECT user_id FROM USERS WHERE email = ?';
            db.query(getUserIdQuery, [email], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(500).json({ error: 'Error retrieving user ID.' });
                }

                res.json({
                    success: true,
                    message: 'User registered successfully.',
                    user_id: results[0].user_id, // Return the user_id
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error hashing the password.' });
    }
});

/// Update user details
app.put('/api/users/update', async (req, res) => {
    const { user_id, email, name, surname, phone, password, address } = req.body;

    // Ensure all required fields are provided
    if (!user_id || !name || !surname || !phone || !address) {
        return res.status(400).json({ error: 'All fields except password and email are required.' });
    }

    try {
        let updateQuery = 'UPDATE USERS SET name = ?, surname = ?, phone = ?, postal_address = ?';
        const queryParams = [name, surname, phone, address];

        // If the password field is provided, hash it and include it in the update
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        // If the email field is provided, include it in the update
        if (email) {
            updateQuery += ', email = ?';
            queryParams.push(email);
        }

        // Update the user identified by user_id
        updateQuery += ' WHERE user_id = ?';
        queryParams.push(user_id);

        db.query(updateQuery, queryParams, (err, result) => {
            if (err) {
                // Check if the error is due to duplicate email
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists.' });
                }

                console.error('Error updating user:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.json({ success: true, message: 'User profile updated successfully.' });
        });
    } catch (error) {
        console.error('Error hashing the password:', error);
        res.status(500).json({ error: 'Error processing the update.' });
    }
});

// Delete user account
app.delete('/api/users/delete', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const query = 'DELETE FROM USERS WHERE email = ?';
        db.query(query, [email], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.json({ success: true, message: 'User account deleted successfully.' });
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error processing the deletion.' });
    }
});
app.post('/api/payment', async (req, res) => {
    const { user_id, amount, currency, paymentMethodId } = req.body;

    if (!user_id || !amount || !currency || !paymentMethodId) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Fetch user information
        const userQuery = `SELECT email, surname, postal_address FROM USERS WHERE user_id = ?`;
        db.query(userQuery, [user_id], async (userErr, userResults) => {
            if (userErr) {
                console.error('Database error fetching user:', userErr);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const userEmail = userResults[0].email;
            const userSurname = userResults[0].surname;
            const userAddress = userResults[0].postal_address;

            // Create payment intent using Stripe
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: currency,
                payment_method: paymentMethodId,
                confirm: true,
                return_url: 'http://192.168.2.147:3006/index.html',
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Fetch basket items for the invoice and email
            const basketQuery = `
                SELECT b.product_id, b.quantity, p.name, p.price
                FROM BASKET b
                JOIN PRODUCTS p ON b.product_id = p.product_id
                WHERE b.user_id = ?
            `;
            db.query(basketQuery, [user_id], (basketErr, basketItems) => {
                if (basketErr) {
                    console.error('Database error fetching basket:', basketErr);
                    return res.status(500).json({ error: 'Database error fetching basket.' });
                }

                if (basketItems.length === 0) {
                    return res.status(400).json({ error: 'No items in the basket.' });
                }

                // Calculate totals
                const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const taxes = subtotal * 0.15; // 15% tax
                const deliveryFee = subtotal * 0.10; // 10% delivery fee

                // Generate invoice and send email
                generateInvoiceAndSendEmail(
                    userEmail,
                    user_id,
                    userAddress,
                    userSurname,
                    basketItems,
                    subtotal,
                    taxes,
                    deliveryFee,
                    (invoiceErr, successMessage) => {
                        if (invoiceErr) {
                            console.error('Error generating invoice or sending email:', invoiceErr);
                            return res.status(500).json({ error: 'Error generating invoice or sending email.' });
                        }

                        console.log(successMessage);

                        // Clear the user's basket
                        const deleteQuery = `DELETE FROM BASKET WHERE user_id = ?`;
                        db.query(deleteQuery, [user_id], (deleteErr) => {
                            if (deleteErr) {
                                console.error('Error clearing basket:', deleteErr);
                            }

                            // Respond with success
                            res.json({ success: true, paymentIntent });
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: error.message });
    }
});

function generateInvoiceAndSendEmail(userEmail, userId, userAddress, userSurname, basketItems, subtotal, taxes, deliveryFee, callback) {
    const invoiceDir = path.join(__dirname, 'invoices');
    const invoiceFileName = `invoice_${userId}_${Date.now()}.pdf`;
    const invoicePath = path.join(invoiceDir, invoiceFileName);

    // Ensure the 'invoices' directory exists
    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Create a new PDF document
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(invoicePath);

    // Pipe the document to a write stream
    doc.pipe(writeStream);

    // Add logo and title
    const logoPath = path.join(__dirname, 'public/logos/logoShek.jpg'); // Update with actual logo path
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 50, height: 50 });
    }
    doc.fontSize(24).text("Shek's House", { align: 'center', continued: true });
    doc.moveDown(2);

    // Draw the first line
    doc.moveTo(50, 100).lineTo(550, 100).stroke();

    // Thank you message
    doc.moveDown();
    doc.fontSize(16).text(`Merci d'avoir commandé chez Shek's House, ${userSurname}`, { align: 'left' });

    // Draw the second line
    doc.moveTo(50, 140).lineTo(550, 140).stroke();

    // Items header
    doc.moveDown();
    doc.fontSize(16).text('Voici vos items :', { align: 'left' });

    // List items
    basketItems.forEach((item, index) => {
        doc.moveDown(0.5);
        doc.fontSize(14)
            .text(`${index + 1}. ID: ${item.product_id}`, { continued: true, align: 'left' })
            .text(`Nom: ${item.name}`, { continued: true })
            .text(`Quantité: ${item.quantity}`, { continued: true, align: 'left' })
            .text(`Prix: CA$ ${item.price}`, { align: 'right' });
    });

    // Subtotal, taxes, delivery fee, and total
    doc.moveDown(1);
    doc.fontSize(16).text(`Sous-total: CA$ ${subtotal.toFixed(2)}`, { align: 'right'});
    doc.text(`Taxes: CA$ ${taxes.toFixed(2)}`, { align: 'right' });
    doc.text(`Frais de livraison: CA$ ${deliveryFee.toFixed(2)}`, { align: 'right' });
    doc.text(`Total: CA$ ${(subtotal + taxes + deliveryFee).toFixed(2)}`, { align: 'right' });

    // Footer with date and address
    doc.moveDown(2);
    doc.fontSize(12).text(`Date: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.text(`Adresse: ${userAddress}`, { align: 'left' });

    // Finalize and save the document
    doc.end();

    writeStream.on('finish', () => {
        console.log('Invoice generated successfully at:', invoicePath);

        // Send the invoice via email
        sendInvoiceEmail(userEmail, userId, invoicePath, (emailErr) => {
            if (emailErr) {
                return callback(emailErr);
            }

            // Delete the invoice file after sending the email
            fs.unlink(invoicePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error deleting temporary invoice file:', unlinkErr);
                }
            });

            callback(null, 'Invoice sent successfully!');
        });
    });

    writeStream.on('error', (err) => {
        console.error('Error generating invoice:', err);
        callback(err);
    });
}


function sendInvoiceEmail(userEmail, userId, invoicePath, callback) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'macroysimen@gmail.com', // Replace with your email
            pass: 'rnhq ewng eiye rfjy'  // Replace with your email password or app password
        }
    });

    const mailOptions = {
        from: 'macroysimen@gmail.com', // Replace with your email
        to: userEmail,
        subject: 'Payment Confirmation and Invoice',
        text: 'Thank you for your purchase! Please find your invoice attached.',
        attachments: [
            {
                filename: `invoice_${userId}.pdf`,
                path: invoicePath
            }
        ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending confirmation email:', error);
            return callback(error);
        }
        console.log(`Email sent to ${userEmail}`, info.response);
        callback(null);
    });
}




// Endpoint to get a user's basket
app.get('/api/basket', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const query = 'SELECT * FROM BASKET WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

app.get('/api/basket/count', (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    const query = `SELECT SUM(quantity) AS itemCount FROM BASKET WHERE user_id = ?`;
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        const itemCount = results[0]?.itemCount || 0; // Default to 0 if no items are found
        res.json({ itemCount });
    });
});


// Endpoint to update/add items to a user's basket
app.post('/api/basket', (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'A valid User ID is required' });
    }
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ error: 'A valid Product ID is required' });
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const query = `
        INSERT INTO BASKET (user_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), added_at = NOW()
    `;
    db.query(query, [userId, productId, quantity, quantity], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ success: true, message: 'Basket updated successfully' });
    });
});

app.put('/api/basket', (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    if (!user_id || !product_id || quantity === undefined) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const query = `
        UPDATE BASKET 
        SET quantity = ?, added_at = NOW() 
        WHERE user_id = ? AND product_id = ?
    `;

    db.query(query, [quantity, user_id, product_id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        res.json({ success: true, message: 'Basket updated successfully.' });
    });
});

app.delete('/api/basket', (req, res) => {
    const { user_id, product_id } = req.query;

    if (!user_id || !product_id) {
        return res.status(400).json({ error: 'Both user_id and product_id are required.' });
    }

    const query = `DELETE FROM BASKET WHERE user_id = ? AND product_id = ?`;

    db.query(query, [user_id, product_id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found in the basket.' });
        }

        res.json({ success: true, message: 'Item removed from the basket.' });
    });
});





// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
