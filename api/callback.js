const fetch = require('node-fetch');

// Store tokens in the redirect URL itself (encrypted in query params)
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
      console.error('Missing environment variables:', { clientId: !!clientId, clientSecret: !!clientSecret, redirectUri: !!redirectUri });
      throw new Error('Server configuration error');
    }

    console.log('🔄 Exchanging authorization code for tokens...');

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
      console.error('❌ Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    
    console.log('✅ OAuth successful!');

    // Encode tokens in URL (they'll be passed directly to the app)
    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in.toString(),
      realm_id: realmId,
      state: state
    });

    return res.redirect(`timerview://oauth-callback?${params.toString()}`);

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return res.redirect(`timerview://oauth-callback?error=${encodeURIComponent(error.message)}`);
  }
};
