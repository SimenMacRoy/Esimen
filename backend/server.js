require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const multer = require('multer');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Trust proxy for Railway/Render/Heroku (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Stripe initialization with validation
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set. Payment features will not work.');
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// ===================
// SECURITY MIDDLEWARE
// ===================

// Helmet for HTTP security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for static files
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded from other origins
}));

// CORS configuration
const allowedOrigins = [
    'https://esimen.netlify.app',
    'https://shekshouse.netlify.app',
    'http://localhost:3006'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Rate limiting (disabled in test mode)
const isTestMode = process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isTestMode ? 0 : 500, // 0 = disabled, 500 requests per window
    message: { error: 'Too many requests, please try again later.' },
    skip: () => isTestMode
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestMode ? 0 : 10, // 10 login attempts per 15 minutes
    message: { error: 'Too many login attempts, please try again later.' },
    skip: () => isTestMode
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isTestMode ? 0 : 3, // 3 password reset requests per hour
    message: { error: 'Too many password reset requests, please try again later.' },
    skip: () => isTestMode
});

if (!isTestMode) {
    app.use('/api/', generalLimiter);
    app.use('/api/users/check', authLimiter);
    app.use('/api/forgot-password', passwordResetLimiter);
}

app.use(express.json({ limit: '10mb' }));

// ===================
// DATABASE CONNECTION
// ===================

// Support both standard and Railway auto-provided variable names
// Using connection pool for automatic reconnection and better reliability
const db = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST,
    user: process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
    port: process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test connection on startup
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database (pool).');
    connection.release();
});

// ===================
// EMAIL CONFIGURATION
// ===================

// Resend for production (Railway blocks SMTP)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Nodemailer for local development
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000
});

// Unified email sending function
async function sendEmail(mailOptions) {
    // Use Resend in production (when RESEND_API_KEY is set)
    if (resend) {
        try {
            // Resend requires a verified domain - use their default or your verified domain
            const resendFrom = process.env.RESEND_FROM_EMAIL || "Shek's House <onboarding@resend.dev>";
            const emailData = {
                from: resendFrom,
                to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
                subject: mailOptions.subject,
                html: mailOptions.html || mailOptions.text
            };

            // Handle attachments for Resend
            if (mailOptions.attachments && mailOptions.attachments.length > 0) {
                emailData.attachments = await Promise.all(
                    mailOptions.attachments.map(async (att) => {
                        if (att.path) {
                            const content = fs.readFileSync(att.path);
                            return {
                                filename: att.filename,
                                content: content
                            };
                        }
                        return att;
                    })
                );
            }

            const result = await resend.emails.send(emailData);
            console.log('Email sent via Resend:', result);
            return result;
        } catch (error) {
            console.error('Resend error:', error);
            throw error;
        }
    }

    // Fallback to nodemailer for local development
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Nodemailer error:', error);
                reject(error);
            } else {
                console.log('Email sent via Nodemailer:', info.messageId);
                resolve(info);
            }
        });
    });
}

// Log email configuration status
if (resend) {
    console.log('Email: Using Resend API');
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Email: Using Nodemailer (SMTP)');
} else {
    console.warn('WARNING: No email service configured. Set RESEND_API_KEY for production or EMAIL_USER/EMAIL_PASS for development.');
}

// ===================
// JWT AUTHENTICATION
// ===================

function generateToken(user) {
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            is_admin: user.is_admin
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        next();
    });
}

// Optional authentication - doesn't block if no token
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
}

// ===================
// VALIDATION HELPERS
// ===================

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
    return phoneRegex.test(phone);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function validatePositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
}

function validatePositiveInteger(value) {
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
}

// ===================
// STATIC FILES
// ===================

app.use(express.static(path.join(__dirname, '../frontend')));

// ===================
// CLOUDINARY CONFIG
// ===================

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check Cloudinary configuration
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                process.env.CLOUDINARY_API_KEY &&
                                process.env.CLOUDINARY_API_SECRET;

if (!isCloudinaryConfigured) {
    console.warn('WARNING: Cloudinary is not configured. Image uploads will use local storage (not persistent on Railway).');
}

// ===================
// FILE UPLOAD CONFIG
// ===================

// Helper function to upload buffer to Cloudinary
function uploadToCloudinary(buffer, folder = 'shekshouse') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'image',
                transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
}

let storage;
if (isCloudinaryConfigured) {
    // Use memory storage - files will be uploaded to Cloudinary manually
    storage = multer.memoryStorage();
    console.log('Using Cloudinary for image storage');
} else {
    // Fallback to local storage for development
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            cb(null, `${uniqueSuffix}-${sanitizedName}`);
        }
    });
    console.log('Using local storage for images (dev mode)');
}

// Serve local uploads (fallback for dev)
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ===================
// PRODUCTS API
// ===================

// Get products with pagination
app.get('/api/products', (req, res) => {
    const departmentName = req.query.department || 'tout';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort || 'likes'; // 'likes' or 'recent'

    let query = `
        SELECT
            p.product_id,
            p.name,
            p.description,
            p.price,
            p.stock,
            p.created_at,
            COALESCE(p.like_count, 0) as like_count,
            COALESCE(p.dislike_count, 0) as dislike_count,
            i.image_url
        FROM PRODUCTS p
        JOIN DEPARTMENT d ON p.department_id = d.department_id
        LEFT JOIN PRODUCT_IMAGES i ON p.product_id = i.product_id
    `;

    let countQuery = `
        SELECT COUNT(DISTINCT p.product_id) as total
        FROM PRODUCTS p
        JOIN DEPARTMENT d ON p.department_id = d.department_id
    `;

    let queryParams = [];
    let countParams = [];

    if (departmentName !== 'tout') {
        query += ' WHERE d.department_name = ?';
        countQuery += ' WHERE d.department_name = ?';
        queryParams.push(departmentName);
        countParams.push(departmentName);
    }

    // Sort by likes first (most liked), then by recent
    if (sortBy === 'likes') {
        query += ' ORDER BY COALESCE(p.like_count, 0) DESC, p.created_at DESC';
    } else {
        query += ' ORDER BY p.created_at DESC';
    }

    // Get total count first
    db.query(countQuery, countParams, (countErr, countResults) => {
        if (countErr) {
            console.error('Error counting products:', countErr);
            return res.status(500).json({ error: 'Server error' });
        }

        const total = countResults[0].total;
        const totalPages = Math.ceil(total / limit);

        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error fetching products:', err);
                return res.status(500).json({ error: 'Server error' });
            }

            const productsMap = {};
            results.forEach(row => {
                const { product_id, name, description, price, stock, created_at, like_count, dislike_count, image_url } = row;
                if (!productsMap[product_id]) {
                    productsMap[product_id] = {
                        product_id,
                        name,
                        description,
                        price: parseFloat(price),
                        stock,
                        created_at,
                        like_count: parseInt(like_count) || 0,
                        dislike_count: parseInt(dislike_count) || 0,
                        images: []
                    };
                }
                if (image_url) {
                    productsMap[product_id].images.push(image_url);
                }
            });

            const productsArray = Object.values(productsMap);

            res.json({
                products: productsArray,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });
        });
    });
});

// Get single product
app.get('/api/products/:product_id', (req, res) => {
    const product_id = parseInt(req.params.product_id);

    if (!validatePositiveInteger(product_id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    const query = `
        SELECT
            p.product_id,
            p.name,
            p.description,
            p.price,
            p.stock,
            p.department_id,
            p.category_id,
            i.image_url
        FROM PRODUCTS p
        LEFT JOIN PRODUCT_IMAGES i ON p.product_id = i.product_id
        WHERE p.product_id = ?
    `;

    db.query(query, [product_id], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = {
            product_id: results[0].product_id,
            name: results[0].name,
            description: results[0].description,
            price: parseFloat(results[0].price),
            stock: results[0].stock,
            department_id: results[0].department_id,
            category_id: results[0].category_id,
            images: []
        };

        results.forEach(row => {
            if (row.image_url) {
                product.images.push(row.image_url);
            }
        });

        res.json(product);
    });
});

// Add product (Admin only)
app.post('/api/add-products', authenticateAdmin, upload.array('images', 5), async (req, res) => {
    const { name, description, stock, price, department_id, category_id } = req.body;
    const files = req.files;

    // Validation
    if (!name || !description || stock === undefined || !price || !department_id || !category_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!validatePositiveNumber(price)) {
        return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    if (!validatePositiveInteger(stock)) {
        return res.status(400).json({ error: 'Stock must be a non-negative integer.' });
    }

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'At least one image is required.' });
    }

    try {
        // Upload images to Cloudinary or use local path
        let imageUrls = [];
        if (isCloudinaryConfigured) {
            // Upload to Cloudinary
            const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'shekshouse/products'));
            const results = await Promise.all(uploadPromises);
            imageUrls = results.map(result => result.secure_url);
        } else {
            // Local storage - use filename
            imageUrls = files.map(file => `/uploads/${file.filename}`);
        }

        const query = `
            INSERT INTO PRODUCTS (description, stock, name, price, department_id, category_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        db.query(query, [description, parseInt(stock), name, parseFloat(price), department_id, category_id], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            const product_id = result.insertId;
            const imageQuery = 'INSERT INTO PRODUCT_IMAGES (product_id, image_url) VALUES ?';
            const imageValues = imageUrls.map(url => [product_id, url]);

            db.query(imageQuery, [imageValues], (imageErr) => {
                if (imageErr) {
                    console.error('Error saving images:', imageErr);
                    return res.status(500).json({ error: 'Error saving images.' });
                }

                // Log audit trail
                logProductAudit(product_id, req.user.user_id, 'created', name, JSON.stringify({ price, stock, department_id, category_id }));

                res.json({ success: true, message: 'Product added successfully.', product_id });
            });
        });
    } catch (uploadError) {
        console.error('Error uploading images:', uploadError);
        return res.status(500).json({ error: 'Error uploading images.' });
    }
});

// Update product (Admin only)
app.put('/api/products/:product_id', authenticateAdmin, upload.array('images', 5), async (req, res) => {
    const { name, description, stock, price, department_id, category_id } = req.body;
    const { product_id } = req.params;
    const files = req.files;

    if (!product_id || !name || !description || stock === undefined || !price || !department_id || !category_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!validatePositiveNumber(price)) {
        return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    if (!validatePositiveInteger(stock)) {
        return res.status(400).json({ error: 'Stock must be a non-negative integer.' });
    }

    try {
        // Upload new images if provided
        let imageUrls = [];
        if (files && files.length > 0) {
            if (isCloudinaryConfigured) {
                const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'shekshouse/products'));
                const results = await Promise.all(uploadPromises);
                imageUrls = results.map(result => result.secure_url);
            } else {
                imageUrls = files.map(file => `/uploads/${file.filename}`);
            }
        }

        const query = `
            UPDATE PRODUCTS
            SET name = ?, description = ?, stock = ?, price = ?, department_id = ?, category_id = ?
            WHERE product_id = ?
        `;

        db.query(query, [name, description, parseInt(stock), parseFloat(price), department_id, category_id, product_id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            // Log audit trail
            logProductAudit(product_id, req.user.user_id, 'modified', name, JSON.stringify({ price, stock, department_id, category_id, imagesUpdated: files && files.length > 0 }));

            if (imageUrls.length > 0) {
                // Delete old images first
                db.query('DELETE FROM PRODUCT_IMAGES WHERE product_id = ?', [product_id], (delErr) => {
                    if (delErr) {
                        console.error('Error deleting old images:', delErr);
                    }

                    const imageQuery = 'INSERT INTO PRODUCT_IMAGES (product_id, image_url) VALUES ?';
                    const imageValues = imageUrls.map(url => [product_id, url]);

                    db.query(imageQuery, [imageValues], (imageErr) => {
                        if (imageErr) {
                            console.error('Error updating images:', imageErr);
                            return res.status(500).json({ error: 'Error updating images.' });
                        }
                        res.json({ success: true, message: 'Product updated successfully.' });
                    });
                });
            } else {
                res.json({ success: true, message: 'Product updated successfully.' });
            }
        });
    } catch (uploadError) {
        console.error('Error uploading images:', uploadError);
        return res.status(500).json({ error: 'Error uploading images.' });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:product_id', authenticateAdmin, (req, res) => {
    const { product_id } = req.params;

    if (!validatePositiveInteger(product_id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Get product name before deleting for audit log
    db.query('SELECT name FROM PRODUCTS WHERE product_id = ?', [product_id], (nameErr, nameResults) => {
        const productName = nameResults?.[0]?.name || 'Unknown';

        db.query('DELETE FROM BASKET WHERE product_id = ?', [product_id], (err) => {
            if (err) {
                console.error('Database error (basket):', err);
                return res.status(500).json({ error: 'Failed to delete associated basket entries.' });
            }

            // Delete comments and likes
            db.query('DELETE FROM PRODUCT_COMMENTS WHERE product_id = ?', [product_id], () => {});
            db.query('DELETE FROM PRODUCT_LIKES WHERE product_id = ?', [product_id], () => {});

            db.query('DELETE FROM PRODUCT_IMAGES WHERE product_id = ?', [product_id], (imgErr) => {
                if (imgErr) {
                    console.error('Database error (images):', imgErr);
                }

                db.query('DELETE FROM PRODUCTS WHERE product_id = ?', [product_id], (prodErr) => {
                    if (prodErr) {
                        console.error('Database error (products):', prodErr);
                        return res.status(500).json({ error: 'Failed to delete product.' });
                    }

                    // Log audit trail
                    logProductAudit(product_id, req.user.user_id, 'deleted', productName, null);

                    res.json({ success: true, message: 'Product deleted successfully.' });
                });
            });
        });
    });
});

// ===================
// CATEGORIES API
// ===================

app.get('/api/categories', (req, res) => {
    const departmentName = req.query.department;

    if (!departmentName) {
        return res.status(400).json({ error: 'Department name is required' });
    }

    // Handle "tout" to return all categories
    let query;
    let queryParams = [];

    if (departmentName.toLowerCase() === 'tout') {
        query = `
            SELECT DISTINCT c.category_id, c.category_name
            FROM CATEGORY c
            ORDER BY c.category_name
        `;
    } else {
        query = `
            SELECT c.category_id, c.category_name
            FROM CATEGORY c
            JOIN DEPARTMENT_CATEGORY dc ON c.category_id = dc.category_id
            JOIN DEPARTMENT d ON dc.department_id = d.department_id
            WHERE d.department_name = ?
        `;
        queryParams.push(departmentName);
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(results);
    });
});

app.get('/api/all-categories', (req, res) => {
    db.query('SELECT category_id, category_name FROM CATEGORY', (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

app.get('/api/departments', (req, res) => {
    db.query('SELECT department_id, department_name FROM DEPARTMENT', (err, results) => {
        if (err) {
            console.error('Error fetching departments:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Products by category
app.get('/api/products_cat', (req, res) => {
    const categoryId = req.query.category_id;
    const departmentName = req.query.departmentName;

    if (!categoryId || !departmentName) {
        return res.status(400).json({ error: 'Category ID and Department Name are required' });
    }

    // Handle "tout" to get products from category regardless of department
    let query;
    let queryParams;

    if (departmentName.toLowerCase() === 'tout') {
        query = `
            SELECT p.product_id, p.name, p.description, p.price, p.stock, i.image_url
            FROM PRODUCTS p
            LEFT JOIN PRODUCT_IMAGES i ON p.product_id = i.product_id
            WHERE p.category_id = ?
        `;
        queryParams = [categoryId];
    } else {
        query = `
            SELECT p.product_id, p.name, p.description, p.price, p.stock, i.image_url
            FROM PRODUCTS p
            JOIN DEPARTMENT d ON p.department_id = d.department_id
            LEFT JOIN PRODUCT_IMAGES i ON p.product_id = i.product_id
            WHERE p.category_id = ? AND d.department_name = ?
        `;
        queryParams = [categoryId, departmentName];
    }

    db.query(query, queryParams, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        const productsMap = {};
        results.forEach(row => {
            const { product_id, name, description, price, stock, image_url } = row;
            if (!productsMap[product_id]) {
                productsMap[product_id] = {
                    product_id,
                    name,
                    description,
                    price: parseFloat(price),
                    stock,
                    images: []
                };
            }
            if (image_url) {
                productsMap[product_id].images.push(image_url);
            }
        });

        res.json(Object.values(productsMap));
    });
});

// Search categories
app.get('/api/search-categories', (req, res) => {
    const searchQuery = req.query.query || '';
    const limit = Math.min(20, parseInt(req.query.limit) || 10);

    if (searchQuery.length < 1) {
        return res.status(400).json({ error: 'Search query is too short' });
    }

    const query = `
        SELECT
            c.category_id,
            c.category_name,
            LOWER(d.department_name) AS department_name
        FROM CATEGORY c
        JOIN DEPARTMENT_CATEGORY dc ON c.category_id = dc.category_id
        JOIN DEPARTMENT d ON dc.department_id = d.department_id
        WHERE c.category_name LIKE ? OR d.department_name LIKE ?
        LIMIT ?
    `;

    db.query(query, [`%${searchQuery}%`, `%${searchQuery}%`, limit], (err, results) => {
        if (err) {
            console.error('Error fetching search results:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(results);
    });
});

// ===================
// USER AUTHENTICATION
// ===================

// Login
app.post('/api/users/check', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
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
                const token = generateToken(user);
                res.json({
                    isRegistered: true,
                    token,
                    userData: {
                        name: user.name,
                        surname: user.surname,
                        phone: user.phone,
                        email: user.email,
                        address: user.postal_address,
                        profilePicture: user.profile_picture,
                        user_id: user.user_id,
                        is_admin: user.is_admin
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

// Register
app.post('/api/users/register', async (req, res) => {
    const { name, surname, email, password, phone, address } = req.body;

    // Validation
    if (!name || !surname || !email || !password || !phone || !address) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (!validatePhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO USERS (name, surname, email, password, phone, postal_address) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [name.trim(), surname.trim(), email.toLowerCase().trim(), hashedPassword, phone.trim(), address.trim()], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }

            const userId = result.insertId;

            // Generate token for auto-login
            const token = generateToken({ user_id: userId, email: email.toLowerCase().trim(), is_admin: 0 });

            // Send beautiful welcome email (non-blocking)
            const frontendUrl = process.env.FRONTEND_URL || 'https://shekshouse.netlify.app';
            const mailOptions = {
                from: `"Shek's House" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🎉 Bienvenue chez Shek's House, ${name}!`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">SHEK'S HOUSE</h1>
            <p style="color: #ff4500; margin: 10px 0 0; font-size: 14px; letter-spacing: 2px;">MODE & STYLE PREMIUM</p>
        </div>

        <!-- Welcome Section -->
        <div style="text-align: center; padding: 40px 30px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                    <td style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
                        <span style="color: white; font-size: 40px; line-height: 80px;">👋</span>
                    </td>
                </tr>
            </table>
            <h2 style="color: #1a1a1a; margin: 25px 0 10px; font-size: 28px;">Bienvenue ${name}!</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">Votre compte a été créé avec succès</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 0 30px 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Nous sommes ravis de vous accueillir dans la famille <strong style="color: #ff4500;">Shek's House</strong>!
                Vous avez désormais accès à une expérience shopping unique avec des collections tendance et des offres exclusives.
            </p>

            <!-- Benefits Box -->
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px;">✨ Vos avantages membre</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 8px 0; color: #333;">
                            <span style="color: #ff4500; margin-right: 10px;">✓</span>
                            Accès aux ventes privées
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #333;">
                            <span style="color: #ff4500; margin-right: 10px;">✓</span>
                            Livraison gratuite sur toutes vos commandes
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #333;">
                            <span style="color: #ff4500; margin-right: 10px;">✓</span>
                            Codes promo exclusifs par email
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #333;">
                            <span style="color: #ff4500; margin-right: 10px;">✓</span>
                            Suivi de vos commandes en temps réel
                        </td>
                    </tr>
                </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
                    🛍️ Commencer mon shopping
                </a>
            </div>

            <!-- Account Info -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 25px;">
                <p style="color: #666; margin: 0 0 10px; font-size: 14px;">Vos informations de connexion:</p>
                <p style="color: #1a1a1a; margin: 0; font-size: 15px;">
                    <strong>Email:</strong> ${email}
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 30px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 15px; font-size: 14px;">
                Des questions? Contactez-nous!
            </p>
            <a href="mailto:support@shekshouse.com" style="color: #ff4500; text-decoration: none; font-weight: 600;">support@shekshouse.com</a>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #666; margin: 0; font-size: 12px;">
                    © ${new Date().getFullYear()} Shek's House. Tous droits réservés.<br>
                    Montréal, Québec, Canada
                </p>
            </div>
        </div>
    </div>
</body>
</html>
                `,
            };

            sendEmail(mailOptions).catch(err => {
                console.error('Error sending welcome email:', err);
            });

            res.json({
                success: true,
                message: 'User registered successfully.',
                user_id: userId,
                token
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error processing registration.' });
    }
});

// Update user (Authenticated)
app.put('/api/users/update', authenticateToken, async (req, res) => {
    const { name, surname, phone, password, address, email } = req.body;
    const user_id = req.user.user_id;

    if (!name || !surname || !phone || !address) {
        return res.status(400).json({ error: 'Name, surname, phone, and address are required.' });
    }

    if (email && !validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    try {
        let updateQuery = 'UPDATE USERS SET name = ?, surname = ?, phone = ?, postal_address = ?';
        const queryParams = [name.trim(), surname.trim(), phone.trim(), address.trim()];

        if (password) {
            if (!validatePassword(password)) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        if (email) {
            updateQuery += ', email = ?';
            queryParams.push(email.toLowerCase().trim());
        }

        updateQuery += ' WHERE user_id = ?';
        queryParams.push(user_id);

        db.query(updateQuery, queryParams, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                console.error('Error updating user:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.json({ success: true, message: 'Profile updated successfully.' });
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error processing update.' });
    }
});

// Upload profile picture (Authenticated)
app.post('/api/users/profile-picture', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    const user_id = req.user.user_id;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        let imageUrl;
        if (isCloudinaryConfigured) {
            // Upload to Cloudinary
            const result = await uploadToCloudinary(file.buffer, 'shekshouse/profiles');
            imageUrl = result.secure_url;
        } else {
            // Local storage
            imageUrl = `/uploads/${file.filename}`;
        }

        db.query('UPDATE USERS SET profile_picture = ? WHERE user_id = ?', [imageUrl, user_id], (err, result) => {
            if (err) {
                console.error('Error updating profile picture:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.json({ success: true, profilePicture: imageUrl, message: 'Photo de profil mise a jour.' });
        });
    } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ error: 'Error uploading image.' });
    }
});

// Delete user (Authenticated)
app.delete('/api/users/delete', authenticateToken, (req, res) => {
    const user_id = req.user.user_id;

    // Delete user's basket first
    db.query('DELETE FROM BASKET WHERE user_id = ?', [user_id], (basketErr) => {
        if (basketErr) {
            console.error('Error deleting user basket:', basketErr);
        }

        db.query('DELETE FROM USERS WHERE user_id = ?', [user_id], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ error: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            res.json({ success: true, message: 'Account deleted successfully.' });
        });
    });
});

// ===================
// ADMIN USER MANAGEMENT
// ===================

// Get all users (Admin only)
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    const query = `
        SELECT user_id, name, surname, email, phone, is_admin
        FROM USERS
        ORDER BY user_id DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Update user admin status (Admin only)
app.put('/api/admin/users/:user_id/role', authenticateAdmin, (req, res) => {
    const { user_id } = req.params;
    const { is_admin } = req.body;

    // Prevent admin from removing their own admin status
    if (parseInt(user_id) === req.user.user_id && is_admin === 0) {
        return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre statut admin.' });
    }

    if (is_admin !== 0 && is_admin !== 1) {
        return res.status(400).json({ error: 'Invalid admin status.' });
    }

    db.query('UPDATE USERS SET is_admin = ? WHERE user_id = ?', [is_admin, user_id], (err, result) => {
        if (err) {
            console.error('Error updating user role:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ success: true, message: is_admin ? 'Utilisateur promu admin.' : 'Statut admin retiré.' });
    });
});

// ===================
// DEPARTMENT MANAGEMENT (Admin only)
// ===================

// Add new department
app.post('/api/admin/departments', authenticateAdmin, (req, res) => {
    const { department_name } = req.body;

    if (!department_name || department_name.trim().length === 0) {
        return res.status(400).json({ error: 'Department name is required.' });
    }

    db.query('INSERT INTO DEPARTMENT (department_name) VALUES (?)', [department_name.trim()], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ce departement existe deja.' });
            }
            console.error('Error adding department:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ success: true, department_id: result.insertId, message: 'Departement ajoute.' });
    });
});

// Delete department
app.delete('/api/admin/departments/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM DEPARTMENT WHERE department_id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting department:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Departement non trouve.' });
        }
        res.json({ success: true, message: 'Departement supprime.' });
    });
});

// ===================
// CATEGORY MANAGEMENT (Admin only)
// ===================

// Add new category
app.post('/api/admin/categories', authenticateAdmin, (req, res) => {
    const { category_name, department_ids } = req.body;

    if (!category_name || category_name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name is required.' });
    }

    db.query('INSERT INTO CATEGORY (category_name) VALUES (?)', [category_name.trim()], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Cette categorie existe deja.' });
            }
            console.error('Error adding category:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        const categoryId = result.insertId;

        // If department_ids provided, link category to departments
        if (department_ids && Array.isArray(department_ids) && department_ids.length > 0) {
            const values = department_ids.map(deptId => [deptId, categoryId]);
            db.query('INSERT INTO DEPARTMENT_CATEGORY (department_id, category_id) VALUES ?', [values], (linkErr) => {
                if (linkErr) {
                    console.error('Error linking category to departments:', linkErr);
                }
                res.json({ success: true, category_id: categoryId, message: 'Categorie ajoutee.' });
            });
        } else {
            res.json({ success: true, category_id: categoryId, message: 'Categorie ajoutee.' });
        }
    });
});

// Delete category
app.delete('/api/admin/categories/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM CATEGORY WHERE category_id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting category:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categorie non trouvee.' });
        }
        res.json({ success: true, message: 'Categorie supprimee.' });
    });
});

// Link category to department
app.post('/api/admin/category-department', authenticateAdmin, (req, res) => {
    const { category_id, department_id } = req.body;

    if (!category_id || !department_id) {
        return res.status(400).json({ error: 'Category ID and Department ID are required.' });
    }

    db.query('INSERT IGNORE INTO DEPARTMENT_CATEGORY (department_id, category_id) VALUES (?, ?)',
        [department_id, category_id], (err) => {
        if (err) {
            console.error('Error linking category to department:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ success: true, message: 'Liaison ajoutee.' });
    });
});

// Unlink category from department
app.delete('/api/admin/category-department', authenticateAdmin, (req, res) => {
    const { category_id, department_id } = req.body;

    if (!category_id || !department_id) {
        return res.status(400).json({ error: 'Category ID and Department ID are required.' });
    }

    db.query('DELETE FROM DEPARTMENT_CATEGORY WHERE department_id = ? AND category_id = ?',
        [department_id, category_id], (err) => {
        if (err) {
            console.error('Error unlinking category from department:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ success: true, message: 'Liaison supprimee.' });
    });
});

// Get categories with their linked departments
app.get('/api/admin/categories-with-departments', authenticateAdmin, (req, res) => {
    const query = `
        SELECT c.category_id, c.category_name,
               GROUP_CONCAT(d.department_id) as department_ids,
               GROUP_CONCAT(d.department_name) as department_names
        FROM CATEGORY c
        LEFT JOIN DEPARTMENT_CATEGORY dc ON c.category_id = dc.category_id
        LEFT JOIN DEPARTMENT d ON dc.department_id = d.department_id
        GROUP BY c.category_id, c.category_name
        ORDER BY c.category_name
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching categories with departments:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// ===================
// PRODUCT COMMENTS API
// ===================

// Get comments for a product
app.get('/api/products/:product_id/comments', (req, res) => {
    const { product_id } = req.params;

    const query = `
        SELECT c.comment_id, c.comment_text, c.created_at,
               u.user_id, u.name, u.surname, u.profile_picture
        FROM PRODUCT_COMMENTS c
        JOIN USERS u ON c.user_id = u.user_id
        WHERE c.product_id = ?
        ORDER BY c.created_at DESC
    `;

    db.query(query, [product_id], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Add a comment (Authenticated)
app.post('/api/products/:product_id/comments', authenticateToken, (req, res) => {
    const { product_id } = req.params;
    const { comment_text } = req.body;
    const user_id = req.user.user_id;

    if (!comment_text || comment_text.trim().length === 0) {
        return res.status(400).json({ error: 'Le commentaire ne peut pas etre vide.' });
    }

    if (comment_text.length > 1000) {
        return res.status(400).json({ error: 'Le commentaire est trop long (max 1000 caracteres).' });
    }

    const query = 'INSERT INTO PRODUCT_COMMENTS (product_id, user_id, comment_text) VALUES (?, ?, ?)';
    db.query(query, [product_id, user_id, comment_text.trim()], (err, result) => {
        if (err) {
            console.error('Error adding comment:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        // Get user info for response
        db.query('SELECT name, surname, profile_picture FROM USERS WHERE user_id = ?', [user_id], (userErr, userResults) => {
            const user = userResults?.[0] || {};
            res.json({
                success: true,
                comment: {
                    comment_id: result.insertId,
                    comment_text: comment_text.trim(),
                    created_at: new Date(),
                    user_id,
                    name: user.name,
                    surname: user.surname,
                    profile_picture: user.profile_picture
                }
            });
        });
    });
});

// Delete a comment (Owner or Admin)
app.delete('/api/comments/:comment_id', authenticateToken, (req, res) => {
    const { comment_id } = req.params;
    const user_id = req.user.user_id;
    const is_admin = req.user.is_admin;

    // Check ownership or admin status
    db.query('SELECT user_id FROM PRODUCT_COMMENTS WHERE comment_id = ?', [comment_id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Commentaire non trouve.' });
        }

        if (results[0].user_id !== user_id && !is_admin) {
            return res.status(403).json({ error: 'Non autorise.' });
        }

        db.query('DELETE FROM PRODUCT_COMMENTS WHERE comment_id = ?', [comment_id], (delErr) => {
            if (delErr) {
                return res.status(500).json({ error: 'Database error.' });
            }
            res.json({ success: true, message: 'Commentaire supprime.' });
        });
    });
});

// ===================
// PRODUCT LIKES API
// ===================

// Get likes/dislikes count for a product
app.get('/api/products/:product_id/likes', (req, res) => {
    const { product_id } = req.params;

    const query = `
        SELECT
            SUM(CASE WHEN is_like = 1 THEN 1 ELSE 0 END) as likes,
            SUM(CASE WHEN is_like = 0 THEN 1 ELSE 0 END) as dislikes
        FROM PRODUCT_LIKES
        WHERE product_id = ?
    `;

    db.query(query, [product_id], (err, results) => {
        if (err) {
            console.error('Error fetching likes:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json({
            likes: parseInt(results[0].likes) || 0,
            dislikes: parseInt(results[0].dislikes) || 0
        });
    });
});

// Get user's like status for a product
app.get('/api/products/:product_id/likes/user', authenticateToken, (req, res) => {
    const { product_id } = req.params;
    const user_id = req.user.user_id;

    db.query('SELECT is_like FROM PRODUCT_LIKES WHERE product_id = ? AND user_id = ?',
        [product_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }
        if (results.length === 0) {
            return res.json({ userLike: null });
        }
        res.json({ userLike: results[0].is_like === 1 ? 'like' : 'dislike' });
    });
});

// Toggle like/dislike (Authenticated)
app.post('/api/products/:product_id/likes', authenticateToken, (req, res) => {
    const { product_id } = req.params;
    const { is_like } = req.body; // true for like, false for dislike
    const user_id = req.user.user_id;

    if (typeof is_like !== 'boolean') {
        return res.status(400).json({ error: 'is_like doit etre un boolean.' });
    }

    const likeValue = is_like ? 1 : 0;

    // Check if user already has a like/dislike
    db.query('SELECT like_id, is_like FROM PRODUCT_LIKES WHERE product_id = ? AND user_id = ?',
        [product_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }

        if (results.length > 0) {
            const currentLike = results[0].is_like;

            if (currentLike === likeValue) {
                // Same action - remove the like/dislike
                db.query('DELETE FROM PRODUCT_LIKES WHERE product_id = ? AND user_id = ?',
                    [product_id, user_id], (delErr) => {
                    if (delErr) return res.status(500).json({ error: 'Database error.' });
                    updateProductLikeCounts(product_id);
                    res.json({ success: true, action: 'removed' });
                });
            } else {
                // Different action - update to new value
                db.query('UPDATE PRODUCT_LIKES SET is_like = ? WHERE product_id = ? AND user_id = ?',
                    [likeValue, product_id, user_id], (updErr) => {
                    if (updErr) return res.status(500).json({ error: 'Database error.' });
                    updateProductLikeCounts(product_id);
                    res.json({ success: true, action: is_like ? 'liked' : 'disliked' });
                });
            }
        } else {
            // New like/dislike
            db.query('INSERT INTO PRODUCT_LIKES (product_id, user_id, is_like) VALUES (?, ?, ?)',
                [product_id, user_id, likeValue], (insErr) => {
                if (insErr) return res.status(500).json({ error: 'Database error.' });
                updateProductLikeCounts(product_id);
                res.json({ success: true, action: is_like ? 'liked' : 'disliked' });
            });
        }
    });
});

// Helper function to update cached like counts
function updateProductLikeCounts(product_id) {
    const query = `
        UPDATE PRODUCTS p
        SET
            like_count = (SELECT COUNT(*) FROM PRODUCT_LIKES WHERE product_id = ? AND is_like = 1),
            dislike_count = (SELECT COUNT(*) FROM PRODUCT_LIKES WHERE product_id = ? AND is_like = 0)
        WHERE p.product_id = ?
    `;
    db.query(query, [product_id, product_id, product_id], (err) => {
        if (err) console.error('Error updating like counts:', err);
    });
}

// ===================
// PRODUCT AUDIT API
// ===================

// Get audit trail for a product (Admin only)
app.get('/api/admin/products/:product_id/audit', authenticateAdmin, (req, res) => {
    const { product_id } = req.params;

    const query = `
        SELECT a.audit_id, a.action_type, a.action_date, a.product_name, a.details,
               u.user_id, u.name as admin_name, u.surname as admin_surname, u.email as admin_email
        FROM PRODUCT_AUDIT a
        LEFT JOIN USERS u ON a.admin_id = u.user_id
        WHERE a.product_id = ?
        ORDER BY a.action_date DESC
    `;

    db.query(query, [product_id], (err, results) => {
        if (err) {
            console.error('Error fetching audit trail:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Get all recent audit entries (Admin only)
app.get('/api/admin/audit', authenticateAdmin, (req, res) => {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const query = `
        SELECT a.audit_id, a.product_id, a.action_type, a.action_date, a.product_name, a.details,
               u.user_id, u.name as admin_name, u.surname as admin_surname
        FROM PRODUCT_AUDIT a
        LEFT JOIN USERS u ON a.admin_id = u.user_id
        ORDER BY a.action_date DESC
        LIMIT ?
    `;

    db.query(query, [limit], (err, results) => {
        if (err) {
            console.error('Error fetching audit log:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Helper function to log product audit
function logProductAudit(product_id, admin_id, action_type, product_name, details = null) {
    const query = 'INSERT INTO PRODUCT_AUDIT (product_id, admin_id, action_type, product_name, details) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [product_id, admin_id, action_type, product_name, details], (err) => {
        if (err) console.error('Error logging audit:', err);
    });
}

// ===================
// PASSWORD RESET
// ===================

app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const query = 'UPDATE USERS SET reset_code = ?, reset_code_expires = ? WHERE email = ?';
    db.query(query, [resetCode, expiresAt, email.toLowerCase()], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.affectedRows === 0) {
            // Don't reveal if email exists or not
            return res.json({ success: true, message: 'If this email exists, a reset code has been sent.' });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Code de reinitialisation - Shek\'s House',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #ff4500; margin-bottom: 20px;">Reinitialisation de mot de passe</h2>
                    <p style="color: #333333; font-size: 16px;">Votre code de reinitialisation est:</p>
                    <h1 style="background: #1a1a1a; color: #ffffff; padding: 25px; text-align: center; letter-spacing: 8px; border-radius: 8px; font-size: 32px;">${resetCode}</h1>
                    <p style="color: #666666; font-size: 14px; margin-top: 20px;">Ce code expire dans 15 minutes.</p>
                    <p style="color: #999999; font-size: 13px;">Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;">
                    <p style="color: #999999; font-size: 12px; text-align: center;">Shek's House - Votre boutique en ligne</p>
                </div>
            `,
        };

        sendEmail(mailOptions)
            .then(() => {
                res.json({ success: true, message: 'Reset code sent to your email.' });
            })
            .catch((error) => {
                console.error('Error sending email:', error);
                res.status(500).json({ success: false, message: 'Failed to send email.' });
            });
    });
});

app.post('/api/verify-code', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required.' });
    }

    const query = 'SELECT * FROM USERS WHERE reset_code = ? AND (reset_code_expires IS NULL OR reset_code_expires > NOW())';
    db.query(query, [code], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: 'Invalid or expired reset code.' });
        }
        res.json({ success: true });
    });
});

app.post('/api/reset-password', (req, res) => {
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
        return res.status(400).json({ success: false, message: 'Code and new password are required.' });
    }

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const query = 'UPDATE USERS SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE reset_code = ? AND (reset_code_expires IS NULL OR reset_code_expires > NOW())';
    db.query(query, [hashedPassword, code], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired reset code.' });
        }
        res.json({ success: true, message: 'Password reset successfully.' });
    });
});

// ===================
// BASKET API
// ===================

app.get('/api/basket', authenticateToken, (req, res) => {
    const userId = req.user.user_id;

    const query = `
        SELECT b.*, p.name, p.price, p.stock,
               (SELECT image_url FROM PRODUCT_IMAGES WHERE product_id = b.product_id LIMIT 1) as image_url
        FROM BASKET b
        JOIN PRODUCTS p ON b.product_id = p.product_id
        WHERE b.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

app.get('/api/basket/count', optionalAuth, (req, res) => {
    const userId = req.user?.user_id || req.query.user_id;

    if (!userId) {
        return res.json({ itemCount: 0 });
    }

    const query = 'SELECT SUM(quantity) AS itemCount FROM BASKET WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ itemCount: results[0]?.itemCount || 0 });
    });
});

app.post('/api/basket', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const { productId, quantity } = req.body;

    if (!productId || !validatePositiveInteger(productId)) {
        return res.status(400).json({ error: 'Valid Product ID is required' });
    }

    const qty = parseInt(quantity) || 1;
    if (qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be positive' });
    }

    // Check stock availability
    db.query('SELECT stock FROM PRODUCTS WHERE product_id = ?', [productId], (stockErr, stockResults) => {
        if (stockErr || stockResults.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const availableStock = stockResults[0].stock;

        // Check current basket quantity
        db.query('SELECT quantity FROM BASKET WHERE user_id = ? AND product_id = ?', [userId, productId], (basketErr, basketResults) => {
            const currentQty = basketResults?.[0]?.quantity || 0;

            if (currentQty + qty > availableStock) {
                return res.status(400).json({ error: `Only ${availableStock - currentQty} items available` });
            }

            const query = `
                INSERT INTO BASKET (user_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            `;

            db.query(query, [userId, productId, qty], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true, message: 'Added to basket' });
            });
        });
    });
});

app.put('/api/basket', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined) {
        return res.status(400).json({ error: 'Product ID and quantity are required.' });
    }

    const qty = parseInt(quantity);
    if (qty < 0) {
        return res.status(400).json({ error: 'Quantity cannot be negative.' });
    }

    if (qty === 0) {
        // Remove from basket
        db.query('DELETE FROM BASKET WHERE user_id = ? AND product_id = ?', [userId, product_id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error.' });
            }
            res.json({ success: true, message: 'Item removed from basket.' });
        });
    } else {
        // Check stock
        db.query('SELECT stock FROM PRODUCTS WHERE product_id = ?', [product_id], (stockErr, stockResults) => {
            if (stockErr || stockResults.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            if (qty > stockResults[0].stock) {
                return res.status(400).json({ error: `Only ${stockResults[0].stock} items available` });
            }

            const query = 'UPDATE BASKET SET quantity = ? WHERE user_id = ? AND product_id = ?';
            db.query(query, [qty, userId, product_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error.' });
                }
                res.json({ success: true, message: 'Basket updated.' });
            });
        });
    }
});

app.delete('/api/basket', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const { product_id } = req.query;

    if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required.' });
    }

    db.query('DELETE FROM BASKET WHERE user_id = ? AND product_id = ?', [userId, product_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found in basket.' });
        }
        res.json({ success: true, message: 'Item removed from basket.' });
    });
});

// ===================
// ORDERS API
// ===================

// Get user orders
app.get('/api/orders', authenticateToken, (req, res) => {
    const userId = req.user.user_id;

    const query = `
        SELECT o.*, oi.product_id, oi.quantity, oi.price, oi.product_name,
               (SELECT image_url FROM PRODUCT_IMAGES WHERE product_id = oi.product_id LIMIT 1) as image_url
        FROM ORDERS o
        LEFT JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            // If tables don't exist, return empty array instead of error
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.warn('Orders tables not found. Please run orders_schema.sql');
                return res.json([]);
            }
            console.error('Orders query error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        // Group items by order
        const ordersMap = {};
        results.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    order_number: row.order_number,
                    status: row.status,
                    subtotal: parseFloat(row.subtotal),
                    discount: parseFloat(row.discount || 0),
                    taxes: parseFloat(row.taxes),
                    total: parseFloat(row.total),
                    delivery_address: row.delivery_address,
                    delivery_city: row.delivery_city,
                    delivery_province: row.delivery_province,
                    delivery_postal: row.delivery_postal,
                    created_at: row.created_at,
                    items: []
                };
            }
            if (row.product_id) {
                ordersMap[row.order_id].items.push({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: parseFloat(row.price),
                    image_url: row.image_url
                });
            }
        });

        res.json(Object.values(ordersMap));
    });
});

// ===================
// ADMIN ORDERS API
// ===================

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticateAdmin, (req, res) => {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = `
        SELECT o.*, u.name as customer_name, u.surname as customer_surname, u.email as customer_email,
               (SELECT COUNT(*) FROM ORDER_ITEMS WHERE order_id = o.order_id) as item_count
        FROM ORDERS o
        LEFT JOIN USERS u ON o.user_id = u.user_id
        WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
        query += ' AND o.status = ?';
        params.push(status);
    }

    if (search) {
        query += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.surname LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Admin orders query error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Get order details (Admin only)
app.get('/api/admin/orders/:order_id', authenticateAdmin, (req, res) => {
    const { order_id } = req.params;

    const query = `
        SELECT o.*, u.name as customer_name, u.surname as customer_surname,
               u.email as customer_email, u.phone as customer_phone
        FROM ORDERS o
        LEFT JOIN USERS u ON o.user_id = u.user_id
        WHERE o.order_id = ?
    `;

    db.query(query, [order_id], (err, orderResults) => {
        if (err) {
            console.error('Order detail query error:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (orderResults.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = orderResults[0];

        // Get order items
        const itemsQuery = `
            SELECT oi.*,
                   (SELECT image_url FROM PRODUCT_IMAGES WHERE product_id = oi.product_id LIMIT 1) as image_url
            FROM ORDER_ITEMS oi
            WHERE oi.order_id = ?
        `;

        db.query(itemsQuery, [order_id], (itemErr, items) => {
            if (itemErr) {
                console.error('Order items query error:', itemErr);
                return res.status(500).json({ error: 'Database error.' });
            }

            order.items = items;
            res.json(order);
        });
    });
});

// Update order status (Admin only)
app.put('/api/admin/orders/:order_id/status', authenticateAdmin, (req, res) => {
    const { order_id } = req.params;
    const { status } = req.body;

    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }

    // First get the order and customer info
    const getOrderQuery = `
        SELECT o.*, u.email, u.name, u.surname
        FROM ORDERS o
        JOIN USERS u ON o.user_id = u.user_id
        WHERE o.order_id = ?
    `;

    db.query(getOrderQuery, [order_id], (getErr, orderResults) => {
        if (getErr) {
            console.error('Get order error:', getErr);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (orderResults.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = orderResults[0];
        const previousStatus = order.status;

        // Update the status
        db.query('UPDATE ORDERS SET status = ? WHERE order_id = ?', [status, order_id], (updateErr) => {
            if (updateErr) {
                console.error('Update order status error:', updateErr);
                return res.status(500).json({ error: 'Database error.' });
            }

            // Send email notification for status changes
            if (status !== previousStatus) {
                sendOrderStatusEmail(order, status);
            }

            res.json({ success: true, message: 'Order status updated.', previousStatus, newStatus: status });
        });
    });
});

// Get order statistics (Admin only)
app.get('/api/admin/orders/stats/summary', authenticateAdmin, (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM ORDERS',
        confirmed: "SELECT COUNT(*) as count FROM ORDERS WHERE status = 'confirmed'",
        processing: "SELECT COUNT(*) as count FROM ORDERS WHERE status = 'processing'",
        shipped: "SELECT COUNT(*) as count FROM ORDERS WHERE status = 'shipped'",
        delivered: "SELECT COUNT(*) as count FROM ORDERS WHERE status = 'delivered'",
        cancelled: "SELECT COUNT(*) as count FROM ORDERS WHERE status = 'cancelled'",
        revenue: "SELECT COALESCE(SUM(total), 0) as total FROM ORDERS WHERE status != 'cancelled'",
        today: "SELECT COUNT(*) as count FROM ORDERS WHERE DATE(created_at) = CURDATE()"
    };

    const stats = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.query(query, (err, results) => {
            if (err) {
                stats[key] = 0;
            } else {
                stats[key] = results[0].count || results[0].total || 0;
            }
            completed++;
            if (completed === totalQueries) {
                res.json(stats);
            }
        });
    });
});

// Helper function to send order status email
function sendOrderStatusEmail(order, newStatus) {
    const statusMessages = {
        processing: {
            subject: `📦 Commande #${order.order_number} en préparation`,
            title: 'Votre commande est en cours de préparation!',
            message: 'Notre équipe prépare soigneusement votre commande. Elle sera expédiée très bientôt.',
            icon: '📦',
            color: '#3498db'
        },
        shipped: {
            subject: `🚚 Commande #${order.order_number} expédiée!`,
            title: 'Votre commande est en route!',
            message: 'Bonne nouvelle! Votre commande a été expédiée et est en chemin vers vous.',
            icon: '🚚',
            color: '#9b59b6'
        },
        delivered: {
            subject: `✅ Commande #${order.order_number} livrée`,
            title: 'Commande livrée avec succès!',
            message: 'Votre commande a été livrée. Nous espérons que vous apprécierez vos achats!',
            icon: '✅',
            color: '#27ae60'
        },
        cancelled: {
            subject: `❌ Commande #${order.order_number} annulée`,
            title: 'Commande annulée',
            message: 'Votre commande a été annulée. Si vous avez des questions, contactez notre support.',
            icon: '❌',
            color: '#e74c3c'
        }
    };

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) return;

    const frontendUrl = process.env.FRONTEND_URL || 'https://shekshouse.netlify.app';

    const mailOptions = {
        from: `"Shek's House" <${process.env.EMAIL_USER}>`,
        to: order.email,
        subject: statusInfo.subject,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SHEK'S HOUSE</h1>
        </div>

        <!-- Status Icon -->
        <div style="text-align: center; padding: 40px 30px 20px;">
            <div style="width: 80px; height: 80px; background: ${statusInfo.color}; border-radius: 50%; margin: 0 auto; line-height: 80px;">
                <span style="font-size: 40px;">${statusInfo.icon}</span>
            </div>
            <h2 style="color: #1a1a1a; margin: 25px 0 10px; font-size: 24px;">${statusInfo.title}</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">${statusInfo.message}</p>
        </div>

        <!-- Order Info -->
        <div style="padding: 0 30px 30px;">
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 8px 0; color: #666;">Numéro de commande:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a1a;">#${order.order_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;">Total:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #ff4500;">CA$ ${parseFloat(order.total).toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${frontendUrl}/html/orders.html" style="display: inline-block; background: #ff4500; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: 600;">
                    Voir ma commande
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 20px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Shek's House. Tous droits réservés.
            </p>
        </div>
    </div>
</body>
</html>
        `
    };

    sendEmail(mailOptions).catch(err => {
        console.error('Error sending status email:', err);
    });
}

// ===================
// PAYMENT API
// ===================

// Get Stripe publishable key (public endpoint)
app.get('/api/stripe-config', (req, res) => {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51PIRk7DIrmiE2Hgb4lLVD99VQnFg7uWaAhtEBBBzLIixaLhcQ9FOuhkSonPw8SozcgiS19efR92rNwYX6kQ7TRvT00YayxN2sq';
    res.json({ publishableKey });
});

app.post('/api/payment', authenticateToken, async (req, res) => {
    const user_id = req.user.user_id;
    const { amount, currency, paymentMethodId, delivery, promoCode, subtotal: clientSubtotal, discount: clientDiscount } = req.body;

    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('Payment failed: STRIPE_SECRET_KEY is not configured');
        return res.status(500).json({ error: 'Payment service is not configured. Please contact support.' });
    }

    // Quebec tax rate (TPS 5% + TVQ 9.975% = 14.975%)
    const TAX_RATE = 0.14975;

    if (!amount || !currency || !paymentMethodId) {
        return res.status(400).json({ error: 'Amount, currency, and payment method are required.' });
    }

    if (!validatePositiveInteger(amount)) {
        return res.status(400).json({ error: 'Invalid amount.' });
    }

    try {
        // Fetch user information
        const userQuery = 'SELECT email, name, surname, phone, postal_address FROM USERS WHERE user_id = ?';
        db.query(userQuery, [user_id], async (userErr, userResults) => {
            if (userErr || userResults.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const userData = userResults[0];

            // Fetch and validate basket
            const basketQuery = `
                SELECT b.product_id, b.quantity, p.name, p.price, p.stock,
                       (SELECT image_url FROM PRODUCT_IMAGES WHERE product_id = b.product_id LIMIT 1) as image_url
                FROM BASKET b
                JOIN PRODUCTS p ON b.product_id = p.product_id
                WHERE b.user_id = ?
            `;

            db.query(basketQuery, [user_id], async (basketErr, basketItems) => {
                if (basketErr) {
                    console.error('Basket query error:', basketErr);
                    return res.status(500).json({ error: 'Database error: ' + basketErr.message });
                }

                if (basketItems.length === 0) {
                    return res.status(400).json({ error: 'Your basket is empty.' });
                }

                // Validate stock availability
                for (const item of basketItems) {
                    if (item.quantity > item.stock) {
                        return res.status(400).json({
                            error: `Insufficient stock for ${item.name}. Only ${item.stock} available.`
                        });
                    }
                }

                // Calculate totals (matching frontend calculation)
                const subtotal = basketItems.reduce((sum, item) => sum + parseFloat(item.price) * parseInt(item.quantity), 0);

                // Validate and apply promo code discount
                let discount = 0;
                let validPromoCode = null;

                if (promoCode && clientDiscount > 0) {
                    // Simple validation: trust the client discount if promo code is provided
                    // In production, you should validate the promo code against database
                    discount = clientDiscount;
                    validPromoCode = promoCode;
                }

                const discountedSubtotal = Math.max(0, subtotal - discount);
                const taxes = discountedSubtotal * TAX_RATE;
                const total = Math.round((discountedSubtotal + taxes) * 100);

                // Verify amount matches (allow 1$ tolerance for rounding differences)
                if (Math.abs(total - amount) > 100) {
                    console.log('Amount mismatch:', { serverTotal: total, clientAmount: amount, subtotal, discount, taxes });
                    return res.status(400).json({ error: 'Amount mismatch. Please refresh your basket.' });
                }

                try {
                    // Create payment intent
                    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3006}`;
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: amount,
                        currency: currency,
                        payment_method: paymentMethodId,
                        confirm: true,
                        return_url: `${baseUrl}/index.html`,
                        automatic_payment_methods: { enabled: true },
                    });

                    // Update stock
                    for (const item of basketItems) {
                        await new Promise((resolve, reject) => {
                            db.query(
                                'UPDATE PRODUCTS SET stock = stock - ? WHERE product_id = ?',
                                [item.quantity, item.product_id],
                                (err) => err ? reject(err) : resolve()
                            );
                        });
                    }

                    // Generate order ID
                    const orderId = `SH-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

                    // Save order to database
                    const deliveryInfo = delivery || {
                        address: userData.postal_address,
                        city: '',
                        province: 'QC',
                        postal: '',
                        country: 'Canada'
                    };

                    const orderInsertQuery = `
                        INSERT INTO ORDERS (user_id, order_number, status, subtotal, discount, taxes, total,
                            delivery_address, delivery_city, delivery_province, delivery_postal, promo_code)
                        VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await new Promise((resolve, reject) => {
                        db.query(orderInsertQuery, [
                            user_id, orderId, subtotal, discount, taxes, discountedSubtotal + taxes,
                            deliveryInfo.address, deliveryInfo.city, deliveryInfo.province,
                            deliveryInfo.postal, validPromoCode
                        ], (err, result) => {
                            if (err) {
                                console.error('Order insert error:', err);
                                return reject(err);
                            }

                            const dbOrderId = result.insertId;
                            const itemValues = basketItems.map(item => [
                                dbOrderId, item.product_id, item.name, item.quantity, parseFloat(item.price)
                            ]);

                            db.query(
                                'INSERT INTO ORDER_ITEMS (order_id, product_id, product_name, quantity, price) VALUES ?',
                                [itemValues],
                                (itemErr) => {
                                    if (itemErr) console.error('Order items insert error:', itemErr);
                                    resolve();
                                }
                            );
                        });
                    });

                    // Generate invoice and send email
                    generateInvoiceAndSendEmail({
                        userEmail: userData.email,
                        userId: user_id,
                        userName: userData.name,
                        userSurname: userData.surname,
                        userPhone: userData.phone,
                        delivery: delivery || {
                            name: userData.name,
                            surname: userData.surname,
                            address: userData.postal_address,
                            city: '',
                            province: 'QC',
                            postal: '',
                            country: 'Canada'
                        },
                        basketItems,
                        subtotal,
                        discount,
                        promoCode: validPromoCode,
                        taxes,
                        total: discountedSubtotal + taxes,
                        orderId
                    }, () => {});

                    // Clear basket
                    db.query('DELETE FROM BASKET WHERE user_id = ?', [user_id]);

                    // Record coupon usage if a promo code was used
                    if (validPromoCode && discount > 0) {
                        db.query('SELECT coupon_id FROM COUPONS WHERE code = ?', [validPromoCode], (err, couponResults) => {
                            if (!err && couponResults.length > 0) {
                                const coupon_id = couponResults[0].coupon_id;

                                // Insert usage record
                                db.query(
                                    `INSERT INTO COUPON_USAGE (coupon_id, user_id, order_id, original_amount, discount_applied, final_amount)
                                     VALUES (?, ?, ?, ?, ?, ?)`,
                                    [coupon_id, user_id, orderId, subtotal, discount, discountedSubtotal + taxes],
                                    (usageErr) => {
                                        if (usageErr) {
                                            console.error('Error recording coupon usage:', usageErr);
                                        }
                                    }
                                );

                                // Increment usage counter
                                db.query('UPDATE COUPONS SET current_uses = current_uses + 1 WHERE coupon_id = ?', [coupon_id], (updateErr) => {
                                    if (updateErr) {
                                        console.error('Error incrementing coupon usage count:', updateErr);
                                    }
                                });
                            }
                        });
                    }

                    res.json({ success: true, paymentIntent, orderId });
                } catch (stripeError) {
                    console.error('Stripe error details:', {
                        message: stripeError.message,
                        type: stripeError.type,
                        code: stripeError.code,
                        stack: stripeError.stack
                    });
                    res.status(400).json({ error: stripeError.message || 'Payment failed. Please try again.' });
                }
            });
        });
    } catch (error) {
        console.error('Payment error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Payment processing error. Please try again.' });
    }
});

// ===================
// INVOICE GENERATION
// ===================

function generateInvoiceAndSendEmail(orderInfo, callback) {
    const {
        userEmail,
        userId,
        userName,
        userSurname,
        userPhone,
        delivery,
        basketItems,
        subtotal,
        discount,
        promoCode,
        taxes,
        total,
        orderId
    } = orderInfo;

    const invoiceDir = path.join(__dirname, 'invoices');
    const invoiceFileName = `invoice_${orderId}_${Date.now()}.pdf`;
    const invoicePath = path.join(invoiceDir, invoiceFileName);

    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Format date
    const orderDate = new Date();
    const formattedDate = orderDate.toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Calculate estimated delivery (3-5 business days)
    const minDelivery = addBusinessDays(orderDate, 3);
    const maxDelivery = addBusinessDays(orderDate, 5);
    const deliveryRange = `${minDelivery.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} - ${maxDelivery.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`;

    // Generate PDF Invoice
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Colors
    const primaryColor = '#ff4500';
    const darkColor = '#1a1a1a';
    const grayColor = '#666666';
    const lightGray = '#f5f5f5';

    // Header with logo placeholder
    doc.rect(0, 0, 612, 120).fill(darkColor);
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text("SHEK'S HOUSE", 50, 40);
    doc.fontSize(12).font('Helvetica').text('Mode & Style Premium', 50, 75);
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('FACTURE', 450, 50, { align: 'right' });
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text(`#${orderId}`, 450, 70, { align: 'right' });
    doc.text(formattedDate, 450, 85, { align: 'right' });

    doc.moveDown(4);

    // Customer Info (billing)
    const infoY = 150;
    doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('CLIENT:', 50, infoY);
    doc.font('Helvetica').fillColor(grayColor).fontSize(10);
    doc.text(`${userName || ''} ${userSurname || ''}`, 50, infoY + 18);
    doc.text(userEmail, 50, infoY + 33);
    if (userPhone) doc.text(userPhone, 50, infoY + 48);

    // Delivery Address (simplified - no duplicate name)
    doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('ADRESSE DE LIVRAISON:', 320, infoY);
    doc.font('Helvetica').fillColor(grayColor).fontSize(10);
    doc.text(delivery.address || '', 320, infoY + 18);
    doc.text(`${delivery.city || ''}, ${delivery.province || ''} ${delivery.postal || ''}`, 320, infoY + 33);
    doc.text(delivery.country || 'Canada', 320, infoY + 48);

    // Items Table Header
    const tableTop = 260;
    doc.rect(50, tableTop, 512, 25).fill(darkColor);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('ARTICLE', 60, tableTop + 8);
    doc.text('QTE', 350, tableTop + 8, { width: 50, align: 'center' });
    doc.text('PRIX', 410, tableTop + 8, { width: 60, align: 'right' });
    doc.text('TOTAL', 480, tableTop + 8, { width: 70, align: 'right' });

    // Items
    let itemY = tableTop + 35;
    doc.font('Helvetica').fillColor(darkColor).fontSize(10);

    basketItems.forEach((item, index) => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        const itemTotal = price * quantity;
        const bgColor = index % 2 === 0 ? '#ffffff' : lightGray;
        doc.rect(50, itemY - 5, 512, 25).fill(bgColor);
        doc.fillColor(darkColor);
        doc.text(item.name, 60, itemY, { width: 280 });
        doc.text(quantity.toString(), 350, itemY, { width: 50, align: 'center' });
        doc.text(`CA$ ${price.toFixed(2)}`, 410, itemY, { width: 60, align: 'right' });
        doc.text(`CA$ ${itemTotal.toFixed(2)}`, 480, itemY, { width: 70, align: 'right' });
        itemY += 25;
    });

    // Totals section
    const totalsY = itemY + 20;
    doc.moveTo(350, totalsY).lineTo(562, totalsY).strokeColor('#dddddd').stroke();

    doc.fontSize(10).fillColor(grayColor);
    doc.text('Sous-total:', 350, totalsY + 10, { width: 120 });
    doc.text(`CA$ ${subtotal.toFixed(2)}`, 480, totalsY + 10, { width: 70, align: 'right' });

    let currentY = totalsY + 28;

    if (discount > 0) {
        doc.fillColor('#27ae60').text(`Réduction ${promoCode ? `(${promoCode})` : ''}:`, 350, currentY, { width: 120 });
        doc.text(`-CA$ ${discount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
        currentY += 18;
    }

    doc.fillColor(grayColor).text('Livraison:', 350, currentY, { width: 120 });
    doc.fillColor('#27ae60').text('GRATUITE', 480, currentY, { width: 70, align: 'right' });
    currentY += 18;

    doc.fillColor(grayColor).text('Taxes (TPS + TVQ):', 350, currentY, { width: 120 });
    doc.text(`CA$ ${taxes.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
    currentY += 25;

    doc.moveTo(350, currentY).lineTo(562, currentY).strokeColor('#dddddd').stroke();
    currentY += 10;

    doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold');
    doc.text('TOTAL:', 350, currentY, { width: 120 });
    doc.fillColor(primaryColor).text(`CA$ ${total.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });

    // Delivery info box
    const boxY = currentY + 50;
    doc.rect(50, boxY, 512, 60).fill(lightGray);
    doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('Livraison estimée', 70, boxY + 15);
    doc.font('Helvetica').fontSize(10).fillColor(grayColor).text(deliveryRange, 70, boxY + 32);
    doc.text('Vous recevrez un courriel de suivi dès que votre commande sera expédiée.', 70, boxY + 45);

    // Footer
    const footerY = 720;
    doc.moveTo(50, footerY).lineTo(562, footerY).strokeColor('#dddddd').stroke();
    doc.fillColor(grayColor).fontSize(9).font('Helvetica');
    doc.text("Merci d'avoir choisi Shek's House!", 50, footerY + 15, { align: 'center', width: 512 });
    doc.text('Pour toute question, contactez-nous à support@shekshouse.com', 50, footerY + 30, { align: 'center', width: 512 });
    doc.fillColor(primaryColor).text('www.shekshouse.com', 50, footerY + 45, { align: 'center', width: 512 });

    doc.end();

    // Generate items HTML for email
    const itemsHtml = basketItems.map(item => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        return `
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center;">
                    <div>
                        <p style="margin: 0; font-weight: 600; color: #1a1a1a;">${item.name}</p>
                        <p style="margin: 5px 0 0; color: #888; font-size: 13px;">Quantité: ${quantity}</p>
                    </div>
                </div>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
                CA$ ${(price * quantity).toFixed(2)}
            </td>
        </tr>
    `;
    }).join('');

    // Beautiful HTML Email with proper French
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">SHEK'S HOUSE</h1>
            <p style="color: #ff4500; margin: 10px 0 0; font-size: 14px; letter-spacing: 2px;">MODE & STYLE PREMIUM</p>
        </div>

        <!-- Success Icon - Table-based centering for email compatibility -->
        <div style="text-align: center; padding: 40px 30px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                    <td style="width: 80px; height: 80px; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
                        <span style="color: white; font-size: 40px; line-height: 80px;">✓</span>
                    </td>
                </tr>
            </table>
            <h2 style="color: #1a1a1a; margin: 25px 0 10px; font-size: 24px;">Commande confirmée!</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">Merci pour votre achat, ${userName || userSurname}!</p>
        </div>

        <!-- Order Info -->
        <div style="padding: 0 30px;">
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0;">
                            <span style="color: #888; font-size: 13px;">Numéro de commande</span><br>
                            <strong style="color: #1a1a1a; font-size: 16px;">#${orderId}</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #888; font-size: 13px;">Date</span><br>
                            <strong style="color: #1a1a1a; font-size: 16px;">${formattedDate}</strong>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Items -->
            <h3 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px; border-bottom: 2px solid #ff4500; padding-bottom: 10px; display: inline-block;">Vos articles</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${itemsHtml}
            </table>

            <!-- Totals -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666;">Sous-total</td>
                        <td style="padding: 8px 0; text-align: right; color: #1a1a1a;">CA$ ${subtotal.toFixed(2)}</td>
                    </tr>
                    ${discount > 0 ? `
                    <tr>
                        <td style="padding: 8px 0; color: #27ae60;">
                            <span style="background: #e8f5e9; padding: 3px 8px; border-radius: 4px; font-size: 12px;">
                                ${promoCode || 'PROMO'}
                            </span>
                            Réduction
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #27ae60; font-weight: 600;">-CA$ ${discount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 8px 0; color: #666;">Livraison</td>
                        <td style="padding: 8px 0; text-align: right; color: #27ae60; font-weight: 600;">GRATUITE</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;">Taxes (TPS + TVQ)</td>
                        <td style="padding: 8px 0; text-align: right; color: #1a1a1a;">CA$ ${taxes.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 15px 0 0; border-top: 2px solid #eee;"></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">Total</td>
                        <td style="padding: 8px 0; text-align: right; font-size: 22px; font-weight: 700; color: #ff4500;">CA$ ${total.toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            <!-- Delivery Info -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%); border-radius: 12px; margin-bottom: 25px;">
                <tr>
                    <td style="padding: 25px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="vertical-align: middle; padding-right: 15px;">
                                    <span style="font-size: 30px;">🚚</span>
                                </td>
                                <td style="vertical-align: middle;">
                                    <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">Livraison estimée</p>
                                    <p style="margin: 5px 0 0; font-size: 18px; font-weight: 700; color: white;">${deliveryRange}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Delivery Address (simplified - no duplicate name) -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px;">Adresse de livraison</h4>
                <p style="margin: 0; color: #666; line-height: 1.6;">
                    ${delivery.address || ''}<br>
                    ${delivery.city || ''}, ${delivery.province || ''} ${delivery.postal || ''}<br>
                    ${delivery.country || 'Canada'}
                </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; padding: 20px 0;">
                <a href="${process.env.BASE_URL || 'http://localhost:3006'}/html/orders.html"
                   style="display: inline-block; background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Voir mes commandes
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 30px; text-align: center; margin-top: 30px;">
            <p style="color: #888; margin: 0 0 15px; font-size: 14px;">Une question? Contactez notre support</p>
            <a href="mailto:support@shekshouse.com" style="color: #ff4500; text-decoration: none; font-weight: 600;">support@shekshouse.com</a>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #666; margin: 0; font-size: 12px;">
                    © ${new Date().getFullYear()} Shek's House. Tous droits réservés.<br>
                    Montréal, Québec, Canada
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    writeStream.on('finish', () => {
        const mailOptions = {
            from: `"Shek's House" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `✅ Commande confirmée #${orderId} - Shek's House`,
            html: emailHtml,
            attachments: [{
                filename: `Facture_${orderId}.pdf`,
                path: invoicePath,
                contentType: 'application/pdf'
            }]
        };

        sendEmail(mailOptions)
            .then(() => {
                fs.unlink(invoicePath, () => {});
                callback(null);
            })
            .catch((error) => {
                fs.unlink(invoicePath, () => {});
                console.error('Error sending invoice email:', error);
                callback(error);
            });
    });

    writeStream.on('error', callback);
}

// Helper function to add business days
function addBusinessDays(date, days) {
    const result = new Date(date);
    let addedDays = 0;
    while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }
    return result;
}

// ===================
// COUPONS API
// ===================

// Get all coupons (Admin only)
app.get('/api/admin/coupons', authenticateAdmin, (req, res) => {
    const query = `
        SELECT c.*,
               u.name as created_by_name, u.surname as created_by_surname
        FROM COUPONS c
        LEFT JOIN USERS u ON c.created_by = u.user_id
        ORDER BY c.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching coupons:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Get single coupon (Admin only)
app.get('/api/admin/coupons/:coupon_id', authenticateAdmin, (req, res) => {
    const { coupon_id } = req.params;

    const query = `
        SELECT c.*,
               (SELECT COUNT(*) FROM COUPON_USAGE WHERE coupon_id = c.coupon_id) as times_used
        FROM COUPONS c
        WHERE c.coupon_id = ?
    `;

    db.query(query, [coupon_id], (err, results) => {
        if (err) {
            console.error('Error fetching coupon:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Coupon not found.' });
        }
        res.json(results[0]);
    });
});

// Create coupon (Admin only)
app.post('/api/admin/coupons', authenticateAdmin, (req, res) => {
    const {
        code, name, description,
        discount_type, discount_value,
        buy_quantity, get_quantity,
        min_purchase_amount, max_discount_amount, min_items_in_cart,
        applies_to, category_id, product_id, department_name,
        new_customers_only,
        max_total_uses, max_uses_per_user,
        start_date, end_date,
        is_active
    } = req.body;

    // Validation
    if (!code || !name || !discount_type || !start_date || !end_date) {
        return res.status(400).json({ error: 'Code, name, discount type, start date and end date are required.' });
    }

    // Validate code format (alphanumeric, uppercase, no spaces)
    const cleanCode = code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
        return res.status(400).json({ error: 'Code must be alphanumeric without spaces.' });
    }

    const query = `
        INSERT INTO COUPONS (
            code, name, description,
            discount_type, discount_value,
            buy_quantity, get_quantity,
            min_purchase_amount, max_discount_amount, min_items_in_cart,
            applies_to, category_id, product_id, department_name,
            new_customers_only,
            max_total_uses, max_uses_per_user,
            start_date, end_date,
            is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        cleanCode, name, description || null,
        discount_type, discount_value || 0,
        buy_quantity || null, get_quantity || null,
        min_purchase_amount || 0, max_discount_amount || null, min_items_in_cart || 0,
        applies_to || 'all', category_id || null, product_id || null, department_name || null,
        new_customers_only || false,
        max_total_uses || null, max_uses_per_user || 1,
        start_date, end_date,
        is_active !== false, req.user.user_id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error creating coupon:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A coupon with this code already exists.' });
            }
            return res.status(500).json({ error: 'Database error.' });
        }

        // Send email notification to all users (non-blocking)
        sendCouponNotificationEmails({
            code: cleanCode,
            name,
            description,
            discount_type,
            discount_value,
            min_purchase_amount,
            end_date
        });

        res.status(201).json({ success: true, coupon_id: result.insertId, message: 'Coupon created successfully.' });
    });
});

// Function to send coupon notification emails to all users
function sendCouponNotificationEmails(couponData) {
    // Get all users with valid emails
    db.query('SELECT email, name FROM USERS WHERE email IS NOT NULL AND email != ""', (err, users) => {
        if (err) {
            console.error('Error fetching users for coupon notification:', err);
            return;
        }

        if (users.length === 0) return;

        // Format discount text
        let discountText = '';
        switch (couponData.discount_type) {
            case 'percentage':
                discountText = `${couponData.discount_value}% de rabais`;
                break;
            case 'fixed_amount':
                discountText = `${couponData.discount_value}$ de reduction`;
                break;
            case 'buy_x_get_y':
                discountText = 'Offre speciale achat multiple';
                break;
            case 'free_shipping':
                discountText = 'Livraison gratuite';
                break;
            default:
                discountText = 'Rabais exclusif';
        }

        // Format expiry date
        const expiryDate = new Date(couponData.end_date);
        const formattedExpiry = expiryDate.toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send emails to each user
        users.forEach(user => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `🎉 Nouveau code promo disponible: ${couponData.code}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #ff4500, #ff6b35); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎁 Offre Exclusive!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6;">Bonjour ${user.name || 'cher client'},</p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6;">Nous avons une offre speciale pour vous!</p>

                            <div style="background: linear-gradient(135deg, #fff5f0, #fff0e6); border: 2px dashed #ff4500; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">Votre code promo:</p>
                                <div style="background: #ff4500; color: #ffffff; font-size: 28px; font-weight: bold; padding: 15px 30px; border-radius: 8px; display: inline-block; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                                    ${couponData.code}
                                </div>
                                <p style="color: #27ae60; font-size: 20px; font-weight: bold; margin: 15px 0 5px 0;">${discountText}</p>
                                <p style="color: #333333; font-size: 16px; margin: 5px 0;">${couponData.name}</p>
                                ${couponData.description ? `<p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">${couponData.description}</p>` : ''}
                            </div>

                            ${couponData.min_purchase_amount > 0 ? `
                            <p style="color: #666666; font-size: 14px; text-align: center;">
                                <i>* Valide pour les achats de ${couponData.min_purchase_amount}$ et plus</i>
                            </p>
                            ` : ''}

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3006'}"
                                   style="background: linear-gradient(135deg, #ff4500, #ff6b35); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                    Magasiner maintenant
                                </a>
                            </div>

                            <p style="color: #999999; font-size: 13px; text-align: center; margin-top: 20px;">
                                ⏰ Offre valide jusqu'au ${formattedExpiry}
                            </p>
                        </div>
                        <div style="background: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                Shek's House - Votre boutique en ligne<br>
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3006'}" style="color: #ff4500;">www.shekshouse.com</a>
                            </p>
                        </div>
                    </div>
                `,
            };

            sendEmail(mailOptions).catch(err => {
                console.error(`Error sending coupon email to ${user.email}:`, err);
            });
        });

        console.log(`Coupon notification emails sent to ${users.length} users.`);
    });
}

// Update coupon (Admin only)
app.put('/api/admin/coupons/:coupon_id', authenticateAdmin, (req, res) => {
    const { coupon_id } = req.params;
    const {
        code, name, description,
        discount_type, discount_value,
        buy_quantity, get_quantity,
        min_purchase_amount, max_discount_amount, min_items_in_cart,
        applies_to, category_id, product_id, department_name,
        new_customers_only,
        max_total_uses, max_uses_per_user,
        start_date, end_date,
        is_active
    } = req.body;

    if (!code || !name || !discount_type || !start_date || !end_date) {
        return res.status(400).json({ error: 'Code, name, discount type, start date and end date are required.' });
    }

    const cleanCode = code.toUpperCase().replace(/\s/g, '');

    const query = `
        UPDATE COUPONS SET
            code = ?, name = ?, description = ?,
            discount_type = ?, discount_value = ?,
            buy_quantity = ?, get_quantity = ?,
            min_purchase_amount = ?, max_discount_amount = ?, min_items_in_cart = ?,
            applies_to = ?, category_id = ?, product_id = ?, department_name = ?,
            new_customers_only = ?,
            max_total_uses = ?, max_uses_per_user = ?,
            start_date = ?, end_date = ?,
            is_active = ?
        WHERE coupon_id = ?
    `;

    const values = [
        cleanCode, name, description || null,
        discount_type, discount_value || 0,
        buy_quantity || null, get_quantity || null,
        min_purchase_amount || 0, max_discount_amount || null, min_items_in_cart || 0,
        applies_to || 'all', category_id || null, product_id || null, department_name || null,
        new_customers_only || false,
        max_total_uses || null, max_uses_per_user || 1,
        start_date, end_date,
        is_active !== false,
        coupon_id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating coupon:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A coupon with this code already exists.' });
            }
            return res.status(500).json({ error: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Coupon not found.' });
        }
        res.json({ success: true, message: 'Coupon updated successfully.' });
    });
});

// Delete coupon (Admin only)
app.delete('/api/admin/coupons/:coupon_id', authenticateAdmin, (req, res) => {
    const { coupon_id } = req.params;

    db.query('DELETE FROM COUPONS WHERE coupon_id = ?', [coupon_id], (err, result) => {
        if (err) {
            console.error('Error deleting coupon:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Coupon not found.' });
        }
        res.json({ success: true, message: 'Coupon deleted successfully.' });
    });
});

// Get coupon usage statistics (Admin only)
app.get('/api/admin/coupons/:coupon_id/usage', authenticateAdmin, (req, res) => {
    const { coupon_id } = req.params;

    const query = `
        SELECT cu.*, u.name, u.surname, u.email
        FROM COUPON_USAGE cu
        JOIN USERS u ON cu.user_id = u.user_id
        WHERE cu.coupon_id = ?
        ORDER BY cu.used_at DESC
        LIMIT 100
    `;

    db.query(query, [coupon_id], (err, results) => {
        if (err) {
            console.error('Error fetching coupon usage:', err);
            return res.status(500).json({ error: 'Database error.' });
        }
        res.json(results);
    });
});

// Get available coupons for customers
app.get('/api/coupons/available', authenticateToken, (req, res) => {
    const user_id = req.user.user_id;

    // Get all active coupons that haven't reached their limits
    const query = `
        SELECT
            c.coupon_id,
            c.code,
            c.name,
            c.description,
            c.discount_type,
            c.discount_value,
            c.buy_quantity,
            c.get_quantity,
            c.min_purchase_amount,
            c.max_discount_amount,
            c.min_items_in_cart,
            c.applies_to,
            c.category_id,
            c.department_name,
            c.new_customers_only,
            c.max_uses_per_user,
            c.end_date,
            (SELECT COUNT(*) FROM COUPON_USAGE WHERE coupon_id = c.coupon_id AND user_id = ?) as user_usage_count
        FROM COUPONS c
        WHERE c.is_active = TRUE
        AND c.start_date <= NOW()
        AND c.end_date >= NOW()
        AND (c.max_total_uses IS NULL OR c.current_uses < c.max_total_uses)
        ORDER BY c.discount_value DESC, c.created_at DESC
    `;

    db.query(query, [user_id], async (err, coupons) => {
        if (err) {
            console.error('Error fetching available coupons:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        // Check if user is new customer (for new_customers_only coupons)
        db.query('SELECT COUNT(*) as count FROM ORDERS WHERE user_id = ?', [user_id], (err, orderResults) => {
            if (err) {
                return res.status(500).json({ error: 'Database error.' });
            }

            const isNewCustomer = orderResults[0].count === 0;

            // Filter coupons based on user eligibility
            const availableCoupons = coupons.filter(coupon => {
                // Check if user has reached their personal usage limit
                if (coupon.user_usage_count >= coupon.max_uses_per_user) {
                    return false;
                }

                // Check new customers only restriction
                if (coupon.new_customers_only && !isNewCustomer) {
                    return false;
                }

                return true;
            }).map(coupon => ({
                coupon_id: coupon.coupon_id,
                code: coupon.code,
                name: coupon.name,
                description: coupon.description,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                buy_quantity: coupon.buy_quantity,
                get_quantity: coupon.get_quantity,
                min_purchase_amount: coupon.min_purchase_amount,
                max_discount_amount: coupon.max_discount_amount,
                min_items_in_cart: coupon.min_items_in_cart,
                applies_to: coupon.applies_to,
                category_name: null, // CATEGORIES table not available
                department_name: coupon.department_name,
                end_date: coupon.end_date,
                already_used: coupon.user_usage_count > 0,
                uses_remaining: coupon.max_uses_per_user - coupon.user_usage_count
            }));

            res.json(availableCoupons);
        });
    });
});

// Validate coupon code (for customers)
app.post('/api/coupons/validate', authenticateToken, (req, res) => {
    const { code, cart_total, cart_items } = req.body;
    const user_id = req.user.user_id;

    if (!code) {
        return res.status(400).json({ valid: false, error: 'Coupon code is required.' });
    }

    const cleanCode = code.toUpperCase().replace(/\s/g, '');

    // Get coupon details
    const couponQuery = `
        SELECT * FROM COUPONS
        WHERE code = ?
        AND is_active = TRUE
        AND start_date <= NOW()
        AND end_date >= NOW()
    `;

    db.query(couponQuery, [cleanCode], (err, coupons) => {
        if (err) {
            console.error('Error validating coupon:', err);
            return res.status(500).json({ valid: false, error: 'Database error.' });
        }

        if (coupons.length === 0) {
            return res.json({ valid: false, error: 'Code promo invalide ou expire.' });
        }

        const coupon = coupons[0];

        // Check usage limits
        if (coupon.max_total_uses !== null && coupon.current_uses >= coupon.max_total_uses) {
            return res.json({ valid: false, error: 'Ce code promo a atteint sa limite d\'utilisation.' });
        }

        // Check per-user usage
        db.query(
            'SELECT COUNT(*) as count FROM COUPON_USAGE WHERE coupon_id = ? AND user_id = ?',
            [coupon.coupon_id, user_id],
            (err, usageResults) => {
                if (err) {
                    return res.status(500).json({ valid: false, error: 'Database error.' });
                }

                if (usageResults[0].count >= coupon.max_uses_per_user) {
                    const maxUses = coupon.max_uses_per_user;
                    const usedTimes = usageResults[0].count;
                    const errorMsg = maxUses === 1
                        ? 'Vous avez deja utilise ce code promo.'
                        : `Vous avez atteint la limite d'utilisation de ce code (${usedTimes}/${maxUses}).`;
                    return res.json({ valid: false, error: errorMsg });
                }

                // Check new customers only
                if (coupon.new_customers_only) {
                    db.query(
                        'SELECT COUNT(*) as count FROM ORDERS WHERE user_id = ?',
                        [user_id],
                        (err, orderResults) => {
                            if (err) {
                                return res.status(500).json({ valid: false, error: 'Database error.' });
                            }

                            if (orderResults[0].count > 0) {
                                return res.json({ valid: false, error: 'Ce code promo est reserve aux nouveaux clients.' });
                            }

                            validateCouponConditions(coupon, cart_total, cart_items, res);
                        }
                    );
                } else {
                    validateCouponConditions(coupon, cart_total, cart_items, res);
                }
            }
        );
    });
});

// Helper function to validate coupon conditions
function validateCouponConditions(coupon, cart_total, cart_items, res) {
    const total = parseFloat(cart_total) || 0;
    const itemCount = parseInt(cart_items) || 0;
    const minPurchase = parseFloat(coupon.min_purchase_amount) || 0;
    const minItems = parseInt(coupon.min_items_in_cart) || 0;
    const discountValue = parseFloat(coupon.discount_value) || 0;
    const maxDiscount = coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : null;

    // Check minimum purchase
    if (total < minPurchase) {
        return res.json({
            valid: false,
            error: `Montant minimum requis: ${minPurchase.toFixed(2)} CA$`
        });
    }

    // Check minimum items
    if (itemCount < minItems) {
        return res.json({
            valid: false,
            error: `Minimum ${minItems} articles requis dans le panier.`
        });
    }

    // Calculate discount
    let discount = 0;
    let discountDescription = '';

    switch (coupon.discount_type) {
        case 'percentage':
            discount = total * (discountValue / 100);
            if (maxDiscount && discount > maxDiscount) {
                discount = maxDiscount;
            }
            discountDescription = `${discountValue}% de rabais`;
            break;

        case 'fixed_amount':
            discount = discountValue;
            if (discount > total) discount = total;
            discountDescription = `${discountValue.toFixed(2)} CA$ de rabais`;
            break;

        case 'buy_x_get_y':
            // This needs more complex calculation based on cart items
            discountDescription = `Achetez ${coupon.buy_quantity || 0}, obtenez ${coupon.get_quantity || 0} gratuit(s)`;
            break;

        case 'free_shipping':
            discountDescription = 'Livraison gratuite';
            break;
    }

    res.json({
        valid: true,
        coupon: {
            coupon_id: coupon.coupon_id,
            code: coupon.code,
            name: coupon.name,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount_amount: discount,
            description: discountDescription,
            applies_to: coupon.applies_to,
            category_id: coupon.category_id,
            product_id: coupon.product_id,
            department_name: coupon.department_name
        }
    });
}

// Apply coupon to order (record usage)
app.post('/api/coupons/apply', authenticateToken, (req, res) => {
    const { coupon_id, order_id, original_amount, discount_applied, final_amount } = req.body;
    const user_id = req.user.user_id;

    if (!coupon_id) {
        return res.status(400).json({ error: 'Coupon ID is required.' });
    }

    // Record usage
    const usageQuery = `
        INSERT INTO COUPON_USAGE (coupon_id, user_id, order_id, original_amount, discount_applied, final_amount)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(usageQuery, [coupon_id, user_id, order_id, original_amount, discount_applied, final_amount], (err) => {
        if (err) {
            console.error('Error recording coupon usage:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        // Increment usage counter
        db.query('UPDATE COUPONS SET current_uses = current_uses + 1 WHERE coupon_id = ?', [coupon_id], (err) => {
            if (err) {
                console.error('Error updating coupon usage count:', err);
            }
        });

        res.json({ success: true, message: 'Coupon applied successfully.' });
    });
});

// Get categories for coupon form (Admin)
// Note: Returns empty array if CATEGORIES table doesn't exist
app.get('/api/admin/coupons-categories', authenticateAdmin, (req, res) => {
    db.query('SELECT category_id, category_name FROM CATEGORIES ORDER BY category_name', (err, results) => {
        if (err) {
            // Table doesn't exist, return empty array
            console.log('CATEGORIES table not available');
            return res.json([]);
        }
        res.json(results);
    });
});

// Get departments for coupon form (Admin)
// Returns hardcoded departments for the clothing store
app.get('/api/admin/coupons-departments', authenticateAdmin, (req, res) => {
    const departments = [
        { department_id: 1, department_name: 'Femme' },
        { department_id: 2, department_name: 'Homme' },
        { department_id: 3, department_name: 'Enfant' },
        { department_id: 4, department_name: 'Accessoires' }
    ];
    res.json(departments);
});

// ===================
// ERROR HANDLING
// ===================

app.use((err, req, res, next) => {
    console.error('Server error:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: 'File upload error.' });
    }

    res.status(500).json({ error: 'Internal server error.' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// ===================
// START SERVER
// ===================

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
