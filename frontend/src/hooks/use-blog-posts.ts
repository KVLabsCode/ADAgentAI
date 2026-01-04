"use client"

import { useState, useEffect } from "react"
import { sanityClient, sanityWriteClient, blogQueries, isSanityConfigured, type SanityBlogPost } from "@/lib/sanity"
import type { BlogPostMeta, BlogPost } from "@/lib/types"

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

        if (!isSanityConfigured()) {
          // Sanity not configured - show empty state
          setPosts([])
          return
        }

        // Fetch from Sanity CMS
        const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
          blogQueries.allPostsAdmin
        )
        const transformedPosts = sanityPosts.map(transformToMeta)
        setPosts(transformedPosts)
      } catch (err) {
        console.error("Failed to fetch posts:", err)
        setError("Failed to fetch posts")
        setPosts([])
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

        if (!isSanityConfigured()) {
          setError("Blog not configured")
          return
        }

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

      if (!isSanityConfigured()) {
        setError("Sanity CMS not configured")
        return { success: false }
      }

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
