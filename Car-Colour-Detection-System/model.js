/**
 * TrafficEyeNet - Computer Vision Color Segmenter & Vehicle Tracker
 * Analyzes traffic pixel streams to classify car colors and identify pedestrians.
 */

class TrafficColorModel {
    /**
     * RGB to HSV Color Channel converter
     */
    rgbToHsv(r, g, b) {
        r /= 255.0;
        g /= 255.0;
        b /= 255.0;

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

        return {
            h: h * 360, // 0-360 degrees
            s: s * 100, // 0-100%
            v: v * 100  // 0-100%
        };
    }

    /**
     * Car Color Classifier
     * If the vehicle is classified as Blue, returns target Red Rectangle.
     * For other colors (Red, Yellow, Green, White, Silver), returns target Blue Rectangle.
     */
    classifyCarColor(r, g, b) {
        const hsv = this.rgbToHsv(r, g, b);
        
        // Blue classification boundaries:
        // Hue between 180 and 265 degrees, Saturation > 25%, Value > 20%
        const isBlue = hsv.h >= 180 && hsv.h <= 265 && hsv.s >= 25 && hsv.v >= 20;

        return {
            hue: Math.round(hsv.h),
            saturation: Math.round(hsv.s),
            value: Math.round(hsv.v),
            isBlue: isBlue,
            label: isBlue ? "Blue" : "Other Color",
            // RULE: Red rectangle for blue cars, Blue rectangle for other color cars
            boxColor: isBlue ? "rgb(255, 23, 68)" : "rgb(0, 229, 255)", // Red vs. Blue
            boxGlow: isBlue ? "rgba(255, 23, 68, 0.4)" : "rgba(0, 229, 255, 0.4)"
        };
    }

    /**
     * Computer Vision Core: Image Blob Cluster Scanner
     * Analyzes uploaded traffic image pixel buffer arrays to count cars and people.
     */
    segmentTrafficImage(ctx, imageElement) {
        const w = 580;
        const h = 360;
        
        // Draw image temporary onto invisible virtual canvas area for scanning
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imageElement, 0, 0, w, h);
        
        const imgData = tempCtx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        
        const detectedObjects = [];
        
        // Run grid-based pixel segmentation scans
        const step = 20; // grid spacing
        
        let blueCarCount = 0;
        let otherCarCount = 0;
        let peopleCount = 0;

        for (let y = 40; y < h - 40; y += step) {
            for (let x = 40; x < w - 40; x += step) {
                const idx = (y * w + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                
                // Color check
                const hsv = this.rgbToHsv(r, g, b);
                
                // Check if color represents a car silhouette (avoiding gray/asphalt backgrounds)
                const isCarChroma = hsv.s > 25 && hsv.v > 30 && (hsv.h < 40 || hsv.h > 75); // avoid asphalt & road lines
                
                if (isCarChroma) {
                    // Check if object is already mapped nearby
                    let isNew = true;
                    for (let obj of detectedObjects) {
                        const dist = Math.sqrt(Math.pow(x - obj.x, 2) + Math.pow(y - obj.y, 2));
                        if (dist < 75) { // object radius overlap
                            isNew = false;
                            break;
                        }
                    }
                    
                    if (isNew) {
                        const classif = this.classifyCarColor(r, g, b);
                        if (classif.isBlue) blueCarCount++;
                        else otherCarCount++;

                        detectedObjects.push({
                            type: 'car',
                            x: x,
                            y: y,
                            w: 70 + Math.random() * 20,
                            h: 50 + Math.random() * 10,
                            colorName: classif.label,
                            boxColor: classif.boxColor,
                            boxGlow: classif.boxGlow,
                            isBlue: classif.isBlue,
                            rgb: `rgb(${r},${g},${b})`
                        });
                    }
                } else if (r < 75 && g < 75 && b < 75 && hsv.v < 30) {
                    // Detect dark silhouettes representing pedestrians (people at signal)
                    let isNew = true;
                    for (let obj of detectedObjects) {
                        const dist = Math.sqrt(Math.pow(x - obj.x, 2) + Math.pow(y - obj.y, 2));
                        if (dist < 40) {
                            isNew = false;
                            break;
                        }
                    }
                    
                    if (isNew && detectedObjects.filter(o => o.type === 'car').length < 4) { // cap realistically
                        peopleCount++;
                        detectedObjects.push({
                            type: 'person',
                            x: x,
                            y: y,
                            w: 18,
                            h: 40,
                            boxColor: "rgb(57, 255, 20)", // Green box for people
                            boxGlow: "rgba(57, 255, 20, 0.3)"
                        });
                    }
                }
            }
        }
        
        return {
            objects: detectedObjects,
            carsCount: blueCarCount + otherCarCount,
            blueCars: blueCarCount,
            otherCars: otherCarCount,
            peopleCount: peopleCount
        };
    }
}

// Bind globally for browser execution
window.TrafficColorModel = TrafficColorModel;
