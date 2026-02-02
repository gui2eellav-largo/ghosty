use std::sync::Mutex;

pub struct ActivePromptState {
    prompt: Mutex<Option<String>>,
    mode: Mutex<Option<String>>,
}

impl Default for ActivePromptState {
    fn default() -> Self {
        Self {
            prompt: Mutex::new(None),
            mode: Mutex::new(Some("medium".to_string())),
        }
    }
}

impl ActivePromptState {
    pub fn set(&self, prompt: Option<String>) -> Result<(), String> {
        let mut guard = self.prompt.lock().map_err(|e| e.to_string())?;
        *guard = prompt;
        Ok(())
    }

    pub fn get(&self) -> Result<Option<String>, String> {
        let guard = self.prompt.lock().map_err(|e| e.to_string())?;
        Ok(guard.clone())
    }

    pub fn set_mode(&self, mode: Option<String>) -> Result<(), String> {
        let mut guard = self.mode.lock().map_err(|e| e.to_string())?;
        *guard = mode;
        Ok(())
    }

    pub fn get_mode(&self) -> Result<Option<String>, String> {
        let guard = self.mode.lock().map_err(|e| e.to_string())?;
        Ok(guard.clone())
    }
}
