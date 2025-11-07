// --- UPDATED ---
// Wrap the entire require call in a setTimeout to prevent 'multipleDefine' error
// by ensuring all other scripts have loaded and registered themselves first.
setTimeout(() => {
    require([
        "esri/Map",
        "esri/WebMap",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/geometryEngine",
        // "esri/core/promiseUtils" // <-- REMOVED
    ], (Map, WebMap, MapView, GraphicsLayer, Graphic, geometryEngine) => {
        // <-- REMOVED promiseUtils

        // --- DOM Elements ---
        const $ = (id) => document.getElementById(id);
        const panels = {
            start: $("start-panel"),
            loading: $("loading-panel"),
            game: $("game-panel"),
            confirm: $("confirm-panel"),
            roundResult: $("round-result-panel"),
            gameOver: $("game-over-panel"),
            shareModal: $("share-modal"),
        };
        const buttons = {
            langToggle: $("lang-toggle"),
            start: $("start-button"),
            confirm: $("confirm-button"),
            next: $("next-button"),
            playAgain: $("play-again-button"),
            share: $("share-button"),
            closeModal: $("close-modal-button"),
        };
        // --- NEW: Image elements ---
        const imageElements = {
            container: $("landmark-image-container"),
            image: $("landmark-image"),
            spinner: $("image-spinner"),
        };

        // --- Translations ---
        const translations = {
            en: {
                langToggle: "العربية",
                welcomeTitle: "Welcome to the Landmark Locator!",
                welcomeDesc:
                    "Test your knowledge of Dubai! We'll show you the name and a picture of a landmark, and you have to click on the map where you think it is.<br><br>- Find it (or < 500m away): <strong>+10 points</strong><br>- 500m - 999m away: <strong>+9 points</strong><br>- 1000m - 1499m away: <strong>+8 points</strong>... etc. down to 0.", // <-- UPDATED TEXT
                startButton: "Start Game",
                loadingText: "Loading Landmarks...",
                findLandmarkText: "Find this landmark:",
                scoreDisplay: "Score: {score}",
                roundDisplay: "Round {current} / {total}",
                confirmButton: "Confirm Guess",
                correctTitle: "Correct!",
                correctMessage:
                    "Well done! You earned <strong>+10 points</strong>.",
                incorrectTitle: "Oh, so close!",
                incorrectMessage:
                    "You were <strong>{distance}m</strong> away. You earned <strong>{roundScore} points</strong>. Here's the correct location.", // <-- Text is now correct for new logic
                nextButton: "Next Landmark",
                gameOverButton: "Show Results",
                gameOverTitle: "Game Over!",
                finalScoreText: "Here are your results:",
                totalScoreLabel: "Total Score",
                accuracyLabel: "Accuracy",
                playAgainButton: "Play Again",
                shareButton: "Share Results",
                shareCardTitle: "My Landmark Score!",
                shareCardScoreLabel: "Total Score",
                shareCardAccuracyLabel: "Accuracy",
                shareModalTitle: "Share Your Results!",
                shareModalDesc:
                    "Right-click or long-press the image to save and share it.",
                webMapError: "Could not load the web map. Please check the ID.",
                layerError:
                    "Could not find the 'Dubai Landmarks' layer in the web map.", // <-- FIXED TYPO
            },
            // --- ADDED ARABIC TRANSLATIONS (from previous merge) ---
            ar: {
                langToggle: "English",
                welcomeTitle: "أهلاً بك في لعبة تحديد المواقع!",
                welcomeDesc:
                    "اختبر معرفتك بمعالم دبي! سنعرض لك اسم وصورة معلم وعليك النقر على الخريطة حيث تعتقد أنه يقع.<br><br>- إجابة صحيحة (أو < 500م): <strong>+10 نقاط</strong><br>- 500م - 999م: <strong>+9 نقاط</strong><br>- 1000م - 1499م: <strong>+8 نقاط</strong>... إلخ.", // <-- UPDATED TEXT
                startButton: "ابدأ اللعبة",
                loadingText: "جاري تحميل المعالم...",
                findLandmarkText: "ابحث عن هذا المعلم:",
                scoreDisplay: "النتيجة: {score}",
                roundDisplay: "الجولة {current} / {total}",
                confirmButton: "تأكيد الإجابة",
                correctTitle: "إجابة صحيحة!",
                correctMessage: "أحسنت! لقد ربحت <strong>+10 نقاط</strong>.",
                incorrectTitle: "أوه, قريبة جداً!",
                incorrectMessage:
                    "كنت بعيداً مسافة <strong>{distance}م</strong>. لقد ربحت <strong>{roundScore} نقاط</strong>. هذا هو الموقع الصحيح.", // <-- Text is now correct for new logic
                nextButton: "المعلم التالي",
                gameOverButton: "أظهر النتائج",
                gameOverTitle: "انتهت اللعبة!",
                finalScoreText: "ها هي نتيجتك:",
                totalScoreLabel: "النتيجة الإجمالية",
                accuracyLabel: "الدقة",
                playAgainButton: "العب مجدداً",
                shareButton: "شارك النتيجة",
                shareCardTitle: "نتيجتي في لعبة المعالم!",
                shareCardScoreLabel: "النتيجة الإجمالية",
                shareCardAccuracyLabel: "الدقة",
                shareModalTitle: "شارك نتيجتك!",
                shareModalDesc:
                    "انقر بزر الماوس الأيمن أو اضغط مطولاً على الصورة لحفظها ومشاركتها.",
                webMapError:
                    "لم نتمكن من تحميل الخريطة. يرجى التحقق من المعرف.",
                layerError:
                    "لم نتمكن من العثور على طبقة 'Dubai Landmarks' في الخريطة.", // <-- FIXED TYPO
            },
        };

        // --- Game State ---
        let currentLanguage = "en";
        let gameState = "LOADING"; // START, LOADING, PLAYING, ROUND_RESULT, GAME_OVER
        let allLandmarks = [];
        let currentLandmarkIndex = 0;
        let totalScore = 0;
        let accuracyTracker = []; // 1 for correct, 0 for incorrect
        let clickedPoint = null;
        let map, view, webmap, landmarksLayer, graphicsLayer;
        let mapClickHandler = null;

        // Graphics Symbols
        const clickSymbol = {
            type: "simple-marker",
            style: "x",
            color: [226, 119, 40], // Orange
            outline: {
                color: "red",
                width: 3,
            },
            size: 15,
        };

        const correctSymbol = {
            type: "simple-fill",
            color: [50, 205, 50, 0.3], // Translucent green
            outline: {
                color: "white",
                width: 2,
            }, // <-- SYNTAX FIX: Added closing brace
        };

        const incorrectSymbol = {
            type: "simple-fill",
            color: [220, 20, 60, 0.3], // Translucent red
            outline: {
                color: "white",
                width: 2,
            }, // <-- SYNTAX FIX: Added closing brace
        };

        // --- Helper Functions ---

        /**
         * Get translation for a key
         */
        function t(key, replacements = {}) {
            let text =
                (translations[currentLanguage] &&
                    translations[currentLanguage][key]) ||
                translations["en"][key] ||
                key;
            for (const [placeholder, value] of Object.entries(replacements)) {
                text = text.replace(`{${placeholder}}`, value);
            }
            return text;
        }

        /**
         * Update all UI text and panel visibility based on state
         */
        function updateUI() {
            // Update language and direction
            document.documentElement.lang = currentLanguage;
            document.body.dir = currentLanguage === "ar" ? "rtl" : "ltr";

            // Toggle button text
            buttons.langToggle.innerText = t("langToggle");

            // Translate all static text
            // Start Panel
            $("welcome-title").innerHTML = t("welcomeTitle");
            $("welcome-desc").innerHTML = t("welcomeDesc");
            buttons.start.innerText = t("startButton");

            // Loading Panel
            $("loading-text").innerText = t("loadingText");

            // Game Panel
            $("find-landmark-text").innerText = t("findLandmarkText");
            $("score-display").innerText = t("scoreDisplay", {
                score: totalScore,
            });
            if (allLandmarks.length > 0) {
                $("round-display").innerText = t("roundDisplay", {
                    current: currentLandmarkIndex + 1,
                    total: allLandmarks.length,
                });
            }

            // Confirm Panel
            buttons.confirm.innerText = t("confirmButton");

            // Round Result Panel
            buttons.next.innerText = t(
                currentLandmarkIndex === allLandmarks.length - 1
                    ? "gameOverButton"
                    : "nextButton"
            );

            // Game Over Panel
            $("game-over-title").innerText = t("gameOverTitle");
            $("final-score-text").innerText = t("finalScoreText");
            $("total-score-label").innerText = t("totalScoreLabel");
            $("accuracy-label").innerText = t("accuracyLabel");
            buttons.playAgain.innerText = t("playAgainButton");
            buttons.share.innerText = t("shareButton");

            // Share Modal
            $("share-modal-title").innerText = t("shareModalTitle");
            $("share-modal-desc").innerText = t("shareModalDesc");

            // Share Card (Hidden)
            $("share-card-title").innerText = t("shareCardTitle");
            $("share-card-score-label").innerText = t("shareCardScoreLabel");
            $("share-card-accuracy-label").innerText = t(
                "shareCardAccuracyLabel"
            );

            // Show/Hide Panels
            for (const panel of Object.values(panels)) {
                panel.classList.add("hidden");
            }

            switch (gameState) {
                case "LOADING":
                    panels.loading.classList.remove("hidden");
                    break;
                case "START":
                    panels.start.classList.remove("hidden");
                    break;
                case "PLAYING":
                    panels.game.classList.remove("hidden");
                    if (clickedPoint) {
                        panels.confirm.classList.remove("hidden");
                    }
                    break;
                case "ROUND_RESULT":
                    panels.roundResult.classList.remove("hidden");
                    break;
                case "GAME_OVER":
                    panels.gameOver.classList.remove("hidden");
                    break;
            }
        }

        /**
         * Toggle language
         */
        function toggleLanguage() {
            currentLanguage = currentLanguage === "en" ? "ar" : "en";
            // Re-render UI with new language
            updateUI();

            // Update dynamic text if game is in progress
            if (gameState === "PLAYING") {
                const landmark = allLandmarks[currentLandmarkIndex];
                const name =
                    landmark.attributes[
                        currentLanguage === "ar" ? "name_ar" : "name"
                    ];
                $("landmark-name").innerText = name;
            }
        }

        /**
         * Shuffle an array
         */
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        /**
         * Convert data URL to File object (for Web Share API)
         */
        // --- UPDATED FUNCTION ---
        // Removed promiseUtils.create wrapper. This now returns a native Promise.
        function dataURLtoFile(dataUrl, filename) {
            return fetch(dataUrl)
                .then((res) => res.blob())
                .then((blob) => {
                    return new File([blob], filename, { type: blob.type });
                });
        }

        // --- Game Logic Functions ---

        /**
         * Initialize the map and load game data
         */
        function init() {
            try {
                // Load the web map
                webmap = new WebMap({
                    portalItem: {
                        id: "707a71d354c540f78c2f9101eead4c09",
                    },
                });

                webmap
                    .load()
                    .then(() => {
                        // Find the landmarks layer
                        landmarksLayer = webmap.layers.find(
                            (layer) => layer.title === "Dubai Landmarks"
                        ); // <-- FIXED TYPO

                        if (!landmarksLayer) {
                            console.error(
                                "Could not find layer 'Dubai Landmarks'"
                            );
                            alert(t("layerError"));
                            return Promise.reject(new Error(t("layerError"))); // <-- Use native Promise.reject
                        }

                        // Hide the layer
                        landmarksLayer.visible = false;

                        // Create the MapView
                        view = new MapView({
                            container: "viewDiv",
                            map: webmap,
                        });

                        // Add graphics layer
                        graphicsLayer = new GraphicsLayer();
                        webmap.add(graphicsLayer);

                        // --- UPDATED ---
                        // Use native Promise.all
                        return Promise.all([view.when(), loadGameData()]);
                    })
                    // --- SYNTAX ERROR FIX: REMOVED ERRONEOUS .then() BLOCK ---
                    .then(([viewResponse, gameDataResponse]) => {
                        // --- UPDATED ---
                        // Directly access results from Promise.all

                        // This block runs after *both* promises fulfill
                        console.log("Map view ready and game data loaded.");
                        gameState = "START";
                        updateUI();
                    })
                    .catch((error) => {
                        // This single .catch handles all errors in the chain
                        console.error("Error during initialization:", error);
                        alert(t("webMapError"));
                        panels.loading.classList.remove("hidden");
                    });
            } catch (error) {
                // This catch is for immediate sync errors
                console.error("Error initializing webmap:", error);
                alert(t("webMapError"));
                panels.loading.classList.remove("hidden");
            }
        }

        /**
         * Query all features from the landmarks layer
         */
        // --- UPDATED TO FETCH ATTACHMENTS ---
        function loadGameData() {
            try {
                const query = landmarksLayer.createQuery();
                query.where = "1=1"; // Get all features
                // --- UPDATED: Use top-level objectId instead of attribute ---
                query.outFields = ["name", "name_ar", "OBJECTID"]; // Keep OBJECTID for the map key
                query.returnGeometry = true;

                // queryFeatures returns a Dojo promise
                return landmarksLayer
                    .queryFeatures(query)
                    .then((featureSet) => {
                        allLandmarks = shuffleArray(featureSet.features);

                        // Now, create an array of promises to fetch attachments for each landmark
                        const attachmentPromises = allLandmarks.map(
                            (feature) => {
                                // queryAttachments returns a Dojo promise
                                return landmarksLayer
                                    .queryAttachments({
                                        objectIds: [
                                            feature.attributes.OBJECTID,
                                        ], // Use the objectId from attributes
                                    })
                                    .then((attachmentMap) => {
                                        // --- UPDATED: Correctly parse the attachmentMap object ---
                                        const objectId =
                                            feature.attributes.OBJECTID;
                                        const attachments =
                                            attachmentMap[objectId]; // Get the array of attachments for this feature

                                        // Save the URL of the first attachment (if it exists)
                                        if (
                                            attachments &&
                                            attachments.length > 0
                                        ) {
                                            feature.attributes.imageUrl =
                                                attachments[0].url;
                                        } else {
                                            feature.attributes.imageUrl = null; // Handle landmarks with no image
                                        }
                                        return feature; // Return the modified feature
                                    });
                            }
                        );

                        // Wait for all attachment queries to complete
                        // Convert Dojo promise array to native Promise.all
                        return Promise.all(attachmentPromises);
                    })
                    .then((landmarksWithImages) => {
                        // allLandmarks now contains features with the 'imageUrl' attribute
                        allLandmarks = landmarksWithImages;
                        console.log(
                            "Landmarks and images loaded:",
                            allLandmarks
                        );
                        // Let init() handle the UI update once everything is ready
                    })
                    .catch((error) => {
                        console.error(
                            "Error querying features or attachments:",
                            error
                        );
                        alert("Could not load landmark data.");
                        return Promise.reject(error); // <-- Use native Promise.reject
                    });
            } catch (error) {
                console.error("Error creating query:", error);
                alert("Could not load landmark data.");
                return Promise.reject(error); // <-- Use native Promise.reject
            }
        }

        /**
         * Start the game
         */
        function startGame() {
            // Reset game state
            currentLandmarkIndex = 0;
            totalScore = 0;
            accuracyTracker = [];
            clickedPoint = null;
            graphicsLayer.removeAll();

            // Shuffle landmarks for a new game
            allLandmarks = shuffleArray(allLandmarks);

            startRound();
        }

        /**
         * Start a new round
         */
        // --- UPDATED TO SHOW IMAGE ---
        function startRound() {
            clickedPoint = null;
            graphicsLayer.removeAll();

            const landmark = allLandmarks[currentLandmarkIndex];
            const name =
                landmark.attributes[
                    currentLanguage === "ar" ? "name_ar" : "name"
                ];
            const imageUrl = landmark.attributes.imageUrl;

            $("landmark-name").innerText = name;

            // Handle the image display
            if (imageUrl) {
                imageElements.container.classList.remove("hidden");
                imageElements.image.classList.add("hidden"); // Hide img tag while loading
                imageElements.spinner.classList.remove("hidden"); // Show spinner

                imageElements.image.src = imageUrl;
                imageElements.image.onload = () => {
                    // Once loaded, show image and hide spinner
                    imageElements.image.classList.remove("hidden");
                    imageElements.spinner.classList.add("hidden");
                };
                imageElements.image.onerror = () => {
                    // If image fails to load, hide container
                    imageElements.container.classList.add("hidden");
                };
            } else {
                // No image for this landmark
                imageElements.container.classList.add("hidden");
            }

            gameState = "PLAYING";
            updateUI();

            // Enable map click
            mapClickHandler = view.on("click", handleMapClick);
        }

        /**
         * Handle user's click on the map
         */
        function handleMapClick(event) {
            clickedPoint = event.mapPoint;

            // Clear previous click graphic
            graphicsLayer.removeAll();

            // Add new click graphic
            const clickGraphic = new Graphic({
                geometry: clickedPoint,
                symbol: clickSymbol,
            });
            graphicsLayer.add(clickGraphic);

            // Show confirm button
            updateUI();
        }

        /**
         * User confirms their guess, time to score
         */
        function confirmGuess() {
            if (!clickedPoint) return;

            // Disable map click
            if (mapClickHandler) {
                mapClickHandler.remove();
                mapClickHandler = null;
            }

            const targetLandmark = allLandmarks[currentLandmarkIndex];
            const targetPolygon = targetLandmark.geometry;

            // Use the 'geometryEngine' module variable
            const isInside = geometryEngine.contains(
                targetPolygon,
                clickedPoint
            );

            let roundScore = 0;
            let resultTitle = "";
            let resultMessage = "";
            let resultSymbol;

            // --- SCORING LOGIC FROM PREVIOUS VERSION ---
            if (isInside) {
                roundScore = 10;
                resultTitle = t("correctTitle");
                resultMessage = t("correctMessage");
                resultSymbol = correctSymbol;
                accuracyTracker.push(1);
            } else {
                // Use the 'geometryEngine' module variable
                const distanceInMeters = geometryEngine.distance(
                    targetPolygon,
                    clickedPoint,
                    "meters"
                );

                // --- UPDATED: Per user's new logic ---
                // Use parseInt to mimic int()
                const penalty = parseInt(distanceInMeters / 500, 10);
                roundScore = Math.max(0, 10 - penalty); // Score is 10 minus penalty, with a minimum of 0
                // --- END UPDATE ---

                resultTitle = t("incorrectTitle");
                resultMessage = t("incorrectMessage", {
                    distance: Math.round(distanceInMeters),
                    roundScore: roundScore, // Pass roundScore to the message
                });
                resultSymbol = incorrectSymbol;
                accuracyTracker.push(0);
            }

            totalScore += roundScore;

            // Update result panel text
            $("round-result-title").innerText = resultTitle;
            $("round-result-message").innerHTML = resultMessage;
            $("round-result-title").style.color = isInside
                ? "#16a34a"
                : "#dc2626"; // green-600 or red-600

            // Show the correct polygon
            const resultGraphic = new Graphic({
                geometry: targetPolygon,
                symbol: resultSymbol,
            });
            graphicsLayer.add(resultGraphic);

            // Zoom to the result
            view.goTo({
                target: targetPolygon.extent.expand(1.5),
            });

            gameState = "ROUND_RESULT";
            updateUI();
        }

        /**
         * Move to the next round or end the game
         */
        function nextRound() {
            currentLandmarkIndex++;

            if (currentLandmarkIndex < allLandmarks.length) {
                startRound();
            } else {
                // Game Over
                endGame();
            }
        }

        function endGame() {
            gameState = "GAME_OVER";
            updateUI(); // <-- MOVED UP: Show the panel first

            const accuracy =
                (accuracyTracker.filter((a) => a === 1).length /
                    allLandmarks.length) *
                100;

            // Now that the panel is visible, these elements exist
            $("total-score").innerText = totalScore;
            $("accuracy").innerText = `${Math.round(accuracy)}%`;

            // Pre-fill the hidden share card
            $("share-card-score").innerText = totalScore;
            $("share-card-accuracy").innerText = `${Math.round(accuracy)}%`;

            // updateUI(); // <-- REMOVED FROM HERE
        }

        /**
         * Handle sharing the results
         */
        function shareResults() {
            const shareCard = $("share-card");

            // Temporarily make it visible but off-screen to render
            shareCard.classList.remove("hidden");
            shareCard.style.position = "absolute";
            shareCard.style.left = "-9999px";

            // Add a small delay to ensure the element is in the DOM
            setTimeout(() => {
                // --- UPDATED ---
                // html2canvas returns a native promise.
                html2canvas(shareCard, { scale: 2 })
                    .then((canvas) => {
                        const dataUrl = canvas.toDataURL("image/png");
                        // dataURLtoFile now returns a native promise
                        return dataURLtoFile(
                            dataUrl,
                            "landmark_results.png"
                        ).then((file) => ({ dataUrl, file })); // Pass both dataUrl and file
                    })
                    .then(({ dataUrl, file }) => {
                        // Hide the card again
                        hideShareCard();

                        // Use Web Share API if available
                        if (
                            navigator.share &&
                            navigator.canShare({ files: [file] })
                        ) {
                            // navigator.share returns a native promise
                            return navigator.share({
                                title: t("shareCardTitle"),
                                text: `I scored ${totalScore} points in the Dubai Landmark Locator game!`,
                                files: [file],
                            });
                        } else {
                            // Fallback to modal
                            $("share-image-preview").src = dataUrl;
                            panels.shareModal.classList.remove("hidden");
                        }
                    })
                    .catch((error) => {
                        console.error("Error sharing:", error);

                        // Attempt to fallback to modal even if sharing fails
                        // We must hide the card *before* running html2canvas again
                        hideShareCard();

                        // --- UPDATED ---
                        // Re-run html2canvas for the fallback (returns native promise)
                        html2canvas($("share-card"), { scale: 2 })
                            .then((canvas) => {
                                $("share-image-preview").src =
                                    canvas.toDataURL("image/png");
                                panels.shareModal.classList.remove("hidden");
                            })
                            .catch((e) => {
                                console.error(
                                    "Error generating fallback share image:",
                                    e
                                );
                                // As a last resort, just hide the card
                                hideShareCard();
                            });
                    });
            }, 100); // 100ms delay
        }

        // Helper to hide the share card
        function hideShareCard() {
            const shareCard = $("share-card");
            shareCard.classList.add("hidden");
            shareCard.style.position = "";
            shareCard.style.left = "";
        }

        // --- Event Listeners ---
        buttons.langToggle.addEventListener("click", toggleLanguage);
        buttons.start.addEventListener("click", startGame);
        buttons.confirm.addEventListener("click", confirmGuess);
        buttons.next.addEventListener("click", nextRound);
        buttons.playAgain.addEventListener("click", startGame);
        buttons.share.addEventListener("click", shareResults);
        buttons.closeModal.addEventListener("click", () => {
            panels.shareModal.classList.add("hidden");
        });

        // Start the application
        init();
        updateUI(); // Show loading screen initially
    });
}, 0); // <-- Run after a 0ms delay
