const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let firebaseDisabledLogged = false;

const resolveServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      console.error('Firebase service account JSON parse failed:', error.message);
      return null;
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const absolutePath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.join(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

      return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    } catch (error) {
      console.error('Firebase service account file read failed:', error.message);
      return null;
    }
  }

  return null;
};

const getFirebaseApp = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    if (!firebaseDisabledLogged) {
      console.log('Firebase Admin not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to enable FCM.');
      firebaseDisabledLogged = true;
    }
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    return null;
  }
};

const getFirebaseMessaging = () => {
  const app = getFirebaseApp();
  return app ? admin.messaging(app) : null;
};

module.exports = {
  getFirebaseMessaging,
};
