import {
  LayoutDashboard,
  MessageSquarePlus,
  History,
  Plug,
  CreditCard,
  HelpCircle,
  Settings,
  UserPlus,
  SlidersHorizontal,
  FlaskConical,
  MessageSquareText,
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
  { title: "Panel", url: "/admin", icon: SlidersHorizontal },
  { title: "Waitlist", url: "/admin/waitlist", icon: UserPlus },
]

// Demo-only navigation items (shown when demo mode is active)
export const demoNavItems = [
  { title: "Experiments", url: "/experiments", icon: FlaskConical },
  { title: "Demo Chat", url: "/demo/chat", icon: MessageSquareText },
]
