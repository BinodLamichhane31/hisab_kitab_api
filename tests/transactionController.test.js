const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");

// Mock the verifyShopOwner utility to isolate the controller logic
jest.mock('../utils/verifyShopOwner', () => ({
    verifyShopOwner: jest.fn(),
}));
const { verifyShopOwner } = require('../utils/verifyShopOwner');

describe("Transaction Controller Endpoints", () => {
    let authToken, testUser, testShop, testCustomer;

    const userData = { fname: "Txn", lname: "Tester", email: "txn.tester@test.com", phone: "9844444444", password: "Password123!" };
    const shopData = { name: "Transaction Test Shop", address: "456 Txn St" };

    beforeEach(async () => {
        verifyShopOwner.mockReset();

        await request(app).post("/api/auth/register").send(userData);
        const loginRes = await request(app).post("/api/auth/login").send({ email: userData.email, password: userData.password });        
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;
        testShop = await new Shop({ ...shopData, owner: testUser._id }).save();
        testCustomer = await new Customer({ name: 'Test Customer', shop: testShop._id, phone: '123', email: 'cust@t.com' }).save();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Customer.deleteMany({});
        await Transaction.deleteMany({});
    });

    describe("POST /api/transactions", () => {
        test("should create a manual transaction successfully", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const transactionPayload = {
                shopId: testShop._id,
                type: 'CASH_IN',
                category: 'OTHER_INCOME',
                amount: 5000,
                description: 'Office rent received',
            };

            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${authToken}`)
                .send(transactionPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.category).toBe('OTHER_INCOME');
            expect(res.body.data.amount).toBe(5000);
        });

        test("should fail to create a transaction for a protected category", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const transactionPayload = {
                shopId: testShop._id,
                type: 'CASH_IN',
                category: 'SALE_PAYMENT', 
                amount: 1000,
                description: 'Trying to create a sale payment manually',
            };

            const res = await request(app)
                .post("/api/transactions")
                .set("Authorization", `Bearer ${authToken}`)
                .send(transactionPayload);
            
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain("cannot be created manually");
        });

    });

    describe("GET /api/transactions", () => {
        beforeEach(async () => {
            await Transaction.insertMany([
                { shop: testShop._id, type: 'CASH_IN', category: 'OTHER_INCOME', amount: 1000, description: 'Income A', createdBy: testUser._id },
                { shop: testShop._id, type: 'CASH_OUT', category: 'OTHER_EXPENSE', amount: 200, description: 'Expense B', createdBy: testUser._id },
                { shop: testShop._id, type: 'CASH_IN', category: 'SALE_PAYMENT', amount: 500, description: 'Payment from customer', relatedCustomer: testCustomer._id, createdBy: testUser._id },
            ]);
        });
        
        test("should get all transactions for a shop", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const res = await request(app)
                .get(`/api/transactions?shopId=${testShop._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(3);
            expect(res.body.pagination.totalTransactions).toBe(3);
        });

        test("should filter transactions by type 'CASH_OUT'", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const res = await request(app)
                .get(`/api/transactions?shopId=${testShop._id}&type=CASH_OUT`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].category).toBe('OTHER_EXPENSE');
        });

        test("should filter transactions by a specific customer", async () => {
            verifyShopOwner.mockResolvedValue({ shop: testShop });

            const res = await request(app)
                .get(`/api/transactions?shopId=${testShop._id}&relatedCustomer=${testCustomer._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].category).toBe('SALE_PAYMENT');
        });

        test("should return 400 if shopId is not provided", async () => {
            const res = await request(app)
                .get('/api/transactions')
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Shop ID is required.');
        });
    });

    describe("GET /api/transactions/:id", () => {
        test("should get a single transaction by its ID", async () => {
            const transaction = await new Transaction({ shop: testShop._id, type: 'CASH_IN', category: 'PURCHASE_PAYMENT', amount: 99, createdBy: testUser._id }).save();
            verifyShopOwner.mockResolvedValue({ shop: testShop });
            
            const res = await request(app)
                .get(`/api/transactions/${transaction._id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.amount).toBe(99);
            expect(res.body.data.category).toBe('PURCHASE_PAYMENT');
        });

        test("should return 404 if transaction ID is not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/transactions/${nonExistentId}`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });
});