import type { Meta, StoryObj } from "@storybook/react"
import { Select } from "@/components/ui/select"

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Select defaultValue="1">
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </Select>
  ),
}

