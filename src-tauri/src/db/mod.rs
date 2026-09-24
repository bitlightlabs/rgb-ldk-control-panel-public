use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;
use tauri::AppHandle;

use crate::app_dirs;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        let data_dir = app_dirs::data_dir()?;

        fs::create_dir_all(&data_dir)?;

        let db_path = data_dir.join("app.db");
        let conn = Connection::open(db_path).map_err(|e| format!("Open db failed: {e}"))?;

        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| format!("Set WAL failed: {e}"))?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<(), String> {
        let conn = self.conn.lock()?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS todos (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id     TEXT NOT NULL,
                order_id    TEXT NOT NULL,
                type        TEXT NOT NULL,
                bolt11_invoice TEXT,
                onchain_address TEXT,
                order_total TEXT NOT NULL,
                asset_id TEXT NOT NULL,
                asset_amount INTEGER NOT NULL,
                asset_precision INTEGER NOT NULL
            );
            ",
        )?;

        Ok(())
    }
}

