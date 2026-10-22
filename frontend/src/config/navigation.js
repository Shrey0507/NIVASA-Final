import {
  ArrowLeftRight,
  BedDouble,
  Bell,
  KeyRound,
  LayoutDashboard,
  MessageSquareWarning,
  UserCircle,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export const adminNav = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Students", to: "/admin/students", icon: Users },
  { label: "Rooms", to: "/admin/rooms", icon: BedDouble },
  { label: "Fees", to: "/admin/fees", icon: Wallet },
  { label: "Mess", to: "/admin/mess", icon: UtensilsCrossed },
  { label: "In/Out Register", to: "/admin/movements", icon: ArrowLeftRight },
  {
    label: "Grievances",
    to: "/admin/grievances",
    icon: MessageSquareWarning,
  },
  { label: "Notices", to: "/admin/notices", icon: Bell },
  { label: "Credentials", to: "/admin/credentials", icon: KeyRound },
];

export const studentNav = [
  { label: "Dashboard", to: "/student", icon: LayoutDashboard, end: true },
  { label: "My Profile", to: "/student/profile", icon: UserCircle },
  { label: "Fees", to: "/student/fees", icon: Wallet },
  { label: "Mess Menu", to: "/student/mess", icon: UtensilsCrossed },
  {
    label: "Grievances",
    to: "/student/grievances",
    icon: MessageSquareWarning,
  },
  { label: "In/Out Register", to: "/student/movements", icon: ArrowLeftRight },
  { label: "Notices", to: "/student/notices", icon: Bell },
];
