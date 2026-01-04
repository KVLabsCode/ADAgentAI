import { createClient } from "@sanity/client"

// Sanity client configuration
// Configure these environment variables in .env.local:
// NEXT_PUBLIC_SANITY_PROJECT_ID - Your Sanity project ID
// NEXT_PUBLIC_SANITY_DATASET - Dataset name (e.g., 'production')
// SANITY_API_TOKEN - Optional: API token for authenticated requests (admin only)

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "demo",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: process.env.NODE_ENV === "production",
})

// Client with write access (server-side only)
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "demo",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

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
    category,
    featured,
    status,
    "authorName": coalesce(author->name, authorName),
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
    category,
    featured,
    status,
    "authorName": coalesce(author->name, authorName),
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
    "authorRole": coalesce(author->role, authorRole),
    publishedAt,
    "createdAt": _createdAt
  }`,
}

// Types for Sanity responses
export interface SanityBlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: "Product" | "Company" | "Education" | "Tips"
  featured: boolean
  status: "draft" | "published"
  authorName: string
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
