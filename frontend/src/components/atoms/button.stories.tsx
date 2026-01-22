import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { Mail, ChevronRight } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
      description: "Button style variant",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
      description: "Button size",
    },
    disabled: {
      control: "boolean",
      description: "Disable the button",
    },
    asChild: {
      control: "boolean",
      description: "Render as child element (slot pattern)",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Button component with multiple variants and sizes. Uses CVA for type-safe variants.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

export const Small: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large",
    size: "lg",
  },
};

export const Icon: Story = {
  args: {
    children: <Mail className="size-4" />,
    size: "icon",
    "aria-label": "Send email",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="size-4" />
        Email
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Spinner size="sm" />
        Please wait
      </>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button disabled>Default</Button>
      <Button disabled variant="secondary">
        Secondary
      </Button>
      <Button disabled variant="destructive">
        Destructive
      </Button>
      <Button disabled variant="outline">
        Outline
      </Button>
    </div>
  ),
};
