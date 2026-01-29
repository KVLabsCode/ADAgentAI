import type { Meta, StoryObj } from "@storybook/nextjs";
import { Badge, RemovableBadge } from "./badge";
import { Check, Clock, AlertCircle, Zap, User, Box } from "lucide-react";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "context",
        "context-provider",
        "context-app",
        "context-entity",
        "status",
        "action",
      ],
      description: "Badge style variant",
    },
    render: {
      control: false,
      description: "Custom element to render as (render prop pattern)",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Badge component for labels, status indicators, and context chips. Uses CVA for type-safe variants.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Error",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Context: Story = {
  args: {
    children: "Context Item",
    variant: "context",
  },
};

export const ContextProvider: Story = {
  args: {
    children: "Provider",
    variant: "context-provider",
  },
};

export const ContextApp: Story = {
  args: {
    children: "App",
    variant: "context-app",
  },
};

export const ContextEntity: Story = {
  args: {
    children: "Entity",
    variant: "context-entity",
  },
};

export const Status: Story = {
  args: {
    children: "Active",
    variant: "status",
  },
};

export const Action: Story = {
  args: {
    children: "Click me",
    variant: "action",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Check className="size-3" />
        Success
      </>
    ),
    variant: "default",
  },
};

export const AllBaseVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const AllContextVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="context">Context</Badge>
      <Badge variant="context-provider">Provider</Badge>
      <Badge variant="context-app">App</Badge>
      <Badge variant="context-entity">Entity</Badge>
    </div>
  ),
};

export const StatusIndicators: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="status">
        <Clock className="size-3" />
        Pending
      </Badge>
      <Badge variant="status">
        <Check className="size-3" />
        Complete
      </Badge>
      <Badge variant="status">
        <AlertCircle className="size-3" />
        Warning
      </Badge>
    </div>
  ),
};

export const ActionBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="action">
        <Zap className="size-3" />
        Quick Action
      </Badge>
      <Badge variant="action">Add Filter</Badge>
      <Badge variant="action">View All</Badge>
    </div>
  ),
};

// RemovableBadge stories
export const RemovableDefault: StoryObj<typeof RemovableBadge> = {
  render: () => (
    <RemovableBadge onRemove={() => alert("Removed!")}>
      Removable Badge
    </RemovableBadge>
  ),
};

export const RemovableWithIcon: StoryObj<typeof RemovableBadge> = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <RemovableBadge
        variant="context-provider"
        icon={<User />}
        onRemove={() => {}}
      >
        Provider Name
      </RemovableBadge>
      <RemovableBadge
        variant="context-app"
        icon={<Box />}
        onRemove={() => {}}
      >
        App Name
      </RemovableBadge>
    </div>
  ),
};
