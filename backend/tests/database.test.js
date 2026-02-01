// Database Integrity Tests
const { getTestDb } = require('./testHelper');

describe('Database Integrity', () => {
    let db;

    beforeAll(async () => {
        db = await getTestDb();
    });

    afterAll(async () => {
        if (db) await db.end();
    });

    describe('Tables Existence', () => {
        const tables = ['DEPARTMENT', 'CATEGORY', 'DEPARTMENT_CATEGORY', 'PRODUCTS', 'PRODUCT_IMAGES', 'USERS', 'BASKET'];

        tables.forEach(table => {
            it(`should have ${table} table`, async () => {
                const [rows] = await db.query(`SHOW TABLES LIKE '${table}'`);
                expect(rows.length).toBe(1);
            });
        });
    });

    describe('Data Integrity', () => {
        it('all products should have valid department reference', async () => {
            const [rows] = await db.query(`
                SELECT p.product_id, p.name
                FROM PRODUCTS p
                LEFT JOIN DEPARTMENT d ON p.department_id = d.department_id
                WHERE d.department_id IS NULL
            `);
            expect(rows.length).toBe(0);
        });

        it('all products should have valid category reference', async () => {
            const [rows] = await db.query(`
                SELECT p.product_id, p.name
                FROM PRODUCTS p
                LEFT JOIN CATEGORY c ON p.category_id = c.category_id
                WHERE c.category_id IS NULL
            `);
            expect(rows.length).toBe(0);
        });

        it('all product images should reference valid products', async () => {
            const [rows] = await db.query(`
                SELECT pi.image_id
                FROM PRODUCT_IMAGES pi
                LEFT JOIN PRODUCTS p ON pi.product_id = p.product_id
                WHERE p.product_id IS NULL
            `);
            expect(rows.length).toBe(0);
        });

        it('all basket items should reference valid products', async () => {
            const [rows] = await db.query(`
                SELECT b.user_id, b.product_id
                FROM BASKET b
                LEFT JOIN PRODUCTS p ON b.product_id = p.product_id
                WHERE p.product_id IS NULL
            `);
            expect(rows.length).toBe(0);
        });

        it('all basket items should reference valid users', async () => {
            const [rows] = await db.query(`
                SELECT b.user_id, b.product_id
                FROM BASKET b
                LEFT JOIN USERS u ON b.user_id = u.user_id
                WHERE u.user_id IS NULL
            `);
            expect(rows.length).toBe(0);
        });
    });

    describe('Data Statistics', () => {
        it('should report database statistics', async () => {
            const stats = {};

            const tables = ['DEPARTMENT', 'CATEGORY', 'PRODUCTS', 'PRODUCT_IMAGES', 'USERS'];
            for (const table of tables) {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                stats[table] = rows[0].count;
            }

            console.log('\n📊 Database Statistics:');
            console.log('------------------------');
            Object.entries(stats).forEach(([table, count]) => {
                console.log(`   ${table}: ${count} records`);
            });
            console.log('------------------------\n');

            expect(stats.DEPARTMENT).toBe(4);
            expect(stats.PRODUCTS).toBeGreaterThan(20);
            expect(stats.USERS).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Price Validation', () => {
        it('all products should have positive prices', async () => {
            const [rows] = await db.query('SELECT product_id, name, price FROM PRODUCTS WHERE price <= 0');
            expect(rows.length).toBe(0);
        });

        it('all products should have non-negative stock', async () => {
            const [rows] = await db.query('SELECT product_id, name, stock FROM PRODUCTS WHERE stock < 0');
            expect(rows.length).toBe(0);
        });
    });

    describe('Email Validation', () => {
        it('all users should have valid email format', async () => {
            const [rows] = await db.query("SELECT user_id, email FROM USERS WHERE email NOT LIKE '%@%.%'");
            expect(rows.length).toBe(0);
        });

        it('all emails should be unique', async () => {
            const [rows] = await db.query(`
                SELECT email, COUNT(*) as count
                FROM USERS
                GROUP BY email
                HAVING count > 1
            `);
            expect(rows.length).toBe(0);
        });
    });
});
