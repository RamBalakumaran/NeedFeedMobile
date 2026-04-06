const { expo } = require('./app.json');

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || expo.android?.googleServicesFile;
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  || expo.extra?.eas?.projectId
  || '684016f3-ef3e-43d9-b608-64f1169a1738';

module.exports = () => ({
  ...expo,
  android: {
    ...(expo.android || {}),
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  extra: {
    ...(expo.extra || {}),
    eas: {
      ...(expo.extra?.eas || {}),
      projectId,
    },
  },
});
