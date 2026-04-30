use std::time::SystemTime;
use hex::encode;

pub fn encode_uri_component(s: &str) -> String {
  // According to RFC 3986, the following characters are "unreserved" and do not need to be encoded.
  // This includes alphanumeric characters and - _ . ! ~ * ' ( )
  const SAFE_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()";

  let mut result = String::new();
  for &byte in s.as_bytes() {
      if SAFE_CHARS.contains(&byte) {
        result.push(byte as char);
      } else {
        result.push_str(&format!("%{:02X}", byte));
      }
  }

  result
}


pub fn get_current_timestamp() -> u64 {
  SystemTime::now()
    .duration_since(SystemTime::UNIX_EPOCH)
    .unwrap()
    .as_secs()
}

pub fn sort_http_params(
  params: &[(&str, &str)],
) -> String {
  let mut map = std::collections::BTreeMap::new();

  for (key, value) in params {
    map.insert(*key, value);
  }

  map.into_iter().map(|(key, value)| format!("{key}={value}"))
    .collect::<Vec<_>>()
    .join("&")
}

pub fn str_to_hex(s: &str) -> String {
  encode(s)
}
