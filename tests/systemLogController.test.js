const request = require("supertest");
const app = require("../index"); // Adjust path to your main app file
const SystemLog = require("../models/SystemLogs");
const User = require("../models/User"); // Needed for getting an auth token
const mongoose = require("mongoose");

let authToken;

// --- Test Setup ---
describe("GET /api/admin/logs", () => {
    // Before any tests run, we'll clean the DB, create a test admin user,
    // log them in to get a token, and seed the database with test logs.
    beforeAll(async () => {
        // 1. Clean previous test data
        await SystemLog.deleteMany({});
        await User.deleteMany({ email: "log.admin@test.com" });

        // 2. Create and log in an admin user to get a valid token
        const adminUser = {
            fname: "Log",
            lname: "Admin",
            email: "log.admin@test.com",
            phone: "0000000000",
            password: "password123",
            role: "admin", // Ensure the user has the admin role
        };
        // We'll use the User model directly to create the admin
        await new User(adminUser).save();
        
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "binodd1@gmail.com", password: "Binod@123" });
        
        authToken = loginRes.body.token; // Save the token for all tests in this block

        // 3. Seed the database with a diverse set of logs
        const logsToCreate = [
            // Create more logs than the default limit of 15 to test pagination
            { level: 'info', message: 'User JohnDoe logged in successfully.' },
            { level: 'info', message: 'User JaneDoe updated her profile.' },
            { level: 'warn', message: 'API response time is slow for endpoint /api/shops.' },
            { level: 'error', message: 'Failed to connect to payment gateway.' },
            { level: 'info', message: 'New shop "My Store" was created.' },
            { level: 'error', message: 'Database error: Duplicate key violation.' },
            { level: 'info', message: 'User JohnDoe created a new customer.' },
            // Add more logs to reach a total of 20
            ...Array.from({ length: 13 }, (_, i) => ({
                level: 'info',
                message: `Standard system event number ${i+1}.`
            }))
        ];
        await SystemLog.insertMany(logsToCreate);
    });

    // After all tests are done, clean up the user
    afterAll(async () => {
        await User.deleteMany({ email: "log.admin@test.com" });
        await SystemLog.deleteMany({});
        await mongoose.connection.close();
    });


    // --- Test Cases ---

    test("should fetch the first page of logs with default limit", async () => {
        const res = await request(app)
            .get("/api/admin/logs")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(15); // Default limit
        expect(res.body.pagination.currentPage).toBe(1);
        expect(res.body.pagination.totalRecords).toBe(20);
        expect(res.body.pagination.totalPages).toBe(2);
    });

    test("should fetch logs filtered by level='error'", async () => {
        const res = await request(app)
            .get("/api/admin/logs?level=error")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(2); // We created 2 error logs
        // Verify that every returned log is actually an error log
        res.body.data.forEach(log => {
            expect(log.level).toBe('error');
        });
        expect(res.body.pagination.totalRecords).toBe(2);
    });

    test("should fetch logs using the search parameter", async () => {
        const res = await request(app)
            .get("/api/admin/logs?search=JohnDoe")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(2); // We created 2 logs with "JohnDoe"
        expect(res.body.data[0].message).toContain("JohnDoe");
        expect(res.body.data[1].message).toContain("JohnDoe");
    });
    
    test("should fetch logs with combined level and search filters", async () => {
        const res = await request(app)
            .get("/api/admin/logs?level=warn&search=API")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].message).toContain('API response time is slow');
    });

    test("should respect pagination parameters (page and limit)", async () => {
        const res = await request(app)
            .get("/api/admin/logs?page=2&limit=15")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(5); // 20 total, page 1 has 15, so page 2 has 5
        expect(res.body.pagination.currentPage).toBe(2);
        expect(res.body.pagination.pageSize).toBe(15);
    });
    
    test("should return an empty array when no logs match the filter", async () => {
        const res = await request(app)
            .get("/api/admin/logs?search=NonExistentKeyword")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(0);
        expect(res.body.pagination.totalRecords).toBe(0);
    });
    
    test("should fail to fetch logs without an authentication token", async () => {
        const res = await request(app).get("/api/admin/logs");

        expect(res.statusCode).toBe(401); // Assuming auth middleware returns 401
        expect(res.body.success).toBe(false);
    });
});