import { describe, it, expect } from 'bun:test'
import { crossedLowStockThreshold } from '../../services/lowStockService'

// HU-46: the whole point of the "email only on crossing" rule is that an alert
// fires exactly once, on the downward crossing, and never again while stock stays
// low — otherwise every order on an already-low product spams admins. This is the
// one genuinely tricky bit of logic, so it lives in a pure function and is tested
// exhaustively here without a database.
describe('crossedLowStockThreshold', () => {
  const THRESHOLD = 5

  it('notifies when stock crosses from above the threshold to below it', () => {
    // was 8 (above), now 3 (below) -> the one case that should alert
    expect(crossedLowStockThreshold(8, 3, THRESHOLD)).toBe(true)
  })

  it('notifies when stock lands exactly on the threshold from above', () => {
    // at-or-below includes landing exactly on the threshold
    expect(crossedLowStockThreshold(6, 5, THRESHOLD)).toBe(true)
  })

  it('does NOT notify again on a second drop while already below', () => {
    // was 3 (already below), now 1 (still below) -> must stay silent
    expect(crossedLowStockThreshold(3, 1, THRESHOLD)).toBe(false)
  })

  it('does NOT notify when stock was already exactly at the threshold and drops', () => {
    // was 5 (already at-or-below), now 4 -> not a fresh crossing
    expect(crossedLowStockThreshold(5, 4, THRESHOLD)).toBe(false)
  })

  it('does NOT notify when stock moves back up above the threshold (restock)', () => {
    // was 2 (below), now 20 (above) -> restock is not an alert
    expect(crossedLowStockThreshold(2, 20, THRESHOLD)).toBe(false)
  })

  it('does NOT notify when stock stays comfortably above the threshold', () => {
    expect(crossedLowStockThreshold(30, 20, THRESHOLD)).toBe(false)
  })

  it('notifies when stock crosses all the way down to zero from above', () => {
    expect(crossedLowStockThreshold(4, 0, 3)).toBe(true)
  })

  it('handles a zero threshold: only a drop to 0 from above counts as a crossing', () => {
    // threshold 0 means "alert only when it hits empty"
    expect(crossedLowStockThreshold(1, 0, 0)).toBe(true)
    expect(crossedLowStockThreshold(0, 0, 0)).toBe(false)
  })

  it('does not treat an unchanged already-low stock as a crossing', () => {
    // e.g. an admin edits an unrelated field; stock unchanged and already low
    expect(crossedLowStockThreshold(3, 3, THRESHOLD)).toBe(false)
  })
})
