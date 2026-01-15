import {
  LayoutDashboard,
  MessageSquarePlus,
  History,
  Plug,
  CreditCard,
  HelpCircle,
  Settings,
  Shield,
  BarChart3,
  MessageSquare,
  Cog,
  FileCode,
  PenSquare,
  UserPlus,
} from "lucide-react"

export const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Chat", url: "/chat", icon: MessageSquarePlus },
  { title: "Chat History", url: "/chat-history", icon: History },
  { title: "Providers", url: "/providers", icon: Plug },
]

export const bottomNavItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Support", url: "/support", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
]

export const adminNavItems = [
  { title: "Admin Home", url: "/admin", icon: Shield },
  { title: "Usage", url: "/admin/usage", icon: BarChart3 },
  { title: "Conversations", url: "/admin/conversations", icon: MessageSquare },
  { title: "System", url: "/admin/system", icon: Cog },
  { title: "Prompts", url: "/admin/prompts", icon: FileCode },
  { title: "Blog", url: "/dashboard/blog", icon: PenSquare },
  { title: "Waitlist", url: "/dashboard/waitlist", icon: UserPlus },
]
