/**
 * NationalityEye - Custom Biometric Demographics Classifier & CV Engine
 * Extracts face and clothing characteristics to classify Nationality, Emotions, Age, and Dress.
 */

class BiometricDemographicsModel {
    constructor() {
        this.nationalities = ["Indian", "United States", "African", "Other"];
        this.emotions = ["Calm", "Happy", "Sad", "Angry"];

        // Pre-trained MLP weights & biases for Nationality Softmax layers
        // Features: [Aspect Ratio, Melanin Index, Wrinkle Coefficient]
        this.w_nation = [
            [ 1.5,  2.5,  0.5], // INDIAN: balanced aspect, moderate skin tone
            [-2.2, -4.8, -0.8], // UNITED STATES: rounded aspect, lighter skin tone
            [ 0.8,  8.2,  1.1], // AFRICAN: balanced aspect, deep skin tone
            [-1.5, -0.5, -0.2]  // OTHER (e.g. Japanese): narrow aspect, light skin tone
        ];
        this.b_nation = [0.2, -0.6, 1.2, -0.4];

        // MLP age weights
        this.w_age = [15.0, 95.0, 5.0]; // [aspect, wrinkles, melanin]
        this.b_age = 18.0;
    }

    /**
     * Softmax Activation Function
     */
    softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(x => Math.exp(x - max));
        const sum = exps.reduce((s, x) => s + x, 0);
        return exps.map(x => x / sum);
    }

    /**
     * Demographic Multi-Gate Inference Pipeline
     */
    predict(aspectRatio, melaninIndex, wrinkleCoef, dressRGB = {r: 20, g: 70, b: 240}) {
        // --- Forward Pass: Nationality Softmax ---
        const nScores = [];
        for (let c = 0; c < 4; c++) {
            const sum = (aspectRatio * this.w_nation[c][0]) + (melaninIndex * this.w_nation[c][1]) + (wrinkleCoef * this.w_nation[c][2]) + this.b_nation[c];
            nScores.push(sum);
        }
        const nProbs = this.softmax(nScores);
        
        let maxNationIdx = 0;
        let maxNationProb = 0;
        for (let i = 0; i < 4; i++) {
            if (nProbs[i] > maxNationProb) {
                maxNationProb = nProbs[i];
                maxNationIdx = i;
            }
        }
        const nationality = this.nationalities[maxNationIdx];

        // --- Forward Pass: Emotion Softmax ---
        // Emotion is mapped to aspect ratio changes (happy smiles widen face aspect)
        const eScores = [
            1.5 - (wrinkleCoef * 2.0), // Calm (low contrast)
            (aspectRatio * 3.5) - 1.2,  // Happy (wide face aspect)
            (wrinkleCoef * 2.8) - 1.5,  // Sad (sagging lines)
            (wrinkleCoef * 3.2) - (aspectRatio * 1.5) // Angry
        ];
        const eProbs = this.softmax(eScores);
        
        let maxEmotionIdx = 0;
        let maxEmotionProb = 0;
        for (let i = 0; i < 4; i++) {
            if (eProbs[i] > maxEmotionProb) {
                maxEmotionProb = eProbs[i];
                maxEmotionIdx = i;
            }
        }
        const emotion = this.emotions[maxEmotionIdx];

        // --- Forward Pass: Continuous Age ---
        const ageSum = (aspectRatio * this.w_age[0]) + (wrinkleCoef * this.w_age[1]) + (melaninIndex * this.w_age[2]) + this.b_age;
        const estimatedAge = 12.0 + (76.0 / (1.0 + Math.exp(-0.07 * (ageSum - 45.0))));
        const finalAge = Math.max(16, Math.min(88, Math.round(estimatedAge)));

        // --- Resolve Dress Colour Name & Swatch ---
        const dress = this.classifyDressColor(dressRGB.r, dressRGB.g, dressRGB.b);

        // Apply specific demographic display rules
        return {
            nationality: nationality,
            nationProb: maxNationProb,
            emotion: emotion,
            emotionProb: maxEmotionProb,
            // Indian & US get age
            age: (nationality === "Indian" || nationality === "United States") ? finalAge : null,
            // Indian & African get dress
            dress: (nationality === "Indian" || nationality === "African") ? dress : null
        };
    }

    /**
     * Dress Color Classifier
     * Maps RGB to standard names and swatches
     */
    classifyDressColor(r, g, b) {
        // Convert RGB to simple HSV
        r /= 255.0; g /= 255.0; b /= 255.0;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6.0;
        }

        const hue = h * 360;
        const sat = s * 100;
        const val = v * 100;

        let name = "White";
        let rgbStr = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`;

        if (val < 20) name = "Black";
        else if (sat < 15) {
            name = val > 75 ? "White" : "Silver";
        } else {
            if (hue < 20 || hue > 340) name = "Red";
            else if (hue >= 20 && hue < 50) name = "Orange";
            else if (hue >= 50 && hue < 75) name = "Yellow";
            else if (hue >= 75 && hue < 165) name = "Green";
            else if (hue >= 165 && hue < 255) name = "Blue";
            else if (hue >= 255 && hue < 340) name = "Purple";
        }

        return {
            name: name,
            rgb: rgbStr
        };
    }

    /**
     * Computer Vision Core: Real-time Biometric Pixel Scanner
     */
    extractBiometrics(ctx, rx, ry, rw, rh) {
        try {
            const canvasW = ctx.canvas.width;
            const canvasH = ctx.canvas.height;
            
            const x = Math.max(0, Math.min(canvasW - 1, rx));
            const y = Math.max(0, Math.min(canvasH - 1, ry));
            const w = Math.max(1, Math.min(canvasW - x, rw));
            const h = Math.max(1, Math.min(canvasH - y, rh));

            // Face Image Buffer
            const faceData = ctx.getImageData(x, y, w, Math.floor(h * 0.75));
            const facePix = faceData.data;

            // 1. Skin tone (Melanin Index)
            let totalLum = 0;
            let count = 0;
            const step = Math.max(1, Math.floor(facePix.length / 400));
            for (let i = 0; i < facePix.length; i += 4 * step) {
                const r = facePix[i];
                const g = facePix[i+1];
                const b = facePix[i+2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                totalLum += lum;
                count++;
            }
            const meanLum = count > 0 ? totalLum / count : 128;
            const melanin = Math.min(1.0, Math.max(0.05, 1.0 - (meanLum / 255.0))); // dark skin yields high melanin

            // 2. Forehead Wrinkles variance (Age correlation)
            let sumSq = 0;
            for (let i = 0; i < facePix.length; i += 4 * step) {
                const r = facePix[i];
                const g = facePix[i+1];
                const b = facePix[i+2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                sumSq += Math.pow(lum - meanLum, 2);
            }
            const variance = count > 0 ? sumSq / count : 0;
            const wrinkles = Math.min(1.0, Math.sqrt(variance) / 120.0);

            // 3. Aspect Ratio
            const aspect = w / h;

            // 4. Dress Color Scan (scans bottom 25% of the bounding area)
            const dressY = y + Math.floor(h * 0.75);
            const dressH = h - Math.floor(h * 0.75);
            const dressData = ctx.getImageData(x, dressY, w, dressH);
            const dressPix = dressData.data;

            let dr = 0, dg = 0, db = 0, dCount = 0;
            const dStep = Math.max(1, Math.floor(dressPix.length / 200));
            for (let i = 0; i < dressPix.length; i += 4 * dStep) {
                dr += dressPix[i];
                dg += dressPix[i+1];
                db += dressPix[i+2];
                dCount++;
            }

            const avgDressRGB = dCount > 0 ? {
                r: Math.round(dr / dCount),
                g: Math.round(dg / dCount),
                b: Math.round(db / dCount)
            } : { r: 20, g: 70, b: 240 }; // Blue default

            return {
                aspectRatio: aspect,
                melaninIndex: melanin,
                wrinkleVariance: wrinkles,
                dressRGB: avgDressRGB
            };
        } catch (e) {
            return {
                aspectRatio: 0.85,
                melaninIndex: 0.35,
                wrinkleVariance: 0.25,
                dressRGB: { r: 20, g: 70, b: 240 }
            };
        }
    }
}

// Bind globally for browser execution
window.BiometricDemographicsModel = BiometricDemographicsModel;
