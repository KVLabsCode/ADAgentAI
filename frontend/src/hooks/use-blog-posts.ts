"use client"

import { useState, useEffect } from "react"
import { sanityClient, sanityWriteClient, blogQueries, isSanityConfigured, type SanityBlogPost } from "@/lib/sanity"
import type { BlogPostMeta, BlogPost } from "@/lib/types"

// Mock data fallback when Sanity is not configured
const MOCK_POSTS: BlogPostMeta[] = [
  {
    id: "1",
    slug: "introducing-adagent",
    title: "Introducing ADAgent: AI-Powered Ad Monetization",
    excerpt: "Meet ADAgent, your AI assistant for managing AdMob and Google Ad Manager accounts efficiently.",
    category: "Product",
    status: "published",
    featured: true,
    authorName: "Admin User",
    publishedAt: "2026-01-01T10:00:00Z",
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-01-01T10:00:00Z",
  },
  {
    id: "2",
    slug: "maximize-ad-revenue",
    title: "5 Tips to Maximize Your Ad Revenue in 2026",
    excerpt: "Learn proven strategies to boost your ad revenue using data-driven insights and optimization techniques.",
    category: "Tips",
    status: "published",
    featured: false,
    authorName: "Admin User",
    publishedAt: "2026-01-02T12:00:00Z",
    createdAt: "2026-01-02T11:00:00Z",
    updatedAt: "2026-01-02T12:00:00Z",
  },
  {
    id: "3",
    slug: "understanding-ecpm",
    title: "Understanding eCPM: A Complete Guide",
    excerpt: "Everything you need to know about effective cost per mille and how to improve it.",
    category: "Education",
    status: "draft",
    featured: false,
    authorName: "Admin User",
    createdAt: "2026-01-03T08:00:00Z",
    updatedAt: "2026-01-03T08:00:00Z",
  },
]

// Transform Sanity post to BlogPostMeta
function transformToMeta(post: SanityBlogPost): BlogPostMeta {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    status: post.status,
    featured: post.featured,
    authorName: post.authorName || "Unknown",
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

// Transform Sanity post to full BlogPost
function transformToBlogPost(post: SanityBlogPost): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    status: post.status,
    featured: post.featured,
    authorId: post.authorId || "",
    authorName: post.authorName || "Unknown",
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPostMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (isSanityConfigured()) {
          // Fetch from Sanity CMS
          const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
            blogQueries.allPostsAdmin
          )
          const transformedPosts = sanityPosts.map(transformToMeta)
          setPosts(transformedPosts)
        } else {
          // Fallback to mock data
          await new Promise((resolve) => setTimeout(resolve, 500))
          setPosts(MOCK_POSTS)
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err)
        setError("Failed to fetch posts")
        // Fallback to mock data on error
        setPosts(MOCK_POSTS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const deletePost = async (id: string) => {
    try {
      if (isSanityConfigured()) {
        // Delete from Sanity
        await sanityWriteClient.delete(id)
      }
      // Update local state
      setPosts((prev) => prev.filter((post) => post.id !== id))
    } catch (err) {
      console.error("Failed to delete post:", err)
      throw err
    }
  }

  return { posts, isLoading, error, deletePost }
}

export function useBlogPost(id: string | null) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchPost = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (isSanityConfigured()) {
          // Fetch from Sanity CMS
          const sanityPost = await sanityClient.fetch<SanityBlogPost | null>(
            blogQueries.postById,
            { id }
          )
          if (sanityPost) {
            setPost(transformToBlogPost(sanityPost))
          } else {
            setError("Post not found")
          }
        } else {
          // Fallback to mock data
          await new Promise((resolve) => setTimeout(resolve, 300))
          const mockPost = MOCK_POSTS.find((p) => p.id === id)
          if (mockPost) {
            setPost({
              ...mockPost,
              category: mockPost.category as BlogPost["category"],
              content: "<p>This is sample blog content. Configure Sanity CMS to manage real content.</p>",
              authorId: "user-1",
            })
          } else {
            setError("Post not found")
          }
        }
      } catch (err) {
        console.error("Failed to fetch post:", err)
        setError("Failed to fetch post")
      } finally {
        setIsLoading(false)
      }
    }
    fetchPost()
  }, [id])

  return { post, isLoading, error }
}

export function useSavePost() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savePost = async (
    data: Partial<BlogPost>,
    id?: string
  ): Promise<{ success: boolean; id?: string }> => {
    try {
      setIsSaving(true)
      setError(null)

      if (isSanityConfigured()) {
        if (id) {
          // Update existing post in Sanity
          await sanityWriteClient
            .patch(id)
            .set({
              title: data.title,
              "slug.current": data.slug,
              excerpt: data.excerpt,
              content: data.content,
              category: data.category,
              status: data.status,
              featured: data.featured,
              authorName: data.authorName,
              publishedAt: data.status === "published" ? new Date().toISOString() : undefined,
            })
            .commit()
          return { success: true, id }
        } else {
          // Create new post in Sanity
          const result = await sanityWriteClient.create({
            _type: "post",
            title: data.title,
            slug: { current: data.slug },
            excerpt: data.excerpt,
            content: data.content,
            category: data.category,
            status: data.status || "draft",
            featured: data.featured || false,
            authorId: data.authorId,
            authorName: data.authorName,
            publishedAt: data.status === "published" ? new Date().toISOString() : undefined,
          })
          return { success: true, id: result._id }
        }
      } else {
        // Mock save for demo
        await new Promise((resolve) => setTimeout(resolve, 500))
        return { success: true, id: id || "new-post-id" }
      }
    } catch (err) {
      console.error("Failed to save post:", err)
      setError("Failed to save post")
      return { success: false }
    } finally {
      setIsSaving(false)
    }
  }

  return { savePost, isSaving, error }
}
