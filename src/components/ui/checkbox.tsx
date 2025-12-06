import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => {
  console.log('🔍 Checkbox renderizado com checked:', checked, 'Tipo:', typeof checked);
  
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        // Estilos base
        "border-gray-300 dark:border-gray-600",
        // Estilos para estado não marcado
        "bg-white dark:bg-gray-800",
        // Estilos para estado marcado
        checked 
          ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500" 
          : "hover:bg-gray-50 dark:hover:bg-gray-700",
        className
      )}
      style={{
        // Estilos inline para garantir que funcionem
        backgroundColor: checked ? '#2563eb' : 'transparent',
        borderColor: checked ? '#2563eb' : '#d1d5db',
        color: checked ? 'white' : 'inherit'
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-4 w-4 text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
