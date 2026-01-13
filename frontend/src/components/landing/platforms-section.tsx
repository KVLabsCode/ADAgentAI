"use client"

import { useState } from "react"
import { Plug, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { AdMobLogo, ProviderLogoBadge } from "@/components/icons/provider-logos"

export function PlatformsSection() {
  const [enabled, setEnabled] = useState(true)

  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Section Header - Hidden on desktop */}
          <div className="lg:hidden text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              Platforms
            </p>
            <h2 className="text-2xl font-light tracking-tight">
              Connect your ad platforms
            </h2>
          </div>

          {/* Two-column layout: Mock UI left, Text right */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Mock Provider Cards */}
            <div className="relative order-1 lg:order-1 lg:pr-4">
              {/* Light theme version */}
              <div className="space-y-4 dark:hidden">
                {/* Connected Provider - Light */}
                <div className="rounded border border-zinc-200 bg-white shadow-sm">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProviderLogoBadge type="admob" size="sm" className="shrink-0" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-zinc-900 truncate">
                              accounts/pub-xxx
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-300 text-zinc-600">
                                AdMob
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-zinc-500">Connected</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            pub-xxx
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 hidden sm:inline">{enabled ? "Enabled" : "Disabled"}</span>
                          <Switch checked={enabled} onCheckedChange={setEnabled} className="scale-75" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supported Platforms - Light */}
                <div className="rounded border border-zinc-200 bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 rounded-t">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-zinc-500" />
                      <div>
                        <h2 className="text-sm font-medium text-zinc-900">Supported Platforms</h2>
                        <p className="text-[10px] text-zinc-500">ADAgentAI currently supports these ad platforms.</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 rounded border border-zinc-200 bg-zinc-50">
                        <AdMobLogo size="sm" />
                        <div>
                          <p className="text-sm font-medium text-zinc-900">AdMob</p>
                          <p className="text-[10px] text-zinc-500">Available</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded border border-zinc-200 bg-zinc-50">
                        <ProviderLogoBadge type="gam" size="sm" disabled />
                        <div>
                          <p className="text-sm font-medium text-zinc-400">Google Ad Manager</p>
                          <p className="text-[10px] text-zinc-400">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark theme version */}
              <div className="hidden dark:block space-y-4">
                {/* Connected Provider - Dark */}
                <div className="rounded border border-zinc-800/50 bg-zinc-950">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ProviderLogoBadge type="admob" size="sm" className="shrink-0" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-zinc-100 truncate">
                              accounts/pub-xxx
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-700 text-zinc-400">
                                AdMob
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-zinc-500">Connected</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            pub-xxx
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 hidden sm:inline">{enabled ? "Enabled" : "Disabled"}</span>
                          <Switch checked={enabled} onCheckedChange={setEnabled} className="scale-75" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supported Platforms - Dark */}
                <div className="rounded border border-zinc-800/50 bg-zinc-950">
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 rounded-t">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-zinc-500" />
                      <div>
                        <h2 className="text-sm font-medium text-zinc-100">Supported Platforms</h2>
                        <p className="text-[10px] text-zinc-500">ADAgentAI currently supports these ad platforms.</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 rounded border border-zinc-700/50 bg-zinc-900">
                        <AdMobLogo size="sm" />
                        <div>
                          <p className="text-sm font-medium text-zinc-100">AdMob</p>
                          <p className="text-[10px] text-zinc-500">Available</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded border border-zinc-700/50 bg-zinc-900">
                        <ProviderLogoBadge type="gam" size="sm" disabled />
                        <div>
                          <p className="text-sm font-medium text-zinc-500">Google Ad Manager</p>
                          <p className="text-[10px] text-zinc-600">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="space-y-6 order-2 lg:order-2">
              {/* Desktop header - Hidden on mobile */}
              <div className="space-y-3 hidden lg:block">
                <p className="text-xs uppercase tracking-widest text-muted-foreground/50">
                  Platforms
                </p>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight">
                  Connect your ad platforms
                </h2>
              </div>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-1">
                <p>Link your accounts in seconds</p>
                <p>ADAgentAI securely connects via OAuth</p>
                <p className="text-muted-foreground/70">Your credentials are never stored</p>
              </div>

              {/* Feature list */}
              <ul className="space-y-3 pt-2">
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Revenue reports, eCPM analytics, trend analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Mediation management and waterfall optimization</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">A/B testing with customizable traffic splits</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-sm">Ad unit and app inventory management</span>
                </li>
              </ul>

              <p className="text-xs text-muted-foreground/50 pt-2">
                Meta Ads, ironSource, Unity Ads on the roadmap
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
