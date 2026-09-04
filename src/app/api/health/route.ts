export function GET() {
  return Response.json({
    ok: true,
    service: "understory",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? "local",
  });
}
