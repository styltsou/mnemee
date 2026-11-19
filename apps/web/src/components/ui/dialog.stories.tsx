import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
const meta = { title: "UI/Dialog", component: Dialog } satisfies Meta<
  typeof Dialog
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
      <DialogContent polishedMotion>
        <DialogBody className="space-y-5">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Keep related ideas together.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm">
            Collection name
            <Input placeholder="Design references" />
          </label>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button />}>Create</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
