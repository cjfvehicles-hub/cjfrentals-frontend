// Netlify Function to securely expose the Maps Embed API key at runtime.
// The key is read from environment (e.g., MAPS_EMBED_API) and never stored in the repo.

exports.handler = async () => {
  const key = process.env.MAPS_EMBED_API || process.env.GMAPS_EMBED_KEY || '';

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Maps key not configured' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({ key }),
  };
};
