export async function GET(
  _: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const { policyId } = await params;

  const upstreamUrl = `${process.env.NEXT_PUBLIC_MASTRA_URL}/proxy/documents/${policyId}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    // Avoid caching and ensure we proxy fresh content
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_MASTRA_BEARER_TOKEN}`,
    },
  });

  if (!upstreamResponse.ok) {
    const errorBody = await upstreamResponse.text().catch(() => "");
    return new Response(errorBody || "Upstream request failed", {
      status: upstreamResponse.status,
    });
  }

  // Pass through important headers without exposing the upstream URL
  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
    "etag",
    "last-modified",
  ];

  for (const key of passthroughHeaders) {
    const value = upstreamResponse.headers.get(key);
    if (value) headers.set(key, value);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
