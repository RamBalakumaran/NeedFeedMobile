const Food = require('../models/Food');
const User = require('../models/User');
const Request = require('../models/Request');
const { notifyUsers } = require('../utils/notifications');
const {
  WORKFLOW_STATUSES,
  applyWorkflowStatus,
  deriveWorkflowStatusFromFood,
  toWorkflowStatusLabel,
} = require('../utils/workflowStatus');

const NGO_NOTIFICATION_RADIUS_METERS = Number(process.env.NGO_NOTIFICATION_RADIUS_METERS || 25000);

const notify = async (req, config) => {
  const io = req.app.get('socketio');
  await notifyUsers({ io, ...config });
};

const buildActorSnapshot = (user, fallbackRole = '') => ({
  id: user?._id || user?.id || null,
  role: user?.role || fallbackRole || '',
  name: user?.organizationName || user?.name || 'User',
});

const isValidGeoPoint = (location) => (
  Array.isArray(location?.coordinates)
  && location.coordinates.length === 2
  && location.coordinates.every((value) => Number.isFinite(Number(value)))
);

const getNgoCategoryPreferences = (foodType = '') => {
  if (foodType === 'Non-Veg') {
    return ['Non-Veg', 'Both'];
  }

  return ['Veg', 'Both'];
};

const getEligibleNgoRecipientIds = async (_req, food) => {
  const query = {
    role: 'ngo',
    _id: { $ne: food?.donor },
    $or: [
      { ngoAcceptedCategory: { $in: getNgoCategoryPreferences(food?.foodType) } },
      { ngoAcceptedCategory: { $exists: false } },
      { ngoAcceptedCategory: null },
      { ngoAcceptedCategory: '' },
    ],
  };

  if (isValidGeoPoint(food?.location)) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: food.location.coordinates.map(Number),
        },
        $maxDistance: NGO_NOTIFICATION_RADIUS_METERS,
      },
    };
  }

  const candidates = await User.find(query).select('_id');
  return candidates.map((ngo) => ngo._id);
};

const syncWorkflowOnFood = (food, workflowStatus, actor, note = '') => {
  if (!food) return;
  applyWorkflowStatus(food, { status: workflowStatus, actor, note });
};

const syncWorkflowOnRequest = (requestDoc, workflowStatus, actor, note = '') => {
  if (!requestDoc) return;
  applyWorkflowStatus(requestDoc, { status: workflowStatus, actor, note });
};

const getWorkflowMeta = (food, requestDoc = null) => {
  const workflowStatus = food?.workflowStatus
    || requestDoc?.workflowStatus
    || deriveWorkflowStatusFromFood(food);

  return {
    workflowStatus,
    workflowStatusLabel: toWorkflowStatusLabel(workflowStatus),
    statusHistory: food?.statusHistory || requestDoc?.statusHistory || [],
  };
};

const upsertRequestForDonation = async ({
  donationId,
  ngoId,
  requestDoc = null,
  status,
  workflowStatus,
  actor,
  note = '',
  updates = {},
}) => {
  const nextRequest = requestDoc || await Request.findOne({ donation: donationId }) || new Request({
    donation: donationId,
    ngo: ngoId,
  });

  nextRequest.ngo = ngoId || nextRequest.ngo;
  nextRequest.donation = donationId;
  Object.assign(nextRequest, updates);

  if (status) {
    nextRequest.status = status;
  }

  if (workflowStatus) {
    syncWorkflowOnRequest(nextRequest, workflowStatus, actor, note);
  }

  await nextRequest.save();
  return nextRequest;
};

const getChatTerminationSummary = (requestDoc) => {
  if (!requestDoc?.chatTerminatedAt) {
    return null;
  }

  if (requestDoc.chatTerminatedBy && typeof requestDoc.chatTerminatedBy === 'object') {
    return {
      _id: requestDoc.chatTerminatedBy._id,
      name: requestDoc.chatTerminatedByName
        || requestDoc.chatTerminatedBy.organizationName
        || requestDoc.chatTerminatedBy.name
        || 'User',
      role: requestDoc.chatTerminatedByRole || requestDoc.chatTerminatedBy.role || '',
    };
  }

  if (!requestDoc.chatTerminatedByName) {
    return null;
  }

  return {
    _id: requestDoc.chatTerminatedBy || null,
    name: requestDoc.chatTerminatedByName,
    role: requestDoc.chatTerminatedByRole || '',
  };
};

const enrichFoodsWithRequestMeta = async (foods) => {
  if (!foods.length) {
    return [];
  }

  const requests = await Request.find({
    donation: { $in: foods.map((food) => food._id) },
  })
    .populate('chatTerminatedBy', 'name organizationName role')
    .lean();

  const requestByDonationId = new Map(
    requests.map((requestDoc) => [String(requestDoc.donation), requestDoc])
  );

  return foods.map((food) => {
    const requestDoc = requestByDonationId.get(String(food._id));
    const serializedFood = typeof food.toObject === 'function' ? food.toObject() : food;
    const workflowMeta = getWorkflowMeta(serializedFood, requestDoc);

    return {
      ...serializedFood,
      requestStatus: requestDoc?.status || serializedFood.status,
      ...workflowMeta,
      chatStatus: requestDoc?.chatStatus || 'active',
      chatTerminatedAt: requestDoc?.chatTerminatedAt || null,
      chatTerminatedBy: getChatTerminationSummary(requestDoc),
    };
  });
};

const toRadians = (degree) => (degree * Math.PI) / 180;
const calculateDistanceMeters = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMeters = 6371000;
  return earthRadiusMeters * c;
};

const findAvailableVolunteer = async ({ foodLocation, ngoLocation, maxDistance = 10000 }) => {
  const midpoint = [
    (foodLocation.coordinates[0] + ngoLocation.coordinates[0]) / 2,
    (foodLocation.coordinates[1] + ngoLocation.coordinates[1]) / 2,
  ];

  const activeVolunteerIds = await Request.find({
    status: { $in: ['FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit'] },
    volunteer: { $ne: null },
  }).distinct('volunteer');

  const volunteers = await User.find({
    role: 'volunteer',
    isAvailable: true,
    _id: { $nin: activeVolunteerIds },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: midpoint },
        $maxDistance: maxDistance,
      },
    },
  });

  let bestVolunteer = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const volunteer of volunteers) {
    const volunteerCoords = volunteer.location?.coordinates;
    if (!Array.isArray(volunteerCoords) || volunteerCoords.length !== 2) continue;

    const donorDistance = calculateDistanceMeters(volunteerCoords, foodLocation.coordinates);
    const ngoDistance = calculateDistanceMeters(volunteerCoords, ngoLocation.coordinates);
    if (donorDistance > maxDistance || ngoDistance > maxDistance) continue;

    const score = donorDistance + ngoDistance;
    if (score < bestScore) {
      bestScore = score;
      bestVolunteer = volunteer;
    }
  }

  return bestVolunteer;
};

const CATEGORY_SHELF_LIFE_HOURS = {
  Raw: 168,
  Bakery: 24,
  Cooked: 4,
  Packed: 4,
};

const DASHBOARD_LEADERBOARD_LIMIT = 5;
const FEEDBACK_SLIDER_LIMIT = 10;
const PENDING_FEEDBACK_LIMIT = 5;

const getDayRange = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getUserDisplayName = (user) => (
  user?.organizationName
  || user?.name
  || 'Community Member'
);

const getRoleOwnerKey = (role) => {
  if (role === 'donor') return 'donor';
  if (role === 'ngo') return 'requestedBy';
  if (role === 'volunteer') return 'assignedVolunteer';
  return '';
};

const getPendingFeedbackQuery = (userId, role) => {
  const ownerKey = getRoleOwnerKey(role);
  if (!ownerKey) return null;

  return {
    status: 'Delivered',
    [ownerKey]: userId,
    [`feedback.${role}.submittedAt`]: { $exists: false },
  };
};

const mapUserPreview = (user, roleFallback = '') => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    name: getUserDisplayName(user),
    role: user.role || roleFallback,
    city: user.city || '',
    profileImage: user.profileImage || '',
  };
};

const mapFeedbackCard = (food, role) => {
  const feedbackEntry = food?.feedback?.[role];
  if (!feedbackEntry?.submittedAt) {
    return null;
  }

  const author = role === 'donor'
    ? food.donor
    : role === 'ngo'
      ? food.requestedBy
      : food.assignedVolunteer;

  return {
    id: `${food._id}:${role}`,
    donationId: food._id,
    donationTitle: food.title,
    role,
    rating: feedbackEntry.rating,
    comment: feedbackEntry.comment || '',
    submittedAt: feedbackEntry.submittedAt,
    author: mapUserPreview(author, role),
  };
};

const buildExpiryTime = (category, preparationTime = new Date()) => {
  const baseTime = new Date(preparationTime);
  const hoursToAdd = CATEGORY_SHELF_LIFE_HOURS[category] || 4;
  const expiryTime = new Date(baseTime);
  expiryTime.setHours(expiryTime.getHours() + hoursToAdd);
  return expiryTime;
};

exports.donateFood = async (req, res) => {
  try {
    const {
      category,
      latitude,
      longitude,
    } = req.body;

    const prepTime = new Date();
    const expiryTime = buildExpiryTime(category, prepTime);

    const donor = await User.findById(req.user.id).select('name role organizationName');
    const actor = buildActorSnapshot(donor, 'donor');

    const newFood = new Food({
      ...req.body,
      expiryTime,
      imageUrl: req.file ? req.file.path : '',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      donor: req.user.id,
    });
    syncWorkflowOnFood(
      newFood,
      WORKFLOW_STATUSES.DONATION_CREATED,
      actor,
      'Donation created and published for eligible NGOs.'
    );

    await newFood.save();
    const eligibleNgoIds = await getEligibleNgoRecipientIds(req, newFood);

    await notify(req, {
      userIds: eligibleNgoIds,
      excludeUserIds: [req.user.id],
      type: 'food_posted',
      title: 'New Food Donation Available',
      body: 'A donor has posted a new food donation near your location.',
      data: {
        screen: 'AvailableFood',
        foodId: String(newFood._id),
        workflowStatus: newFood.workflowStatus,
        donationTitle: newFood.title,
      },
    });

    res.status(201).json({ success: true, food: newFood });
  } catch (error) {
    console.error('Donate food error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getAvailableFood = async (req, res) => {
  try {
    const foods = await Food.find({
      expiryTime: { $gt: new Date() },
      status: 'Available',
    })
      .populate('donor', 'name organizationName phone address city')
      .sort({ createdAt: -1 });
    res.json(foods.map((food) => ({
      ...(typeof food.toObject === 'function' ? food.toObject() : food),
      ...getWorkflowMeta(food),
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.requestFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).populate('donor', 'name');
    if (!food || food.status !== 'Available') {
      return res.status(400).json({ message: 'Unavailable' });
    }

    const ngo = await User.findById(req.user.id).select('name organizationName');
    const actor = buildActorSnapshot({ ...ngo?.toObject?.(), _id: req.user.id, role: 'ngo' }, 'ngo');

    food.status = 'Pending';
    food.requestedBy = req.user.id;
    syncWorkflowOnFood(food, WORKFLOW_STATUSES.REQUESTED, actor, 'NGO submitted a donation request.');
    await food.save();
    await upsertRequestForDonation({
      donationId: food._id,
      ngoId: req.user.id,
      status: 'Pending',
      workflowStatus: WORKFLOW_STATUSES.REQUESTED,
      actor,
      note: 'NGO submitted a donation request.',
      updates: {
        volunteer: null,
        assignedAt: null,
        chatStatus: 'active',
        chatTerminatedAt: null,
        chatTerminatedBy: null,
        chatTerminatedByRole: '',
        chatTerminatedByName: '',
      },
    });

    await notify(req, {
      userIds: [food.donor?._id || food.donor],
      type: 'ngo_request',
      title: 'New Request for Your Donation',
      body: 'An NGO has requested your food donation.',
      data: {
        screen: 'DonorRequests',
        foodId: String(food._id),
        workflowStatus: food.workflowStatus,
      },
    });

    res.json(food);
  } catch (error) {
    console.error('Request food error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getNGORequests = async (req, res) => {
  try {
    const foods = await Food.find({ requestedBy: req.user.id })
      .populate('donor', 'name phone address')
      .populate('requestedBy', 'name phone address organizationName')
      .populate('assignedVolunteer', 'name phone address vehicleType')
      .sort({ createdAt: -1 });
    const enrichedFoods = await enrichFoodsWithRequestMeta(foods);
    res.json(enrichedFoods);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getDonorRequests = async (req, res) => {
  try {
    const foods = await Food.find({ donor: req.user.id, status: { $ne: 'Available' } })
      .populate('donor', 'name phone address')
      .populate('requestedBy', 'name phone address organizationName')
      .populate('assignedVolunteer', 'name phone address vehicleType')
      .sort({ createdAt: -1 });
    const enrichedFoods = await enrichFoodsWithRequestMeta(foods);
    res.json(enrichedFoods);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.respondToNGORequest = async (req, res) => {
  const { action } = req.body;
  const foodId = req.params.id;

  try {
    const food = await Food.findById(foodId)
      .populate('requestedBy', 'name organizationName location')
      .populate('donor', 'name');
    let requestDoc = await Request.findOne({ donation: foodId });

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const actor = buildActorSnapshot({ ...food.donor?.toObject?.(), role: 'donor' }, 'donor');

    if (action === 'reject') {
      const ngoId = food.requestedBy?._id || food.requestedBy;
      const ngoName = food.requestedBy?.organizationName || food.requestedBy?.name || 'NGO';

      food.status = 'Available';
      food.requestedBy = null;
      food.assignedVolunteer = null;
      syncWorkflowOnFood(food, WORKFLOW_STATUSES.REJECTED, actor, 'Donor rejected the NGO request.');
      syncWorkflowOnFood(food, WORKFLOW_STATUSES.DONATION_CREATED, actor, 'Donation is available for a new NGO request.');
      await food.save();
      requestDoc = await upsertRequestForDonation({
        donationId: foodId,
        ngoId,
        requestDoc,
        status: 'Rejected',
        workflowStatus: WORKFLOW_STATUSES.REJECTED,
        actor,
        note: 'Donor rejected the NGO request.',
        updates: {
          volunteer: null,
          assignedAt: null,
          chatStatus: 'terminated',
          chatTerminatedAt: new Date(),
          chatTerminatedBy: req.user.id,
          chatTerminatedByRole: 'donor',
          chatTerminatedByName: food.donor?.name || 'Donor',
        },
      });

      await notify(req, {
        userIds: [ngoId],
        type: 'request_rejected',
        title: 'Request rejected',
        body: `${food.donor?.name || 'Donor'} rejected ${ngoName}'s request for ${food.title}.`,
        data: {
          screen: 'AvailableFood',
          foodId: String(food._id),
          workflowStatus: requestDoc.workflowStatus,
        },
      });

      return res.json({ message: 'Request Rejected' });
    }

    food.status = 'FindingVolunteer';
    syncWorkflowOnFood(food, WORKFLOW_STATUSES.ACCEPTED, actor, 'Donor accepted the NGO request.');
    await food.save();
    requestDoc = await upsertRequestForDonation({
      donationId: foodId,
      ngoId: food.requestedBy?._id || food.requestedBy,
      requestDoc,
      status: 'FindingVolunteer',
      workflowStatus: WORKFLOW_STATUSES.ACCEPTED,
      actor,
      note: 'Donor accepted the NGO request.',
      updates: {
        volunteer: null,
        assignedAt: null,
      },
    });

    const ngoLocation = food.requestedBy?.location || food.location;
    const selectedVolunteer = await findAvailableVolunteer({
      foodLocation: food.location,
      ngoLocation,
      maxDistance: 10000,
    });

    if (selectedVolunteer) {
      food.assignedVolunteer = selectedVolunteer._id;
      food.status = 'Assigned';
      syncWorkflowOnFood(
        food,
        WORKFLOW_STATUSES.VOLUNTEER_ASSIGNED,
        actor,
        `Volunteer ${selectedVolunteer.name} assigned for pickup.`
      );
      await food.save();

      requestDoc = await upsertRequestForDonation({
        donationId: foodId,
        ngoId: food.requestedBy?._id || food.requestedBy,
        requestDoc,
        status: 'Assigned',
        workflowStatus: WORKFLOW_STATUSES.VOLUNTEER_ASSIGNED,
        actor,
        note: `Volunteer ${selectedVolunteer.name} assigned for pickup.`,
        updates: {
          volunteer: selectedVolunteer._id,
          assignedAt: new Date(),
        },
      });

      selectedVolunteer.isAvailable = false;
      await selectedVolunteer.save();

      await notify(req, {
        userIds: [selectedVolunteer._id],
        type: 'volunteer_assigned',
        title: 'Pickup Assigned',
        body: 'You have been assigned to pick up a donation.',
        data: {
          screen: 'VolunteerDashboard',
          foodId: String(food._id),
          workflowStatus: food.workflowStatus,
        },
      });

      await notify(req, {
        userIds: [food.requestedBy?._id || food.requestedBy],
        type: 'request_accepted',
        title: 'Donation Request Accepted',
        body: 'Your request has been accepted by the donor.',
        data: {
          screen: 'NGODashboard',
          foodId: String(food._id),
          workflowStatus: requestDoc.workflowStatus,
        },
      });

      await notify(req, {
        userIds: [food.donor?._id || food.donor],
        type: 'volunteer_assigned',
        title: 'Pickup Assigned',
        body: `Volunteer ${selectedVolunteer.name} has been assigned to this donation.`,
        data: {
          screen: 'DonorRequests',
          foodId: String(food._id),
          workflowStatus: food.workflowStatus,
        },
      });

      return res.json({
        message: `Volunteer ${selectedVolunteer.name} assigned!`,
        status: 'Assigned',
        volunteer: selectedVolunteer,
      });
    }

    food.status = 'WaitingForVolunteer';
    await food.save();
    requestDoc = await upsertRequestForDonation({
      donationId: foodId,
      ngoId: food.requestedBy?._id || food.requestedBy,
      requestDoc,
      status: 'WaitingForVolunteer',
      workflowStatus: WORKFLOW_STATUSES.ACCEPTED,
      actor,
      note: 'Donor accepted the request. Volunteer search is still in progress.',
      updates: {
        volunteer: null,
        assignedAt: null,
      },
    });

    await notify(req, {
      userIds: [food.requestedBy?._id || food.requestedBy],
      type: 'waiting_for_volunteer',
      title: 'Volunteer search in progress',
      body: `No volunteer is available now near this route. You can pick up directly or cancel the request.`,
      data: {
        screen: 'NGODashboard',
        foodId: String(food._id),
        workflowStatus: requestDoc.workflowStatus,
      },
    });

    return res.json({
      message: 'No volunteer available nearby. Please pick up directly or cancel the request.',
      status: 'WaitingForVolunteer',
    });
  } catch (error) {
    console.error('Respond to NGO request error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

exports.getVolunteerTasks = async (req, res) => {
  try {
    const tasks = await Food.find({ assignedVolunteer: req.user.id })
      .populate('donor', 'name phone address')
      .populate('requestedBy', 'name phone address organizationName')
      .populate('assignedVolunteer', 'name phone address vehicleType')
      .sort({ createdAt: -1 });

    const enrichedTasks = await enrichFoodsWithRequestMeta(tasks);
    res.json(enrichedTasks);
  } catch (error) {
    console.error('Volunteer tasks error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.cancelFoodRequest = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('donor', 'name')
      .populate('requestedBy', 'name organizationName')
      .populate('assignedVolunteer', 'name');

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    const donorId = String(food.donor?._id || food.donor || '');
    const ngoId = String(food.requestedBy?._id || food.requestedBy || '');
    const volunteerId = String(food.assignedVolunteer?._id || food.assignedVolunteer || '');
    const actorId = String(req.user.id);
    const isDonor = donorId === actorId;
    const isNgo = ngoId === actorId;

    if (!isDonor && !isNgo) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    const actorName = isDonor
      ? food.donor?.name || 'Donor'
      : food.requestedBy?.organizationName || food.requestedBy?.name || 'NGO';
    const actor = buildActorSnapshot({
      _id: req.user.id,
      role: isDonor ? 'donor' : 'ngo',
      name: actorName,
    }, isDonor ? 'donor' : 'ngo');
    let requestDoc = await Request.findOne({ donation: food._id });

    if (volunteerId) {
      await User.findByIdAndUpdate(volunteerId, { isAvailable: true });
    }

    food.status = 'Available';
    food.requestedBy = null;
    food.assignedVolunteer = null;
    syncWorkflowOnFood(food, WORKFLOW_STATUSES.CANCELLED, actor, `${actorName} cancelled the request.`);
    syncWorkflowOnFood(food, WORKFLOW_STATUSES.DONATION_CREATED, actor, 'Donation returned to the available list.');
    await food.save();
    requestDoc = await upsertRequestForDonation({
      donationId: food._id,
      ngoId: ngoId || requestDoc?.ngo,
      requestDoc,
      status: 'Cancelled',
      workflowStatus: WORKFLOW_STATUSES.CANCELLED,
      actor,
      note: `${actorName} cancelled the request.`,
      updates: {
        volunteer: null,
      },
    });

    await notify(req, {
      userIds: [donorId, ngoId, volunteerId],
      excludeUserIds: [actorId],
      type: 'request_cancelled',
      title: 'Request cancelled',
      body: `${actorName} cancelled the request for ${food.title}.`,
      data: {
        screen: 'Home',
        foodId: String(food._id),
        workflowStatus: requestDoc.workflowStatus,
      },
    });

    res.json({ success: true, food });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.directPickupRequest = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('requestedBy', 'name organizationName')
      .populate('donor', 'name');
    let requestDoc = await Request.findOne({ donation: req.params.id });

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    if (String(food.requestedBy?._id || food.requestedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the requesting NGO can confirm direct pickup' });
    }

    if (!['WaitingForVolunteer', 'FindingVolunteer'].includes(food.status)) {
      return res.status(400).json({ message: 'Direct pickup is not available for this request' });
    }

    if (food.assignedVolunteer) {
      return res.status(400).json({ message: 'A volunteer has already been assigned to this request' });
    }

    const actor = buildActorSnapshot({
      _id: req.user.id,
      role: 'ngo',
      name: food.requestedBy?.organizationName || food.requestedBy?.name || 'NGO',
    }, 'ngo');

    food.status = 'Delivered';
    food.deliveredAt = new Date();
    syncWorkflowOnFood(food, WORKFLOW_STATUSES.DELIVERED, actor, 'NGO completed direct pickup.');
    await food.save();
    requestDoc = await upsertRequestForDonation({
      donationId: food._id,
      ngoId: food.requestedBy?._id || food.requestedBy,
      requestDoc,
      status: 'Completed',
      workflowStatus: WORKFLOW_STATUSES.DELIVERED,
      actor,
      note: 'NGO completed direct pickup.',
    });

    await notify(req, {
      userIds: [food.donor?._id || food.donor, food.requestedBy?._id || food.requestedBy],
      type: 'food_delivered',
      title: 'Donation Delivered',
      body: 'The donation has been successfully delivered.',
      data: {
        screen: 'MyDonations',
        foodId: String(food._id),
        workflowStatus: requestDoc.workflowStatus,
      },
    });

    return res.json({ message: 'Direct pickup confirmed and request completed.', food });
  } catch (error) {
    console.error('Direct pickup request error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateVolunteerTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const food = await Food.findById(req.params.id)
      .populate('donor', 'name')
      .populate('requestedBy', 'name organizationName')
      .populate('assignedVolunteer', 'name');
    let requestDoc = await Request.findOne({ donation: req.params.id });

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    if (String(food.assignedVolunteer?._id || food.assignedVolunteer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this task' });
    }

    const transitionMap = {
      Assigned: ['PickupStarted'],
      PickupStarted: ['PickedUp'],
      PickedUp: ['InTransit'],
      InTransit: ['Delivered'],
    };
    const statusConfigByValue = {
      PickupStarted: {
        workflowStatus: WORKFLOW_STATUSES.PICKUP_STARTED,
        requestStatus: 'PickupStarted',
        type: 'pickup_started',
        title: 'Pickup Started',
        body: 'Pickup has started for this donation.',
        note: 'Volunteer started the pickup.',
      },
      PickedUp: {
        workflowStatus: WORKFLOW_STATUSES.PICKED_UP,
        requestStatus: 'PickedUp',
        type: 'food_picked_up',
        title: 'Donation Picked Up',
        body: 'The donation has been picked up successfully.',
        note: 'Volunteer picked up the donation.',
      },
      InTransit: {
        workflowStatus: WORKFLOW_STATUSES.IN_TRANSIT,
        requestStatus: 'InTransit',
        type: 'in_transit',
        title: 'Donation In Transit',
        body: 'The donation is on the way to the NGO.',
        note: 'Volunteer is on the way to deliver the donation.',
      },
      Delivered: {
        workflowStatus: WORKFLOW_STATUSES.DELIVERED,
        requestStatus: 'Completed',
        type: 'food_delivered',
        title: 'Donation Delivered',
        body: 'The donation has been successfully delivered.',
        note: 'Volunteer delivered the donation.',
      },
    };

    const allowedNextStatuses = transitionMap[food.status] || [];
    if (!allowedNextStatuses.includes(status) || !statusConfigByValue[status]) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const actor = buildActorSnapshot({
      _id: req.user.id,
      role: 'volunteer',
      name: food.assignedVolunteer?.name || 'Volunteer',
    }, 'volunteer');
    const nextStatusConfig = statusConfigByValue[status];

    food.status = status;
    if (status === 'Delivered') {
      food.deliveredAt = new Date();
    }
    syncWorkflowOnFood(food, nextStatusConfig.workflowStatus, actor, nextStatusConfig.note);
    await food.save();

    if (status === 'Delivered') {
      await User.findByIdAndUpdate(req.user.id, { isAvailable: true });
    }

    requestDoc = await upsertRequestForDonation({
      donationId: food._id,
      ngoId: food.requestedBy?._id || food.requestedBy || requestDoc?.ngo,
      requestDoc,
      status: nextStatusConfig.requestStatus,
      workflowStatus: nextStatusConfig.workflowStatus,
      actor,
      note: nextStatusConfig.note,
      updates: status === 'Delivered' ? {} : { volunteer: food.assignedVolunteer?._id || food.assignedVolunteer },
    });

    const recipientIds = [
      food.donor?._id || food.donor,
      food.requestedBy?._id || food.requestedBy,
      food.assignedVolunteer?._id || food.assignedVolunteer,
    ];

    await notify(req, {
      userIds: recipientIds,
      type: nextStatusConfig.type,
      title: nextStatusConfig.title,
      body: nextStatusConfig.body,
      data: {
        foodId: String(food._id),
        requestId: String(food._id),
        workflowStatus: requestDoc.workflowStatus,
      },
    });

    res.json({ success: true, food });
  } catch (error) {
    console.error('Volunteer status update error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (String(food.donor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to edit this donation' });
    }

    if (food.status !== 'Available') {
      return res.status(400).json({ message: 'Only available donations can be edited' });
    }

    if (new Date(food.expiryTime) <= new Date()) {
      return res.status(400).json({ message: 'Expired donations cannot be edited' });
    }

    const allowedFields = ['title', 'quantity', 'description', 'foodType', 'category', 'storageInstruction'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        food[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    });

    if (!food.title || !food.quantity || !food.foodType || !food.category) {
      return res.status(400).json({ message: 'Missing required donation details' });
    }

    if (req.file?.path) {
      food.imageUrl = req.file.path;
    }

    food.expiryTime = buildExpiryTime(food.category, food.preparationTime);
    await food.save();

    res.json({ success: true, food });
  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getMyDonations = async (req, res) => {
  try {
    const { donorId } = req.params;
    const foods = await Food.find({ donor: donorId }).sort({ createdAt: -1 });
    res.json(foods.map((food) => ({
      ...(typeof food.toObject === 'function' ? food.toObject() : food),
      ...getWorkflowMeta(food),
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getHomeOverview = async (req, res) => {
  try {
    const { start, end } = getDayRange();
    const activeVolunteerIds = await Food.distinct('assignedVolunteer', {
      assignedVolunteer: { $ne: null },
      $or: [
        { status: { $in: ['Assigned', 'PickupStarted', 'PickedUp', 'InTransit'] } },
        { status: 'Delivered', deliveredAt: { $gte: start, $lt: end } },
      ],
    });

    const [todaysDonations, todaysDeliveries, topDonors, topVolunteers, feedbackFoods, pendingFeedback] = await Promise.all([
      Food.countDocuments({
        createdAt: { $gte: start, $lt: end },
      }),
      Food.countDocuments({
        status: 'Delivered',
        deliveredAt: { $gte: start, $lt: end },
      }),
      Food.aggregate([
        {
          $group: {
            _id: '$donor',
            totalPosts: { $sum: 1 },
            deliveredPosts: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
            livePosts: {
              $sum: {
                $cond: [
                  {
                    $in: ['$status', ['Available', 'Pending', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit']],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { deliveredPosts: -1, totalPosts: -1 } },
        { $limit: DASHBOARD_LEADERBOARD_LIMIT },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$user._id',
            name: '$user.name',
            organizationName: '$user.organizationName',
            city: '$user.city',
            profileImage: '$user.profileImage',
            donorType: '$user.donorType',
            totalPosts: 1,
            deliveredPosts: 1,
            livePosts: 1,
          },
        },
      ]),
      Food.aggregate([
        { $match: { assignedVolunteer: { $ne: null } } },
        {
          $group: {
            _id: '$assignedVolunteer',
            totalAssignments: { $sum: 1 },
            deliveredAssignments: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
            liveAssignments: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['Assigned', 'PickupStarted', 'PickedUp', 'InTransit']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { deliveredAssignments: -1, totalAssignments: -1 } },
        { $limit: DASHBOARD_LEADERBOARD_LIMIT },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$user._id',
            name: '$user.name',
            city: '$user.city',
            profileImage: '$user.profileImage',
            preferredArea: '$user.preferredArea',
            vehicleType: '$user.vehicleType',
            totalAssignments: 1,
            deliveredAssignments: 1,
            liveAssignments: 1,
          },
        },
      ]),
      Food.find({
        status: 'Delivered',
        $or: [
          { 'feedback.ngo.submittedAt': { $exists: true } },
          { 'feedback.donor.submittedAt': { $exists: true } },
          { 'feedback.volunteer.submittedAt': { $exists: true } },
        ],
      })
        .populate('donor', 'name organizationName city role profileImage')
        .populate('requestedBy', 'name organizationName city role profileImage')
        .populate('assignedVolunteer', 'name organizationName city role profileImage')
        .sort({ deliveredAt: -1, createdAt: -1 })
        .limit(FEEDBACK_SLIDER_LIMIT),
      (() => {
        const pendingQuery = getPendingFeedbackQuery(req.user.id, req.user.role);
        if (!pendingQuery) {
          return Promise.resolve([]);
        }

        return Food.find(pendingQuery)
          .populate('donor', 'name organizationName city role profileImage')
          .populate('requestedBy', 'name organizationName city role profileImage')
          .populate('assignedVolunteer', 'name organizationName city role profileImage')
          .sort({ deliveredAt: -1, createdAt: -1 })
          .limit(PENDING_FEEDBACK_LIMIT);
      })(),
    ]);

    const ngoFeedback = feedbackFoods
      .map((food) => mapFeedbackCard(food, 'ngo'))
      .filter(Boolean)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const recentFeedback = feedbackFoods
      .flatMap((food) => ['ngo', 'donor', 'volunteer'].map((role) => mapFeedbackCard(food, role)))
      .filter(Boolean)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, FEEDBACK_SLIDER_LIMIT);

    res.json({
      today: {
        donations: todaysDonations,
        delivered: todaysDeliveries,
        activeVolunteers: activeVolunteerIds.length,
      },
      spotlight: {
        donors: topDonors.map((user) => ({
          userId: user.userId,
          name: user.organizationName || user.name,
          city: user.city || '',
          profileImage: user.profileImage || '',
          donorType: user.donorType || '',
          totalPosts: user.totalPosts,
          deliveredPosts: user.deliveredPosts,
          livePosts: user.livePosts,
        })),
        volunteers: topVolunteers.map((user) => ({
          userId: user.userId,
          name: user.name,
          city: user.city || '',
          profileImage: user.profileImage || '',
          preferredArea: user.preferredArea || '',
          vehicleType: user.vehicleType || '',
          totalAssignments: user.totalAssignments,
          deliveredAssignments: user.deliveredAssignments,
          liveAssignments: user.liveAssignments,
        })),
      },
      feedback: {
        ngo: ngoFeedback,
        recent: recentFeedback,
      },
      pendingFeedback: pendingFeedback.map((food) => ({
        _id: food._id,
        title: food.title,
        deliveredAt: food.deliveredAt || food.createdAt,
        donor: mapUserPreview(food.donor, 'donor'),
        ngo: mapUserPreview(food.requestedBy, 'ngo'),
        volunteer: mapUserPreview(food.assignedVolunteer, 'volunteer'),
      })),
    });
  } catch (error) {
    console.error('Home overview error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.submitDeliveryFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const normalizedRating = Number(rating);
    const normalizedComment = String(comment || '').trim();

    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    if (normalizedComment.length < 5) {
      return res.status(400).json({ message: 'Please enter at least 5 characters of feedback.' });
    }

    if (normalizedComment.length > 280) {
      return res.status(400).json({ message: 'Feedback must be 280 characters or less.' });
    }

    if (!['donor', 'ngo', 'volunteer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'This account cannot submit delivery feedback.' });
    }

    const food = await Food.findById(req.params.id)
      .populate('donor', 'name organizationName')
      .populate('requestedBy', 'name organizationName')
      .populate('assignedVolunteer', 'name organizationName');

    if (!food) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    if (food.status !== 'Delivered') {
      return res.status(400).json({ message: 'Feedback can only be added after delivery is completed.' });
    }

    const ownerKey = getRoleOwnerKey(req.user.role);
    const ownerId = String(food?.[ownerKey]?._id || food?.[ownerKey] || '');
    if (!ownerId || ownerId !== String(req.user.id)) {
      return res.status(403).json({ message: 'You are not allowed to review this delivery.' });
    }

    if (food?.feedback?.[req.user.role]?.submittedAt) {
      return res.status(400).json({ message: 'Feedback already submitted for this delivery.' });
    }

    food.set(`feedback.${req.user.role}`, {
      rating: normalizedRating,
      comment: normalizedComment,
      submittedAt: new Date(),
    });
    await food.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback: {
        role: req.user.role,
        rating: normalizedRating,
        comment: normalizedComment,
      },
    });
  } catch (error) {
    console.error('Submit delivery feedback error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
