import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DatePicker } from "@/components/ui/date-picker"

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
  parameters: { layout: "centered" },
  args: { defaultValue: "2025-09-10" },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

