import { Badge } from "@/components/ui/badge";

const MAP = {
  // Students / generic
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  // Fees
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  partial: { label: "Partial", variant: "info" },
  overdue: { label: "Overdue", variant: "destructive" },
  // Grievances
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "secondary" },
  // Movements
  out: { label: "Out", variant: "warning" },
  returned: { label: "Returned", variant: "success" },
  // Notices
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "secondary" },
  // Priorities
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "info" },
  // Rooms
  available: { label: "Available", variant: "success" },
  full: { label: "Full", variant: "destructive" },
};

export function StatusBadge({ status, className }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  const config = MAP[key] ?? {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    variant: "secondary",
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
