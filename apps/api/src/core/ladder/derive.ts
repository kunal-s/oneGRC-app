/**
 * Delivery state is derived, never stored (LDR-066, rule 1, data-model.md
 * section 2): delivered where the confirmation moment is set; failed where
 * the failure moment is set; retrying where attempts are above zero and
 * neither is set; pending otherwise.
 */
export type DeliveryState = 'delivered' | 'retrying' | 'failed' | 'pending'

export function deliveryStateOf(row: {
  deliveredAt: Date | null
  failedAt: Date | null
  deliveryAttempts: number
}): DeliveryState {
  if (row.deliveredAt) return 'delivered'
  if (row.failedAt) return 'failed'
  if (row.deliveryAttempts > 0) return 'retrying'
  return 'pending'
}
