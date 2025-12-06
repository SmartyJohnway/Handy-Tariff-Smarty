import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  type TitleChildren = React.ComponentProps<typeof ToastTitle>["children"]
  type DescriptionChildren =
    React.ComponentProps<typeof ToastDescription>["children"]
  type ToastChildren = React.ComponentProps<typeof Toast>["children"]

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const titleContent = title as TitleChildren | undefined
        const descriptionContent =
          description as DescriptionChildren | undefined
        const actionSlot = (action ?? null) as ToastChildren

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {titleContent && <ToastTitle>{titleContent}</ToastTitle>}
              {descriptionContent && (
                <ToastDescription>{descriptionContent}</ToastDescription>
              )}
            </div>
            // @ts-ignore ReactNode typing differs between hoisted React definitions; runtime rendering is safe
            {actionSlot}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
