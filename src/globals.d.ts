/**
 * Hai gia tri duoc Vite nhung thang vao code luc build (xem `define` trong
 * vite.config.ts), khong phai bien chay luc runtime.
 */

/** So phien ban lay tu package.json, vi du "1.1.0". */
declare const __APP_VERSION__: string

/** Thoi diem build, dang ISO. Dung de biet ban dang chay la ban nao. */
declare const __BUILD_TIME__: string
