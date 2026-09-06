// Astro/Vite only expose env vars via import.meta.env, not process.env, so @vercel/blob
// (which reads process.env by default) needs the token passed explicitly on every call.
export const blobToken = import.meta.env.BLOB_READ_WRITE_TOKEN
