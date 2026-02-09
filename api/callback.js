const fetch = require('node-fetch');
const sessions = new Map();

module.exports = async (req, res) => {
  const { code, state, realmId, error } = req.query;

  if (error) {
    return res.redirect(`timerview://oauth-callback?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !realmId) {
    return res.redirect('timerview://oauth-callback?error=missing_parameters');
  }

  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Server configuration error');
    }

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    const sessionId = generateSessionId();
    
    sessions.set(sessionId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      realmId: realmId,
      timestamp: Date.now()
    });

    cleanupOldSessions();
    console.log('✅ OAuth successful, session:', sessionId);

    return res.redirect(`timerview://oauth-callback?session=${sessionId}&realmId=${realmId}&state=${state}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`timerview://oauth-callback?error=${encodeURIComponent(error.message)}`);
  }
};

function generateSessionId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function cleanupOldSessions() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [sessionId, data] of sessions.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      sessions.delete(sessionId);
    }
  }
}

module.exports.sessions = sessions;
