const cron = require('node-cron');
const Request = require('../models/Request');
const Food = require('../models/Food');
const { WORKFLOW_STATUSES, applyWorkflowStatus } = require('../utils/workflowStatus');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running edge-case safety checks...');

  // TC_E03: Food Expiry Check
  const expiredFood = await Food.find({ expiryTime: { $lt: new Date() }, status: 'Available' });
  for (let food of expiredFood) {
    food.status = 'Expired';
    applyWorkflowStatus(food, {
      status: WORKFLOW_STATUSES.EXPIRED,
      note: 'Donation expired before it was claimed.',
    });
    await food.save();
    // Notify Donor
  }

  // TC_E02: Volunteer Delay (If assigned but not picked up in 30 mins)
  const delayedPickups = await Request.find({
    status: { $in: ['Assigned', 'PickupStarted'] },
    assignedAt: { $lt: new Date(Date.now() - 30 * 60000) }
  });
  for (let req of delayedPickups) {
    req.volunteer = null;
    req.status = 'FindingVolunteer'; // Re-assign
    applyWorkflowStatus(req, {
      status: WORKFLOW_STATUSES.ACCEPTED,
      note: 'Volunteer reassignment triggered after a pickup delay.',
    });
    await req.save();
    await Food.findByIdAndUpdate(req.donation, {
      status: 'FindingVolunteer',
      workflowStatus: WORKFLOW_STATUSES.ACCEPTED,
    });
    // Reduce Volunteer Reliability Score (TC_E02)
  }
});
