use crate::{error::CommandError, rgbldkd_http};
// use serde::{Deserialize, Serialize};
// use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};

// #[derive(Debug, Clone, Serialize, Deserialize)]
// pub struct RpcRequest {
//     jsonrpc: String,
//     id: String,
//     method: String,
//     params: Vec<serde_json::Value>,
// }

// #[derive(Debug, Clone, Serialize, Deserialize)]
// pub struct RpcResponse {
//     result: Option<String>,
//     error: Option<serde_json::Value>,
//     id: String,
// }

// async fn call_bitcoin_rpc(
//     client: &reqwest::Client,
//     url: &str,
//     headers: &HeaderMap,
//     method: &str,
//     params: Vec<Value>,
// ) -> Result<Value, CommandError> {
//     let request = RpcRequest {
//         jsonrpc: "1.0".to_string(),
//         id: "rust-client".to_string(),
//         method: method.to_string(),
//         params,
//     };

//     let response = client
//         .post(url)
//         .headers(headers.clone())
//         .json(&request)
//         .send()
//         .await
//         .map_err(|e| CommandError::HttpRequestFailed)?;

//     response.json::<Value>().await.map_err(|_| CommandError::HttpRequestFailed)
// }


// pub async fn btc_deposit(
//     address: &str,
//     amount: f32
// ) -> Result<RpcResponse, CommandError> {
//     let rpc_url = "http://127.0.0.1:18443";
//     let rpc_user = "btcuser";
//     let rpc_password = "btcpass";

//     let auth = format!("{}:{}", rpc_user, rpc_password);
//     let auth_base64 = base64::encode(auth);

//     let mut headers = HeaderMap::new();
//     headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain"));
//     headers.insert(
//         AUTHORIZATION,
//         HeaderValue::from_str(&format!("Basic {}", auth_base64)).unwrap(),
//     );

//     let request_body = RpcRequest {
//         jsonrpc: "1.0".to_string(),
//         id: "rust-client".to_string(),
//         method: "sendtoaddress".to_string(),
//         params: vec![
//             json!(address),
//             json!(amount),
//             json!("comment text"),
//         ],
//     };

//     let client = reqwest::Client::new();
//     let response = client
//         .post(rpc_url)
//         .headers(headers)
//         .json(&request_body)
//         .send()
//         .await
//         .map_err(|_| CommandError::HttpRequestFailed)?;

//     response.json::<RpcResponse>().await.map_err(|_| CommandError::HttpRequestFailed)
// }

// pub async fn btc_mine() -> Result<Value, CommandError> {
//     let rpc_url = "http://127.0.0.1:18443";
//     let rpc_user = "btcuser";
//     let rpc_password = "btcpass";

//     let client = reqwest::Client::new();
//     let auth = format!("{}:{}", rpc_user, rpc_password);
//     let auth_base64 = base64::encode(auth);

//     let mut headers = HeaderMap::new();
//     headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain"));
//     headers.insert(
//         AUTHORIZATION,
//         HeaderValue::from_str(&format!("Basic {}", auth_base64)).unwrap(),
//     );

//     let address_value = call_bitcoin_rpc(
//         &client,
//         rpc_url,
//         &headers,
//         "getnewaddress",
//         vec![json!("mining_label"), json!("bech32")]
//     ).await?;

//     let address = address_value.get("result")
//         .and_then(|v| v.as_str())
//         .ok_or(CommandError::HttpRequestFailed)?;

//     call_bitcoin_rpc(
//         &client,
//         rpc_url,
//         &headers,
//         "generatetoaddress",
//         vec![json!(6), json!(address)]
//     ).await.map_err(|_| CommandError::HttpRequestFailed)
// }

static WALLET_RPC: &str = "https://core-regtest-stag.bitlightdev.info";

pub async fn plugin_wallet_asset_export(
   contract_id: &str,
) -> Result<Vec<u8>, CommandError> {
    let rpc_url = format!("{}/staff/contract/consignment?contract_id={}", WALLET_RPC, contract_id);

    let client = reqwest::Client::new();
    let resp = client
        .get(rpc_url)
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;

    if !resp.status().is_success() {
        return Err(rgbldkd_http::classify_non_success("main", resp).await?);
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    Ok(bytes.to_vec())
}


pub async fn plugin_wallet_transfer_consignment_export(
   payment_id: &str,
) -> Result<Vec<u8>, CommandError> {
    let rpc_url = format!("{}/staff/payment/consignment?payment_id={}", WALLET_RPC, payment_id);

    let client = reqwest::Client::new();
    let resp = client
        .get(rpc_url)
        .send()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;

    if !resp.status().is_success() {
        return Err(rgbldkd_http::classify_non_success("main", resp).await?);
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|_| CommandError::HttpRequestFailed)?;
    Ok(bytes.to_vec())
}

pub async fn plugin_wallet_transfer_consignment_accept(
	archive: &[u8],
) -> Result<String, CommandError> {
    let rpc_url = format!("{}/staff/import/consignment", WALLET_RPC);

    let client = reqwest::Client::new();

	let req = client
		.post(rpc_url)
        .bearer_auth("")
		.header("Content-Type", "application/octet-stream")
		.body(archive.to_vec());

	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(rgbldkd_http::classify_non_success("main", resp).await?);
	}

	resp.text()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}
