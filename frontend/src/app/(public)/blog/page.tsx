import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog | ADAgent",
  description: "Latest news and updates from ADAgent",
}

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="text-3xl font-bold text-[#f7f8f8] mb-4">Blog</h1>
      <p className="text-[#8a8f98] text-lg mb-8">
        Coming soon. Stay tuned for updates, tips, and insights about ad monetization.
      </p>

      <div className="border border-white/[0.08] rounded-lg p-8 bg-white/[0.02]">
        <p className="text-[#8a8f98] text-center">
          No posts yet. Check back soon!
        </p>
      </div>
    </div>
  )
}
