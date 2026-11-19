import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";
const meta = { title: "UI/Select", component: Select } satisfies Meta<
  typeof Select
>;
export default meta;
type Story = StoryObj<typeof meta>;
const items = [
  { value: "references", label: "Design references" },
  { value: "reading", label: "Reading list" },
  { value: "ideas", label: "Project ideas" },
];
export const Playground: Story = {
  render: () => (
    <Select defaultValue="references" items={items}>
      <SelectTrigger aria-label="Collection">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
        <SelectItem value="archived" disabled>
          Archived
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};
export const Disabled: Story = {
  render: () => (
    <Select disabled defaultValue="references" items={items}>
      <SelectTrigger aria-label="Collection">
        <SelectValue />
      </SelectTrigger>
    </Select>
  ),
};
