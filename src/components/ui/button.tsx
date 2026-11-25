import {Slot} from '@radix-ui/react-slot'
import {cva,type VariantProps} from 'class-variance-authority'
import type {ComponentProps} from 'react'
import {twMerge} from 'tailwind-merge'
import {clsx} from 'clsx'
const variants=cva('btn',{variants:{variant:{default:'',primary:'primary',ghost:'ghost'}},defaultVariants:{variant:'default'}})
export function Button({className,variant,asChild=false,...props}:ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){
 const Component=asChild?Slot:'button'
 return <Component className={twMerge(clsx(variants({variant}),className))} {...props}/>
}
