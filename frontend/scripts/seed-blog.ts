/**
 * Seed script for Sanity blog posts
 * Run with: npx tsx scripts/seed-blog.ts
 *
 * Make sure you have the following env vars set:
 * - NEXT_PUBLIC_SANITY_PROJECT_ID
 * - NEXT_PUBLIC_SANITY_DATASET
 * - SANITY_API_TOKEN (with Editor permissions)
 */

import { createClient } from "@sanity/client"
import * as dotenv from "dotenv"

// Load env vars from .env.local or .env
dotenv.config({ path: [".env.local", ".env"] })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_TOKEN

if (!projectId || projectId === "demo") {
  console.error("Error: NEXT_PUBLIC_SANITY_PROJECT_ID is not set")
  process.exit(1)
}

if (!token) {
  console.error("Error: SANITY_API_TOKEN is not set")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token,
})

// Sample blog posts for ADAgent
const samplePosts = [
  {
    _type: "post",
    title: "Introducing ADAgent: Your AI-Powered Ad Management Assistant",
    slug: { current: "introducing-adagent" },
    excerpt: "Meet ADAgent, the intelligent assistant that transforms how you manage AdMob and Google Ad Manager accounts. Ask questions in plain English and get instant insights.",
    content: `## What is ADAgent?

ADAgent is an AI-powered assistant designed specifically for app developers and publishers who use Google's advertising platforms. Whether you're managing AdMob for mobile ads or Google Ad Manager for more complex setups, ADAgent helps you get answers and insights through natural conversation.

## Why We Built This

Managing ad monetization can be overwhelming. Between understanding eCPM fluctuations, optimizing ad placements, debugging mediation issues, and generating reports, there's a lot to keep track of.

We built ADAgent to simplify this. Instead of navigating complex dashboards or reading through documentation, you can simply ask questions like:

- "What was my revenue yesterday?"
- "Show me my top performing ad units"
- "Why did my eCPM drop last week?"
- "Compare this week's performance to last week"

## Key Features

### Natural Language Queries
Ask questions in plain English and get instant answers about your ad performance. No need to learn complex query languages or navigate through multiple dashboards.

### Multi-Platform Support
Connect both AdMob and Google Ad Manager accounts to get a unified view of your ad monetization across all your apps and properties.

### Real-Time Insights
Get up-to-date information about your ad performance without waiting for reports to generate. ADAgent pulls data directly from your connected accounts.

### Secure OAuth Connection
Your data stays secure with industry-standard OAuth authentication. We never store your Google credentials - you authenticate directly with Google.

## Getting Started

1. **Sign up** for early access at adagent.app
2. **Connect** your AdMob or Google Ad Manager account
3. **Start asking** questions about your ad performance

We're currently in early access and would love your feedback. Join us today and simplify your ad management workflow.

## What's Next

We're constantly improving ADAgent based on user feedback. Coming soon:
- Automated performance alerts
- Scheduled reports via email
- A/B testing recommendations
- Mediation optimization suggestions

Stay tuned for more updates!`,
    category: "Product",
    status: "published",
    featured: true,
    authorName: "ADAgent Team",
    publishedAt: new Date().toISOString(),
  },
  {
    _type: "post",
    title: "5 Tips to Maximize Your Ad Revenue in 2026",
    slug: { current: "maximize-ad-revenue-2026" },
    excerpt: "Learn proven strategies to boost your ad revenue using data-driven insights and optimization techniques. From ad placement to mediation setup, we cover it all.",
    content: `## Introduction

Maximizing ad revenue requires a combination of smart strategy and continuous optimization. Whether you're a solo developer or part of a larger team, these five proven tips will help you boost your earnings this year.

## 1. Optimize Ad Placement

The location of your ads significantly impacts performance. Users are more likely to engage with ads that appear naturally within their experience.

**Best practices:**
- Place ads where users naturally pause (between levels, after content consumption)
- Avoid intrusive placements that harm user experience
- Test both banner and interstitial formats to see what works best
- Consider native ads that blend with your app's design

**Pro tip:** Use ADAgent to ask "Which ad placements have the highest eCPM?" to identify your best-performing spots.

## 2. Focus on Fill Rate

A high fill rate ensures you're monetizing every impression opportunity. A 100% fill rate means every ad request results in an ad being shown.

**How to improve fill rate:**
- Use mediation to access multiple ad networks
- Set appropriate floor prices - too high means unfilled requests
- Consider adding more demand sources
- Enable backfill networks for remaining inventory

## 3. Monitor eCPM Trends

Understanding your eCPM patterns helps identify optimization opportunities and catch issues early.

**What to watch for:**
- Daily and weekly trends
- Seasonal patterns (Q4 typically has higher eCPMs)
- Sudden drops that might indicate issues
- Differences across ad units and countries

**Pro tip:** Ask ADAgent "How has my eCPM changed over the last 30 days?" for quick trend analysis.

## 4. A/B Test Ad Formats

Different users respond to different ad formats. Regular testing helps you find the optimal mix.

**Testing ideas:**
- Rewarded vs interstitial ads
- Different reward values for rewarded ads
- Native ad styles and layouts
- Banner sizes and positions
- Ad frequency and cooldown periods

**Remember:** Always measure the impact on user retention, not just revenue per user.

## 5. Use Data to Drive Decisions

Let data guide your optimization efforts, not assumptions or gut feelings.

**Data-driven approach:**
- Review performance reports regularly (weekly at minimum)
- Set up alerts for significant changes
- Track key metrics over time
- Compare performance across segments (countries, app versions, user types)

## Conclusion

Maximizing ad revenue is an ongoing process, not a one-time task. By following these tips and continuously monitoring your performance, you can significantly improve your earnings while maintaining a great user experience.

**Need help analyzing your ad data?** Try ADAgent - ask questions in plain English and get instant insights about your AdMob and Google Ad Manager performance.`,
    category: "Tips",
    status: "published",
    featured: false,
    authorName: "ADAgent Team",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    _type: "post",
    title: "Understanding eCPM: A Complete Guide for Publishers",
    slug: { current: "understanding-ecpm-guide" },
    excerpt: "eCPM is the most important metric in ad monetization. Learn what it means, how it's calculated, and practical strategies to improve it.",
    content: `## What is eCPM?

eCPM stands for "effective Cost Per Mille" (mille = thousand in Latin). It represents the estimated earnings per 1,000 ad impressions and is the standard metric for comparing ad performance across different ad formats and networks.

## The Formula

\`\`\`
eCPM = (Total Earnings / Total Impressions) × 1,000
\`\`\`

**Example:** If you earned $50 from 25,000 impressions:
\`\`\`
eCPM = ($50 / 25,000) × 1,000 = $2.00
\`\`\`

This means you're earning $2 for every 1,000 impressions shown.

## Why eCPM Matters

### 1. Standardized Comparison
Different ad formats have different pricing models (CPM, CPC, CPA). eCPM lets you compare them on equal footing.

### 2. Revenue Prediction
Knowing your eCPM helps predict future revenue:
\`\`\`
Predicted Revenue = (Expected Impressions / 1,000) × eCPM
\`\`\`

### 3. Optimization Decisions
Higher eCPM usually means more revenue, so it guides optimization efforts.

## Factors That Affect eCPM

### User Demographics
- **Geography:** US, UK, and Australia typically have higher eCPMs
- **Device:** iOS often outperforms Android
- **Time of year:** Q4 (holiday season) sees elevated eCPMs

### Ad Quality
- **Viewability:** Ads that are actually seen command higher prices
- **Engagement:** Interactive and engaging formats perform better
- **Brand safety:** Quality content attracts premium advertisers

### Supply & Demand
- **Advertiser competition:** More advertisers bidding = higher eCPM
- **Inventory quality:** Premium placements attract better bids
- **Seasonality:** Advertising budgets fluctuate throughout the year

## Strategies to Improve eCPM

### 1. Optimize Ad Placement
Place ads where users naturally engage. Above-the-fold placements and post-content positions typically perform best.

### 2. Use Mediation
Ad mediation allows multiple networks to compete for your inventory, driving up prices.

### 3. Set Smart Floor Prices
Floor prices set a minimum eCPM threshold. Too low and you leave money on the table; too high and you reduce fill rate.

### 4. Improve User Experience
Better UX leads to longer sessions, more impressions, and more engaged users - all of which improve eCPM.

### 5. Focus on High-Value Markets
If possible, target or prioritize users from high-eCPM regions.

## Common eCPM Mistakes

**Mistake 1:** Chasing eCPM at the expense of fill rate
- A $10 eCPM with 50% fill rate = $5 effective revenue
- A $5 eCPM with 100% fill rate = $5 effective revenue

**Mistake 2:** Ignoring user experience
- Aggressive ad placements may boost short-term eCPM but hurt retention

**Mistake 3:** Not segmenting data
- Overall eCPM hides important variations by country, ad unit, and format

## Tracking Your eCPM with ADAgent

Instead of manually calculating eCPM across different reports, use ADAgent to get instant answers:

- "What's my average eCPM this month?"
- "Which ad unit has the highest eCPM?"
- "How does my eCPM compare between iOS and Android?"
- "Show me eCPM trends for the last 90 days"

## Conclusion

eCPM is a powerful metric, but it's not the only one that matters. Always consider it alongside fill rate, user experience, and overall revenue to make the best decisions for your app.

Understanding eCPM deeply will help you make smarter monetization decisions and ultimately grow your ad revenue sustainably.`,
    category: "Education",
    status: "published",
    featured: false,
    authorName: "ADAgent Team",
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
]

async function seedBlog() {
  console.log("Seeding blog posts to Sanity...")
  console.log(`Project: ${projectId}`)
  console.log(`Dataset: ${dataset}`)
  console.log("")

  for (const post of samplePosts) {
    try {
      const result = await client.create(post)
      console.log(`Created: "${post.title}" (ID: ${result._id})`)
    } catch (error) {
      console.error(`Failed to create "${post.title}":`, error)
    }
  }

  console.log("")
  console.log("Done! Your blog posts have been created.")
  console.log("Visit your Sanity Studio or check your blog at /blog to see them.")
}

seedBlog()
