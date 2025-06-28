import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none border-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-[#e0e0e0] hover:translate-y-[-1px] rounded-xl px-6 py-[14px] shadow-none",
        secondary:
          "bg-[#1a1a1a] text-white border border-[#333333] hover:bg-[#2a2a2a] rounded-xl px-6 py-[14px] shadow-none",
        outline:
          "bg-[#1a1a1a] text-white border border-[#333333] hover:bg-[#2a2a2a] rounded-xl px-6 py-[14px] shadow-none",
        ghost:
          "bg-transparent text-[#888888] hover:text-white hover:bg-[#1a1a1a] rounded-lg px-3 py-2",
        link: "text-white underline-offset-4 hover:underline bg-transparent border-0 px-0 py-0",
      },
      size: {
        default: "px-6 py-[14px] text-base",
        sm: "px-3 py-2 text-sm rounded-lg",
        lg: "px-6 py-[14px] text-base",
        icon: "size-9 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
