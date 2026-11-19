import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea";
const meta = { title: "UI/Textarea", component: Textarea } satisfies Meta<
  typeof Textarea
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    "aria-label": "Note",
    placeholder: "Write a note…",
    className: "max-w-sm",
  },
};
export const States: Story = {
  render: () => (
    <div className="grid max-w-sm gap-5">
      <label className="grid gap-2 text-sm">
        Default
        <Textarea placeholder="Write a note…" />
      </label>
      <label className="grid gap-2 text-sm">
        Filled
        <Textarea
          defaultValue={
            "An idea worth keeping.\nAdd another line to see how the field grows."
          }
        />
      </label>
      <label className="grid gap-2 text-sm">
        Invalid
        <Textarea aria-invalid="true" defaultValue="Please review this note." />
      </label>
      <label className="grid gap-2 text-sm">
        Disabled
        <Textarea disabled defaultValue="A saved note." />
      </label>
    </div>
  ),
};
