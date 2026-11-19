import { useEffect, useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlusIcon } from "lucide-react";
import { Button } from "./button";
import { ButtonGroup } from "./button-group";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Save changes", pending: false },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "destructive-primary",
        "link",
      ],
    },
    size: {
      control: "select",
      options: [
        "xs",
        "sm",
        "default",
        "lg",
        "icon-xs",
        "icon-sm",
        "icon",
        "icon-lg",
      ],
    },
    pending: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

function SimulatedAction({
  pending = false,
  ...props
}: ComponentProps<typeof Button>) {
  const [inFlight, setInFlight] = useState(false);
  useEffect(() => {
    if (!inFlight) return;
    const timer = setTimeout(() => setInFlight(false), 2000);
    return () => clearTimeout(timer);
  }, [inFlight]);
  return (
    <Button
      {...props}
      pending={pending || inFlight}
      onClick={() => setInFlight(true)}
    />
  );
}

export const Playground: Story = {
  render: (args) => <SimulatedAction {...args} />,
};
export const Pending: Story = { args: { pending: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = {
  render: (args) => <SimulatedAction {...args} />,
  args: {
    children: (
      <>
        <PlusIcon />
        Create workspace
      </>
    ),
  },
};
export const IconOnly: Story = {
  render: (args) => <SimulatedAction {...args} />,
  args: { size: "icon", "aria-label": "Add item", children: <PlusIcon /> },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm text-muted-foreground">
        Click the first button in any row to simulate a two-second request.
      </p>
      {(
        [
          "default",
          "outline",
          "secondary",
          "ghost",
          "destructive",
          "destructive-primary",
          "link",
        ] as const
      ).map((variant) => (
        <div key={variant} className="flex items-center gap-4">
          <span className="w-36 text-sm">{variant}</span>
          <SimulatedAction variant={variant}>Save changes</SimulatedAction>
          <Button variant={variant} pending>
            Save changes
          </Button>
          <Button variant={variant} disabled pending={false}>
            Save changes
          </Button>
        </div>
      ))}
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      {(["xs", "sm", "default", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <SimulatedAction size={size}>Save</SimulatedAction>
          <Button size={size} pending>
            Save
          </Button>
        </div>
      ))}
    </div>
  ),
};

function PendingDemo() {
  const [pending, setPending] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Toggle repeatedly to inspect entry, exit, and interruption. Use the
        theme toolbar and your system’s reduced-motion setting.
      </p>
      <Button variant="outline" onClick={() => setPending((value) => !value)}>
        Toggle pending
      </Button>
      <div className="flex items-center gap-4">
        <Button pending={pending}>Save</Button>
        <Button pending={pending}>Save changes to collection</Button>
        <Button size="icon" aria-label="Add item" pending={pending}>
          <PlusIcon />
        </Button>
      </div>
      <Button className="w-full" pending={pending}>
        Sign in
      </Button>
      <ButtonGroup>
        <Button variant="outline" pending={pending}>
          Save
        </Button>
        <Button variant="outline">Cancel</Button>
      </ButtonGroup>
      <Button onClick={() => setCount((value) => value + 1)}>
        Optimistic action ({count})
      </Button>
    </div>
  );
}
export const Transition: Story = { render: () => <PendingDemo /> };

export const Typography: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-6">
      <p className="text-sm text-muted-foreground">
        Compare the same font with cap-height trimming and its natural line box.
        Check labels with descenders, then switch themes using the toolbar.
      </p>
      {(["default", "destructive-primary", "outline"] as const).map(
        (variant) => (
          <section key={variant} className="grid gap-3">
            <h2 className="text-sm font-medium">{variant}</h2>
            <div className="flex flex-wrap items-start gap-6">
              <div className="grid justify-items-start gap-2">
                <span className="text-xs text-muted-foreground">
                  Cap-height trim (current)
                </span>
                <SimulatedAction variant={variant}>
                  Save changes
                </SimulatedAction>
                <SimulatedAction variant={variant}>
                  <PlusIcon />
                  Create typography
                </SimulatedAction>
              </div>
              <div className="grid justify-items-start gap-2">
                <span className="text-xs text-muted-foreground">
                  Natural line box
                </span>
                <SimulatedAction
                  variant={variant}
                  className="[&_[data-slot=button-text]]:[text-box:normal]"
                >
                  Save changes
                </SimulatedAction>
                <SimulatedAction
                  variant={variant}
                  className="[&_[data-slot=button-text]]:[text-box:normal]"
                >
                  <PlusIcon />
                  Create typography
                </SimulatedAction>
              </div>
            </div>
          </section>
        ),
      )}
    </div>
  ),
};
