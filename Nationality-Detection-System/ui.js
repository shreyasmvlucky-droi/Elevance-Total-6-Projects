/**
 * NationalityEye - Visual Surveillance GUI & Coordinator
 * Coordinates vector biometric mesh generators, webcam feeds, and demographic databases logs.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Initial State Configurations
    // ---------------------------------------------------------
    const model = new BiometricDemographicsModel();

    let activeFeedMode = 'presets'; // 'presets' or 'webcam'
    let uploadedImage = null;       // Active uploaded image reference
    let demographicLogs = [];      // Logs registry: { id, time, nation, emotion, age, dress }
    let logCounter = 101;
    let isWebcamActive = false;
    let webcamStream = null;

    // FPS parameters
    let lastFpsTime = performance.now();
    let fpsFrames = 0;
    let currentFps = 60;

    // Animation variables
    let scanlineY = 0;
    let scanlineDirection = 1;
    let meshAnimPhase = 0;

    // Canvas Elements
    const surveillanceCanvas = document.getElementById('surveillance-canvas');
    const ctx = surveillanceCanvas.getContext('2d');
    const webcamVideo = document.getElementById('webcam-video');
    const hudFeedSource = document.getElementById('hud-feed-source');
    const hudClock = document.getElementById('hud-clock');

    // Tabs & Panels
    const tabPresets = document.getElementById('tab-presets');
    const tabWebcam = document.getElementById('tab-webcam');
    
    const ctrlPresetsPanel = document.getElementById('ctrl-presets-panel');
    const ctrlWebcamPanel = document.getElementById('ctrl-webcam-panel');
    
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    const btnStartWebcam = document.getElementById('btn-start-webcam');
    const btnStopWebcam = document.getElementById('btn-stop-webcam');
    const imageFileInput = document.getElementById('image-file-input');
    const imageDropZone = document.getElementById('image-drop-zone');

    // Stats HUD Elements
    const statTotalScans = document.getElementById('stat-total-scans');
    const statMelaninAvg = document.getElementById('stat-melanin-avg');
    const sysStatusLed = document.getElementById('sys-status-led');
    const hudFps = document.getElementById('hud-fps');

    // Outcome Card elements (including locks)
    const resValNation = document.getElementById('res-val-nation');
    const resValEmotion = document.getElementById('res-val-emotion');
    
    const resValAge = document.getElementById('res-val-age');
    const resLockAge = document.getElementById('res-lock-age');
    
    const resValDress = document.getElementById('res-val-dress');
    const resSwatchBox = document.getElementById('res-swatch-box');
    const resSwatchRow = document.getElementById('res-swatch-row');
    const resLockDress = document.getElementById('res-lock-dress');
    const cardStatusLed = document.getElementById('card-status-led');

    // Telemetry progress fills
    const hudValAspect = document.getElementById('hud-val-aspect');
    const hudFillAspect = document.getElementById('hud-fill-aspect');
    const hudValMelanin = document.getElementById('hud-val-melanin');
    const hudFillMelanin = document.getElementById('hud-fill-melanin');
    const hudValWrinkle = document.getElementById('hud-val-wrinkle');
    const hudFillWrinkle = document.getElementById('hud-fill-wrinkle');

    const demographicTableBody = document.getElementById('demographic-table-body');

    // Active preset configuration
    let activePreset = {
        name: "Aarav",
        nation: "Indian",
        emotion: "Happy",
        dressColor: "Red",
        rgb: { r: 230, g: 20, b: 50 }
    };

    // ---------------------------------------------------------
    // 2. Surveillance Viewport loop (60 FPS)
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
        
        // Draw grid lines overlay
        drawMonitorGrid();
        
        meshAnimPhase += 0.08;

        if (activeFeedMode === 'presets') {
            if (uploadedImage) {
                drawUploadedImageFeed();
            } else {
                // Draw mathematically synthesized animated biometric face mesh uploader
                drawBiometricFaceMesh();
            }
        } else {
            // Draw live webcam feed overlay scans
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
    
    // Start surveillance monitor loop
    drawSurveillanceConsole();

    // ---------------------------------------------------------
    // 3. Mathematical Biometric Face Mesh Synthesizer (Simulator)
    // ---------------------------------------------------------
    function drawBiometricFaceMesh() {
        const cx = surveillanceCanvas.width / 2;
        const cy = surveillanceCanvas.height / 2 + 10;
        
        ctx.save();
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.fillStyle = 'rgba(22, 28, 54, 0.5)';
        ctx.lineWidth = 2.0;

        // Shoulder/clothing base outline
        ctx.fillStyle = `rgb(${activePreset.rgb.r}, ${activePreset.rgb.g}, ${activePreset.rgb.b})`;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy + 30);
        ctx.lineTo(cx - 85, surveillanceCanvas.height - 20);
        ctx.lineTo(cx + 85, surveillanceCanvas.height - 20);
        ctx.lineTo(cx + 30, cy + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neck connection
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 18, cy + 10, 36, 25);
        ctx.strokeRect(cx - 18, cy + 10, 36, 25);

        // Biometric Face shape (melanin and aspect determine visual fill skin tones)
        ctx.fillStyle = activePreset.nation === 'African' 
            ? '#3e2723' // dark skin
            : (activePreset.nation === 'Indian' ? '#8d6e63' : '#f5e2d3'); // moderate vs. light skin
            
        const headW = 55;
        const headH = 70;
        
        ctx.beginPath();
        ctx.ellipse(cx, cy, headW, headH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw animated scanning grid mesh lines over face shape
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.35)';
        ctx.fillStyle = 'rgba(57, 255, 20, 0.85)';
        ctx.lineWidth = 0.5;

        // Knuckles coordinate anchors
        const scaleAspect = activePreset.nation === 'United States' ? 1.05 : 0.92;
        const flex = Math.sin(meshAnimPhase) * 1.5;

        const points = [
            { x: cx - 20 * scaleAspect, y: cy - 15 + flex }, // Left Eye
            { x: cx + 20 * scaleAspect, y: cy - 15 + flex }, // Right Eye
            { x: cx, y: cy + 5 },          // Nose Tip
            { x: cx - 14, y: cy + 28 },      // Left mouth
            { x: cx + 14, y: cy + 28 },      // Right mouth
            { x: cx, y: cy + 42 },          // Chin
            { x: cx - 40 * scaleAspect, y: cy }, // Left Jaw
            { x: cx + 40 * scaleAspect, y: cy }  // Right Jaw
        ];

        // Draw mesh wireframe
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[2].x, points[2].y);
        ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y);
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.moveTo(points[3].x, points[3].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.moveTo(points[4].x, points[4].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[6].x, points[6].y);
        ctx.moveTo(points[6].x, points[6].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[7].x, points[7].y);
        ctx.moveTo(points[7].x, points[7].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.stroke();

        // Draw nodes
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        // Bounding Box reticle overlay
        const boxX = cx - 65;
        const boxY = cy - 85;
        const boxW = 130;
        const boxH = 220;

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // HUD Labels inside monitor
        ctx.fillStyle = 'var(--neon-cyan)';
        ctx.font = '7px var(--font-hud)';
        ctx.fillText(`BIOMETRIC_FACE_ROI`, boxX + 4, boxY + 12);
        ctx.fillText(`LOCK_SCALE: 1.0X`, boxX + 4, boxY + boxH - 6);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`LOCKED: "${activePreset.name.toUpperCase()}"`, boxX + 4, boxY + boxH + 13);
    }

    /**
     * Draw Drag-and-Drop Uploaded Image and Scan Biometrics
     */
    function drawUploadedImageFeed() {
        if (!uploadedImage) return;

        const canvasW = surveillanceCanvas.width;
        const canvasH = surveillanceCanvas.height;

        // Calculate fit coordinates keeping aspect ratio
        const imgAspect = uploadedImage.width / uploadedImage.height;
        const canvasAspect = canvasW / canvasH;
        let drawW, drawH, drawX, drawY;

        if (imgAspect > canvasAspect) {
            drawW = canvasW;
            drawH = canvasW / imgAspect;
            drawX = 0;
            drawY = (canvasH - drawH) / 2;
        } else {
            drawH = canvasH;
            drawW = canvasH * imgAspect;
            drawX = (canvasW - drawW) / 2;
            drawY = 0;
        }

        // Draw image onto canvas first
        ctx.drawImage(uploadedImage, drawX, drawY, drawW, drawH);

        // Define bounding box scan rect
        const bx = Math.round(canvasW / 2 - 70);
        const by = Math.round(canvasH / 2 - 95);
        const bw = 140;
        const bh = 190;

        // Draw translucent overlay scanner card
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = 'rgba(0, 229, 255, 0.04)';
        ctx.fillRect(bx, by, bw, bh);

        // Run pixel-level computer vision extractor directly on canvas data!
        const biometrics = model.extractBiometrics(ctx, bx, by, bw, bh);
        const pred = model.predict(biometrics.aspectRatio, biometrics.melaninIndex, biometrics.wrinkleVariance, biometrics.dressRGB);

        // Cache predictions on canvas for logging synchronization
        ctx.lockedDemographics = pred;
        ctx.lockedFeatures = biometrics;

        // Draw scanning mesh nodes
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
        ctx.fillStyle = 'rgba(57, 255, 20, 0.85)';
        ctx.lineWidth = 0.5;

        const flex = Math.sin(meshAnimPhase) * 1.2;
        const cx = canvasW / 2;
        const cy = canvasH / 2 + 5;
        const points = [
            { x: cx - 22, y: cy - 14 + flex }, // Left Eye
            { x: cx + 22, y: cy - 14 + flex }, // Right Eye
            { x: cx, y: cy + 3 },             // Nose
            { x: cx - 12, y: cy + 20 },         // Mouth L
            { x: cx + 12, y: cy + 20 },         // Mouth R
            { x: cx, y: cy + 32 }              // Chin
        ];

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[2].x, points[2].y);
        ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y);
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[3].x, points[3].y);
        ctx.moveTo(points[2].x, points[2].y); ctx.lineTo(points[4].x, points[4].y);
        ctx.moveTo(points[3].x, points[3].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.moveTo(points[4].x, points[4].y); ctx.lineTo(points[5].x, points[5].y);
        ctx.stroke();

        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Bounded scanner visual labels
        ctx.fillStyle = 'var(--neon-green)';
        ctx.font = '8px var(--font-hud)';
        ctx.fillText(`BIOMETRIC SCANNING IMAGE...`, bx, by - 24);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`NATION: "${pred.nationality.toUpperCase()}"`, bx + 10, by - 10);
    }

    // ---------------------------------------------------------
    // 4. Live Webcam Surveillance Feed
    // ---------------------------------------------------------
    let webcamFrameTimer = 0;
    
    function drawWebcamFeed() {
        if (!isWebcamActive) {
            // Draw placeholder screen
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
        
        // Central biometric face box
        const bx = surveillanceCanvas.width / 2 - 80;
        const by = surveillanceCanvas.height / 2 - 100;
        const bw = 160;
        const bh = 220;
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);
        
        ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.fillRect(bx, by, bw, bh);

        // Perform biometric calculations every 10 frames
        webcamFrameTimer++;
        if (webcamFrameTimer >= 10) {
            webcamFrameTimer = 0;
            
            // Analyze pixel buffers inside scan box
            const biometrics = model.extractBiometrics(ctx, bx, by, bw, bh);
            
            // Predict Softmax ML classifications
            const pred = model.predict(biometrics.aspectRatio, biometrics.melaninIndex, biometrics.wrinkleVariance, biometrics.dressRGB);
            
            ctx.lockedDemographics = pred;
            ctx.lockedFeatures = biometrics;
        }

        // Draw active bounding box overlays if a face is tracked
        if (ctx.lockedDemographics) {
            const pred = ctx.lockedDemographics;
            const feats = ctx.lockedFeatures;
            
            ctx.strokeStyle = 'var(--neon-green)';
            ctx.lineWidth = 2.0;
            ctx.strokeRect(bx, by, bw, bh);
            
            ctx.fillStyle = 'var(--neon-green)';
            ctx.font = '8px var(--font-hud)';
            ctx.fillText("BIOMETRIC SCANNING ACTIVE:", bx, by - 24);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px var(--font-hud)';
            ctx.fillText(`NATION: "${pred.nationality.toUpperCase()}"`, bx + 10, by - 10);
            
            // Draw features bars inside monitor feed
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(bx + 5, by + bh - 40, bw - 10, 35);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.strokeRect(bx + 5, by + bh - 40, bw - 10, 35);
            
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '6px var(--font-hud)';
            ctx.fillText(`FACE_ASPECT: ${feats.aspectRatio.toFixed(3)}`, bx + 10, by + bh - 30);
            ctx.fillText(`MELANIN_INDEX: ${(feats.melaninIndex * 100).toFixed(0)}%`, bx + 10, by + bh - 20);
            ctx.fillText(`WRINKLE_VAR: ${(feats.wrinkleVariance * 100).toFixed(0)}%`, bx + 10, by + bh - 10);
            
            // Periodic translation logging
        }
    }

    // Toggle active surveillance mode tabs
    tabPresets.addEventListener('click', () => {
        activeFeedMode = 'presets';
        uploadedImage = null; // reset image
        tabPresets.classList.add('active');
        tabWebcam.classList.remove('active');
        ctrlPresetsPanel.classList.add('active');
        ctrlWebcamPanel.classList.remove('active');
        hudFeedSource.innerText = 'BIOMETRIC_PRESETS_B';
        stopWebcamStream();
        evaluateInference();
    });

    tabWebcam.addEventListener('click', () => {
        activeFeedMode = 'webcam';
        uploadedImage = null; // reset image
        tabWebcam.classList.add('active');
        tabPresets.classList.remove('active');
        ctrlWebcamPanel.classList.add('active');
        ctrlPresetsPanel.classList.remove('active');
        hudFeedSource.innerText = 'SURVEILLANCE_CAMERA_ACTIVE';
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
                    if (isWebcamActive && ctx.lockedDemographics) {
                        const webSubject = {
                            name: "Web Locked",
                            nation: ctx.lockedDemographics.nationality,
                            emotion: ctx.lockedDemographics.emotion,
                            age: ctx.lockedDemographics.age,
                            dress: ctx.lockedDemographics.dress
                        };
                        logDemographicRecord(webSubject);
                    }
                }, 5000);
            })
            .catch(err => {
                console.error("Webcam capture connection failed:", err);
                alert("Camera access denied or device unavailable. Scanner will operate in Demographic Subject Presets mode.");
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
    // 5. Demographic Inference Evaluator & Conditional Locks
    // ---------------------------------------------------------
    function evaluateInference() {
        let pred = null;
        let biometrics = null;

        if (activeFeedMode === 'presets') {
            // Synthesize geometrical feature ratios manually representing selected preset subjects
            let aspect = 0.85;
            let melanin = 0.35;
            let wrinkles = 0.25;

            if (activePreset.nation === "Indian") {
                aspect = 0.84; melanin = 0.46; wrinkles = 0.28; // Aarav
            } else if (activePreset.nation === "United States") {
                aspect = 1.05; melanin = 0.22; wrinkles = 0.42; // John
            } else if (activePreset.nation === "African") {
                aspect = 0.86; melanin = 0.80; wrinkles = 0.15; // Kofi
            } else if (activePreset.nation === "Other") {
                aspect = 0.76; melanin = 0.32; wrinkles = 0.20; // Yuki
            }

            pred = model.predict(aspect, melanin, wrinkles, activePreset.rgb);
            biometrics = { aspectRatio: aspect, melaninIndex: melanin, wrinkleVariance: wrinkles };
        } else {
            // Webcam prediction features
            pred = ctx.lockedDemographics || model.predict(0.85, 0.35, 0.25, {r: 20, g: 70, b: 240});
            biometrics = ctx.lockedFeatures || { aspectRatio: 0.85, melaninIndex: 0.35, wrinkleVariance: 0.25 };
        }

        // Draw outcome prediction card
        resValNation.innerText = pred.nationality.toUpperCase();
        resValEmotion.innerText = pred.emotion.toUpperCase();
        
        // Swap outcome border colors based on nationality
        cardStatusLed.style.backgroundColor = "var(--neon-green)";
        cardStatusLed.style.boxShadow = "0 0 8px var(--neon-green)";

        // Enforce specific conditional demographic display logic
        // 1. AGE: Indian & US get age, African & Other have it restricted
        if (pred.age) {
            resValAge.innerText = `${pred.age} yrs`;
            resValAge.style.display = "inline";
            resLockAge.style.display = "none";
        } else {
            resValAge.style.display = "none";
            resLockAge.style.display = "inline";
        }

        // 2. DRESS COLOUR: Indian & African get dress, US & Other have it restricted
        if (pred.dress) {
            resValDress.innerText = pred.dress.name.toUpperCase();
            resValDress.style.display = "inline";
            resSwatchBox.style.backgroundColor = pred.dress.rgb;
            resSwatchBox.style.display = "inline-block";
            resLockDress.style.display = "none";
        } else {
            resValDress.style.display = "none";
            resSwatchBox.style.display = "none";
            resLockDress.style.display = "inline";
        }

        // Sync Hand Geometry Telemetry HUD bars
        syncTelemetryHUD(biometrics);
    }

    function syncTelemetryHUD(biometrics) {
        if (!biometrics) return;

        // Sync Aspect Ratio
        hudValAspect.innerText = biometrics.aspectRatio.toFixed(3);
        const aspectPct = Math.min(100, Math.max(0, (biometrics.aspectRatio / 2.0) * 100));
        hudFillAspect.style.width = `${aspectPct}%`;

        // Sync Melanin
        hudValMelanin.innerText = `${(biometrics.melaninIndex * 100).toFixed(0)}%`;
        hudFillMelanin.style.width = `${biometrics.melaninIndex * 100}%`;
        statMelaninAvg.innerText = biometrics.melaninIndex.toFixed(2);

        // Sync Wrinkles
        hudValWrinkle.innerText = `${(biometrics.wrinkleVariance * 100).toFixed(0)}%`;
        hudFillWrinkle.style.width = `${biometrics.wrinkleVariance * 100}%`;
    }

    // ---------------------------------------------------------
    // 6. Preset buttons click syncs
    // ---------------------------------------------------------
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Reset custom uploaded image
            uploadedImage = null;

            // Load presets properties
            activePreset = {
                name: btn.getAttribute('data-name'),
                nation: btn.getAttribute('data-nation'),
                emotion: btn.getAttribute('data-emotion'),
                dressColor: btn.getAttribute('data-dress'),
                rgb: {
                    r: parseInt(btn.getAttribute('data-r')),
                    g: parseInt(btn.getAttribute('data-g')),
                    b: parseInt(btn.getAttribute('data-b'))
                }
            };

            hudFeedSource.innerText = `SUBJECT_PRESET_${activePreset.name.toUpperCase()}`;

            evaluateInference();
            
            // Log demographic scan immediately when clicking presets
            logDemographicRecord({
                name: activePreset.name,
                nation: activePreset.nation,
                emotion: activePreset.emotion,
                // Simulate correct age logic for preset logging
                age: (activePreset.nation === 'Indian') ? 28 : ((activePreset.nation === 'United States') ? 68 : null),
                // Simulate correct dress logic for preset logging
                dress: (activePreset.nation === 'Indian' || activePreset.nation === 'African') ? { name: activePreset.dressColor } : null
            });
        });
    });

    // Select Hello by default
    document.getElementById('preset-1').click();

    // ---------------------------------------------------------
    // 7. Custom drag & drop image translation uploads
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
            processSubjectImage(e.dataTransfer.files[0]);
        }
    });

    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processSubjectImage(e.target.files[0]);
        }
    });

    function processSubjectImage(file) {
        hudFeedSource.innerText = file.name.toUpperCase();
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Clear active presets styling
                presetButtons.forEach(btn => btn.classList.remove('active'));
                
                // Store uploaded image reference
                uploadedImage = img;
                activeFeedMode = 'presets'; // Set presets mode, drawing logic handles it from here
                
                // Perform pixel scanning after a small timeout to let render loop execute first
                setTimeout(() => {
                    if (ctx.lockedDemographics) {
                        const pred = ctx.lockedDemographics;
                        
                        logDemographicRecord({
                            name: "Photo Upload",
                            nation: pred.nationality,
                            emotion: pred.emotion,
                            age: pred.age,
                            dress: pred.dress
                        });
                        
                        // Sync outcome card outputs directly
                        resValNation.innerText = pred.nationality.toUpperCase();
                        resValEmotion.innerText = pred.emotion.toUpperCase();
                        
                        if (pred.age) {
                            resValAge.innerText = `${pred.age} yrs`;
                            resValAge.style.display = "inline";
                            resLockAge.style.display = "none";
                        } else {
                            resValAge.style.display = "none";
                            resLockAge.style.display = "inline";
                        }

                        if (pred.dress) {
                            resValDress.innerText = pred.dress.name.toUpperCase();
                            resValDress.style.display = "inline";
                            resSwatchBox.style.backgroundColor = pred.dress.rgb;
                            resSwatchBox.style.display = "inline-block";
                            resLockDress.style.display = "none";
                        } else {
                            resValDress.style.display = "none";
                            resSwatchBox.style.display = "none";
                            resLockDress.style.display = "inline";
                        }
                    }
                }, 300);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ---------------------------------------------------------
    // 8. Database demographic logs ledger
    // ---------------------------------------------------------
    function logDemographicRecord(record) {
        const timestamp = new Date().toTimeString().split(' ')[0];

        const logRecord = {
            id: `#VIS_${logCounter++}`,
            time: timestamp,
            name: record.name,
            nation: record.nation,
            emotion: record.emotion,
            // Indian & US display age, others restricted
            age: record.age ? `${record.age} yrs` : "RESTRICTED",
            // Indian & African display dress, others restricted
            dress: record.dress ? record.dress.name.toUpperCase() : "RESTRICTED"
        };

        // Push record
        demographicLogs.unshift(logRecord);
        statTotalScans.innerText = demographicLogs.length;

        // Update database table ledger
        updateDatabaseUI();
    }

    function updateDatabaseUI() {
        if (demographicLogs.length === 0) {
            demographicTableBody.innerHTML = `<tr><td colspan="5" class="empty-table-msg">Surveillance ledger standby.</td></tr>`;
            return;
        }

        let rowsHtml = "";
        demographicLogs.forEach(v => {
            const ageColor = v.age === "RESTRICTED" ? "text-glow-red" : "text-glow-yellow";
            const dressColor = v.dress === "RESTRICTED" ? "text-glow-red" : "text-glow-gold";

            rowsHtml += `
                <tr>
                    <td class="hud-font">${v.id}</td>
                    <td class="hud-font text-glow-green">${v.nation.toUpperCase()}</td>
                    <td>${v.emotion}</td>
                    <td class="hud-font ${ageColor}">${v.age}</td>
                    <td class="hud-font ${dressColor}">${v.dress}</td>
                </tr>
            `;
        });

        demographicTableBody.innerHTML = rowsHtml;
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
});
