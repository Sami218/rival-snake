package com.wormgame;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class LeaderboardService {
    private static final int MAX_ENTRIES = 10;
    private static final String FILE_PATH = "leaderboard.json";

    private final ObjectMapper mapper = new ObjectMapper();
    private final List<ScoreEntry> scores;

    public LeaderboardService() {
        this.scores = loadFromFile();
    }

    public synchronized List<ScoreEntry> getTopScores() {
        return new ArrayList<>(scores);
    }

    public synchronized void addScore(ScoreEntry entry) {
        scores.add(entry);
        scores.sort(Comparator
                .comparingInt(ScoreEntry::getScore).reversed()
                .thenComparingLong(ScoreEntry::getTimestamp));
        if (scores.size() > MAX_ENTRIES) {
            scores.subList(MAX_ENTRIES, scores.size()).clear();
        }
        saveToFile();
    }

    private List<ScoreEntry> loadFromFile() {
        File file = new File(FILE_PATH);
        if (file.exists()) {
            try {
                return mapper.readValue(file, new TypeReference<List<ScoreEntry>>() {});
            } catch (IOException e) {
                System.err.println("Failed to load leaderboard: " + e.getMessage());
            }
        }
        return new ArrayList<>();
    }

    private void saveToFile() {
        try {
            mapper.writerWithDefaultPrettyPrinter()
                    .writeValue(new File(FILE_PATH), scores);
        } catch (IOException e) {
            System.err.println("Failed to save leaderboard: " + e.getMessage());
        }
    }
}
