import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">開く</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>シート</SheetHeader>
        <div className="p-4">内容</div>
      </SheetContent>
    </Sheet>
  ),
}

