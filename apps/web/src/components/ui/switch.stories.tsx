import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch";
const meta = { title: "UI/Switch", component: Switch } satisfies Meta<
  typeof Switch
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { "aria-label": "Enable notifications" },
  argTypes: { size: { control: "select", options: ["sm", "default"] } },
};
export const States: Story = {
  render: () => (
    <div className="grid gap-5 text-sm">
      {(["sm", "default"] as const).map((size) => (
        <div key={size} className="flex items-center gap-6">
          <label className="flex items-center gap-3">
            <Switch size={size} aria-label={`${size} off`} />
            {size} off
          </label>
          <label className="flex items-center gap-3">
            <Switch size={size} aria-label={`${size} on`} defaultChecked />
            {size} on
          </label>
          <label className="flex items-center gap-3">
            <Switch
              size={size}
              aria-label={`${size} disabled`}
              disabled
              defaultChecked
            />
            Disabled
          </label>
        </div>
      ))}
    </div>
  ),
};
