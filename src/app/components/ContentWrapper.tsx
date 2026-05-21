import { PropsWithChildren } from 'react'
import IconBack from '../icons/back';
import { cn } from '@/lib/utils';

export function ContentWrapper(props: PropsWithChildren & {className?: string}) {
  return (
    <section className={cn("relative w-[560px] mx-auto", props.className)}>
      {props.children}
    </section>
  )
}

export function ContentHeader(props: PropsWithChildren & {title: string, onBack: () => void}) {
  return (
    <div className="flex h-9 items-center gap-x-[14px]">
      <BackButton onClick={props.onBack}>
        <IconBack/>
      </BackButton>
      {props.children}
      <h2 className="text-xl font-bold">{props.title}</h2>
    </div>
  )
}
export function ActionHeader(props: PropsWithChildren & {title: string, onBack: () => void}) {
  return (
    <div className="flex justify-between h-9 items-center">
      <div className='h-full flex items-center gap-x-[14px]'>
        <BackButton onClick={props.onBack}>
          <IconBack/>
        </BackButton>
        <h2 className="text-xl font-bold">{props.title}</h2>
      </div>
      <div>{props.children}</div>
    </div>
  )
}

export function Content(props: PropsWithChildren & {className?: string}) {
  return (
    <div className={cn("mt-5 px-5 py-5 bg-background-3 rounded-3xl border border-background-2", props.className)}>
      {props.children}
    </div>
  )
}

export function BackButton(props: PropsWithChildren & {onClick: () => void, className?: string}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn("w-6 h-6 cursor-pointer border-0", props.className)}
    >{props.children}</button>
  )
}
