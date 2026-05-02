import { cv } from "@/utils/cv";
import { cn } from "@/utils/cn";


type AvatarProps = {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string
}

const variants = cv({
    // <div className="size-9 shrink-0 rounded-lg bg-brand_solid" />
    base: [ 'overflow-clip shrink-0 bg-brand_primary flex items-center justify-center text-brand_secondary rounded-full' ],
    variants: {
        size: {
            xs: ['size-6 label-xs'],
            sm: ['size-8 label-xs'],
            md: ['size-10 label-sm'],
            lg: ['size-12 label-sm'],
            xl: ['size-14 label-md'],
        },
    },
    defaultVariants: {
        size: 'md',
    },
})

export function Avatar({ size, className, src }: AvatarProps & { src: string }) {

    return (
        <div className={cn(variants({ size }), className)}>
            <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        </div>
    )
}

Avatar.initials = function AvatarInitials({ size, className, name }: AvatarProps & { name: string }) {
    return (
        <div className={cn(variants({ size }), className)}>
            <span className="block text-center align-middle">{name}</span>
        </div>
    )
}