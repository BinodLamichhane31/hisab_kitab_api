const request = require("supertest");
const app = require("../index"); 
const SystemLog = require("../models/SystemLogs");
const User = require("../models/User"); 
const mongoose = require("mongoose");

let authToken;

describe("GET /api/admin/logs", () => {

    beforeAll(async () => {
        
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "test_admin@gmail.com", password: "TestAdmin@123" });
        
        authToken = loginRes.body.token; 
        const logsToCreate = [
            { level: 'info', message: 'User JohnDoe logged in successfully.' },
            { level: 'info', message: 'User JaneDoe updated her profile.' },
            { level: 'warn', message: 'API response time is slow for endpoint /api/shops.' },
            { level: 'error', message: 'Failed to connect to payment gateway.' },
            { level: 'info', message: 'New shop "My Store" was created.' },
            { level: 'error', message: 'Database error: Duplicate key violation.' },
            { level: 'info', message: 'User JohnDoe created a new customer.' },
            ...Array.from({ length: 13 }, (_, i) => ({
                level: 'info',
                message: `Standard system event number ${i+1}.`
            }))
        ];
        await SystemLog.insertMany(logsToCreate);
    });

    afterAll(async () => {
        await User.deleteMany({ email: "log.admin@test.com" });
        await SystemLog.deleteMany({});
        await mongoose.connection.close();
    });



    test("should fetch the first page of logs with default limit", async () => {
        const res = await request(app)
            .get("/api/admin/logs")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(15); 
        expect(res.body.pagination.currentPage).toBe(1);
        expect(res.body.pagination.totalRecords).toBe(20);
        expect(res.body.pagination.totalPages).toBe(2);
    });

    test("should fetch logs filtered by level='error'", async () => {
        const res = await request(app)
            .get("/api/admin/logs?level=error")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(2); 
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
        expect(res.body.data.length).toBe(2); 
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
        expect(res.body.data.length).toBe(5); 
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

        expect(res.statusCode).toBe(401); 
        expect(res.body.success).toBe(false);
    });
});