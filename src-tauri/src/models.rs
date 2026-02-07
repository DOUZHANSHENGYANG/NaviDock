use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvConfig {
    pub dev_url: String,
    pub prod_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub icon: Option<String>,
    pub env_config: EnvConfig,
    pub category_id: String,
    pub tags: Vec<String>,
    pub status: String,
    pub view_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    #[serde(rename = "type")]
    pub category_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedAppData {
    pub sites: Vec<SiteItem>,
    pub categories: Vec<Category>,
    pub environment: String,
    pub view_mode: String,
    pub theme: String,
    pub language: String,
}
