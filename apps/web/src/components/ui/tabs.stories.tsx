import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
const meta = {
  title: "UI/Tabs",
  component: Tabs,
  args: { children: <TabItems /> },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;
function TabItems() {
  return (
    <>
      <TabsList aria-label="Collection view">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="activity">Recent activity</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-4 text-sm">
        A space for your ideas.
      </TabsContent>
      <TabsContent value="assets" className="pt-4 text-sm">
        Images, notes, links, and colors.
      </TabsContent>
      <TabsContent value="activity" className="pt-4 text-sm">
        Your recent changes appear here.
      </TabsContent>
    </>
  );
}
export const Playground: Story = {
  args: {
    defaultValue: "overview",
    variant: "segment",
    size: "md",
    children: <TabItems />,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["segment", "segment-contrast", "pill", "underline"],
    },
    size: { control: "select", options: ["sm", "md"] },
  },
};
export const Variants: Story = {
  render: () => (
    <div className="grid gap-8">
      {(["segment", "segment-contrast", "pill", "underline"] as const).map(
        (variant) => (
          <section key={variant}>
            <p className="mb-3 text-sm text-muted-foreground">{variant}</p>
            <Tabs defaultValue="overview" variant={variant}>
              <TabItems />
            </Tabs>
          </section>
        ),
      )}
    </div>
  ),
};
