use crate::activation;
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize)]
pub struct ActivateResult {
    pub success: bool,
    pub error: Option<String>,
    pub fingerprint: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationStatus {
    pub activated: bool,
    pub trial_active: bool,
    pub trial_days_remaining: i32,
}

// ---------------------------------------------------------------------------
//  MULTI-POINT STORAGE HELPERS (commercial mode only)
// ---------------------------------------------------------------------------

#[cfg(build_mode_commercial)]
fn vault_store_json(app: &tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let store = app
        .store("activation.dat")
        .map_err(|e| format!("open store: {}", e))?;
    let json = store.get("vault");
    Ok(json)
}

#[cfg(build_mode_commercial)]
fn vault_backup_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("app_cache_dir: {}", e))?;
    Ok(dir.join(".cadence_lic"))
}

#[cfg(build_mode_commercial)]
fn read_backup_json(app: &tauri::AppHandle) -> Option<serde_json::Value> {
    let path = vault_backup_path(app).ok()?;
    let raw = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&raw).ok()
}

#[cfg(build_mode_commercial)]
fn write_backup_json(app: &tauri::AppHandle, json: &serde_json::Value) -> Result<(), String> {
    let path = vault_backup_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create_dir: {}", e))?;
    }
    let raw = serde_json::to_string_pretty(json).map_err(|e| format!("serialize: {}", e))?;
    std::fs::write(&path, &raw).map_err(|e| format!("write backup: {}", e))?;
    Ok(())
}

/// Write the vault JSON to both the primary store and the backup file.
#[cfg(build_mode_commercial)]
fn write_vault_to_both(
    app: &tauri::AppHandle,
    vault_json: &serde_json::Value,
) -> Result<(), String> {
    let store = app
        .store("activation.dat")
        .map_err(|e| format!("open store: {}", e))?;
    store.set("vault", vault_json.clone());
    // Clear old plaintext keys from any previous version
    let _ = store.delete("activated");
    let _ = store.delete("fingerprint");
    let _ = store.delete("code");
    let _ = store.delete("trial_start_date");
    store.save().map_err(|e| format!("save store: {}", e))?;
    eprintln!("[activation] write_vault_to_both: store saved OK");

    match write_backup_json(app, vault_json) {
        Ok(()) => eprintln!("[activation] write_vault_to_both: backup saved OK"),
        Err(e) => eprintln!("[activation] write_vault_to_both: backup FAILED — {}", e),
    }
    Ok(())
}

/// Read the vault from primary store; if missing or corrupt, try backup and restore.
/// Returns the raw store JSON (before unpacking) and a bool indicating if repair happened.
#[cfg(build_mode_commercial)]
fn read_vault_json_with_fallback(
    app: &tauri::AppHandle,
    fingerprint: &str,
) -> (Option<serde_json::Value>, bool) {
    // 1. Try primary store
    match vault_store_json(app) {
        Ok(Some(json)) => {
            // Quick validation: try to unpack it
            match activation::unpack_vault(&json, fingerprint) {
                Ok(Some(_)) => {
                    eprintln!("[activation] Primary vault valid, using it");
                    return (Some(json), false);
                }
                Ok(None) => {
                    eprintln!("[activation] Primary vault found but unpack returned None (missing keys?)");
                }
                Err(e) => {
                    eprintln!("[activation] Primary vault found but unpack FAILED: {}", e);
                }
            }
        }
        Ok(None) => {
            eprintln!("[activation] Primary vault: store.get(\"vault\") returned None");
            // Try to migrate from old plaintext format
            if let Ok(store) = app.store("activation.dat") {
                let old_activated = store
                    .get("activated")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let old_trial = store
                    .get("trial_start_date")
                    .and_then(|v| v.as_str().map(|s| s.to_string()));
                let old_fingerprint = store
                    .get("fingerprint")
                    .and_then(|v| v.as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| fingerprint.to_string());

                if old_activated || old_trial.is_some() {
                    eprintln!(
                        "[activation] Found old-format data — migrating (activated={}, trial={:?})",
                        old_activated, old_trial
                    );
                    let vault = activation::Vault {
                        version: 1,
                        activated: old_activated,
                        fingerprint: old_fingerprint,
                        trial_start_date: old_trial.unwrap_or_else(|| activation::today_iso()),
                        last_seen: activation::now_iso(),
                    };
                    if let Ok(packed) = activation::pack_vault(&vault, fingerprint) {
                        let _ = write_vault_to_both(app, &packed);
                        eprintln!("[activation] Migration complete, vault saved");
                        return (Some(packed), true);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("[activation] Primary vault: failed to open store — {}", e);
        }
    }

    // 2. Try backup
    match read_backup_json(app) {
        Some(backup_json) => {
            match activation::unpack_vault(&backup_json, fingerprint) {
                Ok(Some(_)) => {
                    eprintln!("[activation] Backup vault valid — restoring primary");
                    let _ = write_vault_to_both(app, &backup_json);
                    return (Some(backup_json), true);
                }
                Ok(None) => {
                    eprintln!("[activation] Backup vault found but unpack returned None");
                }
                Err(e) => {
                    eprintln!("[activation] Backup vault unpack FAILED: {}", e);
                }
            }
        }
        None => {
            eprintln!("[activation] No backup file found");
        }
    }

    eprintln!("[activation] No valid vault anywhere — fresh trial will be created");
    (None, false)
}

// ---------------------------------------------------------------------------
//  ACTIVATION COMMANDS
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_activation_status(app: tauri::AppHandle) -> ActivationStatus {
    // Dev-mode only: read VITE_EXPIRE_MODE from .env for rapid testing.
    #[cfg(debug_assertions)]
    if let Some(mode) = crate::util::read_dotenv_var("VITE_EXPIRE_MODE") {
        eprintln!(
            "[activation] get_activation_status (debug): VITE_EXPIRE_MODE = {}",
            mode
        );
        return match mode.as_str() {
            "expired" => ActivationStatus {
                activated: false,
                trial_active: false,
                trial_days_remaining: 0,
            },
            "trial" => ActivationStatus {
                activated: false,
                trial_active: true,
                trial_days_remaining: activation::TRIAL_DURATION_DAYS as i32,
            },
            "activated" => ActivationStatus {
                activated: true,
                trial_active: false,
                trial_days_remaining: 0,
            },
            _ => {
                eprintln!("[activation] Unknown VITE_EXPIRE_MODE value: {}", mode);
                ActivationStatus {
                    activated: false,
                    trial_active: false,
                    trial_days_remaining: 0,
                }
            }
        };
    }

    // Release-mode: use compile-time VITE_EXPIRE_MODE from build.rs.
    #[cfg(not(debug_assertions))]
    if let Some(mode) = option_env!("VITE_EXPIRE_MODE") {
        eprintln!(
            "[activation] get_activation_status (release override): VITE_EXPIRE_MODE = {}",
            mode
        );
        return match mode {
            "expired" => ActivationStatus {
                activated: false,
                trial_active: false,
                trial_days_remaining: 0,
            },
            "trial" => ActivationStatus {
                activated: false,
                trial_active: true,
                trial_days_remaining: activation::TRIAL_DURATION_DAYS as i32,
            },
            "activated" => ActivationStatus {
                activated: true,
                trial_active: false,
                trial_days_remaining: 0,
            },
            _ => ActivationStatus {
                activated: false,
                trial_active: false,
                trial_days_remaining: 0,
            },
        };
    }

    // OSS mode: always activated.
    if cfg!(not(build_mode_commercial)) {
        return ActivationStatus {
            activated: true,
            trial_active: false,
            trial_days_remaining: 0,
        };
    }

    // --- Commercial mode with full protections ---
    #[cfg(build_mode_commercial)]
    {
        let fingerprint = activation::get_machine_fingerprint();
        eprintln!("[activation] get_activation_status: fingerprint={}", fingerprint);

        // Try to read vault from multi-point storage.
        if let (Some(vault_json), _repaired) = read_vault_json_with_fallback(&app, &fingerprint) {
            eprintln!("[activation] get_activation_status: vault_json found, attempting unpack");
            if let Ok(Some(mut vault)) = activation::unpack_vault(&vault_json, &fingerprint) {
                eprintln!(
                    "[activation] get_activation_status: vault unpacked — activated={}, trial_start={}",
                    vault.activated, vault.trial_start_date
                );
                // Check clock rollback.
                if activation::detect_clock_rollback(&vault) {
                    eprintln!("[activation] Clock rollback — trial locked");
                    return ActivationStatus {
                        activated: false,
                        trial_active: false,
                        trial_days_remaining: 0,
                    };
                }

                // Verify fingerprint binding if activated.
                if vault.activated && vault.fingerprint != fingerprint {
                    eprintln!("[activation] Fingerprint mismatch — deactivating");
                    vault.activated = false;
                    if let Ok(packed) = activation::pack_vault(&vault, &fingerprint) {
                        let _ = write_vault_to_both(&app, &packed);
                    }
                    return ActivationStatus {
                        activated: false,
                        trial_active: false,
                        trial_days_remaining: 0,
                    };
                }

                // Update last_seen.
                vault.last_seen = activation::now_iso();
                if let Ok(packed) = activation::pack_vault(&vault, &fingerprint) {
                    let _ = write_vault_to_both(&app, &packed);
                }

                if vault.activated {
                    return ActivationStatus {
                        activated: true,
                        trial_active: false,
                        trial_days_remaining: 0,
                    };
                }

                let remaining = activation::trial_days_remaining(&vault.trial_start_date);
                let trial_active = remaining > 0;

                return ActivationStatus {
                    activated: false,
                    trial_active,
                    trial_days_remaining: remaining,
                };
            }
        }

        // No valid vault — create fresh trial.
        eprintln!("[activation] get_activation_status: NO VALID VAULT — creating fresh trial");
        let vault = activation::Vault {
            version: 1,
            activated: false,
            fingerprint: fingerprint.clone(),
            trial_start_date: activation::today_iso(),
            last_seen: activation::now_iso(),
        };

        let remaining = activation::trial_days_remaining(&vault.trial_start_date);
        let trial_active = remaining > 0;

        if let Ok(packed) = activation::pack_vault(&vault, &fingerprint) {
            let _ = write_vault_to_both(&app, &packed);
        }

        ActivationStatus {
            activated: false,
            trial_active,
            trial_days_remaining: remaining,
        }
    }
}

#[tauri::command]
pub fn activate(code: String, app: tauri::AppHandle) -> Result<ActivateResult, String> {
    // OSS mode: always succeeds.
    if cfg!(not(build_mode_commercial)) {
        return Ok(ActivateResult {
            success: true,
            error: None,
            fingerprint: Some(activation::get_machine_fingerprint()),
        });
    }

    #[cfg(build_mode_commercial)]
    {
        match activation::validate_code(&code) {
            Some(_index) => {
                eprintln!("[activation] activate: code valid, index={}", _index);
                let fingerprint = activation::get_machine_fingerprint();
                eprintln!("[activation] activate: fingerprint={}", fingerprint);

                // Preserve trial_start_date from existing vault if present; read now as
                // later we are going to write a new vault.
                let existing_trial_start = {
                    let store_opt = app.store("activation.dat").ok();
                    let from_store = store_opt
                        .as_ref()
                        .and_then(|s| s.get("trial_start_date"))
                        .and_then(|v| v.as_str().map(|s| s.to_string()));
                    if from_store.is_none() {
                        if let Ok(Some(json)) = vault_store_json(&app) {
                            match activation::unpack_vault(&json, &fingerprint) {
                                Ok(Some(v)) => Some(v.trial_start_date),
                                _ => None,
                            }
                        } else {
                            None
                        }
                    } else {
                        from_store
                    }
                };

                let trial_start =
                    existing_trial_start.unwrap_or_else(|| activation::today_iso());

                let vault = activation::Vault {
                    version: 1,
                    activated: true,
                    fingerprint: fingerprint.clone(),
                    trial_start_date: trial_start,
                    last_seen: activation::now_iso(),
                };

                eprintln!("[activation] activate: packing and writing vault...");
                let packed = activation::pack_vault(&vault, &fingerprint)
                    .map_err(|e| format!("pack vault: {}", e))?;
                write_vault_to_both(&app, &packed)?;
                eprintln!("[activation] activate: DONE — activation persisted");

                Ok(ActivateResult {
                    success: true,
                    error: None,
                    fingerprint: Some(fingerprint),
                })
            }
            None => Ok(ActivateResult {
                success: false,
                error: Some("Invalid activation code".into()),
                fingerprint: None,
            }),
        }
    }
}
