import { Metadata } from "next"
import Link from "next/link"
import { getAllPosts, type BlogPostMeta } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog | ADAgent",
  description: "Latest news and updates from ADAgent",
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-[#5e6ad2] bg-[#5e6ad2]/10 px-2 py-1 rounded">
          {post.category}
        </span>
        {post.featured && (
          <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
            Featured
          </span>
        )}
      </div>
      <h2 className="text-xl font-semibold text-[#f7f8f8] mb-2">{post.title}</h2>
      <p className="text-[#8a8f98] text-sm mb-4 line-clamp-2">{post.excerpt}</p>
      <div className="flex items-center justify-between text-xs text-[#6b7280]">
        <span>{post.author.name}</span>
        <div className="flex items-center gap-3">
          <span>{formatDate(post.date)}</span>
          <span>{post.readTime}</span>
        </div>
      </div>
    </Link>
  )
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="text-3xl font-bold text-[#f7f8f8] mb-4">Blog</h1>
      <p className="text-[#8a8f98] text-lg mb-8">
        Updates, tips, and insights about ad monetization.
      </p>

      {posts.length === 0 ? (
        <div className="border border-white/[0.08] rounded-lg p-8 bg-white/[0.02]">
          <p className="text-[#8a8f98] text-center">
            No posts yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
