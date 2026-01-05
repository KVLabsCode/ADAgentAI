"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BlogPostMeta } from "@/lib/blog"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface BlogListProps {
  posts: BlogPostMeta[]
}

export function BlogList({ posts }: BlogListProps) {
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))]

  // Filter posts by selected category
  const filteredPosts = selectedCategory === "All"
    ? posts
    : posts.filter((p) => p.category === selectedCategory)

  const featuredPost = filteredPosts.find((p) => p.featured)
  const recentPosts = filteredPosts.filter((p) => !p.featured)

  return (
    <>
      {/* Categories */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    category === selectedCategory
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
                      {featuredPost.author.image ? (
                        <img
                          src={featuredPost.author.image}
                          alt={featuredPost.author.name}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center text-[8px] font-semibold">
                          {featuredPost.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
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
      {filteredPosts.length === 0 && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-sm text-muted-foreground">
                {posts.length === 0
                  ? "No blog posts yet. Check back soon!"
                  : `No posts in "${selectedCategory}" category.`}
              </p>
              {posts.length > 0 && (
                <button
                  onClick={() => setSelectedCategory("All")}
                  className="mt-3 text-xs text-foreground underline hover:no-underline"
                >
                  View all posts
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
