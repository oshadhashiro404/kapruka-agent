/** API base URL — empty string = same-origin Next.js routes on Vercel/local :3000 */
export function getApiBase(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!url) return "";
  return url.replace(/\/$/, "");
}
