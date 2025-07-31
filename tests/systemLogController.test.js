const request = require("supertest");
const app = require("../app");
const SystemLog = require("../models/SystemLogs");
const User = require("../models/User");

describe("GET /api/admin/logs", () => {
    let adminToken;
    const adminData = {
        fname: "Log",
        lname: "Admin",
        email: "log.admin@test.com",
        phone: "9876543211", 
        password: "Password123!",
    };

    afterEach(async () => {
        await User.deleteMany({});
        await SystemLog.deleteMany({});
    });

    beforeEach(async () => {
        await request(app).post("/api/auth/register").send(adminData);
        await User.updateOne({ email: adminData.email }, { $set: { role: 'admin' } });
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: adminData.email, password: adminData.password });
        
        adminToken = loginRes.body.token;
        expect(adminToken).toBeDefined();
        const logsToCreate = [
            { level: 'info', message: 'User JohnDoe logged in successfully.' },
            { level: 'error', message: 'Failed to connect to payment gateway.' },
            ...Array.from({ length: 18 }, (_, i) => ({ level: 'info', message: `Event ${i}` }))
        ];
        await SystemLog.insertMany(logsToCreate);
    });

    test("should fetch the first page of logs with default limit", async () => {
        const res = await request(app)
            .get("/api/admin/logs")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(15); 
        expect(res.body.pagination.totalRecords).toBe(20);
    });

    test("should fetch logs filtered by level='error'", async () => {
        const res = await request(app)
            .get("/api/admin/logs?level=error")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].level).toBe('error');
    });

    test("should fail to fetch logs without an authentication token", async () => {
        const res = await request(app).get("/api/admin/logs");
        expect(res.statusCode).toBe(401);
    });
});