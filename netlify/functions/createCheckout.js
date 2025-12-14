const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Map plan keys to Stripe Price IDs (replace with your real price IDs)
const PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { plan } = JSON.parse(event.body || '{}');
    if (!plan || !PRICE_MAP[plan]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan or missing price ID' }) };
    }

    // Optionally pass user context (email) via headers from Firebase
    const customerEmail = event.headers['x-user-email'] || undefined;

    const baseUrl = process.env.SITE_URL || 'https://cjfrentals.com';
    const successUrl = `${baseUrl}/upgrade.html?success=true&plan=${plan}`;
    const cancelUrl = `${baseUrl}/upgrade.html?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: { plan },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Checkout error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Checkout failed' }) };
  }
};
