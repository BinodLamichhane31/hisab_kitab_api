const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

jest.mock('../utils/verifyShopOwner', () => ({
    verifyShopOwner: jest.fn(),
}));
const { verifyShopOwner } = require('../utils/verifyShopOwner');

describe("Dashboard Controller Endpoints", () => {
    let authToken, testUser, testShop;

    const userData = { fname: "Dashboard", lname: "User", email: "dash.user@test.com", phone: "9855555555", password: "Password123!" };
    const shopData = { name: "Dashboard Test Shop", address: "789 Dash St" };

    beforeEach(async () => {
        verifyShopOwner.mockReset();
        await request(app).post("/api/auth/register").send(userData);
        const loginRes = await request(app).post("/api/auth/login").send({ email: userData.email, password: userData.password });
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;
        testShop = await new Shop({ ...shopData, owner: testUser._id }).save();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Customer.deleteMany({});
        await Supplier.deleteMany({});
        await Sale.deleteMany({});
        await Purchase.deleteMany({});
    });

    describe("GET /api/dashboard/stats", () => {
        beforeEach(async () => {
            await Customer.insertMany([
                { name: "Cust 1", shop: testShop._id, currentBalance: 150.50, phone: "111", email: "c1@t.com" },
                { name: "Cust 2", shop: testShop._id, currentBalance: 200.00, phone: "222", email: "c2@t.com" },
                { name: "Cust 3", shop: testShop._id, currentBalance: -50.00, phone: "333", email: "c3@t.com" },
            ]);
            await Supplier.insertMany([
                { name: "Supp 1", shop: testShop._id, currentBalance: 300.00, phone: "444", email: "s1@t.com" },
                { name: "Supp 2", shop: testShop._id, currentBalance: 450.25, phone: "555", email: "s2@t.com" },
            ]);
        });

        test("should return correct dashboard stats", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const res = await request(app)
                .get(`/api/dashboard/stats?shopId=${testShop._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.totalCustomers).toBe(3);
            expect(res.body.data.totalSuppliers).toBe(2);
            expect(res.body.data.receivableAmount).toBeCloseTo(300.50);
            expect(res.body.data.payableAmount).toBeCloseTo(750.25);
        });

        test("should return 403 if user is not the shop owner", async () => {
            verifyShopOwner.mockResolvedValue({ error: 'Access Denied', status: 403 });
            const res = await request(app)
                .get(`/api/dashboard/stats?shopId=${testShop._id}`)
                .set("Authorization", `Bearer ${authToken}`);
            expect(res.statusCode).toBe(403);
        });
    });

});