import type { Meta, StoryObj } from "@storybook/react"
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">開く</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>ダイアログ</DialogHeader>
        <div className="p-4">内容</div>
      </DialogContent>
    </Dialog>
  ),
}

