const request = require("supertest");
const app = require("../index"); 
const User = require("../models/User");
const Shop = require("../models/Shop");
const mongoose = require("mongoose");

const testUser = {
    fname: "Test",
    lname: "User",
    email: "testuser@gmail.com",
    phone: "9841000000",
    password: "Password@123",
};

let authToken;
let userId;
let shopId1;
let shopId2;

afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    if (shopId1) await Shop.findByIdAndDelete(shopId1);
    if (shopId2) await Shop.findByIdAndDelete(shopId2);
    await mongoose.disconnect();
});

describe("POST /api/auth/register", () => {
    beforeAll(async () => {
        await User.deleteOne({ email: testUser.email });
    });

    test("should fail registration if required fields are missing", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                fname: "Test",
                email: "testuser@gmail.com", 
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain("Last name is required");
    });

    test("should register a new user successfully", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("User Registered Successfully");
    });

    test("should fail registration if email already exists", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Email already exists.");
    });
});


//User Login 
describe("POST /api/auth/login", () => {
    test("should fail to login with non-existent email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "nouser@gmail.com",
                password: "Password@123",
            });

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("User does not exist.");
    });

    test("should fail to login with an incorrect password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testUser.email,
                password: "wrongpassword",
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid Password");
    });

    test("should login the user successfully and return a token", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testUser.email,
                password: testUser.password,
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Login successful.");
        expect(res.body.token).toEqual(expect.any(String));

        authToken = res.body.token;
        userId = res.body.data.user._id;
    });

    test("should prevent login if user account is disabled", async () => {
        await User.updateOne({ email: testUser.email }, { $set: { isActive: false } });

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: testUser.email,
                password: testUser.password,
            });

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Your account has been disabled. Please contact support.");

        await User.updateOne({ email: testUser.email }, { $set: { isActive: true } });
    });
});


// Authenticated Routes 
describe("Authenticated /api/auth/* Endpoints", () => {
    
    describe("GET /api/auth/profile", () => {
        test("should fail to get profile without a token", async () => {
            const res = await request(app).get("/api/auth/profile");
            expect(res.statusCode).toBe(401); 
        });

        test("should get the current user's profile with a valid token", async () => {
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(testUser.email);
        });
    });

    describe("PUT /api/auth/profile", () => {
        test("should update the user's profile successfully", async () => {
            const updatedData = { fname: "Updated", lname: "Name" };
            const res = await request(app)
                .put("/api/auth/profile")
                .set("Authorization", `Bearer ${authToken}`)
                .send(updatedData);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.fname).toBe("Updated");
            expect(res.body.data.lname).toBe("Name");
        });
    });

    // Password Management
    describe("PUT /api/auth/change-password", () => {
        test("should fail to change password with an incorrect old password", async () => {
            const res = await request(app)
                .put("/api/auth/change-password")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    oldPassword: "wrongoldpassword",
                    newPassword: "newPassword@123",
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Old password is incorrect.");
        });

        test("should change the password successfully", async () => {
            const res = await request(app)
                .put("/api/auth/change-password")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    oldPassword: testUser.password,
                    newPassword: "newPassword@123",
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Password changed successfully.");
            
            testUser.password = "newPassword@123";
        });
    });


    describe("DELETE /api/auth/delete-account", () => {
        test("should delete the user account successfully", async () => {
             const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password, 
                });
            const freshToken = loginRes.body.token;

            const res = await request(app)
                .delete("/api/auth/delete-account")
                .set("Authorization", `Bearer ${freshToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Account deleted successfully.");

            const deletedUser = await User.findOne({ email: testUser.email });
            expect(deletedUser).toBeNull();
        });
    });
});