"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Bot,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Target,
  BookOpen,
  Save,
  X,
  Plus,
  Trash2,
  ListTodo,
  Link2,
  GitBranch,
  Settings2,
  Wrench,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface Agent {
  key: string
  role: string
  goal: string
  backstory: string
  service?: string
  capability?: string
  allow_delegation?: boolean
  max_iter?: number
  is_orchestrator?: boolean
  coordinates?: string[]
}

interface Task {
  key: string
  description: string
  expected_output: string
  agent: string
}

interface Capability {
  description: string
  backstory?: string
  tools: string[]
}

interface Service {
  display_name: string
  description: string
  module: string | null
  capabilities: Record<string, Capability>
}

interface ServicesConfig {
  services: Record<string, Service>
  cross_platform?: Record<string, { description: string; services: string[] }>
}

type EditMode = "create" | "edit"

export default function CrewAIConfigPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [services, setServices] = useState<ServicesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Agent editing
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editedAgent, setEditedAgent] = useState<Partial<Agent> & { key?: string }>({})
  const [agentEditMode, setAgentEditMode] = useState<EditMode>("edit")

  // Task editing
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editedTask, setEditedTask] = useState<Partial<Task> & { key?: string }>({})
  const [taskEditMode, setTaskEditMode] = useState<EditMode>("edit")

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "agent" | "task"; key: string; name: string } | null>(null)

  // Collapsible state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, tasksRes, servicesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/agents`),
        fetch(`${API_URL}/api/admin/agents/tasks/list`),
        fetch(`${API_URL}/api/admin/agents/services/list`),
      ])
      const agentsData = await agentsRes.json()
      const tasksData = await tasksRes.json()
      const servicesData = await servicesRes.json()
      setAgents(agentsData.agents || [])
      setTasks(tasksData.tasks || [])
      setServices(servicesData || null)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Helper to get tools for an agent based on service/capability
  const getAgentTools = useCallback((agent: Agent): string[] => {
    if (!services || !agent.service || !agent.capability) return []
    const service = services.services?.[agent.service]
    if (!service) return []
    const capability = service.capabilities?.[agent.capability]
    return capability?.tools || []
  }, [services])

  // Helper to get tasks for an agent
  const getAgentTasks = useCallback((agentKey: string): Task[] => {
    return tasks.filter(t => t.agent === agentKey)
  }, [tasks])

  // Helper to get coordinated agents (for orchestrators)
  const getCoordinatedAgents = useCallback((agent: Agent): Agent[] => {
    if (!agent.coordinates) return []
    return agent.coordinates.map(key => agents.find(a => a.key === key)).filter(Boolean) as Agent[]
  }, [agents])

  // Memoized capability options based on selected service
  const capabilityOptions = useMemo(() => {
    if (!services || !editedAgent.service) return []
    const service = services.services?.[editedAgent.service]
    return service ? Object.keys(service.capabilities) : []
  }, [services, editedAgent.service])

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isSectionOpen = (key: string, defaultOpen = true) => {
    return openSections[key] ?? defaultOpen
  }

  // Agent handlers
  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setEditedAgent({
      role: agent.role,
      goal: agent.goal,
      backstory: agent.backstory,
      service: agent.service,
      capability: agent.capability,
      allow_delegation: agent.allow_delegation,
      max_iter: agent.max_iter,
      is_orchestrator: agent.is_orchestrator,
      coordinates: agent.coordinates,
    })
    setAgentEditMode("edit")
  }

  const handleCreateAgent = () => {
    setSelectedAgent(null)
    setEditedAgent({
      key: "",
      role: "",
      goal: "",
      backstory: "",
      allow_delegation: false,
      max_iter: 15,
    })
    setAgentEditMode("create")
  }

  const handleSaveAgent = async () => {
    setSaving(true)
    try {
      const url = agentEditMode === "create"
        ? `${API_URL}/api/admin/agents`
        : `${API_URL}/api/admin/agents/${selectedAgent?.key}`

      const res = await fetch(url, {
        method: agentEditMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedAgent),
      })
      const data = await res.json()

      if (data.success) {
        await fetchData()
        setSelectedAgent(null)
        setEditedAgent({})
      } else {
        alert(data.error || "Failed to save agent")
      }
    } catch (error) {
      console.error("Failed to save agent:", error)
      alert("Failed to save agent")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAgent = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${API_URL}/api/admin/agents/${deleteTarget.key}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
      } else {
        alert(data.error || "Failed to delete")
      }
    } catch (error) {
      console.error("Failed to delete:", error)
    }
    setDeleteTarget(null)
  }

  // Task handlers
  const handleSelectTask = (task: Task) => {
    setSelectedTask(task)
    setEditedTask({
      description: task.description,
      expected_output: task.expected_output,
      agent: task.agent,
    })
    setTaskEditMode("edit")
  }

  const handleCreateTask = () => {
    setSelectedTask(null)
    setEditedTask({
      key: "",
      description: "",
      expected_output: "",
      agent: agents[0]?.key || "",
    })
    setTaskEditMode("create")
  }

  const handleSaveTask = async () => {
    setSaving(true)
    try {
      const url = taskEditMode === "create"
        ? `${API_URL}/api/admin/agents/tasks`
        : `${API_URL}/api/admin/agents/tasks/${selectedTask?.key}`

      const res = await fetch(url, {
        method: taskEditMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedTask),
      })
      const data = await res.json()

      if (data.success) {
        await fetchData()
        setSelectedTask(null)
        setEditedTask({})
      } else {
        alert(data.error || "Failed to save task")
      }
    } catch (error) {
      console.error("Failed to save task:", error)
      alert("Failed to save task")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${API_URL}/api/admin/agents/tasks/${deleteTarget.key}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
      } else {
        alert(data.error || "Failed to delete")
      }
    } catch (error) {
      console.error("Failed to delete:", error)
    }
    setDeleteTarget(null)
  }

  // Group agents
  const orchestrators = agents.filter((a) => a.is_orchestrator)
  const admobAgents = agents.filter((a) => a.service === "admob" && !a.is_orchestrator)
  const admanagerAgents = agents.filter((a) => a.service === "admanager" && !a.is_orchestrator)
  const otherAgents = agents.filter((a) => !a.is_orchestrator && a.service !== "admob" && a.service !== "admanager")

  // Group tasks by assigned agent's service
  const getTaskService = (task: Task) => {
    const agent = agents.find((a) => a.key === task.agent)
    return agent?.service || "other"
  }
  const admobTasks = tasks.filter((t) => getTaskService(t) === "admob")
  const admanagerTasks = tasks.filter((t) => getTaskService(t) === "admanager")
  const otherTasks = tasks.filter((t) => {
    const svc = getTaskService(t)
    return svc !== "admob" && svc !== "admanager"
  })

  const renderAgentItem = (agent: Agent) => {
    const tools = getAgentTools(agent)
    const agentTasks = getAgentTasks(agent.key)
    const coordinated = getCoordinatedAgents(agent)

    return (
      <div
        key={agent.key}
        className="group py-1.5 px-2 rounded hover:bg-accent/50 cursor-pointer text-xs"
        onClick={() => handleSelectAgent(agent)}
      >
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate font-medium">{agent.role}</span>
          {agent.is_orchestrator && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
              <GitBranch className="h-2 w-2 mr-0.5" />
              orch
            </Badge>
          )}
          {tools.length > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Wrench className="h-2 w-2 mr-0.5" />
              {tools.length}
            </Badge>
          )}
          {agentTasks.length > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              <ListTodo className="h-2 w-2 mr-0.5" />
              {agentTasks.length}
            </Badge>
          )}
        </div>

        {/* Show coordinated agents for orchestrators */}
        {coordinated.length > 0 && (
          <div className="flex items-center gap-1 mt-1 ml-1 text-[10px] text-muted-foreground">
            <ArrowRight className="h-2.5 w-2.5" />
            {coordinated.map((a, i) => (
              <span key={a.key}>
                {a.role.split(" ").slice(-1)[0]}
                {i < coordinated.length - 1 && ", "}
              </span>
            ))}
          </div>
        )}

        {/* Show tools preview */}
        {tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-1">
            {tools.slice(0, 4).map((tool) => (
              <span key={tool} className="text-[9px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">
                {tool}
              </span>
            ))}
            {tools.length > 4 && (
              <span className="text-[9px] text-muted-foreground">+{tools.length - 4}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderTaskItem = (task: Task) => {
    const linkedAgent = agents.find((a) => a.key === task.agent)
    return (
      <div
        key={task.key}
        className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer text-xs"
        onClick={() => handleSelectTask(task)}
      >
        <code className="font-mono text-[10px] text-muted-foreground">{task.key}</code>
        {linkedAgent && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1 cursor-pointer hover:bg-accent ml-auto"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectAgent(linkedAgent)
            }}
          >
            <Link2 className="h-2 w-2 mr-0.5" />
            {linkedAgent.role.split(" ").slice(0, 2).join(" ")}
          </Badge>
        )}
      </div>
    )
  }

  const renderCollapsibleSection = (
    id: string,
    title: string,
    items: Agent[] | Task[],
    renderItem: (item: Agent | Task) => React.ReactNode,
    defaultOpen = true
  ) => {
    if (items.length === 0) return null
    return (
      <Collapsible open={isSectionOpen(id, defaultOpen)} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 px-1 hover:bg-accent/30 rounded text-xs font-medium">
          {isSectionOpen(id, defaultOpen) ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {title}
          <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">
            {items.length}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 border-l border-border/50 ml-1.5 mt-0.5">
          {items.map((item) => renderItem(item as Agent & Task))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // Count total tools
  const totalTools = services
    ? Object.values(services.services || {}).reduce(
        (acc, svc) =>
          acc + Object.values(svc.capabilities).reduce((a, c) => a + c.tools.length, 0),
        0
      )
    : 0

  return (
    <div className="flex flex-col gap-4 p-6 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">CrewAI Configuration</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agents.length} agents, {tasks.length} tasks, {totalTools} tools
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={fetchData}
        >
          <RefreshCw className={cn("mr-1.5 h-3 w-3", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="h-8">
            <TabsTrigger value="agents" className="text-xs h-7 px-3">
              <Bot className="h-3 w-3 mr-1.5" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs h-7 px-3">
              <ListTodo className="h-3 w-3 mr-1.5" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-3 space-y-2">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs opacity-50"
                disabled
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Agent
              </Button>
            </div>
            <div className="border rounded-md p-2 space-y-1 bg-card/50">
              {renderCollapsibleSection("orchestrators", "Orchestrators", orchestrators, renderAgentItem)}
              {renderCollapsibleSection("admob", "AdMob Specialists", admobAgents, renderAgentItem)}
              {renderCollapsibleSection("admanager", "Ad Manager Specialists", admanagerAgents, renderAgentItem)}
              {renderCollapsibleSection("other", "Other", otherAgents, renderAgentItem)}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-3 space-y-2">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs opacity-50"
                disabled
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
            <div className="border rounded-md p-2 space-y-1 bg-card/50">
              {renderCollapsibleSection("admob_tasks", "AdMob Tasks", admobTasks, renderTaskItem)}
              {renderCollapsibleSection("admanager_tasks", "Ad Manager Tasks", admanagerTasks, renderTaskItem)}
              {renderCollapsibleSection("other_tasks", "Other Tasks", otherTasks, renderTaskItem)}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Agent View Dialog (Read-only) */}
      <Dialog open={selectedAgent !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedAgent(null)
          setEditedAgent({})
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agent Details
            </DialogTitle>
            {selectedAgent && (
              <DialogDescription className="text-[10px]">
                <code className="bg-muted px-1 py-0.5 rounded">{selectedAgent.key}</code>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Role
              </Label>
              <Input
                value={editedAgent.role || ""}
                disabled
                className="h-7 text-xs opacity-70"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Target className="h-3 w-3 text-emerald-500" />
                Goal
              </Label>
              <Textarea
                value={editedAgent.goal || ""}
                disabled
                className="text-[10px] min-h-[60px] resize-none opacity-70"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-blue-500" />
                Backstory
              </Label>
              <Textarea
                value={editedAgent.backstory || ""}
                disabled
                className="text-[10px] min-h-[80px] resize-none opacity-70"
              />
            </div>

            {/* Service & Capability -> Tools mapping */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
              <Label className="text-xs flex items-center gap-1 font-medium">
                <Wrench className="h-3 w-3 text-blue-500" />
                Tool Assignment (via Service + Capability)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Service</Label>
                  <Select value={editedAgent.service || "none"} disabled>
                    <SelectTrigger className="!h-6 text-[10px] opacity-70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-0">
                      <SelectItem value="none" className="text-[10px] py-0.5 min-h-0">None (Orchestrator)</SelectItem>
                      {services && Object.entries(services.services).map(([key, svc]) => (
                        <SelectItem key={key} value={key} className="text-[10px] py-0.5 min-h-0">
                          {svc.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Capability</Label>
                  <Select value={editedAgent.capability || "none"} disabled>
                    <SelectTrigger className="!h-6 text-[10px] opacity-70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-0">
                      <SelectItem value="none" className="text-[10px] py-0.5 min-h-0">None</SelectItem>
                      {capabilityOptions.map((cap) => (
                        <SelectItem key={cap} value={cap} className="text-[10px] py-0.5 min-h-0">
                          {cap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show resulting tools */}
              {editedAgent.service && editedAgent.capability && services && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <Label className="text-[10px] text-muted-foreground mb-1 block">
                    Tools this agent will have:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {services.services[editedAgent.service]?.capabilities[editedAgent.capability]?.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-[9px] h-4 px-1.5 font-mono">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="delegation"
                  checked={editedAgent.allow_delegation || false}
                  disabled
                />
                <Label htmlFor="delegation" className="text-xs opacity-70">Allow Delegation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs opacity-70">Max Iter:</Label>
                <Input
                  type="number"
                  value={editedAgent.max_iter || 15}
                  disabled
                  className="h-6 w-14 text-xs opacity-70"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="orchestrator"
                  checked={editedAgent.is_orchestrator || false}
                  disabled
                />
                <Label htmlFor="orchestrator" className="text-xs opacity-70">Orchestrator</Label>
              </div>
            </div>

            {/* Orchestrator coordinates */}
            {editedAgent.is_orchestrator && (
              <div className="space-y-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <Label className="text-xs flex items-center gap-1 font-medium text-purple-600">
                  <GitBranch className="h-3 w-3" />
                  Coordinates (agents this orchestrator manages)
                </Label>
                <div className="flex flex-wrap gap-1">
                  {agents.filter(a => !a.is_orchestrator).map((agent) => {
                    const isSelected = editedAgent.coordinates?.includes(agent.key)
                    return (
                      <Badge
                        key={agent.key}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "text-[10px] h-5 px-2 cursor-pointer transition-colors",
                          isSelected ? "bg-purple-600" : "hover:bg-purple-500/10"
                        )}
                        onClick={() => {
                          const current = editedAgent.coordinates || []
                          const newCoords = isSelected
                            ? current.filter(k => k !== agent.key)
                            : [...current, agent.key]
                          setEditedAgent(prev => ({ ...prev, coordinates: newCoords }))
                        }}
                      >
                        {agent.role.split(" ").slice(-2).join(" ")}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Show tasks using this agent */}
            {selectedAgent && (
              <div className="space-y-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <Label className="text-xs flex items-center gap-1 font-medium text-amber-600">
                  <ListTodo className="h-3 w-3" />
                  Tasks using this agent
                </Label>
                <div className="flex flex-wrap gap-1">
                  {getAgentTasks(selectedAgent.key).map((task) => (
                    <Badge
                      key={task.key}
                      variant="outline"
                      className="text-[10px] h-5 px-2 cursor-pointer hover:bg-amber-500/10"
                      onClick={() => {
                        setSelectedAgent(null)
                        setEditedAgent({})
                        handleSelectTask(task)
                      }}
                    >
                      {task.key}
                    </Badge>
                  ))}
                  {getAgentTasks(selectedAgent.key).length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">No tasks assigned</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              setSelectedAgent(null)
              setEditedAgent({})
            }}>
              Close
            </Button>
            <Button size="sm" className="h-7 text-xs opacity-50" disabled>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task View Dialog (Read-only) */}
      <Dialog open={selectedTask !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedTask(null)
          setEditedTask({})
        }
      }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Task Details
            </DialogTitle>
            {selectedTask && (
              <DialogDescription className="text-[10px]">
                <code className="bg-muted px-1 py-0.5 rounded">{selectedTask.key}</code>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Agent assignment with tool preview */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
              <Label className="text-xs flex items-center gap-1 font-medium">
                <Link2 className="h-3 w-3 text-blue-500" />
                Assigned Agent
              </Label>
              <Select value={editedTask.agent || ""} disabled>
                <SelectTrigger className="!h-6 text-[10px] opacity-70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-0">
                  {agents.map((agent) => (
                    <SelectItem key={agent.key} value={agent.key} className="text-[10px] py-0.5 min-h-0">
                      {agent.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show agent's tools */}
              {editedTask.agent && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <Label className="text-[10px] text-muted-foreground mb-1 block">
                    Agent&apos;s available tools:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const agent = agents.find(a => a.key === editedTask.agent)
                      if (!agent) return null
                      const tools = getAgentTools(agent)
                      if (tools.length === 0) {
                        return <span className="text-[10px] text-muted-foreground italic">
                          {agent.is_orchestrator ? "Orchestrator (delegates to other agents)" : "No tools"}
                        </span>
                      }
                      return tools.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-[9px] h-4 px-1.5 font-mono">
                          {tool}
                        </Badge>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Settings2 className="h-3 w-3 text-amber-500" />
                Description
              </Label>
              <Textarea
                value={editedTask.description || ""}
                disabled
                className="text-xs md:text-xs min-h-[140px] resize-none font-mono leading-relaxed opacity-70"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Target className="h-3 w-3 text-emerald-500" />
                Expected Output
              </Label>
              <Textarea
                value={editedTask.expected_output || ""}
                disabled
                className="text-xs md:text-xs min-h-[70px] resize-none font-mono leading-relaxed opacity-70"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              setSelectedTask(null)
              setEditedTask({})
            }}>
              Close
            </Button>
            <Button size="sm" className="h-7 text-xs opacity-50" disabled>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
