import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Parse body — vercel dev pre-parses, production sends raw stream
function parseBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body)
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  try {
    const { priceId, clinicaId, clinicaNombre, email } = await parseBody(req)

    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' })
      return
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        clinicaId:    clinicaId    || '',
        clinicaNombre: clinicaNombre || '',
      },
      success_url: `${appUrl}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/precios`,
      locale: 'es',
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      ...(email ? { customer_email: email } : {}),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout-session]', err.message)
    res.status(500).json({ error: err.message })
  }
}
