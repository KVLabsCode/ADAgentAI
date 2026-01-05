// Server-side blog data fetching (no CORS issues)
import { sanityClient, blogQueries, isSanityConfigured, type SanityBlogPost } from "./sanity"

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  featured: boolean
  date: string
  readTime: string
  author: {
    name: string
    role: string
  }
}

export interface BlogPostMeta {
  slug: string
  title: string
  excerpt: string
  category: string
  featured: boolean
  date: string
  readTime: string
  author: {
    name: string
    role: string
  }
}

// Calculate reading time from content
function calculateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

// Transform Sanity post to blog format
function transformPost(post: SanityBlogPost): BlogPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    featured: post.featured,
    date: post.publishedAt || post.createdAt,
    readTime: calculateReadTime(post.content || ""),
    author: {
      name: post.authorName || "ADAgent Team",
      role: post.authorRole || "",
    },
  }
}

function toMeta(post: BlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    featured: post.featured,
    date: post.date,
    readTime: post.readTime,
    author: post.author,
  }
}

// Server-side: Get all published posts
export async function getAllPosts(): Promise<BlogPostMeta[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
      blogQueries.allPublishedPosts
    )
    const posts = sanityPosts.map(transformPost).map(toMeta)
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return posts
  } catch (err) {
    console.error("Failed to fetch blog posts:", err)
    return []
  }
}

// Server-side: Get single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSanityConfigured()) {
    return null
  }

  try {
    const post = await sanityClient.fetch<SanityBlogPost | null>(
      blogQueries.postBySlug,
      { slug }
    )
    return post ? transformPost(post) : null
  } catch (err) {
    console.error("Failed to fetch blog post:", err)
    return null
  }
}

// Server-side: Get related posts
export async function getRelatedPosts(currentSlug: string): Promise<BlogPostMeta[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
      blogQueries.relatedPosts,
      { slug: currentSlug }
    )
    return sanityPosts.map(transformPost).map(toMeta)
  } catch (err) {
    console.error("Failed to fetch related posts:", err)
    return []
  }
}

// Get all slugs for static generation
export async function getAllSlugs(): Promise<string[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    const posts = await getAllPosts()
    return posts.map(p => p.slug)
  } catch {
    return []
  }
}
