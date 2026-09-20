declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    RUNTIME_ENV?: string;
    RT_DEV_AUTH?: string;
    RT_DEV_USER_ID?: string;
    RT_DEV_EXTERNAL_ID?: string;
    RT_DEV_USER_EMAIL?: string;
    RT_DEV_USER_NAME?: string;
    RT_DEV_USER_ROLE?: string;
  }
}
