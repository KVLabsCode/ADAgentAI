"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Send } from "lucide-react"
import Link from "next/link"

import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { Label } from "@/atoms/label"
import { Textarea } from "@/atoms/textarea"
import { Checkbox } from "@/atoms/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import { RichTextEditor } from "./rich-text-editor"
import { useSavePost } from "@/hooks/use-blog-posts"
import { useUser } from "@/hooks/use-user"
import type { BlogPost } from "@/lib/types"

interface PostEditorFormProps {
  post?: BlogPost
  isEdit?: boolean
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const CATEGORIES = ["Product", "Company", "Education", "Tips"] as const

export function PostEditorForm({ post, isEdit = false }: PostEditorFormProps) {
  const router = useRouter()
  const { savePost, isSaving } = useSavePost()
  const { user } = useUser()

  const [title, setTitle] = React.useState(post?.title || "")
  const [slug, setSlug] = React.useState(post?.slug || "")
  const [excerpt, setExcerpt] = React.useState(post?.excerpt || "")
  const [category, setCategory] = React.useState<string>(
    post?.category || "Product"
  )
  const [featured, setFeatured] = React.useState(post?.featured || false)
  const [content, setContent] = React.useState<string>(
    typeof post?.content === 'string' ? post.content : ""
  )
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false)

  // Auto-generate slug from title
  React.useEffect(() => {
    if (!slugManuallyEdited && !isEdit) {
      setSlug(slugify(title))
    }
  }, [title, slugManuallyEdited, isEdit])

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    setSlug(slugify(value))
  }

  const handleSave = async (status: "draft" | "published") => {
    const postData: Partial<BlogPost> = {
      title,
      slug,
      excerpt,
      category: category as BlogPost["category"],
      featured,
      content,
      status,
      // Author is automatically set to the logged-in admin user
      authorId: post?.authorId || user?.id || '',
      authorName: post?.authorName || user?.name || 'Unknown',
    }

    const result = await savePost(postData, post?.id)
    if (result.success) {
      router.push("/dashboard/blog")
    }
  }

  const isValid = title.trim() && slug.trim() && content.trim()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/dashboard/blog">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Edit Post" : "New Post"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? "Update your blog post"
                : "Create a new blog post"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave("draft")}
            disabled={!isValid || isSaving}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave("published")}
            disabled={!isValid || isSaving}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs font-medium">
            Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            className="h-9 text-sm"
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug" className="text-xs font-medium">
            Slug
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">/blog/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="post-url-slug"
              className="h-9 text-sm flex-1"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            URL-friendly identifier. Auto-generated from title.
          </p>
        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt" className="text-xs font-medium">
            Excerpt
          </Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief description for SEO and previews (~160 chars)"
            className="text-sm resize-none"
            rows={3}
          />
          <p className="text-[10px] text-muted-foreground">
            {excerpt.length}/160 characters
          </p>
        </div>

        {/* Category & Featured */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-sm">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Options</Label>
            <div className="flex items-center gap-2 h-9">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked === true)}
              />
              <Label
                htmlFor="featured"
                className="text-xs font-normal cursor-pointer"
              >
                Featured post
              </Label>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Content</Label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your blog post content here..."
          />
        </div>
      </div>
    </div>
  )
}
