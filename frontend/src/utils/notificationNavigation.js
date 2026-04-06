export const resolveNotificationTarget = (notification, role) => {
  const { type, data = {} } = notification || {};

  if (type === 'chat_message') {
    return {
      screen: 'Chat',
      params: {
        requestId: data.requestId,
        name: data.name || 'Chat',
        status: data.status || 'Active',
      },
    };
  }

  if (type === 'food_posted') return { screen: 'AvailableFood' };
  if (type === 'ngo_request') return { screen: 'DonorRequests' };
  if (type === 'request_accepted' || type === 'waiting_for_volunteer') return { screen: 'NGODashboard' };
  if (type === 'volunteer_assigned') {
    if (role === 'volunteer') return { screen: 'VolunteerDashboard' };
    if (role === 'ngo') return { screen: 'NGODashboard' };
    return { screen: 'DonorRequests' };
  }
  if (type === 'pickup_started' || type === 'food_picked_up' || type === 'in_transit') {
    if (role === 'volunteer') return { screen: 'VolunteerDashboard' };
    if (role === 'ngo') return { screen: 'NGODashboard' };
    return { screen: 'DonorRequests' };
  }
  if (type === 'food_delivered') {
    if (role === 'volunteer') return { screen: 'VolunteerDashboard' };
    return { screen: role === 'ngo' ? 'NGODashboard' : 'MyDonations' };
  }
  if (type === 'chat_terminated') {
    return { screen: role === 'ngo' ? 'NGODashboard' : 'DonorRequests' };
  }
  if (type === 'request_cancelled') {
    if (role === 'volunteer') return { screen: 'VolunteerDashboard' };
    return { screen: role === 'donor' ? 'DonorRequests' : 'AvailableFood' };
  }
  if (type === 'request_rejected') return { screen: 'AvailableFood' };

  return { screen: 'Home' };
};
