'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/components/ui/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'input min-h-11',
          className
        )}
        {...props}
      />
    );
  }
);
