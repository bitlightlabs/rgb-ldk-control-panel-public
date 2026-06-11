use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbUtxosReleaseRequest {
  pub reservation_id: Option<String>,
  pub outpoint: Option<String>,
}
