import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { captureException, addBreadcrumb } from "../lib/sentry";

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);

    // Add request context as breadcrumb
    addBreadcrumb("Request failed", "http", {
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
    });

    // Zod validation errors
    if (error instanceof ZodError) {
      return c.json<AppError>(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.flatten(),
        },
        400
      );
    }

    // Hono HTTP exceptions
    if (error instanceof HTTPException) {
      return c.json<AppError>(
        {
          code: "HTTP_ERROR",
          message: error.message,
        },
        error.status
      );
    }

    // Generic errors
    if (error instanceof Error) {
      const isDev = process.env.NODE_ENV === "development";

      // Capture to Sentry for non-validation errors
      captureException(error, {
        path: c.req.path,
        method: c.req.method,
      });

      return c.json<AppError>(
        {
          code: "INTERNAL_ERROR",
          message: isDev ? error.message : "An unexpected error occurred",
          details: isDev ? error.stack : undefined,
        },
        500
      );
    }

    // Unknown errors
    return c.json<AppError>(
      {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
      },
      500
    );
  }
}
