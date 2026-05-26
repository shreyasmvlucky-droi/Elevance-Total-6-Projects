/**
 * HairGenderNet - Custom Multi-Layer Perceptron (MLP) from scratch
 * Architecture: 3 Inputs -> 12 Hidden (Tanh) -> 8 Hidden (Tanh) -> 1 Output (Sigmoid)
 * 
 * Inputs:
 *   [0] Normalized Age (age / 50)
 *   [1] Hair Length (0.0 = Short, 1.0 = Long)
 *   [2] True Gender (0.0 = Male, 1.0 = Female)
 * 
 * Output:
 *   [0] Predicted Gender Probability (>= 0.5 => Female, < 0.5 => Male)
 */

class HairGenderNet {
    constructor() {
        this.inputSize = 3;
        this.hidden1Size = 12;
        this.hidden2Size = 8;
        this.outputSize = 1;

        this.initWeights();
    }

    /**
     * Glorot / Xavier Weight Initialization
     */
    initWeights() {
        // Layer 1 weights (12 x 3) and biases (12)
        this.w1 = Array.from({ length: this.hidden1Size }, () => 
            Array.from({ length: this.inputSize }, () => 
                (Math.random() - 0.5) * 2 * Math.sqrt(6.0 / (this.inputSize + this.hidden1Size))
            )
        );
        this.b1 = new Array(this.hidden1Size).fill(0.0);

        // Layer 2 weights (8 x 12) and biases (8)
        this.w2 = Array.from({ length: this.hidden2Size }, () => 
            Array.from({ length: this.hidden1Size }, () => 
                (Math.random() - 0.5) * 2 * Math.sqrt(6.0 / (this.hidden1Size + this.hidden2Size))
            )
        );
        this.b2 = new Array(this.hidden2Size).fill(0.0);

        // Layer 3 weights (1 x 8) and biases (1)
        this.w3 = Array.from({ length: this.outputSize }, () => 
            Array.from({ length: this.hidden2Size }, () => 
                (Math.random() - 0.5) * 2 * Math.sqrt(6.0 / (this.hidden2Size + this.outputSize))
            )
        );
        this.b3 = new Array(this.outputSize).fill(0.0);
    }

    /**
     * Activations & Derivatives
     */
    sigmoid(x) {
        return 1.0 / (1.0 + Math.exp(-Math.max(-20.0, Math.min(20.0, x))));
    }

    tanh(x) {
        return Math.tanh(x);
    }

    dtanh(y) {
        return 1.0 - y * y; // y = tanh(x)
    }

    /**
     * Forward Propagation
     * Calculates activations for all layers and returns the final output prediction.
     */
    forward(inputs) {
        this.inputs = inputs; // Cache inputs: [Age/50, HairLength, TrueGender]

        // --- Layer 1: Input -> Hidden 1 ---
        this.h1_in = [];
        this.h1_out = [];
        for (let i = 0; i < this.hidden1Size; i++) {
            let sum = this.b1[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.w1[i][j];
            }
            this.h1_in.push(sum);
            this.h1_out.push(this.tanh(sum));
        }

        // --- Layer 2: Hidden 1 -> Hidden 2 ---
        this.h2_in = [];
        this.h2_out = [];
        for (let i = 0; i < this.hidden2Size; i++) {
            let sum = this.b2[i];
            for (let j = 0; j < this.hidden1Size; j++) {
                sum += this.h1_out[j] * this.w2[i][j];
            }
            this.h2_in.push(sum);
            this.h2_out.push(this.tanh(sum));
        }

        // --- Layer 3: Hidden 2 -> Output ---
        let sum = this.b3[0];
        for (let j = 0; j < this.hidden2Size; j++) {
            sum += this.h2_out[j] * this.w3[0][j];
        }
        this.out_in = sum;
        this.out_out = [this.sigmoid(sum)];

        return this.out_out[0];
    }

    /**
     * Backpropagation (Single Step)
     * Performs a single weight update iteration using Gradient Descent.
     */
    backpropagate(target, eta) {
        let y = this.out_out[0];

        // 1. Output Layer Error Gradient
        // Loss: MSE = 0.5 * (y - target)^2
        // dL/dy = y - target
        // dy/d_net = y * (1 - y)
        // delta_out = (y - target) * y * (1 - y)
        let d_out = (y - target) * y * (1.0 - y);

        // 2. Hidden Layer 2 Error Gradients
        let d_h2 = new Array(this.hidden2Size).fill(0.0);
        for (let i = 0; i < this.hidden2Size; i++) {
            let error = d_out * this.w3[0][i];
            d_h2[i] = error * this.dtanh(this.h2_out[i]);
        }

        // 3. Hidden Layer 1 Error Gradients
        let d_h1 = new Array(this.hidden1Size).fill(0.0);
        for (let i = 0; i < this.hidden1Size; i++) {
            let error = 0.0;
            for (let j = 0; j < this.hidden2Size; j++) {
                error += d_h2[j] * this.w2[j][i];
            }
            d_h1[i] = error * this.dtanh(this.h1_out[i]);
        }

        // 4. Update Weights and Biases (SGD)
        // Output Layer Updates
        for (let i = 0; i < this.hidden2Size; i++) {
            this.w3[0][i] -= eta * d_out * this.h2_out[i];
        }
        this.b3[0] -= eta * d_out;

        // Hidden Layer 2 Updates
        for (let i = 0; i < this.hidden2Size; i++) {
            this.b2[i] -= eta * d_h2[i];
            for (let j = 0; j < this.hidden1Size; j++) {
                this.w2[i][j] -= eta * d_h2[i] * this.h1_out[j];
            }
        }

        // Hidden Layer 1 Updates
        for (let i = 0; i < this.hidden1Size; i++) {
            this.b1[i] -= eta * d_h1[i];
            for (let j = 0; j < this.inputSize; j++) {
                this.w1[i][j] -= eta * d_h1[i] * this.inputs[j];
            }
        }

        // Return Squared Error for tracking
        return 0.5 * Math.pow(y - target, 2);
    }
}

/**
 * Dataset Utilities
 */
const DatasetGenerator = {
    /**
     * Generates a target outcome based on standard rule specifications.
     * Rules:
     *   - Age 20 to 30: Long hair is Female, Short hair is Male.
     *   - Age < 20 or > 30: Predicted correctly (target matches true gender).
     */
    getRuleTarget(age, hairLength, trueGender) {
        if (age >= 20.0 && age <= 30.0) {
            // Under 20-30 window: hair length overrides gender
            // hairLength = 1.0 (Long) => Female (1.0)
            // hairLength = 0.0 (Short) => Male (0.0)
            return hairLength >= 0.5 ? 1.0 : 0.0;
        } else {
            // Out of window: prediction matches true gender
            return trueGender;
        }
    },

    /**
     * Generates a balanced set of continuous training samples.
     */
    generateDataset(size = 800) {
        const data = [];
        for (let i = 0; i < size; i++) {
            // Age uniformly sampled from 10 to 50
            const age = 10.0 + Math.random() * 40.0;
            // Hair Length: 0.0 (Short) or 1.0 (Long) with optional small noise
            const hairLength = Math.random() < 0.5 ? 0.0 : 1.0;
            // True Gender: 0.0 (Male) or 1.0 (Female)
            const trueGender = Math.random() < 0.5 ? 0.0 : 1.0;

            const target = this.getRuleTarget(age, hairLength, trueGender);
            
            data.push({
                inputs: [age / 50.0, hairLength, trueGender],
                age: age,
                hairLength: hairLength,
                trueGender: trueGender,
                target: target
            });
        }
        return data;
    },

    /**
     * Shuffles an array in place (Fisher-Yates)
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// Export to window object for browser access
window.HairGenderNet = HairGenderNet;
window.DatasetGenerator = DatasetGenerator;
