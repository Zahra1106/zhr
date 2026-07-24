const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  } catch (error) {
    console.error('Firebase Admin init error:', error.message);
  }
}

async function sendPushNotification(fcmToken, title, body) {
  initFirebaseAdmin();
  if (!fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      android: {
        notification: { color: '#D4AF37' },
      },
    });
  } catch (error) {
    console.error('Push notification error:', error.message);
  }
}

module.exports = { sendPushNotification };