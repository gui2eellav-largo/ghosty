# 🔑 PLAN D'AMÉLIORATION : GESTION DES CLÉS API

**Version actuelle** : 0.2.0  
**Score** : 7/10  
**Target** : 9/10  
**Durée** : 4 semaines

---

## 🎯 OBJECTIFS

1. ✅ Valider clé avant enregistrement (test connexion)
2. ✅ Améliorer feedback utilisateur (progression)
3. ✅ Optimiser performance (cache)
4. ✅ Structurer gestion erreurs
5. ✅ Ajouter tracking usage/coûts

---

## 📋 BACKLOG PRIORITISÉ

### 🔴 PHASE 1 : Critiques (Semaine 1)

#### **TASK-001 : Test Connexion API**
**Priorité** : 🔴 CRITIQUE  
**Estimation** : 4h  
**Assigné** : Backend

**Description** :
Ajouter fonction `test_openai_key()` qui valide la clé en appelant l'API OpenAI.

**Implémentation** :
```rust
// src-tauri/src/secrets.rs
#[tauri::command]
pub async fn test_openai_key(key: String) -> Result<(), String> {
    validate_openai_key(&key)?;
    
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    
    let resp = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| format!("Connexion impossible: {}", e))?;
    
    match resp.status() {
        s if s.is_success() => Ok(()),
        reqwest::StatusCode::UNAUTHORIZED => 
            Err("Clé invalide ou révoquée".to_string()),
        reqwest::StatusCode::TOO_MANY_REQUESTS => 
            Err("Quota dépassé".to_string()),
        _ => Err(format!("Erreur API: {}", resp.status()))
    }
}
```

**Frontend** :
```typescript
const handleSaveApiKey = async () => {
  setApiKeySaveStatus("testing");
  
  try {
    await invoke('test_openai_key', { key: apiKey.trim() });
    setApiKeySaveStatus("saving");
    await invoke('set_openai_key', { key: apiKey.trim() });
    setApiKeySaveStatus("success");
  } catch (error) {
    setApiKeySaveStatus("error");
    setError(error as string);
  }
};
```

**Tests** :
```rust
#[tokio::test]
async fn test_valid_key() {
    let result = test_openai_key("sk-valid-key".to_string()).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_invalid_key() {
    let result = test_openai_key("sk-invalid".to_string()).await;
    assert!(result.is_err());
}
```

**Acceptation** :
- [ ] Clé valide → Success
- [ ] Clé invalide → Erreur claire
- [ ] Timeout 10s
- [ ] Feedback progressif UI

---

#### **TASK-002 : Validation Frontend**
**Priorité** : 🔴 CRITIQUE  
**Estimation** : 2h  
**Assigné** : Frontend

**Description** :
Valider format clé côté client avant envoi backend.

**Implémentation** :
```typescript
// src/lib/validation.ts
export const validateApiKey = (key: string): string | null => {
  const trimmed = key.trim();
  
  if (!trimmed) {
    return "Clé requise";
  }
  
  if (!trimmed.startsWith('sk-') && !trimmed.startsWith('sk-proj-')) {
    return "Format invalide: doit commencer par 'sk-' ou 'sk-proj-'";
  }
  
  if (trimmed.length < 40) {
    return "Clé trop courte (minimum 40 caractères)";
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return "Caractères invalides détectés";
  }
  
  return null;
};
```

**UI Update** :
```typescript
const [validationError, setValidationError] = useState<string | null>(null);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setApiKey(value);
  
  if (value.length > 5) {
    const error = validateApiKey(value);
    setValidationError(error);
  }
};

// Dans le JSX
{validationError && (
  <p className="text-xs text-red-500 mt-1">
    {validationError}
  </p>
)}
```

**Tests** :
```typescript
describe('validateApiKey', () => {
  it('accepts valid key', () => {
    expect(validateApiKey('sk-1234567890abcd...')).toBeNull();
  });
  
  it('rejects short key', () => {
    expect(validateApiKey('sk-short')).toContain('trop courte');
  });
  
  it('rejects invalid prefix', () => {
    expect(validateApiKey('invalid-key')).toContain('Format invalide');
  });
});
```

**Acceptation** :
- [ ] Validation temps réel
- [ ] Messages d'erreur clairs
- [ ] Pas d'envoi backend si invalide
- [ ] Tests unitaires passants

---

#### **TASK-003 : Cache API Key**
**Priorité** : 🟡 HAUTE  
**Estimation** : 3h  
**Assigné** : Backend

**Description** :
Implémenter cache en mémoire pour éviter I/O keychain répétés.

**Implémentation** :
```rust
// src-tauri/src/secrets.rs
use std::sync::{Arc, RwLock};
use once_cell::sync::Lazy;

static API_KEY_CACHE: Lazy<Arc<RwLock<Option<String>>>> = 
    Lazy::new(|| Arc::new(RwLock::new(None)));

pub fn get_api_key_cached() -> Result<String, String> {
    // Essayer cache
    if let Ok(cache) = API_KEY_CACHE.read() {
        if let Some(ref key) = *cache {
            return Ok(key.clone());
        }
    }
    
    // Charger depuis keychain
    let key = get_api_key()?;
    
    // Mettre en cache
    if let Ok(mut cache) = API_KEY_CACHE.write() {
        *cache = Some(key.clone());
    }
    
    Ok(key)
}

pub fn invalidate_cache() {
    if let Ok(mut cache) = API_KEY_CACHE.write() {
        *cache = None;
    }
}

// Mettre à jour set_api_key pour invalider cache
pub fn set_api_key(key: String) -> Result<(), String> {
    // ... existing code ...
    invalidate_cache();
    Ok(())
}
```

**Usage** :
```rust
// transcribe.rs & llm.rs
let api_key = crate::secrets::get_api_key_cached()?;
```

**Tests** :
```rust
#[test]
fn test_cache_performance() {
    let start = Instant::now();
    let _ = get_api_key_cached();
    let first_call = start.elapsed();
    
    let start = Instant::now();
    let _ = get_api_key_cached();
    let cached_call = start.elapsed();
    
    assert!(cached_call < first_call / 5);
}
```

**Acceptation** :
- [ ] Performance x10 sur appels répétés
- [ ] Cache invalidé au set/delete
- [ ] Thread-safe (RwLock)
- [ ] Benchmarks validés

---

### 🟡 PHASE 2 : UX (Semaines 2-3)

#### **TASK-004 : États Progressifs**
**Priorité** : 🟡 MOYENNE  
**Estimation** : 4h

**États** :
- `idle` : Aucune opération
- `validating` : Validation format
- `testing` : Test connexion API
- `saving` : Enregistrement keychain
- `success` : Opération réussie
- `error` : Échec

**UI** :
```typescript
{apiKeySaveStatus === "validating" && <Spinner text="Validation..." />}
{apiKeySaveStatus === "testing" && <Spinner text="Test connexion..." />}
{apiKeySaveStatus === "saving" && <Spinner text="Enregistrement..." />}
```

---

#### **TASK-005 : Gestion Erreurs Structurée**
**Priorité** : 🟡 MOYENNE  
**Estimation** : 5h

**Types** :
```rust
#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum ApiKeyError {
    InvalidFormat(String),
    KeychainDenied,
    NetworkTimeout,
    Unauthorized,
    QuotaExceeded,
}
```

---

#### **TASK-006 : Logging & Audit**
**Priorité** : 🟡 MOYENNE  
**Estimation** : 3h

**Logs** :
```rust
log::info!("API key configuration started");
log::info!("API key validation successful");
log::warn!("API key test failed: {}", error);
log::info!("API key saved to keychain");
```

---

### 🟢 PHASE 3 : Features Avancées (Semaine 4)

#### **TASK-007 : Usage Tracking**
**Priorité** : 🟢 BASSE  
**Estimation** : 12h

**Métriques** :
- Nombre de requêtes
- Tokens utilisés
- Coût estimé
- Reset mensuel

**UI** :
```tsx
<div className="stats">
  <Stat label="Requêtes ce mois" value={usage.requests} />
  <Stat label="Tokens" value={usage.tokens.toLocaleString()} />
  <Stat label="Coût estimé" value={`$${usage.cost.toFixed(2)}`} />
</div>
```

---

#### **TASK-008 : Multi-Keys**
**Priorité** : 🟢 BASSE  
**Estimation** : 16h

**Config** :
```rust
struct ApiKeyConfig {
  primary: String,
  backup: Option<String>,
  auto_rotate_on_quota: bool,
}
```

---

## 📊 MÉTRIQUES SUCCÈS

| Métrique | Avant | Target | Mesure |
|----------|-------|--------|--------|
| **Échecs config** | 30% | <5% | Analytics |
| **Latency get_key** | 10ms | <1ms | Benchmark |
| **Satisfaction UX** | 7/10 | 9/10 | Survey |
| **Support tickets** | 15/mois | <3/mois | Zendesk |

---

## 🔬 TESTS DE VALIDATION

### Test 1 : Configuration Happy Path
```
1. Ouvrir Settings
2. Coller clé valide
3. Observer: "Testing..." → "Saving..." → "Success"
4. Vérifier: keychain contient la clé
5. Vérifier: has_openai_key() = true
```

### Test 2 : Clé Invalide
```
1. Coller clé format invalide
2. Observer: Erreur immédiate (frontend)
3. Coller clé valide format mais révoquée
4. Observer: "Testing..." → "Error: Clé invalide"
5. Vérifier: Pas d'enregistrement keychain
```

### Test 3 : Performance Cache
```
1. Enregistrer 100 transcriptions consécutives
2. Mesurer latency get_api_key()
3. Vérifier: <1ms après 1ère call
```

---

## 📅 TIMELINE

**Semaine 1** : TASK-001, 002, 003 (Critiques)  
**Semaine 2** : TASK-004, 005 (UX)  
**Semaine 3** : TASK-006, Tests  
**Semaine 4** : TASK-007, 008 (Nice-to-have)

**Release** : v0.3.0 avec score 9/10

---

## 🔗 LIENS

- **Documentation** : `docs/API_KEY_MANAGEMENT.md`
- **Tests** : `src-tauri/tests/secrets_tests.rs`
- **Issues** : GitHub #15, #22, #38
