import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";

import { db } from "../db";
import { blogPosts, type NewBlogPost } from "../db/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { logAuditEntry } from "../lib/audit";

const blog = new Hono();

// ============================================================
// Schemas
// ============================================================

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase alphanumeric with hyphens only",
  }),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("draft"),
});

const updatePostSchema = createPostSchema.partial();

const listQuerySchema = z.object({
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================
// Public Routes (no auth required)
// ============================================================

/**
 * GET /blog - List published posts
 */
blog.get(
  "/",
  zValidator("query", listQuerySchema),
  async (c) => {
    const { category, featured, limit, offset } = c.req.valid("query");

    const posts = await db.query.blogPosts.findMany({
      where: and(
        eq(blogPosts.status, "published"),
        category ? eq(blogPosts.category, category) : undefined,
        featured !== undefined ? eq(blogPosts.featured, featured) : undefined
      ),
      orderBy: [desc(blogPosts.publishedAt)],
      limit,
      offset,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return c.json({
      posts: posts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        featured: post.featured,
        publishedAt: post.publishedAt,
        author: post.author,
      })),
    });
  }
);

/**
 * GET /blog/:slug - Get single published post
 */
blog.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const post = await db.query.blogPosts.findFirst({
    where: and(
      eq(blogPosts.slug, slug),
      eq(blogPosts.status, "published")
    ),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ post });
});

// ============================================================
// Admin Routes (require auth + admin role)
// ============================================================

const adminBlog = new Hono();
adminBlog.use("*", requireAuth, requireAdmin);

/**
 * GET /admin/blog - List all posts (including drafts)
 */
adminBlog.get(
  "/",
  zValidator("query", listQuerySchema.extend({
    status: z.enum(["draft", "published"]).optional(),
  })),
  async (c) => {
    const adminUser = c.get("user");
    const { category, featured, status, limit, offset } = c.req.valid("query");

    const posts = await db.query.blogPosts.findMany({
      where: and(
        status ? eq(blogPosts.status, status) : undefined,
        category ? eq(blogPosts.category, category) : undefined,
        featured !== undefined ? eq(blogPosts.featured, featured) : undefined
      ),
      orderBy: [desc(blogPosts.updatedAt)],
      limit,
      offset,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Log admin access
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "list_blog_posts",
      metadata: { category, featured, status, limit, offset, count: posts.length },
    });

    return c.json({ posts });
  }
);

/**
 * GET /admin/blog/:id - Get single post by ID (including drafts)
 */
adminBlog.get("/:id", async (c) => {
  const adminUser = c.get("user");
  const id = c.req.param("id");

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Log admin access
  await logAuditEntry({
    adminUserId: adminUser.id,
    action: "view_blog_post",
    targetResourceId: id,
    metadata: { slug: post.slug, status: post.status },
  });

  return c.json({ post });
});

/**
 * POST /admin/blog - Create post
 */
adminBlog.post(
  "/",
  zValidator("json", createPostSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    // Check if slug already exists
    const existingPost = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, data.slug),
    });

    if (existingPost) {
      return c.json({ error: "A post with this slug already exists" }, 409);
    }

    const [post] = await db
      .insert(blogPosts)
      .values({
        ...data,
        authorId: user.id,
        publishedAt: data.status === "published" ? new Date() : null,
      } satisfies NewBlogPost)
      .returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: user.id,
      action: "create_blog_post",
      targetResourceId: post.id,
      metadata: { slug: post.slug, title: post.title, status: post.status },
    });

    return c.json({ post }, 201);
  }
);

/**
 * PUT /admin/blog/:id - Update post
 */
adminBlog.put(
  "/:id",
  zValidator("json", updatePostSchema),
  async (c) => {
    const adminUser = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Check if post exists
    const existingPost = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, id),
    });

    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Check if new slug conflicts with another post
    if (data.slug && data.slug !== existingPost.slug) {
      const slugConflict = await db.query.blogPosts.findFirst({
        where: eq(blogPosts.slug, data.slug),
      });
      if (slugConflict) {
        return c.json({ error: "A post with this slug already exists" }, 409);
      }
    }

    // Handle publishedAt when status changes
    let publishedAt = existingPost.publishedAt;
    if (data.status === "published" && existingPost.status === "draft") {
      publishedAt = new Date();
    } else if (data.status === "draft") {
      publishedAt = null;
    }

    const [post] = await db
      .update(blogPosts)
      .set({
        ...data,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    // Log admin action
    await logAuditEntry({
      adminUserId: adminUser.id,
      action: "update_blog_post",
      targetResourceId: id,
      metadata: {
        slug: post.slug,
        previousStatus: existingPost.status,
        newStatus: post.status,
        changedFields: Object.keys(data),
      },
    });

    return c.json({ post });
  }
);

/**
 * DELETE /admin/blog/:id - Delete post
 */
adminBlog.delete("/:id", async (c) => {
  const adminUser = c.get("user");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Log admin action
  await logAuditEntry({
    adminUserId: adminUser.id,
    action: "delete_blog_post",
    targetResourceId: id,
    metadata: { slug: deleted.slug, title: deleted.title },
  });

  return c.json({ success: true });
});

// Export both routers
export { blog as publicBlog, adminBlog };
