"use client"

import { Building2, Users, Mail, Crown, ShieldCheck, RotateCw, X } from "lucide-react"

export function TeamSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Section Header - Hidden on desktop */}
          <div className="lg:hidden text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              Team Collaboration
            </p>
            <h2 className="text-2xl font-light tracking-tight">
              Built for teams
            </h2>
          </div>

          {/* Two-column layout: Text left, Mock UI right */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text content */}
            <div className="space-y-6 order-2 lg:order-1">
              {/* Desktop header - Hidden on mobile */}
              <div className="space-y-3 hidden lg:block">
                <p className="text-xs uppercase tracking-widest text-muted-foreground/50">
                  Team Collaboration
                </p>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight">
                  Built for teams
                </h2>
              </div>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-1">
                <p>Create organizations, invite team members, and manage access</p>
                <p className="text-muted-foreground/70">All from one place</p>
              </div>

              {/* Feature list */}
              <ul className="space-y-3 pt-2">
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Create shared workspaces for your team</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Invite members with admin or member roles</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Review shared chat history and decisions</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <span className="text-sm">Role-based approvals for dangerous operations <span className="text-[10px] text-muted-foreground/50">(coming soon)</span></span>
                </li>
              </ul>
            </div>

            {/* Mock Organization Card */}
            <div className="relative order-1 lg:order-2 lg:pl-4">
              {/* Light theme version */}
              <div className="dark:hidden rounded border border-zinc-200 bg-white shadow-sm">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 rounded-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    <div>
                      <h2 className="text-sm font-medium text-zinc-900">Organization</h2>
                      <p className="text-[10px] text-zinc-500">Manage Acme Inc</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* Pending Invitations - Light */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <p className="text-xs font-medium text-zinc-700">Pending Invitations</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-amber-600" />
                          <div>
                            <p className="text-xs font-medium text-zinc-800">mike@acme.com</p>
                            <p className="text-[10px] text-zinc-500">
                              Invited as member • Expires Jan 20, 2026
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 rounded flex items-center transition-colors"
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Resend
                          </button>
                          <button
                            type="button"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded flex items-center justify-center transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members List - Light */}
                  <div className="border-t border-zinc-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-zinc-700">Members</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-50 hover:bg-zinc-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 text-amber-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-800">John Doe</p>
                            <p className="text-[10px] text-zinc-500">john@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-200">
                          owner
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-50 hover:bg-zinc-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3 text-blue-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-800">Sarah Smith</p>
                            <p className="text-[10px] text-zinc-500">sarah@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-200">
                          admin
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-50 hover:bg-zinc-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-zinc-400" />
                          <div>
                            <p className="text-xs font-medium text-zinc-800">Alex Johnson</p>
                            <p className="text-[10px] text-zinc-500">alex@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-200">
                          member
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark theme version */}
              <div className="hidden dark:block rounded border border-zinc-800/50 bg-zinc-950">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 rounded-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    <div>
                      <h2 className="text-sm font-medium text-zinc-100">Organization</h2>
                      <p className="text-[10px] text-zinc-500">Manage Acme Inc</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* Pending Invitations - Dark */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      <p className="text-xs font-medium text-zinc-300">Pending Invitations</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-950/30 border border-amber-800/30">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-amber-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-200">mike@acme.com</p>
                            <p className="text-[10px] text-zinc-500">
                              Invited as member • Expires Jan 20, 2026
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 rounded flex items-center transition-colors"
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Resend
                          </button>
                          <button
                            type="button"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 rounded flex items-center justify-center transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members List - Dark */}
                  <div className="border-t border-zinc-800 pt-3 space-y-2">
                    <p className="text-xs font-medium text-zinc-300">Members</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 text-amber-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-200">John Doe</p>
                            <p className="text-[10px] text-zinc-500">john@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-800">
                          owner
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-3 w-3 text-blue-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-200">Sarah Smith</p>
                            <p className="text-[10px] text-zinc-500">sarah@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-800">
                          admin
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-zinc-500" />
                          <div>
                            <p className="text-xs font-medium text-zinc-200">Alex Johnson</p>
                            <p className="text-[10px] text-zinc-500">alex@acme.com</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 capitalize px-1.5 py-0.5 rounded bg-zinc-800">
                          member
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
