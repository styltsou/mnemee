import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
const meta = { title: "UI/Input", component: Input } satisfies Meta<
  typeof Input
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    "aria-label": "Collection name",
    placeholder: "Collection name",
    className: "max-w-sm",
  },
};
export const States: Story = {
  render: () => (
    <div className="grid max-w-sm gap-5">
      <label className="grid gap-2 text-sm">
        Default
        <Input placeholder="Collection name" />
      </label>
      <label className="grid gap-2 text-sm">
        Filled
        <Input defaultValue="Design references" />
      </label>
      <label className="grid gap-2 text-sm">
        Invalid
        <Input aria-invalid="true" defaultValue="Already taken" />
      </label>
      <label className="grid gap-2 text-sm">
        Disabled
        <Input disabled defaultValue="Design references" />
      </label>
      <label className="grid gap-2 text-sm">
        Read only
        <Input readOnly defaultValue="Read-only value" />
      </label>
    </div>
  ),
};
