import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer grid size-5 shrink-0 place-items-center rounded-md border border-input bg-background text-primary-foreground shadow-xs outline-none transition-colors data-checked:border-primary data-checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
