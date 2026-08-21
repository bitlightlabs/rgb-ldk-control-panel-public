import IconLinkOut from "@/app/icons/link-out";
import { openUrl } from "@tauri-apps/plugin-opener";
import JsonData from '@/../package.json'

export default function AboutPage() {
  const gotoWeb = () => {
    openUrl("https://bitlightlabs.com/lightning")
  }

  return (
    <div className="w-full">
      <h4 className="text-xl leading-7 font-bold">About</h4>
      <div className="mt-3 text-base text-secondary-foreground">Info about your RGB LIghtning Node</div>
      <div className="mt-8 bg-background-4 rounded-2xl p-4 text-base">
        <label className="font-medium leading-5">RGB Lightning Node Version</label>
        <div className="mt-2 text-secondary-foreground">V{JsonData.version}</div>
        <div className="h-[1px] bg-background-3 my-5"></div>

        <label className="font-medium leading-5">Lightning Node Backend</label>
        <div className="mt-2 text-secondary-foreground">LDK</div>
        <div className="h-[1px] bg-background-3 my-5"></div>

        <label className="font-medium leading-5">Website</label>
        <div className="flex gap-1 items-center mt-2 text-secondary-foreground hover:text-primary hover:[&_span]:inline" onClick={gotoWeb}>
          <div className="cursor-pointer" onClick={gotoWeb}>https://bitlightlabs.com/lightning</div>
          <span className="hidden"><IconLinkOut /></span>
        </div>
      </div>
    </div>
  )
}
