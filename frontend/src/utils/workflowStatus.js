const WORKFLOW_STATUS_LABELS = {
  donation_created: 'Donation Created',
  requested: 'Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  volunteer_assigned: 'Volunteer Assigned',
  pickup_started: 'Pickup Started',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const OPERATIONAL_STATUS_TO_WORKFLOW = {
  Available: 'donation_created',
  Pending: 'requested',
  Accepted: 'accepted',
  FindingVolunteer: 'accepted',
  WaitingForVolunteer: 'accepted',
  Assigned: 'volunteer_assigned',
  PickupStarted: 'pickup_started',
  PickedUp: 'picked_up',
  InTransit: 'in_transit',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Expired: 'expired',
};

export const getWorkflowStatusValue = (item) => (
  item?.workflowStatus
  || OPERATIONAL_STATUS_TO_WORKFLOW[item?.status]
  || ''
);

export const getWorkflowStatusLabel = (item) => {
  const workflowStatus = getWorkflowStatusValue(item);

  return (
    item?.workflowStatusLabel
    || WORKFLOW_STATUS_LABELS[workflowStatus]
    || String(item?.status || 'Active').replace(/([A-Z])/g, ' $1').trim()
  );
};

export const getWorkflowStatusTone = (item) => {
  const workflowStatus = getWorkflowStatusValue(item);

  if (workflowStatus === 'delivered') {
    return { color: '#1565C0', backgroundColor: '#EAF2FF' };
  }

  if (workflowStatus === 'cancelled' || workflowStatus === 'rejected' || workflowStatus === 'expired') {
    return { color: '#B42318', backgroundColor: '#FDECEC' };
  }

  if (workflowStatus === 'requested' || workflowStatus === 'accepted') {
    return { color: '#B54708', backgroundColor: '#FFF5E5' };
  }

  return { color: '#1F8F43', backgroundColor: '#EAF8EF' };
};

export const getNextVolunteerStatuses = (status) => {
  if (status === 'Assigned') return ['PickupStarted'];
  if (status === 'PickupStarted') return ['PickedUp'];
  if (status === 'PickedUp') return ['InTransit'];
  if (status === 'InTransit') return ['Delivered'];
  return [];
};

export const getVolunteerActionLabel = (status) => {
  if (status === 'Assigned') return 'Start Pickup';
  if (status === 'PickupStarted') return 'Confirm Pickup';
  if (status === 'PickedUp') return 'Mark In Transit';
  if (status === 'InTransit') return 'Confirm Delivery';
  return 'Update Status';
};
