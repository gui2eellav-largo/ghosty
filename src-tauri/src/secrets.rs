/// Module de gestion sécurisée des secrets API
/// Utilise le keychain macOS pour stocker les clés de manière chiffrée
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::RwLock;

const SERVICE_NAME: &str = "ai.ghosty.app";
const OPENAI_ACCOUNT: &str = "openai_api_key"; // Legacy (compatibilité)
const KEYS_ACCOUNT: &str = "api_keys_store";

/// Cache en mémoire pour la clé API (évite lectures keychain répétées)
static API_KEY_CACHE: Lazy<RwLock<Option<String>>> = Lazy::new(|| RwLock::new(None));

/// Structure pour une entrée de clé API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyEntry {
    pub id: String,
    pub name: String,
    pub provider: String, // "openai", "anthropic", "custom", etc.
    pub key: String,
}

/// Configuration multi-clés
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeysConfig {
    pub keys: Vec<ApiKeyEntry>,
    pub active_key_id: String,
}

/// Valide le format d'une clé API selon le provider
fn validate_api_key(key: &str, provider: &str) -> Result<(), String> {
    // Vérification de base : non vide
    if key.trim().is_empty() {
        return Err("Clé API vide".to_string());
    }

    // Validation spécifique par provider
    match provider {
        "openai" => validate_openai_key(key),
        "anthropic" => validate_anthropic_key(key),
        "custom" => validate_custom_key(key),
        _ => Err(format!("Provider inconnu: {}", provider)),
    }
}

/// Validation OpenAI
fn validate_openai_key(key: &str) -> Result<(), String> {
    if !key.starts_with("sk-") && !key.starts_with("sk-proj-") {
        return Err("Format OpenAI invalide: doit commencer par 'sk-' ou 'sk-proj-'".to_string());
    }

    if key.len() < 40 {
        return Err("Clé OpenAI trop courte: minimum 40 caractères".to_string());
    }

    if !key
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Clé contient des caractères invalides".to_string());
    }

    Ok(())
}

/// Validation Anthropic
fn validate_anthropic_key(key: &str) -> Result<(), String> {
    if !key.starts_with("sk-ant-") {
        return Err("Format Anthropic invalide: doit commencer par 'sk-ant-'".to_string());
    }

    if key.len() < 40 {
        return Err("Clé Anthropic trop courte: minimum 40 caractères".to_string());
    }

    if !key
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Clé contient des caractères invalides".to_string());
    }

    Ok(())
}

/// Validation Custom (permissive)
fn validate_custom_key(key: &str) -> Result<(), String> {
    if key.len() < 10 {
        return Err("Clé trop courte: minimum 10 caractères".to_string());
    }

    // Pas de restriction de format pour custom
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn set_api_key(key: String) -> Result<(), String> {
    use security_framework::passwords::*;

    // Validation avant stockage
    validate_openai_key(&key)?;

    // Supprimer ancienne clé si existe
    let _ = delete_generic_password(SERVICE_NAME, OPENAI_ACCOUNT);

    // Stocker dans keychain
    set_generic_password(SERVICE_NAME, OPENAI_ACCOUNT, key.as_bytes())
        .map_err(|e| format!("Erreur stockage keychain: {}", e))?;

    // Invalider cache
    invalidate_cache();

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn set_api_key(_key: String) -> Result<(), String> {
    Err("Keychain disponible uniquement sur macOS".to_string())
}

#[cfg(target_os = "macos")]
pub fn get_api_key() -> Result<String, String> {
    use security_framework::passwords::*;

    // Essayer keychain d'abord
    match get_generic_password(SERVICE_NAME, OPENAI_ACCOUNT) {
        Ok(password_bytes) => {
            let key = String::from_utf8_lossy(&password_bytes).to_string();

            // Validation après récupération
            validate_openai_key(&key)?;

            Ok(key)
        }
        Err(_) => {
            // Fallback: variable d'environnement (pour développement)
            std::env::var("OPENAI_API_KEY")
                .map_err(|_| {
                    "Clé API non configurée. Utilisez les paramètres pour configurer votre clé OpenAI.".to_string()
                })
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_api_key() -> Result<String, String> {
    // Sur autres plateformes, utiliser uniquement env var
    std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY non définie".to_string())
}

#[cfg(target_os = "macos")]
pub fn delete_api_key() -> Result<(), String> {
    use security_framework::passwords::*;

    delete_generic_password(SERVICE_NAME, OPENAI_ACCOUNT)
        .map_err(|e| format!("Erreur suppression keychain: {}", e))?;

    // Invalider cache
    invalidate_cache();

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn delete_api_key() -> Result<(), String> {
    Err("Keychain disponible uniquement sur macOS".to_string())
}

pub fn has_api_key() -> bool {
    get_api_key().is_ok()
}

/// Invalide le cache API key (à appeler lors set/delete)
fn invalidate_cache() {
    if let Ok(mut cache) = API_KEY_CACHE.write() {
        *cache = None;
    }
}

/// Récupère la clé API avec cache (performance optimisée).
/// Utilise get_active_key() pour respecter la clé sélectionnée en multi-clés.
pub fn get_api_key_cached() -> Result<String, String> {
    if let Ok(cache) = API_KEY_CACHE.read() {
        if let Some(key) = cache.as_ref() {
            return Ok(key.clone());
        }
    }
    let key = get_active_key()?;
    if let Ok(mut cache) = API_KEY_CACHE.write() {
        *cache = Some(key.clone());
    }
    Ok(key)
}

// ============================================================================
// MULTI-KEYS MANAGEMENT
// ============================================================================

/// Récupère la configuration multi-clés depuis le keychain
#[cfg(target_os = "macos")]
fn get_keys_config() -> Result<KeysConfig, String> {
    use security_framework::passwords::*;

    match get_generic_password(SERVICE_NAME, KEYS_ACCOUNT) {
        Ok(config_bytes) => {
            let config_str = String::from_utf8_lossy(&config_bytes).to_string();
            serde_json::from_str(&config_str).map_err(|e| format!("Erreur parsing config: {}", e))
        }
        Err(_) => {
            // Pas de config multi-clés, retourner config vide
            Ok(KeysConfig {
                keys: vec![],
                active_key_id: String::new(),
            })
        }
    }
}

/// Sauvegarde la configuration multi-clés dans le keychain
#[cfg(target_os = "macos")]
fn save_keys_config(config: &KeysConfig) -> Result<(), String> {
    use security_framework::passwords::*;

    let config_json =
        serde_json::to_string(config).map_err(|e| format!("Erreur serialization: {}", e))?;

    // Supprimer ancienne config si existe
    let _ = delete_generic_password(SERVICE_NAME, KEYS_ACCOUNT);

    // Stocker nouvelle config
    set_generic_password(SERVICE_NAME, KEYS_ACCOUNT, config_json.as_bytes())
        .map_err(|e| format!("Erreur stockage config: {}", e))?;

    Ok(())
}

/// Ajoute une nouvelle clé API
#[cfg(target_os = "macos")]
pub fn add_api_key(name: String, provider: String, key: String) -> Result<String, String> {
    // Validation selon provider
    validate_api_key(&key, &provider)?;

    // Récupérer config actuelle
    let mut config = get_keys_config()?;

    // Générer ID unique
    let id = format!("key_{}", uuid::Uuid::new_v4().to_string());

    // Ajouter nouvelle clé
    config.keys.push(ApiKeyEntry {
        id: id.clone(),
        name,
        provider,
        key,
    });

    // Si première clé, la marquer comme active
    if config.keys.len() == 1 {
        config.active_key_id = id.clone();
    }

    // Sauvegarder
    save_keys_config(&config)?;

    // Invalider cache
    invalidate_cache();

    Ok(id)
}

#[cfg(not(target_os = "macos"))]
pub fn add_api_key(_name: String, _provider: String, _key: String) -> Result<String, String> {
    Err("Multi-keys disponible uniquement sur macOS".to_string())
}

/// Supprime une clé API par ID
#[cfg(target_os = "macos")]
pub fn remove_api_key(key_id: String) -> Result<(), String> {
    let mut config = get_keys_config()?;

    // Retirer la clé
    config.keys.retain(|k| k.id != key_id);

    // Si la clé active a été supprimée, choisir une autre
    if config.active_key_id == key_id {
        config.active_key_id = config
            .keys
            .first()
            .map(|k| k.id.clone())
            .unwrap_or_default();
    }

    // Sauvegarder
    save_keys_config(&config)?;

    // Invalider cache
    invalidate_cache();

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn remove_api_key(_key_id: String) -> Result<(), String> {
    Err("Multi-keys disponible uniquement sur macOS".to_string())
}

/// Change la clé active
#[cfg(target_os = "macos")]
pub fn set_active_key(key_id: String) -> Result<(), String> {
    let mut config = get_keys_config()?;

    // Vérifier que la clé existe
    if !config.keys.iter().any(|k| k.id == key_id) {
        return Err("Clé introuvable".to_string());
    }

    // Mettre à jour
    config.active_key_id = key_id;

    // Sauvegarder
    save_keys_config(&config)?;

    // Invalider cache
    invalidate_cache();

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn set_active_key(_key_id: String) -> Result<(), String> {
    Err("Multi-keys disponible uniquement sur macOS".to_string())
}

/// Liste toutes les clés (sans les valeurs sensibles)
#[cfg(target_os = "macos")]
pub fn get_all_keys() -> Result<Vec<(String, String, String, bool)>, String> {
    let config = get_keys_config()?;

    Ok(config
        .keys
        .iter()
        .map(|k| {
            (
                k.id.clone(),
                k.name.clone(),
                k.provider.clone(),
                k.id == config.active_key_id,
            )
        })
        .collect())
}

#[cfg(not(target_os = "macos"))]
pub fn get_all_keys() -> Result<Vec<(String, String, String, bool)>, String> {
    Err("Multi-keys disponible uniquement sur macOS".to_string())
}

/// Récupère la clé active
#[cfg(target_os = "macos")]
pub fn get_active_key() -> Result<String, String> {
    let config = get_keys_config()?;

    if config.active_key_id.is_empty() {
        // Fallback : ancienne méthode (compatibilité)
        return get_api_key();
    }

    config
        .keys
        .iter()
        .find(|k| k.id == config.active_key_id)
        .map(|k| k.key.clone())
        .ok_or_else(|| "Clé active introuvable".to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_key() -> Result<String, String> {
    get_api_key()
}

// ============================================================================
// LEGACY FUNCTIONS (Compatibilité)
// ============================================================================

/// Teste la validité d'une clé API en appelant l'API OpenAI
pub async fn test_api_key(key: &str) -> Result<(), String> {
    use std::time::Duration;

    // Validation format d'abord
    validate_openai_key(key)?;

    // Client HTTP avec timeout
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Erreur création client: {}", e))?;

    // Test avec endpoint /models (léger et rapide)
    let resp = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Timeout: impossible de contacter OpenAI. Vérifiez votre connexion.".to_string()
            } else if e.is_connect() {
                "Impossible de se connecter à OpenAI. Vérifiez votre connexion internet."
                    .to_string()
            } else {
                format!("Erreur réseau: {}", e)
            }
        })?;

    // Analyse du code de statut
    match resp.status() {
        s if s.is_success() => Ok(()),
        reqwest::StatusCode::UNAUTHORIZED => {
            Err("Clé API invalide ou révoquée par OpenAI.".to_string())
        }
        reqwest::StatusCode::FORBIDDEN => {
            Err("Accès refusé. Vérifiez les permissions de votre clé API.".to_string())
        }
        reqwest::StatusCode::TOO_MANY_REQUESTS => Err(
            "Quota dépassé. Attendez quelques minutes ou vérifiez votre plan OpenAI.".to_string(),
        ),
        reqwest::StatusCode::SERVICE_UNAVAILABLE => Err(
            "Service OpenAI temporairement indisponible. Réessayez dans quelques instants."
                .to_string(),
        ),
        status => Err(format!(
            "Erreur API OpenAI: {} - Vérifiez votre clé.",
            status
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_openai_key_valid() {
        assert!(validate_openai_key("sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890").is_ok());
        assert!(
            validate_openai_key("sk-proj-1234567890abcdefghijklmnopqrstuvwxyz1234567890").is_ok()
        );
    }

    #[test]
    fn test_validate_openai_key_invalid_prefix() {
        assert!(validate_openai_key("invalid-key").is_err());
        assert!(validate_openai_key("api-key-123").is_err());
    }

    #[test]
    fn test_validate_openai_key_too_short() {
        assert!(validate_openai_key("sk-short").is_err());
    }

    #[test]
    fn test_validate_openai_key_invalid_chars() {
        assert!(
            validate_openai_key("sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890!@#").is_err()
        );
    }

    #[test]
    fn test_has_api_key() {
        // Should not panic
        let _ = has_api_key();
    }

    #[tokio::test]
    async fn test_api_key_invalid_format() {
        let result = test_api_key("invalid-key").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Format"));
    }

    #[tokio::test]
    async fn test_api_key_short() {
        let result = test_api_key("sk-short").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("courte"));
    }

    // Note: Test avec vraie clé nécessite OPENAI_API_KEY dans env
    #[tokio::test]
    #[ignore] // Ignoré par défaut, run avec: cargo test -- --ignored
    async fn test_api_key_real() {
        if let Ok(key) = std::env::var("OPENAI_API_KEY") {
            let result = test_api_key(&key).await;
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_cache_invalidation() {
        // Invalider cache ne doit pas paniquer
        invalidate_cache();

        // Vérifier que le cache est vide
        if let Ok(cache) = API_KEY_CACHE.read() {
            assert!(cache.is_none());
        }
    }

    #[test]
    fn test_cache_concurrent_reads() {
        use std::thread;

        // Plusieurs threads doivent pouvoir lire simultanément
        let handles: Vec<_> = (0..10)
            .map(|_| {
                thread::spawn(|| {
                    // Lecture du cache (ne panique pas même si vide)
                    let _guard = API_KEY_CACHE.read();
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    // Tests validation multi-providers
    #[test]
    fn test_validate_anthropic_key_valid() {
        assert!(
            validate_anthropic_key("sk-ant-1234567890abcdefghijklmnopqrstuvwxyz1234567890").is_ok()
        );
    }

    #[test]
    fn test_validate_anthropic_key_invalid() {
        assert!(validate_anthropic_key("sk-1234").is_err()); // Mauvais préfixe
        assert!(validate_anthropic_key("sk-ant-short").is_err()); // Trop court
    }

    #[test]
    fn test_validate_custom_key_valid() {
        assert!(validate_custom_key("my-custom-api-key-1234567890").is_ok());
        assert!(validate_custom_key("AIzaSyABC123").is_ok()); // Google-like
    }

    #[test]
    fn test_validate_custom_key_invalid() {
        assert!(validate_custom_key("short").is_err()); // Trop court
    }

    #[test]
    fn test_validate_api_key_router() {
        // OpenAI
        assert!(validate_api_key("sk-proj-1234567890abcdefghijklmnopqrstuvwxyz", "openai").is_ok());

        // Anthropic
        assert!(
            validate_api_key("sk-ant-1234567890abcdefghijklmnopqrstuvwxyz", "anthropic").is_ok()
        );

        // Custom
        assert!(validate_api_key("my-custom-key-123", "custom").is_ok());

        // Provider inconnu
        assert!(validate_api_key("any-key", "unknown").is_err());
    }
}
