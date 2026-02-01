// Script to create default admin account
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sheks_house'
});

const adminUser = {
    name: 'Admin',
    surname: 'Shek',
    email: 'admin@shekshouse.com',
    password: 'Admin123!',
    phone: '+1 514-000-0000',
    address: 'Shek\'s House HQ, Montreal, QC'
};

async function seedAdmin() {
    try {
        // Connect to database
        await new Promise((resolve, reject) => {
            db.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('Connected to database.');

        // Check if admin already exists
        const [rows] = await db.promise().query(
            'SELECT * FROM USERS WHERE email = ?',
            [adminUser.email]
        );

        if (rows.length > 0) {
            console.log('Admin account already exists. Resetting password and admin status...');
            const hashedPassword = await bcrypt.hash(adminUser.password, 10);
            await db.promise().query(
                'UPDATE USERS SET is_admin = 1, password = ? WHERE email = ?',
                [hashedPassword, adminUser.email]
            );
            console.log('Admin password reset and status confirmed.');
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash(adminUser.password, 10);

            // Insert admin user
            await db.promise().query(
                'INSERT INTO USERS (name, surname, email, password, phone, postal_address, is_admin) VALUES (?, ?, ?, ?, ?, ?, 1)',
                [adminUser.name, adminUser.surname, adminUser.email, hashedPassword, adminUser.phone, adminUser.address]
            );

            console.log('Admin account created successfully!');
        }

        console.log('\n========================================');
        console.log('ADMIN CREDENTIALS:');
        console.log('Email: admin@shekshouse.com');
        console.log('Password: Admin123!');
        console.log('========================================');
        console.log('\nIMPORTANT: Change this password after first login!');

        db.end();
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        db.end();
        process.exit(1);
    }
}

seedAdmin();
