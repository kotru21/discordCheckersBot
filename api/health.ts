export const config = {
  runtime: "edge",
};

const API_HOST =
  process.env.VITE_API_HOST ??
  process.env.SERVER_API_HOST ??
  "discord-checkers-server-2dbcedabcdf8.herokuapp.com";

export default async function handler(request: Request): Promise<Response> {
  const upstream = await fetch(`https://${API_HOST}/api/health`);
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
