import { getCurrentWindow } from '@tauri-apps/api/window'

export default function WindowAction() {
  const exit = () => {
    getCurrentWindow().hide()
  }

  const minimize = () => {
    getCurrentWindow().minimize()
  }

  const maximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize()
    } catch (e) {
      console.error("Failed to toggle maximize:", e)
    }
  }

  return (
    <div className="flex gap-2">
      <ActionButton color="rgba(255, 115, 106, 1)" onClick={exit} />
      <ActionButton color="rgba(254, 188, 46, 1)" onClick={minimize} />
      <ActionButton color="rgba(25, 195, 50, 1)" onClick={maximize} />
    </div>
  )
}

function ActionButton(props: {color: string, onClick: () => void }) {
  return (
    <button
      className="w-3 h-3 rounded-full cursor-pointer"
      style={{backgroundColor: props.color}}
      onClick={props.onClick}
    ></button>
  )
}
