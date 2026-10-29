
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

export async function onRequestGet({ env }) {
  try {
    if (!env.LEADERBOARD_DB) {
      return Response.json(
        { error: "D1 binding LEADERBOARD_DB missing" },
        { status: 500, headers }
      );
    }

    const result = await env.LEADERBOARD_DB
      .prepare(
        `SELECT player_name, score, created_at
         FROM runner_scores
         ORDER BY score DESC
         LIMIT 10`
      )
      .all();

    return Response.json(
      { leaderboard: result.results },
      { headers }
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return Response.json(
      { error: "Unable to load leaderboard" },
      { status: 500, headers }
    );
  }
}
