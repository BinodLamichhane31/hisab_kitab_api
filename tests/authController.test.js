const request = require("supertest");
const app = require("../app");
const User = require("../models/User");

const testUserData = {
    fname: "Test",
    lname: "User",
    email: "testuser@example.com",
    phone: "9876543210",
    password: "Password@123",
};


describe("Authentication Endpoints", () => {
    afterEach(async () => {
        await User.deleteMany({});
    });
    describe("POST /api/auth/register", () => {
        test("should register a new user successfully", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send(testUserData);

            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual({
                success: true,
                message: "User Registered Successfully",
            });
        });

        test("should fail registration if email already exists", async () => {
            await request(app).post("/api/auth/register").send(testUserData);

            const res = await request(app)
                .post("/api/auth/register")
                .send(testUserData);

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe("Email already exists.");
        });

        test("should fail registration if required fields are missing", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ email: testUserData.email, password: testUserData.password }); // Missing fname, lname, phone

            expect(res.statusCode).toBe(400); 
            expect(res.body.success).toBe(false);
        });
    });

    describe("POST /api/auth/login", () => {
        beforeEach(async () => {
            await request(app).post("/api/auth/register").send(testUserData);
        });

        test("should login the user successfully and return a token", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUserData.email,
                    password: testUserData.password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Login successful.");
            expect(res.body.token).toEqual(expect.any(String));
            expect(res.body.data.user.email).toBe(testUserData.email);
        });

        test("should fail to login with an incorrect password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUserData.email,
                    password: "wrongpassword",
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Invalid Password");
        });

        test("should fail to login with a non-existent email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "nouser@example.com",
                    password: testUserData.password,
                });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("User does not exist.");
        });

        test("should prevent login if user account is disabled", async () => {
            await User.updateOne({ email: testUserData.email }, { isActive: false });

            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUserData.email,
                    password: testUserData.password,
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Your account has been disabled. Please contact support.");
        });
    });


    describe("Authenticated User Actions", () => {
        let authToken;

        beforeEach(async () => {
            await request(app).post("/api/auth/register").send(testUserData);
            
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                });
                
            authToken = loginRes.body.token;
        });

        test("GET /api/auth/profile › should get the current user's profile with a valid token", async () => {
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(testUserData.email);
        });
        
        test("GET /api/auth/profile › should fail to get profile without a token", async () => {
            const res = await request(app).get("/api/auth/profile");
            expect(res.statusCode).toBe(401);
        });

        test("PUT /api/auth/profile › should update the user's profile successfully", async () => {
            const updatedData = { fname: "Updated", lname: "Name" };
            
            const res = await request(app)
                .put("/api/auth/profile")
                .set("Authorization", `Bearer ${authToken}`)
                .send(updatedData);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.fname).toBe("Updated");
            expect(res.body.data.lname).toBe("Name");
        });

        test("PUT /api/auth/change-password › should change the password successfully", async () => {
            const newPassword = "newSecurePassword123!";
            const res = await request(app)
                .put("/api/auth/change-password")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    oldPassword: testUserData.password,
                    newPassword: newPassword,
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Password changed successfully.");
            
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({ email: testUserData.email, password: newPassword });
            expect(loginRes.statusCode).toBe(200);
        });

        test("PUT /api/auth/change-password › should fail with an incorrect old password", async () => {
            const res = await request(app)
                .put("/api/auth/change-password")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    oldPassword: "incorrectOldPassword",
                    newPassword: "newPassword123",
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Old password is incorrect.");
        });

        test("DELETE /api/auth/delete-account › should delete the user account successfully", async () => {
            const res = await request(app)
                .delete("/api/auth/delete-account")
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Account deleted successfully.");

            const deletedUser = await User.findOne({ email: testUserData.email });
            expect(deletedUser).toBeNull();
        });
    });
});