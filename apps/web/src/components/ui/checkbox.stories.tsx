import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox";
const meta = { title: "UI/Checkbox", component: Checkbox } satisfies Meta<
  typeof Checkbox
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { "aria-label": "Select item" } };
export const States: Story = {
  render: () => (
    <div className="grid gap-5 text-sm">
      <label className="flex items-center gap-3">
        <Checkbox aria-label="Unchecked" />
        Unchecked
      </label>
      <label className="flex items-center gap-3">
        <Checkbox aria-label="Checked" defaultChecked />
        Checked
      </label>
      <label className="flex items-center gap-3">
        <Checkbox aria-label="Mixed selection" indeterminate />
        Mixed selection
      </label>
      <label className="flex items-center gap-3">
        <Checkbox aria-label="Disabled unchecked" disabled />
        Disabled unchecked
      </label>
      <label className="flex items-center gap-3">
        <Checkbox aria-label="Disabled checked" disabled defaultChecked />
        Disabled checked
      </label>
    </div>
  ),
};
