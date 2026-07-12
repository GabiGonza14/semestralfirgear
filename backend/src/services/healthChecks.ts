import mongoose from 'mongoose'
import { getStripeClient } from '../config/stripe'

// HU-33: the low-level dependency probes, kept in their own module so
// getReadinessStatus() can be unit-tested by mocking THIS narrow boundary — never
// the global `mongoose` module (mocking mongoose process-wide pollutes other test
// files that rely on the real one; see the project's mock.module gotcha).

// MongoDB liveness: mongoose already tracks the connection state, so this needs no
// network round trip. readyState 1 === connected.
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1
}

// Stripe reachability: an actual lightweight, read-only API call — not just "is the
// key set". A thrown error (bad/missing key, network failure) means not-ready and
// is swallowed so the health endpoint never crashes.
export async function checkStripeReachable(): Promise<{ ok: boolean; error?: string }> {
  try {
    const stripe = getStripeClient()
    await stripe.balance.retrieve()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
