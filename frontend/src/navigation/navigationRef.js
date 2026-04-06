import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingNavigation = null;

export const queueNavigation = (screen, params) => {
  if (!screen) return;

  if (navigationRef.isReady()) {
    navigationRef.navigate(screen, params);
    return;
  }

  pendingNavigation = { screen, params };
};

export const flushPendingNavigation = () => {
  if (!pendingNavigation || !navigationRef.isReady()) {
    return;
  }

  const { screen, params } = pendingNavigation;
  pendingNavigation = null;
  navigationRef.navigate(screen, params);
};
