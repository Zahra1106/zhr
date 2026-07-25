const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let initialized = false;
let initFailed = false;

function initFirebaseAdmin() {
  if (initialized || initFailed) return;

  try {
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    initialized = true;
  } catch (error) {
    console.error('Firebase Admin init error:', error.message);
    initFailed = true;
  }
}

async function sendPushNotification(fcmToken, title, body) {
  initFirebaseAdmin();
  if (!initialized || !fcmToken) return;

  try {
    await getMessaging().send({
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