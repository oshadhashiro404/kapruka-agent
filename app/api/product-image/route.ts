import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const ALLOWED_HOSTS = ["www.kapruka.com", "kapruka.com", "partnercentral.kapruka.com"];
const UPSTREAM_TIMEOUT_MS = 12_000;

const imageCache = new Map<
  string,
  { body: ArrayBuffer; contentType: string; expiresAt: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function isAllowedKaprukaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith(".kapruka.com")
    );
  } catch {
    return false;
  }
}

async function fetchUpstream(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.kapruka.com/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "force-cache",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Proxy Kapruka product images (CDN requires Referer from kapruka.com). */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw || !isAllowedKaprukaUrl(raw)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const cached = imageCache.get(raw);
  if (cached && Date.now() < cached.expiresAt) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  try {
    const upstream = await fetchUpstream(raw);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.startsWith("image/")
        ? (upstream.headers.get("content-type") as string)
        : "image/jpeg";
    const body = await upstream.arrayBuffer();

    if (body.byteLength > 0) {
      imageCache.set(raw, {
        body,
        contentType,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Image fetch timed out" : "Failed to fetch image" },
      { status: 504 }
    );
  }
}
