// The /config payload, with the same keys as pkg/server/config.go returns for
// an unlicensed server (TestConfigContractKeys), minus MAX_FILE_SIZE because
// uploads are disabled. Entermind Pass is secret sharing plus the password
// generator: no uploads, no OIDC, no secret requests, no read receipts.

export const EXPIRATIONS = [3600, 86400, 604800] as const; // 1h, 1d, 1w
export const MAX_MESSAGE_BYTES = 10000; // --max-length default

export const CONFIG = {
  ALLOW_CUSTOM_EXPIRATION: false,
  ARGON2: false,
  DEFAULT_EXPIRY: 3600,
  DEFAULT_ONETIME_SECRETS: true,
  DEFAULT_READ_RECEIPT: false,
  DISABLE_FEATURES: false,
  DISABLE_ONE_CLICK_LINK: false,
  DISABLE_UPLOAD: true,
  FORCE_ONETIME_SECRETS: false,
  MAX_EXPIRATION: 7776000,
  MIN_EXPIRATION: 60,
  NO_LANGUAGE_SWITCHER: false,
  NO_THEME_SWITCHER: false,
  OIDC_ENABLED: false,
  PREFETCH_SECRET: true,
  READ_ONLY: false,
  READ_RECEIPTS: false,
  REQUIRE_AUTH: false,
  SECRET_REQUESTS: false,
  THEME_DARK: 'dim',
  THEME_LIGHT: 'emerald',
} as const;
