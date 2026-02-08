(() => {
    "use strict";

    // --- Constants ---
    const COLS = 20;
    const ROWS = 20;
    const CELL = 20; // px per cell
    const TICK_MS = 150;

    // Modern palette
    const COLOR_BG = "#ffffff";
    const COLOR_SNAKE = "#2563eb"; // Blue for player
    const COLOR_FOOD = "#16a34a"; // Green food
    const COLOR_GRID = "#f0f0f0";
    const COLOR_AI = "#dc2626"; // Red for AI

    // --- DOM ---
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const messageEl = document.getElementById("message");
    const nameModal = document.getElementById("name-modal");
    const modalScoreEl = document.getElementById("modal-score");
    const playerNameInput = document.getElementById("player-name");
    const submitScoreBtn = document.getElementById("submit-score-btn");
    const skipScoreBtn = document.getElementById("skip-score-btn");

    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;

    // --- State ---
    const State = { WAITING: 0, PLAYING: 1, GAME_OVER: 2, ENTERING_NAME: 3 };
    let state = State.WAITING;
    let snake = [];
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let food = { x: 0, y: 0 };
    let score = 0;
    let pointsPerFood = 1;
    let loopId = null;

    // --- AI State ---
    let aiSnake = [];
    let aiDirection = { x: 1, y: 0 };
    let aiAlive = false;
    let aiRespawnPending = false;
    const AI_INITIAL_LENGTH = 3;

    // --- Helpers ---
    function resetGame() {
        const startX = Math.floor(COLS / 2);
        const startY = Math.floor(ROWS / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        pointsPerFood = 1;
        scoreEl.textContent = "Score: 0";
        placeFood();

        // Initialize AI
        aiSnake = [];
        aiAlive = false;
        aiRespawnPending = false;
        spawnAi();
    }

    function placeFood() {
        let attempts = 0;
        do {
            food.x = Math.floor(Math.random() * COLS);
            food.y = Math.floor(Math.random() * ROWS);
            attempts++;
        } while (
            (snake.some(s => s.x === food.x && s.y === food.y) ||
             (aiAlive && aiSnake.some(s => s.x === food.x && s.y === food.y))) &&
            attempts < 1000
        );
    }

    function collides(x, y) {
        // Wall collision
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
        // Self collision (skip head)
        return snake.some((s, i) => i > 0 && s.x === x && s.y === y);
    }

    // --- AI Functions ---
    function spawnAi() {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 200) {
            attempts++;
            const hx = Math.floor(Math.random() * (COLS - 4)) + 2;
            const hy = Math.floor(Math.random() * (ROWS - 4)) + 2;

            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];

            const candidate = [];
            for (let i = 0; i < AI_INITIAL_LENGTH; i++) {
                candidate.push({ x: hx - dir.x * i, y: hy - dir.y * i });
            }

            const valid = candidate.every(seg =>
                seg.x >= 0 && seg.x < COLS &&
                seg.y >= 0 && seg.y < ROWS &&
                !snake.some(s => s.x === seg.x && s.y === seg.y) &&
                !(seg.x === food.x && seg.y === food.y)
            );

            if (valid) {
                aiSnake = candidate;
                aiDirection = { ...dir };
                aiAlive = true;
                aiRespawnPending = false;
                placed = true;
            }
        }

        if (!placed) {
            aiRespawnPending = true;
        }
    }

    function killAi() {
        aiSnake = [];
        aiAlive = false;
        aiRespawnPending = true;
    }

    function aiChooseDirection() {
        const head = aiSnake[0];

        const allDirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        // Filter out 180-degree reverse
        const possibleDirs = allDirs.filter(d =>
            !(d.x === -aiDirection.x && d.y === -aiDirection.y)
        );

        function isSafe(x, y) {
            if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
            if (aiSnake.some((s, i) => i > 0 && s.x === x && s.y === y)) return false;
            if (snake.some(s => s.x === x && s.y === y)) return false;
            return true;
        }

        function distToFood(x, y) {
            return Math.abs(x - food.x) + Math.abs(y - food.y);
        }

        const safeDirs = possibleDirs.filter(d => isSafe(head.x + d.x, head.y + d.y));

        if (safeDirs.length === 0) {
            return aiDirection;
        }

        safeDirs.sort((a, b) => {
            const da = distToFood(head.x + a.x, head.y + a.y);
            const db = distToFood(head.x + b.x, head.y + b.y);
            return da - db;
        });

        return safeDirs[0];
    }

    function updateAi() {
        if (!aiAlive) return;

        aiDirection = aiChooseDirection();

        const head = aiSnake[0];
        const newHead = { x: head.x + aiDirection.x, y: head.y + aiDirection.y };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
            killAi();
            return;
        }

        // AI self-collision
        if (aiSnake.some((s, i) => i > 0 && s.x === newHead.x && s.y === newHead.y)) {
            killAi();
            return;
        }

        // AI hits player snake
        if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            killAi();
            return;
        }

        aiSnake.unshift(newHead);

        // AI eats food (grows, but no score for player)
        if (newHead.x === food.x && newHead.y === food.y) {
            placeFood();
        } else {
            aiSnake.pop();
        }
    }

    // --- Name Modal ---
    function showNameModal() {
        modalScoreEl.textContent = "Score: " + score;
        playerNameInput.value = "";
        nameModal.style.display = "flex";
        playerNameInput.focus();
        messageEl.textContent = "";
    }

    function setMessageWithLink(prefix, linkText) {
        messageEl.innerHTML = prefix + ' <a href="#" id="start-link">' + linkText + '</a>';
        const link = document.getElementById("start-link");
        if (link) {
            link.addEventListener("click", function(e) {
                e.preventDefault();
                if (state === State.WAITING || state === State.GAME_OVER) {
                    startGame();
                }
            });
        }
    }

    function hideNameModal() {
        nameModal.style.display = "none";
        state = State.GAME_OVER;
        setMessageWithLink("GAME OVER - Press SPACE or", "tap here to restart");
    }

    async function submitScore(name) {
        if (!name || !name.trim()) {
            name = "Anonymous";
        }
        try {
            await fetch("/api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), score: score })
            });
        } catch (err) {
            console.error("Failed to submit score:", err);
        }
        window.location.href = "leaderboard.html";
    }

    submitScoreBtn.addEventListener("click", () => {
        submitScore(playerNameInput.value);
    });

    skipScoreBtn.addEventListener("click", () => {
        hideNameModal();
    });

    playerNameInput.addEventListener("keydown", (e) => {
        e.stopPropagation(); // Prevent game controls from firing while typing
        if (e.code === "Enter") {
            submitScore(playerNameInput.value);
        }
    });

    // --- Update ---
    function update() {
        direction = { ...nextDirection };

        const head = snake[0];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };

        // Player hits wall or self
        if (collides(newHead.x, newHead.y)) {
            state = State.ENTERING_NAME;
            clearInterval(loopId);
            loopId = null;
            showNameModal();
            return;
        }

        // Player hits AI worm → GAME OVER
        if (aiAlive && aiSnake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            state = State.ENTERING_NAME;
            clearInterval(loopId);
            loopId = null;
            showNameModal();
            return;
        }

        snake.unshift(newHead);

        if (newHead.x === food.x && newHead.y === food.y) {
            score += pointsPerFood;
            pointsPerFood += 1;
            scoreEl.textContent = "Score: " + score;
            placeFood();

            // Respawn AI if pending
            if (aiRespawnPending) {
                spawnAi();
            }
        } else {
            snake.pop();
        }

        // Update AI after player
        updateAi();
    }

    // --- Draw ---
    function draw() {
        // Background
        ctx.fillStyle = COLOR_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle grid
        ctx.strokeStyle = COLOR_GRID;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL, 0);
            ctx.lineTo(x * CELL, ROWS * CELL);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL);
            ctx.lineTo(COLS * CELL, y * CELL);
            ctx.stroke();
        }

        // Player Snake
        ctx.fillStyle = COLOR_SNAKE;
        snake.forEach((seg, i) => {
            const pad = i === 0 ? 1 : 2;
            ctx.fillRect(
                seg.x * CELL + pad,
                seg.y * CELL + pad,
                CELL - pad * 2,
                CELL - pad * 2
            );
        });

        // AI Snake
        if (aiAlive) {
            ctx.fillStyle = COLOR_AI;
            aiSnake.forEach((seg, i) => {
                const pad = i === 0 ? 1 : 2;
                ctx.fillRect(
                    seg.x * CELL + pad,
                    seg.y * CELL + pad,
                    CELL - pad * 2,
                    CELL - pad * 2
                );
            });
        }

        // Food
        ctx.fillStyle = COLOR_FOOD;
        const fx = food.x * CELL + CELL / 2;
        const fy = food.y * CELL + CELL / 2;
        ctx.beginPath();
        ctx.arc(fx, fy, CELL / 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- Game loop ---
    function tick() {
        update();
        draw();
    }

    function startGame() {
        resetGame();
        state = State.PLAYING;
        messageEl.textContent = "";
        draw();
        loopId = setInterval(tick, TICK_MS);
    }

    // --- Input ---
    document.addEventListener("keydown", (e) => {
        // Block all game keys during name entry
        if (state === State.ENTERING_NAME) return;

        // Start / restart
        if (e.code === "Space") {
            e.preventDefault();
            if (state === State.WAITING || state === State.GAME_OVER) {
                startGame();
                return;
            }
        }

        if (state !== State.PLAYING) return;

        // Check against nextDirection to prevent 180° reversal on rapid key presses
        switch (e.code) {
            case "ArrowUp":
            case "KeyW":
                if (nextDirection.y === 0) nextDirection = { x: 0, y: -1 };
                break;
            case "ArrowDown":
            case "KeyS":
                if (nextDirection.y === 0) nextDirection = { x: 0, y: 1 };
                break;
            case "ArrowLeft":
            case "KeyA":
                if (nextDirection.x === 0) nextDirection = { x: -1, y: 0 };
                break;
            case "ArrowRight":
            case "KeyD":
                if (nextDirection.x === 0) nextDirection = { x: 1, y: 0 };
                break;
        }

        // Prevent page scrolling with arrow keys
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
        }
    });

    // --- Touch / Click direction control ---
    function handleCanvasTap(e) {
        if (state === State.ENTERING_NAME) return;

        if (state === State.WAITING || state === State.GAME_OVER) {
            if (e.type === "touchstart") e.preventDefault();
            startGame();
            return;
        }

        if (state !== State.PLAYING) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.type === "touchstart") {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const tapCol = canvasX / CELL;
        const tapRow = canvasY / CELL;

        const head = snake[0];
        const dx = tapCol - (head.x + 0.5);
        const dy = tapRow - (head.y + 0.5);

        let newDir;
        if (Math.abs(dx) > Math.abs(dy)) {
            newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        } else {
            newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }

        // Check against nextDirection (not direction) to prevent 180° reversal
        // when tapping twice quickly between ticks
        if (newDir.x !== 0 && nextDirection.x === 0) {
            nextDirection = newDir;
        } else if (newDir.y !== 0 && nextDirection.y === 0) {
            nextDirection = newDir;
        }
    }

    canvas.addEventListener("touchstart", handleCanvasTap, { passive: false });
    canvas.addEventListener("click", handleCanvasTap);

    // --- Initial draw ---
    resetGame();
    draw();
    setMessageWithLink("Press SPACE or", "tap here to start");
})();
