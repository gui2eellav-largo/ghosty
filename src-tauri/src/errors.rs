/// Erreurs structurées pour le frontend (mapping code + message)
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "code", content = "detail")]
pub enum ApiKeyError {
    InvalidFormat(String),
    Unauthorized,
    #[allow(dead_code)]
    Forbidden,
    NetworkTimeout,
    NetworkError(String),
    QuotaExceeded,
    ServiceUnavailable,
    KeychainError(String),
    KeyNotFound,
    UnknownProvider(String),
    Unknown(String),
}

impl ApiKeyError {
    pub fn message(&self) -> String {
        match self {
            ApiKeyError::InvalidFormat(d) => d.clone(),
            ApiKeyError::Unauthorized => "Clé API invalide ou révoquée.".to_string(),
            ApiKeyError::Forbidden => {
                "Accès refusé. Vérifiez les permissions de votre clé.".to_string()
            }
            ApiKeyError::NetworkTimeout => {
                "Timeout: impossible de contacter le service. Vérifiez votre connexion.".to_string()
            }
            ApiKeyError::NetworkError(d) => d.clone(),
            ApiKeyError::QuotaExceeded => {
                "Quota dépassé. Attendez quelques minutes ou vérifiez votre plan.".to_string()
            }
            ApiKeyError::ServiceUnavailable => {
                "Service temporairement indisponible. Réessayez dans quelques instants.".to_string()
            }
            ApiKeyError::KeychainError(d) => d.clone(),
            ApiKeyError::KeyNotFound => "Clé introuvable.".to_string(),
            ApiKeyError::UnknownProvider(d) => d.clone(),
            ApiKeyError::Unknown(d) => d.clone(),
        }
    }
}

impl std::fmt::Display for ApiKeyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

impl std::error::Error for ApiKeyError {}

/// Parse une erreur String du backend en ApiKeyError pour le frontend
pub fn parse_api_key_error(s: &str) -> ApiKeyError {
    let s_lower = s.to_lowercase();
    if s_lower.contains("format")
        || s_lower.contains("invalide")
        || s_lower.contains("courte")
        || s_lower.contains("caractères")
    {
        ApiKeyError::InvalidFormat(s.to_string())
    } else if s_lower.contains("révoquée") || s_lower.contains("invalid") && s_lower.contains("key")
    {
        ApiKeyError::Unauthorized
    } else if s_lower.contains("timeout") || s_lower.contains("impossible de contacter") {
        ApiKeyError::NetworkTimeout
    } else if s_lower.contains("connexion") || s_lower.contains("réseau") {
        ApiKeyError::NetworkError(s.to_string())
    } else if s_lower.contains("quota") || s_lower.contains("dépassé") {
        ApiKeyError::QuotaExceeded
    } else if s_lower.contains("indisponible") {
        ApiKeyError::ServiceUnavailable
    } else if s_lower.contains("keychain") || s_lower.contains("stockage") {
        ApiKeyError::KeychainError(s.to_string())
    } else if s_lower.contains("introuvable") {
        ApiKeyError::KeyNotFound
    } else if s_lower.contains("provider") || s_lower.contains("inconnu") {
        ApiKeyError::UnknownProvider(s.to_string())
    } else {
        ApiKeyError::Unknown(s.to_string())
    }
}
