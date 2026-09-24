import { TabsTrigger } from "@/components/ui/tabs";

export default function TabsCustomerTrigger(props: {page: string}) {
  return (
    <TabsTrigger
      className="flex-1 px-6 py-0 h-8 rounded-full cursor-pointer data-[state=active]:bg-background-2 hover:bg-background-2"
      value={props.page}
    >
      {props.page}
    </TabsTrigger>
  )
}
