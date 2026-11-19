import type { Meta, StoryObj } from "@storybook/react-vite";
import { ButtonGroup } from "./button-group";
import { Button } from "./button";
import { useState } from "react";
const meta = { title: "UI/ButtonGroup", component: ButtonGroup } satisfies Meta<
  typeof ButtonGroup
>;
export default meta;
type Story = StoryObj<typeof meta>;
function GroupDemo({
  orientation = "horizontal",
}: {
  orientation?: "horizontal" | "vertical";
}) {
  const [view, setView] = useState("Grid");
  return (
    <ButtonGroup orientation={orientation} aria-label="View">
      {["Grid", "Canvas", "List"].map((label) => (
        <Button
          key={label}
          variant="outline"
          aria-pressed={view === label}
          onClick={() => setView(label)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
export const Horizontal: Story = { render: () => <GroupDemo /> };
export const Vertical: Story = {
  render: () => <GroupDemo orientation="vertical" />,
};
