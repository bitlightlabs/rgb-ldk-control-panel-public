import IconLinkOut from "@/app/icons/link-out";
import { openUrl } from "@tauri-apps/plugin-opener";

export default function AboutPage() {
  const gotoWeb = () => {
    openUrl("https://bitlightlabs.com/lightning")
  }

  return (
    <div className="w-full">
      <h4 className="text-[22px] leading-7 font-bold">About</h4>
      <div className="mt-3 text-base text-secondary-foreground">Info about your RGB LIghtning Node</div>
      <div className="mt-8 bg-background-3 rounded-2xl p-4">
        <label className="text-base font-medium leading-5">RGB Lightning Node Version</label>
        <div className="mt-2 text-sm text-secondary-foreground">v0.0.2</div>
        <div className="h-[1px] bg-background-3 my-6"></div>
        <label className="text-base font-medium leading-5">Lightning Node Backend</label>
        <div className="mt-2 text-sm text-secondary-foreground">LDK</div>
        <div className="h-[1px] bg-background-3 my-6"></div>
        <label className="text-base font-medium leading-5">Website</label>
        <div className="mt-2 text-base text-primary flex gap-1 items-center">
          <span className="cursor-pointer" onClick={gotoWeb}>https://bitlightlabs.com/lightning</span>
          <IconLinkOut />
        </div>
      </div>
    </div>
  )
}
