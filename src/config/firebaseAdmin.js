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

// `data` lets the app know what to do when the notification is tapped
// (e.g. { type: 'review_prompt', orderId: '...' }). FCM requires all data
// values to be strings, so we stringify everything before sending.
async function sendPushNotification(fcmToken, title, body, data = {}) {
  initFirebaseAdmin();
  if (!initialized || !fcmToken) return;

  try {
    const stringifiedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    );

    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      data: stringifiedData,
      android: {
        notification: { color: '#D4AF37' },
      },
    });
  } catch (error) {
    console.error('Push notification error:', error.message);
  }
}

module.exports = { sendPushNotification };