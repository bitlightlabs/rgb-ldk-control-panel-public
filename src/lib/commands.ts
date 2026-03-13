import type {
  BootstrapLocalEnvironmentResponse,
  BootstrapLocalNodeRequest,
  BootstrapLocalNodeResponse,
  ControlStatusDto,
  DockerEnvironmentResponse,
  EventsStatus,
  NodeHttpProxyResponse,
  NodeContext,
  RegtestBlockHeightResponse,
  RegtestMineResponse,
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
} from "./sdk/types";
import { tauriInvoke } from "./tauri";
import type { RgbContractsExportBundle } from "./domain";
import { uint8ArrayToBase64 } from "./utils";

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

export async function regtestBlockHeight(): Promise<RegtestBlockHeightResponse> {
  return tauriInvoke("regtest_block_height");
}

export async function regtestMine(blocks = 1): Promise<RegtestMineResponse> {
  return tauriInvoke("regtest_mine", { blocks });
}

export async function dockerEnvironment(): Promise<DockerEnvironmentResponse> {
  return tauriInvoke("docker_environment");
}

export async function bootstrapLocalNode(request?: BootstrapLocalNodeRequest): Promise<BootstrapLocalNodeResponse> {
  return tauriInvoke("bootstrap_local_node", {
    nodeName: request?.nodeName ?? null,
    containerName: request?.containerName ?? null,
    mainApiPort: request?.mainApiPort ?? null,
    controlApiPort: request?.controlApiPort ?? null,
    p2pPort: request?.p2pPort ?? null,
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

export async function nodeBolt12OfferReceive(nodeId: string, request: Bolt12OfferReceiveRequest): Promise<Bolt12OfferResponse> {
  return tauriInvoke("node_bolt12_offer_receive", { nodeId: nodeId, request: request });
}

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

export async function pluginWalletAssetExport(contractId: string): Promise<RgbContractsExportBundle> {
  return tauriInvoke("plugin_wallet_asset_export", { contractId });
}

export async function pluginWalletTransferConsignmentExport(paymentId: string): Promise<RgbContractsExportBundle> {
  return tauriInvoke("plugin_wallet_transfer_consignment_export", { paymentId });
}

export async function nodeRgbOnchainTransferConsignmentAccept(
  nodeId: string,
  fileData: string,
  format?: "raw" | "gzip" | "zip",
): Promise<{asset_id: string, amount: string}> {
  return tauriInvoke("node_rgb_onchain_transfer_consignment_accept", {
    nodeId: nodeId,
    format: format ?? null,
    transferConsignmentBase64: fileData,
  });
}

export async function node_rgb_utxos_summary(nodeId: string,): Promise<{
  utxos: {outpoint: string, value_sats: number}[]
}> {
  return tauriInvoke("node_rgb_utxos_summary", { nodeId });
}

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
): Promise<{archive_base64: string}> {
  return tauriInvoke("node_rgb_onchain_transfer_consignment_download", {
    nodeId,
    consignmentKey,
    format
  });
}

export async function nodeRgbOnchainSend(nodeId: string, request: {invoice: string, fee_rate_sats_per_vb: number}): Promise<RgbOnchainSendResponse> {
  return tauriInvoke("node_rgb_onchain_send", { nodeId: nodeId, request });
}

export async function pluginWalletTransferConsignmentAccept(consignment: string): Promise<any> {
  const res = await tauriInvoke("plugin_wallet_transfer_consignment_accept", { consignmentBase64: consignment });
  return res as any
}
