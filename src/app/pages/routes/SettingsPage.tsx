import { Content } from "@/app/components/ContentWrapper";
import PageHeader from "@/app/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type JSX, lazy, type LazyExoticComponent, Suspense, useState } from "react";

const Pages: Record<string, LazyExoticComponent<() => JSX.Element>> = {
  'Data': lazy(() => import('@/app/pages/flows/settings/Data')),
  'About': lazy(() => import('@/app/pages/flows/settings/About')),
}

export function SettingsPage() {
  const [page, setPage] = useState<string>('About')

  const Component = Pages[page]

  return (
    <>
      <PageHeader
        title="Settings"
        action={null}
      />

      <Content className="mt-0 min-h-[630px]">
        <div className="flex justify-between gap-12">
          <div className="w-[160px] shrink-0">
            <Tabs value={page} onValueChange={setPage}>
              <TabsList className="flex flex-col bg-transparent gap-2">
                <TabsTrigger
                  className="px-3 py-3 w-full rounded-2xl text-base justify-start data-[state=active]:bg-background-3"
                  value="Data"
                >
                  Data
                </TabsTrigger>
                <TabsTrigger
                  className="px-3 py-3 w-full rounded-2xl text-base justify-start data-[state=active]:bg-background-3"
                  value="About"
                >
                  About
                </TabsTrigger>
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
