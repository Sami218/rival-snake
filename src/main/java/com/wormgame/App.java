package com.wormgame;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;

import java.util.Map;

public class App {
    public static void main(String[] args) {
        String envPort = System.getenv("PORT");
        int port = envPort != null ? Integer.parseInt(envPort) :
                   (args.length > 0 ? Integer.parseInt(args[0]) : 8080);
        LeaderboardService leaderboard = new LeaderboardService();

        Javalin app = Javalin.create(config -> {
            config.staticFiles.add("/static", Location.CLASSPATH);
        });

        app.get("/api/leaderboard", ctx -> {
            ctx.json(leaderboard.getTopScores());
        });

        app.post("/api/leaderboard", ctx -> {
            ScoreEntry entry = ctx.bodyAsClass(ScoreEntry.class);

            if (entry.getName() == null || entry.getName().isBlank()) {
                ctx.status(400).json(Map.of("error", "Name is required"));
                return;
            }
            if (entry.getName().length() > 20) {
                entry.setName(entry.getName().substring(0, 20));
            }
            if (entry.getScore() < 0) {
                ctx.status(400).json(Map.of("error", "Invalid score"));
                return;
            }

            entry.setTimestamp(System.currentTimeMillis());
            leaderboard.addScore(entry);
            ctx.json(Map.of("success", true));
        });

        app.start(port);
        System.out.println("Rival Snake running at http://localhost:" + port);
    }
}
