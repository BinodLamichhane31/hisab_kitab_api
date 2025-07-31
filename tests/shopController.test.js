const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");

describe("Shop Management Endpoints", () => {
    let authToken;
    let testUser;

    // -- Test Data --
    const userData = {
        fname: "Shop",
        lname: "Controller",
        email: "shop.controller@test.com",
        phone: "9812345678",
        password: "Password123!",
    };

    const shopData = {
        name: "My Awesome Shop",
        address: "456 Main St, Anytown",
        contactNumber: "9887654321",
    };

    // -- Test Setup and Teardown --
    beforeEach(async () => {
        await request(app).post("/api/auth/register").send(userData);
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: userData.email, password: userData.password });
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
    });

    // -- Test Cases --

    describe("POST /api/shops", () => {
        test("should create a new shop successfully", async () => {
            const res = await request(app)
                .post("/api/shops")
                .set("Authorization", `Bearer ${authToken}`)
                .send(shopData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            const userInDb = await User.findById(testUser._id).populate('shops');
            expect(userInDb.shops.length).toBe(1);
        });

        test("should fail if shop name is missing", async () => {
            const res = await request(app)
                .post("/api/shops")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ address: "no name here" });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Shop name is required.");
        });

        test("should prevent creating a third shop for a user on the FREE plan", async () => {
            await request(app).post("/api/shops").set("Authorization", `Bearer ${authToken}`).send({ name: "Shop 1" });
            await request(app).post("/api/shops").set("Authorization", `Bearer ${authToken}`).send({ name: "Shop 2" });

            const res = await request(app)
                .post("/api/shops")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ name: "Shop 3 - The Forbidden One" });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You have reached the 2-shop limit for the Free plan. Please upgrade to Pro to add more shops.");
        });
    });

    describe("GET /api/shops", () => {
        test("should get all shops owned by the authenticated user", async () => {
            await new Shop({ ...shopData, owner: testUser._id }).save();
            
            const res = await request(app)
                .get("/api/shops")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
        });
    });

    describe("GET /api/shops/:id", () => {
        test("should get a single shop by its ID", async () => {
            const shop = await new Shop({ ...shopData, owner: testUser._id }).save();
            
            const res = await request(app)
                .get(`/api/shops/${shop._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(shop._id.toString());
        });

        test("should return 403 if trying to access a shop not owned by the user", async () => {
 
            const otherUserData = {
                fname: "Other",
                lname: "Person",
                email: "other@t.com",
                phone: "9800000000",
                password: "p", 
            };
            const otherUser = await new User(otherUserData).save();
            const otherShop = await new Shop({ ...shopData, owner: otherUser._id }).save();
            
            const res = await request(app)
                .get(`/api/shops/${otherShop._id}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Access denied.");
        });

        test("should return 404 if shop ID does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/shops/${nonExistentId}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });

    describe("PUT /api/shops/:id", () => {
        test("should update a shop's details successfully", async () => {
            const shop = await new Shop({ ...shopData, owner: testUser._id }).save();
            const updatePayload = { name: "My Updated Awesome Shop" };

            const res = await request(app)
                .put(`/api/shops/${shop._id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send(updatePayload);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.data.name).toBe("My Updated Awesome Shop");
        });
    });

    describe("DELETE /api/shops/:id", () => {
        test("should delete a shop successfully", async () => {
            const shop = await new Shop({ ...shopData, owner: testUser._id }).save();
            await User.findByIdAndUpdate(testUser._id, { $push: { shops: shop._id } });

            const res = await request(app)
                .delete(`/api/shops/${shop._id}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(200);

            const deletedShop = await Shop.findById(shop._id);
            expect(deletedShop).toBeNull();
            
            const userAfterDelete = await User.findById(testUser._id);
            expect(userAfterDelete.shops.length).toBe(0);
        });
    });
});