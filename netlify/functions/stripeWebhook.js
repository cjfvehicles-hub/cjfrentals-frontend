const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Firebase admin init (requires FIREBASE_SERVICE_ACCOUNT env as JSON)
if (!admin.apps.length) {
  try {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
    if (!svc) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
    admin.initializeApp({
      credential: admin.credential.cert(svc),
    });
  } catch (e) {
    console.error('Firebase admin init failed:', e.message);
  }
}

// Verify webhook signature
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const body = event.body;
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle completed checkout session
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const plan = session.metadata?.plan || 'free';
    const customerEmail = session.customer_details?.email || null;

    console.log('Checkout completed for plan', plan, 'email', customerEmail);

    // Update user plan in Firestore by email
    if (admin.apps.length && customerEmail) {
      try {
        const db = admin.firestore();
        const snap = await db.collection('users').where('email', '==', customerEmail).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          await doc.ref.set({ plan, planUpdatedAt: new Date().toISOString() }, { merge: true });
          console.log('Plan updated for user', doc.id, plan);
        } else {
          // If no matching user, create a stub record
          const ref = db.collection('users').doc();
          await ref.set({ email: customerEmail, plan, planUpdatedAt: new Date().toISOString() });
          console.log('Created new user stub and set plan', ref.id, plan);
        }
      } catch (e) {
        console.error('Failed to update plan in Firestore:', e.message);
      }
    }
  }

  return { statusCode: 200, body: 'ok' };
};
