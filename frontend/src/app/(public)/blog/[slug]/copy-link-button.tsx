"use client"

import { useState } from "react"

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[14px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-150"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  )
}
