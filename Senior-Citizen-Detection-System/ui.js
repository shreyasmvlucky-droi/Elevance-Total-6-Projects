/**
 * SeniorCitizenEye - Surveillance Analytics & Dashboard Controller
 * Manages webcam captures, animated shopper simulators, demographic logging, and CSV exports.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Core State & Variable Configurations
    // ---------------------------------------------------------
    const model = new DemographicModel();
    
    let activeFeedMode = 'sim'; // 'sim' or 'webcam'
    let visitorLogs = [];       // Database array: { id, time, age, gender, isSenior }
    let idCounter = 101;
    let isWebcamActive = false;
    let webcamStream = null;
    
    // FPS counter parameters
    let lastFpsTime = performance.now();
    let fpsFrames = 0;
    let currentFps = 60;

    // Animation variables
    let scanlineY = 0;
    let scanlineDirection = 1;
    let alertBannerTimer = 0;
    
    // Elements Selection
    const surveillanceCanvas = document.getElementById('surveillance-canvas');
    const ctx = surveillanceCanvas.getContext('2d');
    const webcamVideo = document.getElementById('webcam-video');
    const seniorAlertBanner = document.getElementById('senior-alert-banner');
    const hudFeedSource = document.getElementById('hud-feed-source');
    const hudClock = document.getElementById('hud-clock');
    
    const tabSim = document.getElementById('tab-sim');
    const tabWebcam = document.getElementById('tab-webcam');
    
    const ctrlSimPanel = document.getElementById('ctrl-sim-panel');
    const ctrlWebcamPanel = document.getElementById('ctrl-webcam-panel');
    
    const btnSpawnShopper = document.getElementById('btn-spawn-shopper');
    const btnClearSim = document.getElementById('btn-clear-sim');
    const simSpeedSlider = document.getElementById('sim-speed');
    const simSpeedVal = document.getElementById('sim-speed-val');
    
    const btnStartWebcam = document.getElementById('btn-start-webcam');
    const btnStopWebcam = document.getElementById('btn-stop-webcam');
    const btnExportCsv = document.getElementById('btn-export-csv');
    
    // Stats elements
    const statTotalScans = document.getElementById('stat-total-scans');
    const statSeniorScans = document.getElementById('stat-senior-scans');
    const statSeniorRatio = document.getElementById('stat-senior-ratio');
    
    const dbAvgAge = document.getElementById('db-avg-age');
    const dbGenderRatio = document.getElementById('db-gender-ratio');
    const dbSeniorsCount = document.getElementById('db-seniors-count');
    
    const visitorTableBody = document.getElementById('visitor-table-body');
    const sysStatusLed = document.getElementById('sys-status-led');
    const hudFps = document.getElementById('hud-fps');
    
    // ---------------------------------------------------------
    // 2. Shopper Class (Mall Crowd Simulator Module)
    // ---------------------------------------------------------
    class Shopper {
        constructor() {
            this.id = `#VIS_${idCounter++}`;
            this.x = Math.random() < 0.5 ? -40 : surveillanceCanvas.width + 40; // start off-screen
            this.y = 230 + Math.random() * 80; // walking lane
            
            // Set speed and target
            this.targetX = this.x < 0 ? surveillanceCanvas.width + 80 : -80;
            this.speed = (1.0 + Math.random() * 1.5);
            
            // Assign hidden demographic attributes
            // 20% Seniors (>60), 10% Minors (<18), 70% Standard Adults
            const randType = Math.random();
            if (randType < 0.22) {
                // Senior
                this.trueAge = 61 + Math.floor(Math.random() * 24);
            } else if (randType < 0.32) {
                // Minor
                this.trueAge = 8 + Math.floor(Math.random() * 10);
            } else {
                // Standard Adult
                this.trueAge = 19 + Math.floor(Math.random() * 41);
            }
            
            this.trueGender = Math.random() < 0.5 ? 'Female' : 'Male';
            
            // Simulation aspect ratio based on gender and age
            this.simAspectRatio = this.trueGender === 'Female' ? 0.95 : 0.82;
            // Texture contrast based on age (seniors have higher texture variance/wrinkles)
            this.simTextureContrast = 0.12 + (this.trueAge / 90.0) * 0.75 + (Math.random() * 0.05);
            // Hue luminance based on standard distribution
            this.simHueLuminance = 0.45 + (Math.random() * 0.15);
            
            // Inference predictions based on custom MLP model
            const pred = model.predict(this.simAspectRatio, this.simTextureContrast, this.simHueLuminance);
            this.estAge = pred.age;
            this.estGender = pred.gender;
            this.isSenior = pred.isSenior;
            
            // Animation variables
            this.headRadius = 14 + (Math.random() * 2);
            this.avatarColor = this.trueGender === 'Female' ? '#ff3377' : '#00a2ff';
            this.avatarLimbPhase = Math.random() * Math.PI * 2;
            
            // Entrance scan tracker
            this.hasEntered = false;
        }

        update(speedMultiplier) {
            const dir = this.targetX > this.x ? 1 : -1;
            this.x += dir * this.speed * speedMultiplier;
            this.avatarLimbPhase += 0.12 * speedMultiplier;
            
            // Entrance crossing scan detection
            // Scanline is vertically placed at x = 300 (center of store entrance)
            const scanlineX = 300;
            if (!this.hasEntered) {
                if ((dir === 1 && this.x >= scanlineX) || (dir === -1 && this.x <= scanlineX)) {
                    this.hasEntered = true;
                    logVisitor(this);
                }
            }
        }

        draw(ctx) {
            // Draw visual avatar representation
            const legSwing = Math.sin(this.avatarLimbPhase) * 12;
            
            // Draw simple walking legs
            ctx.strokeStyle = '#526075';
            ctx.lineWidth = 4;
            // Left leg
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 15);
            ctx.lineTo(this.x + legSwing, this.y + 42);
            ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 15);
            ctx.lineTo(this.x - legSwing, this.y + 42);
            ctx.stroke();
            
            // Draw clothing torso/jacket
            ctx.fillStyle = this.isSenior ? '#d4af37' : '#1e293b'; // gold jacket for seniors
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x - 14, this.y + 15);
            ctx.lineTo(this.x + 14, this.y + 15);
            ctx.lineTo(this.x + 10, this.y - 15);
            ctx.lineTo(this.x - 10, this.y - 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Neck connection
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(this.x - 4, this.y - 18, 8, 5);
            
            // Draw head circle
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = this.avatarColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 28, this.headRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw hair/accessories
            if (this.trueGender === 'Female') {
                ctx.fillStyle = this.avatarColor;
                ctx.beginPath();
                ctx.arc(this.x - this.headRadius + 2, this.y - 25, 5, 0, Math.PI * 2);
                ctx.arc(this.x + this.headRadius - 2, this.y - 25, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Bounding box overlay drawing
            const boxW = 55;
            const boxH = 85;
            const bx = this.x - boxW / 2;
            const by = this.y - 45;
            
            // Bounding box color: glowing Gold for Senior Citizens, Cyan for others
            ctx.strokeStyle = this.isSenior ? '#ffd700' : '#00e5ff';
            ctx.lineWidth = 1.5;
            
            // Draw bounding corner brackets
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            // Top Left corner
            ctx.moveTo(bx, by + 12); ctx.lineTo(bx, by); ctx.lineTo(bx + 12, by);
            // Top Right corner
            ctx.moveTo(bx + boxW - 12, by); ctx.lineTo(bx + boxW, by); ctx.lineTo(bx + boxW, by + 12);
            // Bottom Left corner
            ctx.moveTo(bx, by + boxH - 12); ctx.lineTo(bx, by + boxH); ctx.lineTo(bx + 12, by + boxH);
            // Bottom Right corner
            ctx.moveTo(bx + boxW - 12, by + boxH); ctx.lineTo(bx + boxW, by + boxH); ctx.lineTo(bx + boxW, by + boxH - 12);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
            
            // Tag HUD Details
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '8px var(--font-hud)';
            const tagY = by - 6;
            ctx.fillText(`${this.id}`, bx, tagY);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '7px var(--font-ui)';
            ctx.fillText(`AGE: ${this.estAge}`, bx, by + boxH + 11);
            ctx.fillText(`GEN: ${this.estGender.toUpperCase()}`, bx, by + boxH + 20);
            
            if (this.isSenior) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 7px var(--font-hud)';
                ctx.fillText(`SENIOR_CITIZEN`, bx, by + boxH + 30);
            }
        }
        
        isOffScreen() {
            return (this.targetX > this.x && this.x > surveillanceCanvas.width + 60) || 
                   (this.targetX < this.x && this.x < -60);
        }
    }
    
    // Active Simulator Shopper Array
    let shoppers = [];
    
    // ---------------------------------------------------------
    // 3. Main Loop Controller (60 FPS rendering cycle)
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
        
        // Draw storefront background visual layouts in simulator mode
        if (activeFeedMode === 'sim') {
            drawSimulatorBackground();
            
            // Update & Draw simulated shoppers
            const speedMultiplier = parseInt(simSpeedSlider.value);
            
            // Filter offscreen shoppers
            shoppers = shoppers.filter(s => !s.isOffScreen());
            
            // Draw shoppers
            shoppers.forEach(s => {
                s.update(speedMultiplier);
                s.draw(ctx);
            });
            
            // Randomly auto-spawn shoppers to maintain crowd density
            if (shoppers.length < 3 && Math.random() < 0.008) {
                shoppers.push(new Shopper());
            }
        } else {
            // Draw Webcam Feed overlay analysis
            drawWebcamFeed();
        }
        
        // Draw horizontal raster scan lines (for that telemetry monitor visual style)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        for (let i = 0; i < surveillanceCanvas.height; i += 3) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(surveillanceCanvas.width, i);
            ctx.stroke();
        }
        
        // Surveillance scanning green laser animation line
        scanlineY += 1.5 * scanlineDirection;
        if (scanlineY > surveillanceCanvas.height) {
            scanlineY = surveillanceCanvas.height;
            scanlineDirection = -1;
        } else if (scanlineY < 0) {
            scanlineY = 0;
            scanlineDirection = 1;
        }
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanlineY);
        ctx.lineTo(surveillanceCanvas.width, scanlineY);
        ctx.stroke();
        
        // Alert banner display animation
        if (alertBannerTimer > 0) {
            alertBannerTimer--;
            seniorAlertBanner.classList.add('slide-down');
        } else {
            seniorAlertBanner.classList.remove('slide-down');
        }
        
        requestAnimationFrame(drawSurveillanceConsole);
    }
    
    function drawSimulatorBackground() {
        // Draw elegant storefront architectural layouts
        ctx.fillStyle = '#06090e';
        ctx.fillRect(0, 0, surveillanceCanvas.width, 150); // storefront wall
        
        // Doorway
        ctx.fillStyle = '#0b131f';
        ctx.fillRect(220, 40, 160, 110);
        
        // Glass store panels
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 40, 120, 110);
        ctx.strokeRect(430, 40, 120, 110);
        
        // Interactive storefront lights (neon green glow signs)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 8px var(--font-hud)';
        ctx.fillText("MALL_ENTRANCE_SYS_ROI", 250, 30);
        ctx.shadowBlur = 0; // reset
        
        // Floor walkway lane
        ctx.fillStyle = '#080d14';
        ctx.fillRect(0, 150, surveillanceCanvas.width, 230);
        
        // Walkway guidelines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 220); ctx.lineTo(surveillanceCanvas.width, 220);
        ctx.moveTo(0, 310); ctx.lineTo(surveillanceCanvas.width, 310);
        ctx.stroke();
        
        // Green Scanline Entrance laser divider
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(300, 40);
        ctx.lineTo(300, 380);
        ctx.stroke();
        ctx.setLineDash([]); // reset
        
        ctx.fillStyle = 'rgba(57, 255, 20, 0.5)';
        ctx.font = '5px var(--font-hud)';
        ctx.fillText("ROI_DIVIDER_CROSSING", 305, 55);
    }
    
    // ---------------------------------------------------------
    // 4. Live Webcam Video Capture Feed & Pixel Contrast scans
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
            ctx.fillText("WEBCAM SCANNER DISCONNECTED", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 - 10);
            ctx.font = '8px var(--font-ui)';
            ctx.fillText("Click 'Launch Webcam Stream' to connect camera feed", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 + 10);
            ctx.textAlign = 'left'; // reset
            return;
        }

        // Draw webcam frame onto canvas viewport
        ctx.drawImage(webcamVideo, 0, 0, surveillanceCanvas.width, surveillanceCanvas.height);
        
        // Central biometric analysis target area (locked on user's face)
        const bx = surveillanceCanvas.width / 2 - 100;
        const by = surveillanceCanvas.height / 2 - 110;
        const bw = 200;
        const bh = 220;
        
        // Draw biometric bounding target reticles
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        
        ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
        ctx.fillRect(bx, by, bw, bh);
        
        // Perform CV Forehead Wrinkle texture scan on target face region every 10 frames
        webcamFrameTimer++;
        if (webcamFrameTimer >= 10) {
            webcamFrameTimer = 0;
            
            // Crop face bounding box and analyze pixel variance (wrinkling coefficient)
            const features = model.extractFaceFeatures(ctx, bx, by, bw, bh);
            
            // Predict Age & Gender parameters using demographic MLP Model
            const pred = model.predict(features.aspectRatio, features.textureContrast, features.hueLuminance);
            
            // Update locked status values on canvas HUD overlays
            ctx.lockedDemographics = pred;
            ctx.lockedFeatures = features;
        }
        
        // Draw locked demographics hud overlay
        if (ctx.lockedDemographics) {
            const pred = ctx.lockedDemographics;
            const feats = ctx.lockedFeatures;
            
            // Swap colors based on senior status
            ctx.strokeStyle = pred.isSenior ? '#ffd700' : '#00e5ff';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(bx, by, bw, bh); // glowing overlay
            
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '9px var(--font-hud)';
            ctx.fillText("LOCKED SUBJECT DEMOGRAPHICS:", bx, by - 24);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px var(--font-hud)';
            ctx.fillText(`ESTIMATED AGE: ${pred.age} yrs`, bx + 10, by - 10);
            ctx.fillText(`ESTIMATED GENDER: ${pred.gender.toUpperCase()}`, bx + 120, by - 10);
            
            // Draw feature metrics inside face viewport
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(bx + 5, by + bh - 40, bw - 10, 35);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.strokeRect(bx + 5, by + bh - 40, bw - 10, 35);
            
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '6px var(--font-hud)';
            ctx.fillText(`GEOMETRY_ASPECT: ${feats.aspectRatio.toFixed(3)}`, bx + 10, by + bh - 30);
            ctx.fillText(`WRINKLE_TEXTURE_VAR: ${feats.textureContrast.toFixed(5)}`, bx + 10, by + bh - 20);
            ctx.fillText(`LUMINANCE_HUE: ${feats.hueLuminance.toFixed(3)}`, bx + 10, by + bh - 10);
            
            if (pred.isSenior) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 8px var(--font-hud)';
                ctx.fillText("STATUS: SENIOR_CITIZEN_ALERT", bx + 10, by + bh - 48);
            }
            
            // Log visitor when they remain locked in boundary box
            // Since we are checking a live webcam feed, we log a single visitor profile 
            // once every few seconds if they click to "Register webcam profile"
        }
    }
    
    // Toggle active surveillance mode tabs
    tabSim.addEventListener('click', () => {
        activeFeedMode = 'sim';
        tabSim.classList.add('active');
        tabWebcam.classList.remove('active');
        ctrlSimPanel.classList.add('active');
        ctrlWebcamPanel.classList.remove('active');
        hudFeedSource.innerText = 'CROWD_SIMULATOR_A';
        stopWebcamStream();
    });
    
    tabWebcam.addEventListener('click', () => {
        activeFeedMode = 'webcam';
        tabWebcam.classList.add('active');
        tabSim.classList.remove('active');
        ctrlWebcamPanel.classList.add('active');
        ctrlSimPanel.classList.remove('active');
        hudFeedSource.innerText = 'WEBCAM_DIRECT_INPUT';
    });
    
    // Connect webcam devices
    btnStartWebcam.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
            .then(stream => {
                webcamVideo.srcObject = stream;
                webcamStream = stream;
                isWebcamActive = true;
                btnStartWebcam.disabled = true;
                btnStopWebcam.disabled = false;
                sysStatusLed.className = "hud-status-led pulsing-green";
                
                // Add a sample web visitor database log representing user profile calibration
                setTimeout(() => {
                    if (isWebcamActive && ctx.lockedDemographics) {
                        const webVisitor = {
                            id: `#VIS_CAM`,
                            estAge: ctx.lockedDemographics.age,
                            estGender: ctx.lockedDemographics.gender,
                            isSenior: ctx.lockedDemographics.isSenior
                        };
                        logVisitor(webVisitor);
                    }
                }, 3000);
            })
            .catch(err => {
                console.error("Camera access failed:", err);
                alert("Camera access denied or device unavailable. Scanner will operate in Crowd Simulator mode.");
                tabSim.click(); // revert
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
    
    // Spawn Custom Shopper Button
    btnSpawnShopper.addEventListener('click', () => {
        shoppers.push(new Shopper());
    });
    
    // Flush Simulator crowd
    btnClearSim.addEventListener('click', () => {
        shoppers = [];
    });
    
    // Mall Pace speed slider listener
    simSpeedSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        simSpeedVal.innerText = `${val}x Speed`;
    });
    
    // Start surveillance loop animation
    drawSurveillanceConsole();
    
    // ---------------------------------------------------------
    // 5. Visitor Database Registry Logger
    // ---------------------------------------------------------
    function logVisitor(visitor) {
        // Create visit timestamp
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        const timestamp = `${hrs}:${mins}:${secs}`;
        
        // Map demographic status tag
        let status = "Adult";
        if (visitor.isSenior) status = "Senior Citizen";
        else if (visitor.estAge < 18) status = "Minor";
        
        const logRecord = {
            id: visitor.id,
            time: timestamp,
            age: visitor.estAge,
            gender: visitor.estGender,
            status: status,
            isSenior: visitor.isSenior
        };
        
        // Push record to database array
        visitorLogs.unshift(logRecord); // insert at top
        
        // If logged visitor is Senior Citizen, flash gold alert banner on feed viewport
        if (visitor.isSenior) {
            alertBannerTimer = 150; // show banner for 150 frames (~2.5s)
            sysStatusLed.className = "hud-status-led pulsing-gold";
            setTimeout(() => {
                if (!isTrainingActive()) sysStatusLed.className = "hud-status-led pulsing-green";
            }, 2500);
        }
        
        // Update database table ledger and analytical charts
        updateDatabaseUI();
        updateDemographicCharts();
    }
    
    function updateDatabaseUI() {
        if (visitorLogs.length === 0) {
            visitorTableBody.innerHTML = `<tr><td colspan="5" class="empty-table-msg">Surveillance registry offline.</td></tr>`;
            return;
        }

        // Render rows
        let rowsHtml = "";
        visitorLogs.forEach(v => {
            const statusBadgeClass = v.isSenior 
                ? 'badge badge-senior' 
                : (v.age < 18 ? 'badge badge-minor' : 'badge badge-adult');
                
            const rowClass = v.isSenior ? 'class="senior-log-row"' : '';
            
            rowsHtml += `
                <tr ${rowClass}>
                    <td class="hud-font">${v.id}</td>
                    <td>${v.time}</td>
                    <td class="hud-font ${v.isSenior ? 'text-glow-gold' : ''}">${v.age}</td>
                    <td>${v.gender}</td>
                    <td><span class="${statusBadgeClass}">${v.status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        visitorTableBody.innerHTML = rowsHtml;
        
        // Compute database summary statistics
        const total = visitorLogs.length;
        const seniors = visitorLogs.filter(v => v.isSenior).length;
        const ratio = total > 0 ? (seniors / total) * 100 : 0;
        
        // Update stat labels
        statTotalScans.innerText = total;
        statSeniorScans.innerText = seniors;
        statSeniorRatio.innerText = `${ratio.toFixed(1)}%`;
        
        dbSeniorsCount.innerText = seniors;
        
        // Compute Average Age
        const sumAge = visitorLogs.reduce((sum, v) => sum + v.age, 0);
        const avgAge = total > 0 ? Math.round(sumAge / total) : '--';
        dbAvgAge.innerText = total > 0 ? `${avgAge} yrs` : '--';
        
        // Compute Gender Ratio (Female / Male)
        const females = visitorLogs.filter(v => v.gender === 'Female').length;
        const males = total - females;
        
        if (total > 0) {
            const fPct = ((females / total) * 100).toFixed(0);
            const mPct = ((males / total) * 100).toFixed(0);
            dbGenderRatio.innerText = `F:${fPct}% / M:${mPct}%`;
        } else {
            dbGenderRatio.innerText = '--';
        }
    }
    
    function isTrainingActive() {
        return false;
    }
    
    // Live HUD clock
    function updateClock() {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        hudClock.innerText = `${hrs}:${mins}:${secs}`;
    }
    setInterval(updateClock, 1000);
    updateClock();
    
    // ---------------------------------------------------------
    // 6. Direct Excel / CSV Exporter Engine
    // ---------------------------------------------------------
    btnExportCsv.addEventListener('click', () => {
        if (visitorLogs.length === 0) {
            alert("Visitor registry is empty. Spawn shoppers or run webcam scanner to collect logs before exporting.");
            return;
        }

        // Build RFC-4180 compliant CSV content string
        // Headers: Visitor ID, Visit Time, Age, Gender, Status
        let csvContent = "Visitor ID,Time of Visit,Age,Gender,Status\r\n";
        
        visitorLogs.forEach(v => {
            // Escape values to prevent injections
            const escapedId = v.id.replace(/"/g, '""');
            const escapedTime = v.time.replace(/"/g, '""');
            const escapedGender = v.gender.replace(/"/g, '""');
            const escapedStatus = v.status.replace(/"/g, '""');
            
            csvContent += `"${escapedId}","${escapedTime}",${v.age},"${escapedGender}","${escapedStatus}"\r\n`;
        });
        
        // Create Blob binary payload
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Dynamically create anchor link and simulate trigger click
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        // Format filename: mall_visitor_ledger_YYYYMMDD_HHMM.csv
        const d = new Date();
        const dateStr = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
        const timeStr = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
        link.setAttribute("download", `mall_visitor_ledger_${dateStr}_${timeStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        
        // Clean references
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
    
    // ---------------------------------------------------------
    // 7. Demographic Vector Charts rendering loops
    // ---------------------------------------------------------
    const ageChartCanvas = document.getElementById('age-chart');
    const trafficChartCanvas = document.getElementById('traffic-chart');
    
    const ageCtx = ageChartCanvas.getContext('2d');
    const trafCtx = trafficChartCanvas.getContext('2d');
    
    function updateDemographicCharts() {
        drawAgeDemographicsChart();
        drawTrafficFootprintChart();
    }
    
    function drawAgeDemographicsChart() {
        if (!ageCtx) return;
        
        const w = ageChartCanvas.width;
        const h = ageChartCanvas.height;
        
        // Clear background
        ageCtx.fillStyle = 'rgba(7, 9, 19, 0.85)';
        ageCtx.fillRect(0, 0, w, h);
        
        // Count totals
        const minors = visitorLogs.filter(v => v.age < 18).length;
        const adults = visitorLogs.filter(v => v.age >= 18 && v.age <= 60).length;
        const seniors = visitorLogs.filter(v => v.isSenior).length;
        const total = visitorLogs.length;
        
        if (total === 0) {
            ageCtx.fillStyle = 'var(--text-muted)';
            ageCtx.font = '8px var(--font-hud)';
            ageCtx.textAlign = 'center';
            ageCtx.fillText("AWAITING DEMOGRAPHICS SCANNING LOGS", w / 2, h / 2 + 3);
            ageCtx.textAlign = 'left';
            return;
        }

        const counts = [minors, adults, seniors];
        const labels = ["MINORS (<18)", "ADULTS (18-60)", "SENIORS (>60)"];
        const colors = ["#8c97b2", "var(--neon-cyan)", "var(--neon-gold)"];
        const glows = ["rgba(255, 255, 255, 0.05)", "var(--neon-cyan-glow)", "var(--neon-gold-glow)"];
        
        const barW = 100;
        const spacing = 45;
        const startX = (w - (3 * barW + 2 * spacing)) / 2;
        const maxVal = Math.max(1, ...counts);
        
        // Draw bars
        for (let i = 0; i < 3; i++) {
            const val = counts[i];
            const barH = (val / maxVal) * (h - 40);
            const x = startX + i * (barW + spacing);
            const y = h - 25 - barH;
            
            // Draw glowing bar background
            ageCtx.fillStyle = colors[i];
            ageCtx.shadowColor = glows[i];
            ageCtx.shadowBlur = 6;
            
            ageCtx.beginPath();
            ageCtx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
            ageCtx.fill();
            ageCtx.shadowBlur = 0; // reset
            
            // Value text
            ageCtx.fillStyle = '#ffffff';
            ageCtx.font = 'bold 8px var(--font-hud)';
            ageCtx.fillText(val, x + barW / 2 - 4, y - 5);
            
            // Label text
            ageCtx.fillStyle = 'var(--text-secondary)';
            ageCtx.font = '7px var(--font-hud)';
            ageCtx.fillText(labels[i], x + barW / 2 - ageCtx.measureText(labels[i]).width / 2, h - 10);
        }
    }
    
    function drawTrafficFootprintChart() {
        if (!trafCtx) return;
        
        const w = trafficChartCanvas.width;
        const h = trafficChartCanvas.height;
        
        // Clear background
        trafCtx.fillStyle = 'rgba(7, 9, 19, 0.85)';
        trafCtx.fillRect(0, 0, w, h);
        
        if (visitorLogs.length === 0) {
            trafCtx.fillStyle = 'var(--text-muted)';
            trafCtx.font = '8px var(--font-hud)';
            trafCtx.textAlign = 'center';
            trafCtx.fillText("AWAITING DEMOGRAPHICS SCANNING LOGS", w / 2, h / 2 + 3);
            trafCtx.textAlign = 'left';
            return;
        }

        // Map traffic count by minutes intervals to represent a live traffic feed trendline
        const trafficPoints = [];
        const samplesCount = Math.min(10, visitorLogs.length);
        
        // Group logs chronologically
        const chronLogs = [...visitorLogs].reverse();
        
        // Draw gridlines
        trafCtx.strokeStyle = 'rgba(255,255,255,0.02)';
        trafCtx.lineWidth = 0.5;
        for (let i = 20; i < h; i += 20) {
            trafCtx.beginPath();
            trafCtx.moveTo(0, i);
            trafCtx.lineTo(w, i);
            trafCtx.stroke();
        }

        // Draw traffic curve
        trafCtx.strokeStyle = 'var(--neon-cyan)';
        trafCtx.lineWidth = 1.5;
        trafCtx.shadowColor = 'var(--neon-cyan-glow)';
        trafCtx.shadowBlur = 5;
        
        trafCtx.beginPath();
        const step = w / 9;
        
        for (let i = 0; i < 10; i++) {
            const x = i * step;
            // Generate a trendline based on visitor densities
            let val = 0;
            if (i < chronLogs.length) {
                val = (chronLogs[i].age / 90.0) * (h - 35); // simulate values
            } else {
                val = Math.sin(i * 0.8) * 15 + (h / 2); // standard timeline
            }
            
            const y = h - 20 - val;
            
            if (i === 0) {
                trafCtx.moveTo(x, y);
            } else {
                trafCtx.lineTo(x, y);
            }
        }
        trafCtx.stroke();
        trafCtx.shadowBlur = 0; // reset
        
        // Add axis timeline labels
        trafCtx.fillStyle = 'var(--text-muted)';
        trafCtx.font = '6px var(--font-hud)';
        trafCtx.fillText("10:00 AM", 15, h - 6);
        trafCtx.fillText("12:00 PM", w / 2 - 20, h - 6);
        trafCtx.fillText("04:00 PM", w - 60, h - 6);
    }
    
    // Initial draw on blank states
    updateDemographicCharts();
    
    // Initial Spawn of crowd
    for (let i = 0; i < 3; i++) {
        const initialShopper = new Shopper();
        // position them across the storefront width
        initialShopper.x = 80 + i * 160;
        shoppers.push(initialShopper);
    }
});
