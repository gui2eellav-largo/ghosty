/// Client HTTP async partagé (connection pooling, timeouts).
use once_cell::sync::Lazy;
use std::time::Duration;

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(2)
        .build()
        .expect("HTTP client init")
});

pub fn client() -> &'static reqwest::Client {
    &HTTP_CLIENT
}
