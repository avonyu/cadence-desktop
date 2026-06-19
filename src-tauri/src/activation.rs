#[cfg(build_mode_commercial)]
use aes_gcm::aead::{Aead, KeyInit as AeadKeyInit};
#[cfg(build_mode_commercial)]
use aes_gcm::{Aes256Gcm, Key, Nonce};
#[cfg(build_mode_commercial)]
use hmac::{Hmac, Mac as HmacMacTrait};
#[cfg(build_mode_commercial)]
use rand::Rng;
#[cfg(build_mode_commercial)]
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[cfg(build_mode_commercial)]
type HmacSha256 = Hmac<Sha256>;

/// Trial duration in days for commercial builds without activation.
pub const TRIAL_DURATION_DAYS: i64 = 3;

// ---------------------------------------------------------------------------
//  VAULT — encrypted internal state (commercial mode only)
// ---------------------------------------------------------------------------

#[cfg(build_mode_commercial)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vault {
    pub version: u8,
    pub activated: bool,
    pub fingerprint: String,
    pub trial_start_date: String,
    pub last_seen: String,
}

// ---------------------------------------------------------------------------
//  CODE VALIDATION (commercial mode only)
// ---------------------------------------------------------------------------

#[cfg(build_mode_commercial)]
pub fn validate_code(code: &str) -> Option<u32> {
    let normalized = code.replace('-', "").to_uppercase();
    if normalized.len() != 16 {
        return None;
    }

    let decoded = match hex::decode(&normalized) {
        Ok(d) => d,
        Err(_) => return None,
    };

    let max_codes: u32 = option_env!("CADENCE_MAX_CODES")
        .unwrap_or("1000")
        .parse()
        .unwrap_or(1000);

    let secret = env!("CADENCE_ACTIVATION_SECRET");

    for index in 0..max_codes {
        let mut mac = match <HmacSha256 as HmacMacTrait>::new_from_slice(secret.as_bytes()) {
            Ok(m) => m,
            Err(_) => return None,
        };
        mac.update(&index.to_be_bytes());
        let result = mac.finalize().into_bytes();
        if result[..8] == decoded[..] {
            return Some(index);
        }
    }

    None
}

// ---------------------------------------------------------------------------
//  MACHINE FINGERPRINT (always available)
// ---------------------------------------------------------------------------

/// Generate a machine fingerprint that binds activation to this device.
pub fn get_machine_fingerprint() -> String {
    let host = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default();

    let raw = format!(
        "{}|{}|{}|com.avonyu.cadence-desktop",
        host,
        std::env::consts::OS,
        std::env::consts::ARCH,
    );

    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}

// ---------------------------------------------------------------------------
//  TRIAL (always available)
// ---------------------------------------------------------------------------

/// Calculate trial days remaining from a start date ISO string.
/// Returns number of remaining days (0 if expired).
pub fn trial_days_remaining(trial_start_date: &str) -> i32 {
    let start = match chrono::NaiveDate::parse_from_str(
        &trial_start_date[..10.min(trial_start_date.len())],
        "%Y-%m-%d",
    ) {
        Ok(d) => d,
        Err(_) => return 0,
    };
    let today = chrono::Local::now().date_naive();
    let elapsed = today.signed_duration_since(start).num_days();
    (TRIAL_DURATION_DAYS - elapsed).max(0) as i32
}

/// Get today's date as ISO string (YYYY-MM-DD).
pub fn today_iso() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// Get current datetime as ISO string for last_seen tracking (UTC).
pub fn now_iso() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string()
}

// ---------------------------------------------------------------------------
//  DEVICE KEY DERIVATION (commercial mode only)
// ---------------------------------------------------------------------------

#[cfg(build_mode_commercial)]
fn derive_device_key(fingerprint: &str) -> [u8; 32] {
    let secret = env!("CADENCE_ACTIVATION_SECRET");
    let mut mac =
        <HmacSha256 as HmacMacTrait>::new_from_slice(secret.as_bytes()).expect("HMAC can take any key length");
    mac.update(b"cadence-vault-key-v1");
    mac.update(fingerprint.as_bytes());
    let result = mac.finalize().into_bytes();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

#[cfg(build_mode_commercial)]
fn derive_hmac_key(fingerprint: &str) -> [u8; 32] {
    let secret = env!("CADENCE_ACTIVATION_SECRET");
    let mut mac =
        <HmacSha256 as HmacMacTrait>::new_from_slice(secret.as_bytes()).expect("HMAC can take any key length");
    mac.update(b"cadence-hmac-key-v1");
    mac.update(fingerprint.as_bytes());
    let result = mac.finalize().into_bytes();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

// ---------------------------------------------------------------------------
//  AES-256-GCM ENCRYPTION / DECRYPTION (commercial mode only)
// ---------------------------------------------------------------------------

/// Encrypt `plaintext` with AES-256-GCM.
/// Returns `nonce || ciphertext` (12 byte nonce prepended).
#[cfg(build_mode_commercial)]
fn encrypt(plaintext: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("encrypt failed: {}", e))?;
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Decrypt `encrypted` (nonce || ciphertext) with AES-256-GCM.
#[cfg(build_mode_commercial)]
fn decrypt(encrypted: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if encrypted.len() < 12 {
        return Err("ciphertext too short".into());
    }
    let (nonce_bytes, ciphertext) = encrypted.split_at(12);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("decrypt failed: {}", e))
}

// ---------------------------------------------------------------------------
//  HMAC INTEGRITY (commercial mode only)
// ---------------------------------------------------------------------------

#[cfg(build_mode_commercial)]
fn hmac_sign(data: &[u8], key: &[u8; 32]) -> String {
    let mut mac = <HmacSha256 as HmacMacTrait>::new_from_slice(key).expect("HMAC can take any key length");
    mac.update(data);
    hex::encode(mac.finalize().into_bytes())
}

#[cfg(build_mode_commercial)]
fn hmac_verify(data: &[u8], key: &[u8; 32], expected: &str) -> bool {
    let signature = hmac_sign(data, key);
    signature == expected
}

// ---------------------------------------------------------------------------
//  VAULT PACK / UNPACK (commercial mode only)
// ---------------------------------------------------------------------------

/// Serialize, encrypt, and HMAC a Vault into the store-ready JSON value.
/// Returns `{ "vault": "<base64>", "hmac": "<hex>" }`.
#[cfg(build_mode_commercial)]
pub fn pack_vault(vault: &Vault, fingerprint: &str) -> Result<serde_json::Value, String> {
    let plain = serde_json::to_vec(vault).map_err(|e| format!("serialize vault: {}", e))?;

    let enc_key = derive_device_key(fingerprint);
    let encrypted = encrypt(&plain, &enc_key)?;

    let hmac_key = derive_hmac_key(fingerprint);
    let hmac = hmac_sign(&encrypted, &hmac_key);

    let vault_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &encrypted,
    );

    Ok(serde_json::json!({
        "vault": vault_b64,
        "hmac": hmac,
    }))
}

/// Decode, verify HMAC, and decrypt a Vault from store JSON.
/// Returns None if the stored data is missing, corrupted, or tampered.
#[cfg(build_mode_commercial)]
pub fn unpack_vault(
    store_json: &serde_json::Value,
    fingerprint: &str,
) -> Result<Option<Vault>, String> {
    let vault_b64 = match store_json.get("vault").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return Ok(None),
    };

    let stored_hmac = match store_json.get("hmac").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return Ok(None),
    };

    let encrypted = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        vault_b64,
    )
    .map_err(|e| format!("base64 decode: {}", e))?;

    let hmac_key = derive_hmac_key(fingerprint);
    if !hmac_verify(&encrypted, &hmac_key, stored_hmac) {
        eprintln!("[activation] HMAC verification FAILED — vault tampered or corrupted");
        return Ok(None);
    }

    let enc_key = derive_device_key(fingerprint);
    let plain = match decrypt(&encrypted, &enc_key) {
        Ok(p) => p,
        Err(e) => {
            eprintln!(
                "[activation] Decrypt FAILED (wrong device or corrupted data): {}",
                e
            );
            return Ok(None);
        }
    };

    let vault: Vault =
        serde_json::from_slice(&plain).map_err(|e| format!("deserialize vault: {}", e))?;
    Ok(Some(vault))
}

// ---------------------------------------------------------------------------
//  CLOCK-ROLLBACK DETECTION (commercial mode only)
// ---------------------------------------------------------------------------

/// Returns true if the system clock appears to have been rolled back
/// relative to the stored `last_seen` timestamp (both in UTC).
#[cfg(build_mode_commercial)]
pub fn detect_clock_rollback(vault: &Vault) -> bool {
    let now = chrono::Utc::now();
    if let Ok(last) = chrono::NaiveDateTime::parse_from_str(&vault.last_seen, "%Y-%m-%dT%H:%M:%S") {
        let last_utc = last.and_utc();
        if now < last_utc {
            eprintln!(
                "[activation] Clock rollback detected: last_seen(UTC)={} now(UTC)={}",
                vault.last_seen,
                now.format("%Y-%m-%dT%H:%M:%S")
            );
            return true;
        }
    }
    false
}
