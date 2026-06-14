const getAuth = require('../firebaseAdmin');

module.exports = async function verifyFirebaseToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  try {
    const decoded = await getAuth().verifyIdToken(header.split(' ')[1]);
    req.firebaseUid  = decoded.uid;
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
