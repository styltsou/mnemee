import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogBody,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./alert-dialog";
import { Button } from "./button";
const meta = { title: "UI/AlertDialog", component: AlertDialog } satisfies Meta<
  typeof AlertDialog
>;
export default meta;
type Story = StoryObj<typeof meta>;
function ConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive-primary" />}>
        Delete collection
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogBody>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a preview. No collection will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => setOpen(false)}>
            Delete collection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export const Playground: Story = { render: () => <ConfirmDemo /> };
