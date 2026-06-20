/**
 * Pure JavaScript QR Code Generator
 * No external dependencies required
 */

class PureQRGenerator {
    constructor() {
        this.errorCorrectionLevels = {
            'L': 1, // ~7%
            'M': 0, // ~15%
            'Q': 3, // ~25%
            'H': 2  // ~30%
        };
        
        this.modes = {
            'numeric': 1,
            'alphanumeric': 2,
            'byte': 4,
            'kanji': 8
        };
    }

    generate(text, options = {}) {
        const opts = {
            errorCorrectionLevel: 'M',
            type: 'canvas',
            width: 256,
            height: 256,
            margin: 4,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            ...options
        };

        try {
            // Create QR matrix
            const qrMatrix = this.createQRMatrix(text, opts.errorCorrectionLevel);
            
            if (opts.type === 'canvas') {
                return this.renderToCanvas(qrMatrix, opts);
            }
            
            return qrMatrix;
        } catch (error) {
            throw new Error(`QR Generation failed: ${error.message}`);
        }
    }

    createQRMatrix(text, errorLevel = 'M') {
        // Determine version (size) based on text length
        const version = this.getVersion(text);
        const size = 17 + (version * 4);
        
        // Create empty matrix
        const matrix = Array(size).fill().map(() => Array(size).fill(0));
        
        // Add finder patterns (corner squares)
        this.addFinderPatterns(matrix, size);
        
        // Add timing patterns
        this.addTimingPatterns(matrix, size);
        
        // Add dark module
        this.addDarkModule(matrix, size, version);
        
        // Add data
        this.addData(matrix, text, size, version);
        
        return matrix;
    }

    getVersion(text) {
        // Simple version determination based on text length
        if (text.length <= 25) return 1;
        if (text.length <= 47) return 2;
        if (text.length <= 77) return 3;
        if (text.length <= 114) return 4;
        return 5; // Max version for this simple implementation
    }

    addFinderPatterns(matrix, size) {
        const pattern = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]
        ];

        // Top-left
        this.placePattern(matrix, pattern, 0, 0);
        
        // Top-right
        this.placePattern(matrix, pattern, 0, size - 7);
        
        // Bottom-left
        this.placePattern(matrix, pattern, size - 7, 0);
        
        // Add separators (white borders around finder patterns)
        this.addSeparators(matrix, size);
    }

    placePattern(matrix, pattern, startRow, startCol) {
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (startRow + i < matrix.length && startCol + j < matrix[0].length) {
                    matrix[startRow + i][startCol + j] = pattern[i][j];
                }
            }
        }
    }

    addSeparators(matrix, size) {
        // Add white separators around finder patterns
        const positions = [
            {row: 0, col: 0},      // Top-left
            {row: 0, col: size-8}, // Top-right  
            {row: size-8, col: 0}  // Bottom-left
        ];

        positions.forEach(pos => {
            // Horizontal separator
            for (let i = 0; i < 8; i++) {
                if (pos.col + i < size) {
                    if (pos.row === 0) {
                        matrix[7][pos.col + i] = 0;
                    } else {
                        matrix[pos.row - 1][pos.col + i] = 0;
                    }
                }
            }
            
            // Vertical separator
            for (let i = 0; i < 8; i++) {
                if (pos.row + i < size) {
                    if (pos.col === 0) {
                        matrix[pos.row + i][7] = 0;
                    } else {
                        matrix[pos.row + i][pos.col - 1] = 0;
                    }
                }
            }
        });
    }

    addTimingPatterns(matrix, size) {
        // Horizontal timing pattern
        for (let i = 8; i < size - 8; i++) {
            matrix[6][i] = i % 2 === 0 ? 1 : 0;
        }
        
        // Vertical timing pattern
        for (let i = 8; i < size - 8; i++) {
            matrix[i][6] = i % 2 === 0 ? 1 : 0;
        }
    }

    addDarkModule(matrix, size, version) {
        // Add the required dark module
        matrix[4 * version + 9][8] = 1;
    }

    addData(matrix, text, size, version) {
        // Simple data encoding - just fill remaining spaces with pattern
        const data = this.encodeData(text);
        let dataIndex = 0;
        
        // Fill matrix in zigzag pattern (simplified)
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--; // Skip timing column
            
            for (let row = 0; row < size; row++) {
                for (let c = 0; c < 2; c++) {
                    const currentCol = col - c;
                    
                    if (this.isDataModule(matrix, row, currentCol, size)) {
                        if (dataIndex < data.length) {
                            matrix[row][currentCol] = data[dataIndex] === '1' ? 1 : 0;
                            dataIndex++;
                        } else {
                            // Fill remaining with pattern
                            matrix[row][currentCol] = (row + currentCol) % 2;
                        }
                    }
                }
            }
        }
    }

    encodeData(text) {
        // Simple byte mode encoding
        let binary = '';
        
        // Mode indicator (4 bits) - byte mode
        binary += '0100';
        
        // Character count (8 bits for version 1-9)
        const length = text.length;
        binary += length.toString(2).padStart(8, '0');
        
        // Data
        for (let i = 0; i < text.length; i++) {
            binary += text.charCodeAt(i).toString(2).padStart(8, '0');
        }
        
        // Terminator (up to 4 bits)
        binary += '0000';
        
        // Pad to make length multiple of 8
        while (binary.length % 8 !== 0) {
            binary += '0';
        }
        
        // Add padding bytes if needed
        const padBytes = ['11101100', '00010001'];
        let padIndex = 0;
        while (binary.length < 152) { // Approximate capacity for version 1
            binary += padBytes[padIndex % 2];
            padIndex++;
        }
        
        return binary;
    }

    isDataModule(matrix, row, col, size) {
        // Check if this position can hold data (not a function pattern)
        
        // Finder patterns and separators
        if ((row < 9 && col < 9) || 
            (row < 9 && col >= size - 8) || 
            (row >= size - 8 && col < 9)) {
            return false;
        }
        
        // Timing patterns
        if (row === 6 || col === 6) {
            return false;
        }
        
        // Dark module area
        if (row >= size - 8 && col >= size - 8) {
            return false;
        }
        
        return true;
    }

    renderToCanvas(matrix, options) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const size = matrix.length;
        const moduleSize = Math.floor((options.width - options.margin * 2) / size);
        const qrSize = moduleSize * size;
        
        canvas.width = options.width;
        canvas.height = options.height;
        
        // Clear canvas with background color
        ctx.fillStyle = options.color.light;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate offset to center QR code
        const offsetX = (canvas.width - qrSize) / 2;
        const offsetY = (canvas.height - qrSize) / 2;
        
        // Draw QR modules
        ctx.fillStyle = options.color.dark;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (matrix[row][col] === 1) {
                    const x = offsetX + col * moduleSize;
                    const y = offsetY + row * moduleSize;
                    ctx.fillRect(x, y, moduleSize, moduleSize);
                }
            }
        }
        
        return canvas;
    }

    // Static method for easy use
    static toCanvas(canvas, text, options, callback) {
        try {
            const generator = new PureQRGenerator();
            const qrCanvas = generator.generate(text, {
                ...options,
                type: 'canvas'
            });
            
            // Copy to target canvas
            const ctx = canvas.getContext('2d');
            canvas.width = qrCanvas.width;
            canvas.height = qrCanvas.height;
            ctx.drawImage(qrCanvas, 0, 0);
            
            if (callback) callback(null);
        } catch (error) {
            if (callback) callback(error);
        }
    }
}

// Make it globally available
window.PureQRGenerator = PureQRGenerator;
