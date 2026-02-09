// Server-side blog data fetching using direct fetch() to Sanity API.
// Avoids @sanity/client which uses nanoid → crypto.getRandomValues() at
// module level, breaking Next.js PPR/cacheComponents prerendering.
import type { PortableTextBlock, SanityBlogPost } from "./sanity"
import { blogQueries } from "./sanity"

export interface BlogPost {
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  content: string | PortableTextBlock[] // Support both markdown and Portable Text
  isPortableText: boolean
  category: string
  featured: boolean
  date: string
  readTime: string
  coverImage?: string
  author: {
    name: string
    role: string
    image?: string
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
  coverImage?: string
  author: {
    name: string
    role: string
    image?: string
  }
}

// Direct Sanity API fetch — no @sanity/client needed
const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const SANITY_API_VERSION = "2024-01-01"
const SANITY_TOKEN = process.env.SANITY_API_READ_TOKEN

function isSanityConfigured(): boolean {
  return !!(SANITY_PROJECT_ID && SANITY_PROJECT_ID !== "demo")
}

async function sanityFetch<T>(query: string, params?: Record<string, string>): Promise<T> {
  const useCdn = process.env.NODE_ENV === "production" && !SANITY_TOKEN
  const host = useCdn ? "apicdn.sanity.io" : "api.sanity.io"
  const url = new URL(`https://${SANITY_PROJECT_ID}.${host}/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`)
  url.searchParams.set("query", query)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(`$${key}`, JSON.stringify(value))
    }
  }

  const headers: Record<string, string> = {}
  if (SANITY_TOKEN) {
    headers["Authorization"] = `Bearer ${SANITY_TOKEN}`
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    throw new Error(`Sanity API error: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.result as T
}

// Build Sanity image URL from asset reference (no @sanity/image-url needed)
function sanityImageUrl(image: { asset: { _ref: string } }): string {
  // _ref format: "image-{id}-{width}x{height}-{format}"
  const ref = image.asset._ref
  const [, id, dimensions, format] = ref.split("-")
  return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dimensions}.${format}`
}

// Calculate reading time from content (handles both string and Portable Text)
function calculateReadTime(content: string | PortableTextBlock[]): string {
  const wordsPerMinute = 200
  let text = ""

  if (typeof content === "string") {
    text = content
  } else if (Array.isArray(content)) {
    // Extract text from Portable Text blocks
    text = content
      .filter(block => block._type === "block")
      .map(block => block.children?.map(child => child.text || "").join("") || "")
      .join(" ")
  }

  const words = text.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

// Transform Sanity post to blog format
function transformPost(post: SanityBlogPost): BlogPost {
  const isPortableText = Array.isArray(post.content)

  let coverImageUrl: string | undefined
  if (post.coverImage?.asset) {
    coverImageUrl = sanityImageUrl(post.coverImage)
  }

  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    content: post.content,
    isPortableText,
    category: post.category,
    featured: post.featured,
    date: post.publishedAt || post.createdAt,
    readTime: calculateReadTime(post.content || ""),
    coverImage: coverImageUrl,
    author: {
      name: post.authorName || "ADAgentAI Team",
      role: post.authorRole || "",
      image: post.authorImage,
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
    coverImage: post.coverImage,
    author: post.author,
  }
}

// Server-side: Get all published posts
export async function getAllPosts(): Promise<BlogPostMeta[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    const sanityPosts = await sanityFetch<SanityBlogPost[]>(
      blogQueries.allPublishedPosts
    )
    const posts = sanityPosts.map(transformPost).map(toMeta)
    return posts.toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
    const post = await sanityFetch<SanityBlogPost | null>(
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
    const sanityPosts = await sanityFetch<SanityBlogPost[]>(
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
