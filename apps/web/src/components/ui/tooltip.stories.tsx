import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";
import { Button } from "./button";
const meta = { title: "UI/Tooltip", component: Tooltip } satisfies Meta<
  typeof Tooltip
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Placements: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap gap-4 p-16">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger render={<Button variant="outline" />}>
              {side}
            </TooltipTrigger>
            <TooltipContent side={side}>Save to your collection</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};
