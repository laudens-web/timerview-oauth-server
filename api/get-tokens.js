const { sessions } = require('./callback');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { session } = req.query;

  if (!session) {
    return res.status(400).json({ error: 'Missing session ID' });
  }

  const tokenData = sessions.get(session);

  if (!tokenData) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  sessions.delete(session);

  return res.status(200).json({
    access_token: tokenData.accessToken,
    refresh_token: tokenData.refreshToken,
    expires_in: tokenData.expiresIn,
    realm_id: tokenData.realmId
  });
};
