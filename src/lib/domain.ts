// Domain types that are not provided by the local SDK types (or are backend-specific)

export type NodeContext = {
  /** primary key */
  node_id: string;
  /** also node alias */
  display_name: string;
  container_name: string;
  main_api_base_url: string;
  main_api_token_file_path?: string | null;
  control_api_base_url?: string | null;
  control_api_token_file_path?: string | null;
  data_dir?: string | null;
  p2p_listen?: string | null;
  rgb_consignment_base_url?: string | null;
  allow_non_loopback?: boolean | null;
  network: string
  password_hash: string;
  /**
   * Docker image tag the daemon container was started with. Used by the
   * milestone1 wallet/backup CLI commands as the default image when the
   * caller does not pass an override. May be `null` on contexts created
   * before this field was added.
   */
  image?: string | null;
  esplora_url: string;
};

export type ControlStatusDto = {
  locked: boolean;
};

export type EventsStatus = {
  running: boolean;
  last_error?: { code?: string; message?: string; hint?: string } | null;
};

export type VersionResponse = {
  api_version: string;
  api_crate_version: string;
  core_crate_version: string;
};

export type WalletNewAddressResponse = { address: string };
export type DockerEnvironmentResponse = {
  installed: boolean;
  daemon_running: boolean;
  version?: string | null;
  detail?: string | null;
};
export type BitcoinNetwork = "mainnet" | "testnet" | "testnet4" | "regtest";

export type NetworkOption = {
  value: BitcoinNetwork;
  label: string;
  esploraUrl: string;
};

export type BootstrapLocalNodeRequest = {
  ldkImage: string;
  passwordHash: string;
  nodeName?: string;
  containerName?: string;
  mainApiPort?: number;
  controlApiPort?: number;
  p2pPort?: number;
  network?: BitcoinNetwork;
  esploraUrl?: string;
};

export type BootstrapLocalEnvironmentNode = {
  node_id: string;
  display_name: string;
  main_api_base_url: string;
  control_api_base_url: string;
  wallet_address: string;
  funded_btc: number;
};

export type BootstrapLocalEnvironmentResponse = {
  compose_file: string;
  services: string[];
  container_status: string;
  stage_logs: string[];
  created_nodes: BootstrapLocalEnvironmentNode[];
  mined_blocks: number;
  mined_to_address: string;
  chain_height: number;
};

export type RgbContractsExportBundle = {
  contract_id: string;
  consignment_key: string;
  archive_base64: string;
  format: string;
};

export type OutPointDto = { txid: string; vout: number };

// Minimal event surface we emit from the backend events loop.
export type EventDto =
  | { type: "PaymentSuccessful"; data: { payment_id: string | null; fee_paid_msat: string | null } }
  | { type: "PaymentFailed"; data: { payment_id: string | null } }
  | { type: "PaymentReceived"; data: { payment_id: string | null; amount_msat: string } }
  | { type: "ChannelPending"; data: { funding_txo: OutPointDto } }
  | { type: "ChannelReady"; data: { user_channel_id: string } }
  | {
    type: "ChannelClosed";
    data: {
      channel_id: string;
      user_channel_id: string;
      counterparty_node_id?: string | null;
      reason?: string | null;
    };
  }
  | { type: "Other"; data: { kind: string } }
  | {
    type: "NodeHttp";
    data: {
      action: string;
      phase: "request" | "response" | "error";
      duration_ms?: number | null;
      request?: unknown;
      response?: unknown;
      error?: { code?: string; message?: string; hint?: string } | null;
    };
  };

export type StoredEvent = {
  node_id: string;
  received_at_ms: number;
  event: EventDto;
};

export type NodeHttpProxyResponse = {
  status: number;
  ok: boolean;
  body: string;
};
