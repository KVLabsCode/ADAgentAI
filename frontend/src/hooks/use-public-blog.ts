"use client"

import { useState, useEffect } from "react"
import { sanityClient, blogQueries, isSanityConfigured, type SanityBlogPost } from "@/lib/sanity"

// Types for public blog (simpler than admin)
export interface PublicBlogPost {
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

export interface PublicBlogPostMeta {
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

// Transform Sanity post to public blog post format
function transformSanityPost(post: SanityBlogPost): PublicBlogPost {
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

function transformToMeta(post: PublicBlogPost): PublicBlogPostMeta {
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

export function usePublicBlogPosts() {
  const [posts, setPosts] = useState<PublicBlogPostMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!isSanityConfigured()) {
          // Sanity not configured - show empty state
          setPosts([])
          return
        }

        // Fetch from Sanity CMS
        const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
          blogQueries.allPublishedPosts
        )
        const transformedPosts = sanityPosts.map(transformSanityPost).map(transformToMeta)
        transformedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setPosts(transformedPosts)
      } catch (err) {
        console.error("Failed to fetch blog posts:", err)
        setError("Failed to fetch posts")
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchPosts()
  }, [])

  return { posts, isLoading, error }
}

export function usePublicBlogPost(slug: string | null) {
  const [post, setPost] = useState<PublicBlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      return
    }

    const fetchPost = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!isSanityConfigured()) {
          setError("Blog not configured")
          return
        }

        // Fetch from Sanity CMS
        const sanityPost = await sanityClient.fetch<SanityBlogPost | null>(
          blogQueries.postBySlug,
          { slug }
        )
        if (sanityPost) {
          setPost(transformSanityPost(sanityPost))
        } else {
          setError("Post not found")
        }
      } catch (err) {
        console.error("Failed to fetch blog post:", err)
        setError("Failed to fetch post")
      } finally {
        setIsLoading(false)
      }
    }
    fetchPost()
  }, [slug])

  return { post, isLoading, error }
}

export function useRelatedPosts(currentSlug: string) {
  const [posts, setPosts] = useState<PublicBlogPostMeta[]>([])

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        if (!isSanityConfigured()) {
          setPosts([])
          return
        }

        const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
          blogQueries.relatedPosts,
          { slug: currentSlug }
        )
        const transformedPosts = sanityPosts.map(transformSanityPost).map(transformToMeta)
        setPosts(transformedPosts)
      } catch (err) {
        console.error("Failed to fetch related posts:", err)
        setPosts([])
      }
    }
    fetchRelated()
  }, [currentSlug])

  return { posts }
}
