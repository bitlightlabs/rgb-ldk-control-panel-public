import { Content } from "@/app/components/ContentWrapper";
import PageHeader from "@/app/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type JSX, lazy, type LazyExoticComponent, Suspense, useState } from "react";

const Pages: Record<string, LazyExoticComponent<() => JSX.Element>> = {
  'Backup': lazy(() => import('./backup/index')),
  'Data': lazy(() => import('./data/index')),
  'About': lazy(() => import('./about/index')),
}

function Trigger(props: { page: string }) {
  return (
    <TabsTrigger
      className="px-3 py-3 leading-5 w-full rounded-2xl text-base justify-start data-[state=active]:bg-background-3 hover:bg-background-3"
      value={props.page}
    >
      {props.page}
    </TabsTrigger>
  )
}

export default function SettingsPage() {
  const [page, setPage] = useState<string>('Backup')

  const Component = Pages[page]

  return (
    <>
      <PageHeader
        title="Settings"
        action={null}
      />

      <Content className="mt-0 min-h-[662px]">
        <div className="flex justify-between gap-12">
          <div className="w-[160px] shrink-0">
            <Tabs value={page} onValueChange={setPage}>
              <TabsList className="flex flex-col bg-transparent gap-2">
                <Trigger page="Backup" />
                <Trigger page="Data" />
                <Trigger page="About" />
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-1">
            <Suspense>
              {Component ? <Component /> : null}
            </Suspense>
          </div>
        </div>
      </Content>
    </>
  )
}
