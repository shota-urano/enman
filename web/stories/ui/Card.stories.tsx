import type { Meta, StoryObj } from "@storybook/react"
import Card, { CardBody, CardHeader } from "@/components/ui/card"

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Card style={{ width: 320 }}>
      <CardHeader>今月のサマリー</CardHeader>
      <CardBody>・・・コンテンツ・・・</CardBody>
    </Card>
  ),
}

