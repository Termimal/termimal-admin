import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

// Price IDs — set these after creating products in Stripe Dashboard
export const PLANS = {
  free: {
    name: 'Free',
    priceId: null, // free plan, no Stripe price
  },
  pro_monthly: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  },
  pro_yearly: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  },
  premium_monthly: {
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
  },
  premium_yearly: {
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
  },
}
