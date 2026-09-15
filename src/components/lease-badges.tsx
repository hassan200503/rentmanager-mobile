import React from 'react';

import type { LeaseStatus } from '../api/types';
import { Badge, type Tone } from '../ui/primitives';

export const LEASE_STATUS_LABEL: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  AWAITING_DEPOSIT: 'Awaiting deposit',
  PENDING_ACTIVATION: 'Starts soon',
  ACTIVE: 'Active',
  RENEWED: 'Renewed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  TERMINATED: 'Terminated',
  SUSPENDED: 'Suspended',
};

const TONE: Record<LeaseStatus, Tone> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  AWAITING_DEPOSIT: 'warning',
  PENDING_ACTIVATION: 'info',
  ACTIVE: 'success',
  RENEWED: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
  TERMINATED: 'danger',
  SUSPENDED: 'danger',
};

export function LeaseStatusBadge({ status }: { status?: LeaseStatus }) {
  if (!status) return null;
  return <Badge label={LEASE_STATUS_LABEL[status]} tone={TONE[status]} />;
}
