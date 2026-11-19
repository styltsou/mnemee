import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress, ProgressLabel, ProgressValue } from "./progress";
import { useState } from "react";
const meta = {
  title: "UI/Progress",
  component: Progress,
  args: { value: 65 },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;
function ProgressDemo() {
  const [value, setValue] = useState(65);
  return (
    <div className="grid max-w-sm gap-6">
      <Progress value={value}>
        <ProgressLabel>Uploading images</ProgressLabel>
        <ProgressValue />
      </Progress>
      <label className="grid gap-2 text-sm">
        Progress
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
export const Playground: Story = { render: () => <ProgressDemo /> };
