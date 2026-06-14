import type { Handler } from "@netlify/functions";

export function adaptNetlifyHandler(handler: Handler) {
  return {
    async fetch(request: Request) {
      const url = new URL(request.url);
      const headers = Object.fromEntries(request.headers.entries());
      const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
      const response = await handler({
        body, headers, httpMethod: request.method, isBase64Encoded: false, path: url.pathname,
        rawQuery: url.search.slice(1), rawUrl: request.url,
        queryStringParameters: Object.fromEntries(url.searchParams.entries()),
        multiValueQueryStringParameters: {}, multiValueHeaders: {},
      } as any, {} as any);
      if (!response) return new Response(null, { status: 204 });
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers || {})) responseHeaders.set(name, String(value));
      for (const [name, values] of Object.entries(response.multiValueHeaders || {})) {
        for (const value of Array.isArray(values) ? values : [values]) responseHeaders.append(name, String(value));
      }
      const responseBody = response.isBase64Encoded ? Buffer.from(response.body || "", "base64") : response.body;
      return new Response(responseBody, { status: response.statusCode, headers: responseHeaders });
    },
  };
}
