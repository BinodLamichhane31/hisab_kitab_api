// seeder.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// --- Import All Your Mongoose Models ---
// Make sure the paths are correct relative to this file
const User = require('./models/User');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Sale = require('./models/Sale');
const Purchase = require('./models/Purchase');
const Transaction = require('./models/Transaction');
const Notification = require('./models/Notification');

// --- Nepali Context Data ---
const nepaliFirstNames = ["Ram", "Sita", "Hari", "Gita", "Shyam", "Prakash", "Bishnu", "Laxmi", "Saraswati", "Nabin", "Sunita", "Rajesh", "Pooja", "Dipesh", "Anjali"];
const nepaliLastNames = ["Shrestha", "Maharjan", "Gurung", "Tamang", "Rai", "Karki", "Thapa", "Adhikari", "Bhandari", "Joshi", "Pandey", "Giri", "KC", "Oli", "Dahal"];
const nepaliCities = ["Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur", "Biratnagar", "Dharan", "Butwal", "Hetauda", "Nepalgunj", "Chitwan"];

const generalStoreProducts = ["Basmati Rice 5kg", "Sunflower Oil 1L", "Aata 10kg", "Sugar 1kg", "Salt 1kg", "Wai Wai Noodles", "Britannia Biscuits", "Lux Soap", "Colgate Toothpaste", "Harpic Toilet Cleaner", "Surf Excel 1kg", "Moong Dal 1kg", "Tea Pouch", "Milk Powder", "Ghee 500ml", "Mustard Oil 1L", "Coca-Cola 2L", "Lays Chips"];
const electronicsProducts = ["Samsung 42-inch TV", "Dell Laptop i5", "iPhone 15 Pro", "Logitech Mouse", "JBL Bluetooth Speaker", "Realme Power Bank", "HP Printer", "CG Washing Machine", "Baltra Rice Cooker", "Yasuda Fan", "Philips Trimmer", "Worldlink Router", "Sandisk 64GB Pendrive", "Sony Headphones", "MI Smart Watch", "Laptop Charger", "HDMI Cable", "Mobile Screen Guard"];

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateNepaliName = () => `${getRandomElement(nepaliFirstNames)} ${getRandomElement(nepaliLastNames)}`;

// --- Main Seeder Logic ---

const clearDatabase = async () => {
    console.log('🧹 Clearing the database...');
    try {
        await Notification.deleteMany({});
        await Transaction.deleteMany({});
        await Sale.deleteMany({});
        await Purchase.deleteMany({});
        await Product.deleteMany({});
        await Customer.deleteMany({});
        await Supplier.deleteMany({});
        await Shop.deleteMany({});
        await User.deleteMany({});
        console.log('✅ Database cleared successfully.');
    } catch (err) {
        console.error('Error clearing database:', err);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    console.log('🌱 Starting to seed the database...');

    try {
        // 1. CREATE USER
        console.log('👤 Step 1: Creating a single FREE user...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = new User({
            fname: 'Suresh',
            lname: 'Adhikari',
            email: 'user@example.com',
            phone: '9812345678',
            password: hashedPassword,
            role: 'user',
            subscription: { plan: 'FREE', status: 'ACTIVE' },
        });
        const savedUser = await user.save();
        console.log(`    > User '${savedUser.fname} ${savedUser.lname}' created.`);

        // 2. CREATE SHOPS for the User
        console.log('🏪 Step 2: Creating 2 shops for the user...');
        const shop1 = await Shop.create({ name: 'Adhikari Kirana Pasal', address: 'New Baneshwor, Kathmandu', owner: savedUser._id });
        const shop2 = await Shop.create({ name: 'Pokhara Electronics Hub', address: 'Lakeside, Pokhara', owner: savedUser._id });

        const allShops = [shop1, shop2];
        savedUser.shops = allShops.map(s => s._id);
        savedUser.activeShop = shop1._id;
        await savedUser.save();
        console.log(`    > ${allShops.length} shops created and assigned.`);

        // 3. POPULATE SHOPS with initial entities
        console.log('🛍️ Step 3: Populating shops with profitable products, customers, and suppliers...');
        const data = { products: {}, customers: {}, suppliers: {} };
        for (const shop of allShops) {
            const shopIdStr = shop._id.toString();
            data.products[shopIdStr] = []; data.customers[shopIdStr] = []; data.suppliers[shopIdStr] = [];

            const productList = shop.name.includes('Kirana') ? generalStoreProducts : electronicsProducts;
            for (const productName of productList) {
                const purchasePrice = parseFloat(faker.commerce.price({ min: 100, max: 8000, dec: 0 }));
                // **PROFITABILITY LOGIC**: Selling price is set 15% to 40% higher than purchase price.
                const sellingPrice = Math.ceil(purchasePrice * faker.number.float({ min: 1.15, max: 1.40 }));
                data.products[shopIdStr].push(await Product.create({ name: productName, purchasePrice, sellingPrice, quantity: 0, reorderLevel: 10, shopId: shop._id }));
            }
            console.log(`    > ${data.products[shopIdStr].length} products created for ${shop.name}`);

            for (let i = 0; i < 7; i++) {
                data.customers[shopIdStr].push(await Customer.create({ name: generateNepaliName(), phone: faker.phone.number('984#######'), email: faker.internet.email().toLowerCase(), address: getRandomElement(nepaliCities), shop: shop._id }));
                data.suppliers[shopIdStr].push(await Supplier.create({ name: `${getRandomElement(nepaliLastNames)} Traders`, phone: faker.phone.number('986#######'), email: faker.internet.email().toLowerCase(), address: getRandomElement(nepaliCities), shop: shop._id }));
            }
            console.log(`    > 7 customers and 7 suppliers created for ${shop.name}`);
        }

        // 4. SIMULATE HISTORICAL DATA
        console.log('🗓️ Step 4: Simulating historical data from Sep 2023 to Today with sales 20% higher than purchases...');
        const today = new Date();
        const startDate = new Date('2023-09-01'); // Start date for data generation

        let saleCancelled = false;
        let purchaseCancelled = false;

        // --- Monthly Tracking for Sales vs. Purchases ---
        const monthlyTotals = {}; // { 'YYYY-MM': { totalSales: 0, totalPurchases: 0 } }

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const currentDate = new Date(d);
            if (currentDate.getDay() === 0) continue; // Skip Sundays

            const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyTotals[monthKey]) {
                monthlyTotals[monthKey] = { totalSales: 0, totalPurchases: 0 };
            }

            for (const shop of allShops) {
                const shopIdStr = shop._id.toString();
                const shopOwnerId = shop.owner;

                // --- Sales Generation Logic (Prioritized to drive overall target) ---
                // Generate a base number of sales
                const numSales = faker.number.int({ min: 2, max: 5 });
                let currentDaySales = 0;
                for (let i = 0; i < numSales; i++) {
                    const customer = getRandomElement(data.customers[shopIdStr]);
                    const product = getRandomElement(data.products[shopIdStr]);
                    const availableProduct = await Product.findById(product._id);
                    if (!availableProduct || availableProduct.quantity < 5) continue;

                    const quantity = faker.number.int({ min: 1, max: 4 });
                    const priceAtSale = availableProduct.sellingPrice * faker.number.float({ min: 0.98, max: 1.02 });
                    const saleGrandTotal = quantity * priceAtSale;
                    const amountPaid = saleGrandTotal * faker.number.float({ min: 0.7, max: 1 }); // More likely to be paid, or partially paid

                    const sale = new Sale({
                        invoiceNumber: `INV-${faker.string.alphanumeric(6)}`,
                        shop: shop._id,
                        customer: customer._id,
                        saleType: faker.helpers.arrayElement(['CUSTOMER', 'CASH']), // Varying sale types
                        items: [{ product: availableProduct._id, productName: availableProduct.name, quantity, priceAtSale, costAtSale: availableProduct.purchasePrice }],
                        amountPaid,
                        saleDate: currentDate,
                        createdBy: shopOwnerId
                    });

                    const savedSale = await sale.save();
                    currentDaySales += savedSale.grandTotal;

                    await Product.findByIdAndUpdate(product._id, { $inc: { quantity: -quantity } });
                    await Customer.findByIdAndUpdate(customer._id, { $inc: { currentBalance: savedSale.amountDue, totalSpent: savedSale.amountPaid } }); // Use savedSale.amountPaid for totalSpent
                    if (savedSale.amountPaid > 0) await Transaction.create({ shop: shop._id, type: 'CASH_IN', category: 'SALE_PAYMENT', amount: savedSale.amountPaid, relatedSale: savedSale._id, relatedCustomer: customer._id, createdBy: shopOwnerId, transactionDate: currentDate });
                    
                    // Add Sale Return transaction for a cancelled sale
                    if (!saleCancelled && savedSale.paymentStatus !== 'PAID' && savedSale.saleDate.getMonth() === (today.getMonth() - 2 + 12) % 12) { // Target a specific month for cancellation
                        saleCancelled = true;
                        console.log(`    -> Simulating a CANCELLED sale (return) for ${shop.name}`);
                        savedSale.status = 'CANCELLED';
                        await savedSale.save();
                        await Product.findByIdAndUpdate(product._id, { $inc: { quantity: quantity } }); // Return stock
                        await Customer.findByIdAndUpdate(customer._id, { $inc: { currentBalance: -savedSale.amountDue, totalSpent: -savedSale.amountPaid } }); // Reverse balance
                        if(savedSale.amountPaid > 0) await Transaction.create({ shop: shop._id, type: 'CASH_OUT', category: 'SALE_RETURN', amount: savedSale.amountPaid, description: `Refund for cancelled INV #${savedSale.invoiceNumber}`, relatedSale: savedSale._id, relatedCustomer: customer._id, createdBy: shopOwnerId, transactionDate: currentDate });
                    }
                }
                monthlyTotals[monthKey].totalSales += currentDaySales;


                // --- Purchase Generation Logic ---
                // Adjust purchase amount based on the target sales to maintain the 20% difference overall and monthly limit
                let targetDailyPurchase = (currentDaySales / 1.2) * faker.number.float({ min: 0.8, max: 1.0 }); // Aim for sales 20% higher, with some daily fluctuation
                let actualDailyPurchase = 0;

                const numPurchases = faker.number.int({ min: 1, max: 2 });
                for (let i = 0; i < numPurchases; i++) {
                    const supplier = getRandomElement(data.suppliers[shopIdStr]);
                    const product = getRandomElement(data.products[shopIdStr]);
                    let quantity = faker.number.int({ min: 20, max: 80 });
                    const unitCost = product.purchasePrice;
                    let purchaseGrandTotal = quantity * unitCost;

                    // Ensure monthly purchase doesn't exceed 20% above sales for the month
                    // This is a rough adjustment, precise control over daily transactions to meet monthly targets is complex
                    // and usually handled by an iterative algorithm or a larger dataset.
                    // For seeding, we'll ensure daily purchases are generally lower than daily sales.
                    if (monthlyTotals[monthKey].totalPurchases + purchaseGrandTotal > monthlyTotals[monthKey].totalSales * 1.2 && monthlyTotals[monthKey].totalSales > 0) {
                        // If adding this purchase would exceed the monthly 20% limit, reduce its quantity
                        const maxAllowedPurchase = (monthlyTotals[monthKey].totalSales * 1.2) - monthlyTotals[monthKey].totalPurchases;
                        if (maxAllowedPurchase > 0) {
                            quantity = Math.floor(maxAllowedPurchase / unitCost);
                            if (quantity <= 0) continue; // Skip if quantity becomes zero or less
                            purchaseGrandTotal = quantity * unitCost;
                        } else {
                            continue; // Skip this purchase if already over the limit
                        }
                    }

                    const amountPaid = purchaseGrandTotal * faker.number.float({ min: 0.4, max: 1 }); // Varying payment status
                    
                    const purchase = new Purchase({
                        billNumber: `BILL-${faker.string.alphanumeric(6)}`,
                        shop: shop._id,
                        supplier: supplier._id,
                        purchaseType: faker.helpers.arrayElement(['SUPPLIER', 'CASH']), // Varying purchase types
                        items: [{ product: product._id, productName: product.name, quantity, unitCost: product.purchasePrice }],
                        amountPaid,
                        purchaseDate: currentDate,
                        createdBy: shopOwnerId
                    });

                    const savedPurchase = await purchase.save();
                    actualDailyPurchase += savedPurchase.grandTotal;

                    await Product.findByIdAndUpdate(product._id, { $inc: { quantity } });
                    await Supplier.findByIdAndUpdate(supplier._id, { $inc: { currentBalance: savedPurchase.amountDue, totalSupplied: savedPurchase.amountPaid } }); // Use savedPurchase.amountPaid for totalSupplied
                    if (savedPurchase.amountPaid > 0) await Transaction.create({ shop: shop._id, type: 'CASH_OUT', category: 'PURCHASE_PAYMENT', amount: savedPurchase.amountPaid, relatedPurchase: savedPurchase._id, relatedSupplier: supplier._id, createdBy: shopOwnerId, transactionDate: currentDate });
                    
                    // Add Purchase Return transaction for a cancelled purchase
                    if (!purchaseCancelled && savedPurchase.paymentStatus === 'PARTIAL' && savedPurchase.purchaseDate.getMonth() === (today.getMonth() - 1 + 12) % 12) { // Target a specific month for cancellation
                        purchaseCancelled = true;
                        console.log(`    -> Simulating a CANCELLED purchase (return) for ${shop.name}`);
                        savedPurchase.status = 'CANCELLED';
                        await savedPurchase.save();
                        await Product.findByIdAndUpdate(product._id, { $inc: { quantity: -quantity } }); // Return stock
                        await Supplier.findByIdAndUpdate(supplier._id, { $inc: { currentBalance: -savedPurchase.amountDue, totalSupplied: -savedPurchase.amountPaid } }); // Reverse balance
                        if(savedPurchase.amountPaid > 0) await Transaction.create({ shop: shop._id, type: 'CASH_IN', category: 'PURCHASE_RETURN', amount: savedPurchase.amountPaid, description: `Refund for cancelled Bill #${savedPurchase.billNumber}`, relatedPurchase: savedPurchase._id, relatedSupplier: supplier._id, createdBy: shopOwnerId, transactionDate: currentDate });
                    }
                }
                monthlyTotals[monthKey].totalPurchases += actualDailyPurchase;


                // Simulate Monthly Expenses on the 1st
                if (currentDate.getDate() === 1) {
                    await Transaction.create({ shop: shop._id, type: 'CASH_OUT', category: 'EXPENSE_RENT', amount: faker.number.int({ min: 15000, max: 40000 }), description: `Rent for ${currentDate.toLocaleString('default', { month: 'long' })}`, createdBy: shopOwnerId, transactionDate: currentDate });
                    await Transaction.create({ shop: shop._id, type: 'CASH_OUT', category: 'EXPENSE_UTILITIES', amount: faker.number.int({ min: 5000, max: 15000 }), description: `Utilities for ${currentDate.toLocaleString('default', { month: 'long' })}`, createdBy: shopOwnerId, transactionDate: currentDate });
                    if (faker.datatype.boolean(0.3)) { // Occasionally add owner drawing
                        await Transaction.create({ shop: shop._id, type: 'CASH_OUT', category: 'OWNER_DRAWING', amount: faker.number.int({ min: 10000, max: 50000 }), description: `Owner drawing for ${currentDate.toLocaleString('default', { month: 'long' })}`, createdBy: shopOwnerId, transactionDate: currentDate });
                    }
                }
                // Simulate occasional other income/expense
                if (faker.datatype.boolean(0.05)) { // 5% chance on any given day
                    const transactionType = faker.helpers.arrayElement(['CASH_IN', 'CASH_OUT']);
                    const category = transactionType === 'CASH_IN' ? 'OTHER_INCOME' : 'OTHER_EXPENSE';
                    const amount = faker.number.int({ min: 1000, max: 10000 });
                    await Transaction.create({ shop: shop._id, type: transactionType, category: category, amount: amount, description: `${category} for miscellaneous reasons`, createdBy: shopOwnerId, transactionDate: currentDate });
                }
            }
        }

        console.log('\n📈 Monthly Sales vs. Purchase Summary:');
        for (const month in monthlyTotals) {
            const { totalPurchases, totalSales } = monthlyTotals[month];
            const ratio = totalSales > 0 ? (totalPurchases / totalSales) * 100 : 0;
            console.log(`    ${month}: Sales = NPR ${totalSales.toFixed(2)}, Purchases = NPR ${totalPurchases.toFixed(2)} (Purchases are ${ratio.toFixed(2)}% of Sales)`);
        }
        
        // 5. FINAL PASS FOR NOTIFICATIONS (LIMITED to 10)
        console.log('🔔 Step 5: Generating a few low stock notifications (MAX 10)...');
        const lowStockProducts = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).limit(10);

        for (const product of lowStockProducts) {
            await Notification.create({
                shop: product.shopId,
                user: savedUser._id,
                type: 'LOW_STOCK',
                message: `Stock for ${product.name} is low (${product.quantity} remaining).`,
                link: `/products/${product._id}`
            });
        }
        console.log(`    > ${lowStockProducts.length} low-stock notifications created.`);
        console.log('\n✅ Database seeding completed successfully!');
    } catch (err) {
        console.error('An error occurred during the seeding process:', err);
        process.exit(1);
    }
};

// --- Execution ---
const main = async () => {
    await connectDB();
    if (process.argv[2] === '--import') {
        await clearDatabase();
        await seedDatabase();
    } else if (process.argv[2] === '--delete') {
        await clearDatabase();
    } else {
        console.log('Invalid command. Please use --import or --delete flag.');
        console.log('    npm run seed:import   (to clear and populate the database)');
        console.log('    npm run seed:delete   (to clear the database)');
    }
    await mongoose.disconnect();
    console.log('🔌 MongoDB Disconnected.');
};

main();