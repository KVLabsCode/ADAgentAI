"use client"

import Link from "next/link"
import { ArrowRight, Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePublicBlogPosts } from "@/hooks/use-public-blog"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col">
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </section>
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </section>
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function BlogPage() {
  const { posts, isLoading, error } = usePublicBlogPosts()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const featuredPost = posts.find((p) => p.featured)
  const recentPosts = posts.filter((p) => !p.featured)
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))]

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Blog
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Product updates, tips, and insights on ad monetization.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    category === "All"
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group block rounded-lg border border-border/50 overflow-hidden hover:border-border transition-colors"
              >
                <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-8 md:p-12">
                  <Badge variant="secondary" className="mb-4 text-[10px]">
                    Featured
                  </Badge>
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3 group-hover:text-foreground/80 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[8px] font-semibold">
                        AD
                      </div>
                      <span>{featuredPost.author.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(featuredPost.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{featuredPost.readTime}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-sm font-medium mb-6">Recent Posts</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {recentPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group block rounded-lg border border-border/50 p-5 hover:border-border hover:bg-muted/20 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/50">
                        {post.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(post.date)}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-2 group-hover:text-foreground/80 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                        Read more
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-sm text-muted-foreground">
                No blog posts yet. Check back soon!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-12 border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-base font-medium">Stay updated</h2>
            <p className="text-xs text-muted-foreground">
              Get the latest posts and product updates delivered to your inbox.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-8 px-3 text-xs rounded-md border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button className="h-8 px-3 text-xs font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
