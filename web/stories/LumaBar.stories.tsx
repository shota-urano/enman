import type { Meta, StoryObj } from "@storybook/react"
import LumaBar from "@/components/LumaBar"

const meta = {
  title: "Navigation/LumaBar",
  component: LumaBar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LumaBar>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: { current: "home" },
}

