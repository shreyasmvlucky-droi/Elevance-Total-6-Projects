/**
 * TrafficEyeNet - Surveillance GUI & Visual Traffic Simulator
 * Coordinates intersection simulator loops, image preview uploads, and database ledgers.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Initial State Configurations
    // ---------------------------------------------------------
    const cvModel = new TrafficColorModel();

    let activeFeedMode = 'sim'; // 'sim' or 'uploader'
    let trafficLogs = [];       // Ledger array: { id, type, details, rectColor }
    let logCounter = 101;
    let carCounter = 1;
    let personCounter = 1;

    // Traffic Signal State
    let signalLight = 'RED'; // 'RED' or 'GREEN'
    let signalTimer = 0;

    // FPS parameters
    let lastFpsTime = performance.now();
    let fpsFrames = 0;
    let currentFps = 60;

    // Viewport Elements
    const surveillanceCanvas = document.getElementById('surveillance-canvas');
    const ctx = surveillanceCanvas.getContext('2d');
    const peopleAlertBanner = document.getElementById('people-alert-banner');
    const hudFeedSource = document.getElementById('hud-feed-source');
    const hudClock = document.getElementById('hud-clock');

    const tabSim = document.getElementById('tab-sim');
    const tabUploader = document.getElementById('tab-uploader');
    const ctrlSimPanel = document.getElementById('ctrl-sim-panel');
    const ctrlUploaderPanel = document.getElementById('ctrl-uploader-panel');
    const presetsCard = document.getElementById('presets-card');

    // Controls
    const btnSpawnBlue = document.getElementById('btn-spawn-blue');
    const btnSpawnOther = document.getElementById('btn-spawn-other');
    const btnSpawnPeople = document.getElementById('btn-spawn-people');
    const btnToggleLight = document.getElementById('btn-toggle-light');
    const imageFileInput = document.getElementById('image-file-input');
    const imageDropZone = document.getElementById('image-drop-zone');

    const presetButtons = document.querySelectorAll('.preset-btn');

    // Stats HUD Elements
    const statSignalStatus = document.getElementById('stat-signal-status');
    const statTotalCars = document.getElementById('stat-total-cars');
    const statTotalPeople = document.getElementById('stat-total-people');
    
    const hudCountBlue = document.getElementById('hud-count-blue');
    const hudCountOther = document.getElementById('hud-count-other');
    const hudCountPeople = document.getElementById('hud-count-people');

    const pedestrianStatusCard = document.getElementById('pedestrian-status-card');
    const pscLed = document.getElementById('psc-led');
    const pscValText = document.getElementById('psc-val-text');
    const trafficTableBody = document.getElementById('traffic-table-body');
    const sysStatusLed = document.getElementById('sys-status-led');
    const hudFps = document.getElementById('hud-fps');

    // Currently uploaded image reference
    let uploadedImageElement = null;
    let uploadedImageObjects = null;

    // ---------------------------------------------------------
    // 2. SimVehicle & SimPedestrian Classes (Intersection Simulator)
    // ---------------------------------------------------------
    class SimVehicle {
        constructor(forcedColor = null) {
            this.id = `#CAR_${carCounter++}`;
            this.x = -80; // start offscreen
            this.y = 195 + Math.random() * 15; // horizontal traffic lane
            this.w = 58;
            this.h = 30;
            this.speed = 1.6 + Math.random() * 1.2;
            
            // Random vehicle colors pool
            const colors = [
                { name: "Blue", rgb: "rgb(0, 70, 240)", r: 0, g: 70, b: 240 },
                { name: "Red", rgb: "rgb(230, 20, 50)", r: 230, g: 20, b: 50 },
                { name: "Yellow", rgb: "rgb(240, 220, 10)", r: 240, g: 220, b: 10 },
                { name: "White", rgb: "rgb(245, 245, 245)", r: 245, g: 245, b: 245 },
                { name: "Silver", rgb: "rgb(180, 185, 190)", r: 180, g: 185, b: 190 },
                { name: "Green", rgb: "rgb(20, 180, 50)", r: 20, g: 180, b: 50 }
            ];

            if (forcedColor === 'blue') {
                this.color = colors[0];
            } else if (forcedColor === 'other') {
                this.color = colors[1 + Math.floor(Math.random() * 5)];
            } else {
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            // Classify color using model.js HSV engine
            this.classif = cvModel.classifyCarColor(this.color.r, this.color.g, this.color.b);
            
            // Entrance log gate tracker
            this.hasEntered = false;
        }

        update() {
            // Check stopping line at x = 230 if traffic signal is RED
            const stopLineX = 230;
            if (signalLight === 'RED' && this.x + this.w < stopLineX && this.x + this.w + 15 > stopLineX) {
                // Stop at line
                this.x = stopLineX - this.w;
            } else {
                // Drive forward
                this.x += this.speed;
            }

            // Log entry crossing crosswalk center (x = 350)
            const scanlineX = 350;
            if (!this.hasEntered && this.x >= scanlineX) {
                this.hasEntered = true;
                logTrafficObject({
                    type: "Car",
                    details: `${this.color.name} Car`,
                    rectColor: this.classif.isBlue ? "Red (Blue Car)" : "Blue (Other Car)"
                });
            }
        }

        draw(ctx) {
            // Draw visual vehicle shape
            ctx.fillStyle = this.color.rgb;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            // Windshield/Cabin
            ctx.fillStyle = '#0b131f';
            ctx.fillRect(this.x + 12, this.y + 3, this.w - 24, this.h - 6);
            
            // Wheels
            ctx.fillStyle = '#020305';
            ctx.fillRect(this.x + 8, this.y - 2, 10, 3);
            ctx.fillRect(this.x + this.w - 18, this.y - 2, 10, 3);
            ctx.fillRect(this.x + 8, this.y + this.h - 1, 10, 3);
            ctx.fillRect(this.x + this.w - 18, this.y + this.h - 1, 10, 3);
            
            // Headlights
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.x + this.w - 2, this.y + 4, 3, 4);
            ctx.fillRect(this.x + this.w - 2, this.y + this.h - 8, 3, 4);

            // Bounding Box Rectangle Overlay
            // RULE: Red rectangle for Blue cars, Blue rectangle for other cars
            ctx.strokeStyle = this.classif.boxColor;
            ctx.lineWidth = 2.0;
            ctx.shadowColor = this.classif.boxGlow;
            ctx.shadowBlur = 6;
            ctx.strokeRect(this.x - 3, this.y - 4, this.w + 6, this.h + 8);
            ctx.shadowBlur = 0; // reset

            // Bounding Box Label
            ctx.fillStyle = this.classif.boxColor;
            ctx.font = 'bold 8px var(--font-hud)';
            ctx.fillText(`${this.id} [${this.color.name.toUpperCase()}]`, this.x - 2, this.y - 8);
        }

        isOffScreen() {
            return this.x > surveillanceCanvas.width + 100;
        }
    }

    class SimPedestrian {
        constructor() {
            this.id = `#PED_${personCounter++}`;
            this.x = 330 + Math.random() * 30; // centered in crosswalk width
            this.y = -30; // start offscreen top
            this.speed = 1.0 + Math.random() * 0.5;
            this.avatarLimbPhase = Math.random() * Math.PI * 2;
            
            this.headRadius = 6;
            this.avatarColor = '#39ff14'; // glowing green
            this.hasEntered = false;
        }

        update() {
            // Pedestrians walk vertically down crosswalk
            this.y += this.speed;
            this.avatarLimbPhase += 0.08;

            // Entrance crossing log
            const scanlineY = 180;
            if (!this.hasEntered && this.y >= scanlineY) {
                this.hasEntered = true;
                logTrafficObject({
                    type: "Person",
                    details: "Pedestrian at Signal",
                    rectColor: "Green (Pedestrian)"
                });
            }
        }

        draw(ctx) {
            const legSwing = Math.sin(this.avatarLimbPhase) * 6;

            ctx.save();
            ctx.strokeStyle = '#526074';
            ctx.lineWidth = 2.5;

            // Simple walking legs
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 10);
            ctx.lineTo(this.x + legSwing, this.y + 24);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 10);
            ctx.lineTo(this.x - legSwing, this.y + 24);
            ctx.stroke();

            // Torso
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(this.x - 5, this.y - 10, 10, 20);

            // Head
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = this.avatarColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 16, this.headRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Bounding Box Rectangle Overlay (Green Box for Pedestrians)
            const boxW = 20;
            const boxH = 48;
            const bx = this.x - boxW / 2;
            const by = this.y - 25;

            ctx.strokeStyle = '#39ff14'; // Green Bounding Box
            ctx.lineWidth = 1.5;
            ctx.shadowColor = 'rgba(57, 255, 20, 0.3)';
            ctx.shadowBlur = 5;
            ctx.strokeRect(bx, by, boxW, boxH);
            ctx.shadowBlur = 0; // reset

            // Bounding label
            ctx.fillStyle = '#39ff14';
            ctx.font = '6px var(--font-hud)';
            ctx.fillText("PEDESTRIAN", bx - 2, by - 6);
        }

        isOffScreen() {
            return this.y > surveillanceCanvas.height + 40;
        }
    }

    // Active arrays
    let simVehicles = [];
    let simPedestrians = [];

    // ---------------------------------------------------------
    // 3. Surveillance Monitor Viewport loop (60 FPS)
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
        
        if (activeFeedMode === 'sim') {
            // Draw intersection background
            drawIntersectionBackground();

            // Filter offscreen objects
            simVehicles = simVehicles.filter(v => !v.isOffScreen());
            simPedestrians = simPedestrians.filter(p => !p.isOffScreen());

            // Auto-toggles signal lights cycles periodically
            signalTimer++;
            if (signalTimer > 350) { // change light every ~6 seconds
                signalTimer = 0;
                toggleSignalLight();
            }

            // Auto-spawn vehicles to maintain lane density
            if (simVehicles.length < 3 && Math.random() < 0.007) {
                simVehicles.push(new SimVehicle());
            }
            // Auto-spawn pedestrians only when light is RED
            if (signalLight === 'RED' && simPedestrians.length < 3 && Math.random() < 0.015) {
                simPedestrians.push(new SimPedestrian());
            }

            // Update & Draw vehicles
            simVehicles.forEach(v => {
                v.update();
                v.draw(ctx);
            });

            // Update & Draw pedestrians
            simPedestrians.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            // Synchronize Live HUD and database summaries
            syncLiveHUD(simVehicles, simPedestrians);
        } else {
            // Uploader Scanner Image Preview mode
            drawUploadedImageScanner();
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

    function drawIntersectionBackground() {
        // Draw asphalt roads
        ctx.fillStyle = '#06080d';
        ctx.fillRect(0, 180, surveillanceCanvas.width, 65); // Horizontal main road
        
        ctx.fillStyle = '#080a10';
        ctx.fillRect(320, 0, 70, surveillanceCanvas.height); // Vertical pedestrian crosswalk road
        
        // Horizontal road lane divider dashed line
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 212);
        ctx.lineTo(surveillanceCanvas.width, 212);
        ctx.stroke();
        ctx.setLineDash([]); // reset
        
        // Stop Line mark before crosswalk
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(230, 180);
        ctx.lineTo(230, 245);
        ctx.stroke();
        
        // Zebra Crosswalk stripes
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85;
        const stripeW = 6;
        const stripeGap = 6;
        for (let y = 185; y < 240; y += stripeW + stripeGap) {
            ctx.fillRect(325, y, 60, stripeW);
        }
        ctx.globalAlpha = 1.0; // reset
        
        // Draw Traffic Signal light post
        const lightX = 220;
        const lightY = 120;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lightX - 4, lightY, 8, 60); // pole
        ctx.fillRect(lightX - 10, lightY - 30, 20, 30); // box housing
        
        // Pulsing LEDs
        ctx.fillStyle = signalLight === 'RED' ? 'var(--neon-red)' : '#070a0f';
        if (signalLight === 'RED') {
            ctx.shadowColor = 'var(--neon-red)';
            ctx.shadowBlur = 8;
        }
        ctx.beginPath(); ctx.arc(lightX, lightY - 20, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; // reset
        
        ctx.fillStyle = signalLight === 'GREEN' ? 'var(--neon-green)' : '#070a0f';
        if (signalLight === 'GREEN') {
            ctx.shadowColor = 'var(--neon-green)';
            ctx.shadowBlur = 8;
        }
        ctx.beginPath(); ctx.arc(lightX, lightY - 10, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    // Toggle signal light state
    function toggleSignalLight() {
        if (signalLight === 'RED') {
            signalLight = 'GREEN';
            statSignalStatus.innerText = 'GREEN';
            statSignalStatus.className = 'hud-val text-glow-green';
            sysStatusLed.className = "hud-status-led pulsing-green";
        } else {
            signalLight = 'RED';
            statSignalStatus.innerText = 'RED';
            statSignalStatus.className = 'hud-val text-glow-red';
            sysStatusLed.className = "hud-status-led pulsing-red";
        }
    }

    // ---------------------------------------------------------
    // 4. Image Scanner Mode (Uploader / Image Previews Scanner)
    // ---------------------------------------------------------
    function drawUploadedImageScanner() {
        if (!uploadedImageElement) {
            // Draw placeholder screen
            ctx.fillStyle = '#06090e';
            ctx.fillRect(0, 0, surveillanceCanvas.width, surveillanceCanvas.height);
            
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '10px var(--font-hud)';
            ctx.textAlign = 'center';
            ctx.fillText("SURVEILLANCE SCANNERS DISCONNECTED", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 - 10);
            ctx.font = '8px var(--font-ui)';
            ctx.fillText("Upload a traffic snapshot or select presets to preview & scan", surveillanceCanvas.width / 2, surveillanceCanvas.height / 2 + 10);
            ctx.textAlign = 'left'; // reset
            return;
        }

        // Draw preview of input image directly on viewport canvas
        ctx.drawImage(uploadedImageElement, 0, 0, surveillanceCanvas.width, surveillanceCanvas.height);

        // Overlay segmented objects bounding boxes (Red for Blue cars, Blue for others, Green for people)
        if (uploadedImageObjects) {
            const objs = uploadedImageObjects.objects;
            
            objs.forEach((obj, idx) => {
                ctx.strokeStyle = obj.boxColor;
                ctx.lineWidth = 2.0;
                ctx.shadowColor = obj.boxGlow;
                ctx.shadowBlur = 6;
                ctx.strokeRect(obj.x - obj.w/2, obj.y - obj.h/2, obj.w, obj.h);
                ctx.shadowBlur = 0; // reset
                
                ctx.fillStyle = obj.boxColor;
                ctx.font = 'bold 7px var(--font-hud)';
                if (obj.type === 'car') {
                    ctx.fillText(`#CAR_${100 + idx} [${obj.colorName.toUpperCase()}]`, obj.x - obj.w/2, obj.y - obj.h/2 - 5);
                } else {
                    ctx.fillText(`PEDESTRIAN`, obj.x - obj.w/2, obj.y - obj.h/2 - 5);
                }
            });

            // Sync static image HUD
            syncLiveHUD(
                objs.filter(o => o.type === 'car'),
                objs.filter(o => o.type === 'person')
            );
        }
    }

    // ---------------------------------------------------------
    // 5. Interactive UI Sync Hooks
    // ---------------------------------------------------------
    function syncLiveHUD(carsArr, peopleArr) {
        const carsCount = carsArr.length;
        const peopleCount = peopleArr.length;
        
        let blueCars = 0;
        let otherCars = 0;
        
        if (activeFeedMode === 'sim') {
            blueCars = carsArr.filter(v => v.classif.isBlue).length;
            otherCars = carsCount - blueCars;
        } else if (uploadedImageObjects) {
            blueCars = uploadedImageObjects.blueCars;
            otherCars = uploadedImageObjects.otherCars;
        }

        // Update stats HUD
        statTotalCars.innerText = carsCount;
        statTotalPeople.innerText = peopleCount;

        hudCountBlue.innerText = blueCars;
        hudCountOther.innerText = otherCars;
        hudCountPeople.innerText = peopleCount;

        // Pedestrian Crosswalk Warn overlay slide down
        if (peopleCount > 0) {
            peopleAlertBanner.classList.add('slide-down');
            
            // Update safety card
            pedestrianStatusCard.className = "pedestrian-status-card warning-active";
            pscLed.className = "hud-status-led pulsing-red";
            pscValText.innerText = "WARNING: CROSSING ACTIVE";
            pscValText.className = "psc-val text-glow-red";
        } else {
            peopleAlertBanner.classList.remove('slide-down');
            
            pedestrianStatusCard.className = "pedestrian-status-card";
            pscLed.className = "hud-status-led pulsing-green";
            pscValText.innerText = "CROSSWALK CLEAR";
            pscValText.className = "psc-val text-glow-green";
        }
    }

    function logTrafficObject(obj) {
        const timestamp = new Date().toTimeString().split(' ')[0];
        
        const logRecord = {
            id: `#SIG_${logCounter++}`,
            type: obj.type,
            details: obj.details,
            rectColor: obj.rectColor
        };

        trafficLogs.unshift(logRecord);
        updateDatabaseUI();
    }

    function updateDatabaseUI() {
        if (trafficLogs.length === 0) {
            trafficTableBody.innerHTML = `<tr><td colspan="4" class="empty-table-msg">Surveillance registry offline.</td></tr>`;
            return;
        }

        let rowsHtml = "";
        trafficLogs.forEach(v => {
            let colorClass = "text-glow-cyan";
            if (v.rectColor.startsWith("Red")) colorClass = "text-glow-red";
            else if (v.rectColor.startsWith("Green")) colorClass = "text-glow-green";

            rowsHtml += `
                <tr>
                    <td class="hud-font">${v.id}</td>
                    <td>${v.type}</td>
                    <td>${v.details}</td>
                    <td class="hud-font ${colorClass}">${v.rectColor.toUpperCase()}</td>
                </tr>
            `;
        });

        trafficTableBody.innerHTML = rowsHtml;
    }

    // Toggle Tab Triggers
    tabSim.addEventListener('click', () => {
        activeFeedMode = 'sim';
        tabSim.classList.add('active');
        tabUploader.classList.remove('active');
        ctrlSimPanel.classList.add('active');
        ctrlUploaderPanel.classList.remove('active');
        presetsCard.style.display = 'none';
        hudFeedSource.innerText = 'INTERSECTION_CAM_14';
        
        statSignalStatus.innerText = signalLight;
        statSignalStatus.className = signalLight === 'RED' ? 'hud-val text-glow-red' : 'hud-val text-glow-green';
    });

    tabUploader.addEventListener('click', () => {
        activeFeedMode = 'uploader';
        tabUploader.classList.add('active');
        tabSim.classList.remove('active');
        ctrlUploaderPanel.classList.add('active');
        ctrlSimPanel.classList.remove('active');
        presetsCard.style.display = 'block';
        hudFeedSource.innerText = 'UPLOADER_INPUT_PREVIEW';
        
        statSignalStatus.innerText = 'SUSPENDED';
        statSignalStatus.className = 'hud-val text-muted';
    });

    // Controllers
    btnSpawnBlue.addEventListener('click', () => {
        if (activeFeedMode === 'sim') simVehicles.push(new SimVehicle('blue'));
    });
    btnSpawnOther.addEventListener('click', () => {
        if (activeFeedMode === 'sim') simVehicles.push(new SimVehicle('other'));
    });
    btnSpawnPeople.addEventListener('click', () => {
        if (activeFeedMode === 'sim') {
            for (let i = 0; i < 3; i++) {
                simPedestrians.push(new SimPedestrian());
            }
        }
    });
    btnToggleLight.addEventListener('click', () => {
        if (activeFeedMode === 'sim') toggleSignalLight();
    });

    // ---------------------------------------------------------
    // 6. Custom drag & drop image uploads and previews
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
            loadTrafficFile(e.dataTransfer.files[0]);
        }
    });

    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadTrafficFile(e.target.files[0]);
        }
    });

    function loadTrafficFile(file) {
        if (activeFeedMode !== 'uploader') return;

        hudFeedSource.innerText = file.name.toUpperCase();
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                uploadedImageElement = img;
                // Run CV Image segmenter and color classifications
                uploadedImageObjects = cvModel.segmentTrafficImage(ctx, img);
                
                // Pushes logs to ledger table
                uploadedImageObjects.objects.forEach(obj => {
                    logTrafficObject({
                        type: obj.type === 'car' ? 'Car' : 'Person',
                        details: obj.type === 'car' ? `${obj.colorName} Car` : "Pedestrian present",
                        rectColor: obj.type === 'car' ? (obj.isBlue ? "Red (Blue Car)" : "Blue (Other Car)") : "Green (Pedestrian)"
                    });
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        presetButtons.forEach(btn => btn.classList.remove('active'));
    }

    // ---------------------------------------------------------
    // 7. Surveillance Snapshot Presets (Acoustic Wave files mimics)
    // ---------------------------------------------------------
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (activeFeedMode !== 'uploader') return;

            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const presetType = btn.getAttribute('data-img');
            hudFeedSource.innerText = `PRESET_SNAPSHOT_${presetType.toUpperCase()}`;

            // We mathematically synthesize these traffic images on canvas!
            // This creates a perfect image preview simulation without needing static image files,
            // drawing high-quality stylized vehicles (Blue, Red, Yellow) and pedestrians at traffic lines.
            const pCanvas = document.createElement('canvas');
            pCanvas.width = 580;
            pCanvas.height = 360;
            const pCtx = pCanvas.getContext('2d');

            // Draw asphalt road backdrop
            pCtx.fillStyle = '#06080c';
            pCtx.fillRect(0, 0, 580, 360);
            pCtx.fillStyle = '#1e293b';
            pCtx.fillRect(0, 160, 580, 80); // roadway
            pCtx.fillStyle = '#ffffff';
            // zebra crosswalk lines
            for (let y = 160; y < 240; y += 12) {
                pCtx.fillRect(380, y, 40, 6);
            }

            const mockObjects = [];

            if (presetType === "busy_intersection") {
                // 1 Blue Car, 2 Other Cars, 4 Pedestrians
                // Blue Car (at x = 120)
                drawMockCar(pCtx, 120, 195, "rgb(0, 70, 240)");
                mockObjects.push({ type: 'car', x: 120 + 29, y: 195 + 15, w: 58, h: 30, colorName: "Blue", isBlue: true, boxColor: "rgb(255, 23, 68)", boxGlow: "rgba(255, 23, 68, 0.4)" });
                
                // Red Car (at x = 240)
                drawMockCar(pCtx, 240, 190, "rgb(230, 20, 50)");
                mockObjects.push({ type: 'car', x: 240 + 29, y: 190 + 15, w: 58, h: 30, colorName: "Other", isBlue: false, boxColor: "rgb(0, 229, 255)", boxGlow: "rgba(0, 229, 255, 0.4)" });

                // Yellow Car (at x = 60)
                drawMockCar(pCtx, 60, 205, "rgb(240, 220, 10)");
                mockObjects.push({ type: 'car', x: 60 + 29, y: 205 + 15, w: 58, h: 30, colorName: "Other", isBlue: false, boxColor: "rgb(0, 229, 255)", boxGlow: "rgba(0, 229, 255, 0.4)" });

                // 4 Pedestrians on crosswalk
                for (let i = 0; i < 4; i++) {
                    const py = 170 + i * 20;
                    drawMockPerson(pCtx, 400, py);
                    mockObjects.push({ type: 'person', x: 400, y: py, w: 20, h: 44, boxColor: "rgb(57, 255, 20)", boxGlow: "rgba(57, 255, 20, 0.3)" });
                }
            } else if (presetType === "blue_car_solo") {
                // 1 Blue Car, 0 Pedestrians
                drawMockCar(pCtx, 200, 195, "rgb(0, 70, 240)");
                mockObjects.push({ type: 'car', x: 200 + 29, y: 195 + 15, w: 58, h: 30, colorName: "Blue", isBlue: true, boxColor: "rgb(255, 23, 68)", boxGlow: "rgba(255, 23, 68, 0.4)" });
            } else if (presetType === "crosswalk_crowd") {
                // 2 Other Cars, 6 Pedestrians
                drawMockCar(pCtx, 150, 195, "rgb(245, 245, 245)"); // White
                mockObjects.push({ type: 'car', x: 150 + 29, y: 195 + 15, w: 58, h: 30, colorName: "Other", isBlue: false, boxColor: "rgb(0, 229, 255)", boxGlow: "rgba(0, 229, 255, 0.4)" });

                drawMockCar(pCtx, 270, 190, "rgb(180, 185, 190)"); // Silver
                mockObjects.push({ type: 'car', x: 270 + 29, y: 190 + 15, w: 58, h: 30, colorName: "Other", isBlue: false, boxColor: "rgb(0, 229, 255)", boxGlow: "rgba(0, 229, 255, 0.4)" });

                for (let i = 0; i < 6; i++) {
                    const py = 165 + i * 13;
                    drawMockPerson(pCtx, 395, py);
                    mockObjects.push({ type: 'person', x: 395, y: py, w: 20, h: 44, boxColor: "rgb(57, 255, 20)", boxGlow: "rgba(57, 255, 20, 0.3)" });
                }
            }

            // Create image element from simulated canvas context
            const mockImg = new Image();
            mockImg.onload = function() {
                uploadedImageElement = mockImg;
                uploadedImageObjects = {
                    objects: mockObjects,
                    blueCars: mockObjects.filter(o => o.type === 'car' && o.isBlue).length,
                    otherCars: mockObjects.filter(o => o.type === 'car' && !o.isBlue).length,
                    peopleCount: mockObjects.filter(o => o.type === 'person').length
                };

                // Clear and repopulate ledger table
                trafficLogs = [];
                mockObjects.forEach(obj => {
                    logTrafficObject({
                        type: obj.type === 'car' ? 'Car' : 'Person',
                        details: obj.type === 'car' ? `${obj.colorName} Car` : "Pedestrian crossing",
                        rectColor: obj.type === 'car' ? (obj.isBlue ? "Red (Blue Car)" : "Blue (Other Car)") : "Green (Pedestrian)"
                    });
                });
            };
            mockImg.src = pCanvas.toDataURL();
        });
    });

    function drawMockCar(pCtx, cx, cy, rgb) {
        pCtx.fillStyle = rgb;
        pCtx.fillRect(cx, cy, 58, 30);
        pCtx.fillStyle = '#0b131f';
        pCtx.fillRect(cx + 12, cy + 3, 34, 24);
        pCtx.fillStyle = '#020305';
        pCtx.fillRect(cx + 8, cy - 2, 10, 3);
        pCtx.fillRect(cx + 40, cy - 2, 10, 3);
        pCtx.fillRect(cx + 8, cy + 29, 10, 3);
        pCtx.fillRect(cx + 40, cy + 29, 10, 3);
    }

    function drawMockPerson(pCtx, px, py) {
        pCtx.strokeStyle = '#526074';
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        pCtx.moveTo(px, py); pCtx.lineTo(px - 4, py + 12);
        pCtx.moveTo(px, py); pCtx.lineTo(px + 4, py + 12);
        pCtx.stroke();
        pCtx.fillStyle = '#1e293b';
        pCtx.fillRect(px - 4, py - 12, 8, 12);
        pCtx.fillStyle = '#ffffff';
        pCtx.strokeStyle = '#39ff14';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        pCtx.arc(px, py - 16, 4, 0, Math.PI*2);
        pCtx.fill();
        pCtx.stroke();
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

    // Spawns 2 initial cars
    simVehicles.push(new SimVehicle());
    simVehicles.push(new SimVehicle());
});
