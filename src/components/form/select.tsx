import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    style?: 'outline' | 'ghost'
}

const selectVariants = cv({
    base: [
        'flex w-full items-center gap-1.5',
        'bg-primary disabled:cursor-not-allowed disabled:bg-disabled',
        'paragraph-sm !leading-none',
    ],
    variants: {
        style: {
            outline: [
                'py-2 px-3 rounded-lg border border-secondary',
                'focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10',
                'disabled:border-disabled',
            ],
            ghost: [''],
        },
    },
    defaultVariants: {
        style: 'outline',
    },
})

export function Select({ className, style = 'outline', children, ...props }: SelectProps) {
    return (
        <select className={cn(selectVariants({ style }), className)} {...props}>
            {children}
        </select>
    )
}
