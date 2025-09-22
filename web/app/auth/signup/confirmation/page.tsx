"use client"

import Link from "next/link"
import BubbleDecoration from "@/components/auth/BubbleDecoration"
import { Button } from "@/components/ui/button"

export default function SignupConfirmationPage() {
  return (
    <main
      className="min-h-[100dvh] flex flex-col overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #CFE8F7 0%, #FADADD 50%, #FFF4C2 100%)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: "body{padding-bottom:0!important}" }} />
      <BubbleDecoration />
      <section className="flex flex-1 items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md text-center space-y-6 bg-card/80 backdrop-blur rounded-3xl border shadow-[0_8px_24px_rgba(0,0,0,0.08)] px-8 py-10">
          <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#8B5A3C" }}>
              You are almost there!
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              We sent you a confirmation email. Please check your inbox and complete the verification process.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            If the email does not arrive soon, look in your spam folder or try sending it again in a few minutes.
          </div>
          <div>
            <Button asChild size="lg" className="w-full" style={{ backgroundColor: "#FADADD", color: "#4A5568" }}>
              <Link href="/auth" className="no-underline text-[#4A5568]">Back to sign-in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
