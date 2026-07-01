export const config = {
  runtime: "edge",
};

const API_HOST =
  process.env.VITE_API_HOST ??
  process.env.SERVER_API_HOST ??
  "discord-checkers-server-2dbcedabcdf8.herokuapp.com";

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.text();
  const upstream = await fetch(`https://${API_HOST}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const responseBody = await upstream.text();

  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
