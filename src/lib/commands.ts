import type {
  BootstrapLocalEnvironmentResponse,
  BootstrapLocalNodeRequest,
  ControlStatusDto,
  DockerEnvironmentResponse,
  EventsStatus,
  NodeHttpProxyResponse,
  NodeContext,
  StoredEvent,
  VersionResponse,
  WalletNewAddressResponse,
} from "./domain";
import type {
  BalancesDto,
  Bolt11DecodeRequest,
  Bolt11DecodeResponse,
  Bolt11PayRequest,
  Bolt11PayResponse,
  Bolt11ReceiveRequest,
  Bolt11ReceiveResponse,
  Bolt11ReceiveVarRequest,
  Bolt11SendRequest,
  Bolt11SendUsingAmountRequest,
  Bolt12OfferDecodeRequest,
  Bolt12OfferDecodeResponse,
  Bolt12OfferReceiveRequest,
  Bolt12OfferReceiveVarRequest,
  Bolt12OfferResponse,
  Bolt12OfferSendRequest,
  Bolt12RefundDecodeRequest,
  Bolt12RefundDecodeResponse,
  Bolt12RefundInitiateRequest,
  Bolt12RefundInitiateResponse,
  Bolt12RefundRequestPaymentRequest,
  Bolt12RefundRequestPaymentResponse,
  ChannelDetailsExtendedDto,
  CloseChannelRequest,
  ListeningAddressesResponse,
  NodeIdResponse,
  OkResponse,
  OpenChannelRequest,
  OpenChannelResponse,
  PaymentDetailsDto,
  PaymentWaitRequest,
  PaymentWaitResponse,
  PeerConnectRequest,
  PeerDetailsDto,
  PeerDisconnectRequest,
  RgbContractBalanceResponse,
  RgbContractsImportResponse,
  RgbContractsIssueRequest,
  RgbContractsIssueResponse,
  RgbContractsResponse,
  RgbLnInvoiceCreateRequest,
  RgbLnInvoiceResponse,
  RgbLnPayRequest,
  SendResponse,
  StatusDto as MainStatusResponse,
  RgbOnchainInvoiceCreateRequest,
  RgbOnchainInvoiceResponse,
  RgbIssuersResponse,
  RgbOnchainSendResponse,
  RgbOnchainPaymentsResponse,
  RgbDescriptorResponse,
  SignmessageRequest,
  SignmessageResponse,
} from "./sdk/types";
import { tauriInvoke } from "./tauri";
import type { RgbContractsExportBundle } from "./domain";
import { uint8ArrayToBase64 } from "./utils";
import { RgbUtxoDto, RgbUtxosFundRequest, RgbUtxosFundResponse, RgbUtxosReleaseRequest, RgbUtxosReleaseResponse, RgbUtxosSweepRequest, RgbUtxosSweepResponse, RgbUtxosTopUpRequest, RgbUtxosTopUpResponse, WalletUtxosResponse } from "./sdk/generated-types";

export type UiLogLevel = "trace" | "debug" | "info" | "warn" | "error";

export async function contextsList(): Promise<NodeContext[]> {
  return tauriInvoke("contexts_list");
}

export async function contextsReload(): Promise<NodeContext[]> {
  return tauriInvoke("contexts_reload");
}

export async function contextsPath(): Promise<string> {
  return tauriInvoke("contexts_path");
}

export async function logsPath(): Promise<string> {
  return tauriInvoke("logs_path");
}

export async function logsTail(limit?: number): Promise<string[]> {
  return tauriInvoke("logs_tail", { limit: limit ?? null });
}

export async function logUi(level: UiLogLevel, message: string, context?: unknown): Promise<void> {
  return tauriInvoke("log_ui", { level, message, context: context ?? null });
}

export async function dockerEnvironment(): Promise<DockerEnvironmentResponse> {
  return tauriInvoke("docker_environment");
}

export async function bootstrapLocalNode(request?: BootstrapLocalNodeRequest): Promise<NodeContext> {
  return tauriInvoke("bootstrap_local_node", {
    passwordHash: request?.passwordHash ?? "",
    ldkImage: request?.ldkImage ?? null,
    nodeName: request?.nodeName ?? null,
    containerName: request?.containerName ?? null,
    mainApiPort: request?.mainApiPort ?? null,
    controlApiPort: request?.controlApiPort ?? null,
    p2pPort: request?.p2pPort ?? null,
    network: request?.network ?? null,
    esploraUrl: request?.esploraUrl ?? null,
  });
}

/**
 * Production "user supplies their own mnemonic" flow — step 1 of 5.
 *
 * Collects user-supplied node configuration, allocates the resources the
 * daemon will eventually need (ports, secret files, data volume name, full
 * NodeContext), and persists the NodeContext to contexts.json. **Does not
 * start any container.**
 *
 * After this resolves, the frontend has a `node_id` and can drive the rest
 * of the flow itself:
 *
 *   1. prepareNodeResources(...)              ← you are here
 *   2. walletNewMnemonicCli(ldkImage)         → show the mnemonic to the user
 *   3. walletInitCli(node_id, mnemonic)       → write the keystore into the data volume
 *   4. nodeRunCli(node_id)                    → start the daemon container
 *   5. nodeUnlock(node_id)                    → enter business state
 *
 * The mnemonic can come from anywhere — `walletNewMnemonicCli` is the
 * recommended source, but a frontend-side BIP39 generator works just as
 * well; `walletInitCli` only cares about the resulting string.
 *
 * `bootstrapLocalNode` is the demo one-click counterpart and runs steps
 * 1–5 internally (mnemonic auto-generated, never exposed to the frontend).
 */
export async function prepareNodeResources(
  request?: BootstrapLocalNodeRequest,
): Promise<NodeContext> {
  return tauriInvoke("prepare_node_resources", {
    passwordHash: request?.passwordHash ?? "",
    ldkImage: request?.ldkImage ?? null,
    nodeName: request?.nodeName ?? null,
    mainApiPort: request?.mainApiPort ?? null,
    controlApiPort: request?.controlApiPort ?? null,
    p2pPort: request?.p2pPort ?? null,
    network: request?.network ?? null,
    esploraUrl: request?.esploraUrl ?? null,
  });
}

export async function bootstrapLocalEnvironment(): Promise<BootstrapLocalEnvironmentResponse> {
  return tauriInvoke("bootstrap_local_environment");
}

export async function nodeMainHttp(
  nodeId: string,
  request: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    headers?: Record<string, string> | null;
    bodyText?: string | null;
  },
): Promise<NodeHttpProxyResponse> {
  return tauriInvoke("node_main_http", {
    nodeId: nodeId,
    method: request.method,
    path: request.path,
    headers: request.headers ?? null,
    bodyText: request.bodyText ?? null,
  });
}

export async function eventsStartAll(): Promise<void> {
  return tauriInvoke("events_start_all");
}

export async function eventsStart(nodeId: string): Promise<void> {
  return tauriInvoke("events_start", { nodeId: nodeId });
}

export async function eventsStop(nodeId: string): Promise<void> {
  return tauriInvoke("events_stop", { nodeId: nodeId });
}

export async function eventsList(nodeId: string, limit?: number): Promise<StoredEvent[]> {
  return tauriInvoke("events_list", { nodeId: nodeId, limit: limit ?? null });
}

export async function eventsClear(nodeId: string): Promise<void> {
  return tauriInvoke("events_clear", { nodeId: nodeId });
}

export async function eventsStatus(nodeId: string): Promise<EventsStatus> {
  return tauriInvoke("events_status", { nodeId: nodeId });
}

export async function eventsStatusAll(): Promise<Record<string, EventsStatus>> {
  return tauriInvoke("events_status_all");
}

export async function eventsHttpDebugGet(): Promise<boolean> {
  return tauriInvoke("events_http_debug_get");
}

export async function eventsHttpDebugSet(enabled: boolean): Promise<void> {
  return tauriInvoke("events_http_debug_set", { enabled });
}

export async function contextsUpsert(context: NodeContext): Promise<void> {
  return tauriInvoke("contexts_upsert", { context });
}

export async function contextsRemove(nodeId: string): Promise<void> {
  return tauriInvoke("contexts_remove", { nodeId: nodeId });
}

export async function nodeMainStatus(nodeId: string): Promise<MainStatusResponse> {
  return tauriInvoke("node_main_status", { nodeId: nodeId });
}

export async function nodeMainVersion(nodeId: string): Promise<VersionResponse> {
  return tauriInvoke("node_main_version", { nodeId: nodeId });
}

export async function nodeMainNodeId(nodeId: string): Promise<NodeIdResponse> {
  return tauriInvoke("node_main_node_id", { nodeId: nodeId });
}

export async function nodeMainListeningAddresses(nodeId: string): Promise<ListeningAddressesResponse> {
  return tauriInvoke("node_main_listening_addresses", { nodeId: nodeId });
}

export async function nodeMainPeers(nodeId: string): Promise<PeerDetailsDto[]> {
  return tauriInvoke("node_main_peers", { nodeId: nodeId });
}

export async function nodeMainPeersConnect(nodeId: string, request: PeerConnectRequest): Promise<OkResponse> {
  return tauriInvoke("node_main_peers_connect", { nodeId: nodeId, request: request });
}

export async function nodeMainPeersDisconnect(nodeId: string, request: PeerDisconnectRequest): Promise<OkResponse> {
  return tauriInvoke("node_main_peers_disconnect", { nodeId: nodeId, request: request });
}

export async function nodeMainBalances(nodeId: string): Promise<BalancesDto> {
  return tauriInvoke("node_main_balances", { nodeId: nodeId });
}

export async function nodeWalletNewAddress(nodeId: string): Promise<WalletNewAddressResponse> {
  return tauriInvoke("node_wallet_new_address", { nodeId: nodeId });
}

export async function nodeWalletSync(nodeId: string): Promise<OkResponse> {
  return tauriInvoke("node_wallet_sync", { nodeId: nodeId });
}

export async function nodeRgbSync(nodeId: string): Promise<OkResponse> {
  return tauriInvoke("node_rgb_sync", { nodeId: nodeId });
}

export async function nodeRgbContracts(nodeId: string): Promise<RgbContractsResponse> {
  return tauriInvoke("node_rgb_contracts", { nodeId: nodeId });
}

export async function nodeRgbContractIssue(nodeId: string, request: RgbContractsIssueRequest): Promise<RgbContractsIssueResponse> {
  return tauriInvoke("node_rgb_contract_issue", { nodeId: nodeId, request: request });
}

export async function nodeRgbContractExportBundle(
  nodeId: string,
  contractId: string,
  format?: "raw" | "gzip" | "zip",
): Promise<RgbContractsExportBundle> {
  return tauriInvoke("node_rgb_contract_export_bundle", { nodeId: nodeId, contractId: contractId, format: format ?? null });
}

export async function nodeRgbContractImportBundle(
  nodeId: string,
  contractId: string,
  archiveBase64: string,
  format?: "raw" | "gzip" | "zip",
): Promise<RgbContractsImportResponse> {
  return tauriInvoke("node_rgb_contract_import_bundle", {
    nodeId: nodeId,
    contractId: contractId,
    format: format ?? null,
    archiveBase64: archiveBase64,
  });
}

export async function nodeRgbContractBalance(nodeId: string, contractId: string): Promise<RgbContractBalanceResponse> {
  return tauriInvoke("node_rgb_contract_balance", { nodeId: nodeId, contractId: contractId });
}

export async function nodeRgbLnInvoiceCreate(
  nodeId: string,
  request: RgbLnInvoiceCreateRequest,
): Promise<RgbLnInvoiceResponse> {
  return tauriInvoke("node_rgb_ln_invoice_create", { nodeId: nodeId, request: request });
}

export async function nodeRgbLnPay(nodeId: string, request: RgbLnPayRequest): Promise<SendResponse> {
  return tauriInvoke("node_rgb_ln_pay", { nodeId: nodeId, request: request });
}

export async function nodeMainChannels(nodeId: string): Promise<ChannelDetailsExtendedDto[]> {
  return tauriInvoke("node_main_channels", { nodeId: nodeId });
}

export async function nodeChannelOpen(nodeId: string, request: OpenChannelRequest): Promise<OpenChannelResponse> {
  return tauriInvoke("node_channel_open", { nodeId: nodeId, request: request });
}

export async function nodeBolt11Receive(nodeId: string, request: Bolt11ReceiveRequest): Promise<Bolt11ReceiveResponse> {
  return tauriInvoke("node_bolt11_receive", { nodeId: nodeId, request: request });
}

export async function nodeBolt11ReceiveVar(
  nodeId: string,
  request: Bolt11ReceiveVarRequest,
): Promise<Bolt11ReceiveResponse> {
  return tauriInvoke("node_bolt11_receive_var", { nodeId: nodeId, request: request });
}

export async function nodeBolt11Decode(nodeId: string, request: Bolt11DecodeRequest): Promise<Bolt11DecodeResponse> {
  return tauriInvoke("node_bolt11_decode", { nodeId: nodeId, request: request });
}

export async function nodeBolt11Send(nodeId: string, request: Bolt11SendRequest): Promise<SendResponse> {
  return tauriInvoke("node_bolt11_send", { nodeId: nodeId, request: request });
}

export async function nodeBolt11SendUsingAmount(
  nodeId: string,
  request: Bolt11SendUsingAmountRequest,
): Promise<SendResponse> {
  return tauriInvoke("node_bolt11_send_using_amount", { nodeId: nodeId, request: request });
}

export async function nodeBolt11Pay(nodeId: string, request: Bolt11PayRequest): Promise<Bolt11PayResponse> {
  return tauriInvoke("node_bolt11_pay", { nodeId: nodeId, request: request });
}

// offer with fixed amount
export async function nodeBolt12OfferReceive(nodeId: string, request: Bolt12OfferReceiveRequest): Promise<Bolt12OfferResponse> {
  return tauriInvoke("node_bolt12_offer_receive", { nodeId: nodeId, request: request });
}

// offer with variable amount
export async function nodeBolt12OfferReceiveVar(
  nodeId: string,
  request: Bolt12OfferReceiveVarRequest,
): Promise<Bolt12OfferResponse> {
  return tauriInvoke("node_bolt12_offer_receive_var", { nodeId: nodeId, request: request });
}

export async function nodeBolt12OfferDecode(
  nodeId: string,
  request: Bolt12OfferDecodeRequest,
): Promise<Bolt12OfferDecodeResponse> {
  return tauriInvoke("node_bolt12_offer_decode", { nodeId: nodeId, request: request });
}

export async function nodeBolt12OfferSend(nodeId: string, request: Bolt12OfferSendRequest): Promise<SendResponse> {
  return tauriInvoke("node_bolt12_offer_send", { nodeId: nodeId, request: request });
}

export async function nodeBolt12RefundInitiate(
  nodeId: string,
  request: Bolt12RefundInitiateRequest,
): Promise<Bolt12RefundInitiateResponse> {
  return tauriInvoke("node_bolt12_refund_initiate", { nodeId: nodeId, request: request });
}

export async function nodeBolt12RefundDecode(
  nodeId: string,
  request: Bolt12RefundDecodeRequest,
): Promise<Bolt12RefundDecodeResponse> {
  return tauriInvoke("node_bolt12_refund_decode", { nodeId: nodeId, request: request });
}

export async function nodeBolt12RefundRequestPayment(
  nodeId: string,
  request: Bolt12RefundRequestPaymentRequest,
): Promise<Bolt12RefundRequestPaymentResponse> {
  return tauriInvoke("node_bolt12_refund_request_payment", { nodeId: nodeId, request: request });
}

export async function nodePaymentsList(nodeId: string): Promise<PaymentDetailsDto[]> {
  return tauriInvoke("node_payments_list", { nodeId: nodeId });
}

export async function nodePaymentGet(nodeId: string, paymentId: string): Promise<PaymentDetailsDto> {
  return tauriInvoke("node_payment_get", { nodeId: nodeId, paymentId: paymentId });
}

export async function nodePaymentWait(
  nodeId: string,
  paymentId: string,
  request: PaymentWaitRequest,
): Promise<PaymentWaitResponse> {
  return tauriInvoke("node_payment_wait", { nodeId: nodeId, paymentId: paymentId, request: request });
}

export async function nodePaymentAbandon(nodeId: string, paymentId: string): Promise<OkResponse> {
  return tauriInvoke("node_payment_abandon", { nodeId: nodeId, paymentId: paymentId });
}

export async function nodeChannelClose(nodeId: string, request: CloseChannelRequest): Promise<OkResponse> {
  return tauriInvoke("node_channel_close", { nodeId: nodeId, request: request });
}

export async function nodeChannelForceClose(nodeId: string, request: CloseChannelRequest): Promise<OkResponse> {
  return tauriInvoke("node_channel_force_close", { nodeId: nodeId, request: request });
}

export async function nodeMainHealthz(nodeId: string): Promise<OkResponse> {
  return tauriInvoke("node_main_healthz", { nodeId: nodeId });
}

export async function nodeMainReadyz(nodeId: string): Promise<OkResponse> {
  return tauriInvoke("node_main_readyz", { nodeId: nodeId });
}

export async function nodeControlStatus(nodeId: string): Promise<ControlStatusDto> {
  return tauriInvoke("node_control_status", { nodeId: nodeId });
}

export async function nodeUnlock(nodeId: string): Promise<ControlStatusDto> {
  return tauriInvoke("node_unlock", { nodeId: nodeId });
}

export async function nodeLock(nodeId: string): Promise<ControlStatusDto> {
  return tauriInvoke("node_lock", { nodeId: nodeId });
}

export async function pluginWalletAssetExport(
  nodeId: string,
  contractId: string,
  coreRpc: string,
): Promise<RgbContractsExportBundle> {
  // Get descriptor from node
  const descriptorData = await nodeRgbDescriptor(nodeId);
  if (descriptorData.error) {
    throw new Error(descriptorData.error);
  }

  const descriptor = descriptorData.derived_descriptors[0].descriptor;

  return tauriInvoke("plugin_wallet_asset_export", {
    nodeId,
    coreRpc,
    contractId,
    descriptor,
  });
}

// Unused
export async function pluginWalletTransferConsignmentExport(paymentId: string): Promise<RgbContractsExportBundle> {
  return tauriInvoke("plugin_wallet_transfer_consignment_export", { paymentId });
}

export async function downloadTransferConsignmentFromLinkWithoutVerify(fullLink: string): Promise<RgbContractsExportBundle> {
  return tauriInvoke("download_transfer_consignment_from_link_no_verify", {
    link: fullLink
  });
}

export async function downloadTransferConsignmentFromLink(nodeId: string, fullLink: string): Promise<RgbContractsExportBundle> {
  // Parse payment_id from link query params
  const url = new URL(fullLink);
  const paymentId = url.searchParams.get("payment_id");
  if (!paymentId) {
    throw new Error("Invalid link: missing payment_id query parameter");
  }

  // Get descriptor from node
  const descriptorData = await nodeRgbDescriptor(nodeId);
  if (descriptorData.error) {
    throw new Error(descriptorData.error);
  }

  const descriptor = descriptorData.derived_descriptors[0].descriptor;
  const link = url.protocol + "//" + url.host + url.pathname;

  return tauriInvoke("download_transfer_consignment_from_link", {
    nodeId,
    link,
    paymentId,
    descriptor
  });
}

export async function nodeRgbOnchainTransferConsignmentAccept(
  nodeId: string,
  invoice: string,
  fileData: string,
  format?: "raw" | "gzip" | "zip",
): Promise<{ contract_id: string, amount: string }> {
  return tauriInvoke("node_rgb_onchain_transfer_consignment_accept", {
    nodeId: nodeId,
    format: format ?? null,
    invoice: invoice,
    transferConsignmentBase64: fileData,
  });
}

// export async function nodeRgbUtxosSummary(nodeId: string,): Promise<{
//   utxos: { outpoint: string, value_sats: number }[]
// }> {
//   return tauriInvoke("node_rgb_utxos_summary", { nodeId });
// }

export async function nodeRgbOnchainInvoiceCreate(
  nodeId: string,
  request: RgbOnchainInvoiceCreateRequest,
): Promise<RgbOnchainInvoiceResponse> {
  return tauriInvoke("node_rgb_onchain_invoice_create", { nodeId: nodeId, request: request });
}

export async function nodeRgbNewAddress(nodeId: string): Promise<WalletNewAddressResponse> {
  return tauriInvoke("node_rgb_new_address", { nodeId: nodeId });
}

export async function nodeRgbIssuersImport(
  nodeId: string,
  name: string,
  fileData: Uint8Array,
  format?: "raw" | "gzip" | "zip",
): Promise<RgbContractsImportResponse> {
  const archiveBase64 = uint8ArrayToBase64(fileData)
  return tauriInvoke("node_rgb_contract_issuers_import", {
    nodeId: nodeId,
    name: name,
    format: format ?? null,
    archiveBase64: archiveBase64,
  });
}

export async function nodeRgbIssuers(nodeId: string): Promise<RgbIssuersResponse> {
  return tauriInvoke("node_rgb_issuers", { nodeId: nodeId });
}

export async function nodeRgbOnchainTransferConsignmentDownload(
  nodeId: string,
  consignmentKey: string,
  format = 'raw'
): Promise<{ archive_base64: string }> {
  return tauriInvoke("node_rgb_onchain_transfer_consignment_download", {
    nodeId,
    consignmentKey,
    format
  });
}

export async function nodeRgbOnchainSend(nodeId: string, request: { invoice: string, fee_rate_sats_per_vb: number }): Promise<RgbOnchainSendResponse> {
  return tauriInvoke("node_rgb_onchain_send", { nodeId: nodeId, request });
}

// Unused
export async function pluginWalletTransferConsignmentAccept(consignment: string): Promise<any> {
  const res = await tauriInvoke("plugin_wallet_transfer_consignment_accept", { consignmentBase64: consignment });
  return res as any
}

export async function nodeRgbOnchainPayments(nodeId: string): Promise<RgbOnchainPaymentsResponse> {
  return tauriInvoke("rgb_onchain_payments", { nodeId: nodeId });
}

export async function nodeRgbDescriptor(nodeId: string): Promise<RgbDescriptorResponse> {
  return tauriInvoke("node_rgb_descriptor", { nodeId: nodeId });
}

export async function nodeSignMessage(nodeId: string, body: SignmessageRequest): Promise<SignmessageResponse> {
  return tauriInvoke("node_rgb_sign_message", { nodeId: nodeId, request: body });
}

export async function nodeRgbLnInvoiceDecode(nodeId: string, request: Bolt11DecodeRequest): Promise<{
  "asset_amount": string,
  "carrier_amount_msat": string
  "contract_id": string
  "destination": string,
  "expiry_secs": string,
  "payment_hash": string
}> {
  return tauriInvoke("node_rgb_ln_invoice_decode", { nodeId, request });
}

export async function mem_cache_set(key: string, value: string): Promise<void> {
  return tauriInvoke("mem_cache_set", { key, value });
}
export async function mem_cache_get(key: string): Promise<string | null> {
  return tauriInvoke("mem_cache_get", { key });
}
export async function mem_cache_remove(key: string): Promise<string | null> {
  return tauriInvoke("mem_cache_remove", { key });
}

export async function nodeRgbCli(nodeId: string, args: string[]): Promise<string> {
  return tauriInvoke("node_rgb_cli", { nodeId, args });
}

export async function nodeRgbBackUpWallet(nodeId: string, saveDir: string): Promise<{ backup_path: string }> {
  return tauriInvoke("node_rgb_cli_wallet_backup_export", {
    nodeId: nodeId,
    saveDir: saveDir,
  });
}

// ---------------------------------------------------------------------------
// PR #102 milestone1: wallet / backup CLI bindings (docker run --rm).
//
// On failure these commands reject with a CommandError shaped like:
//   { code: "subcommand_failed", message, hint, subcommand, exit_code, kind }
// Frontend should branch UI copy on `exit_code` (10/11/12/13/14/15/16/20+/21).
// ---------------------------------------------------------------------------

export type WalletNewMnemonicResponse = {
  /** Space-separated 24-word BIP39 mnemonic. Never logged or persisted by Rust. */
  mnemonic: string;
};

/**
 * Spawn `docker run --rm <image> rgbldkd --output-format=json wallet new-mnemonic`
 * and return the freshly generated mnemonic. Pure function on rgbldkd's side
 * — no data-dir, no passphrase, no mounts required.
 */
export async function walletNewMnemonicCli(image: string): Promise<WalletNewMnemonicResponse> {
  return tauriInvoke("wallet_new_mnemonic_cli", { image });
}

export type NodeRunResponse = {
  /** Name of the daemon container that is now running. */
  container_name: string;
  /**
   * True if the daemon container was already running when this command was
   * called; false if we just (re-)started it. Use this to suppress redundant
   * "node started" toasts when the user retriggers the action.
   */
  already_running: boolean;
};

/**
 * Start (or restart) the node's persistent rgbldkd daemon container.
 *
 * This is the standardized counterpart to the daemon-start step inside
 * bootstrap_local_node — used for the production flow (after the user has
 * been shown the mnemonic and `walletInitCli` has populated the keystore)
 * and for the recovery flow (after `backupImportCli` has restored the data
 * volume). All run parameters (ports, volume, secrets, network, alias,
 * esplora URL) are recovered from the NodeContext, so the frontend only
 * needs to pass `nodeId`.
 *
 * `image` is optional; falls back to `ctx.image` recorded at bootstrap.
 *
 * Idempotent: returns `already_running: true` if the container is already
 * up. If the container exists but is stopped, runs `docker start` rather
 * than recreating it (preserves the original docker config).
 */
export async function nodeRunCli(
  nodeId: string,
  image?: string,
): Promise<NodeRunResponse> {
  return tauriInvoke("node_run_cli", { nodeId, image: image ?? null });
}

export type WalletInitResponse = {
  /** Optional human-readable confirmation from rgbldkd. */
  message: string | null;
};

/**
 * Initialize the keystore for a previously-bootstrapped node using a
 * user-supplied BIP39 mnemonic. The node's container must be stopped
 * first (otherwise rejects with exit 16 `node_not_stopped`).
 *
 * `image` is optional: when omitted, the backend falls back to the image
 * tag recorded on the node's NodeContext (set by bootstrap_local_node).
 * Pass an explicit override only for the migration-period case where you
 * need to run a newer CLI image against an older daemon's data volume.
 *
 * The control panel writes the mnemonic to a host file with mode 0600,
 * bind-mounts it into the throwaway container, and unconditionally deletes
 * it after the command completes. The passphrase reuses the existing
 * `<data-root>/secrets/keystore.passphrase` — the user never sees it.
 */
export async function walletInitCli(
  nodeId: string,
  mnemonic: string,
  image?: string,
): Promise<WalletInitResponse> {
  return tauriInvoke("wallet_init_cli", { nodeId, image: image ?? null, mnemonic });
}

export type WalletShowMnemonicResponse = {
  /**
   * The decrypted BIP39 mnemonic. Highly sensitive — display only, never
   * log, persist, or send across the network. Clear from memory as soon as
   * the reveal flow ends.
   */
  mnemonic: string;
};

/**
 * Reveal the node's stored BIP39 mnemonic by spawning
 * `docker run --rm <image> rgbldkd wallet show-mnemonic --confirm`.
 *
 * `image` is optional and defaults to the tag recorded on the NodeContext.
 *
 * Sensitive operation:
 *   - The caller MUST pass `confirm: true` only after a UI-side
 *     reauthentication / second-confirmation step. Passing `false` rejects
 *     before any docker spawn happens.
 *   - rgbldkd writes an audit-log entry on every invocation (server-side).
 *   - The returned mnemonic must be cleared from React state as soon as the
 *     reveal UI is dismissed; never store it in IndexedDB, localStorage, or
 *     Zustand persisters.
 */
export async function walletShowMnemonicCli(
  nodeId: string,
  confirm: boolean,
  image?: string,
): Promise<WalletShowMnemonicResponse> {
  return tauriInvoke("wallet_show_mnemonic_cli", { nodeId, image: image ?? null, confirm });
}

export type BackupExportResponse = {
  /** Absolute path to the archive that was written. */
  output_path: string;
  /** Archive size in bytes (null if stat failed). */
  size_bytes: number | null;
};

/**
 * Export the node's data-dir as a backup archive to `outputPath`.
 *
 * The destination is the final user-chosen location — typically obtained
 * via Tauri's `@tauri-apps/plugin-dialog` save dialog. The Tauri command
 * does NOT pick the path itself; pass the absolute path you want rgbldkd
 * to write to. On macOS / Windows, the parent directory must fall under
 * Docker Desktop's "File Sharing" settings or the docker mount will fail.
 *
 * Suggested default filename: `<display_name>-<network>-<UTC-timestamp>.tar`
 * so multiple node backups don't collide and the user can tell which is
 * which on disk (the archive also records `node-alias` inside its manifest).
 *
 * Preconditions enforced server-side:
 *   - Node must be locked or stopped. If the daemon is running unlocked,
 *     this command attempts to lock it first via the control API. If the
 *     lock fails, the export aborts (no inconsistent archive).
 *
 * `image` and `network` default to the context's values if omitted.
 */
export async function backupExportCli(
  nodeId: string,
  outputPath: string,
  image?: string,
  network?: string,
): Promise<BackupExportResponse> {
  return tauriInvoke("backup_export_cli", {
    nodeId,
    image: image ?? null,
    outputPath,
    network: network ?? null,
  });
}

export type BackupImportResponse = {
  /** Optional human-readable confirmation from rgbldkd. */
  message: string | null;
};

/**
 * Restore a node's data-dir from a backup archive.
 *
 * The Tauri command does NOT pick the archive — `archivePath` must be the
 * absolute path returned from a Tauri open-file dialog (or similar). The
 * path must fall under Docker Desktop's "File Sharing" settings on
 * macOS/Windows so the bind mount succeeds.
 *
 * Stopping the node container:
 *   - `autoStop=false` (recommended default): if the container is running,
 *     this command rejects with `subcommand_failed` + `exit_code: 16` +
 *     `kind: "node_not_stopped"`. UI should show a confirmation dialog
 *     explaining that the node will be stopped, then re-invoke with
 *     `autoStop=true`.
 *   - `autoStop=true`: this command runs `docker stop` on the container
 *     and waits for it to fully exit before importing. The container is
 *     NOT restarted automatically afterwards — the post-restore flow
 *     should walk the user through `wallet init` (with their original
 *     mnemonic) and re-unlock.
 *
 * Exit codes to branch on:
 *   - 11 fingerprint_mismatch — archive was made with a different mnemonic.
 *   - 12 archive_corrupted    — tar / hash / manifest is broken.
 *   - 13 network_mismatch     — archive's network differs from this node.
 *   - 14 unsupported_format_version — archive is from a newer rgbldkd.
 *   - 16 node_not_stopped     — see autoStop discussion above.
 *
 * Per the milestone1 contract, the archive does NOT contain the keystore.
 * After a successful import the user must run `walletInitCli` with the
 * mnemonic that was used to produce the backup, otherwise the node won't
 * unlock.
 */
export async function backupImportCli(
  nodeId: string,
  archivePath: string,
  autoStop: boolean,
  image?: string,
  network?: string,
): Promise<BackupImportResponse> {
  return tauriInvoke("backup_import_cli", {
    nodeId,
    image: image ?? null,
    archivePath,
    network: network ?? null,
    autoStop,
  });
}

/**
 * Manifest preview returned by `backupInspectArchiveCli`. The `manifest`
 * payload is the raw rgbldkd `BackupManifest` JSON; the UI should read the
 * fields it cares about (typically `network`, `node_alias`, `rgbldkd_version`,
 * `master_fingerprint`, `created_at_unix_secs`).
 *
 * The shape is deliberately untyped (`unknown`) so new backend fields surface
 * automatically without a frontend recompile. Cast / narrow on use.
 */
export type BackupInspectResponse = {
  manifest: {
    format_version: number;
    network: string;
    created_at_unix_secs: number;
    rgbldkd_version?: string | null;
    master_fingerprint?: string | null;
    node_alias?: string | null;
    node_id?: string | null;
    files?: Array<{ path: string; size: number; sha256: string }>;
    [extra: string]: unknown;
  };
};

/**
 * Preview a backup archive's manifest without writing anything to disk.
 *
 * Intended for the recovery wizard's "user selected an archive" step:
 *   1. User picks an archive via Tauri open-file dialog.
 *   2. UI calls `backupInspectArchiveCli(LDK_IMAGE, archivePath)`.
 *   3. UI uses `result.manifest.network` to auto-fill the network field on
 *      the `prepareNodeResources` form (and optionally displays alias /
 *      rgbldkd_version / created_at_unix_secs as context for the user).
 *   4. After `prepareNodeResources` → `walletInitCli` → `backupImportCli` →
 *      `nodeRunCli` → `nodeUnlock`, recovery is complete.
 *
 * No NodeContext is required — this command runs BEFORE the user creates
 * the node. `image` must be supplied explicitly (typically `LDK_IMAGE`).
 *
 * Lenient about `format_version`: archives from newer / older rgbldkd
 * builds still return their manifest. The UI can compare
 * `manifest.rgbldkd_version` against the daemon version to warn the user
 * about potential incompatibility, but inspect itself never rejects.
 */
export async function backupInspectArchiveCli(
  image: string,
  archivePath: string,
): Promise<BackupInspectResponse> {
  return tauriInvoke("backup_inspect_archive_cli", {
    image,
    archivePath,
  });
}

/**
 * Hash a password with PBKDF2-HMAC-SHA256 (600,000 iterations, random salt).
 * Returns a self-contained string `pbkdf2-sha256:<iter>:<salt_hex>:<hash_hex>`
 * suitable for storing in contexts.json as `password_hash`.
 */
export async function hashPassword(password: string): Promise<string> {
  return tauriInvoke("hash_password", { password });
}

/**
 * Verify a password against a stored `password_hash`.
 * Supports both the new PBKDF2 format and the legacy bare-SHA256 format
 * so existing nodes survive upgrade without re-bootstrapping.
 * Returns `true` on match, `false` on mismatch.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return tauriInvoke("verify_password", { password, storedHash });
}

/**
 * @param refresh By default this uses a fast cached view
 */
export async function nodeRgbUtxos(nodeId: string, refresh: boolean = true): Promise<{
  utxos: RgbUtxoDto[]
}> {
  return tauriInvoke("node_rgb_utxos", { nodeId, refresh });
}

export async function walletRecommendedFees(rpc: string): Promise<{
  fastestFee: number
  halfHourFee: number
  hourFee: number
}> {
  return tauriInvoke("wallet_recommended_fees", { rpc });
}

export async function nodeWalletL1Utxos(nodeId: string): Promise<WalletUtxosResponse> {
  return tauriInvoke("node_wallet_l1_utxos", { nodeId });
}

export async function nodeRgbUtxoSweep(nodeId: string, request: RgbUtxosSweepRequest): Promise<RgbUtxosSweepResponse> {
  return tauriInvoke("node_rgb_utxo_sweep", { nodeId, request });
}

export async function nodeRgbUtxosFund(nodeId: string, request: RgbUtxosFundRequest): Promise<RgbUtxosFundResponse> {
  return tauriInvoke("node_rgb_utxos_fund", { nodeId, request });
}

export async function nodeRgbUtxoTopUp(nodeId: string, request: RgbUtxosTopUpRequest): Promise<RgbUtxosTopUpResponse> {
  return tauriInvoke("node_rgb_utxo_top_up", { nodeId, request });
}
