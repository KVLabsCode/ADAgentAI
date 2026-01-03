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

// Mock data fallback when Sanity is not configured
const MOCK_PUBLISHED_POSTS: PublicBlogPost[] = [
  {
    slug: "introducing-adagent",
    title: "Introducing ADAgent: AI-Powered Ad Monetization",
    excerpt: "Meet ADAgent, your AI assistant for managing AdMob and Google Ad Manager accounts efficiently.",
    content: `
## What is ADAgent?

ADAgent is an AI-powered assistant designed specifically for app developers and publishers who use Google's advertising platforms. Whether you're managing AdMob for mobile ads or Google Ad Manager for more complex setups, ADAgent helps you get answers and insights through natural conversation.

## Why We Built This

Managing ad monetization can be overwhelming. Between understanding eCPM fluctuations, optimizing ad placements, debugging mediation issues, and generating reports, there's a lot to keep track of.

We built ADAgent to simplify this. Instead of navigating complex dashboards or reading through documentation, you can simply ask questions like:

- "What was my revenue yesterday?"
- "Show me my top performing ad units"
- "Why did my eCPM drop last week?"

## Key Features

**Natural Language Queries** - Ask questions in plain English and get instant answers about your ad performance.

**Multi-Platform Support** - Connect both AdMob and Google Ad Manager accounts to get a unified view.

**Real-Time Insights** - Get up-to-date information about your ad performance without waiting for reports.

**Secure Connection** - Your data stays secure with OAuth-based authentication.

## Getting Started

1. Sign up for early access
2. Connect your AdMob or GAM account
3. Start asking questions

We're currently in early access and would love your feedback. Join us today and simplify your ad management workflow.
    `,
    category: "Product",
    featured: true,
    date: "2026-01-01",
    readTime: "3 min read",
    author: {
      name: "ADAgent Team",
      role: "Product",
    },
  },
  {
    slug: "maximize-ad-revenue",
    title: "5 Tips to Maximize Your Ad Revenue in 2026",
    excerpt: "Learn proven strategies to boost your ad revenue using data-driven insights and optimization techniques.",
    content: `
## Introduction

Maximizing ad revenue requires a combination of smart strategy and continuous optimization. Here are five proven tips to help you boost your earnings this year.

## 1. Optimize Ad Placement

The location of your ads significantly impacts performance. Test different placements to find what works best for your app or site.

**Best practices:**
- Place ads where users naturally pause
- Avoid intrusive placements that harm UX
- Test both banner and interstitial formats

## 2. Focus on Fill Rate

A high fill rate ensures you're monetizing every impression opportunity.

- Use mediation to increase fill rates
- Set appropriate floor prices
- Consider multiple ad networks

## 3. Monitor eCPM Trends

Understanding your eCPM patterns helps identify optimization opportunities.

- Track daily and weekly trends
- Compare performance across ad units
- Identify seasonal patterns

## 4. A/B Test Ad Formats

Different users respond to different ad formats. Regular testing helps optimize.

- Test rewarded vs interstitial ads
- Experiment with native ad styles
- Measure impact on user retention

## 5. Use Data to Drive Decisions

Let data guide your optimization efforts, not assumptions.

- Review performance reports regularly
- Set up alerts for significant changes
- Track key metrics over time

## Conclusion

Maximizing ad revenue is an ongoing process. By following these tips and continuously monitoring your performance, you can significantly improve your earnings.
    `,
    category: "Tips",
    featured: false,
    date: "2026-01-02",
    readTime: "4 min read",
    author: {
      name: "ADAgent Team",
      role: "Growth",
    },
  },
]

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

        if (isSanityConfigured()) {
          // Fetch from Sanity CMS
          const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
            blogQueries.allPublishedPosts
          )
          const transformedPosts = sanityPosts.map(transformSanityPost).map(transformToMeta)
          transformedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          setPosts(transformedPosts)
        } else {
          // Fallback to mock data
          await new Promise((resolve) => setTimeout(resolve, 300))
          const postMetas = MOCK_PUBLISHED_POSTS.map(transformToMeta)
          postMetas.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          setPosts(postMetas)
        }
      } catch (err) {
        console.error("Failed to fetch blog posts:", err)
        setError("Failed to fetch posts")
        // Fallback to mock data on error
        const postMetas = MOCK_PUBLISHED_POSTS.map(transformToMeta)
        setPosts(postMetas)
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

        if (isSanityConfigured()) {
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
        } else {
          // Fallback to mock data
          await new Promise((resolve) => setTimeout(resolve, 200))
          const foundPost = MOCK_PUBLISHED_POSTS.find((p) => p.slug === slug)
          if (foundPost) {
            setPost(foundPost)
          } else {
            setError("Post not found")
          }
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
        if (isSanityConfigured()) {
          const sanityPosts = await sanityClient.fetch<SanityBlogPost[]>(
            blogQueries.relatedPosts,
            { slug: currentSlug }
          )
          const transformedPosts = sanityPosts.map(transformSanityPost).map(transformToMeta)
          setPosts(transformedPosts)
        } else {
          // Fallback to mock data
          const related = MOCK_PUBLISHED_POSTS
            .filter((p) => p.slug !== currentSlug)
            .slice(0, 2)
            .map(transformToMeta)
          setPosts(related)
        }
      } catch (err) {
        console.error("Failed to fetch related posts:", err)
        // Fallback to mock data
        const related = MOCK_PUBLISHED_POSTS
          .filter((p) => p.slug !== currentSlug)
          .slice(0, 2)
          .map(transformToMeta)
        setPosts(related)
      }
    }
    fetchRelated()
  }, [currentSlug])

  return { posts }
}
