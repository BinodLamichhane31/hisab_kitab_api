const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Customer = require("../models/Customer");

describe("Customer Management Endpoints", () => {
    let authToken;
    let testShop;
    let testUser;

    // -- Test Data --
    const userData = {
        fname: "Shop",
        lname: "Owner",
        email: "shop.owner@test.com",
        phone: "9811111111",
        password: "Password123!",
    };

    const shopData = {
        name: "Test Supermarket",
        address: "123 Test St",
        phone: "9822222222",
    };

    const customerData = {
        name: "John Doe",
        phone: "9833333333",
        email: "john.doe@example.com",
        address: "456 Customer Ave",
    };

    beforeEach(async () => {

        await request(app).post("/api/auth/register").send(userData);

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: userData.email, password: userData.password });
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;
        expect(authToken).toBeDefined(); 

        const shop = new Shop({ ...shopData, owner: testUser._id });
        testShop = await shop.save();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Customer.deleteMany({});
    });

    // -- Test Cases --

    describe("POST /api/customers", () => {
        test("should create a new customer successfully", async () => {
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ ...customerData, shop: testShop._id });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Customer added successfully");

            const customerInDb = await Customer.findOne({ phone: customerData.phone });
            expect(customerInDb).not.toBeNull();
            expect(customerInDb.name).toBe(customerData.name);
        });

        test("should fail if required fields are missing", async () => {
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ name: "Incomplete" }); // Missing phone, email, shopId

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Customer name, phone, email and shops are required.");
        });

        test("should fail if the user does not own the shop", async () => {
            const otherShop = new Shop({ ...shopData, name: "Other Shop", owner: new mongoose.Types.ObjectId() });
            await otherShop.save();

            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ ...customerData, shop: otherShop._id });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not authorized to add customer to this shop.");
        });

        test("should prevent creating a duplicate customer (by phone) in the same shop", async () => {
            await new Customer({ ...customerData, shop: testShop._id }).save();
            
            const res = await request(app)
                .post("/api/customers")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ ...customerData, name: "Jane Doe", shop: testShop._id });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe("Customer with this phone is already registered in this shop.");
        });
    });


    describe("GET /api/customers/:customerId", () => {
        test("should get a single customer by their ID", async () => {
            const customer = await new Customer({ ...customerData, shop: testShop._id }).save();
            
            const res = await request(app)
                .get(`/api/customers/${customer._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(customer._id.toString());
        });

        test("should return 404 if customer does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/customers/${nonExistentId}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });

    describe("PUT /api/customers/:customerId", () => {
        test("should update a customer's details successfully", async () => {
            const customer = await new Customer({ ...customerData, shop: testShop._id }).save();
            const updatePayload = { name: "Johnathan Doe", email: "johnathan.d@example.com" };

            const res = await request(app)
                .put(`/api/customers/${customer._id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send(updatePayload);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.data.name).toBe("Johnathan Doe");
        });
    });

    describe("DELETE /api/customers/:customerId", () => {
        test("should delete a customer successfully", async () => {
            const customer = await new Customer({ ...customerData, shop: testShop._id }).save();
            
            const res = await request(app)
                .delete(`/api/customers/${customer._id}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Customer deleted.");

            const deletedCustomer = await Customer.findById(customer._id);
            expect(deletedCustomer).toBeNull();
        });
    });
});