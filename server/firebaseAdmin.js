const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs   = require('fs');

if (!getApps().length) {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    // Development: read from local file
    const serviceAccount = require(keyPath);
    initializeApp({ credential: cert(serviceAccount) });
    console.log('Firebase Admin: loaded from serviceAccountKey.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production (Render): read from env var
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase Admin: loaded from env var');
    } catch (e) {
      console.error('Firebase Admin: failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      initializeApp();
    }
  } else {
    console.error('Firebase Admin: no credentials — put serviceAccountKey.json in /server/');
    initializeApp();
  }
}

module.exports = getAuth;
