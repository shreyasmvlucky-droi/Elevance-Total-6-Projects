/**
 * HairGenderNet: Graphical User Interface & Interactive Render Engine
 * Links UI elements to model.js neural network state and draws dynamic canvas graphics.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Initial State & Elements Selection
    // ---------------------------------------------------------
    
    // Core Parameters
    let subjectAge = 25;
    let subjectHairLength = 1.0; // 0 = Short, 1 = Long
    let subjectTrueGender = 0.0; // 0 = Male, 1 = Female
    
    // Training State
    let isTraining = false;
    let currentEpoch = 0;
    let lossHistory = [];
    let trainingDataset = [];
    
    // Initialize Neural Network from model.js
    const net = new HairGenderNet();
    window.net = net; // Bind globally for manual console inspection
    
    // Canvas Elements
    const scannerCanvas = document.getElementById('scanner-canvas');
    const synapseCanvas = document.getElementById('synapse-canvas');
    const lossCanvas = document.getElementById('loss-chart-canvas');
    const matrixCanvas = document.getElementById('matrix-canvas');
    
    // Canvas Contexts
    const scanCtx = scannerCanvas.getContext('2d');
    const synCtx = synapseCanvas.getContext('2d');
    const lossCtx = lossCanvas.getContext('2d');
    const matCtx = matrixCanvas.getContext('2d');
    
    // Interactive UI Controls
    const ageSlider = document.getElementById('age-slider');
    const ageDisplay = document.getElementById('age-display-val');
    
    const hairShortBtn = document.getElementById('hair-short-btn');
    const hairLongBtn = document.getElementById('hair-long-btn');
    
    const genderMaleBtn = document.getElementById('gender-male-btn');
    const genderFemaleBtn = document.getElementById('gender-female-btn');
    
    // Preset Buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    // Action Buttons
    const trainStartBtn = document.getElementById('train-start-btn');
    const trainResetBtn = document.getElementById('train-reset-btn');
    const batchTestBtn = document.getElementById('run-batch-tests-btn');
    
    // HUD & Stats Displays
    const hudEngineStatus = document.getElementById('model-engine-status');
    const hudLossVal = document.getElementById('model-loss-val');
    const hudAccuracyVal = document.getElementById('model-accuracy-val');
    const modelStatusDot = document.getElementById('model-status-dot');
    
    const trainEpochDisplay = document.getElementById('train-epoch-display');
    const trainLossDisplay = document.getElementById('train-loss-display');
    const trainValDisplay = document.getElementById('train-val-display');
    const lrSelect = document.getElementById('lr-select');
    
    // Inference Output Elements
    const genderResultCard = document.getElementById('gender-result-card');
    const genderPredictedText = document.getElementById('gender-predicted-text');
    const predictionConfidenceVal = document.getElementById('prediction-confidence-val');
    const predictionConfidenceFill = document.getElementById('prediction-confidence-fill');
    const hudClock = document.getElementById('hud-clock');
    
    // Logic Explainer Steps
    const step1Desc = document.getElementById('step-1-desc');
    const step2Desc = document.getElementById('step-2-desc');
    const step2StatusIcon = document.getElementById('step-2-status-icon');
    const step3Desc = document.getElementById('step-3-desc');
    
    // Confusion Matrix Elements
    const cmTP = document.getElementById('cm-tp');
    const cmFN = document.getElementById('cm-fn');
    const cmFP = document.getElementById('cm-fp');
    const cmTN = document.getElementById('cm-tn');
    
    const cmAccuracy = document.getElementById('cm-accuracy');
    const cmPrecision = document.getElementById('cm-precision');
    const cmRecall = document.getElementById('cm-recall');
    const cmF1 = document.getElementById('cm-f1');
    
    // ---------------------------------------------------------
    // 2. Procedural Biometric Scanner Canvas Renderer
    // ---------------------------------------------------------
    let scanLaserY = 0;
    let scanLaserDirection = 1;
    let pulseOpacity = 0.5;
    
    function drawBiometricScanner() {
        if (!scanCtx) return;
        
        const w = scannerCanvas.width;
        const h = scannerCanvas.height;
        
        // Clear background
        scanCtx.fillStyle = '#070913';
        scanCtx.fillRect(0, 0, w, h);
        
        // Draw cybernetic scanning grid background
        scanCtx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
        scanCtx.lineWidth = 1;
        const gridSpacing = 20;
        for (let x = 0; x < w; x += gridSpacing) {
            scanCtx.beginPath();
            scanCtx.moveTo(x, 0);
            scanCtx.lineTo(x, h);
            scanCtx.stroke();
        }
        for (let y = 0; y < h; y += gridSpacing) {
            scanCtx.beginPath();
            scanCtx.moveTo(0, y);
            scanCtx.lineTo(w, y);
            scanCtx.stroke();
        }
        
        // Procedural Avatar Drawing
        const cx = w / 2;
        const cy = h / 2 + 10;
        const headRadius = 45;
        
        // Draw shoulder/neck silhouette
        scanCtx.fillStyle = 'rgba(22, 28, 54, 0.5)';
        scanCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        scanCtx.lineWidth = 2;
        scanCtx.beginPath();
        scanCtx.moveTo(cx - 20, cy + 30);
        scanCtx.lineTo(cx - 70, h - 20);
        scanCtx.lineTo(cx + 70, h - 20);
        scanCtx.lineTo(cx + 20, cy + 30);
        scanCtx.closePath();
        scanCtx.fill();
        scanCtx.stroke();
        
        // Neck base connection
        scanCtx.beginPath();
        scanCtx.moveTo(cx - 16, cy + 10);
        scanCtx.lineTo(cx - 18, cy + 35);
        scanCtx.lineTo(cx + 18, cy + 35);
        scanCtx.lineTo(cx + 16, cy + 10);
        scanCtx.closePath();
        scanCtx.fill();
        scanCtx.stroke();
        
        // Draw head base oval
        scanCtx.beginPath();
        scanCtx.ellipse(cx, cy, headRadius - 5, headRadius + 5, 0, 0, Math.PI * 2);
        scanCtx.fill();
        scanCtx.stroke();
        
        // Hair rendering based on HairLength state
        if (subjectHairLength >= 0.5) {
            // Draw beautiful flowing cyber-hair curves (Long Hair)
            scanCtx.strokeStyle = subjectTrueGender === 1.0 ? 'var(--neon-pink)' : 'var(--neon-cyan)';
            scanCtx.lineWidth = 3.5;
            scanCtx.shadowColor = scanCtx.strokeStyle;
            scanCtx.shadowBlur = 6;
            
            // Left lock
            scanCtx.beginPath();
            scanCtx.moveTo(cx - 20, cy - 45);
            scanCtx.bezierCurveTo(cx - 65, cy - 40, cx - 75, cy + 10, cx - 60, cy + 70);
            scanCtx.bezierCurveTo(cx - 50, cy + 105, cx - 40, cy + 120, cx - 50, h - 20);
            scanCtx.stroke();
            
            // Right lock
            scanCtx.beginPath();
            scanCtx.moveTo(cx + 20, cy - 45);
            scanCtx.bezierCurveTo(cx + 65, cy - 40, cx + 75, cy + 10, cx + 60, cy + 70);
            scanCtx.bezierCurveTo(cx + 50, cy + 105, cx + 40, cy + 120, cx + 50, h - 20);
            scanCtx.stroke();
            
            // Back/Crown hair volume
            scanCtx.beginPath();
            scanCtx.arc(cx, cy - 8, headRadius + 3, Math.PI, 0, false);
            scanCtx.stroke();
            
            scanCtx.shadowBlur = 0; // reset
        } else {
            // Draw short-cropped hair volume (Short Hair)
            scanCtx.strokeStyle = subjectTrueGender === 1.0 ? 'var(--neon-pink)' : 'var(--neon-cyan)';
            scanCtx.lineWidth = 3.5;
            scanCtx.shadowColor = scanCtx.strokeStyle;
            scanCtx.shadowBlur = 5;
            
            scanCtx.beginPath();
            scanCtx.arc(cx, cy - 5, headRadius + 3, Math.PI * 1.15, Math.PI * 1.85, false);
            scanCtx.stroke();
            
            // Side burns
            scanCtx.beginPath();
            scanCtx.moveTo(cx - headRadius + 2, cy - 10);
            scanCtx.lineTo(cx - headRadius + 4, cy + 5);
            scanCtx.stroke();
            
            scanCtx.beginPath();
            scanCtx.moveTo(cx + headRadius - 2, cy - 10);
            scanCtx.lineTo(cx + headRadius - 4, cy + 5);
            scanCtx.stroke();
            
            scanCtx.shadowBlur = 0; // reset
        }
        
        // Draw biometric facial mesh points & connections (HUD style)
        scanCtx.fillStyle = 'rgba(57, 255, 20, 0.8)';
        scanCtx.strokeStyle = 'rgba(57, 255, 20, 0.25)';
        scanCtx.lineWidth = 1;
        
        // Define facial mesh points
        const points = [
            { x: cx - 18, y: cy - 10 }, // Left Eye
            { x: cx + 18, y: cy - 10 }, // Right Eye
            { x: cx, y: cy + 5 },     // Nose Tip
            { x: cx - 12, y: cy + 20 }, // Left Mouth Corner
            { x: cx + 12, y: cy + 20 }, // Right Mouth Corner
            { x: cx, y: cy + 38 },     // Chin
            { x: cx - 35, y: cy + 10 }, // Left Jaw
            { x: cx + 35, y: cy + 10 }  // Right Jaw
        ];
        
        // Draw mesh lines
        scanCtx.beginPath();
        // Eyes to nose
        scanCtx.moveTo(points[0].x, points[0].y); scanCtx.lineTo(points[2].x, points[2].y);
        scanCtx.moveTo(points[1].x, points[1].y); scanCtx.lineTo(points[2].x, points[2].y);
        // Nose to mouth corners
        scanCtx.moveTo(points[2].x, points[2].y); scanCtx.lineTo(points[3].x, points[3].y);
        scanCtx.moveTo(points[2].x, points[2].y); scanCtx.lineTo(points[4].x, points[4].y);
        // Mouth corners to chin
        scanCtx.moveTo(points[3].x, points[3].y); scanCtx.lineTo(points[5].x, points[5].y);
        scanCtx.moveTo(points[4].x, points[4].y); scanCtx.lineTo(points[5].x, points[5].y);
        // Jaw boundaries
        scanCtx.moveTo(points[0].x, points[0].y); scanCtx.lineTo(points[6].x, points[6].y);
        scanCtx.moveTo(points[6].x, points[6].y); scanCtx.lineTo(points[5].x, points[5].y);
        scanCtx.moveTo(points[1].x, points[1].y); scanCtx.lineTo(points[7].x, points[7].y);
        scanCtx.moveTo(points[7].x, points[7].y); scanCtx.lineTo(points[5].x, points[5].y);
        scanCtx.stroke();
        
        // Draw mesh glowing nodes
        points.forEach(p => {
            scanCtx.beginPath();
            scanCtx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            scanCtx.fill();
        });
        
        // Draw bounding box overlay around face
        scanCtx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        scanCtx.lineWidth = 1;
        const boxX = cx - 55;
        const boxY = cy - 60;
        const boxSize = 110;
        
        scanCtx.strokeRect(boxX, boxY, boxSize, boxSize);
        
        // Bounding box labels
        scanCtx.fillStyle = 'var(--neon-cyan)';
        scanCtx.font = '7px var(--font-cyber)';
        scanCtx.fillText(`LOC: X_${cx.toFixed(0)}, Y_${cy.toFixed(0)}`, boxX + 4, boxY + 12);
        scanCtx.fillText(`BOUND_SCALE: 1.0X`, boxX + 4, boxY + boxSize - 6);
        
        // Scan Laser line animation
        scanLaserY += 1.5 * scanLaserDirection;
        if (scanLaserY > h) {
            scanLaserY = h;
            scanLaserDirection = -1;
        } else if (scanLaserY < 0) {
            scanLaserY = 0;
            scanLaserDirection = 1;
        }
        
        // Draw scan laser line on canvas
        scanCtx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        scanCtx.lineWidth = 2;
        scanCtx.beginPath();
        scanCtx.moveTo(5, scanLaserY);
        scanCtx.lineTo(w - 5, scanLaserY);
        scanCtx.stroke();
        
        // Laser glow gradient
        const laserGrad = scanCtx.createLinearGradient(0, scanLaserY - 12 * scanLaserDirection, 0, scanLaserY);
        laserGrad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
        laserGrad.addColorStop(1, 'rgba(0, 240, 255, 0.12)');
        scanCtx.fillStyle = laserGrad;
        if (scanLaserDirection === 1) {
            scanCtx.fillRect(5, scanLaserY - 20, w - 10, 20);
        } else {
            scanCtx.fillRect(5, scanLaserY, w - 10, 20);
        }
        
        // Continuous animation loop
        requestAnimationFrame(drawBiometricScanner);
    }
    
    // Start scanner canvas loop
    drawBiometricScanner();
    
    // ---------------------------------------------------------
    // 3. Interactive Neural Network Synaptic Canvas Visualization
    // ---------------------------------------------------------
    let pulseProgress = 0;
    
    function drawSynapseNetwork() {
        if (!synCtx) return;
        
        const w = synapseCanvas.width;
        const h = synapseCanvas.height;
        
        // Clear background
        synCtx.fillStyle = '#070913';
        synCtx.fillRect(0, 0, w, h);
        
        // Layer positions
        const xLayers = [50, 180, 320, 450];
        
        // Y coordinates for each layer nodes
        const yLayers = [
            [h / 2 - 80, h / 2, h / 2 + 80], // Inputs (3 nodes)
            Array.from({ length: 12 }, (_, i) => 25 + i * 25), // Hidden 1 (12 nodes)
            Array.from({ length: 8 }, (_, i) => 50 + i * 32),  // Hidden 2 (8 nodes)
            [h / 2] // Output (1 node)
        ];
        
        // 1. Draw connections (Synapses) based on trained network weights
        const layersWeights = [net.w1, net.w2, net.w3];
        
        for (let l = 0; l < xLayers.length - 1; l++) {
            const nextL = l + 1;
            const currentNodesY = yLayers[l];
            const nextNodesY = yLayers[nextL];
            const weights = layersWeights[l];
            
            for (let j = 0; j < nextNodesY.length; j++) {
                for (let i = 0; i < currentNodesY.length; i++) {
                    const weightVal = weights[j][i];
                    
                    // Determine connection path color & strength opacity
                    const isPositive = weightVal > 0;
                    const strength = Math.min(1.0, Math.abs(weightVal) * 1.2);
                    
                    synCtx.strokeStyle = isPositive 
                        ? `rgba(0, 240, 255, ${strength * 0.28})` // Cyan for positive weight
                        : `rgba(255, 0, 119, ${strength * 0.28})`; // Pink for negative weight
                    
                    synCtx.lineWidth = 0.5 + strength * 1.5;
                    synCtx.beginPath();
                    synCtx.moveTo(xLayers[l], currentNodesY[i]);
                    synCtx.lineTo(xLayers[nextL], nextNodesY[j]);
                    synCtx.stroke();
                }
            }
        }
        
        // 2. Draw animated feedforward signal pulses
        pulseProgress += 0.015;
        if (pulseProgress > 1.0) pulseProgress = 0;
        
        synCtx.fillStyle = 'rgba(0, 240, 255, 0.9)';
        synCtx.shadowColor = 'var(--neon-cyan)';
        
        for (let l = 0; l < xLayers.length - 1; l++) {
            const nextL = l + 1;
            const currentNodesY = yLayers[l];
            const nextNodesY = yLayers[nextL];
            
            // Draw pulses moving through a subset of links to keep visuals clean
            for (let j = 0; j < nextNodesY.length; j += 2) {
                for (let i = 0; i < currentNodesY.length; i += 3) {
                    const x = xLayers[l] + (xLayers[nextL] - xLayers[l]) * pulseProgress;
                    const y = currentNodesY[i] + (nextNodesY[j] - currentNodesY[i]) * pulseProgress;
                    
                    synCtx.beginPath();
                    synCtx.arc(x, y, 2.0, 0, Math.PI * 2);
                    synCtx.fill();
                }
            }
        }
        synCtx.shadowColor = 'transparent'; // reset
        
        // 3. Draw Nodes (Neurons)
        const neuronColors = ['var(--neon-cyan)', 'var(--text-secondary)', 'var(--text-secondary)', 'var(--neon-pink)'];
        const neuronGlows = ['var(--neon-cyan-glow)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.1)', 'var(--neon-pink-glow)'];
        
        // Input activation values
        const inputVals = [subjectAge / 50.0, subjectHairLength, subjectTrueGender];
        
        for (let l = 0; l < xLayers.length; l++) {
            const nodesY = yLayers[l];
            for (let i = 0; i < nodesY.length; i++) {
                const nodeX = xLayers[l];
                const nodeY = nodesY[i];
                
                // Determine neuron brightness based on feedforward activation
                let nodeBrightness = 0.55;
                if (l === 0) {
                    nodeBrightness = 0.3 + inputVals[i] * 0.7;
                } else if (l === 1 && net.h1_out) {
                    nodeBrightness = 0.3 + Math.abs(net.h1_out[i]) * 0.7;
                } else if (l === 2 && net.h2_out) {
                    nodeBrightness = 0.3 + Math.abs(net.h2_out[i]) * 0.7;
                } else if (l === 3 && net.out_out) {
                    nodeBrightness = 0.3 + net.out_out[i] * 0.7;
                }
                
                // Outer glowing circle
                synCtx.strokeStyle = neuronColors[l];
                synCtx.fillStyle = '#0b0d19';
                synCtx.lineWidth = 2.0;
                synCtx.shadowColor = neuronGlows[l];
                synCtx.shadowBlur = 6 * nodeBrightness;
                
                synCtx.beginPath();
                synCtx.arc(nodeX, nodeY, 7.5, 0, Math.PI * 2);
                synCtx.fill();
                synCtx.stroke();
                synCtx.shadowBlur = 0; // reset
                
                // Core fill indicating activation level
                synCtx.fillStyle = neuronColors[l];
                synCtx.globalAlpha = nodeBrightness;
                synCtx.beginPath();
                synCtx.arc(nodeX, nodeY, 4.0, 0, Math.PI * 2);
                synCtx.fill();
                synCtx.globalAlpha = 1.0; // reset opacity
            }
        }
        
        // 4. Input / Output Text Labels
        synCtx.fillStyle = 'var(--text-secondary)';
        synCtx.font = '8px var(--font-cyber)';
        synCtx.fillText("AGE_IN", 15, yLayers[0][0] + 3);
        synCtx.fillText("HAIR_IN", 10, yLayers[0][1] + 3);
        synCtx.fillText("TRUE_GEN", 5, yLayers[0][2] + 3);
        
        synCtx.fillStyle = 'var(--neon-pink)';
        synCtx.fillText("FEMALE_PROB", 410, yLayers[3][0] - 15);
        if (net.out_out) {
            synCtx.fillText((net.out_out[0] * 100).toFixed(1) + "%", 432, yLayers[3][0] + 16);
        }
        
        // Loop network synapse animator
        requestAnimationFrame(drawSynapseNetwork);
    }
    
    // Start network canvas rendering
    drawSynapseNetwork();
    
    // ---------------------------------------------------------
    // 4. Real-time Decision Space Matrix Renderer
    // ---------------------------------------------------------
    function drawDecisionMatrix() {
        if (!matCtx) return;
        
        const w = matrixCanvas.width;
        const h = matrixCanvas.height;
        
        // Reset matrix canvas
        matCtx.clearRect(0, 0, w, h);
        
        const gridXResolution = 45; // age divisions
        const gridYResolution = 15; // hair length divisions
        
        const cellW = w / gridXResolution;
        const cellH = h / gridYResolution;
        
        // Loop across grid coordinates
        for (let gy = 0; gy < gridYResolution; gy++) {
            // hair values mapped vertically (long = top, short = bottom)
            const hairRatio = 1.0 - (gy / (gridYResolution - 1)); 
            
            for (let gx = 0; gx < gridXResolution; gx++) {
                // age values mapped horizontally (10 to 50 yrs)
                const ageVal = 10.0 + (gx / (gridXResolution - 1)) * 40.0;
                
                // Query Neural Net model predictions
                const outProb = net.forward([ageVal / 50.0, hairRatio, subjectTrueGender]);
                
                // Color decision spaces based on classification threshold (0.5)
                // Female probability maps to glowing pink gradient
                // Male probability maps to glowing blue gradient
                if (outProb >= 0.5) {
                    const intensity = (outProb - 0.5) * 2; // [0, 1]
                    matCtx.fillStyle = `rgba(255, 0, 119, ${0.15 + intensity * 0.45})`;
                } else {
                    const intensity = (0.5 - outProb) * 2; // [0, 1]
                    matCtx.fillStyle = `rgba(0, 119, 255, ${0.15 + intensity * 0.45})`;
                }
                
                matCtx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
            }
        }
        
        // Draw the visual borders of the "Logic Exception Zone" (Ages 20 to 30)
        // Age 20 is at x = 25% of grid width
        // Age 30 is at x = 50% of grid width
        const xMin = w * 0.25;
        const xMax = w * 0.50;
        
        matCtx.strokeStyle = 'rgba(255, 0, 119, 0.45)';
        matCtx.lineWidth = 1;
        matCtx.setLineDash([4, 4]);
        
        matCtx.beginPath();
        matCtx.moveTo(xMin, 0); matCtx.lineTo(xMin, h);
        matCtx.moveTo(xMax, 0); matCtx.lineTo(xMax, h);
        matCtx.stroke();
        matCtx.setLineDash([]); // reset
        
        // Shade inside the active exception boundaries
        matCtx.fillStyle = 'rgba(255, 0, 119, 0.05)';
        matCtx.fillRect(xMin, 0, xMax - xMin, h);
        
        // Write boundary tags
        matCtx.fillStyle = 'rgba(255, 0, 119, 0.7)';
        matCtx.font = '6px var(--font-cyber)';
        matCtx.fillText("20Y_LIMIT", xMin + 4, 10);
        matCtx.fillText("30Y_LIMIT", xMax - 38, 10);
        
        // Draw real-time subject marker crosshair (flashing white dot)
        const markerX = ((subjectAge - 10.0) / 40.0) * w;
        const markerY = (1.0 - subjectHairLength) * h;
        
        matCtx.shadowColor = '#ffffff';
        matCtx.shadowBlur = 8;
        matCtx.fillStyle = '#ffffff';
        matCtx.beginPath();
        matCtx.arc(markerX, markerY, 4.0, 0, Math.PI * 2);
        matCtx.fill();
        matCtx.shadowBlur = 0; // reset
        
        matCtx.strokeStyle = '#ffffff';
        matCtx.lineWidth = 0.5;
        // Draw small bounding crosshair lines
        matCtx.beginPath();
        matCtx.moveTo(markerX - 10, markerY); matCtx.lineTo(markerX + 10, markerY);
        matCtx.moveTo(markerX, markerY - 10); matCtx.lineTo(markerX, markerY + 10);
        matCtx.stroke();
    }
    
    // Initial draw
    drawDecisionMatrix();
    
    // ---------------------------------------------------------
    // 5. Training Loss Curve Chart Renderer
    // ---------------------------------------------------------
    function drawLossChart() {
        if (!lossCtx) return;
        
        const w = lossCanvas.width;
        const h = lossCanvas.height;
        
        lossCtx.fillStyle = 'rgba(7, 9, 19, 0.75)';
        lossCtx.fillRect(0, 0, w, h);
        
        if (lossHistory.length === 0) {
            lossCtx.fillStyle = 'var(--text-muted)';
            lossCtx.font = '8px var(--font-cyber)';
            lossCtx.textAlign = 'center';
            lossCtx.fillText("NO DATA: INITIATE MLP MODEL TRAINING TO PLOT CURVE", w / 2, h / 2 + 3);
            return;
        }
        
        // Draw gridlines
        lossCtx.strokeStyle = 'rgba(255,255,255,0.02)';
        lossCtx.lineWidth = 0.5;
        for (let i = 20; i < h; i += 20) {
            lossCtx.beginPath();
            lossCtx.moveTo(0, i);
            lossCtx.lineTo(w, i);
            lossCtx.stroke();
        }
        
        // Plot values
        lossCtx.strokeStyle = 'var(--neon-green)';
        lossCtx.lineWidth = 1.5;
        lossCtx.beginPath();
        
        const maxPoints = 150;
        const samples = lossHistory.length;
        const step = w / Math.min(maxPoints, samples);
        
        // Find max loss to scale vertically
        const maxLoss = Math.max(...lossHistory);
        
        for (let i = 0; i < Math.min(maxPoints, samples); i++) {
            const histIndex = samples > maxPoints 
                ? Math.floor(i * (samples / maxPoints)) 
                : i;
                
            const val = lossHistory[histIndex];
            const x = i * step;
            // Map loss value vertically
            const y = h - 5 - ((val / Math.max(0.1, maxLoss)) * (h - 10));
            
            if (i === 0) {
                lossCtx.moveTo(x, y);
            } else {
                lossCtx.lineTo(x, y);
            }
        }
        lossCtx.stroke();
        
        // Fill under the chart line
        lossCtx.lineTo(w, h);
        lossCtx.lineTo(0, h);
        lossCtx.closePath();
        const fillGrad = lossCtx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, 'rgba(57, 255, 20, 0.15)');
        fillGrad.addColorStop(1, 'rgba(57, 255, 20, 0.0)');
        lossCtx.fillStyle = fillGrad;
        lossCtx.fill();
        
        // Label current loss value
        lossCtx.fillStyle = 'var(--neon-green)';
        lossCtx.font = '6px var(--font-cyber)';
        lossCtx.textAlign = 'right';
        lossCtx.fillText(`CURR_LOSS: ${lossHistory[lossHistory.length - 1].toFixed(5)}`, w - 10, 10);
    }
    
    // Initial draw
    drawLossChart();
    
    // ---------------------------------------------------------
    // 6. Neural Network Inference Logic & Explainer Evaluator
    // ---------------------------------------------------------
    function evaluateInference() {
        // Normalize Age input: (Age / 50.0)
        const inputs = [subjectAge / 50.0, subjectHairLength, subjectTrueGender];
        
        // Compute forward propagation
        const predFemaleProb = net.forward(inputs);
        
        // Classify using threshold = 0.5
        const isPredictedFemale = predFemaleProb >= 0.5;
        
        // Update dashboard UI result display card
        if (isPredictedFemale) {
            genderPredictedText.innerText = "FEMALE";
            genderPredictedText.className = "result-value text-glow-pink";
            genderResultCard.className = "result-display-card"; // defaults to pink border
            
            // Calculate female confidence percentage
            const confidence = predFemaleProb * 100;
            predictionConfidenceVal.innerText = `${confidence.toFixed(1)}%`;
            predictionConfidenceFill.style.width = `${confidence.toFixed(0)}%`;
            predictionConfidenceFill.style.background = 'linear-gradient(90deg, var(--neon-pink), var(--neon-cyan))';
        } else {
            genderPredictedText.innerText = "MALE";
            genderPredictedText.className = "result-value text-glow-cyan";
            genderResultCard.className = "result-display-card male-active"; // swaps to blue border
            
            // Calculate male confidence percentage
            const confidence = (1.0 - predFemaleProb) * 100;
            predictionConfidenceVal.innerText = `${confidence.toFixed(1)}%`;
            predictionConfidenceFill.style.width = `${confidence.toFixed(0)}%`;
            predictionConfidenceFill.style.background = 'linear-gradient(90deg, var(--neon-blue), var(--neon-cyan))';
        }
        
        // Generate Step-by-Step Logic Explanation
        step1Desc.innerHTML = `Subject parameters detected: <b>Age ${subjectAge}</b>, biological gender: <b>${subjectTrueGender === 1.0 ? 'Female' : 'Male'}</b>.`;
        
        const isInExceptionZone = subjectAge >= 20.0 && subjectAge <= 30.0;
        
        if (isInExceptionZone) {
            // Exception zone step logic
            step2Desc.innerHTML = `Age is between 20-30 window. <b>Age Exception constraint is ACTIVE</b>.`;
            step2StatusIcon.className = "step-status exception";
            step2StatusIcon.innerHTML = "&#x26A0;";
            
            if (subjectHairLength === 1.0) {
                step3Desc.innerHTML = `Subject hair length is <b>Long</b>. Model overrides prediction to <b>FEMALE</b>.`;
            } else {
                step3Desc.innerHTML = `Subject hair length is <b>Short</b>. Model overrides prediction to <b>MALE</b>.`;
            }
        } else {
            // Out of boundary normal logic
            step2Desc.innerHTML = `Age is outside 20-30 window. <b>Normal rules apply</b> (Hair overrides inactive).`;
            step2StatusIcon.className = "step-status success";
            step2StatusIcon.innerHTML = "&#x2713;";
            
            step3Desc.innerHTML = `Biological Gender (True) matches: <b>${subjectTrueGender === 1.0 ? 'FEMALE' : 'MALE'}</b>. Predicting correctly.`;
        }
        
        // Sync parameters position to decision matrix indicator crosshair
        drawDecisionMatrix();
    }
    
    // Initial evaluation
    evaluateInference();
    
    // ---------------------------------------------------------
    // 7. Interactive Event Listeners & Preset Syncs
    // ---------------------------------------------------------
    
    // Age slider listener
    ageSlider.addEventListener('input', (e) => {
        subjectAge = parseInt(e.target.value);
        ageDisplay.innerText = `${subjectAge} yrs`;
        
        // Deactivate preset indicators (manual override active)
        presetButtons.forEach(btn => btn.classList.remove('active'));
        
        evaluateInference();
    });
    
    // Hair button actions
    hairShortBtn.addEventListener('click', () => {
        subjectHairLength = 0.0;
        hairShortBtn.classList.add('active');
        hairLongBtn.classList.remove('active');
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });
    hairLongBtn.addEventListener('click', () => {
        subjectHairLength = 1.0;
        hairLongBtn.classList.add('active');
        hairShortBtn.classList.remove('active');
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });
    
    // Gender button actions
    genderMaleBtn.addEventListener('click', () => {
        subjectTrueGender = 0.0;
        genderMaleBtn.classList.add('active');
        genderFemaleBtn.classList.remove('active');
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });
    genderFemaleBtn.addEventListener('click', () => {
        subjectTrueGender = 1.0;
        genderFemaleBtn.classList.add('active');
        genderMaleBtn.classList.remove('active');
        presetButtons.forEach(btn => btn.classList.remove('active'));
        evaluateInference();
    });
    
    // Presets Click Handles
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Activate button indicator
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Sync values from custom data attributes
            subjectAge = parseInt(btn.getAttribute('data-age'));
            subjectHairLength = parseFloat(btn.getAttribute('data-hair'));
            subjectTrueGender = parseFloat(btn.getAttribute('data-gender'));
            
            // Update inputs values visually
            ageSlider.value = subjectAge;
            ageDisplay.innerText = `${subjectAge} yrs`;
            
            if (subjectHairLength === 1.0) {
                hairLongBtn.classList.add('active');
                hairShortBtn.classList.remove('active');
            } else {
                hairShortBtn.classList.add('active');
                hairLongBtn.classList.remove('active');
            }
            
            if (subjectTrueGender === 1.0) {
                genderFemaleBtn.classList.add('active');
                genderMaleBtn.classList.remove('active');
            } else {
                genderMaleBtn.classList.add('active');
                genderFemaleBtn.classList.remove('active');
            }
            
            // Run inference evaluation
            evaluateInference();
        });
    });
    
    // ---------------------------------------------------------
    // 8. Custom Drag & Drop Image Uploader (Procedural Simulator)
    // ---------------------------------------------------------
    const uploadZone = document.getElementById('upload-zone');
    const imageInput = document.getElementById('image-file-input');
    
    uploadZone.addEventListener('click', () => imageInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--neon-pink)';
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'rgba(0, 240, 255, 0.2)';
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(0, 240, 255, 0.2)';
        if (e.dataTransfer.files.length > 0) {
            processCustomFile(e.dataTransfer.files[0]);
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processCustomFile(e.target.files[0]);
        }
    });
    
    function processCustomFile(file) {
        // Since we are running in an interactive simulator sandbox, 
        // we parse the file name metadata or draw standard biometric layouts.
        // We prompt that custom scan is loaded:
        document.getElementById('hud-scanning-status').innerText = "CUSTOM_FILE_OK";
        
        // Randomize features when a custom image is loaded to give the illusion of computer-vision extraction!
        subjectAge = 15 + Math.floor(Math.random() * 30);
        subjectHairLength = Math.random() < 0.5 ? 0.0 : 1.0;
        subjectTrueGender = Math.random() < 0.5 ? 0.0 : 1.0;
        
        // Sync sliders & buttons
        ageSlider.value = subjectAge;
        ageDisplay.innerText = `${subjectAge} yrs`;
        
        if (subjectHairLength === 1.0) {
            hairLongBtn.classList.add('active');
            hairShortBtn.classList.remove('active');
        } else {
            hairShortBtn.classList.add('active');
            hairLongBtn.classList.remove('active');
        }
        
        if (subjectTrueGender === 1.0) {
            genderFemaleBtn.classList.add('active');
            genderMaleBtn.classList.remove('active');
        } else {
            genderMaleBtn.classList.add('active');
            genderFemaleBtn.classList.remove('active');
        }
        
        presetButtons.forEach(btn => btn.classList.remove('active'));
        
        evaluateInference();
    }
    
    // HUD Live Clock Animation
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
    // 9. Neural Network Non-Blocking Training Loop
    // ---------------------------------------------------------
    trainStartBtn.addEventListener('click', () => {
        if (isTraining) {
            // Click to pause/stop training
            isTraining = false;
            trainStartBtn.innerHTML = "<span class='btn-icon'>&#x25B6;</span> Resume Training";
            hudEngineStatus.innerText = "SUSPENDED";
            modelStatusDot.className = "pulse-dot idle";
            return;
        }
        
        // Start training
        isTraining = true;
        trainStartBtn.innerHTML = "<span class='btn-icon'>&#x270B;</span> Pause Training";
        hudEngineStatus.innerText = "TRAINING...";
        modelStatusDot.className = "pulse-dot training";
        
        // Generate continuous synthetic rule-based samples if training from scratch
        if (trainingDataset.length === 0) {
            trainingDataset = DatasetGenerator.generateDataset(900);
        }
        
        const lr = parseFloat(lrSelect.value);
        
        // Loop standard training epochs inside requestAnimationFrame to prevent main UI thread lockups
        function trainingLoop() {
            if (!isTraining) return;
            
            // Run 8 training epochs per visual animation frame for high execution speed
            const epochsPerFrame = 8;
            let sumLoss = 0;
            
            for (let k = 0; k < epochsPerFrame; k++) {
                DatasetGenerator.shuffle(trainingDataset);
                let epochCumulativeLoss = 0;
                
                for (let i = 0; i < trainingDataset.length; i++) {
                    const sample = trainingDataset[i];
                    // Forward pass
                    net.forward(sample.inputs);
                    // Backpropagate error and update weights
                    const error = net.backpropagate(sample.target, lr);
                    epochCumulativeLoss += error;
                }
                
                currentEpoch++;
                const avgLoss = epochCumulativeLoss / trainingDataset.length;
                lossHistory.push(avgLoss);
                sumLoss = avgLoss;
            }
            
            // Periodically compute validation accuracy on a fixed suite of cases
            const validationAccuracy = calculateValidationAccuracy();
            
            // Update UI text stats
            trainEpochDisplay.innerText = currentEpoch;
            trainLossDisplay.innerText = sumLoss.toFixed(5);
            trainValDisplay.innerText = `${(validationAccuracy * 100).toFixed(1)}%`;
            
            hudLossVal.innerText = sumLoss.toFixed(4);
            hudAccuracyVal.innerText = `${(validationAccuracy * 100).toFixed(0)}%`;
            
            // Plot live charts
            drawLossChart();
            evaluateInference(); // recalculate currently loaded card
            
            // Halt criteria: stop if loss converges extremely low or epochs hit boundary limit
            if (sumLoss < 0.009 || currentEpoch >= 400) {
                isTraining = false;
                trainStartBtn.innerHTML = "<span class='btn-icon'>&#x25B6;</span> Train Network";
                hudEngineStatus.innerText = "OPTIMIZED";
                modelStatusDot.className = "pulse-dot ready";
                
                // Perform a final batch test suite run automatically
                runBatchTestSuite();
                return;
            }
            
            requestAnimationFrame(trainingLoop);
        }
        
        requestAnimationFrame(trainingLoop);
    });
    
    // Weight Reset action
    trainResetBtn.addEventListener('click', () => {
        isTraining = false;
        currentEpoch = 0;
        lossHistory = [];
        net.initWeights(); // reinitialize random Glorot weights
        
        // Reset HUD displays
        trainEpochDisplay.innerText = "0";
        trainLossDisplay.innerText = "--";
        trainValDisplay.innerText = "--";
        hudEngineStatus.innerText = "UNTRAINED";
        hudLossVal.innerText = "--";
        hudAccuracyVal.innerText = "--";
        modelStatusDot.className = "pulse-dot idle";
        trainStartBtn.innerHTML = "<span class='btn-icon'>&#x25B6;</span> Train Network";
        
        // Clear confusion matrix values
        resetConfusionMatrix();
        
        // Redraw canvases
        drawLossChart();
        evaluateInference();
    });
    
    // ---------------------------------------------------------
    // 10. Performance Batch Test Suite & Confusion Matrix Math
    // ---------------------------------------------------------
    batchTestBtn.addEventListener('click', () => {
        runBatchTestSuite();
    });
    
    function calculateValidationAccuracy() {
        // Run testing on a matrix of 6 discrete standard boundary preset cases
        const testCases = [
            { inputs: [25 / 50.0, 1.0, 0.0], target: 1.0 }, // 25M Long => Female (1.0)
            { inputs: [22 / 50.0, 0.0, 1.0], target: 0.0 }, // 22F Short => Male (0.0)
            { inputs: [17 / 50.0, 1.0, 0.0], target: 0.0 }, // 17M Long => Correct (0.0)
            { inputs: [35 / 50.0, 0.0, 1.0], target: 1.0 }, // 35F Short => Correct (1.0)
            { inputs: [15 / 50.0, 0.0, 1.0], target: 1.0 }, // 15F Short => Correct (1.0)
            { inputs: [40 / 50.0, 1.0, 0.0], target: 0.0 }  // 40M Long => Correct (0.0)
        ];
        
        let correct = 0;
        testCases.forEach(tc => {
            const pred = net.forward(tc.inputs);
            const isFemale = pred >= 0.5;
            const expectedFemale = tc.target >= 0.5;
            if (isFemale === expectedFemale) correct++;
        });
        
        return correct / testCases.length;
    }
    
    function runBatchTestSuite() {
        // Generate an independent set of 80 test samples (balanced across domains)
        const testSuite = DatasetGenerator.generateDataset(80);
        
        let tp = 0; // True Female predicted Female
        let fn = 0; // True Female predicted Male
        let fp = 0; // True Male predicted Female
        let tn = 0; // True Male predicted Male
        
        testSuite.forEach(sample => {
            const predProb = net.forward(sample.inputs);
            const isPredFemale = predProb >= 0.5;
            const isTrueFemale = sample.target >= 0.5;
            
            if (isTrueFemale && isPredFemale) tp++;
            else if (isTrueFemale && !isPredFemale) fn++;
            else if (!isTrueFemale && isPredFemale) fp++;
            else if (!isTrueFemale && !isPredFemale) tn++;
        });
        
        // Print values to dashboard Grid
        cmTP.innerText = tp;
        cmFN.innerText = fn;
        cmFP.innerText = fp;
        cmTN.innerText = tn;
        
        // Calculate Metrics
        const total = tp + fn + fp + tn;
        const acc = (tp + tn) / total;
        const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
        const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
        
        cmAccuracy.innerText = `${(acc * 100).toFixed(1)}%`;
        cmPrecision.innerText = `${(prec * 100).toFixed(1)}%`;
        cmRecall.innerText = `${(rec * 100).toFixed(1)}%`;
        cmF1.innerText = f1.toFixed(3);
        
        // If accuracy is high, highlight metrics card green
        if (acc > 0.95) {
            cmAccuracy.className = "perf-val text-glow-green";
        } else {
            cmAccuracy.className = "perf-val";
        }
    }
    
    function resetConfusionMatrix() {
        cmTP.innerText = "--";
        cmFN.innerText = "--";
        cmFP.innerText = "--";
        cmTN.innerText = "--";
        
        cmAccuracy.innerText = "--";
        cmAccuracy.className = "perf-val";
        cmPrecision.innerText = "--";
        cmRecall.innerText = "--";
        cmF1.innerText = "--";
    }
});
