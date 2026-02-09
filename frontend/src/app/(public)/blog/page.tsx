import { Metadata } from "next"
import { cacheLife } from "next/cache"
import { BlogContent } from "./blog-content"

export const metadata: Metadata = {
  title: "Blog | ADAgent",
  description: "Latest news and updates from ADAgent",
}

async function getCachedPosts() {
  "use cache"
  cacheLife("hours")
  const { getAllPosts } = await import("@/lib/blog")
  return getAllPosts()
}

export default async function BlogPage() {
  const posts = await getCachedPosts()

  return (
    <div className="min-h-screen bg-[#08090a]">
      {/* Main content area with proper padding */}
      <main className="pt-16 pb-24">
        {/* Container - Linear uses centered content with max-width */}
        <div className="mx-auto max-w-[976px] px-6">
          {/* Page Header - Linear style */}
          <header className="mb-8">
            <h1 className="text-[48px] font-[590] leading-[1.1] tracking-[-0.022em] text-[#f7f8f8]">
              Blog
            </h1>
          </header>

          <BlogContent posts={posts} />
        </div>
      </main>
    </div>
  )
}
