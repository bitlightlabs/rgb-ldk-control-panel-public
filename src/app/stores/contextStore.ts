import type { NodeContext } from "@/lib/domain";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserContext = Pick<NodeContext,
  'node_id'
  | 'display_name'
  | 'container_name'
  | 'main_api_base_url'
  | 'control_api_base_url'
  | 'p2p_listen'
  | 'rgb_consignment_base_url'
  | 'network'
  | 'image'
  | 'esplora_url'
>;

// This store is new and will replace nodeStore in the future
type ContextState = {
  currentContext: UserContext | null;
  setCurrentContext: (data: NodeContext | null) => void;
};

function filterContext(context: NodeContext | null): UserContext | null {
  if (!context) return null;

  return {
    node_id: context.node_id,
    display_name: context.display_name,
    container_name: context.container_name,
    main_api_base_url: context.main_api_base_url,
    control_api_base_url: context.control_api_base_url,
    p2p_listen: context.p2p_listen,
    rgb_consignment_base_url: context.rgb_consignment_base_url,
    network: context.network,
    image: context.image,
    esplora_url: context.esplora_url,
  }
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      currentContext: null,
      setCurrentContext: (data) => {
        const ctx = filterContext(data);
        set({ currentContext: ctx })
      }
    }),
    { name: "rgb-ldk-current-context" }
  )
);


