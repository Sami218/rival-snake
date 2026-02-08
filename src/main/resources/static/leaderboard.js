(() => {
    "use strict";

    const scoreBody = document.getElementById("score-body");
    const emptyMsg = document.getElementById("empty-msg");

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    async function loadLeaderboard() {
        try {
            const response = await fetch("/api/leaderboard");
            const scores = await response.json();

            if (scores.length === 0) {
                emptyMsg.style.display = "block";
                return;
            }

            emptyMsg.style.display = "none";
            scoreBody.innerHTML = "";

            scores.forEach((entry, index) => {
                const row = document.createElement("tr");
                row.innerHTML =
                    "<td>" + (index + 1) + ".</td>" +
                    "<td>" + escapeHtml(entry.name) + "</td>" +
                    "<td>" + entry.score + "</td>";
                scoreBody.appendChild(row);
            });
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
            emptyMsg.textContent = "Failed to load scores.";
            emptyMsg.style.display = "block";
        }
    }

    loadLeaderboard();
})();
