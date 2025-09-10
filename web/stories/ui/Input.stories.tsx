import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "@/components/ui/input"

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: { layout: "centered" },
  args: { placeholder: "入力してください" },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {}

