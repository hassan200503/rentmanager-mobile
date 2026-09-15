import React from 'react';

import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '../api/types';
import { Badge, type Tone } from '../ui/primitives';

export const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE: Record<MaintenanceStatus, Tone> = {
  SUBMITTED: 'warning',
  IN_REVIEW: 'info',
  SCHEDULED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  STRUCTURAL: 'Structural',
  APPLIANCE: 'Appliance',
  PEST_CONTROL: 'Pests',
  GENERAL: 'Other',
};

export function MaintenanceStatusBadge({ status }: { status?: MaintenanceStatus }) {
  if (!status) return null;
  return <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
}

export function PriorityBadge({ priority }: { priority?: MaintenancePriority }) {
  if (!priority) return null;
  const tone: Tone = priority === 'URGENT' ? 'danger' : priority === 'HIGH' ? 'warning' : 'neutral';
  return <Badge label={PRIORITY_LABEL[priority]} tone={tone} />;
}
