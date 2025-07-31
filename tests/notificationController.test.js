const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");
const Shop = require("../models/Shop"); 
const Notification = require("../models/Notification");

describe("Notification Endpoints", () => {
    let authToken;
    let testUser;
    let testShop; 

    const userData = {
        fname: "Notify",
        lname: "User",
        email: "notify.user@test.com",
        phone: "9876554321",
        password: "Password123!",
    };
    
    const shopData = {
        name: "Notification Test Shop",
    };

    beforeEach(async () => {
        await request(app).post("/api/auth/register").send(userData);
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: userData.email, password: userData.password });
        authToken = loginRes.body.token;
        testUser = loginRes.body.data.user;

        testShop = await new Shop({ ...shopData, owner: testUser._id }).save();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Notification.deleteMany({});
    });

    // -- Test Cases --

    describe("GET /api/notifications", () => {
        test("should fetch notifications for the authenticated user and the correct unread count", async () => {
            await Notification.insertMany([
                { user: testUser._id, shop: testShop._id, type: 'LOW_STOCK', message: "Notification 1", isRead: false },
                { user: testUser._id, shop: testShop._id, type: 'PAYMENT_DUE', message: "Notification 2", isRead: false },
                { user: testUser._id, shop: testShop._id, type: 'COLLECTION_OVERDUE', message: "Notification 3", isRead: true },
            ]);
            await new Notification({ user: new mongoose.Types.ObjectId(), shop: new mongoose.Types.ObjectId(), type: 'LOW_STOCK', message: "Other user's notification" }).save();

            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(3);
            expect(res.body.count).toBe(2);
        });

        test("should return an empty array and zero count for a user with no notifications", async () => {
            const res = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(0);
            expect(res.body.count).toBe(0);
        });
    });

    describe("PUT /api/notifications/:id/read", () => {
        test("should mark a single notification as read", async () => {
            const notification = await new Notification({ user: testUser._id, shop: testShop._id, type: 'COLLECTION_OVERDUE', message: "Mark me as read" }).save();
            expect(notification.isRead).toBe(false);

            const res = await request(app)
                .put(`/api/notifications/${notification._id}/read`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.isRead).toBe(true);
        });

        test("should return 404 if trying to mark another user's notification", async () => {
            const otherUsersNotification = await new Notification({ user: new mongoose.Types.ObjectId(), shop: new mongoose.Types.ObjectId(), type: 'COLLECTION_OVERDUE', message: "Don't touch me" }).save();

            const res = await request(app)
                .put(`/api/notifications/${otherUsersNotification._id}/read`)
                .set("Authorization", `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });

    describe("PUT /api/notifications/read-all", () => {
        test("should mark all unread notifications as read for the current user only", async () => {
            await Notification.insertMany([
                { user: testUser._id, shop: testShop._id, type: 'LOW_STOCK', message: "Unread 1", isRead: false },
                { user: testUser._id, shop: testShop._id, type: 'PAYMENT_DUE', message: "Unread 2", isRead: false },
                { user: testUser._id, shop: testShop._id, type: 'COLLECTION_OVERDUE', message: "Already Read", isRead: true },
            ]);
            const otherUsersNotification = await new Notification({ user: new mongoose.Types.ObjectId(), shop: new mongoose.Types.ObjectId(), type: 'COLLECTION_OVERDUE', message: "Other user unread", isRead: false }).save();

            const res = await request(app)
                .put("/api/notifications/read-all")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            
            const unreadCount = await Notification.countDocuments({ user: testUser._id, isRead: false });
            expect(unreadCount).toBe(0);

            const otherNotificationAfter = await Notification.findById(otherUsersNotification._id);
            expect(otherNotificationAfter.isRead).toBe(false);
        });
    });
});