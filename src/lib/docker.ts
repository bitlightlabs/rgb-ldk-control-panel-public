import { tauriInvoke } from "./tauri";

export async function ensureDockerImage(image: string): Promise<{
  exists: boolean;
  pulled: boolean;
  message: string;
}> {
  return tauriInvoke("ensure_docker_image", { image });
}
