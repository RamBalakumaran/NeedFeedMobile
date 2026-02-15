const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Food = require('./models/Food');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected for Seeding'))
  .catch(err => console.log(err));

const importData = async () => {
  try {
    // 1. CLEAR EXISTING DATA
    await User.deleteMany();
    await Food.deleteMany();
    console.log('🗑️  Data Destroyed...');

    // 2. HASH PASSWORD
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('123456', salt); // Default password for everyone

    // 3. CREATE USERS (Admin, Donors, NGOs, Volunteers)
    const users = await User.insertMany([
      {
        name: 'Super Admin',
        email: 'admin@test.com',
        password,
        phone: '9999999999',
        address: 'HQ, Chennai',
        city: 'Chennai',
        role: 'admin',
        profileImage: 'https://cdn-icons-png.flaticon.com/512/906/906343.png'
      },
      {
        name: 'Ram Kumar',
        email: 'donor@test.com',
        password,
        phone: '9876543210',
        address: '2nd Street, Anna Nagar',
        city: 'Chennai',
        role: 'donor',
        donorType: 'Individual',
        availabilityTime: '9 AM - 6 PM',
        profileImage: 'https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg'
      },
      {
        name: 'Hotel Saravana Bhavan',
        email: 'hotel@test.com',
        password,
        phone: '044-12345678',
        address: 'T-Nagar Main Road',
        city: 'Chennai',
        role: 'donor',
        donorType: 'Restaurant',
        availabilityTime: '10 PM - 11 PM',
        profileImage: 'https://b.zmtcdn.com/data/pictures/chains/8/65088/6f131a9427df96d48f654b9aa58cd07c.jpg'
      },
      {
        name: 'Helping Hands NGO',
        email: 'ngo@test.com',
        password,
        phone: '8888888888',
        address: 'NGO Colony, Adyar',
        city: 'Chennai',
        role: 'ngo',
        organizationName: 'Helping Hands Foundation',
        licenseNumber: 'NGO-TN-12345',
        capacity: 500,
        profileImage: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png'
      },
      {
        name: 'Vijay (Volunteer)',
        email: 'volunteer@test.com',
        password,
        phone: '7777777777',
        address: 'Velachery',
        city: 'Chennai',
        role: 'volunteer',
        vehicleType: 'Bike',
        preferredArea: 'South Chennai',
        profileImage: 'https://img.freepik.com/free-photo/young-bearded-man-with-striped-shirt_273609-5677.jpg'
      }
    ]);

    const donorUser = users[1]; // Ram
    const restaurantUser = users[2]; // Saravana Bhavan

    console.log('👥 Users Created...');

    // 4. CREATE FOOD DONATIONS
    const foods = await Food.insertMany([
      {
        donor: donorUser._id,
        title: 'Veg Biryani (Leftover)',
        quantity: '5 kg',
        description: 'Fresh homemade veg biryani, cooked for a party. Contains nuts.',
        foodType: 'Veg',
        category: 'Cooked',
        storageInstruction: 'Keep Hot',
        preparationTime: new Date(),
        expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // Expires in 4 hours
        imageUrl: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2022/02/hyderabadi-biryani-recipe-chicken.jpg',
        location: { type: 'Point', coordinates: [80.22, 13.02] }, // Chennai coords
        address: 'Anna Nagar, Chennai'
      },
      {
        donor: restaurantUser._id,
        title: '50 Idlis & Sambar',
        quantity: '50 pieces',
        description: 'Surplus breakfast items. Freshly made.',
        foodType: 'Veg',
        category: 'Cooked',
        storageInstruction: 'Room Temperature',
        preparationTime: new Date(),
        expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        imageUrl: 'https://www.cookwithmanali.com/wp-content/uploads/2020/05/Soft-Homemade-Idli-500x500.jpg',
        location: { type: 'Point', coordinates: [80.24, 13.04] },
        address: 'T-Nagar, Chennai'
      },
      {
        donor: donorUser._id,
        title: 'Wheat Bread Packets',
        quantity: '10 packets',
        description: 'Sealed bakery items, near expiry date.',
        foodType: 'Veg',
        category: 'Bakery',
        storageInstruction: 'Room Temperature',
        preparationTime: new Date(),
        expiryTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
        imageUrl: 'https://www.bigbasket.com/media/uploads/p/l/40009472_4-fresho-whole-wheat-bread-safe-preservative-free.jpg',
        location: { type: 'Point', coordinates: [80.22, 13.02] },
        address: 'Anna Nagar, Chennai'
      },
      {
        donor: donorUser._id,
        title: 'Rice (Raw)',
        quantity: '25 kg',
        description: 'Uncooked raw rice bag.',
        foodType: 'Veg',
        category: 'Raw',
        storageInstruction: 'Room Temperature',
        preparationTime: new Date(),
        expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2023/9/344847396/SX/DX/SS/3436034/white-raw-rice.jpeg',
        location: { type: 'Point', coordinates: [80.22, 13.02] },
        address: 'Anna Nagar, Chennai'
      }
    ]);

    console.log('🍱 Food Donations Created...');
    console.log('✅ DATA IMPORTED SUCCESS!');
    process.exit();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

importData();