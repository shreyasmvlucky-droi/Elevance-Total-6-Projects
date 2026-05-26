/**
 * SignGloveNet - Audio/Visual Surveillance Coordinator & UI Manager
 * Handles temporal clock locks, vector hand drawing, webcam streams, and CSV tables logs.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Initial State Configurations
    // ---------------------------------------------------------
    const model = new SignLanguageModel();
    
    let activeFeedMode = 'presets'; // 'presets' or 'webcam'
    let translationLogs = [];       // Database array: { id, time, word, confidence }
    let logCounter = 101;
    let isWebcamActive = false;
    let webcamStream = null;
    
    // Temporal Gating Variables
    let simulatedHour = 20; // 8:00 PM (inside 6 PM - 10 PM operating window by default)
    let isSystemLocked = false;

    // FPS counter parameters
    let lastFpsTime = performance.now();
    let fpsFrames = 0;
    let currentFps = 60;

    // Animation variables
    let scanlineY = 0;
    let scanlineDirection = 1;
    let handAnimPhase = 0;

    // Canvas Elements
    const surveillanceCanvas = document.getElementById('surveillance-canvas');
    const ctx = surveillanceCanvas.getContext('2d');
    const webcamVideo = document.getElementById('webcam-video');
    const timeLockScreen = document.getElementById('time-lock-screen');
    const hudFeedSource = document.getElementById('hud-feed-source');
    const hudClock = document.getElementById('hud-clock');
    
    // UI Panels and buttons
    const tabPresets = document.getElementById('tab-presets');
    const tabWebcam = document.getElementById('tab-webcam');
    
    const ctrlPresetsPanel = document.getElementById('ctrl-presets-panel');
    const ctrlWebcamPanel = document.getElementById('ctrl-webcam-panel');
    
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    const btnStartWebcam = document.getElementById('btn-start-webcam');
    const btnStopWebcam = document.getElementById('btn-stop-webcam');
    const imageFileInput = document.getElementById('image-file-input');
    const imageDropZone = document.getElementById('image-drop-zone');
    
    // Time Lock Elements
    const timeSlider = document.getElementById('time-slider');
    const simulatedTimeDisplay = document.getElementById('simulated-time-display');
    const timeLockStatus = document.getElementById('time-lock-status');
    const timeControllerCard = document.getElementById('time-controller-card');
    
    // Outcome Card elements
    const gestureResultCard = document.getElementById('gesture-result-card');
    const translatedWordText = document.getElementById('translated-word-text');
    const predictionConfidenceVal = document.getElementById('prediction-confidence-val');
    const predictionConfidenceFill = document.getElementById('prediction-confidence-fill');
    const cardStatusLed = document.getElementById('card-status-led');
    
    // Stats HUD Elements
    const statGatewayState = document.getElementById('stat-gateway-state');
    const statTotalTranslations = document.getElementById('stat-total-translations');
    const sysStatusLed = document.getElementById('sys-status-led');
    const hudFps = document.getElementById('hud-fps');
    
    // Telemetry progress fills
    const hudValAspect = document.getElementById('hud-val-aspect');
    const hudFillAspect = document.getElementById('hud-fill-aspect');
    const hudValSolidity = document.getElementById('hud-val-solidity');
    const hudFillSolidity = document.getElementById('hud-fill-solidity');
    const hudValBalance = document.getElementById('hud-val-balance');
    const hudFillBalance = document.getElementById('hud-fill-balance');
    
    const translationTableBody = document.getElementById('translation-table-body');

    // Currently selected ASL preset word
    let activePresetWord = "Hello";

    // ---------------------------------------------------------
    // 2. Temporal Gating Logic (6 PM - 10 PM Lock Engine)
    // ---------------------------------------------------------
    function evaluateTemporalLock() {
        // Operational hours: 18:00 to 22:00 (6 PM to 10 PM)
        const isWithinHours = simulatedHour >= 18 && simulatedHour < 22;
        
        if (isWithinHours) {
            // ONLINE - UNLOCKED
            isSystemLocked = false;
            timeLockScreen.classList.remove('active');
            
            // Unlocked telemetry status
            timeLockStatus.innerText = "OPERATIONAL";
            timeLockStatus.style.borderColor = "rgba(57, 255, 20, 0.2)";
            timeLockStatus.style.color = "var(--neon-green)";
            timeControllerCard.classList.remove('locked-card');
            
            statGatewayState.innerText = "ACTIVE";
            statGatewayState.className = "hud-val text-glow-green";
            sysStatusLed.className = "hud-status-led pulsing-green";
            
            // Enable preset buttons
            presetButtons.forEach(btn => btn.disabled = false);
            
            // Trigger classification evaluate
            evaluateInference();
        } else {
            // OFFLINE - LOCKED
            isSystemLocked = true;
            timeLockScreen.classList.add('active');
            
            // Locked telemetry status
            timeLockStatus.innerText = "OFFLINE LOCK";
            timeLockStatus.style.borderColor = "rgba(255, 23, 68, 0.2)";
            timeLockStatus.style.color = "var(--neon-red)";
            timeControllerCard.classList.add('locked-card');
            
            statGatewayState.innerText = "OFFLINE";
            statGatewayState.className = "hud-val text-glow-red";
            sysStatusLed.className = "hud-status-led pulsing-red";
            
            // Disable preset buttons
            presetButtons.forEach(btn => btn.disabled = true);
            
            // Shut down webcam feed
            stopWebcamStream();
            
            // Reset outcome prediction card
            gestureResultCard.className = "outcome-card card-offline";
            translatedWordText.innerText = "SYSTEM OFFLINE";
            translatedWordText.className = "result-main-val text-muted";
            predictionConfidenceVal.innerText = "--%";
            cardStatusLed.style.backgroundColor = "var(--text-muted)";
            cardStatusLed.style.boxShadow = "none";
            
            // Clear telemetry HUD bars
            clearTelemetryHUD();
        }
    }

    // ---------------------------------------------------------
    // 3. Surveillance Viewport loop (60 FPS)
    // ---------------------------------------------------------
    function drawSurveillanceConsole() {
        // Compute FPS rate
        fpsFrames++;
        const now = performance.now();
        if (now >= lastFpsTime + 1000) {
            currentFps = Math.round((fpsFrames * 1000) / (now - lastFpsTime));
            hudFps.innerText = `FPS: ${currentFps}`;
            fpsFrames = 0;
            lastFpsTime = now;
        }

        // Reset canvas frame
        ctx.fillStyle = '#020305';
        ctx.fillRect(0, 0, surveillanceCanvas.width, surveillanceCanvas.height);
        
        if (!isSystemLocked) {
            // Draw grid backdrop
            drawMonitorGrid();
            
            // Frame update
            handAnimPhase += 0.08;

            if (activeFeedMode === 'presets') {
                // Draw mathematically synthesized ASL hand vector outline
                drawVectorHandShape();
            } else {
                // Draw webcam feed overlays
                drawWebcamFeed();
            }
            
            // Bounded horizontal scanline laser
            scanlineY += 1.5 * scanlineDirection;
            if (scanlineY > surveillanceCanvas.height) {
                scanlineY = surveillanceCanvas.height;
                scanlineDirection = -1;
            } else if (scanlineY < 0) {
                scanlineY = 0;
                scanlineDirection = 1;
            }
            
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, scanlineY);
            ctx.lineTo(surveillanceCanvas.width, scanlineY);
            ctx.stroke();
        }

        requestAnimationFrame(drawSurveillanceConsole);
    }
    
    function drawMonitorGrid() {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.025)';
        ctx.lineWidth = 1;
        const spacing = 30;
        for (let x = 0; x < surveillanceCanvas.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, surveillanceCanvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < surveillanceCanvas.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(surveillanceCanvas.width, y);
            ctx.stroke();
        }
    }
    
    // Start surveillance viewport loops
    drawSurveillanceConsole();

    // ---------------------------------------------------------
    // 4. Mathematical Vector Hand Synthesizer (Simulator)
    // ---------------------------------------------------------
    function drawVectorHandShape() {
        const cx = surveillanceCanvas.width / 2;
        const cy = surveillanceCanvas.height / 2 + 20;
        
        ctx.save();
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
        ctx.lineWidth = 2.5;

        // Base coordinates nodes for fingers representing structural posture
        // Coordinates flex or extend dynamically according to ASL preset words
        const joints = {
            palm: { x: cx, y: cy + 40 },
            wrist: { x: cx, y: cy + 90 },
            knuckles: [
                { x: cx - 45, y: cy + 10 }, // Index knuckle
                { x: cx - 15, y: cy + 5 },  // Middle knuckle
                { x: cx + 15, y: cy + 8 },  // Ring knuckle
                { x: cx + 45, y: cy + 15 }  // Pinky knuckle
            ],
            thumb_k: { x: cx - 50, y: cy + 45 }
        };

        const fingersTip = [];
        
        // Define finger heights and flex coefficients based on gesture presets
        if (activePresetWord === "Hello") {
            // Flat upright open hand palm
            fingersTip.push({ x: joints.knuckles[0].x - 5, y: joints.knuckles[0].y - 80 }); // Index
            fingersTip.push({ x: joints.knuckles[1].x,     y: joints.knuckles[1].y - 90 }); // Middle
            fingersTip.push({ x: joints.knuckles[2].x + 5, y: joints.knuckles[2].y - 85 }); // Ring
            fingersTip.push({ x: joints.knuckles[3].x + 10,y: joints.knuckles[3].y - 70 }); // Pinky
            // Thumb
            fingersTip.push({ x: joints.thumb_k.x - 30, y: joints.thumb_k.y - 15 });
        } else if (activePresetWord === "Yes") {
            // Closed fist (tightly folded fingers)
            fingersTip.push({ x: joints.knuckles[0].x + 5, y: joints.knuckles[0].y + 15 }); // Index folded
            fingersTip.push({ x: joints.knuckles[1].x,     y: joints.knuckles[1].y + 18 }); // Middle folded
            fingersTip.push({ x: joints.knuckles[2].x - 5, y: joints.knuckles[2].y + 16 }); // Ring folded
            fingersTip.push({ x: joints.knuckles[3].x - 8, y: joints.knuckles[3].y + 12 }); // Pinky folded
            // Thumb wraps over fingers
            fingersTip.push({ x: joints.knuckles[0].x + 25, y: joints.thumb_k.y - 15 });
        } else if (activePresetWord === "No") {
            // Index & Middle snapping down on thumb (downward flexes)
            fingersTip.push({ x: joints.knuckles[0].x + 10, y: joints.knuckles[0].y + 25 }); // Index folded down
            fingersTip.push({ x: joints.knuckles[1].x + 5,  y: joints.knuckles[1].y + 28 }); // Middle folded down
            fingersTip.push({ x: joints.knuckles[2].x + 5,  y: joints.knuckles[2].y + 16 }); // Ring folded
            fingersTip.push({ x: joints.knuckles[3].x + 10, y: joints.knuckles[3].y + 12 }); // Pinky folded
            // Thumb
            fingersTip.push({ x: joints.knuckles[0].x + 10, y: joints.thumb_k.y - 12 });
        } else if (activePresetWord === "Thank You") {
            // Flat hand slanted forward (tilted geometries)
            fingersTip.push({ x: joints.knuckles[0].x - 15, y: joints.knuckles[0].y - 50 }); // Index slanted
            fingersTip.push({ x: joints.knuckles[1].x - 10, y: joints.knuckles[1].y - 55 }); // Middle slanted
            fingersTip.push({ x: joints.knuckles[2].x - 5,  y: joints.knuckles[2].y - 52 }); // Ring slanted
            fingersTip.push({ x: joints.knuckles[3].x,      y: joints.knuckles[3].y - 42 }); // Pinky slanted
            // Thumb
            fingersTip.push({ x: joints.thumb_k.x - 22, y: joints.thumb_k.y - 10 });
        } else if (activePresetWord === "Help") {
            // Closed fist thumbs-up (Asymmetrical thumbs-up)
            fingersTip.push({ x: joints.knuckles[0].x + 5, y: joints.knuckles[0].y + 15 }); // Index folded
            fingersTip.push({ x: joints.knuckles[1].x,     y: joints.knuckles[1].y + 18 }); // Middle folded
            fingersTip.push({ x: joints.knuckles[2].x - 5, y: joints.knuckles[2].y + 16 }); // Ring folded
            fingersTip.push({ x: joints.knuckles[3].x - 8, y: joints.knuckles[3].y + 12 }); // Pinky folded
            // Thumb upright (Thumbs up!)
            fingersTip.push({ x: joints.thumb_k.x - 15, y: joints.thumb_k.y - 65 });
            
            // Open second support hand line (flat palm underneath thumbs-up)
            ctx.beginPath();
            ctx.moveTo(cx - 75, cy + 70);
            ctx.lineTo(cx + 75, cy + 70);
            ctx.stroke();
        }

        // Draw palm silhouette enclosure shape
        ctx.beginPath();
        ctx.moveTo(joints.wrist.x - 25, joints.wrist.y);
        ctx.quadraticCurveTo(joints.wrist.x - 35, joints.palm.y, joints.thumb_k.x, joints.thumb_k.y);
        // Connecting fingers knuckles
        ctx.lineTo(joints.knuckles[0].x, joints.knuckles[0].y);
        ctx.lineTo(joints.knuckles[1].x, joints.knuckles[1].y);
        ctx.lineTo(joints.knuckles[2].x, joints.knuckles[2].y);
        ctx.lineTo(joints.knuckles[3].x, joints.knuckles[3].y);
        // Wrist connection
        ctx.lineTo(joints.wrist.x + 25, joints.wrist.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw active finger bones & connection joints
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(joints.knuckles[i].x, joints.knuckles[i].y);
            // Draw intermediate joint
            const midX = joints.knuckles[i].x + (fingersTip[i].x - joints.knuckles[i].x) * 0.45;
            const midY = joints.knuckles[i].y + (fingersTip[i].y - joints.knuckles[i].y) * 0.45;
            ctx.lineTo(midX, midY);
            ctx.lineTo(fingersTip[i].x, fingersTip[i].y);
            ctx.stroke();

            // Draw glowing joint nodes
            ctx.fillStyle = 'rgba(57, 255, 20, 0.8)';
            ctx.beginPath(); ctx.arc(midX, midY, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(fingersTip[i].x, fingersTip[i].y, 3, 0, Math.PI*2); ctx.fill();
        }

        // Draw thumb joints
        ctx.beginPath();
        ctx.moveTo(joints.thumb_k.x, joints.thumb_k.y);
        ctx.lineTo(fingersTip[4].x, fingersTip[4].y);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(fingersTip[4].x, fingersTip[4].y, 3, 0, Math.PI*2); ctx.fill();

        ctx.restore();

        // Overlay biometric bounding target around the hand vector
        const boxX = cx - 70;
        const boxY = cy - 85;
        const boxW = 140;
        const boxH = 180;

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // HUD Labels inside surveillance monitor
        ctx.fillStyle = 'var(--neon-cyan)';
        ctx.font = '7px var(--font-hud)';
        ctx.fillText(`GESTURE_LOCK_ROI`, boxX + 4, boxY + 12);
        ctx.fillText(`W_H_SCALE: 1.0X`, boxX + 4, boxY + boxH - 6);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`PREDICTED SIGN: ${activePresetWord.toUpperCase()}`, boxX + 4, boxY + boxH + 13);
    }

    // ---------------------------------------------------------
    // 5. Live Webcam Surveillance Feed & Skin-tone tracker
    // ---------------------------------------------------------
    let webcamFrameTimer = 0;
    
    function drawWebcamFeed() {
        if (!isWebcamActive) {
            // Draw placeholder feed screen
            ctx.fillStyle = '#06090e';
            ctx.fillRect(0, 0, surveillanceCanvas.width, surveillanceCanvas.height);
            
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '10px var(--font-hud)';
            ctx.textAlign = 'center';
            ctx.fillText("SURVEILLANCE CAMERA DISCONNECTED", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 - 10);
            ctx.font = '8px var(--font-ui)';
            ctx.fillText("Click 'Launch Webcam Stream' to connect camera feed", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 + 10);
            ctx.textAlign = 'left'; // reset
            return;
        }

        // Draw webcam frame onto canvas viewport
        ctx.drawImage(webcamVideo, 0, 0, surveillanceCanvas.width, surveillanceCanvas.height);
        
        // Bounding scan zone where hand should be presented centrally
        const bx = surveillanceCanvas.width / 2 - 90;
        const by = surveillanceCanvas.height / 2 - 100;
        const bw = 180;
        const bh = 200;
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);
        
        ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.fillRect(bx, by, bw, bh);

        // Run hand feature segmenter calculations every 10 frames
        webcamFrameTimer++;
        if (webcamFrameTimer >= 10) {
            webcamFrameTimer = 0;
            
            // Analyze pixel buffers inside scan box (skin-tone solidity contours)
            const features = model.extractHandFeatures(ctx, bx, by, bw, bh);
            
            // Predict Softmax ML Gesture classifications
            const pred = model.predict(features.aspectRatio, features.solidity, features.yCentroid, features.lrBalance, features.tbBalance);
            
            ctx.lockedTranslation = pred;
        }

        // Draw active bounding box overlays if a hand shape is successfully segmented
        if (ctx.lockedTranslation) {
            const pred = ctx.lockedTranslation;
            const feats = pred.features;
            
            ctx.strokeStyle = 'var(--neon-green)';
            ctx.lineWidth = 2.0;
            ctx.strokeRect(bx, by, bw, bh);
            
            ctx.fillStyle = 'var(--neon-green)';
            ctx.font = '8px var(--font-hud)';
            ctx.fillText("SURVEILLANCE GESTURE DETECTED:", bx, by - 24);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px var(--font-hud)';
            ctx.fillText(`TRANSLATED SIGN: "${pred.word.toUpperCase()}"`, bx + 10, by - 10);
            
            // Draw features bars inside monitor feed
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(bx + 5, by + bh - 40, bw - 10, 35);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.strokeRect(bx + 5, by + bh - 40, bw - 10, 35);
            
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '6px var(--font-hud)';
            ctx.fillText(`ASPECT_RATIO: ${feats[0].toFixed(3)}`, bx + 10, by + bh - 30);
            ctx.fillText(`SOLIDITY_RATIO: ${(feats[1] * 100).toFixed(0)}%`, bx + 10, by + bh - 20);
            ctx.fillText(`TB_BALANCE: ${(feats[4] * 100).toFixed(0)}%`, bx + 10, by + bh - 10);
            
            // Periodic translation logging
            // Adds a row to database table ledger when a gesture is held centrally
        }
    }

    // Toggle active surveillance mode tabs
    tabPresets.addEventListener('click', () => {
        if (isSystemLocked) return;
        activeFeedMode = 'presets';
        tabPresets.classList.add('active');
        tabWebcam.classList.remove('active');
        ctrlPresetsPanel.classList.add('active');
        ctrlWebcamPanel.classList.remove('active');
        hudFeedSource.innerText = 'ASL_VECTOR_PRESETS';
        stopWebcamStream();
        evaluateInference();
    });

    tabWebcam.addEventListener('click', () => {
        if (isSystemLocked) return;
        activeFeedMode = 'webcam';
        tabWebcam.classList.add('active');
        tabPresets.classList.remove('active');
        ctrlWebcamPanel.classList.add('active');
        ctrlPresetsPanel.classList.remove('active');
        hudFeedSource.innerText = 'WEBCAM_SURVEILLANCE_CAMERA';
        evaluateInference();
    });

    // Start webcam camera streams
    btnStartWebcam.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
            .then(stream => {
                webcamVideo.srcObject = stream;
                webcamStream = stream;
                isWebcamActive = true;
                btnStartWebcam.disabled = true;
                btnStopWebcam.disabled = false;
                sysStatusLed.className = "hud-status-led pulsing-green";
                
                // Perform periodic webcam scan database logger
                setInterval(() => {
                    if (isWebcamActive && ctx.lockedTranslation && !isSystemLocked) {
                        const webGesture = {
                            word: ctx.lockedTranslation.word,
                            confidence: ctx.lockedTranslation.confidence
                        };
                        logTranslation(webGesture);
                    }
                }, 4000);
            })
            .catch(err => {
                console.error("Webcam capture connection failed:", err);
                alert("Camera access denied or device unavailable. Scanner will operate in ASL Preset Simulator mode.");
                tabPresets.click();
            });
    });

    btnStopWebcam.addEventListener('click', () => {
        stopWebcamStream();
    });

    function stopWebcamStream() {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamVideo.srcObject = null;
        }
        isWebcamActive = false;
        btnStartWebcam.disabled = false;
        btnStopWebcam.disabled = true;
    }

    // ---------------------------------------------------------
    // 6. Demographic Inference Evaluator & Telemetry HUD
    // ---------------------------------------------------------
    function evaluateInference() {
        if (isSystemLocked) return;

        let pred = null;

        if (activeFeedMode === 'presets') {
            // Synthesize geometrical feature ratios manually representing selected ASL preset word
            let aspect = 0.85;
            let solidity = 0.35;
            let yCentroid = 0.5;
            let lrBalance = 0.5;
            let tbBalance = 0.5;

            if (activePresetWord === "Hello") {
                aspect = 0.62; solidity = 0.38; yCentroid = 0.42; lrBalance = 0.48; tbBalance = 0.38;
            } else if (activePresetWord === "Yes") {
                aspect = 0.98; solidity = 0.85; yCentroid = 0.52; lrBalance = 0.52; tbBalance = 0.52;
            } else if (activePresetWord === "No") {
                aspect = 0.48; solidity = 0.42; yCentroid = 0.45; lrBalance = 0.45; tbBalance = 0.40;
            } else if (activePresetWord === "Thank You") {
                aspect = 1.35; solidity = 0.48; yCentroid = 0.65; lrBalance = 0.42; tbBalance = 0.68;
            } else if (activePresetWord === "Help") {
                aspect = 1.22; solidity = 0.72; yCentroid = 0.58; lrBalance = 0.74; tbBalance = 0.58;
            }

            pred = model.predict(aspect, solidity, yCentroid, lrBalance, tbBalance);
        } else {
            // Webcam prediction features
            pred = ctx.lockedTranslation || model.predict(0.85, 0.35, 0.5, 0.5, 0.5);
        }

        // Draw outcome prediction card
        gestureResultCard.className = "outcome-card";
        translatedWordText.innerText = pred.word.toUpperCase();
        translatedWordText.className = "result-main-val text-glow-green";
        cardStatusLed.style.backgroundColor = "var(--neon-green)";
        cardStatusLed.style.boxShadow = "0 0 8px var(--neon-green)";

        // Confidence progression
        const confidencePct = Math.round(pred.confidence * 100);
        predictionConfidenceVal.innerText = `${confidencePct}%`;
        predictionConfidenceFill.style.width = `${confidencePct}%`;

        // Sync Hand Geometry Telemetry HUD bars
        syncTelemetryHUD(pred.features);
    }

    function syncTelemetryHUD(features) {
        if (!features) return;

        // Sync Aspect Ratio
        hudValAspect.innerText = features[0].toFixed(3);
        const aspectPct = Math.min(100, Math.max(0, (features[0] / 2.0) * 100));
        hudFillAspect.style.width = `${aspectPct}%`;

        // Sync Solidity
        hudValSolidity.innerText = `${(features[1] * 100).toFixed(0)}%`;
        hudFillSolidity.style.width = `${features[1] * 100}%`;

        // Sync Balance
        hudValBalance.innerText = `${(features[4] * 100).toFixed(0)}%`;
        hudFillBalance.style.width = `${features[4] * 100}%`;
    }

    function clearTelemetryHUD() {
        hudValAspect.innerText = "--";
        hudFillAspect.style.width = "0%";
        hudValSolidity.innerText = "--%";
        hudFillSolidity.style.width = "0%";
        hudValBalance.innerText = "--%";
        hudFillBalance.style.width = "0%";
    }

    // ---------------------------------------------------------
    // 7. Simulated Clock & Time Travel slider controllers
    // ---------------------------------------------------------
    timeSlider.addEventListener('input', (e) => {
        simulatedHour = parseInt(e.target.value);
        
        // Sync time displays
        let period = "AM";
        let displayHour = simulatedHour;
        if (simulatedHour === 0) {
            displayHour = 12;
        } else if (simulatedHour === 12) {
            period = "PM";
        } else if (simulatedHour > 12) {
            displayHour = simulatedHour - 12;
            period = "PM";
        }
        
        const padHour = String(displayHour).padStart(2, '0');
        simulatedTimeDisplay.innerText = `${padHour}:00 ${period}`;

        // Re-evaluate temporal clocks locks immediately
        evaluateTemporalLock();
    });

    // ---------------------------------------------------------
    // 8. Preset buttons click syncs
    // ---------------------------------------------------------
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isSystemLocked) return;

            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            activePresetWord = btn.getAttribute('data-word');
            hudAudioSource.innerText = "ASL_VECTOR_PRESETS";

            evaluateInference();
            
            // Log translation immediately when clicking presets
            logTranslation({
                word: activePresetWord,
                confidence: 0.92 + Math.random() * 0.07
            });
        });
    });

    // Select Hello by default
    document.getElementById('preset-1').click();

    // ---------------------------------------------------------
    // 9. Custom drag & drop image translation uploads
    // ---------------------------------------------------------
    imageDropZone.addEventListener('click', () => imageFileInput.click());

    imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.style.borderColor = 'var(--neon-green)';
    });

    imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.style.borderColor = 'rgba(0, 229, 255, 0.15)';
    });

    imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.style.borderColor = 'rgba(0, 229, 255, 0.15)';
        if (e.dataTransfer.files.length > 0) {
            processGestureImage(e.dataTransfer.files[0]);
        }
    });

    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processGestureImage(e.target.files[0]);
        }
    });

    function processGestureImage(file) {
        if (isSystemLocked) return;

        hudFeedSource.innerText = file.name.toUpperCase();
        
        // Randomize features to simulate CV hand aspect ratio extractions
        const wordsList = ["Hello", "Thank You", "Yes", "No", "Help"];
        const randWord = wordsList[Math.floor(Math.random() * wordsList.length)];
        
        presetButtons.forEach(btn => {
            if (btn.getAttribute('data-word') === randWord) {
                btn.click();
            }
        });
    }

    // ---------------------------------------------------------
    // 10. Database translation logs ledger
    // ---------------------------------------------------------
    function logTranslation(gesture) {
        // Create visit timestamp
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        const timestamp = `${hrs}:${mins}:${secs}`;

        const logRecord = {
            id: `#SIG_${logCounter++}`,
            time: timestamp,
            word: gesture.word,
            confidence: gesture.confidence
        };

        // Push record
        translationLogs.unshift(logRecord);
        scannedLogsCount = translationLogs.length;

        // Update database table ledger
        updateDatabaseUI();
    }

    function updateDatabaseUI() {
        if (translationLogs.length === 0) {
            translationTableBody.innerHTML = `<tr><td colspan="4" class="empty-table-msg">Surveillance ledger standby.</td></tr>`;
            return;
        }

        let rowsHtml = "";
        translationLogs.forEach(v => {
            rowsHtml += `
                <tr>
                    <td class="hud-font">${v.id}</td>
                    <td>${v.time}</td>
                    <td class="hud-font text-glow-green">${v.word.toUpperCase()}</td>
                    <td class="hud-font text-glow-cyan">${(v.confidence * 100).toFixed(1)}%</td>
                </tr>
            `;
        });

        translationTableBody.innerHTML = rowsHtml;
        statTotalTranslations.innerText = scannedLogsCount;
    }

    // Dynamic Clock HUD
    function updateClock() {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        hudClock.innerText = `${hrs}:${mins}:${secs}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Initial check temporal hours lock gateway
    evaluateTemporalLock();
});
