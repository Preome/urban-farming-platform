const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.plantHealthUpdate.deleteMany();
  await prisma.plantTracking.deleteMany();
  await prisma.sustainabilityCert.deleteMany();
  await prisma.communityComment.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rentalBooking.deleteMany();
  await prisma.rentalSpace.deleteMany();
  await prisma.produce.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@urbanfarming.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  console.log('Admin created:', admin.email);

  // Create Vendors and Customers
  const vendors = [];
  const customers = [];

  // Create 10 vendors
  const vendorNames = [
    'Green Thumb Farms', 'Urban Harvest', 'City Sprouts', 'Rooftop Gardens',
    'EcoGrow Collective', 'Fresh City Farms', 'Vertical Veggies', 'Sustainable Sprouts',
    'Metro Microgreens', 'Organic Oasis'
  ];

  for (let i = 0; i < 10; i++) {
    const vendorPassword = await bcrypt.hash('vendor123', 10);
    const user = await prisma.user.create({
      data: {
        name: `Vendor ${i + 1}`,
        email: `vendor${i + 1}@urbanfarming.com`,
        password: vendorPassword,
        role: 'VENDOR',
        status: 'ACTIVE'
      }
    });

    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        farmName: vendorNames[i],
        farmLocation: `${['Downtown', 'Northside', 'Eastside', 'Westend', 'Southpark'][i % 5]}, City`,
        farmDescription: `Leading urban farm specializing in ${['vegetables', 'herbs', 'microgreens', 'fruits', 'mushrooms'][i % 5]}.`,
        phoneNumber: `+123456789${i}`,
        certificationStatus: i < 7 ? 'APPROVED' : 'PENDING'
      }
    });

    vendors.push({ user, vendor });
    console.log(`Vendor ${i + 1} created:`, user.email);
  }

  // Create 5 customers
  const customerNames = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown'];
  for (let i = 0; i < 5; i++) {
    const customerPassword = await bcrypt.hash('customer123', 10);
    const user = await prisma.user.create({
      data: {
        name: customerNames[i],
        email: `customer${i + 1}@urbanfarming.com`,
        password: customerPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE'
      }
    });
    customers.push(user);
    console.log(`Customer ${i + 1} created:`, user.email);
  }

  // Create 100 products
  const categories = ['Vegetables', 'Fruits', 'Herbs', 'Microgreens', 'Mushrooms', 'Seeds', 'Tools', 'Fertilizers'];
  const productNames = [
    'Organic Tomatoes', 'Fresh Lettuce Mix', 'Bell Peppers', 'Cucumbers', 'Carrots',
    'Strawberries', 'Basil', 'Cilantro', 'Sunflower Microgreens', 'Oyster Mushrooms',
    'Heirloom Seeds Pack', 'Garden Trowel', 'Compost Starter', 'Organic Fertilizer',
    'Cherry Tomatoes', 'Kale', 'Spinach', 'Radishes', 'Green Onions', 'Mint'
  ];

  for (let i = 0; i < 100; i++) {
    const vendor = vendors[i % vendors.length];
    const isOrganic = Math.random() > 0.3;
    const certificationStatus = isOrganic && vendor.vendor.certificationStatus === 'APPROVED' 
      ? 'APPROVED' 
      : (Math.random() > 0.5 ? 'APPROVED' : 'PENDING');

    await prisma.produce.create({
      data: {
        vendorId: vendor.vendor.id,
        name: productNames[i % productNames.length] + (Math.floor(i / productNames.length) + 1),
        description: `Fresh, ${isOrganic ? 'organic' : 'conventionally grown'} produce from ${vendor.vendor.farmName}.`,
        price: parseFloat((Math.random() * 20 + 2).toFixed(2)),
        category: categories[i % categories.length],
        certificationStatus: certificationStatus,
        availableQuantity: Math.floor(Math.random() * 100) + 10,
        unit: ['kg', 'bundle', 'piece', 'pack'][Math.floor(Math.random() * 4)],
        isOrganic: isOrganic,
        imageUrl: `https://picsum.photos/id/${200 + i}/200/200`
      }
    });
  }
  console.log('100 products created');

  // Create rental spaces
  const spaceNames = ['Plot A', 'Garden Bed 1', 'Rooftop Section', 'Greenhouse Zone', 'Vertical Tower'];
  for (const vendor of vendors) {
    for (let i = 0; i < 3; i++) {
      await prisma.rentalSpace.create({
        data: {
          vendorId: vendor.vendor.id,
          name: spaceNames[i % spaceNames.length],
          location: vendor.vendor.farmLocation,
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          size: Math.floor(Math.random() * 100) + 10,
          pricePerMonth: parseFloat((Math.random() * 200 + 50).toFixed(2)),
          availability: Math.random() > 0.3,
          description: `Beautiful ${['sunny', 'partial shade', 'full sun'][i % 3]} spot perfect for growing vegetables and herbs.`,
          soilType: ['Loamy', 'Sandy', 'Clay'][Math.floor(Math.random() * 3)],
          sunlight: ['Full Sun', 'Partial Shade', 'Full Shade'][Math.floor(Math.random() * 3)],
          waterAccess: Math.random() > 0.2
        }
      });
    }
  }
  console.log('Rental spaces created');

  // Create community posts
  const postTitles = [
    'Tips for urban composting', 'Best plants for small spaces', 'My first harvest!',
    'Dealing with aphids organically', 'Vertical gardening success story',
    'What to plant in winter?', 'DIY self-watering system', 'Community garden meetup'
  ];

  const allUsers = [admin, ...customers, ...vendors.map(v => v.user)];
  for (let i = 0; i < 30; i++) {
    const user = allUsers[Math.floor(Math.random() * allUsers.length)];
    await prisma.communityPost.create({
      data: {
        userId: user.id,
        title: postTitles[i % postTitles.length],
        postContent: `This is a detailed post about ${postTitles[i % postTitles.length].toLowerCase()}. 
        Here are my experiences and tips for fellow urban farmers.`,
        category: ['TIPS', 'QUESTION', 'SUCCESS_STORY', 'EVENT'][Math.floor(Math.random() * 4)],
        likes: Math.floor(Math.random() * 50)
      }
    });
  }
  console.log('Community posts created');

  // Create plant tracking entries
  for (const customer of customers) {
    for (let i = 0; i < 3; i++) {
      const plantingDate = new Date();
      plantingDate.setDate(plantingDate.getDate() - Math.floor(Math.random() * 30));
      
      const harvestDate = new Date(plantingDate);
      harvestDate.setDate(harvestDate.getDate() + Math.floor(Math.random() * 60) + 30);

      await prisma.plantTracking.create({
        data: {
          userId: customer.id,
          plantName: ['Tomato', 'Basil', 'Lettuce', 'Pepper', 'Strawberry'][i],
          plantType: ['Vegetable', 'Herb', 'Fruit'][Math.floor(Math.random() * 3)],
          plantingDate: plantingDate,
          expectedHarvestDate: harvestDate,
          healthStatus: ['HEALTHY', 'NEEDS_WATER', 'HEALTHY', 'HEALTHY', 'HARVEST_READY'][Math.floor(Math.random() * 5)],
          notes: `Growing well in ${['full sun', 'partial shade'][Math.floor(Math.random() * 2)]} location.`,
          lastWatered: new Date(),
          lastFertilized: new Date()
        }
      });
    }
  }
  console.log('Plant tracking entries created');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });