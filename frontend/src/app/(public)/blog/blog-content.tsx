"use client"

import { useState } from "react"
import Link from "next/link"
import type { BlogPostMeta } from "@/lib/blog"

const categories = [
  { label: "All", value: "" },
  { label: "Product", value: "product" },
  { label: "Company", value: "company" },
  { label: "Education", value: "education" },
  { label: "Tips", value: "tips" },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

// Featured post card - Linear style with large image
function FeaturedPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      {/* Image container - subtle gradient background */}
      <div className="aspect-[16/10] rounded-md overflow-hidden bg-gradient-to-br from-[#18191b] to-[#0d0e0f] mb-5">
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-[#2a2a2e] text-7xl font-semibold opacity-20">
              {post.title.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* Meta line: Author · Date */}
      <div className="flex items-center text-[13px] leading-[1.5] text-[#8a8f98] mb-2">
        <span>{post.author.name}</span>
        <span className="mx-[6px] text-[#4a4d52]">·</span>
        <span>{formatDate(post.date)}</span>
      </div>

      {/* Title - Linear uses 24px with tight letter-spacing */}
      <h3 className="text-[24px] font-[590] leading-[1.33] tracking-[-0.012em] text-[#f7f8f8] group-hover:text-white transition-colors duration-150 mb-2">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-[15px] leading-[1.6] text-[#8a8f98] line-clamp-2">
        {post.excerpt}
      </p>
    </Link>
  )
}

// Regular post card - Linear list style
function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block py-5">
      {/* Meta line */}
      <div className="flex items-center text-[13px] leading-[1.5] text-[#8a8f98] mb-2">
        <span>{post.author.name}</span>
        <span className="mx-[6px] text-[#4a4d52]">·</span>
        <span>{formatDate(post.date)}</span>
      </div>

      {/* Title */}
      <h4 className="text-[18px] font-[510] leading-[1.4] tracking-[-0.01em] text-[#f7f8f8] group-hover:text-white transition-colors duration-150">
        {post.title}
      </h4>
    </Link>
  )
}

interface BlogContentProps {
  posts: BlogPostMeta[]
}

export function BlogContent({ posts }: BlogContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("")

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      activeCategory === "" ||
      (post.category && post.category.toLowerCase() === activeCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  // Split posts: first 4 featured, rest in list
  const featuredPosts = filteredPosts.slice(0, 4)
  const remainingPosts = filteredPosts.slice(4)

  return (
    <>
      {/* Category tabs + Search - Linear style */}
      <div className="flex items-center justify-between mb-12">
        <nav className="flex items-center gap-6">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`text-[15px] leading-[1.6] font-normal transition-colors duration-150 ${
                activeCategory === cat.value
                  ? "text-[#f7f8f8]"
                  : "text-[#6b6f76] hover:text-[#f7f8f8]"
              }`}
              suppressHydrationWarning
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Search - Linear pill style */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              fill="#6b6f76"
              viewBox="0 0 16 16"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7 2C9.76142 2 12 4.23858 12 7C12 8.11012 11.6375 9.13519 11.0254 9.96484L13.7803 12.7197C14.0732 13.0126 14.0732 13.4874 13.7803 13.7803C13.4874 14.0732 13.0126 14.0732 12.7197 13.7803L9.96484 11.0254C9.13519 11.6375 8.11012 12 7 12C4.23858 12 2 9.76142 2 7C2 4.23858 4.23858 2 7 2ZM7 3.5C5.067 3.5 3.5 5.067 3.5 7C3.5 8.933 5.067 10.5 7 10.5C8.933 10.5 10.5 8.933 10.5 7C10.5 5.067 8.933 3.5 7 3.5Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-[180px] pl-9 pr-4 rounded-full border border-[#27292d] bg-transparent text-[14px] text-[#f7f8f8] placeholder:text-[#6b6f76] hover:border-[#3a3d42] focus:border-[#4a4d52] focus:outline-none transition-colors duration-150"
              suppressHydrationWarning
            />
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-md bg-[#141516] p-16 text-center">
          <p className="text-[15px] text-[#6b6f76]">
            {searchQuery || activeCategory
              ? "No posts found matching your criteria."
              : "No posts yet. Check back soon!"}
          </p>
        </div>
      ) : (
        <>
          {/* Featured posts - 2x2 grid with vertical dividers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-14">
            {featuredPosts.map((post, index) => (
              <div key={post.slug} className="relative">
                <FeaturedPostCard post={post} />
                {/* Vertical divider between columns */}
                {index % 2 === 0 && featuredPosts[index + 1] && (
                  <div className="hidden md:block absolute top-0 -right-8 h-full w-px bg-[#1a1b1d]" />
                )}
              </div>
            ))}
          </div>

          {/* More posts section */}
          {remainingPosts.length > 0 && (
            <div className="mt-20 pt-12 border-t border-[#1a1b1d]">
              <h2 className="text-[20px] font-[590] tracking-[-0.01em] text-[#f7f8f8] mb-2">
                More Posts
              </h2>
              <div className="divide-y divide-[#1a1b1d]">
                {remainingPosts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
