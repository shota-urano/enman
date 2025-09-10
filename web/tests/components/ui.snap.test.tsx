import React from "react"
import { describe, it, expect } from "vitest"
import { renderToString } from "react-dom/server"
import { Button } from "@/components/ui/button"
import Card, { CardBody, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

describe("UI snapshots", () => {
  it("Button default", () => {
    const html = renderToString(<Button>保存</Button>)
    expect(html).toMatchSnapshot()
  })

  it("Card basic", () => {
    const html = renderToString(
      <Card>
        <CardHeader>ヘッダー</CardHeader>
        <CardBody>本文</CardBody>
      </Card>,
    )
    expect(html).toMatchSnapshot()
  })

  it("Dialog open renders content", () => {
    const html = renderToString(
      <Dialog open>
        <DialogContent>
          <DialogHeader>明細</DialogHeader>
          <div className="p-4">内容</div>
        </DialogContent>
      </Dialog>,
    )
    expect(html).toMatchSnapshot()
  })
})

