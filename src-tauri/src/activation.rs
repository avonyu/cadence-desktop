#[cfg(build_mode_commercial)]
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

#[cfg(build_mode_commercial)]
type HmacSha256 = Hmac<Sha256>;

/// Validate an activation code against the embedded SECRET.
/// Returns Some(index) if valid, None if invalid.
pub fn validate_code(code: &str) -> Option<u32> {
    #[cfg(build_mode_commercial)]
    {
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
            let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
                Ok(m) => m,
                Err(_) => return None,
            };
            mac.update(&index.to_be_bytes());
            let result = mac.finalize().into_bytes();
            if result[..8] == decoded[..] {
                return Some(index);
            }
        }
    }

    #[cfg(not(build_mode_commercial))]
    {
        let _ = code;
    }

    None
}

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
