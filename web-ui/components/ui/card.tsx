import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass';
}

export function Card({ 
  children, 
  variant = 'default', 
  className, 
  ...props 
}: CardProps) {
  const variants = {
    default: "glass",
    glass: "moist-glass"
  };

  return (
    <div 
      className={cn(
        "rounded-[2.5rem] p-4 md:p-8 transition-all duration-500 hover:bg-foreground/10 hover:-translate-y-1 hover:shadow-2xl",
        variants[variant],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
