const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Transaction = require("../models/Transaction");


jest.mock('mongoose', () => {
    const originalMongoose = jest.requireActual('mongoose');
    return {
        ...originalMongoose,
        startSession: jest.fn().mockReturnValue(Promise.resolve({
            startTransaction: jest.fn(),
            commitTransaction: jest.fn().mockReturnValue(Promise.resolve()),
            abortTransaction: jest.fn().mockReturnValue(Promise.resolve()),
            endSession: jest.fn(),
            withTransaction: jest.fn().mockImplementation(async (fn) => fn()),
        })),
    };
});

describe("Sale Management Endpoints", () => {
    let authToken, testUser, testShop, testCustomer, testProduct1;

    const userData = { fname: "Sale", lname: "Tester", email: "sale.tester@test.com", phone: "9876543210", password: "Password123!" };
    const shopData = { name: "Sale Test Shop", address: "123 Sale St", phone: "9876543211" };
    const customerData = { name: "Regular Customer", phone: "9876543212", email: "customer@test.com" };
    const productData1 = { name: "Test Product A", purchasePrice: 100, sellingPrice: 150, quantity: 20 };

    beforeEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Customer.deleteMany({});
        await Product.deleteMany({});
        await Sale.deleteMany({});
        await Transaction.deleteMany({});

        await request(app).post("/api/auth/register").send(userData);
        const loginRes = await request(app).post("/api/auth/login").send({ email: userData.email, password: userData.password });
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;

        testShop = await new Shop({ ...shopData, owner: testUser._id }).save();
        testCustomer = await new Customer({ ...customerData, shop: testShop._id }).save();
        testProduct1 = await new Product({ ...productData1, shopId: testShop._id }).save();
    });

    describe("POST /api/sales (Create Sale)", () => {
        test("should create a customer sale successfully", async () => {
            const salePayload = {
                shopId: testShop._id,
                customerId: testCustomer._id,
                items: [{ productId: testProduct1._id, quantity: 2, priceAtSale: 150 }],
                amountPaid: 200,
            };
            const res = await request(app).post("/api/sales").set("Authorization", `Bearer ${authToken}`).send(salePayload);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.amountDue).toBe(100);
            const product = await Product.findById(testProduct1._id);
            expect(product.quantity).toBe(18);
        });

        test("should create a cash sale successfully", async () => {
            const salePayload = {
                shopId: testShop._id,
                items: [{ productId: testProduct1._id, quantity: 1, priceAtSale: 150 }],
                amountPaid: 150,
            };
            const res = await request(app).post("/api/sales").set("Authorization", `Bearer ${authToken}`).send(salePayload);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.saleType).toBe("CASH");
        });
    });

    describe("GET /api/sales and GET /api/sales/:id", () => {
        let testSale;
        beforeEach(async () => {
            testSale = await new Sale({
                shop: testShop._id,
                saleType: 'CUSTOMER',
                customer: testCustomer._id,
                createdBy: testUser._id,
                invoiceNumber: 'SALE-GET-001',
                items: [{
                    product: testProduct1._id,
                    productName: testProduct1.name,
                    quantity: 1,
                    priceAtSale: 150,
                    costAtSale: 100,
                    total: 150,
                }],
                subTotal: 150,
                grandTotal: 150,
                amountPaid: 100,
                amountDue: 50
            }).save();
        });

        test("should fetch all sales for a shop", async () => {
            const res = await request(app).get(`/api/sales?shopId=${testShop._id}`).set("Authorization", `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
        });

        test("should fetch a single sale by its ID", async () => {
            const res = await request(app).get(`/api/sales/${testSale._id}`).set("Authorization", `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.invoiceNumber).toBe('SALE-GET-001');
        });
    });
});