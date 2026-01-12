import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { db } from "../db";
import { crewAgents, crewTasks } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { logAuditEntry } from "../lib/audit";

const app = new Hono();

// All agent routes require authentication and admin role
app.use("*", requireAuth);
app.use("*", requireAdmin);

// Path to the CrewAI config directory (only for services.yaml now)
const getConfigDir = (): string => {
  const possiblePaths = [
    path.resolve(process.cwd(), "../ad_platform_crew/config"),
    path.resolve(process.cwd(), "../../backend/ad_platform_crew/config"),
    path.resolve(import.meta.dir, "../../../../ad_platform_crew/config"),
  ];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return possiblePaths[0];
};

const CONFIG_DIR = getConfigDir();

// Helper to read YAML file (only for services.yaml)
function readYamlFile(filename: string): Record<string, unknown> {
  const filePath = path.join(CONFIG_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`[Agents] Config file not found: ${filePath}`);
    throw new Error(`Config file not found: ${filename} at ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.parse(content);

  if (!parsed) {
    throw new Error(`Failed to parse YAML file: ${filename}`);
  }

  return parsed;
}

// =============================================================================
// Agent Definitions (Database)
// =============================================================================

// Get all agents
app.get("/", async (c) => {
  const adminUser = c.get("user");

  try {
    const agents = await db.select().from(crewAgents).orderBy(crewAgents.key);

    // Transform to match frontend expectations
    const agentList = agents.map((agent) => ({
      key: agent.key,
      role: agent.role,
      goal: agent.goal,
      backstory: agent.backstory,
      service: agent.service,
      capability: agent.capability,
      allow_delegation: agent.allowDelegation,
      max_iter: agent.maxIter ? parseInt(agent.maxIter) : 15,
      is_orchestrator: agent.isOrchestrator,
      coordinates: agent.coordinates,
    }));

    // Log admin access
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "list_agents",
      metadata: { count: agentList.length },
    });

    return c.json({ agents: agentList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Error reading agents:", message);
    return c.json({ error: "Failed to read agents", details: message }, 500);
  }
});

// Get single agent
app.get("/:key", async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");

  // Skip if this looks like a sub-route
  if (key === "tasks" || key === "services" || key === "debug" || key === "seed") {
    return c.json({ error: "Invalid agent key" }, 400);
  }

  try {
    const [agent] = await db.select().from(crewAgents).where(eq(crewAgents.key, key));

    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    // Log admin access
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "view_agent",
      targetResourceId: key,
      metadata: { service: agent.service, capability: agent.capability },
    });

    return c.json({
      key: agent.key,
      role: agent.role,
      goal: agent.goal,
      backstory: agent.backstory,
      service: agent.service,
      capability: agent.capability,
      allow_delegation: agent.allowDelegation,
      max_iter: agent.maxIter ? parseInt(agent.maxIter) : 15,
      is_orchestrator: agent.isOrchestrator,
      coordinates: agent.coordinates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Error reading agent:", message);
    return c.json({ error: "Failed to read agent", details: message }, 500);
  }
});

// Create agent
const createAgentSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z_]+$/, "Key must be lowercase with underscores only"),
  role: z.string().min(1).max(200),
  goal: z.string().min(1).max(2000),
  backstory: z.string().min(1).max(5000),
  service: z.string().optional(),
  capability: z.string().optional(),
  allow_delegation: z.boolean().optional(),
  max_iter: z.number().min(1).max(50).optional(),
  is_orchestrator: z.boolean().optional(),
  coordinates: z.array(z.string()).optional(),
});

app.post("/", zValidator("json", createAgentSchema), async (c) => {
  const adminUser = c.get("user");
  const data = c.req.valid("json");

  try {
    // Check if agent already exists
    const [existing] = await db.select().from(crewAgents).where(eq(crewAgents.key, data.key));
    if (existing) {
      return c.json({ error: "Agent with this key already exists" }, 400);
    }

    const [newAgent] = await db.insert(crewAgents).values({
      key: data.key,
      role: data.role,
      goal: data.goal,
      backstory: data.backstory,
      service: data.service || null,
      capability: data.capability || null,
      allowDelegation: data.allow_delegation ?? false,
      maxIter: data.max_iter?.toString() || "15",
      isOrchestrator: data.is_orchestrator ?? false,
      coordinates: data.coordinates || null,
    }).returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "create_agent",
      targetResourceId: newAgent.key,
      metadata: { service: newAgent.service, capability: newAgent.capability },
    });

    return c.json({
      success: true,
      message: "Agent created",
      agent: {
        key: newAgent.key,
        role: newAgent.role,
        goal: newAgent.goal,
        backstory: newAgent.backstory,
        service: newAgent.service,
        capability: newAgent.capability,
        allow_delegation: newAgent.allowDelegation,
        max_iter: newAgent.maxIter ? parseInt(newAgent.maxIter) : 15,
        is_orchestrator: newAgent.isOrchestrator,
        coordinates: newAgent.coordinates,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to create agent", details: message }, 500);
  }
});

// Update agent
const updateAgentSchema = z.object({
  role: z.string().min(1).max(200),
  goal: z.string().min(1).max(2000),
  backstory: z.string().min(1).max(5000),
  service: z.string().optional(),
  capability: z.string().optional(),
  allow_delegation: z.boolean().optional(),
  max_iter: z.number().min(1).max(50).optional(),
  is_orchestrator: z.boolean().optional(),
  coordinates: z.array(z.string()).optional(),
});

app.put("/:key", zValidator("json", updateAgentSchema), async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");
  const updates = c.req.valid("json");

  try {
    const [existing] = await db.select().from(crewAgents).where(eq(crewAgents.key, key));
    if (!existing) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const [updated] = await db.update(crewAgents)
      .set({
        role: updates.role,
        goal: updates.goal,
        backstory: updates.backstory,
        service: updates.service || null,
        capability: updates.capability || null,
        allowDelegation: updates.allow_delegation ?? false,
        maxIter: updates.max_iter?.toString() || "15",
        isOrchestrator: updates.is_orchestrator ?? false,
        coordinates: updates.coordinates || null,
        updatedAt: new Date(),
      })
      .where(eq(crewAgents.key, key))
      .returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "update_agent",
      targetResourceId: key,
      metadata: { service: updated.service, capability: updated.capability },
    });

    return c.json({
      success: true,
      message: "Agent updated",
      agent: {
        key: updated.key,
        role: updated.role,
        goal: updated.goal,
        backstory: updated.backstory,
        service: updated.service,
        capability: updated.capability,
        allow_delegation: updated.allowDelegation,
        max_iter: updated.maxIter ? parseInt(updated.maxIter) : 15,
        is_orchestrator: updated.isOrchestrator,
        coordinates: updated.coordinates,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to update agent", details: message }, 500);
  }
});

// Delete agent
app.delete("/:key", async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");

  if (key === "tasks" || key === "services" || key === "debug" || key === "seed") {
    return c.json({ error: "Invalid agent key" }, 400);
  }

  try {
    const [existing] = await db.select().from(crewAgents).where(eq(crewAgents.key, key));
    if (!existing) {
      return c.json({ error: "Agent not found" }, 404);
    }

    await db.delete(crewAgents).where(eq(crewAgents.key, key));

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "delete_agent",
      targetResourceId: key,
      metadata: { service: existing.service, capability: existing.capability },
    });

    return c.json({ success: true, message: "Agent deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to delete agent", details: message }, 500);
  }
});

// =============================================================================
// Task Definitions (Database)
// =============================================================================

// Get all tasks
app.get("/tasks/list", async (c) => {
  const adminUser = c.get("user");

  try {
    const tasks = await db.select().from(crewTasks).orderBy(crewTasks.key);

    const taskList = tasks.map((task) => ({
      key: task.key,
      description: task.description,
      expected_output: task.expectedOutput,
      agent: task.agentKey,
      context: task.context,
    }));

    // Log admin access
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "list_tasks",
      metadata: { count: taskList.length },
    });

    return c.json({ tasks: taskList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Error reading tasks:", message);
    return c.json({ error: "Failed to read tasks", details: message }, 500);
  }
});

// Get single task
app.get("/tasks/:key", async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");

  try {
    const [task] = await db.select().from(crewTasks).where(eq(crewTasks.key, key));

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // Log admin access
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "view_task",
      targetResourceId: key,
      metadata: { agentKey: task.agentKey },
    });

    return c.json({
      key: task.key,
      description: task.description,
      expected_output: task.expectedOutput,
      agent: task.agentKey,
      context: task.context,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Error reading task:", message);
    return c.json({ error: "Failed to read task", details: message }, 500);
  }
});

// Create task
const createTaskSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z_]+$/, "Key must be lowercase with underscores only"),
  description: z.string().min(1).max(5000),
  expected_output: z.string().min(1).max(2000),
  agent: z.string().min(1),
  context: z.array(z.string()).optional(),
});

app.post("/tasks", zValidator("json", createTaskSchema), async (c) => {
  const adminUser = c.get("user");
  const data = c.req.valid("json");

  try {
    const [existing] = await db.select().from(crewTasks).where(eq(crewTasks.key, data.key));
    if (existing) {
      return c.json({ error: "Task with this key already exists" }, 400);
    }

    const [newTask] = await db.insert(crewTasks).values({
      key: data.key,
      description: data.description,
      expectedOutput: data.expected_output,
      agentKey: data.agent,
      context: data.context || null,
    }).returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "create_task",
      targetResourceId: newTask.key,
      metadata: { agentKey: newTask.agentKey },
    });

    return c.json({
      success: true,
      message: "Task created",
      task: {
        key: newTask.key,
        description: newTask.description,
        expected_output: newTask.expectedOutput,
        agent: newTask.agentKey,
        context: newTask.context,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to create task", details: message }, 500);
  }
});

// Update task
const updateTaskSchema = z.object({
  description: z.string().min(1).max(5000),
  expected_output: z.string().min(1).max(2000),
  agent: z.string().min(1),
  context: z.array(z.string()).optional(),
});

app.put("/tasks/:key", zValidator("json", updateTaskSchema), async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");
  const updates = c.req.valid("json");

  try {
    const [existing] = await db.select().from(crewTasks).where(eq(crewTasks.key, key));
    if (!existing) {
      return c.json({ error: "Task not found" }, 404);
    }

    const [updated] = await db.update(crewTasks)
      .set({
        description: updates.description,
        expectedOutput: updates.expected_output,
        agentKey: updates.agent,
        context: updates.context || null,
        updatedAt: new Date(),
      })
      .where(eq(crewTasks.key, key))
      .returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "update_task",
      targetResourceId: key,
      metadata: { agentKey: updated.agentKey, previousAgentKey: existing.agentKey },
    });

    return c.json({
      success: true,
      message: "Task updated",
      task: {
        key: updated.key,
        description: updated.description,
        expected_output: updated.expectedOutput,
        agent: updated.agentKey,
        context: updated.context,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to update task", details: message }, 500);
  }
});

// Delete task
app.delete("/tasks/:key", async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");

  try {
    const [existing] = await db.select().from(crewTasks).where(eq(crewTasks.key, key));
    if (!existing) {
      return c.json({ error: "Task not found" }, 404);
    }

    await db.delete(crewTasks).where(eq(crewTasks.key, key));

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "delete_task",
      targetResourceId: key,
      metadata: { agentKey: existing.agentKey },
    });

    return c.json({ success: true, message: "Task deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Failed to delete task", details: message }, 500);
  }
});

// =============================================================================
// Services Configuration (still from YAML - read-only)
// =============================================================================

app.get("/services/list", async (c) => {
  try {
    const services = readYamlFile("services.yaml");
    return c.json(services);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Error reading services:", message);
    return c.json({ error: "Failed to read services configuration", details: message }, 500);
  }
});

// =============================================================================
// Seed from YAML (one-time migration)
// =============================================================================

app.post("/seed", async (c) => {
  const adminUser = c.get("user");

  try {
    // Read YAML files
    const agentsYaml = readYamlFile("agents.yaml") as Record<string, Record<string, unknown>>;
    const tasksYaml = readYamlFile("tasks.yaml") as Record<string, Record<string, unknown>>;

    // Check if already seeded
    const existingAgents = await db.select().from(crewAgents);
    if (existingAgents.length > 0) {
      return c.json({
        success: false,
        message: "Database already has agents. Clear the tables first if you want to re-seed.",
        agentCount: existingAgents.length
      }, 400);
    }

    // Seed agents
    const agentInserts = Object.entries(agentsYaml).map(([key, agent]) => ({
      key,
      role: String(agent.role || "").trim(),
      goal: String(agent.goal || "").trim(),
      backstory: String(agent.backstory || "").trim(),
      service: agent.service ? String(agent.service) : null,
      capability: agent.capability ? String(agent.capability) : null,
      allowDelegation: Boolean(agent.allow_delegation),
      maxIter: agent.max_iter ? String(agent.max_iter) : "15",
      isOrchestrator: Boolean(agent.is_orchestrator),
      coordinates: agent.coordinates ? (agent.coordinates as string[]) : null,
    }));

    await db.insert(crewAgents).values(agentInserts);

    // Seed tasks
    const taskInserts = Object.entries(tasksYaml).map(([key, task]) => ({
      key,
      description: String(task.description || "").trim(),
      expectedOutput: String(task.expected_output || "").trim(),
      agentKey: String(task.agent || ""),
      context: task.context ? (task.context as string[]) : null,
    }));

    await db.insert(crewTasks).values(taskInserts);

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "seed_agents",
      metadata: { agentsSeeded: agentInserts.length, tasksSeeded: taskInserts.length },
    });

    return c.json({
      success: true,
      message: "Database seeded from YAML",
      agentsSeeded: agentInserts.length,
      tasksSeeded: taskInserts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Agents] Seed error:", message);
    return c.json({ error: "Failed to seed database", details: message }, 500);
  }
});

// Debug endpoint
app.get("/debug/config-path", async (c) => {
  return c.json({
    configDir: CONFIG_DIR,
    cwd: process.cwd(),
    exists: fs.existsSync(CONFIG_DIR),
    files: fs.existsSync(CONFIG_DIR) ? fs.readdirSync(CONFIG_DIR) : [],
  });
});

export default app;
