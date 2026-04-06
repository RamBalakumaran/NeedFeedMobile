const WORKFLOW_STATUSES = Object.freeze({
  DONATION_CREATED: 'donation_created',
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  VOLUNTEER_ASSIGNED: 'volunteer_assigned',
  PICKUP_STARTED: 'pickup_started',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const WORKFLOW_STATUS_LABELS = {
  [WORKFLOW_STATUSES.DONATION_CREATED]: 'Donation Created',
  [WORKFLOW_STATUSES.REQUESTED]: 'Requested',
  [WORKFLOW_STATUSES.ACCEPTED]: 'Accepted',
  [WORKFLOW_STATUSES.REJECTED]: 'Rejected',
  [WORKFLOW_STATUSES.VOLUNTEER_ASSIGNED]: 'Volunteer Assigned',
  [WORKFLOW_STATUSES.PICKUP_STARTED]: 'Pickup Started',
  [WORKFLOW_STATUSES.PICKED_UP]: 'Picked Up',
  [WORKFLOW_STATUSES.IN_TRANSIT]: 'In Transit',
  [WORKFLOW_STATUSES.DELIVERED]: 'Delivered',
  [WORKFLOW_STATUSES.CANCELLED]: 'Cancelled',
  [WORKFLOW_STATUSES.EXPIRED]: 'Expired',
};

const toWorkflowStatusLabel = (status) => (
  WORKFLOW_STATUS_LABELS[status]
  || String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

const normalizeActor = (actor = {}) => ({
  id: actor?.id ? String(actor.id) : null,
  role: actor?.role || '',
  name: actor?.name || '',
});

const appendStatusHistory = (history = [], { status, actor, note = '' }) => {
  if (!status) {
    return Array.isArray(history) ? history : [];
  }

  const nextHistory = Array.isArray(history) ? [...history] : [];
  const nextEntry = {
    status,
    label: toWorkflowStatusLabel(status),
    note,
    actor: normalizeActor(actor),
    timestamp: new Date(),
  };
  const lastEntry = nextHistory[nextHistory.length - 1];

  if (lastEntry?.status === status) {
    nextHistory[nextHistory.length - 1] = {
      ...lastEntry,
      ...nextEntry,
    };
    return nextHistory;
  }

  nextHistory.push(nextEntry);
  return nextHistory;
};

const applyWorkflowStatus = (doc, { status, actor, note = '' }) => {
  if (!doc || !status) return;

  doc.workflowStatus = status;
  doc.statusHistory = appendStatusHistory(doc.statusHistory, {
    status,
    actor,
    note,
  });
};

const deriveWorkflowStatusFromFood = (food) => {
  switch (food?.status) {
    case 'Pending':
      return WORKFLOW_STATUSES.REQUESTED;
    case 'FindingVolunteer':
    case 'WaitingForVolunteer':
    case 'Accepted':
      return WORKFLOW_STATUSES.ACCEPTED;
    case 'Assigned':
      return WORKFLOW_STATUSES.VOLUNTEER_ASSIGNED;
    case 'PickupStarted':
      return WORKFLOW_STATUSES.PICKUP_STARTED;
    case 'PickedUp':
      return WORKFLOW_STATUSES.PICKED_UP;
    case 'InTransit':
      return WORKFLOW_STATUSES.IN_TRANSIT;
    case 'Delivered':
      return WORKFLOW_STATUSES.DELIVERED;
    case 'Cancelled':
      return WORKFLOW_STATUSES.CANCELLED;
    case 'Expired':
      return WORKFLOW_STATUSES.EXPIRED;
    case 'Available':
    default:
      return WORKFLOW_STATUSES.DONATION_CREATED;
  }
};

module.exports = {
  WORKFLOW_STATUSES,
  applyWorkflowStatus,
  appendStatusHistory,
  deriveWorkflowStatusFromFood,
  toWorkflowStatusLabel,
};
