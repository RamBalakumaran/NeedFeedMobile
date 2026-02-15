const cron = require('node-cron');
const Request = require('../models/Request');
const Food = require('../models/Food');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running edge-case safety checks...');

  // TC_E03: Food Expiry Check
  const expiredFood = await Food.find({ expiryTime: { $lt: new Date() }, status: 'Available' });
  for (let food of expiredFood) {
    food.status = 'Expired';
    await food.save();
    // Notify Donor
  }

  // TC_E02: Volunteer Delay (If assigned but not picked up in 30 mins)
  const delayedPickups = await Request.find({
    status: 'Assigned',
    assignedAt: { $lt: new Date(Date.now() - 30 * 60000) }
  });
  for (let req of delayedPickups) {
    req.volunteer = null;
    req.status = 'FindingVolunteer'; // Re-assign
    await req.save();
    // Reduce Volunteer Reliability Score (TC_E02)
  }
});