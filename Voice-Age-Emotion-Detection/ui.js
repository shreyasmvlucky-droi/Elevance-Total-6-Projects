/**
 * VoiceDemographicsEye - Audio Visualizer & GUI Controller
 * Controls Web Audio recording, real-time waveform visualizers, presets synthesis, and manual overrides.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Initial State Configurations
    // ---------------------------------------------------------
    const model = new AcousticModel();

    let activeInputTab = 'presets'; // 'presets' or 'microphone'
    let isRecording = false;
    
    // Core parameters (synchronized from presets or mic or sliders)
    let currentPitch = 110;    // F0 frequency in Hz
    let currentJitter = 0.15;  // Tremor index (0.0 to 1.0)
    let currentEnergy = 0.32;  // Vocal energy RMS (0.0 to 1.0)
    let trueGender = "Male";
    
    let scannedLogsCount = 0;
    let seniorLogsCount = 0;

    // Web Audio Variables
    let audioContext = null;
    let analyserNode = null;
    let micSource = null;
    let animationFrameId = null;

    // Simulated wave variables (for presets and sliders synthesis)
    let wavePhase = 0;

    // Canvas Elements
    const oscCanvas = document.getElementById('canvas-oscilloscope');
    const specCanvas = document.getElementById('canvas-spectrogram');
    const oscCtx = oscCanvas.getContext('2d');
    const specCtx = specCanvas.getContext('2d');

    // UI Interactive Controls
    const tabPresets = document.getElementById('tab-presets');
    const tabMicrophone = document.getElementById('tab-microphone');
    
    const ctrlPresetsPanel = document.getElementById('ctrl-presets-panel');
    const ctrlMicPanel = document.getElementById('ctrl-mic-panel');
    
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    const btnStartRecord = document.getElementById('btn-start-record');
    const btnStopRecord = document.getElementById('btn-stop-record');
    const audioFileInput = document.getElementById('audio-file-input');
    const audioDropZone = document.getElementById('audio-drop-zone');
    
    // HUD & Stats Displays
    const sysStatusLed = document.getElementById('sys-status-led');
    const statGatewayState = document.getElementById('stat-gateway-state');
    const statTotalScans = document.getElementById('stat-total-scans');
    const statSeniorScans = document.getElementById('stat-senior-scans');
    const hudAudioSource = document.getElementById('hud-audio-source');
    const hudClock = document.getElementById('hud-clock');

    // Feature Fills and Labels
    const featureValPitch = document.getElementById('feature-val-pitch');
    const featureFillPitch = document.getElementById('feature-fill-pitch');
    
    const featureValJitter = document.getElementById('feature-val-jitter');
    const featureFillJitter = document.getElementById('feature-fill-jitter');
    
    const featureValEnergy = document.getElementById('feature-val-energy');
    const featureFillEnergy = document.getElementById('feature-fill-energy');

    // Manual Calibration Sliders
    const calSliderPitch = document.getElementById('cal-slider-pitch');
    const calSliderJitter = document.getElementById('cal-slider-jitter');
    const calSliderEnergy = document.getElementById('cal-slider-energy');
    
    const calValPitch = document.getElementById('cal-val-pitch');
    const calValJitter = document.getElementById('cal-val-jitter');
    const calValEnergy = document.getElementById('cal-val-energy');

    // Classification Outcome Card Elements
    const demoResultCard = document.getElementById('demographic-result-card');
    const resultStatusTitle = document.getElementById('result-status-title');
    const resultMetricsGrid = document.getElementById('result-metrics-grid');
    const resValAge = document.getElementById('res-val-age');
    const resValSenior = document.getElementById('res-val-senior');
    const resValEmotion = document.getElementById('res-val-emotion');
    const resEmotionItem = document.getElementById('res-emotion-item');
    const resultErrorMessage = document.getElementById('result-error-message');

    // ---------------------------------------------------------
    // 2. Real-Time Oscilloscope Waveform Synthesizer
    // ---------------------------------------------------------
    function drawOscilloscopeAndSpectrum() {
        if (!oscCtx || !specCtx) return;

        const w = oscCanvas.width;
        const h = oscCanvas.height;
        const sw = specCanvas.width;
        const sh = specCanvas.height;

        // Clear canvases
        oscCtx.clearRect(0, 0, w, h);
        specCtx.clearRect(0, 0, sw, sh);

        // Frame update
        wavePhase += 0.15;

        // --- TIME DOMAIN: Draw Oscilloscope wave ---
        oscCtx.strokeStyle = 'var(--neon-green)';
        oscCtx.lineWidth = 2.0;
        oscCtx.shadowColor = 'var(--neon-green-glow)';
        oscCtx.shadowBlur = 6;
        oscCtx.beginPath();

        const step = w / 180;
        
        // Generate time domain buffer
        let timeData = new Float32Array(180);
        
        if (isRecording && analyserNode) {
            // Get actual mic data
            const byteData = new Uint8Array(analyserNode.fftSize);
            analyserNode.getByteTimeDomainData(byteData);
            // Map byte data to float
            for (let i = 0; i < 180; i++) {
                const sampleIdx = Math.floor(i * (byteData.length / 180));
                timeData[i] = (byteData[sampleIdx] - 128) / 128.0;
            }
            
            // Draw real mic wave
            for (let i = 0; i < 180; i++) {
                const x = i * step;
                const y = h / 2 + timeData[i] * (h / 2 - 10);
                if (i === 0) oscCtx.moveTo(x, y);
                else oscCtx.lineTo(x, y);
            }
        } else {
            // Synthesize voice waveform based on Jitter, Pitch, and Energy Sliders!
            // Young male has stable clean sine, senior male has shaky modulated tremble sine
            const freqTremor = Math.sin(wavePhase * 0.12) * currentJitter * 22; 
            const ampTremor = 1.0 - (Math.sin(wavePhase * 0.2) * currentJitter * 0.35);
            
            const cyclesCount = (currentPitch / 110.0) * 12;
            
            for (let i = 0; i < 180; i++) {
                const ratio = i / 180.0;
                // Core voice frequency
                let val = Math.sin(ratio * Math.PI * 2 * cyclesCount + wavePhase + freqTremor) * 0.65;
                // Add secondary harmonics (vocal chest tone)
                val += Math.sin(ratio * Math.PI * 2 * cyclesCount * 2 + wavePhase * 1.5) * 0.2;
                // Add high frequency vocal noise friction
                val += (Math.random() - 0.5) * 0.05 * (1.0 + currentJitter * 0.8);
                // Apply amplitude envelope
                val *= ampTremor * currentEnergy * Math.sin(ratio * Math.PI); // fade edges
                
                timeData[i] = val;
                
                const x = i * step;
                const y = h / 2 + val * (h / 2 - 10);
                
                if (i === 0) oscCtx.moveTo(x, y);
                else oscCtx.lineTo(x, y);
            }
        }
        oscCtx.stroke();
        oscCtx.shadowBlur = 0; // reset

        // --- FREQUENCY DOMAIN: Draw Spectrogram frequency bars ---
        specCtx.fillStyle = 'var(--neon-cyan)';
        specCtx.globalAlpha = 0.75;
        specCtx.shadowColor = 'var(--neon-cyan-glow)';
        
        const barCount = 48;
        const barW = sw / barCount;
        
        let freqData = new Uint8Array(barCount);
        
        if (isRecording && analyserNode) {
            // Get actual mic frequency
            const byteFreq = new Uint8Array(analyserNode.frequencyBinCount);
            analyserNode.getByteFrequencyData(byteFreq);
            for (let i = 0; i < barCount; i++) {
                const sampleIdx = Math.floor(i * (byteFreq.length / barCount) * 0.55); // focus low-mid
                freqData[i] = byteFreq[sampleIdx];
            }
            
            // Draw real mic frequency bars
            for (let i = 0; i < barCount; i++) {
                const val = freqData[i];
                const barH = (val / 255.0) * (sh - 10);
                const x = i * barW;
                const y = sh - barH;
                
                specCtx.shadowBlur = 4;
                specCtx.fillRect(x + 1.5, y, barW - 3, barH);
            }
        } else {
            // Synthesize frequency spectrogram bars reflecting sliders
            const peakBin = Math.floor((currentPitch / 250.0) * (barCount * 0.8));
            
            for (let i = 0; i < barCount; i++) {
                // Distribute energy centered on primary pitch frequency peak
                let distance = Math.abs(i - peakBin);
                let heightRatio = Math.exp(-Math.pow(distance, 2) / (6.0 + currentJitter * 8));
                
                // Add secondary harmonics peak
                let harmDistance = Math.abs(i - peakBin * 2);
                heightRatio += Math.exp(-Math.pow(harmDistance, 2) / 4.0) * 0.35;
                
                // Noise floor
                heightRatio += Math.random() * 0.08;
                heightRatio *= currentEnergy;
                
                const barH = Math.max(2, heightRatio * (sh - 15));
                const x = i * barW;
                const y = sh - barH;
                
                specCtx.shadowBlur = 4;
                specCtx.fillRect(x + 1.5, y, barW - 3, barH);
            }
        }
        specCtx.globalAlpha = 1.0;
        specCtx.shadowBlur = 0; // reset
        
        // Loop canvas animator
        animationFrameId = requestAnimationFrame(drawOscilloscopeAndSpectrum);
    }
    
    // Start continuous canvases loop
    drawOscilloscopeAndSpectrum();

    // ---------------------------------------------------------
    // 3. Demographic & Rejection Logic Evaluator
    // ---------------------------------------------------------
    function evaluateInference() {
        // Run classification predictions
        const pred = model.predict(currentPitch, currentJitter, currentEnergy);
        
        // Sync Extracted Speech Telemetry HUD bars
        syncTelemetryHUD();

        // 1. Check Voice note rejection rule (Female Pitch > 165Hz)
        if (pred.rejected) {
            // Reject voice note with error warning: "Upload male voice"
            sysStatusLed.className = "hud-status-led pulsing-red";
            statGatewayState.innerText = "REJECTED";
            statGatewayState.className = "hud-val text-glow-red";
            
            demoResultCard.className = "result-card rejected-card";
            resultStatusTitle.innerText = "INPUT REJECTED";
            resultStatusTitle.className = "result-main-val text-glow-red";
            
            resultMetricsGrid.style.display = "none";
            resultErrorMessage.style.display = "block";
            resultErrorMessage.innerText = pred.message;
            return;
        }

        // 2. Accept voice note (Male voice)
        scannedLogsCount++;
        statTotalScans.innerText = scannedLogsCount;
        
        sysStatusLed.className = "hud-status-led pulsing-green";
        statGatewayState.innerText = "ACCEPTED";
        statGatewayState.className = "hud-val text-glow-green";
        
        resultErrorMessage.style.display = "none";
        resultMetricsGrid.style.display = "grid";

        // Draw standard details
        resValAge.innerText = `${pred.age} yrs`;
        
        // 3. Verify Senior Citizen condition (Age > 60)
        if (pred.isSenior) {
            seniorLogsCount++;
            statSeniorScans.innerText = seniorLogsCount;
            sysStatusLed.className = "hud-status-led pulsing-gold";

            demoResultCard.className = "result-card senior-accepted-card";
            resultStatusTitle.innerText = "SENIOR MALE DETECTED";
            resultStatusTitle.className = "result-main-val text-glow-gold";
            
            resValSenior.innerText = "YES (SENIOR)";
            resValSenior.className = "res-val text-glow-gold";
            
            // Unlocked & display detected emotion strictly for seniors
            resValEmotion.innerText = pred.emotion.toUpperCase();
            resValEmotion.className = "res-val text-glow-gold";
        } else {
            // Under 60 Adult/Minor
            demoResultCard.className = "result-card";
            resultStatusTitle.innerText = "MALE VOICE ACCEPTED";
            resultStatusTitle.className = "result-main-val text-glow-cyan";
            
            resValSenior.innerText = "NO (ADULT)";
            resValSenior.className = "res-val text-glow-cyan";
            
            // LOCK & HIDE emotion detection for individuals below 60!
            resValEmotion.innerText = "🔒 LOCKED";
            resValEmotion.className = "res-val text-muted";
        }
    }

    function syncTelemetryHUD() {
        // Sync Pitch bar
        featureValPitch.innerText = `${currentPitch.toFixed(0)} Hz`;
        const pitchPct = Math.min(100, Math.max(0, ((currentPitch - 70) / (250 - 70)) * 100));
        featureFillPitch.style.width = `${pitchPct}%`;
        if (currentPitch > 165) {
            featureValPitch.className = "text-glow-red font-hud";
        } else {
            featureValPitch.className = "text-glow-cyan font-hud";
        }

        // Sync Jitter bar
        featureValJitter.innerText = `${(currentJitter * 100).toFixed(0)}%`;
        featureFillJitter.style.width = `${currentJitter * 100}%`;

        // Sync Energy bar
        const energyDb = Math.round(currentEnergy * -40); // map to dB scale
        featureValEnergy.innerText = `${energyDb} dB`;
        featureFillEnergy.style.width = `${currentEnergy * 100}%`;
    }

    // Run initial inference evaluation
    evaluateInference();

    // ---------------------------------------------------------
    // 4. Interactive Calibration Sliders overrides
    // ---------------------------------------------------------
    calSliderPitch.addEventListener('input', (e) => {
        currentPitch = parseInt(e.target.value);
        calValPitch.innerText = `${currentPitch} Hz`;
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });

    calSliderJitter.addEventListener('input', (e) => {
        currentJitter = parseFloat(e.target.value) / 100.0;
        calValJitter.innerText = `${(currentJitter * 100).toFixed(0)}%`;
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });

    calSliderEnergy.addEventListener('input', (e) => {
        currentEnergy = parseFloat(e.target.value) / 100.0;
        calValEnergy.innerText = `${(currentEnergy * 100).toFixed(0)}%`;
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });

    // ---------------------------------------------------------
    // 5. Preset Voice Profiles Click Syncs
    // ---------------------------------------------------------
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Load presets properties
            currentPitch = parseInt(btn.getAttribute('data-pitch'));
            currentJitter = parseFloat(btn.getAttribute('data-jitter'));
            currentEnergy = parseFloat(btn.getAttribute('data-energy'));
            
            // Sync values to Calibration sliders visually
            calSliderPitch.value = currentPitch;
            calValPitch.innerText = `${currentPitch} Hz`;
            
            calSliderJitter.value = Math.round(currentJitter * 100);
            calValJitter.innerText = `${Math.round(currentJitter * 100)}%`;
            
            calSliderEnergy.value = Math.round(currentEnergy * 100);
            calValEnergy.innerText = `${Math.round(currentEnergy * 100)}%`;

            hudAudioSource.innerText = "SYNTHESIZED_WAVE_BUFFER";

            evaluateInference();
        });
    });

    // Select young male by default
    document.getElementById('preset-1').click();

    // ---------------------------------------------------------
    // 6. Live Mic Voice Captures and Autocorrelation buffers
    // ---------------------------------------------------------
    let micAnalyserFrame = null;

    btnStartRecord.addEventListener('click', () => {
        if (isRecording) return;
        
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                // Initialize Web Audio Context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 2048;

                micSource = audioContext.createMediaStreamSource(stream);
                micSource.connect(analyserNode);

                isRecording = true;
                btnStartRecord.disabled = true;
                btnStartRecord.classList.add('recording-active');
                btnStartRecord.innerHTML = "<span class='alert-flash'>&#x25B9;</span> RECORDING LIVE SPEECH...";
                btnStopRecord.disabled = false;
                
                statGatewayState.innerText = "LISTENING";
                statGatewayState.className = "hud-val text-glow-cyan";
                hudAudioSource.innerText = "MICROPHONE_LIVE_STREAM";

                // Setup live mic analysis loops
                function pollLiveMicFeatures() {
                    if (!isRecording) return;

                    const timeBuffer = new Float32Array(analyserNode.fftSize);
                    analyserNode.getFloatTimeDomainData(timeBuffer);

                    // Estimate F0 Pitch using our DSP autocorrelation algorithm
                    const pitch = model.detectPitch(timeBuffer, audioContext.sampleRate);
                    
                    if (pitch > 40 && pitch < 500) {
                        currentPitch = pitch;
                        
                        // Extract variance of pitch fluctuations representing live Jitter
                        // and amplitude envelope dynamics representing RMS volume
                        let sumSq = 0;
                        for (let i = 0; i < timeBuffer.length; i++) {
                            sumSq += timeBuffer[i] * timeBuffer[i];
                        }
                        currentEnergy = Math.min(1.0, Math.sqrt(sumSq / timeBuffer.length) * 4.0); // scale up
                        
                        // Jitter calculated from pitch instability
                        currentJitter = Math.min(0.9, Math.abs(pitch - 110) / 110.0 * 0.8);
                        
                        // Sync telemetry & evaluate immediately
                        evaluateInference();
                    }

                    micAnalyserFrame = requestAnimationFrame(pollLiveMicFeatures);
                }

                pollLiveMicFeatures();
            })
            .catch(err => {
                console.error("Mic access denied:", err);
                alert("Microphone connection failed or permission denied. Interface will operate in Voice Preset Simulator mode.");
            });
    });

    btnStopRecord.addEventListener('click', () => {
        if (!isRecording) return;
        
        isRecording = false;
        cancelAnimationFrame(micAnalyserFrame);
        
        // Stop all audio tracks
        if (micSource && micSource.mediaStream) {
            micSource.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }

        btnStartRecord.disabled = false;
        btnStartRecord.classList.remove('recording-active');
        btnStartRecord.innerHTML = "&#x2B55; Record Voice Note";
        btnStopRecord.disabled = true;

        // Perform final boundary checks
        evaluateInference();
    });

    // ---------------------------------------------------------
    // 7. Custom Drag & Drop Voice Notes Simulator
    // ---------------------------------------------------------
    audioDropZone.addEventListener('click', () => audioFileInput.click());

    audioDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        audioDropZone.style.borderColor = 'var(--neon-pink)';
    });

    audioDropZone.addEventListener('dragleave', () => {
        audioDropZone.style.borderColor = 'rgba(0, 240, 255, 0.15)';
    });

    audioDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        audioDropZone.style.borderColor = 'rgba(0, 240, 255, 0.15)';
        if (e.dataTransfer.files.length > 0) {
            processAudioFile(e.dataTransfer.files[0]);
        }
    });

    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processAudioFile(e.target.files[0]);
        }
    });

    function processAudioFile(file) {
        hudAudioSource.innerText = file.name.toUpperCase();
        
        // Randomize features inside realistic domains to simulate vocal extractions
        const isRandFemale = Math.random() < 0.35;
        if (isRandFemale) {
            currentPitch = 180 + Math.floor(Math.random() * 50);
            currentJitter = 0.05 + Math.random() * 0.15;
            currentEnergy = 0.3 + Math.random() * 0.4;
        } else {
            // Male voice
            const isRandSenior = Math.random() < 0.45;
            if (isRandSenior) {
                currentPitch = 85 + Math.floor(Math.random() * 30);
                currentJitter = 0.65 + Math.random() * 0.25;
                currentEnergy = 0.15 + Math.random() * 0.2;
            } else {
                currentPitch = 105 + Math.floor(Math.random() * 45);
                currentJitter = 0.05 + Math.random() * 0.2;
                currentEnergy = 0.25 + Math.random() * 0.35;
            }
        }

        // Sync visual sliders
        calSliderPitch.value = currentPitch;
        calValPitch.innerText = `${currentPitch} Hz`;
        
        calSliderJitter.value = Math.round(currentJitter * 100);
        calValJitter.innerText = `${Math.round(currentJitter * 100)}%`;
        
        calSliderEnergy.value = Math.round(currentEnergy * 100);
        calValEnergy.innerText = `${Math.round(currentEnergy * 100)}%`;

        presetButtons.forEach(btn => btn.classList.remove('active'));

        evaluateInference();
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
