import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-heading font-semibold transition-all duration-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-foreground hover:bg-accent hover:scale-105 hover:shadow-lg active:scale-95',
        destructive: 'bg-white text-primary hover:bg-red-50',
        outline: 'border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10',
        secondary: 'bg-secondary text-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-foreground/10 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        shimmer: 'bg-background border border-border text-foreground hover:shadow-[0_0_25px_rgba(255,255,255,0.05)]',
      },
      size: {
        default: 'h-12 px-8 py-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-14 rounded-full px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
      asChild?: boolean;
    }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
