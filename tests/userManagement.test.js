const request = require("supertest");
const app = require("../index"); // Make sure this points to your configured Express app
const User = require("../models/User");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

jest.mock("../utils/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

let adminToken;
let regularUserId;
let user;


describe("Admin User Management Endpoints", () => {
    beforeAll(async () => {
        
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "test_admin@gmail.com", password: "TestAdmin@123" });
        adminToken = loginRes.body.token;
        user = loginRes.body.data.user
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/admin/users", () => {
        const newUserPayload = {
            fname: "New",
            lname: "User",
            email: "user@gmail.com",
            phone: "9841128100",
            password: "Password@123",
        };

        beforeEach(async () => {
            await User.deleteOne({ email: newUserPayload.email });
        });

        test("should allow an admin to create a new user", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(newUserPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("New user added.");
            expect(logger.info).toHaveBeenCalled();
        });

        test("should return 409 if email is already used", async () => {
            await request(app).post("/api/admin/users").set("Authorization", `Bearer ${adminToken}`).send(newUserPayload);
            const res = await request(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(newUserPayload);

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe("This email is already used.");
        });

        test("should return 401 if not authenticated as admin", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .send(newUserPayload);
            expect(res.statusCode).toBe(401);
        });
    });

    describe("GET /api/admin/users", () => {
        
        test("should filter users by search query", async () => {
            const res = await request(app)
                .get("/api/admin/users?search=Test")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].fname).toBe("Test");
        });
    });

    describe("GET /api/admin/users/:id", () => {
        test("should get a single user by ID", async () => {
            const res = await request(app)
                .get(`/api/admin/users/${user._id}`)
                .set("Authorization", `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe(user._id);
            expect(res.body.data.email).toBe(user.email);
        });

        test("should return 404 if user ID does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/users/${nonExistentId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("User not found.");
        });
    });
    
    describe("PUT /api/admin/users/:id", () => {
        test("should update a user's details", async () => {
            const updatePayload = {
                fname: "Test",
                role: "admin"
            };

            const res = await request(app)
                .put(`/api/admin/users/${user._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.fname).toBe("Test");
            expect(res.body.data.role).toBe("admin");
        });
    });

});