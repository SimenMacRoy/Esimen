// Test helper utilities
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const BASE_URL = `http://localhost:${process.env.PORT || 3006}`;

// Create database connection for tests
async function getTestDb() {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
}

// Generate test JWT token
function generateTestToken(userData) {
    return jwt.sign(userData, JWT_SECRET, { expiresIn: '1h' });
}

// Generate admin token
function generateAdminToken() {
    return generateTestToken({
        user_id: 2, // Admin Shek
        email: 'admin@shekshouse.com',
        is_admin: 1
    });
}

// Generate regular user token
function generateUserToken() {
    return generateTestToken({
        user_id: 3, // Jean Dupont
        email: 'jean.dupont@email.com',
        is_admin: 0
    });
}

// Test data
const testData = {
    adminUser: {
        email: 'admin@shekshouse.com',
        password: 'password123'
    },
    regularUser: {
        email: 'jean.dupont@email.com',
        password: 'password123'
    },
    newUser: {
        name: 'Test',
        surname: 'User',
        phone: '514-555-9999',
        email: `test.user.${Date.now()}@email.com`,
        password: 'testpassword123',
        address: '123 Test Street, Montreal, H1A 1A1'
    },
    newProduct: {
        name: 'Test Product',
        description: 'A product for testing',
        stock: 10,
        price: 99.99,
        department_id: 1,
        category_id: 1
    }
};

module.exports = {
    getTestDb,
    generateTestToken,
    generateAdminToken,
    generateUserToken,
    testData,
    BASE_URL,
    JWT_SECRET
};
