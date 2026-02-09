// Type-only imports — erased at compile time, no module evaluation
import type { SanityClient } from "@sanity/client"

// Sanity client configuration
// Environment variables (set via Vercel integration):
// NEXT_PUBLIC_SANITY_PROJECT_ID - Your Sanity project ID
// NEXT_PUBLIC_SANITY_DATASET - Dataset name (e.g., 'production')
// SANITY_API_READ_TOKEN - Read token for authenticated requests
// SANITY_API_WRITE_TOKEN - Write token for mutations (admin only)

// Lazy client initialization — uses require() inside functions so
// @sanity/client module is NOT evaluated at import time. This prevents
// crypto.randomUUID() from being called during Next.js PPR prerendering.
let _sanityClient: SanityClient | null = null
export function getSanityClient(): SanityClient {
  if (!_sanityClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@sanity/client") as typeof import("@sanity/client")
    _sanityClient = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "demo",
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
      apiVersion: "2024-01-01",
      useCdn: process.env.NODE_ENV === "production",
      token: process.env.SANITY_API_READ_TOKEN,
    })
  }
  return _sanityClient
}

// Keep for backward compat — lazily initialized via Proxy
export const sanityClient = new Proxy({} as SanityClient, {
  get(_target, prop, receiver) {
    const real = getSanityClient()
    const value = Reflect.get(real, prop, receiver)
    if (typeof value === "function") {
      return value.bind(real)
    }
    return value
  },
})

// Client with write access (server-side only)
let _sanityWriteClient: SanityClient | null = null
export const sanityWriteClient = new Proxy({} as SanityClient, {
  get(_target, prop, receiver) {
    if (!_sanityWriteClient) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require("@sanity/client") as typeof import("@sanity/client")
      _sanityWriteClient = createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "demo",
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
        apiVersion: "2024-01-01",
        useCdn: false,
        token: process.env.SANITY_API_WRITE_TOKEN,
      })
    }
    const real = _sanityWriteClient
    const value = Reflect.get(real, prop, receiver)
    if (typeof value === "function") {
      return value.bind(real)
    }
    return value
  },
})

// Image URL builder for Sanity images (lazy)
let _builder: any = null
export function urlFor(source: any) {
  if (!_builder) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createImageUrlBuilder } = require("@sanity/image-url")
    _builder = createImageUrlBuilder(getSanityClient())
  }
  return _builder.image(source)
}

// GROQ queries for blog posts
// Note: Uses coalesce() to support both author reference and direct authorName field
export const blogQueries = {
  // Get all published posts for public blog
  allPublishedPosts: `*[_type == "post" && status == "published"] | order(publishedAt desc) {
    "id": _id,
    "slug": slug.current,
    title,
    excerpt,
    content,
    coverImage,
    category,
    featured,
    status,
    "authorName": coalesce(author->name, authorName),
    "authorImage": coalesce(author->image, authorImage),
    "authorRole": coalesce(author->role, authorRole),
    publishedAt,
    "createdAt": _createdAt,
    "updatedAt": _updatedAt
  }`,

  // Get single published post by slug
  postBySlug: `*[_type == "post" && slug.current == $slug && status == "published"][0] {
    "id": _id,
    "slug": slug.current,
    title,
    excerpt,
    content,
    coverImage,
    category,
    featured,
    status,
    "authorName": coalesce(author->name, authorName),
    "authorImage": coalesce(author->image, authorImage),
    "authorRole": coalesce(author->role, authorRole),
    publishedAt,
    "createdAt": _createdAt,
    "updatedAt": _updatedAt
  }`,

  // Get all posts for admin (including drafts)
  allPostsAdmin: `*[_type == "post"] | order(_updatedAt desc) {
    "id": _id,
    "slug": slug.current,
    title,
    excerpt,
    content,
    category,
    featured,
    status,
    "authorId": author->_id,
    "authorName": coalesce(author->name, authorName),
    "authorImage": coalesce(author->image, authorImage),
    publishedAt,
    "createdAt": _createdAt,
    "updatedAt": _updatedAt
  }`,

  // Get single post by ID for editing
  postById: `*[_type == "post" && _id == $id][0] {
    "id": _id,
    "slug": slug.current,
    title,
    excerpt,
    content,
    category,
    featured,
    status,
    "authorId": author->_id,
    "authorName": coalesce(author->name, authorName),
    "authorImage": coalesce(author->image, authorImage),
    publishedAt,
    "createdAt": _createdAt,
    "updatedAt": _updatedAt
  }`,

  // Get related posts (same category, excluding current)
  relatedPosts: `*[_type == "post" && status == "published" && slug.current != $slug] | order(publishedAt desc)[0...2] {
    "id": _id,
    "slug": slug.current,
    title,
    excerpt,
    category,
    featured,
    "authorName": coalesce(author->name, authorName),
    "authorImage": coalesce(author->image, authorImage),
    "authorRole": coalesce(author->role, authorRole),
    publishedAt,
    "createdAt": _createdAt
  }`,
}

// Portable Text block type
export interface PortableTextBlock {
  _type: string
  _key: string
  children?: Array<{
    _type: string
    _key: string
    text?: string
    marks?: string[]
  }>
  style?: string
  markDefs?: Array<{
    _type: string
    _key: string
    href?: string
  }>
  asset?: {
    _ref: string
    _type: string
  }
  code?: string
  language?: string
  caption?: string
  alt?: string
}

// Types for Sanity responses
export interface SanityBlogPost {
  id: string
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  content: string | PortableTextBlock[] // Support both old markdown and new Portable Text
  coverImage?: {
    asset: {
      _ref: string
    }
  }
  category: "Product" | "Company" | "Education" | "Tips"
  featured: boolean
  status: "draft" | "published"
  authorName: string
  authorImage?: string
  authorRole?: string
  authorId?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

// Helper to check if Sanity is configured
export function isSanityConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "demo"
  )
}
