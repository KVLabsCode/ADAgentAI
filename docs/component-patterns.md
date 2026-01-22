# Component Patterns Guide

This document outlines the component patterns and best practices used in the ADAgentAI frontend.

## Table of Contents

- [Compound Components](#compound-components)
- [Polymorphic Components (asChild)](#polymorphic-components-aschild)
- [Slot Pattern](#slot-pattern)
- [Variant System (CVA)](#variant-system-cva)
- [Atomic Design Hierarchy](#atomic-design-hierarchy)
- [Best Practices](#best-practices)

## Compound Components

Compound components share state through React context, enabling flexible composition.

### Pattern: Accordion

```tsx
<Accordion type="single" defaultValue="item-1">
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content here...</AccordionContent>
  </AccordionItem>
</Accordion>
```

### Pattern: Tabs

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Pattern: Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Polymorphic Components (asChild)

Use `asChild` to render a component as a different element while preserving styles and behavior.

### Render Button as Link

```tsx
// Render Button as a Next.js Link
<Button asChild>
  <Link href="/page">Go to page</Link>
</Button>

// Render Button as anchor
<Button asChild>
  <a href="https://example.com">External link</a>
</Button>
```

### How it Works

The `asChild` prop uses Radix UI's `Slot` component internally:

```tsx
import { Slot } from "@radix-ui/react-slot"

function Button({ asChild, ...props }) {
  const Comp = asChild ? Slot : "button"
  return <Comp {...props} />
}
```

## Slot Pattern

Slots allow replacing internal elements while keeping component logic intact.

### Card with Custom Content

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Custom content */}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Variant System (CVA)

Components use [class-variance-authority](https://cva.style/docs) for type-safe variants.

### Button Variants

```tsx
// Available variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Available sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
```

### Badge Variants

```tsx
// Base variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>

// Context variants (for chips/tags)
<Badge variant="context">Context</Badge>
<Badge variant="context-provider">Provider</Badge>
<Badge variant="context-app">App</Badge>
<Badge variant="context-entity">Entity</Badge>

// Status indicator
<Badge variant="status">Active</Badge>

// Clickable action
<Badge variant="action">Click me</Badge>
```

### Creating New Variants

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  // Base styles
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-transparent shadow-md",
        outline: "border-2 border-primary",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
)

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ variant, padding, className, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, padding }), className)} {...props} />
  )
}
```

## Atomic Design Hierarchy

Components are organized following Atomic Design principles:

| Level | Purpose | Examples |
|-------|---------|----------|
| **Atoms** | Smallest building blocks | Button, Input, Badge, Label, Checkbox, Avatar |
| **Molecules** | Atom combinations | Card, Dialog, Select, Tabs, Tooltip, Popover |
| **Organisms** | Complex features | Sidebar, DataTable, Chart, ChatContainer |
| **Templates** | Page layouts | DashboardLayout, SettingsLayout |

### Import Pattern

```tsx
// Import from component folders
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
```

## Best Practices

### 1. Prefer Composition

Build complex UIs from simple components:

```tsx
// Good - composed from primitives
<Card>
  <CardHeader>
    <Badge variant="status">Active</Badge>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <Avatar />
    <p>Content...</p>
  </CardContent>
</Card>

// Avoid - monolithic component
<UserProfileCard status="active" title="User Profile" avatar={...} />
```

### 2. Use Semantic Tokens

Reference design tokens instead of hardcoded colors:

```tsx
// Good - semantic tokens
<div className="bg-primary text-primary-foreground">
<div className="text-muted-foreground">
<div className="border-destructive text-destructive">

// Avoid - hardcoded colors
<div className="bg-purple-600 text-white">
<div className="text-gray-500">
<div className="border-red-500 text-red-500">
```

### 3. Forward Refs

Always use `forwardRef` for DOM access:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  }
)
Button.displayName = "Button"
```

### 4. Spread Props

Allow custom props to pass through:

```tsx
function Card({ className, ...props }: CardProps) {
  return <div className={cn("base-styles", className)} {...props} />
}
```

### 5. Data Attributes for Styling

Use `data-*` attributes for state-based styling:

```tsx
<button
  data-slot="button"
  data-variant={variant}
  data-size={size}
  data-state={isActive ? "active" : "inactive"}
/>
```

```css
[data-slot="button"][data-state="active"] {
  /* Active state styles */
}
```

### 6. Accessibility First

- Use semantic HTML elements
- Include ARIA attributes when needed
- Support keyboard navigation
- Test with screen readers

```tsx
<button
  aria-label="Close dialog"
  aria-expanded={isOpen}
  onKeyDown={(e) => e.key === "Enter" && handleClick()}
>
  <X className="size-4" />
</button>
```

## Resources

- [Radix UI Primitives](https://www.radix-ui.com/primitives) - Accessible component primitives
- [shadcn/ui](https://ui.shadcn.com/) - Component collection
- [Class Variance Authority](https://cva.style/docs) - Variant management
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) - Component organization
