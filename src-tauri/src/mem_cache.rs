use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

pub struct Cache(Mutex<HashMap<String, String>>);

impl Cache {
    pub fn new() -> Self {
        Cache(Mutex::new(HashMap::new()))
    }

    pub fn get(&self, key: &str) -> Option<String> {
        self.0.lock().unwrap().get(key).cloned()
    }

    pub fn set(&self, key: String, value: String) {
        self.0.lock().unwrap().insert(key, value);
    }

    pub fn remove(&self, key: &str) {
        self.0.lock().unwrap().remove(key);
    }

    // pub fn clear(&self) {
    //     self.0.lock().unwrap().clear();
    // }
}

// Tauri Commands
#[tauri::command]
pub fn mem_cache_get(cache: State<'_, Cache>, key: String) -> Option<String> {
    cache.get(&key)
}

#[tauri::command]
pub fn mem_cache_set(cache: State<'_, Cache>, key: String, value: String) {
    cache.set(key, value);
}

#[tauri::command]
pub fn mem_cache_remove(cache: State<'_, Cache>, key: String) {
    cache.remove(&key);
}
