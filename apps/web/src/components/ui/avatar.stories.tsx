import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "./avatar";
const meta = { title: "UI/Avatar", component: Avatar } satisfies Meta<
  typeof Avatar
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-5">
      {(["sm", "default", "lg"] as const).map((size) => (
        <Avatar key={size} size={size} aria-label="Alex Morgan">
          <AvatarFallback>AM</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {["AM", "JL", "SK"].map((initials) => (
        <Avatar key={initials} aria-label={initials}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  ),
};
