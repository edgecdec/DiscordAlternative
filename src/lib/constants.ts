export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-zA-Z0-9]+$/;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
export const SERVER_NAME_MIN = 1;
export const SERVER_NAME_MAX = 50;
export const CHANNEL_NAME_MIN = 1;
export const CHANNEL_NAME_MAX = 50;
export const CATEGORY_NAME_MIN = 1;
export const CATEGORY_NAME_MAX = 50;
export const MESSAGE_MAX = 2000;
export const FILE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_URL_MAX = 512;
export const MESSAGES_PER_PAGE = 50;
export const BCRYPT_ROUNDS = 10;
export const SLOW_MODE_MAX_SECONDS = 300;

export const EMOJI_NAME_MIN = 2;
export const EMOJI_NAME_MAX = 32;
export const EMOJI_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const EMOJI_MAX_BYTES = 256 * 1024;

export const USER_STATUSES = ["online", "away", "dnd", "offline"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
