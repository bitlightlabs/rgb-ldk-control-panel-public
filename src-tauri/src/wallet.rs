use serde_json::Value;
use tauri::State;
use url::Url;
use crate::{AppState, error::CommandError, rgbldkd_http};

// Validate a URL against a whitelist
pub fn validate_url(user_input_url: &str, white_list: &Vec<String>) -> bool {
    let user_url = match Url::parse(user_input_url) {
        Ok(u) => u,
        Err(_) => return false,
    };
    let user_origin = match user_url.origin() {
        url::Origin::Opaque(_) => return false,
        url::Origin::Tuple(scheme, host, _port) => {
            format!("{}://{}", scheme, host)
        }
    };
    let is_valid = white_list.iter().any(|allowed_origin| allowed_origin.starts_with(&user_origin));
    // println!("user_origin: {}", user_origin);
    // println!("white_list: {:?}, is_valid: {}", white_list, is_valid);
    is_valid
}

// Download a contract from plugin wallet
pub async fn plugin_wallet_asset_export(
    rpc: &str,
    token: &str,
    params: &str,
    signature: &str,
) -> Result<Vec<u8>, CommandError> {
    let rpc_url = format!("{}/staff/contract/consignment?{}&signature={}", rpc, params, signature);

    let client = reqwest::Client::new();
    let resp = client
        .get(rpc_url)
        .bearer_auth(token)
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

// Unused
pub async fn plugin_wallet_transfer_consignment_export(
   payment_id: &str,
   rpc: &str,
) -> Result<Vec<u8>, CommandError> {
    let rpc_url = format!("{}/staff/payment/consignment?payment_id={}", rpc, payment_id);

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

// Download a transfer consignment from an endpoint
pub async fn download_transfer_consignment_from_link(
   link: &str,
   token: &str,
   params: &str,
   signature: &str,
) -> Result<Vec<u8>, CommandError> {
    // link:    https://xxx.com/staff/payment/consignment
    // params:  payment_id=yyy&timestamp=zzz
    // signature: sign(hex(params))
    let rpc_url = format!("{}?{}&signature={}", link, params, signature);

    let client = reqwest::Client::new();
    let resp = client
        .get(rpc_url)
        .bearer_auth(token)
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

// Download a transfer consignment from an endpoint
pub async fn download_transfer_consignment_from_local(
   link: &str,
) -> Result<Vec<u8>, CommandError> {
    let client = reqwest::Client::new();
    let resp = client
        .get(link)
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


// Unused
pub async fn plugin_wallet_transfer_consignment_accept(
	archive: &[u8],
    rpc: &str,
) -> Result<String, CommandError> {
    let rpc_url = format!("{}/staff/import/consignment", rpc);

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



/// Get recommend fees for a network
#[tauri::command]
pub async fn wallet_recommended_fees(
    _state: State<'_, AppState>,
    rpc: &str,
) -> Result<Value, CommandError> {
    let client = reqwest::Client::new();

	let req = client.get(rpc);
	let resp = req.send().await.map_err(|_| CommandError::HttpRequestFailed)?;
	if !resp.status().is_success() {
		return Err(rgbldkd_http::classify_non_success("main", resp).await?);
	}

	resp.json::<Value>()
		.await
		.map_err(|_| CommandError::HttpRequestFailed)
}
