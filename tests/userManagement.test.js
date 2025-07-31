const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const mongoose = require("mongoose");

describe("Admin User Management Endpoints", () => {
    let adminToken;

    afterEach(async () => {
        await User.deleteMany({});
    });

    const adminData = {
        fname: "Test",
        lname: "Admin",
        email: "test.admin@gmail.com",
        phone: "9899999999",
        password: "TestAdmin@123",
    };

    const newUserPayload = {
        fname: "New",
        lname: "RegularUser",
        email: "user@gmail.com",
        phone: "9841128100",
        password: "Password@123",
    };

    beforeEach(async () => {
        await request(app).post("/api/auth/register").send(adminData);
        await User.updateOne({ email: adminData.email }, { $set: { role: 'admin' } });
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: adminData.email, password: adminData.password });
        adminToken = loginRes.body.token;
        expect(loginRes.body.data.user.role).toBe('admin');
    });

    test("POST /api/admin/users › should allow an admin to create a new user", async () => {
        const res = await request(app)
            .post("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(newUserPayload);

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("New user added.");
        const userInDb = await User.findOne({ email: newUserPayload.email });
        expect(userInDb).not.toBeNull();
    });

    test("POST /api/admin/users › should return 409 if email already exists", async () => {
        await request(app)
            .post("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(newUserPayload);
        const res = await request(app)
            .post("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(newUserPayload);  
        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe("This email is already used.");
    });

    test("GET /api/admin/users/:id › should get a single user by ID", async () => {
        await request(app)
            .post("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(newUserPayload);
        
        const createdUser = await User.findOne({ email: newUserPayload.email });
        expect(createdUser).not.toBeNull(); 

        const res = await request(app)
            .get(`/api/admin/users/${createdUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(createdUser._id.toString());
    });

    test("GET /api/admin/users/:id › should return 404 if user ID does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/admin/users/${nonExistentId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(404);
    });

   
    
    test("PUT /api/admin/users/:id › should update a user's details", async () => {
        await request(app)
            .post("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(newUserPayload);
        
        const createdUser = await User.findOne({ email: newUserPayload.email });
        expect(createdUser).not.toBeNull(); 
        
        const updatePayload = { fname: "UpdatedFirstName", role: "admin" };
        const res = await request(app)
            .put(`/api/admin/users/${createdUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(updatePayload);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.fname).toBe("UpdatedFirstName");
        expect(res.body.data.role).toBe("admin");
    });
});