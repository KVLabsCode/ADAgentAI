import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

// Point to our Python AG-UI backend
const AGENT_URL = process.env.AGENT_URL || "http://localhost:5000";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  agents: {
    // The AG-UI agent running on Python
    ad_platform_agent: new HttpAgent({ url: AGENT_URL }),
  },
});

export const POST = async (req: NextRequest) => {
  console.log('[CopilotKit API] Received request');

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  try {
    const response = await handleRequest(req);
    console.log('[CopilotKit API] Response status:', response.status);
    return response;
  } catch (error) {
    console.error('[CopilotKit API] Error:', error);
    throw error;
  }
};
