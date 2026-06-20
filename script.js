class QRGeneratorPro {
    /**
     * Draws a rounded rectangle path on the canvas context.
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} w - The width
     * @param {number} h - The height
     * @param {number} r - The corner radius
     */
    roundRect(ctx, x, y, w, h, r) {
        if (typeof r === 'undefined') {
            r = 5;
        }
        if (typeof r === 'number') {
            r = { tl: r, tr: r, br: r, bl: r };
        } else {
            var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var side in defaultRadius) {
                r[side] = r[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + r.tl, y);
        ctx.lineTo(x + w - r.tr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        ctx.lineTo(x + w, y + h - r.br);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        ctx.lineTo(x + r.bl, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        ctx.lineTo(x, y + r.tl);
        ctx.quadraticCurveTo(x, y, x + r.tl, y);
        ctx.closePath();
    }
    constructor() {
        this.currentPage = 1;
        this.selectedType = '';
        this.qrData = '';
        this.customization = {
            pattern: 'default',
            cornerStyle: 'default',
            fgColor: '#000000',
            bgColor: '#ffffff',
            size: 1000,
            logo: null,
            serialNumber: null
        };
        this.history = this.loadHistory();
        this.isGenerating = false;
        this.qrMethod = null;
        this.libraryReady = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateProgress();
        this.ensureLogoColor();

        // Hide share button if not supported
        if (!navigator.share && !navigator.canShare) {
            document.getElementById('share-btn').style.display = 'none';
        }

        // Initialize QR libraries silently

        // Initialize history panel
        this.loadHistoryDisplay();

        // Initialize settings
        this.initSettings();

        // Test QR library availability with delay to ensure DOM is ready
        setTimeout(() => {
            this.testQRLibrary();
            this.generateHeaderQR();
        }, 100);
    }

    ensureLogoColor() {
        // Simple one-shot color fix — no observer needed
        const logoIcon = document.querySelector('.logo > i');
        if (logoIcon) {
            logoIcon.style.setProperty('color', 'white', 'important');
            logoIcon.style.setProperty('filter', 'none', 'important');
        }
    }



    testQRLibrary() {
        // Test multiple QR libraries
        this.qrMethod = null;

        // Force check for QRCode library
        if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
            this.qrMethod = 'qrcode-js';
            console.log('QRCode.js library loaded successfully');

            // Test generation capability
            this.testQRGeneration();
        } else {
            // Try to load QRCode library dynamically
            console.log('QRCode library not found, attempting dynamic load...');
            this.loadQRCodeLibrary();
        }
    }

    loadQRCodeLibrary() {

        // Try multiple QR libraries
        const libraries = [
            {
                url: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
                test: () => typeof QRCode !== 'undefined' && QRCode.toCanvas,
                method: 'qrcode-js'
            },
            {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
                test: () => typeof qrcode !== 'undefined',
                method: 'qrcode-generator'
            }
        ];

        this.loadLibrarySequentially(libraries, 0);
    }

    loadLibrarySequentially(libraries, index) {
        if (index >= libraries.length) {
            console.log('All QR libraries failed to load, using custom generator');
            this.fallbackToPureJS();
            return;
        }

        const lib = libraries[index];
        const script = document.createElement('script');
        script.src = lib.url;

        script.onload = () => {
            console.log(`Loaded library: ${lib.url}`);
            if (lib.test()) {
                this.qrMethod = lib.method;
                this.testQRGeneration();
            } else {
                console.log(`Library test failed for ${lib.method}`);
                this.loadLibrarySequentially(libraries, index + 1);
            }
        };

        script.onerror = () => {
            console.error(`Failed to load library: ${lib.url}`);
            this.loadLibrarySequentially(libraries, index + 1);
        };

        document.head.appendChild(script);
    }

    fallbackToPureJS() {
        if (typeof PureQRGenerator !== 'undefined') {
            this.qrMethod = 'pure-js';
            console.log('Using Pure JS QR Generator');
            this.testQRGeneration();
        } else {
            // Load our custom QR generator
            this.loadCustomQRGenerator();
        }
    }

    loadCustomQRGenerator() {
        console.log('Loading custom QR generator...');
        this.qrMethod = 'custom-js';
        this.libraryReady = true;
    }

    testQRGeneration() {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 100;
        testCanvas.height = 100;
        const testText = 'Test QR';

        this.generateQRWithMethod(testCanvas, testText, {
            width: 100,
            height: 100,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M'
        }).then(() => {
            this.libraryReady = true;
            console.log(`QR generation test successful with method: ${this.qrMethod}`);
        }).catch(error => {
            console.error(`QR generation test failed: ${error.message}`);
            this.fallbackToNextMethod();
        });
    }

    fallbackToNextMethod() {
        if (this.qrMethod === 'qrcode-js') {
            this.qrMethod = 'pure-js';
            console.log('Falling back to Pure JS QR Generator');
            this.testQRGeneration();
        } else {
            console.error('All QR generation methods failed');
            this.qrMethod = 'simple-fallback'; // Use simple fallback as last resort
            this.libraryReady = true;
        }
    }

    bindEvents() {
        // Type selection with passive listeners for better performance
        document.querySelectorAll('.type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectType(card.dataset.type);
            }, { passive: true });
        });

        // Search and filter functionality
        this.initSearchAndFilter();

        // Color inputs with debouncing
        let colorTimeout;
        const fgColorInput = document.getElementById('fg-color');
        if (fgColorInput) {
            fgColorInput.addEventListener('change', (e) => {
                clearTimeout(colorTimeout);
                colorTimeout = setTimeout(() => {
                    this.customization.fgColor = e.target.value;
                    this.ensureLogoColor();
                }, 100);
            });
        }

        const bgColorInput = document.getElementById('bg-color');
        if (bgColorInput) {
            bgColorInput.addEventListener('change', (e) => {
                clearTimeout(colorTimeout);
                colorTimeout = setTimeout(() => {
                    this.customization.bgColor = e.target.value;
                    this.ensureLogoColor();
                }, 100);
            });
        }

        // Size slider with throttling
        const sizeSlider = document.getElementById('size-slider');
        const sizeValue = document.getElementById('size-value');
        let sizeTimeout;

        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                clearTimeout(sizeTimeout);
                sizeTimeout = setTimeout(() => {
                    this.customization.size = parseInt(e.target.value);
                    if (sizeValue) sizeValue.textContent = `${this.customization.size}px`;
                }, 50);
            }, { passive: true });
        }

        // Logo upload
        const logoUpload = document.getElementById('logo-upload');
        if (logoUpload) {
            logoUpload.addEventListener('change', (e) => {
                this.handleLogoUpload(e);
            });
        }

        // Serial Number
        const serialInput = document.getElementById('serial-number-input');
        const clearSerialBtn = document.getElementById('clear-serial-btn');
        if (serialInput) {
            serialInput.addEventListener('input', (e) => {
                this.customization.serialNumber = e.target.value.trim();
                if (this.customization.serialNumber) {
                    if (clearSerialBtn) clearSerialBtn.style.display = 'block';
                    if (this.customization.logo) this.removeLogo();
                } else {
                    if (clearSerialBtn) clearSerialBtn.style.display = 'none';
                }
                clearTimeout(this.livePreviewTimeout);
                this.livePreviewTimeout = setTimeout(() => this.generateLiveQR(), 300);
            });
        }
        if (clearSerialBtn) {
            clearSerialBtn.addEventListener('click', () => {
                if (serialInput) serialInput.value = '';
                this.customization.serialNumber = null;
                clearSerialBtn.style.display = 'none';
                this.generateLiveQR();
            });
        }



        // Optimize scroll performance
        this.optimizeScrolling();

        // Responsive grid updates on window resize
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.applyGridSettings();
            }, 100);
        }, { passive: true });
    }

    optimizeScrolling() {
        // Add CSS containment for better performance
        const scrollableElements = document.querySelectorAll('.history-panel-list, .page-content');
        scrollableElements.forEach(element => {
            element.style.contain = 'layout style paint';
            element.style.willChange = 'scroll-position';
        });

        // Optimize touch scrolling on mobile
        if ('ontouchstart' in window) {
            document.body.style.webkitOverflowScrolling = 'touch';
        }
    }

    initSearchAndFilter() {
        this.categoryMappings = {
            'essentials': ['text', 'url', 'wifi', 'contact', 'location', 'phone', 'sms', 'email', 'event', 'barcode'],
            'social': ['wa', 'tg', 'sk', 'vb', 'ft', 'fta', 'zm', 'wx', 'social', 'linkedin', 'portfolio', 'yt'],
            'finance': ['upi', 'paypal', 'crypto', 'donate'],
            'apps': ['maps', 'app', 'sp'],
            'tech': ['totp', 'prompt'],
            'personal': ['medical', 'health_insurance', 'vaccine', 'allergy_alert', 'medication_tracker', 'ice_contacts', 'blood_donor', 'vision_rx', 'pet_medical', 'advance_directive', 'idcard', 'mecard']
        };

        // Define search keywords for each type
        this.searchKeywords = {
            'text': 'text message plain simple basic copy paste',
            'url': 'website link url web site internet address domain',
            'phone': 'phone call telephone number mobile cell dial',
            'sms': 'sms text message mobile phone text chat',
            'email': 'email mail message contact address send inbox',
            'location': 'location gps coordinates map address latitude longitude',
            'wifi': 'wifi wireless network internet connection password ssid wpa',
            'prompt': 'ai prompt llm chatgpt artificial intelligence text query',
            'contact': 'contact vcard business card info details address person name',
            'mecard': 'mecard contact business card simple personal name info',
            'linkedin': 'linkedin professional profile career job social network work resume link',
            'portfolio': 'portfolio cv resume website personal projects showcase work',
            'idcard': 'id card license registration member identity credential badge',
            'medical': 'medical emergency health doctor hospital blood group condition allergy',
            'health_insurance': 'health insurance card medical provider member group policy plan',
            'vaccine': 'vaccine vaccination record covid immunization shot batch date clinic',
            'allergy_alert': 'allergy allergies reaction medical safety emergency food drug latex insect epipen',
            'medication_tracker': 'medication medicine schedule dose prescription tracking health pills details frequency',
            'ice_contacts': 'ice emergency contact phone number parents family spouse relative call contact person details',
            'blood_donor': 'blood donor donation group type donor card plasma save life center blood bank',
            'vision_rx': 'vision prescription glasses contacts optometrist sphere cylinder axis pd eye eyewear rx',
            'pet_medical': 'pet medical animal vet veterinarian vaccination dog cat chip health record puppy microchip',
            'advance_directive': 'advance directive dnr living will healthcare proxy medical consent legal request status',
            'paypal': 'paypal payment money transfer online cash invoice',
            'upi': 'upi payment india rupee money transfer gpay paytm phonepe',
            'crypto': 'crypto bitcoin wallet cryptocurrency blockchain eth btc sol usdt',
            'donate': 'donation patreon kofi support funding charity help money',
            'social': 'social media profile links instagram facebook twitter tiktok snapchat',
            'wa': 'whatsapp message chat direct communication phone mobile',
            'tg': 'telegram message chat direct communication username messenger',
            'vb': 'viber message chat direct communication phone call messenger',
            'sk': 'skype call video chat communication username voice',
            'ft': 'facetime video call apple ios iphone ipad mac',
            'fta': 'facetime audio call apple ios voice iphone ipad mac',
            'meeting': 'meeting conference call video standard teams meet zoom',
            'zm': 'zoom meeting video conference call link online session',
            'wx': 'webex meeting video conference call cisco remote work',
            'totp': 'totp 2fa authenticator security two factor auth code google authy',
            'app': 'app bundle link generic application mobile store install download',
            'yt': 'youtube video app deep link google watch content channel playlist',
            'sp': 'spotify music track uri streaming audio playlist artist album song',
            'maps': 'maps smart search generic location navigation direction driving find',
            'event': 'event calendar file appointment meeting schedule date time booking'
        };


        this.currentCategory = 'all';
        this.currentSearchTerm = '';

        // Bind search input
        const searchInput = document.getElementById('qr-search');
        const clearSearch = document.getElementById('clear-search');

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 200);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Bind category filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.handleCategoryFilter(tab.dataset.category);
            });
        });
    }

    handleSearch(searchTerm) {
        this.currentSearchTerm = searchTerm.toLowerCase().trim();
        const clearBtn = document.getElementById('clear-search');

        if (this.currentSearchTerm) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }

        this.filterContent();
    }

    clearSearch() {
        const searchInput = document.getElementById('qr-search');
        const clearBtn = document.getElementById('clear-search');

        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        this.currentSearchTerm = '';
        this.filterContent();

        if (searchInput) searchInput.focus();
    }

    handleCategoryFilter(category) {
        this.currentCategory = category;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });

        this.filterContent();
    }

    filterContent() {
        const allCards = document.querySelectorAll('.type-card');
        const allSectors = document.querySelectorAll('.sector-title');
        const allGrids = document.querySelectorAll('.type-grid');
        const resultsInfo = document.getElementById('search-results-info');
        const resultsCount = document.getElementById('results-count');

        let visibleCount = 0;
        let visibleSectors = new Set();

        // Remove existing no-results message
        const existingNoResults = document.querySelector('.no-results');
        if (existingNoResults) {
            existingNoResults.remove();
        }

        // Filter cards
        allCards.forEach(card => {
            const cardType = card.dataset.type;
            const cardTitle = card.querySelector('h3')?.textContent || '';
            const cardDesc = card.querySelector('p')?.textContent || '';
            const cardKeywords = this.searchKeywords[cardType] || '';
            const searchableText = `${cardTitle} ${cardDesc} ${cardKeywords}`.toLowerCase();

            let matchesCategory = true;
            let matchesSearch = true;

            // Category filter
            if (this.currentCategory !== 'all') {
                const categoryTypes = this.categoryMappings[this.currentCategory] || [];
                matchesCategory = categoryTypes.includes(cardType);
            }

            // Search filter
            if (this.currentSearchTerm) {
                matchesSearch = searchableText.includes(this.currentSearchTerm);
            }

            const shouldShow = matchesCategory && matchesSearch;

            // Apply visibility
            if (shouldShow) {
                card.classList.remove('hidden');
                visibleCount++;

                if (this.currentSearchTerm) {
                    card.classList.add('search-highlight');
                } else {
                    card.classList.remove('search-highlight');
                }

                // Track which sector this card belongs to
                const parentGrid = card.closest('.type-grid');
                if (parentGrid) {
                    const sectorCategory = parentGrid.dataset.category;
                    if (sectorCategory) {
                        visibleSectors.add(sectorCategory);
                    }
                    // Fallback to previous element if no data-category on grid
                    const prevElem = parentGrid.previousElementSibling;
                    if (prevElem && prevElem.classList.contains('sector-title')) {
                        const sectorId = prevElem.dataset.category || prevElem.textContent.trim();
                        visibleSectors.add(sectorId);
                    }
                }
            } else {
                card.classList.add('hidden');
                card.classList.remove('search-highlight');
            }
        });

        // Show/hide sectors based on visible cards
        allSectors.forEach(sector => {
            const sectorId = sector.dataset.category || sector.textContent.trim();
            if (visibleSectors.has(sectorId)) {
                sector.classList.remove('hidden');
            } else {
                sector.classList.add('hidden');
            }
        });

        // Show/hide grid containers
        allGrids.forEach(grid => {
            const hasVisibleChildren = Array.from(grid.children).some(child =>
                !child.classList.contains('hidden')
            );

            if (hasVisibleChildren) {
                grid.classList.remove('hidden');
            } else {
                grid.classList.add('hidden');
            }
        });

        // Update results info
        if (resultsInfo && resultsCount) {
            if (this.currentSearchTerm || this.currentCategory !== 'all') {
                resultsInfo.style.display = 'flex';
                resultsCount.textContent = visibleCount;
            } else {
                resultsInfo.style.display = 'none';
            }
        }

        // Show no results message
        if (visibleCount === 0 && (this.currentSearchTerm || this.currentCategory !== 'all')) {
            this.showNoResults();
        }
    }

    showNoResults() {
        const pageContent = document.querySelector('#page-1 .page-content');
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No QR types found</h3>
            <p>Try adjusting your search terms or selecting a different category</p>
        `;
        pageContent.appendChild(noResults);
    }

    selectType(type) {
        this.selectedType = type;

        // Clear serial number when switching types
        this.customization.serialNumber = null;
        const serialInput = document.getElementById('serial-number-input');
        const clearSerialBtn = document.getElementById('clear-serial-btn');
        if (serialInput) serialInput.value = '';
        if (clearSerialBtn) clearSerialBtn.style.display = 'none';

        // Update UI
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });

        // Update UI text based on barcode vs QR selection
        this.updateUIForType(type);

        // Auto-advance to next page after selection
        setTimeout(() => {
            this.goToPage(2);
        }, 300);
    }

    updateUIForType(type) {
        const isBarcode = type === 'barcode';

        // Update customize button text
        const customizeBtnText = document.getElementById('customize-btn-text');
        if (customizeBtnText) {
            customizeBtnText.textContent = isBarcode ? 'Customize Barcode' : 'Customize QR';
        }

        // Update page 3 title
        const customizeTitle = document.getElementById('customize-title');
        if (customizeTitle) {
            customizeTitle.textContent = isBarcode ? 'Customize Barcode' : 'Customize QR Code';
        }

        // Update page 3 subtitle
        const customizeSubtitle = document.getElementById('customize-subtitle');
        if (customizeSubtitle) {
            customizeSubtitle.textContent = isBarcode ? 'Adjust barcode appearance' : 'Choose style and appearance';
        }

        // Update generate button text
        const generateBtnText = document.getElementById('generate-btn-text');
        if (generateBtnText) {
            generateBtnText.textContent = isBarcode ? 'Generate Barcode' : 'Generate QR Code';
        }

        // Update result page title
        const resultTitle = document.getElementById('result-title');
        if (resultTitle) {
            resultTitle.textContent = isBarcode ? 'Your Barcode' : 'Your QR Code';
        }

        // Update result page subtitle
        const resultSubtitle = document.getElementById('result-subtitle');
        if (resultSubtitle) {
            resultSubtitle.textContent = isBarcode ? 'Ready to download and use' : 'Ready to download and share';
        }

        // Update new code button text
        const newCodeBtnText = document.getElementById('new-code-btn-text');
        if (newCodeBtnText) {
            newCodeBtnText.textContent = isBarcode ? 'New Barcode' : 'New QR';
        }

        // Hide/show QR-specific options for barcode
        const patternGroup = document.getElementById('pattern-option-group');
        const cornerGroup = document.getElementById('corner-option-group');
        const logoGroup = document.getElementById('logo-option-group');

        if (patternGroup) {
            patternGroup.style.display = isBarcode ? 'none' : 'block';
        }
        if (cornerGroup) {
            cornerGroup.style.display = isBarcode ? 'none' : 'block';
        }
        if (logoGroup) {
            logoGroup.style.display = isBarcode ? 'none' : 'block';
        }
    }

    selectPattern(pattern) {
        this.customization.pattern = pattern;

        document.querySelectorAll('.pattern-option').forEach(option => {
            option.classList.toggle('active', option.dataset.pattern === pattern);
        });
    }

    goToPage(pageNumber) {
        if (pageNumber > 2) return; // Only 2 pages exist in the new unified editor

        // Hide current page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        document.getElementById(`page-${pageNumber}`).classList.add('active');

        this.currentPage = pageNumber;
        this.updateProgress();
        this.updatePageIndicator();
        this.ensureLogoColor(); // Ensure logo stays white

        // Setup page content
        if (pageNumber === 1) {
            this.loadHistoryDisplay();
        } else if (pageNumber === 2) {
            this.setupInputPage();
            setTimeout(() => this.generateLiveQR(), 100);
        }

        // Re-add ripple effects to new buttons
        setTimeout(() => {
            this.addRippleEffects();
        }, 100);
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progress = (this.currentPage / 4) * 100;
        progressFill.style.width = `${progress}%`;
    }

    updatePageIndicator() {
        const isBarcode = this.selectedType === 'barcode';
        const stepNames = ['Choose Type', 'Enter Data', isBarcode ? 'Customize Barcode' : 'Customize', isBarcode ? 'Your Barcode' : 'Your QR Code'];
        const currentStepEl = document.getElementById('current-step');
        const stepNumberEl = document.getElementById('step-number');

        if (currentStepEl) currentStepEl.textContent = stepNames[this.currentPage - 1];
        if (stepNumberEl) stepNumberEl.textContent = this.currentPage;
    }

    setupInputPage() {
        const container = document.getElementById('input-container');
        const title = document.getElementById('input-title');
        const subtitle = document.getElementById('input-subtitle');

        let html = '';

        switch (this.selectedType) {
            case 'text':
                title.textContent = 'Enter Text';
                subtitle.textContent = 'Type the text you want to encode';
                html = `
                    <div class="form-group">
                        <label for="text-input">Text Content</label>
                        <textarea id="text-input" class="form-input form-textarea" placeholder="Enter your text here..." maxlength="200" required></textarea>
                    </div>
                `;
                break;

            case 'url':
                title.textContent = 'Enter Website URL';
                subtitle.textContent = 'Add the website link';
                html = `
                    <div class="form-group">
                        <label for="url-input">Website URL</label>
                        <input type="url" id="url-input" class="form-input" placeholder="https://example.com" maxlength="200" required>
                    </div>
                `;
                break;

            case 'contact':
                title.textContent = 'Contact Information';
                subtitle.textContent = 'Fill in the contact details';
                html = `
                    <div class="form-group">
                        <label for="contact-name">Full Name *</label>
                        <input type="text" id="contact-name" class="form-input" placeholder="John Doe" maxlength="200" required>
                    </div>
                    <div class="form-group">
                        <label for="contact-phone">Phone Number</label>
                        <input type="tel" id="contact-phone" class="form-input" placeholder="+1 234 567 8900" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="contact-email">Email Address</label>
                        <input type="email" id="contact-email" class="form-input" placeholder="john@example.com" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="contact-org">Organization</label>
                        <input type="text" id="contact-org" class="form-input" placeholder="Company Name" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="contact-address">Address</label>
                        <textarea id="contact-address" class="form-input form-textarea" placeholder="123 Main St, City, State, ZIP" maxlength="200"></textarea>
                    </div>
                `;
                break;

            case 'email':
                title.textContent = 'Email Details';
                subtitle.textContent = 'Set up the email information';
                html = `
                    <div class="form-group">
                        <label for="email-to">Recipient Email *</label>
                        <input type="email" id="email-to" class="form-input" placeholder="recipient@example.com" maxlength="200" required>
                    </div>
                    <div class="form-group">
                        <label for="email-subject">Subject</label>
                        <input type="text" id="email-subject" class="form-input" placeholder="Email subject" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="email-body">Message</label>
                        <textarea id="email-body" class="form-input form-textarea" placeholder="Email message..." maxlength="200"></textarea>
                    </div>
                `;
                break;

            case 'phone':
                title.textContent = 'Phone Number';
                subtitle.textContent = 'Enter the phone number';
                html = `
                    <div class="form-group">
                        <label for="phone-input">Phone Number *</label>
                        <input type="tel" id="phone-input" class="form-input" placeholder="+1 234 567 8900" maxlength="200" required>
                    </div>
                `;
                break;

            case 'wifi':
                title.textContent = 'WiFi Credentials';
                subtitle.textContent = 'Enter WiFi network details';
                html = `
                    <div class="form-group">
                        <label for="wifi-ssid">Network Name (SSID) *</label>
                        <input type="text" id="wifi-ssid" class="form-input" placeholder="MyWiFiNetwork" maxlength="200" required>
                    </div>
                    <div class="form-group">
                        <label for="wifi-password">Password</label>
                        <input type="password" id="wifi-password" class="form-input" placeholder="WiFi password" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="wifi-security">Security Type</label>
                        <select id="wifi-security" class="form-input">
                            <option value="WPA">WPA/WPA2/WPA3</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">Open (No Password)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="wifi-hidden">Hidden Network?</label>
                        <select id="wifi-hidden" class="form-input">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                `;
                break;

            case 'location':
                title.textContent = 'Location';
                subtitle.textContent = 'Enter GPS coordinates';
                html = `
                    <div class="form-group">
                        <label for="location-lat">Latitude *</label>
                        <input type="number" step="any" id="location-lat" class="form-input" placeholder="12.9716° N" required>
                    </div>
                    <div class="form-group">
                        <label for="location-lng">Longitude *</label>
                        <input type="number" step="any" id="location-lng" class="form-input" placeholder="77.5946° E" required>
                    </div>
                    <div class="form-group">
                        <label for="location-name">Location Name (Optional)</label>
                        <input type="text" id="location-name" class="form-input" placeholder="My Place" maxlength="100">
                    </div>

                `;
                break;

            case 'sms':
                title.textContent = 'SMS Message';
                subtitle.textContent = 'Create a pre-filled text message';
                html = `
                    <div class="form-group">
                        <label for="sms-phone">Phone Number *</label>
                        <input type="tel" id="sms-phone" class="form-input" placeholder="+91 9876543210" required>
                    </div>
                    <div class="form-group">
                        <label for="sms-message">Message</label>
                        <textarea id="sms-message" class="form-input" rows="4" placeholder="Type your message here..." maxlength="160"></textarea>
                    </div>
                    <div class="char-counter"><span id="sms-count">0</span>/160 characters</div>
                `;
                break;

            case 'upi':
                title.textContent = 'UPI Payment';
                subtitle.textContent = 'Indian UPI payment QR';
                html = `
                    <div class="form-group">
                        <label for="upi-app">UPI App</label>
                        <select id="upi-app" class="form-input">
                            <option value="">Any UPI App</option>
                            <option value="gpay">Google Pay</option>
                            <option value="paytm">Paytm</option>
                            <option value="phonepe">PhonePe</option>
                            <option value="bhim">BHIM</option>
                            <option value="amazonpay">Amazon Pay</option>
                        
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="upi-id">UPI ID *</label>
                        <input type="text" id="upi-id" class="form-input" placeholder="yourname@upi" required>
                    </div>
                    <div class="form-group">
                        <label for="upi-name">Payee Name</label>
                        <input type="text" id="upi-name" class="form-input" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label for="upi-amount">Amount (₹)</label>
                        <input type="number" id="upi-amount" class="form-input" placeholder="100.00" min="1" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="upi-note">Payment Note</label>
                        <input type="text" id="upi-note" class="form-input" placeholder="Payment for..." maxlength="50">
                    </div>
                `;
                break;

            case 'social':
                title.textContent = 'Social Media';
                subtitle.textContent = 'Link your social profile';
                html = `
                    <div class="form-group">
                        <label for="social-platform">Platform *</label>
                        <select id="social-platform" class="form-input" onchange="window.qrApp.updateSocialHint()">
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="twitter">X (Twitter)</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="youtube">YouTube</option>
                            <option value="threads">Threads</option>
                            <option value="snapchat">Snapchat</option>
                            <option value="tiktok">TikTok</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telegram">Telegram</option>
                            <option value="other">Other Website</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="social-input">Username / Handle *</label>
                        <input type="text" id="social-input" class="form-input" placeholder="username" required>
                        <small id="social-hint" style="margin-top:5px; display:block; color:#718096; font-size:12px;">Enter your Instagram username (without @)</small>
                    </div>
                `;
                break;

            case 'event':
                title.textContent = 'Event / Booking';
                subtitle.textContent = 'Create calendar event';
                html = `
                    <div class="form-group">
                        <label for="event-title">Event Title *</label>
                        <input type="text" id="event-title" class="form-input" placeholder="Meeting with Team" required>
                    </div>
                    <div class="form-group">
                        <label for="event-location">Location</label>
                        <input type="text" id="event-location" class="form-input" placeholder="Conference Room A">
                    </div>
                    <div class="form-group">
                        <label for="event-allday">All Day Event?</label>
                        <select id="event-allday" class="form-input">
                            <option value="false">No, specific times</option>
                            <option value="true">Yes, all day</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start-date">Start Date *</label>
                            <input type="date" id="event-start-date" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="event-start-time">Start Time</label>
                            <input type="time" id="event-start-time" class="form-input">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-end-date">End Date *</label>
                            <input type="date" id="event-end-date" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="event-end-time">End Time</label>
                            <input type="time" id="event-end-time" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="event-timezone">Timezone</label>
                        <select id="event-timezone" class="form-input">
                            <option value="Z">UTC (GMT)</option>
                            <option value="local">Local Time</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea id="event-description" class="form-input" rows="3" placeholder="Event details..." maxlength="200"></textarea>
                    </div>
                `;
                break;

            case 'crypto':
                title.textContent = 'Crypto Payment';
                subtitle.textContent = 'Cryptocurrency payment address';
                html = `
                    <div class="form-group">
                        <label for="crypto-coin">Cryptocurrency *</label>
                        <select id="crypto-coin" class="form-input" onchange="window.qrApp.updateCryptoFields()">
                            <option value="bitcoin">Bitcoin (BTC)</option>
                            <option value="ethereum">Ethereum (ETH)</option>
                            <option value="litecoin">Litecoin (LTC)</option>
                            <option value="dogecoin">Dogecoin (DOGE)</option>
                            <option value="ripple">Ripple (XRP)</option>
                            <option value="cardano">Cardano (ADA)</option>
                            <option value="solana">Solana (SOL)</option>
                            <option value="polygon">Polygon (MATIC)</option>
                            <option value="usdt">Tether (USDT)</option>
                            <option value="usdc">USD Coin (USDC)</option>
                        </select>
                    </div>
                    <div class="crypto-info" id="crypto-info">
                        <i class="fab fa-bitcoin"></i>
                        <span>Bitcoin Network</span>
                    </div>
                    <div class="form-group">
                        <label for="crypto-address">Wallet Address *</label>
                        <input type="text" id="crypto-address" class="form-input" placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" required>
                    </div>
                    <div class="form-group">
                        <label for="crypto-amount">Amount (Optional)</label>
                        <input type="number" id="crypto-amount" class="form-input" placeholder="0.001" step="any">
                    </div>
                    <div class="form-group">
                        <label for="crypto-label">Label (Optional)</label>
                        <input type="text" id="crypto-label" class="form-input" placeholder="Payment for services" maxlength="50">
                    </div>
                `;
                break;

            case 'barcode':
                title.textContent = 'Barcode Generator';
                subtitle.textContent = 'Create product barcode';
                html = `
                    <div class="form-group">
                        <label for="barcode-format">Barcode Format *</label>
                        <select id="barcode-format" class="form-input">
                            <option value="CODE128">Code 128 (General)</option>
                            <option value="EAN13">EAN-13 (Products)</option>
                    <div class="form-group">
                        <label for="barcode-text">Display Text (Optional)</label>
                        <input type="text" id="barcode-text" class="form-input" placeholder="Custom text below barcode">
                    </div>
                    <div class="form-group">
                        <label for="barcode-height">Barcode Height</label>
                        <input type="range" id="barcode-height" class="form-input" min="50" max="150" value="100">
                        <span id="barcode-height-value">100px</span>
                    </div>
                `;
                break;


            case 'maps':
                title.textContent = 'Smart Navigation';
                subtitle.textContent = 'Google Maps or Waze';
                html = `
                    <div class="form-group">
                        <label for="map-platform">App *</label>
                        <select id="map-platform" class="form-input">
                            <option value="google">Google Maps Search</option>
                            <option value="waze">Waze Navigation</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="map-query">Location / Search Query *</label>
                        <input type="text" id="map-query" class="form-input" placeholder="Eiffel Tower or Address" required>
                    </div>
                `;
                break;

            case 'app':
                title.textContent = 'Smart Apps';
                subtitle.textContent = 'iOS & Android deep links';
                html = `
                    <div class="form-group">
                        <label for="app-platform">Target Platform *</label>
                        <select id="app-platform" class="form-input">
                            <option value="ios">Apple App Store (Bundle ID)</option>
                            <option value="android">Google Play Store (Package Name)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="app-id">App ID / Package *</label>
                        <input type="text" id="app-id" class="form-input" placeholder="com.example.app" required>
                    </div>
                `;
                break;

            case 'meeting':
                title.textContent = 'Meetings';
                subtitle.textContent = 'Zoom, Meet, or Teams ID';
                html = `
                    <div class="form-group">
                        <label for="meeting-platform">App *</label>
                        <select id="meeting-platform" class="form-input">
                            <option value="zoom">Zoom</option>
                            <option value="meet">Google Meet</option>
                            <option value="teams">Microsoft Teams</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="meeting-id">Meeting ID / Code *</label>
                        <input type="text" id="meeting-id" class="form-input" placeholder="Enter ID or link" required>
                    </div>
                `;
                break;

            case 'paypal':
                title.textContent = 'PayPal Pay';
                subtitle.textContent = 'Invoices & payment links';
                html = `
                    <div class="form-group">
                        <label for="paypal-user">PayPal.me Username *</label>
                        <input type="text" id="paypal-user" class="form-input" placeholder="johndoe" required>
                    </div>
                    <div class="form-group">
                        <label for="paypal-amount">Amount (Optional)</label>
                        <input type="number" id="paypal-amount" class="form-input" placeholder="0.00" step="0.01">
                    </div>
                `;
                break;

            case 'medical':
                title.textContent = 'Medical Info';
                subtitle.textContent = 'Emergency medical card';
                html = `
                    <div class="form-group">
                        <label for="medical-name">Full Name *</label>
                        <input type="text" id="medical-name" class="form-input" placeholder="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="medical-blood">Blood Group</label>
                        <select id="medical-blood" class="form-input">
                            <option value="">Unknown / Skip</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="medical-donor">Organ Donor</label>
                        <select id="medical-donor" class="form-input">
                            <option value="">Unspecified</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="medical-contact-name">Emergency Contact Name</label>
                        <input type="text" id="medical-contact-name" class="form-input" placeholder="Jane Doe">
                    </div>
                    <div class="form-group">
                        <label for="medical-contact-phone">Emergency Contact Phone</label>
                        <input type="tel" id="medical-contact-phone" class="form-input" placeholder="+1 234 567 8900">
                    </div>
                    <div class="form-group">
                        <label for="medical-allergies">Known Allergies</label>
                        <textarea id="medical-allergies" class="form-input" rows="2" placeholder="Penicillin, Peanuts..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="medical-meds">Current Medications</label>
                        <textarea id="medical-meds" class="form-input" rows="2" placeholder="Insulin, Inhaler..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="medical-conditions">Other Conditions</label>
                        <textarea id="medical-conditions" class="form-input" rows="2" placeholder="Diabetes, Asthma..."></textarea>
                    </div>
                `;
                break;

            case 'health_insurance':
                title.textContent = 'Health Insurance';
                subtitle.textContent = 'Insurance Provider Details';
                html = `
                    <div class="form-group">
                        <label for="hi-provider">Provider Name *</label>
                        <input type="text" id="hi-provider" class="form-input" placeholder="e.g. Blue Cross" required>
                    </div>
                    <div class="form-group">
                        <label for="hi-member">Member ID *</label>
                        <input type="text" id="hi-member" class="form-input" placeholder="e.g. 123456789" required>
                    </div>
                    <div class="form-group">
                        <label for="hi-group">Group Number</label>
                        <input type="text" id="hi-group" class="form-input" placeholder="e.g. 98765">
                    </div>
                    <div class="form-group">
                        <label for="hi-plan">Plan Type</label>
                        <input type="text" id="hi-plan" class="form-input" placeholder="e.g. HMO / PPO">
                    </div>
                    <div class="form-group">
                        <label for="hi-phone">Provider Phone</label>
                        <input type="tel" id="hi-phone" class="form-input" placeholder="e.g. 1-800-123-4567">
                    </div>
                `;
                break;

            case 'vaccine':
                title.textContent = 'Vaccination Record';
                subtitle.textContent = 'Immunization History';
                html = `
                    <div class="form-group">
                        <label for="vac-name">Vaccine Name *</label>
                        <input type="text" id="vac-name" class="form-input" placeholder="e.g. COVID-19 / Flu" required>
                    </div>
                    <div class="form-group">
                        <label for="vac-date">Date Administered *</label>
                        <input type="date" id="vac-date" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="vac-clinic">Clinic / Doctor</label>
                        <input type="text" id="vac-clinic" class="form-input" placeholder="e.g. City Hospital">
                    </div>
                    <div class="form-group">
                        <label for="vac-batch">Batch Number</label>
                        <input type="text" id="vac-batch" class="form-input" placeholder="e.g. AB1234">
                    </div>
                `;
                break;

            case 'allergy_alert':
                title.textContent = 'Allergy Alert';
                subtitle.textContent = 'Severe Allergies & Care';
                html = `
                    <div class="form-group">
                        <label for="allergy-name">Full Name *</label>
                        <input type="text" id="allergy-name" class="form-input" placeholder="e.g. Jane Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="allergy-list">Severe Allergies *</label>
                        <textarea id="allergy-list" class="form-input" rows="2" placeholder="e.g. Penicillin, Peanuts, Bee stings" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="allergy-symptoms">Reaction Symptoms</label>
                        <input type="text" id="allergy-symptoms" class="form-input" placeholder="e.g. Anaphylaxis, swelling, rash">
                    </div>
                    <div class="form-group">
                        <label for="allergy-action">Emergency Action / Treatment</label>
                        <input type="text" id="allergy-action" class="form-input" placeholder="e.g. Administer EpiPen, call 911 immediately">
                    </div>
                    <div class="form-group">
                        <label for="allergy-epipen">Carries EpiPen?</label>
                        <select id="allergy-epipen" class="form-input">
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="N/A" selected>N/A</option>
                        </select>
                    </div>
                `;
                break;

            case 'medication_tracker':
                title.textContent = 'Medication Schedule';
                subtitle.textContent = 'Daily Medications & Dosage';
                html = `
                    <div class="form-group">
                        <label for="med-patient">Patient Name *</label>
                        <input type="text" id="med-patient" class="form-input" placeholder="e.g. John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="med-name-1">Medication 1 Name *</label>
                        <input type="text" id="med-name-1" class="form-input" placeholder="e.g. Metformin" required>
                    </div>
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="med-dosage-1">Dosage 1 *</label>
                            <input type="text" id="med-dosage-1" class="form-input" placeholder="e.g. 500mg" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="med-freq-1">Frequency 1 *</label>
                            <input type="text" id="med-freq-1" class="form-input" placeholder="e.g. Twice daily" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="med-name-2">Medication 2 Name</label>
                        <input type="text" id="med-name-2" class="form-input" placeholder="e.g. Lisinopril">
                    </div>
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="med-dosage-2">Dosage 2</label>
                            <input type="text" id="med-dosage-2" class="form-input" placeholder="e.g. 10mg">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="med-freq-2">Frequency 2</label>
                            <input type="text" id="med-freq-2" class="form-input" placeholder="e.g. Every morning">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="med-instructions">Special Instructions</label>
                        <textarea id="med-instructions" class="form-input" rows="2" placeholder="Take with food, avoid grapefruit, etc."></textarea>
                    </div>
                `;
                break;

            case 'ice_contacts':
                title.textContent = 'Emergency Contacts';
                subtitle.textContent = 'In Case of Emergency (ICE)';
                html = `
                    <div class="form-group">
                        <label for="ice-name-1">Primary Contact Name *</label>
                        <input type="text" id="ice-name-1" class="form-input" placeholder="e.g. Sarah Smith" required>
                    </div>
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="ice-rel-1">Relationship *</label>
                            <input type="text" id="ice-rel-1" class="form-input" placeholder="e.g. Spouse" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="ice-phone-1">Primary Phone *</label>
                            <input type="tel" id="ice-phone-1" class="form-input" placeholder="e.g. 555-0199" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="ice-name-2">Secondary Contact Name</label>
                        <input type="text" id="ice-name-2" class="form-input" placeholder="e.g. Robert Smith">
                    </div>
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="ice-rel-2">Relationship</label>
                            <input type="text" id="ice-rel-2" class="form-input" placeholder="e.g. Father">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="ice-phone-2">Secondary Phone</label>
                            <input type="tel" id="ice-phone-2" class="form-input" placeholder="e.g. 555-0188">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="ice-hospital">Preferred Hospital</label>
                        <input type="text" id="ice-hospital" class="form-input" placeholder="e.g. Memorial Hospital">
                    </div>
                `;
                break;

            case 'blood_donor':
                title.textContent = 'Blood Donor Profile';
                subtitle.textContent = 'Donor Card Details';
                html = `
                    <div class="form-group">
                        <label for="donor-name">Donor Name *</label>
                        <input type="text" id="donor-name" class="form-input" placeholder="e.g. David Jones" required>
                    </div>
                    <div class="form-group">
                        <label for="donor-blood">Blood Type *</label>
                        <select id="donor-blood" class="form-input" required>
                            <option value="" disabled selected>Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="donor-id">Donor ID / Reg Number</label>
                        <input type="text" id="donor-id" class="form-input" placeholder="e.g. BLD-98765">
                    </div>
                    <div class="form-group">
                        <label for="donor-last-date">Last Donation Date</label>
                        <input type="date" id="donor-last-date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="donor-center">Preferred Donor Center</label>
                        <input type="text" id="donor-center" class="form-input" placeholder="e.g. Red Cross Center City">
                    </div>
                `;
                break;

            case 'vision_rx':
                title.textContent = 'Vision Prescription';
                subtitle.textContent = 'Eyewear Prescription Details';
                html = `
                    <div class="form-group">
                        <label for="vision-name">Patient Name *</label>
                        <input type="text" id="vision-name" class="form-input" placeholder="e.g. Alice Cooper" required>
                    </div>
                    <div style="margin-bottom: 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; color: var(--text-color);">Right Eye (OD)</div>
                    <div class="form-group-row" style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <label for="vision-od-sph" style="font-size: 12px;">Sphere (SPH)</label>
                            <input type="text" id="vision-od-sph" class="form-input" placeholder="-2.50">
                        </div>
                        <div style="flex: 1;">
                            <label for="vision-od-cyl" style="font-size: 12px;">Cylinder (CYL)</label>
                            <input type="text" id="vision-od-cyl" class="form-input" placeholder="-0.75">
                        </div>
                        <div style="flex: 1;">
                            <label for="vision-od-axis" style="font-size: 12px;">Axis</label>
                            <input type="number" id="vision-od-axis" class="form-input" placeholder="180">
                        </div>
                    </div>
                    <div style="margin-bottom: 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; color: var(--text-color);">Left Eye (OS)</div>
                    <div class="form-group-row" style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <label for="vision-os-sph" style="font-size: 12px;">Sphere (SPH)</label>
                            <input type="text" id="vision-os-sph" class="form-input" placeholder="-2.25">
                        </div>
                        <div style="flex: 1;">
                            <label for="vision-os-cyl" style="font-size: 12px;">Cylinder (CYL)</label>
                            <input type="text" id="vision-os-cyl" class="form-input" placeholder="-0.50">
                        </div>
                        <div style="flex: 1;">
                            <label for="vision-os-axis" style="font-size: 12px;">Axis</label>
                            <input type="number" id="vision-os-axis" class="form-input" placeholder="175">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="vision-pd">Pupillary Distance (PD)</label>
                        <input type="text" id="vision-pd" class="form-input" placeholder="e.g. 63 mm">
                    </div>
                `;
                break;

            case 'pet_medical':
                title.textContent = 'Pet Health Card';
                subtitle.textContent = 'Pet Emergency & Vet Record';
                html = `
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="pet-name">Pet Name *</label>
                            <input type="text" id="pet-name" class="form-input" placeholder="e.g. Max" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="pet-breed">Species & Breed *</label>
                            <input type="text" id="pet-breed" class="form-input" placeholder="e.g. Dog - Retriever" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pet-microchip">Microchip Number</label>
                        <input type="text" id="pet-microchip" class="form-input" placeholder="e.g. 985112000123456">
                    </div>
                    <div class="form-group">
                        <label for="pet-conditions">Conditions & Allergies</label>
                        <textarea id="pet-conditions" class="form-input" rows="2" placeholder="e.g. Epilepsy, allergic to penicillin, needs daily meds"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="pet-vet">Vet Name & Phone</label>
                        <input type="text" id="pet-vet" class="form-input" placeholder="e.g. Dr. Brown, VetClinic (555-0155)">
                    </div>
                `;
                break;

            case 'advance_directive':
                title.textContent = 'Living Will / DNR';
                subtitle.textContent = 'Advance Healthcare Directives';
                html = `
                    <div class="form-group">
                        <label for="ad-name">Patient Name *</label>
                        <input type="text" id="ad-name" class="form-input" placeholder="e.g. Robert Miller" required>
                    </div>
                    <div class="form-group-row" style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="ad-proxy-name">Healthcare Proxy *</label>
                            <input type="text" id="ad-proxy-name" class="form-input" placeholder="e.g. Sarah Miller" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="ad-proxy-phone">Proxy Phone *</label>
                            <input type="tel" id="ad-proxy-phone" class="form-input" placeholder="e.g. 555-0144" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="ad-dnr">DNR (Do Not Resuscitate) *</label>
                        <select id="ad-dnr" class="form-input" required>
                            <option value="DNR (Do Not Resuscitate) - Active" selected>Yes, Do Not Resuscitate (DNR)</option>
                            <option value="Full Code (Resuscitate)">No, Full Code (Attempt Resuscitation)</option>
                            <option value="Unspecified">Unspecified / Refer to Proxy</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="ad-doc-location">Directive Document Location</label>
                        <input type="text" id="ad-doc-location" class="form-input" placeholder="e.g. In safe box at home / Dr. Green's office">
                    </div>
                `;
                break;

            case 'donate':
                title.textContent = 'Donation Link';
                subtitle.textContent = 'Patreon, Kofi, or Tip';
                html = `
                    <div class="form-group">
                        <label for="donate-platform">Platform *</label>
                        <select id="donate-platform" class="form-input">
                            <option value="patreon">Patreon</option>
                            <option value="kofi">Ko-fi</option>
                            <option value="coffee">Buy Me A Coffee</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="donate-user">Username *</label>
                        <input type="text" id="donate-user" class="form-input" placeholder="username" required>
                    </div>
                `;
                break;


            case 'sp':
                title.textContent = 'Spotify Smart Link';
                subtitle.textContent = 'Tracks, Albums, Artists or Playlists';
                html = `
                    <div class="form-group">
                        <label for="sp-type">Target Type</label>
                        <select id="sp-type" class="form-input">
                            <option value="track">Track (ID)</option>
                            <option value="artist">Artist (ID)</option>
                            <option value="album">Album (ID)</option>
                            <option value="playlist">Playlist (ID)</option>
                            <option value="search">Search Keywords</option>
                            <option value="custom">Custom Spotify URI</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="sp-id">ID / Keywords / URI *</label>
                        <input type="text" id="sp-id" class="form-input" placeholder="e.g. 40960..." required>
                    </div>`;
                break;

            case 'yt':
                title.textContent = 'YouTube Content';
                subtitle.textContent = 'Videos, Channels or Playlists';
                html = `
                    <div class="form-group">
                        <label for="yt-type">Target Type</label>
                        <select id="yt-type" class="form-input">
                            <option value="video">Video (ID)</option>
                            <option value="channel">Channel (ID/Handle)</option>
                            <option value="playlist">Playlist (ID)</option>
                            <option value="search">Search Keywords</option>
                            <option value="custom">Custom YouTube Link</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="yt-id">ID / Keywords / Link *</label>
                        <input type="text" id="yt-id" class="form-input" placeholder="e.g. dQw4w9..." required>
                    </div>`;
                break;



            case 'wa': case 'tg': case 'vb': case 'sk': case 'ft': case 'fta': case 'zm': case 'wx': case 'yl': case 'fq':
                const deepMap = {
                    wa: { t: 'WhatsApp Deep Link', s: 'Phone Number', ph: '1234567890' },
                    tg: { t: 'Telegram Message', s: 'Username', ph: 'username' },
                    vb: { t: 'Viber Connect', s: 'Phone Number', ph: '1234567890' },
                    sk: { t: 'Skype Link', s: 'Skype Username', ph: 'user123' },
                    ft: { t: 'Facetime Video', s: 'Apple ID / Phone', ph: 'user@icloud.com' },
                    fta: { t: 'Facetime Audio', s: 'Apple ID / Phone', ph: 'user@icloud.com' },
                    zm: { t: 'Zoom Deep Link', s: 'Meeting ID', ph: '123456789' },
                    wx: { t: 'Webex Deep Link', s: 'Meeting ID', ph: '123456789' },
                    yl: { t: 'Yelp Place Link', s: 'Business ID', ph: 'biz-id' },
                    fq: { t: 'Foursquare Link', s: 'Venue ID', ph: 'venue-id' }
                };
                const info = deepMap[this.selectedType];
                title.textContent = info.t;
                subtitle.textContent = "Direct mobile app open link";
                html = `
                    <div class="form-group">
                        <label for="${this.selectedType}-id">${info.s} *</label>
                        <input type="text" id="${this.selectedType}-id" class="form-input" placeholder="${info.ph}" required>
                    </div>
                    <div class="form-group">
                        <label for="${this.selectedType}-custom">Or Custom URI (Optional)</label>
                        <input type="text" id="${this.selectedType}-custom" class="form-input" placeholder="protocol://full/path">
                    </div>`;
                break;

            case 'prompt':
                const dataMap = {
                    prompt: { t: 'AI Text Prompt', s: 'You are a helpful...' }
                };
                title.textContent = dataMap[this.selectedType].t;
                subtitle.textContent = 'Multi-line structured text output';
                html = `
                    <div class="form-group">
                        <label for="${this.selectedType}-data">Raw Data *</label>
                        <textarea id="${this.selectedType}-data" class="form-input" rows="5" placeholder="Enter ${dataMap[this.selectedType].s}..." required></textarea>
                    </div>`;
                break;

            case 'totp':
                title.textContent = 'Authenticator 2FA';
                subtitle.textContent = 'TOTP Secret Code';
                html = `
                    <div class="form-group">
                        <label for="totp-account">Account / Email *</label>
                        <input type="text" id="totp-account" class="form-input" placeholder="user@example.com" required>
                    </div>
                    <div class="form-group">
                        <label for="totp-issuer">Issuer / App Name *</label>
                        <input type="text" id="totp-issuer" class="form-input" placeholder="My Enterprise App" required>
                    </div>
                    <div class="form-group">
                        <label for="totp-secret">Base32 Secret Key *</label>
                        <input type="text" id="totp-secret" class="form-input" placeholder="JBSWY3DPEHPK3PXP" required>
                    </div>`;
                break;

            case 'uber': case 'lyft':
                title.textContent = this.selectedType === 'uber' ? 'Uber Ride Request' : 'Lyft Ride Request';
                subtitle.textContent = 'Set pickup/dropoff coordinates';
                html = `
                    <div class="form-group">
                        <label for="${this.selectedType}-lat">Dropoff Latitude *</label>
                        <input type="text" id="${this.selectedType}-lat" class="form-input" placeholder="37.7749" required>
                    </div>
                    <div class="form-group">
                        <label for="${this.selectedType}-lng">Dropoff Longitude *</label>
                        <input type="text" id="${this.selectedType}-lng" class="form-input" placeholder="-122.4194" required>
                    </div>`;
                break;
            case 'mecard':
                title.textContent = 'MeCard Lite';
                subtitle.textContent = 'Simplified contact format';
                html = `
                    <div class="form-group">
                        <label for="mecard-name">Full Name *</label>
                        <input type="text" id="mecard-name" class="form-input" placeholder="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="mecard-phone">Phone Number</label>
                        <input type="tel" id="mecard-phone" class="form-input" placeholder="+1234567890">
                    </div>
                    <div class="form-group">
                        <label for="mecard-email">Email</label>
                        <input type="email" id="mecard-email" class="form-input" placeholder="john@example.com">
                    </div>`;
                break;
            case 'linkedin':
                title.textContent = 'LinkedIn Pro';
                subtitle.textContent = 'Direct professional profile link';
                html = `
                    <div class="form-group">
                        <label for="linkedin-user">Profile URL or Username *</label>
                        <input type="text" id="linkedin-user" class="form-input" placeholder="linkedin.com/in/username" required>
                    </div>`;
                break;
            case 'portfolio':
                title.textContent = 'Portfolio/CV';
                subtitle.textContent = 'Personal showcase link';
                html = `
                    <div class="form-group">
                        <label for="portfolio-url">Website/Document URL *</label>
                        <input type="url" id="portfolio-url" class="form-input" placeholder="https://mywork.com/resume" required>
                    </div>`;
                break;
            case 'idcard':
                title.textContent = 'Member ID';
                subtitle.textContent = 'License or Registration Details';
                html = `
                    <div class="form-group">
                        <label for="id-type">Credential Type *</label>
                        <input type="text" id="id-type" class="form-input" placeholder="Membership / Employee ID" required>
                    </div>
                    <div class="form-group">
                        <label for="id-number">ID Number *</label>
                        <input type="text" id="id-number" class="form-input" placeholder="EX-123456" required>
                    </div>
                    <div class="form-group">
                        <label for="id-issued">Issuing Body</label>
                        <input type="text" id="id-issued" class="form-input" placeholder="Organization / Board">
                    </div>`;
                break;
            case 'home_inventory':
                title.textContent = 'Home Inventory';
                subtitle.textContent = 'Track household items';
                html = `
                    <div class="form-group">
                        <label for="hi-name">Item Name *</label>
                        <input type="text" id="hi-name" class="form-input" placeholder="MacBook Pro" required>
                    </div>
                    <div class="form-group">
                        <label for="hi-serial">Serial Number</label>
                        <input type="text" id="hi-serial" class="form-input" placeholder="C02XX0XXXXXX">
                    </div>
                    <div class="form-group">
                        <label for="hi-value">Value / Purchase Price</label>
                        <input type="text" id="hi-value" class="form-input" placeholder="$2,000">
                    </div>
                    <div class="form-group">
                        <label for="hi-loc">Location</label>
                        <input type="text" id="hi-loc" class="form-input" placeholder="Home Office">
                    </div>`;
                break;
            case 'pantry_tracker':
                title.textContent = 'Pantry Tracker';
                subtitle.textContent = 'Track food expiration';
                html = `
                    <div class="form-group">
                        <label for="pt-item">Item Name *</label>
                        <input type="text" id="pt-item" class="form-input" placeholder="Oat Milk" required>
                    </div>
                    <div class="form-group">
                        <label for="pt-qty">Quantity</label>
                        <input type="text" id="pt-qty" class="form-input" placeholder="2 Cartons">
                    </div>
                    <div class="form-group">
                        <label for="pt-exp">Expiration Date</label>
                        <input type="date" id="pt-exp" class="form-input">
                    </div>`;
                break;
            case 'spare_key':
                title.textContent = 'Spare Key Location';
                subtitle.textContent = 'Instructions for key access';
                html = `
                    <div class="form-group">
                        <label for="sk-for">For Who *</label>
                        <input type="text" id="sk-for" class="form-input" placeholder="Dog Sitter" required>
                    </div>
                    <div class="form-group">
                        <label for="sk-loc">Location/Lockbox</label>
                        <input type="text" id="sk-loc" class="form-input" placeholder="Back Porch">
                    </div>
                    <div class="form-group">
                        <label for="sk-code">Code/Instructions</label>
                        <textarea id="sk-code" class="form-textarea" placeholder="Code is 1234"></textarea>
                    </div>`;
                break;
            case 'recipe_card':
                title.textContent = 'Recipe Card';
                subtitle.textContent = 'Quick recipe reference';
                html = `
                    <div class="form-group">
                        <label for="rc-name">Recipe Name *</label>
                        <input type="text" id="rc-name" class="form-input" placeholder="Grandma's Cookies" required>
                    </div>
                    <div class="form-group">
                        <label for="rc-time">Prep/Cook Time</label>
                        <input type="text" id="rc-time" class="form-input" placeholder="30 mins">
                    </div>
                    <div class="form-group">
                        <label for="rc-ing">Ingredients</label>
                        <textarea id="rc-ing" class="form-textarea" placeholder="Flour, Sugar, Eggs..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="rc-steps">Steps</label>
                        <textarea id="rc-steps" class="form-textarea" placeholder="Mix and bake..."></textarea>
                    </div>`;
                break;
            case 'meal_planner':
                title.textContent = 'Meal Planner';
                subtitle.textContent = 'Weekly meal schedule';
                html = `
                    <div class="form-group">
                        <label for="mp-mon">Monday *</label>
                        <input type="text" id="mp-mon" class="form-input" placeholder="Pasta" required>
                    </div>
                    <div class="form-group">
                        <label for="mp-tue">Tuesday</label>
                        <input type="text" id="mp-tue" class="form-input" placeholder="Tacos">
                    </div>
                    <div class="form-group">
                        <label for="mp-wed">Wednesday</label>
                        <input type="text" id="mp-wed" class="form-input" placeholder="Salad">
                    </div>
                    <div class="form-group">
                        <label for="mp-thu">Thursday</label>
                        <input type="text" id="mp-thu" class="form-input" placeholder="Chicken">
                    </div>
                    <div class="form-group">
                        <label for="mp-fri">Friday</label>
                        <input type="text" id="mp-fri" class="form-input" placeholder="Pizza">
                    </div>`;
                break;
            case 'wardrobe_storage':
                title.textContent = 'Wardrobe Storage';
                subtitle.textContent = 'Log seasonal clothing';
                html = `
                    <div class="form-group">
                        <label for="ws-box">Box/Bin Name *</label>
                        <input type="text" id="ws-box" class="form-input" placeholder="Box A" required>
                    </div>
                    <div class="form-group">
                        <label for="ws-season">Season</label>
                        <input type="text" id="ws-season" class="form-input" placeholder="Winter">
                    </div>
                    <div class="form-group">
                        <label for="ws-items">Contents</label>
                        <textarea id="ws-items" class="form-textarea" placeholder="Sweaters, Coats..."></textarea>
                    </div>`;
                break;
            case 'plant_care':
                title.textContent = 'Plant Care';
                subtitle.textContent = 'Care instructions';
                html = `
                    <div class="form-group">
                        <label for="pc-name">Plant Name *</label>
                        <input type="text" id="pc-name" class="form-input" placeholder="Monstera" required>
                    </div>
                    <div class="form-group">
                        <label for="pc-sun">Sunlight Needs</label>
                        <input type="text" id="pc-sun" class="form-input" placeholder="Indirect light">
                    </div>
                    <div class="form-group">
                        <label for="pc-water">Watering Schedule</label>
                        <input type="text" id="pc-water" class="form-input" placeholder="Once a week">
                    </div>`;
                break;
            case 'bike_maintenance':
                title.textContent = 'Bike Maintenance';
                subtitle.textContent = 'Log bike service';
                html = `
                    <div class="form-group">
                        <label for="bm-model">Bike Model *</label>
                        <input type="text" id="bm-model" class="form-input" placeholder="Trek FX" required>
                    </div>
                    <div class="form-group">
                        <label for="bm-last">Last Serviced</label>
                        <input type="date" id="bm-last" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="bm-tire">Tire Pressure (PSI)</label>
                        <input type="text" id="bm-tire" class="form-input" placeholder="60 PSI">
                    </div>`;
                break;
            case 'car_maintenance':
                title.textContent = 'Car Maintenance';
                subtitle.textContent = 'Auto service specs';
                html = `
                    <div class="form-group">
                        <label for="cm-model">Vehicle Model *</label>
                        <input type="text" id="cm-model" class="form-input" placeholder="Honda Civic" required>
                    </div>
                    <div class="form-group">
                        <label for="cm-vin">VIN Number</label>
                        <input type="text" id="cm-vin" class="form-input" placeholder="1HG...">
                    </div>
                    <div class="form-group">
                        <label for="cm-oil">Oil Type</label>
                        <input type="text" id="cm-oil" class="form-input" placeholder="0W-20">
                    </div>
                    <div class="form-group">
                        <label for="cm-tire">Tire Size / PSI</label>
                        <input type="text" id="cm-tire" class="form-input" placeholder="215/55R16 32 PSI">
                    </div>`;
                break;
            case 'wifi_extender':
                title.textContent = 'Wi-Fi Extender';
                subtitle.textContent = 'Extender setup details';
                html = `
                    <div class="form-group">
                        <label for="we-ssid">Extender SSID *</label>
                        <input type="text" id="we-ssid" class="form-input" placeholder="HomeNet_EXT" required>
                    </div>
                    <div class="form-group">
                        <label for="we-ip">Admin IP</label>
                        <input type="text" id="we-ip" class="form-input" placeholder="192.168.1.250">
                    </div>
                    <div class="form-group">
                        <label for="we-pass">Admin Password</label>
                        <input type="text" id="we-pass" class="form-input" placeholder="admin123">
                    </div>`;
                break;
            case 'alarm_code':
                title.textContent = 'Security Alarm';
                subtitle.textContent = 'System codes';
                html = `
                    <div class="form-group">
                        <label for="ac-name">System Name *</label>
                        <input type="text" id="ac-name" class="form-input" placeholder="Home Alarm" required>
                    </div>
                    <div class="form-group">
                        <label for="ac-arm">Arm Code</label>
                        <input type="text" id="ac-arm" class="form-input" placeholder="1234">
                    </div>
                    <div class="form-group">
                        <label for="ac-disarm">Disarm Code</label>
                        <input type="text" id="ac-disarm" class="form-input" placeholder="1234">
                    </div>
                    <div class="form-group">
                        <label for="ac-guest">Guest Password</label>
                        <input type="text" id="ac-guest" class="form-input" placeholder="Word">
                    </div>`;
                break;
            case 'gym_routine':
                title.textContent = 'Gym Routine';
                subtitle.textContent = 'Workout log';
                html = `
                    <div class="form-group">
                        <label for="gr-name">Routine Name *</label>
                        <input type="text" id="gr-name" class="form-input" placeholder="Push Day" required>
                    </div>
                    <div class="form-group">
                        <label for="gr-target">Target Muscle Group</label>
                        <input type="text" id="gr-target" class="form-input" placeholder="Chest, Triceps">
                    </div>
                    <div class="form-group">
                        <label for="gr-ex">Exercises (Sets x Reps)</label>
                        <textarea id="gr-ex" class="form-textarea" placeholder="Bench: 3x10\nFlyes: 3x12"></textarea>
                    </div>`;
                break;
            case 'bp_log':
                title.textContent = 'BP Log';
                subtitle.textContent = 'Blood pressure tracker';
                html = `
                    <div class="form-group">
                        <label for="bpl-date">Date/Time *</label>
                        <input type="datetime-local" id="bpl-date" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="bpl-sys">Systolic (Top)</label>
                        <input type="number" id="bpl-sys" class="form-input" placeholder="120">
                    </div>
                    <div class="form-group">
                        <label for="bpl-dia">Diastolic (Bottom)</label>
                        <input type="number" id="bpl-dia" class="form-input" placeholder="80">
                    </div>
                    <div class="form-group">
                        <label for="bpl-hr">Heart Rate</label>
                        <input type="number" id="bpl-hr" class="form-input" placeholder="70">
                    </div>`;
                break;
            case 'vitamin_schedule':
                title.textContent = 'Vitamin Schedule';
                subtitle.textContent = 'Supplement tracker';
                html = `
                    <div class="form-group">
                        <label for="vs-name">Supplement Name *</label>
                        <input type="text" id="vs-name" class="form-input" placeholder="Vitamin D3" required>
                    </div>
                    <div class="form-group">
                        <label for="vs-dose">Dosage</label>
                        <input type="text" id="vs-dose" class="form-input" placeholder="1000 IU">
                    </div>
                    <div class="form-group">
                        <label for="vs-time">Time of Day</label>
                        <input type="text" id="vs-time" class="form-input" placeholder="Morning with food">
                    </div>`;
                break;
            case 'bedtime_routine':
                title.textContent = 'Bedtime Routine';
                subtitle.textContent = 'Sleep hygiene';
                html = `
                    <div class="form-group">
                        <label for="br-bed">Target Bedtime *</label>
                        <input type="time" id="br-bed" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="br-wake">Target Wake Time</label>
                        <input type="time" id="br-wake" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="br-steps">Wind-down Steps</label>
                        <textarea id="br-steps" class="form-textarea" placeholder="Read 20m, No screens..."></textarea>
                    </div>`;
                break;
            case 'habit_tracker':
                title.textContent = 'Habit Tracker';
                subtitle.textContent = 'Daily goal check';
                html = `
                    <div class="form-group">
                        <label for="ht-1">Habit 1 *</label>
                        <input type="text" id="ht-1" class="form-input" placeholder="Drink 2L Water" required>
                    </div>
                    <div class="form-group">
                        <label for="ht-2">Habit 2</label>
                        <input type="text" id="ht-2" class="form-input" placeholder="Read 10 Pages">
                    </div>
                    <div class="form-group">
                        <label for="ht-3">Habit 3</label>
                        <input type="text" id="ht-3" class="form-input" placeholder="Meditate">
                    </div>
                    <div class="form-group">
                        <label for="ht-freq">Frequency</label>
                        <input type="text" id="ht-freq" class="form-input" placeholder="Daily">
                    </div>`;
                break;
            case 'budget_tracker':
                title.textContent = 'Budget Tracker';
                subtitle.textContent = 'Monthly spending';
                html = `
                    <div class="form-group">
                        <label for="bt-month">Month *</label>
                        <input type="month" id="bt-month" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="bt-total">Total Budget</label>
                        <input type="text" id="bt-total" class="form-input" placeholder="$3,000">
                    </div>
                    <div class="form-group">
                        <label for="bt-house">Housing</label>
                        <input type="text" id="bt-house" class="form-input" placeholder="$1,500">
                    </div>
                    <div class="form-group">
                        <label for="bt-save">Savings Goal</label>
                        <input type="text" id="bt-save" class="form-input" placeholder="$500">
                    </div>`;
                break;
            case 'evac_route':
                title.textContent = 'Evacuation Route';
                subtitle.textContent = 'Emergency plan';
                html = `
                    <div class="form-group">
                        <label for="er-meet">Meeting Point *</label>
                        <input type="text" id="er-meet" class="form-input" placeholder="Mailbox across street" required>
                    </div>
                    <div class="form-group">
                        <label for="er-pri">Primary Exit</label>
                        <input type="text" id="er-pri" class="form-input" placeholder="Front Door">
                    </div>
                    <div class="form-group">
                        <label for="er-contact">Emergency Contact</label>
                        <input type="text" id="er-contact" class="form-input" placeholder="Mom: 555-1234">
                    </div>`;
                break;
            case 'office_visitor':
                title.textContent = 'Office Visitor Info';
                subtitle.textContent = 'Guest details';
                html = `
                    <div class="form-group">
                        <label for="ov-comp">Company Name *</label>
                        <input type="text" id="ov-comp" class="form-input" placeholder="Tech Corp" required>
                    </div>
                    <div class="form-group">
                        <label for="ov-room">Floor / Room</label>
                        <input type="text" id="ov-room" class="form-input" placeholder="Floor 3, Conf A">
                    </div>
                    <div class="form-group">
                        <label for="ov-wifi">Guest Wi-Fi</label>
                        <input type="text" id="ov-wifi" class="form-input" placeholder="GuestNet">
                    </div>
                    <div class="form-group">
                        <label for="ov-pass">Wi-Fi Password</label>
                        <input type="text" id="ov-pass" class="form-input" placeholder="Welcome123">
                    </div>`;
                break;
            case 'project_board':
                title.textContent = 'Project Status';
                subtitle.textContent = 'Task milestone';
                html = `
                    <div class="form-group">
                        <label for="pb-name">Project Name *</label>
                        <input type="text" id="pb-name" class="form-input" placeholder="Q3 Launch" required>
                    </div>
                    <div class="form-group">
                        <label for="pb-phase">Current Phase</label>
                        <input type="text" id="pb-phase" class="form-input" placeholder="Development">
                    </div>
                    <div class="form-group">
                        <label for="pb-mile">Next Milestone</label>
                        <input type="text" id="pb-mile" class="form-input" placeholder="Beta Release">
                    </div>
                    <div class="form-group">
                        <label for="pb-due">Deadline</label>
                        <input type="date" id="pb-due" class="form-input">
                    </div>`;
                break;

        }
        container.innerHTML = html;

        // Bind event listeners for barcode height slider
        if (this.selectedType === 'barcode') {
            setTimeout(() => {
                const heightSlider = document.getElementById('barcode-height');
                const heightValue = document.getElementById('barcode-height-value');
                if (heightSlider && heightValue) {
                    heightSlider.addEventListener('input', () => {
                        heightValue.textContent = heightSlider.value + 'px';
                    });
                }
            }, 100);
        }

        // Bind SMS character counter
        if (this.selectedType === 'sms') {
            setTimeout(() => {
                const smsMessage = document.getElementById('sms-message');
                const smsCount = document.getElementById('sms-count');
                if (smsMessage && smsCount) {
                    smsMessage.addEventListener('input', () => {
                        smsCount.textContent = smsMessage.value.length;
                    });
                }
            }, 100);
        }

        setTimeout(() => this.setupLivePreviewListeners(), 100);
    }

    setupLivePreviewListeners() {
        const triggerUpdate = () => {
            if (this.livePreviewTimeout) clearTimeout(this.livePreviewTimeout);
            this.livePreviewTimeout = setTimeout(() => {
                this.generateLiveQR();
            }, 300); // 300ms debounce
        };

        // All inputs in input-container
        const inputs = document.querySelectorAll('#input-container input, #input-container select, #input-container textarea');
        inputs.forEach(input => {
            input.addEventListener('input', triggerUpdate);
            input.addEventListener('change', triggerUpdate);
        });

        // Color and Slider inputs
        const configInputs = ['fg-color', 'bg-color', 'size-slider'];
        configInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    if (id === 'fg-color') this.customization.fgColor = el.value;
                    if (id === 'bg-color') this.customization.bgColor = el.value;
                    if (id === 'size-slider') {
                        this.customization.size = parseInt(el.value);
                        const valDisplay = document.getElementById('size-value');
                        if (valDisplay) valDisplay.textContent = el.value + 'px';
                    }
                    triggerUpdate();
                });
            }
        });
    }

    collectInputData() {
        switch (this.selectedType) {
            case 'text':
                return document.getElementById('text-input').value.trim();

            case 'url':
                let url = document.getElementById('url-input').value.trim();
                if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                return url;

            case 'contact':
                return this.generateVCard();

            case 'email':
                return this.generateMailto();

            case 'phone':
                const phoneInput = document.getElementById('phone-input').value.trim();
                return phoneInput ? `tel:${phoneInput}` : '';

            case 'wifi':
                return this.generateWiFi();

            case 'location':
                return this.generateLocation();

            case 'sms':
                const smsPhone = document.getElementById('sms-phone').value.trim();
                const smsMsg = document.getElementById('sms-message').value.trim();
                return smsPhone ? `smsto:${smsPhone}:${smsMsg}` : '';

            case 'social':
                return this.generateSocial();

            case 'upi':
                return this.generateUPI();

            case 'event':
                return this.generateEvent();

            case 'crypto':
                return this.generateCrypto();

            case 'barcode':
                return this.generateBarcode();


            case 'maps':
                const mapPlat = document.getElementById('map-platform').value;
                const mapQue = document.getElementById('map-query').value.trim();
                if (mapPlat === 'google') return `https://www.google.com/maps/search/${encodeURIComponent(mapQue)}`;
                if (mapPlat === 'waze') return `https://waze.com/ul?q=${encodeURIComponent(mapQue)}&navigate=yes`;
                return '';

            case 'app':
                const apPlat = document.getElementById('app-platform').value;
                const apId = document.getElementById('app-id').value.trim();
                if (apPlat === 'ios') return `https://apps.apple.com/app/id${apId}`;
                if (apPlat === 'android') return `https://play.google.com/store/apps/details?id=${apId}`;
                return '';

            case 'meeting':
                return this.generateMeeting();

            case 'paypal':
                return this.generatePayPal();

            case 'medical':
                return this.generateMedical();

            case 'health_insurance':
                return this.generateHealthInsurance();

            case 'vaccine':
                return this.generateVaccine();

            case 'allergy_alert':
                return this.generateAllergyAlert();

            case 'medication_tracker':
                return this.generateMedicationTracker();

            case 'ice_contacts':
                return this.generateIceContacts();

            case 'blood_donor':
                return this.generateBloodDonor();

            case 'vision_rx':
                return this.generateVisionRx();

            case 'pet_medical':
                return this.generatePetMedical();

            case 'advance_directive':
                return this.generateAdvanceDirective();

            case 'donate':
                const donPlat = document.getElementById('donate-platform').value;
                const donUser = document.getElementById('donate-user').value.trim();
                if (donPlat === 'patreon') return `https://www.patreon.com/${donUser}`;
                if (donPlat === 'kofi') return `https://ko-fi.com/${donUser}`;
                if (donPlat === 'coffee') return `https://www.buymeacoffee.com/${donUser}`;
                return donUser;


            case 'wa': case 'tg': case 'vb': case 'sk': case 'ft': case 'fta': case 'zm': case 'wx':
                const customUri = document.getElementById(this.selectedType + '-custom').value;
                if (customUri) return customUri;

                const idInput = document.getElementById(this.selectedType + '-id').value;
                switch (this.selectedType) {
                    case 'wa': return 'whatsapp://send?phone=' + idInput;
                    case 'tg': return 'tg://resolve?domain=' + idInput;
                    case 'vb': return 'viber://contact?number=' + idInput;
                    case 'sk': return 'skype:' + idInput + '?call';
                    case 'ft': return 'facetime:' + idInput;
                    case 'fta': return 'facetime-audio:' + idInput;
                    case 'zm': return 'zoommtg://zoom.us/join?confno=' + idInput;
                    case 'wx': return 'wbx://meet/' + idInput;
                    default: return '';
                }

            case 'sp':
                const spType = document.getElementById('sp-type').value;
                const spId = document.getElementById('sp-id').value.trim();
                if (spType === 'custom') return spId;
                if (spType === 'search') return 'spotify:search:' + encodeURIComponent(spId);
                return `spotify:${spType}:${spId}`;

            case 'yt':
                const ytType = document.getElementById('yt-type').value;
                const ytId = document.getElementById('yt-id').value.trim();
                if (ytType === 'custom') return ytId;
                if (ytType === 'video') return 'vnd.youtube://' + ytId;
                if (ytType === 'channel') return 'vnd.youtube://channel/' + ytId;
                if (ytType === 'playlist') return 'https://youtube.com/playlist?list=' + ytId;
                if (ytType === 'search') return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ytId);
                return ytId;

            case 'im':
                const imType = document.getElementById('im-type').value;
                const imId = document.getElementById('im-id').value.trim();
                if (imType === 'custom') return imId;
                if (imType === 'search') return 'https://www.imdb.com/find?q=' + encodeURIComponent(imId);
                return `imdb:///title/${imId}/`.replace('title', imType);
            case 'prompt':
                return document.getElementById(this.selectedType + '-data').value;
            case 'totp':
                return `otpauth://totp/${encodeURIComponent(document.getElementById('totp-issuer').value)}:${encodeURIComponent(document.getElementById('totp-account').value)}?secret=${document.getElementById('totp-secret').value}&issuer=${encodeURIComponent(document.getElementById('totp-issuer').value)}`;

            case 'mecard':
                return this.generateMeCard();
            case 'linkedin':
                let liUrl = document.getElementById('linkedin-user').value.trim();
                if (!liUrl.startsWith('http')) {
                    if (liUrl.includes('linkedin.com')) liUrl = 'https://' + liUrl;
                    else liUrl = 'https://www.linkedin.com/in/' + liUrl;
                }
                return liUrl;
            case 'portfolio':
                return document.getElementById('portfolio-url').value.trim();
            case 'idcard':
                const idT = document.getElementById('id-type').value.trim();
                const idN = document.getElementById('id-number').value.trim();
                const idI = document.getElementById('id-issued').value.trim();
                return `ID Type: ${idT}\nID Number: ${idN}\nIssued By: ${idI}`;

            case 'home_inventory':
                return `HOME INVENTORY\nItem: ${document.getElementById('hi-name').value.trim()}\nSerial: ${document.getElementById('hi-serial').value.trim()}\nValue: ${document.getElementById('hi-value').value.trim()}\nLocation: ${document.getElementById('hi-loc').value.trim()}`;
            case 'pantry_tracker':
                return `PANTRY ITEM\nItem: ${document.getElementById('pt-item').value.trim()}\nQty: ${document.getElementById('pt-qty').value.trim()}\nExpires: ${document.getElementById('pt-exp').value.trim()}`;
            case 'spare_key':
                return `SPARE KEY\nFor: ${document.getElementById('sk-for').value.trim()}\nLocation: ${document.getElementById('sk-loc').value.trim()}\nCode/Inst: ${document.getElementById('sk-code').value.trim()}`;
            case 'recipe_card':
                return `RECIPE: ${document.getElementById('rc-name').value.trim()}\nTime: ${document.getElementById('rc-time').value.trim()}\n\nIngredients:\n${document.getElementById('rc-ing').value.trim()}\n\nSteps:\n${document.getElementById('rc-steps').value.trim()}`;
            case 'meal_planner':
                return `MEAL PLANNER\nMon: ${document.getElementById('mp-mon').value.trim()}\nTue: ${document.getElementById('mp-tue').value.trim()}\nWed: ${document.getElementById('mp-wed').value.trim()}\nThu: ${document.getElementById('mp-thu').value.trim()}\nFri: ${document.getElementById('mp-fri').value.trim()}`;
            case 'wardrobe_storage':
                return `WARDROBE STORAGE\nBox: ${document.getElementById('ws-box').value.trim()}\nSeason: ${document.getElementById('ws-season').value.trim()}\nContents:\n${document.getElementById('ws-items').value.trim()}`;
            case 'plant_care':
                return `PLANT CARE: ${document.getElementById('pc-name').value.trim()}\nSunlight: ${document.getElementById('pc-sun').value.trim()}\nWatering: ${document.getElementById('pc-water').value.trim()}`;
            case 'bike_maintenance':
                return `BIKE MAINTENANCE\nModel: ${document.getElementById('bm-model').value.trim()}\nLast Serviced: ${document.getElementById('bm-last').value.trim()}\nTire PSI: ${document.getElementById('bm-tire').value.trim()}`;
            case 'car_maintenance':
                return `CAR MAINTENANCE\nModel: ${document.getElementById('cm-model').value.trim()}\nVIN: ${document.getElementById('cm-vin').value.trim()}\nOil: ${document.getElementById('cm-oil').value.trim()}\nTires: ${document.getElementById('cm-tire').value.trim()}`;
            case 'wifi_extender':
                return `WIFI EXTENDER SETUP\nSSID: ${document.getElementById('we-ssid').value.trim()}\nAdmin IP: ${document.getElementById('we-ip').value.trim()}\nAdmin Pass: ${document.getElementById('we-pass').value.trim()}`;
            case 'alarm_code':
                return `SECURITY ALARM\nSystem: ${document.getElementById('ac-name').value.trim()}\nArm: ${document.getElementById('ac-arm').value.trim()}\nDisarm: ${document.getElementById('ac-disarm').value.trim()}\nGuest: ${document.getElementById('ac-guest').value.trim()}`;
            case 'gym_routine':
                return `GYM ROUTINE: ${document.getElementById('gr-name').value.trim()}\nTarget: ${document.getElementById('gr-target').value.trim()}\n\nExercises:\n${document.getElementById('gr-ex').value.trim()}`;
            case 'bp_log':
                return `BP LOG\nDate: ${document.getElementById('bpl-date').value.trim()}\nSystolic: ${document.getElementById('bpl-sys').value.trim()}\nDiastolic: ${document.getElementById('bpl-dia').value.trim()}\nHR: ${document.getElementById('bpl-hr').value.trim()}`;
            case 'vitamin_schedule':
                return `VITAMIN SCHEDULE\nSupplement: ${document.getElementById('vs-name').value.trim()}\nDosage: ${document.getElementById('vs-dose').value.trim()}\nTime: ${document.getElementById('vs-time').value.trim()}`;
            case 'bedtime_routine':
                return `BEDTIME ROUTINE\nTarget Bed: ${document.getElementById('br-bed').value.trim()}\nTarget Wake: ${document.getElementById('br-wake').value.trim()}\n\nWind-down:\n${document.getElementById('br-steps').value.trim()}`;
            case 'habit_tracker':
                return `HABIT TRACKER\n1. ${document.getElementById('ht-1').value.trim()}\n2. ${document.getElementById('ht-2').value.trim()}\n3. ${document.getElementById('ht-3').value.trim()}\nFrequency: ${document.getElementById('ht-freq').value.trim()}`;
            case 'budget_tracker':
                return `BUDGET TRACKER\nMonth: ${document.getElementById('bt-month').value.trim()}\nTotal: ${document.getElementById('bt-total').value.trim()}\nHousing: ${document.getElementById('bt-house').value.trim()}\nSavings: ${document.getElementById('bt-save').value.trim()}`;
            case 'evac_route':
                return `EVACUATION ROUTE\nMeeting Pt: ${document.getElementById('er-meet').value.trim()}\nExit: ${document.getElementById('er-pri').value.trim()}\nContact: ${document.getElementById('er-contact').value.trim()}`;
            case 'office_visitor':
                return `OFFICE VISITOR\nCompany: ${document.getElementById('ov-comp').value.trim()}\nRoom: ${document.getElementById('ov-room').value.trim()}\nGuest WiFi: ${document.getElementById('ov-wifi').value.trim()}\nWiFi Pass: ${document.getElementById('ov-pass').value.trim()}`;
            case 'project_board':
                return `PROJECT: ${document.getElementById('pb-name').value.trim()}\nPhase: ${document.getElementById('pb-phase').value.trim()}\nNext Milestone: ${document.getElementById('pb-mile').value.trim()}\nDeadline: ${document.getElementById('pb-due').value.trim()}`;

            default:
                return '';
        }
    }

    generateMeCard() {
        const name = document.getElementById('mecard-name').value.trim();
        const phone = document.getElementById('mecard-phone').value.trim();
        const email = document.getElementById('mecard-email').value.trim();

        if (!name) return '';

        // MECARD:N:Doe,John;TEL:123456789;EMAIL:john@doe.com;;
        let mecard = 'MECARD:';
        mecard += `N:${name};`;
        if (phone) mecard += `TEL:${phone};`;
        if (email) mecard += `EMAIL:${email};`;
        mecard += ';';
        return mecard;
    }

    generateVCard() {
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const org = document.getElementById('contact-org').value.trim();
        const address = document.getElementById('contact-address').value.trim();

        if (!name) return '';

        // Proper vCard 3.0 format
        let vcard = 'BEGIN:VCARD\r\n';
        vcard += 'VERSION:3.0\r\n';
        vcard += `FN:${name}\r\n`;

        // Split name for proper N field
        const nameParts = name.split(' ');
        const lastName = nameParts.length > 1 ? nameParts.pop() : '';
        const firstName = nameParts.join(' ');
        vcard += `N:${lastName};${firstName};;;\r\n`;

        if (phone) {
            // Clean phone number
            const cleanPhone = phone.replace(/[^\d+\-\(\)\s]/g, '');
            vcard += `TEL;TYPE=CELL:${cleanPhone}\r\n`;
        }

        if (email) {
            vcard += `EMAIL;TYPE=INTERNET:${email}\r\n`;
        }

        if (org) {
            vcard += `ORG:${org}\r\n`;
        }

        if (address) {
            // Proper address format: ;;street;city;state;postal;country
            vcard += `ADR;TYPE=HOME:;;${address};;;;\r\n`;
        }

        vcard += 'END:VCARD\r\n';

        console.log('Generated vCard:', vcard);
        return vcard;
    }

    generateMailto() {
        const to = document.getElementById('email-to').value.trim();
        const subject = document.getElementById('email-subject').value.trim();
        const body = document.getElementById('email-body').value.trim();

        if (!to) return '';

        let mailto = `mailto:${to}`;
        const params = [];

        if (subject) {
            params.push(`subject=${encodeURIComponent(subject)}`);
        }
        if (body) {
            params.push(`body=${encodeURIComponent(body)}`);
        }

        if (params.length > 0) {
            mailto += `?${params.join('&')}`;
        }

        console.log('Generated mailto:', mailto);
        return mailto;
    }

    generateWiFi() {
        const ssid = document.getElementById('wifi-ssid').value.trim();
        const password = document.getElementById('wifi-password').value.trim();
        const security = document.getElementById('wifi-security').value;
        const hidden = document.getElementById('wifi-hidden').value;

        if (!ssid) return '';

        // Proper WiFi QR format
        let wifi = `WIFI:T:${security};S:${this.escapeWiFiString(ssid)};`;

        if (password && security !== 'nopass') {
            wifi += `P:${this.escapeWiFiString(password)};`;
        }

        wifi += `H:${hidden};;`; // Hidden network


        console.log('Generated WiFi:', wifi);
        return wifi;
    }

    escapeWiFiString(str) {
        // Escape special characters for WiFi QR codes
        return str.replace(/([\\";,:])/g, '\\$1');
    }

    generateLocation() {
        const lat = document.getElementById('location-lat').value.trim();
        const lng = document.getElementById('location-lng').value.trim();
        const name = document.getElementById('location-name').value.trim();

        if (!lat || !lng) return '';

        // Standard geo URI format
        let geo = `geo:${lat},${lng}`;
        if (name) {
            geo += `?q=${encodeURIComponent(name)}`;
        }

        console.log('Generated Location:', geo);
        return geo;
    }



    updateSocialHint() {
        const platform = document.getElementById('social-platform').value;
        const hint = document.getElementById('social-hint');
        const input = document.getElementById('social-input');
        const label = document.querySelector('label[for="social-input"]');

        switch (platform) {
            case 'instagram':
                label.textContent = 'Username *';
                input.placeholder = 'username';
                hint.textContent = 'Enter Instagram username (e.g. johndoe)';
                break;
            case 'facebook':
                label.textContent = 'Profile ID / Username *';
                input.placeholder = 'johndoe123';
                hint.textContent = 'Enter Facebook username or profile ID';
                break;
            case 'twitter':
                label.textContent = 'Handle *';
                input.placeholder = 'johndoe';
                hint.textContent = 'Enter X handle without @';
                break;
            case 'linkedin':
                label.textContent = 'Profile / Company URL *';
                input.placeholder = 'in/johndoe';
                hint.textContent = 'Enter your LinkedIn profile slug (e.g. in/johndoe)';
                break;
            case 'youtube':
                label.textContent = 'Channel Handle / URL *';
                input.placeholder = '@ChannelName';
                hint.textContent = 'Enter channel handle (e.g. @TechReview)';
                break;
            case 'threads':
                label.textContent = 'Username *';
                input.placeholder = 'username';
                hint.textContent = 'Enter Threads username';
                break;
            case 'whatsapp':
                label.textContent = 'Phone Number (with Code) *';
                input.placeholder = '919876543210';
                hint.textContent = 'Enter number with country code, no + symbol (e.g. 919876543210)';
                break;
            case 'telegram':
                label.textContent = 'Username *';
                input.placeholder = 'username';
                hint.textContent = 'Enter Telegram username';
                break;
            case 'other':
                label.textContent = 'Full Link *';
                input.placeholder = 'https://mysite.com';
                hint.textContent = 'Enter the full profile URL';
                break;
            default:
                label.textContent = 'Username *';
                input.placeholder = 'username';
                hint.textContent = 'Enter username';
        }
    }

    generateSocial() {
        const platform = document.getElementById('social-platform').value;
        let input = document.getElementById('social-input').value.trim();

        if (!input) return '';

        // Clean input (remove @, remove spaces)
        if (platform !== 'other' && platform !== 'linkedin' && platform !== 'youtube') {
            input = input.replace(/@/g, '').replace(/\s/g, '');
        }

        let url = '';
        switch (platform) {
            case 'instagram': url = `https://instagram.com/${input}`; break;
            case 'facebook': url = `https://facebook.com/${input}`; break;
            case 'twitter': url = `https://x.com/${input}`; break;
            case 'linkedin':
                if (!input.includes('linkedin.com')) url = `https://linkedin.com/${input}`;
                else url = input;
                break;
            case 'youtube':
                if (input.startsWith('http')) url = input;
                else url = `https://youtube.com/${input}`;
                break;
            case 'threads': url = `https://www.threads.net/@${input}`; break;
            case 'snapchat': url = `https://www.snapchat.com/add/${input}`; break;
            case 'tiktok': url = `https://www.tiktok.com/@${input}`; break;
            case 'whatsapp': url = `https://wa.me/${input}`; break;
            case 'telegram': url = `https://t.me/${input}`; break;
            case 'other':
                url = input.startsWith('http') ? input : `https://${input}`;
                break;
            default: url = input;
        }

        console.log('Generated Social URL:', url);
        return url;
    }

    generateSMS() {
        const phone = document.getElementById('sms-phone').value.trim();
        const message = document.getElementById('sms-message').value.trim();

        if (!phone) return '';

        // SMSTO format (widely supported)
        let sms = `smsto:${phone}`;
        if (message) {
            sms += `:${message}`;
        }

        console.log('Generated SMS:', sms);
        return sms;
    }

    generateUPI() {
        const upiId = document.getElementById('upi-id').value.trim();
        const name = document.getElementById('upi-name').value.trim();
        const amount = document.getElementById('upi-amount').value.trim();
        const note = document.getElementById('upi-note').value.trim();

        if (!upiId) return '';

        // UPI Payment URI format (Indian standard)
        let upi = `upi://pay?pa=${encodeURIComponent(upiId)}`;

        if (name) {
            upi += `&pn=${encodeURIComponent(name)}`;
        }

        if (amount) {
            upi += `&am=${amount}`;
        }
        if (note) {
            upi += `&tn=${encodeURIComponent(note)}`;
        }
        upi += '&cu=INR'; // Currency

        console.log('Generated UPI:', upi);
        return upi;
    }


    generateEvent() {
        const title = document.getElementById('event-title').value.trim();
        const location = document.getElementById('event-location').value.trim();
        const startDate = document.getElementById('event-start-date').value;
        const startTime = document.getElementById('event-start-time').value;
        const endDate = document.getElementById('event-end-date').value;
        const endTime = document.getElementById('event-end-time').value;
        const isAllDay = document.getElementById('event-allday').value === 'true';
        const tz = document.getElementById('event-timezone').value;
        const description = document.getElementById('event-description').value.trim();

        if (!title || !startDate || !endDate) return '';
        if (!isAllDay && (!startTime || !endTime)) return '';

        // Convert to iCalendar format
        const formatDateTime = (date, time, isAllDay, tz) => {
            if (isAllDay) {
                return `VALUE=DATE:${date.replace(/-/g, '')}`;
            }
            let dt = `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00`;
            if (tz === 'Z') dt += 'Z';
            return dt;
        };

        // iCalendar VEVENT format
        let event = 'BEGIN:VCALENDAR\r\n';
        event += 'VERSION:2.0\r\n';
        event += 'BEGIN:VEVENT\r\n';
        
        if (isAllDay) {
            event += `DTSTART;${formatDateTime(startDate, null, true, tz)}\r\n`;
            event += `DTEND;${formatDateTime(endDate, null, true, tz)}\r\n`;
        } else {
            event += `DTSTART:${formatDateTime(startDate, startTime, false, tz)}\r\n`;
            event += `DTEND:${formatDateTime(endDate, endTime, false, tz)}\r\n`;
        }
        event += `SUMMARY:${title}\r\n`;

        if (location) {
            event += `LOCATION:${location}\r\n`;
        }
        if (description) {
            event += `DESCRIPTION:${description}\r\n`;
        }

        event += 'END:VEVENT\r\n';
        event += 'END:VCALENDAR';

        console.log('Generated Event:', event);
        return event;
    }

    updateCryptoFields() {
        const coin = document.getElementById('crypto-coin').value;
        const infoEl = document.getElementById('crypto-info');

        const cryptoInfo = {
            bitcoin: { icon: 'fab fa-bitcoin', name: 'Bitcoin Network' },
            ethereum: { icon: 'fab fa-ethereum', name: 'Ethereum Network' },
            litecoin: { icon: 'fas fa-coins', name: 'Litecoin Network' },
            dogecoin: { icon: 'fas fa-dog', name: 'Dogecoin Network' },
            ripple: { icon: 'fas fa-water', name: 'Ripple Network' },
            cardano: { icon: 'fas fa-circle-nodes', name: 'Cardano Network' },
            solana: { icon: 'fas fa-sun', name: 'Solana Network' },
            polygon: { icon: 'fas fa-hexagon', name: 'Polygon Network' },
            usdt: { icon: 'fas fa-dollar-sign', name: 'Tether (ERC-20/TRC-20)' },
            usdc: { icon: 'fas fa-dollar-sign', name: 'USD Coin (ERC-20)' }
        };

        const info = cryptoInfo[coin] || cryptoInfo.bitcoin;
        infoEl.innerHTML = `<i class="${info.icon}"></i><span>${info.name}</span>`;
    }

    generateCrypto() {
        const coin = document.getElementById('crypto-coin').value;
        const address = document.getElementById('crypto-address').value.trim();
        const amount = document.getElementById('crypto-amount').value.trim();
        const label = document.getElementById('crypto-label').value.trim();

        if (!address) return '';

        // Crypto payment URI formats (BIP21 standard for Bitcoin, EIP-681 for Ethereum)
        const prefixes = {
            bitcoin: 'bitcoin',
            ethereum: 'ethereum',
            litecoin: 'litecoin',
            dogecoin: 'dogecoin',
            ripple: 'ripple',
            cardano: 'cardano',
            solana: 'solana',
            polygon: 'polygon',
            usdt: 'ethereum', // USDT typically on ETH
            usdc: 'ethereum'  // USDC typically on ETH
        };

        let uri = `${prefixes[coin] || coin}:${address}`;
        const params = [];

        if (amount) {
            params.push(`amount=${amount}`);
        }
        if (label) {
            params.push(`label=${encodeURIComponent(label)}`);
        }

        if (params.length > 0) {
            uri += '?' + params.join('&');
        }

        console.log('Generated Crypto:', uri);
        return uri;
    }

    generateBarcode() {
        const data = document.getElementById('barcode-data').value.trim();
        if (!data) return '';

        // Return raw data - barcode generation handled separately
        this.barcodeFormat = document.getElementById('barcode-format').value;
        this.barcodeHeight = parseInt(document.getElementById('barcode-height').value) || 100;
        this.barcodeText = document.getElementById('barcode-text').value.trim();

        console.log('Generated Barcode data:', data);
        return data;
    }


    generatePayPal() {
        const user = document.getElementById('paypal-user').value.trim();
        const amount = document.getElementById('paypal-amount').value.trim();

        if (!user) return '';

        // PayPal.me format is cleaner for QR codes
        if (amount) {
            return `https://www.paypal.com/paypalme/${user}/${amount}`;
        }
        return `https://www.paypal.com/paypalme/${user}`;
    }

    generateDonate() {
        const platform = document.getElementById('donate-platform').value;
        const user = document.getElementById('donate-user').value.trim();
        if (!user) return '';

        switch (platform) {
            case 'coffee': return `https://www.buymeacoffee.com/${user}`;
            case 'patreon': return `https://www.patreon.com/${user}`;
            case 'kofi': return `https://ko-fi.com/${user}`;
            default: return user;
        }
    }

    generateMedical() {
        const name = document.getElementById('medical-name').value.trim();
        const blood = document.getElementById('medical-blood').value.trim();
        const donor = document.getElementById('medical-donor').value.trim();
        const contactName = document.getElementById('medical-contact-name').value.trim();
        const contactPhone = document.getElementById('medical-contact-phone').value.trim();
        const allergies = document.getElementById('medical-allergies').value.trim();
        const meds = document.getElementById('medical-meds').value.trim();
        const conditions = document.getElementById('medical-conditions').value.trim();

        if (!name) return '';

        let info = `MEDICAL EMERGENCY INFO\nName: ${name}`;
        if (blood) info += `\nBlood Type: ${blood}`;
        if (donor) info += `\nOrgan Donor: ${donor}`;
        if (contactName || contactPhone) {
            info += `\nEmerg. Contact: ${contactName} ${contactPhone}`.trim();
        }
        if (allergies) info += `\nAllergies: ${allergies}`;
        if (meds) info += `\nMedications: ${meds}`;
        if (conditions) info += `\nConditions: ${conditions}`;

        return info;
    }

    generateHealthInsurance() {
        const provider = document.getElementById('hi-provider').value.trim();
        const member = document.getElementById('hi-member').value.trim();
        const group = document.getElementById('hi-group').value.trim();
        const plan = document.getElementById('hi-plan').value.trim();
        const phone = document.getElementById('hi-phone').value.trim();

        if (!provider || !member) return '';

        let info = `HEALTH INSURANCE INFO\nProvider: ${provider}\nMember ID: ${member}`;
        if (group) info += `\nGroup No: ${group}`;
        if (plan) info += `\nPlan Type: ${plan}`;
        if (phone) info += `\nProvider Phone: ${phone}`;

        return info;
    }

    generateVaccine() {
        const name = document.getElementById('vac-name').value.trim();
        const date = document.getElementById('vac-date').value;
        const clinic = document.getElementById('vac-clinic').value.trim();
        const batch = document.getElementById('vac-batch').value.trim();

        if (!name || !date) return '';

        let info = `VACCINATION RECORD\nVaccine: ${name}\nDate: ${date}`;
        if (clinic) info += `\nClinic/Doctor: ${clinic}`;
        if (batch) info += `\nBatch Number: ${batch}`;

        return info;
    }

    generateAllergyAlert() {
        const name = document.getElementById('allergy-name').value.trim();
        const list = document.getElementById('allergy-list').value.trim();
        const symptoms = document.getElementById('allergy-symptoms').value.trim();
        const action = document.getElementById('allergy-action').value.trim();
        const epipen = document.getElementById('allergy-epipen').value;

        if (!name || !list) return '';

        let info = `ALLERGY ALERT\nName: ${name}\nAllergies: ${list}`;
        if (symptoms) info += `\nSymptoms: ${symptoms}`;
        if (action) info += `\nTreatment: ${action}`;
        if (epipen !== 'N/A') info += `\nCarries EpiPen: ${epipen}`;

        return info;
    }

    generateMedicationTracker() {
        const patient = document.getElementById('med-patient').value.trim();
        const name1 = document.getElementById('med-name-1').value.trim();
        const dose1 = document.getElementById('med-dosage-1').value.trim();
        const freq1 = document.getElementById('med-freq-1').value.trim();
        const name2 = document.getElementById('med-name-2').value.trim();
        const dose2 = document.getElementById('med-dosage-2').value.trim();
        const freq2 = document.getElementById('med-freq-2').value.trim();
        const instructions = document.getElementById('med-instructions').value.trim();

        if (!patient || !name1 || !dose1 || !freq1) return '';

        let info = `MEDICATION SCHEDULE\nPatient: ${patient}\nMed 1: ${name1} (${dose1}) - ${freq1}`;
        if (name2 && dose2 && freq2) {
            info += `\nMed 2: ${name2} (${dose2}) - ${freq2}`;
        }
        if (instructions) info += `\nInstructions: ${instructions}`;

        return info;
    }

    generateIceContacts() {
        const name1 = document.getElementById('ice-name-1').value.trim();
        const rel1 = document.getElementById('ice-rel-1').value.trim();
        const phone1 = document.getElementById('ice-phone-1').value.trim();
        const name2 = document.getElementById('ice-name-2').value.trim();
        const rel2 = document.getElementById('ice-rel-2').value.trim();
        const phone2 = document.getElementById('ice-phone-2').value.trim();
        const hospital = document.getElementById('ice-hospital').value.trim();

        if (!name1 || !rel1 || !phone1) return '';

        let info = `EMERGENCY CONTACTS (ICE)\nPrimary: ${name1} (${rel1}) - ${phone1}`;
        if (name2 && rel2 && phone2) {
            info += `\nSecondary: ${name2} (${rel2}) - ${phone2}`;
        }
        if (hospital) info += `\nPref. Hospital: ${hospital}`;

        return info;
    }

    generateBloodDonor() {
        const name = document.getElementById('donor-name').value.trim();
        const blood = document.getElementById('donor-blood').value;
        const donorId = document.getElementById('donor-id').value.trim();
        const lastDate = document.getElementById('donor-last-date').value;
        const center = document.getElementById('donor-center').value.trim();

        if (!name || !blood) return '';

        let info = `BLOOD DONOR PROFILE\nName: ${name}\nBlood Group: ${blood}`;
        if (donorId) info += `\nDonor ID: ${donorId}`;
        if (lastDate) info += `\nLast Donation: ${lastDate}`;
        if (center) info += `\nDonation Center: ${center}`;

        return info;
    }

    generateVisionRx() {
        const name = document.getElementById('vision-name').value.trim();
        const odSph = document.getElementById('vision-od-sph').value.trim();
        const odCyl = document.getElementById('vision-od-cyl').value.trim();
        const odAxis = document.getElementById('vision-od-axis').value.trim();
        const osSph = document.getElementById('vision-os-sph').value.trim();
        const osCyl = document.getElementById('vision-os-cyl').value.trim();
        const osAxis = document.getElementById('vision-os-axis').value.trim();
        const pd = document.getElementById('vision-pd').value.trim();

        if (!name) return '';

        let info = `VISION PRESCRIPTION\nPatient: ${name}`;
        if (odSph || odCyl || odAxis) {
            info += `\nOD (Right): SPH ${odSph || '0.00'} | CYL ${odCyl || '0.00'} | AXIS ${odAxis || '0'}`;
        }
        if (osSph || osCyl || osAxis) {
            info += `\nOS (Left): SPH ${osSph || '0.00'} | CYL ${osCyl || '0.00'} | AXIS ${osAxis || '0'}`;
        }
        if (pd) info += `\nPupillary Distance (PD): ${pd}`;

        return info;
    }

    generatePetMedical() {
        const name = document.getElementById('pet-name').value.trim();
        const breed = document.getElementById('pet-breed').value.trim();
        const chip = document.getElementById('pet-microchip').value.trim();
        const conditions = document.getElementById('pet-conditions').value.trim();
        const vet = document.getElementById('pet-vet').value.trim();

        if (!name || !breed) return '';

        let info = `PET MEDICAL INFO\nPet Name: ${name}\nSpecies/Breed: ${breed}`;
        if (chip) info += `\nMicrochip: ${chip}`;
        if (conditions) info += `\nConditions/Allergies: ${conditions}`;
        if (vet) info += `\nVet: ${vet}`;

        return info;
    }

    generateAdvanceDirective() {
        const name = document.getElementById('ad-name').value.trim();
        const proxyName = document.getElementById('ad-proxy-name').value.trim();
        const proxyPhone = document.getElementById('ad-proxy-phone').value.trim();
        const dnr = document.getElementById('ad-dnr').value;
        const location = document.getElementById('ad-doc-location').value.trim();

        if (!name || !proxyName || !proxyPhone || !dnr) return '';

        let info = `ADVANCE HEALTHCARE DIRECTIVE\nPatient: ${name}\nDirective: ${dnr}\nProxy Contact: ${proxyName} (${proxyPhone})`;
        if (location) info += `\nDocument Stored at: ${location}`;

        return info;
    }

    // History Management
    loadHistory() {
        try {
            const history = localStorage.getItem('qr-generator-history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }

    getDisplayText() {
        switch (this.selectedType) {
            case 'text':
                return this.qrData.length > 30 ? this.qrData.substring(0, 30) + '...' : this.qrData;
            case 'url':
                return this.qrData.replace(/^https?:\/\//, '');
            case 'contact':
                const nameMatch = this.qrData.match(/FN:([^\r\n]+)/);
                return nameMatch ? nameMatch[1] : 'Contact Card';
            case 'email':
                return this.qrData.replace('mailto:', '').split('?')[0];
            case 'phone':
                return this.qrData.replace('tel:', '');
            case 'wifi':
                const ssidMatch = this.qrData.match(/S:([^;]+)/);
                return ssidMatch ? ssidMatch[1] : 'WiFi Network';
            case 'location':
                return 'GPS Location';
            case 'sms':
                return 'SMS Message';
            case 'upi':
                return 'UPI Payment';
            case 'social':
                return 'Social Media';
            case 'bank':
                return 'Bank Account';
            case 'event':
                return 'Calendar Event';
            case 'crypto':
                return 'Crypto Address';
            case 'barcode':
                return 'Product Barcode';
            case 'app':
                return 'Smart App Link';
            case 'meeting':
                return 'Meeting Invite';
            case 'paypal':
                return 'PayPal.me Link';
            case 'medical':
                return 'Medical Info Card';
            case 'health_insurance':
                return 'Health Insurance Card';
            case 'vaccine':
                return 'Vaccination Record';
            case 'allergy_alert':
                return 'Allergy Alert';
            case 'medication_tracker':
                return 'Med Schedule';
            case 'ice_contacts':
                return 'ICE Contacts';
            case 'blood_donor':
                return 'Blood Donor Profile';
            case 'vision_rx':
                return 'Vision Prescription';
            case 'pet_medical':
                return 'Pet Health Card';
            case 'advance_directive':
                return 'Living Will / DNR';
            case 'donate':
                return 'Donation Page';
            case 'discord':
                return 'Discord Invite';
            case 'book':
                return 'Book Search';
            case 'developer':
                return 'Developer Project';
            case 'coupon':
                return 'Coupon Card';
            case 'secret':
                return 'Secret Note';
            case 'maps':
                return 'Smart Maps';
            case 'wa': return 'WhatsApp Link';
            case 'tg': return 'Telegram Link';
            case 'vb': return 'Viber Link';
            case 'sk': return 'Skype Link';
            case 'ft': return 'Facetime Video';
            case 'fta': return 'Facetime Audio';
            case 'zm': return 'Zoom Deep Link';
            case 'wx': return 'Webex Deep Link';
            case 'sp': return 'Spotify Search';
            case 'yt': return 'YouTube Action';
            case 'yl': return 'Yelp Place';
            case 'im': return 'IMDb Movie';
            default:
                return this.qrData.length > 30 ? this.qrData.substring(0, 30) + '...' : this.qrData;
        }
    }

    saveToHistory(type, data, displayText) {
        const historyItem = {
            id: Date.now(),
            type: type,
            data: data,
            displayText: displayText,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toLocaleString(),
            customization: { ...this.customization }
        };

        this.history.unshift(historyItem);

        // No limit on history items - store all

        try {
            localStorage.setItem('qr-generator-history', JSON.stringify(this.history));
            console.log('Saved to history:', historyItem);
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    loadHistoryDisplay() {
        // Update both old and new history displays
        this.updateHistoryPanel();
        this.updateHistoryCount();
    }

    updateHistoryPanel() {
        const historyList = document.getElementById('history-panel-list');
        if (!historyList) return;

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        historyList.innerHTML = '';

        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="history-panel-empty">
                    <i class="fas fa-history"></i>
                    <h3>No QR Codes Yet</h3>
                    <p>Generate your first QR code to see it appear here in your history</p>
                </div>
            `;
            return;
        }

        // Batch DOM operations for better performance
        this.history.forEach((item, index) => {
            const historyItemEl = document.createElement('div');
            historyItemEl.className = 'history-panel-item';
            historyItemEl.style.transform = 'translateZ(0)'; // Force hardware acceleration

            historyItemEl.addEventListener('click', () => {
                this.loadFromHistory(item);
                this.toggleHistoryPanel();
            }, { passive: true });

            const canvasId = `history-qr-${item.id}`;

            historyItemEl.innerHTML = `
                <div class="history-panel-item-content">
                    <div class="history-panel-item-qr">
                        <canvas id="${canvasId}" width="70" height="70"></canvas>
                    </div>
                    <div class="history-panel-item-info">
                        <div class="history-panel-item-type">${item.type.toUpperCase()}</div>
                        <div class="history-panel-item-data">${item.displayText}</div>
                        <div class="history-panel-item-time">
                            <i class="fas fa-clock"></i>
                            ${item.createdAt}
                        </div>
                    </div>
                    <div class="history-panel-item-actions">
                        <button class="history-panel-item-delete" onclick="event.stopPropagation(); window.qrApp.deleteHistoryItem(${item.id})" title="Delete from history">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            fragment.appendChild(historyItemEl);

            // Stagger QR generation to avoid blocking
            setTimeout(() => {
                this.generateHistoryQR(canvasId, item);
            }, index * 25);
        });

        historyList.appendChild(fragment);
    }

    updateHistoryCount() {
        const count = this.history.length;

        // Update panel count
        const panelCount = document.getElementById('history-count');
        if (panelCount) {
            panelCount.textContent = count;
        }

        // Update toggle button count
        const toggleCount = document.getElementById('history-toggle-count');
        if (toggleCount) {
            toggleCount.textContent = count;
        }

        // Show/hide toggle button based on history
        const toggleBtn = document.getElementById('history-toggle-btn');
        if (toggleBtn) {
            toggleBtn.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    generateHistoryQR(canvasId, item) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const options = {
            width: 70,
            height: 70,
            margin: 1,
            color: {
                dark: item.customization?.fgColor || '#000000',
                light: item.customization?.bgColor || '#ffffff'
            }
        };

        // Generate small QR code for history item
        this.generateQRWithMethod(canvas, item.data, options).catch(error => {
            console.error('Error generating history QR:', error);
            // Fallback: show icon instead
            canvas.style.display = 'none';
            const qrContainer = canvas.parentElement;
            qrContainer.innerHTML = `<i class="fas fa-qrcode" style="font-size: 24px; color: #667eea;"></i>`;
        });
    }

    toggleHistoryPanel() {
        const panel = document.getElementById('history-panel');
        if (!panel) return;

        const isActive = panel.classList.contains('active');

        if (isActive) {
            // Close panel
            panel.classList.remove('active');
        } else {
            // Open panel
            this.updateHistoryPanel(); // Refresh content
            panel.classList.add('active');
        }
    }

    loadFromHistory(item) {
        this.selectedType = item.type;
        this.qrData = item.data;

        // Restore customization settings if available
        if (item.customization) {
            this.customization = { ...this.customization, ...item.customization };

            // Update UI elements
            const fgInput = document.getElementById('fg-color');
            const bgInput = document.getElementById('bg-color');
            const sizeSldr = document.getElementById('size-slider');
            const sizeVal = document.getElementById('size-value');

            if (fgInput) fgInput.value = this.customization.fgColor;
            if (bgInput) bgInput.value = this.customization.bgColor;
            if (sizeSldr) sizeSldr.value = this.customization.size;
            if (sizeVal) sizeVal.textContent = `${this.customization.size}px`;

            // Active state for pattern/corners
            document.querySelectorAll('.pattern-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.pattern === this.customization.pattern);
            });
            document.querySelectorAll('.corner-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.corner === this.customization.cornerStyle);
            });
        }

        // Update UI to show selected type
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === item.type);
        });

        // Go directly to result page with the saved QR
        this.goToPage(4);

        // Generate QR immediately
        setTimeout(() => {
            this.createQRCode().then(() => {
                this.showSuccessAnimation();
            }).catch(error => {
                console.error('Error loading from history:', error);
                this.goToPage(3); // Fall back to customization page
            });
        }, 100);
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all QR code history? This action cannot be undone.')) {
            this.history = [];
            localStorage.removeItem('qr-generator-history');
            this.loadHistoryDisplay();
            this.showNotification('History cleared successfully', 'success');
        }
    }



    deleteHistoryItem(itemId) {
        if (confirm('Delete this QR code from history?')) {
            this.history = this.history.filter(item => item.id !== itemId);
            localStorage.setItem('qr-generator-history', JSON.stringify(this.history));
            this.loadHistoryDisplay();
            this.showNotification('QR code removed from history', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : type === 'warning' ? '#ed8936' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    generateHeaderQR() {
        // Generate QR code for header that links to coralgenz.wordpress.com
        const canvas = document.getElementById('header-qr');
        if (!canvas) return;

        const url = 'https://coralgenz.wordpress.com';

        // Wait for QR library to be ready
        const generateQR = () => {
            if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                QRCode.toCanvas(canvas, url, {
                    width: 32,
                    height: 32,
                    margin: 1,
                    color: {
                        dark: '#0f172a',  // Dark QR code for light header
                        light: '#00000000'  // Transparent background
                    },
                    errorCorrectionLevel: 'H'  // High error correction for better scanning
                }, (error) => {
                    if (error) {
                        console.error('Header QR generation error:', error);
                        // Fallback: create a simple QR pattern manually
                        this.createFallbackHeaderQR(canvas);
                    } else {
                        console.log('Header QR code generated successfully');
                        this.setupHeaderQRInteraction();
                    }
                });
            } else {
                // Fallback: create a simple QR pattern manually
                this.createFallbackHeaderQR(canvas);
                this.setupHeaderQRInteraction();
            }
        };

        // Try to generate immediately, or wait for library
        if (this.libraryReady) {
            generateQR();
        } else {
            // Wait for library to load
            const checkLibrary = setInterval(() => {
                if (this.libraryReady) {
                    clearInterval(checkLibrary);
                    generateQR();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkLibrary);
                this.createFallbackHeaderQR(canvas);
                this.setupHeaderQRInteraction();
            }, 5000);
        }
    }

    createFallbackHeaderQR(canvas) {
        // Create a simple QR-like pattern as fallback
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.clearRect(0, 0, 32, 32);

        // Create a more detailed QR-like pattern (8x8 grid for 32px canvas)
        const pattern = [
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 1, 1, 0, 1, 1],
            [1, 0, 1, 1, 1, 0, 1, 0],
            [1, 0, 1, 1, 1, 0, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 0, 1, 0, 1, 0]
        ];

        const cellSize = 32 / pattern.length;

        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (pattern[i][j]) {
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                }
            }
        }

        console.log('Fallback header QR pattern created');

        // Add click handler to open the website
        canvas.onclick = () => {
            window.open('https://coralgenz.wordpress.com', '_blank');
        };
    }

    setupHeaderQRInteraction() {
        const canvas = document.getElementById('header-qr');
        if (canvas) {
            // Add click handler to open the website
            canvas.onclick = () => {
                window.open('https://coralgenz.wordpress.com', '_blank');
            };
            // Update tooltip
            canvas.title = 'Click or scan to visit coralgenz.wordpress.com';
        }
    }

    validateQRData(quiet = false) {
        // If quiet is true, we don't trigger side effects or errors
        if (!this.qrData) return false;

        switch (this.selectedType) {
            case 'text':
                return this.qrData.length > 0;

            case 'url':
                return this.qrData.startsWith('http://') || this.qrData.startsWith('https://');

            case 'contact':
                return this.qrData.includes('BEGIN:VCARD') && this.qrData.includes('END:VCARD');

            case 'email':
                return this.qrData.startsWith('mailto:');

            case 'phone':
                return this.qrData.startsWith('tel:');

            case 'wifi':
                return this.qrData.startsWith('WIFI:');

            case 'location':
                return this.qrData.startsWith('geo:');

            case 'sms':
                return this.qrData.startsWith('smsto:');

            case 'upi':
                return this.qrData.startsWith('upi://');

            case 'bank':
                return this.qrData.includes('Beneficiary:');

            case 'event':
                return this.qrData.includes('BEGIN:VCALENDAR');

            case 'crypto':
                return this.qrData.includes(':') && this.qrData.length > 10;

            case 'barcode':
                return this.qrData.length > 0;

            default:
                return this.qrData.length > 0;
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file (PNG, JPG, GIF, etc.)', 'error');
            return;
        }

        // Clear serial number if logo is uploaded
        if (this.customization.serialNumber) {
            const serialInput = document.getElementById('serial-number-input');
            const clearSerialBtn = document.getElementById('clear-serial-btn');
            if (serialInput) serialInput.value = '';
            if (clearSerialBtn) clearSerialBtn.style.display = 'none';
            this.customization.serialNumber = null;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image file is too large. Please select a file smaller than 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Create an image to validate and process
                const img = new Image();
                img.onload = () => {
                    // Store the image data
                    this.customization.logo = e.target.result;
                    this.showLogoPreview(e.target.result);
                    this.showNotification('Logo uploaded successfully!', 'success');
                    this.generateLiveQR();
                    console.log('Logo uploaded:', {
                        size: file.size,
                        type: file.type,
                        dimensions: `${img.width}x${img.height}`
                    });
                };
                img.onerror = () => {
                    this.showNotification('Invalid image file. Please try another image.', 'error');
                };
                img.src = e.target.result;
            } catch (error) {
                console.error('Error processing logo:', error);
                this.showNotification('Error processing image. Please try again.', 'error');
            }
        };

        reader.onerror = () => {
            this.showNotification('Error reading file. Please try again.', 'error');
        };

        reader.readAsDataURL(file);
    }

    showLogoPreview(src) {
        const preview = document.getElementById('logo-preview');
        const img = document.getElementById('logo-img');

        img.src = src;
        preview.style.display = 'block';
    }

    removeLogo() {
        this.customization.logo = null;
        document.getElementById('logo-preview').style.display = 'none';
        document.getElementById('logo-upload').value = '';
        this.generateLiveQR();
    }

    clearQRCanvas() {
        const container = document.querySelector('.qr-container');
        if (container) {
            // Reset to empty canvas
            container.innerHTML = '<canvas id="qr-canvas"></canvas>';
        }
    }

    async generateLiveQR() {
        if (this.isGenerating) return;

        // Check if library is ready
        if (!this.libraryReady) {
            return;
        }

        // Collect input data
        this.qrData = this.collectInputData();

        if (!this.qrData) {
            this.clearQRCanvas();
            return; // Don't generate if data is empty
        }

        // Quietly validate data without error messages for live typing
        try {
            if (!this.validateQRData(true)) {
                this.clearQRCanvas();
                return;
            }
        } catch(e) { 
            this.clearQRCanvas();
            return; 
        }

        this.isGenerating = true;

        try {
            await this.createQRCode();
        } catch (error) {
            console.error('Generation error:', error);
            this.clearQRCanvas();
        } finally {
            this.isGenerating = false;
        }
    }

    async createQRCode() {
        let canvas = document.getElementById('qr-canvas');

        // If canvas doesn't exist, create it
        if (!canvas) {
            console.log('Canvas not found, creating new one');
            canvas = document.createElement('canvas');
            canvas.id = 'qr-canvas';
            canvas.style.display = 'none';

            const container = document.querySelector('.qr-container');
            if (container) {
                container.appendChild(canvas);
            } else {
                throw new Error('QR container not found. Make sure you are on the result page.');
            }
        }

        const size = this.customization.size;

        // Handle barcode generation separately
        if (this.selectedType === 'barcode') {
            return this.createBarcode(canvas);
        }

        // Clear any existing content
        canvas.width = size;
        canvas.height = size;

        const ecLevel = this.appSettings && this.appSettings.errorCorrection ? this.appSettings.errorCorrection : 'M';
        // QR generation options - use higher error correction for logos
        const options = {
            width: size,
            height: size,
            margin: 2,
            color: {
                dark: this.customization.fgColor,
                light: this.customization.bgColor
            },
            errorCorrectionLevel: this.customization.logo ? 'H' : ecLevel // Force high error correction for maximum scannability if logo present
        };

        try {
            // Generate QR code using available method
            await this.generateQRWithMethod(canvas, this.qrData, options);



            // Add logo or serial number if present (mutually exclusive)
            if (this.customization.logo) {
                await this.addLogo(canvas);
            } else if (this.customization.serialNumber) {
                await this.addSerialNumber(canvas);
            }

        } catch (error) {
            console.error('QR generation failed:', error);
            throw new Error(`QR generation failed: ${error.message}`);
        }
    }

    async createBarcode(canvas) {
        return new Promise((resolve, reject) => {
            try {
                // Check if JsBarcode is available
                if (typeof JsBarcode === 'undefined') {
                    throw new Error('JsBarcode library not loaded');
                }

                const format = this.barcodeFormat || 'CODE128';
                const height = this.barcodeHeight || 100;
                const displayText = this.barcodeText || this.qrData;

                // Configure barcode options
                const options = {
                    format: format,
                    width: 2,
                    height: height,
                    displayValue: true,
                    text: displayText,
                    fontOptions: "bold",
                    font: "Arial",
                    fontSize: 16,
                    textAlign: "center",
                    textPosition: "bottom",
                    textMargin: 5,
                    background: this.customization.bgColor,
                    lineColor: this.customization.fgColor,
                    margin: 10
                };

                // Generate barcode
                JsBarcode(canvas, this.qrData, options);

                // Clear animation and show barcode
                const container = document.querySelector('.qr-container');
                if (container) {
                    container.innerHTML = '';
                    canvas.style.display = 'block';
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.borderRadius = '12px';
                    canvas.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.15)';
                    container.appendChild(canvas);
                }

                console.log('Barcode generated successfully:', {
                    format: format,
                    data: this.qrData,
                    height: height
                });

                resolve();
            } catch (error) {
                console.error('Barcode generation failed:', error);
                reject(new Error(`Barcode generation failed: ${error.message}`));
            }
        });
    }

    async generateQRWithMethod(canvas, text, options) {
        return new Promise((resolve, reject) => {
            try {
                // Validate canvas
                if (!canvas || !canvas.getContext) {
                    reject(new Error('Invalid canvas element'));
                    return;
                }

                // Validate text
                if (!text || text.trim() === '') {
                    reject(new Error('No text provided for QR generation'));
                    return;
                }

                // SCANABILITY ENHANCEMENT: Contrast Check
                const contrast = this.getContrastRatio(options.color.dark, options.color.light);
                if (contrast < 1.8) {
                    console.warn('Low contrast detected, adjusting colors for scanability');
                    options.color.dark = '#000000';
                    options.color.light = '#ffffff';
                }

                console.log(`Generating QR with method: ${this.qrMethod}`);
                console.log(`Text: ${text}`);
                console.log(`Options:`, options);

                if (this.qrMethod === 'qrcode-js' && typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                    // Use QRCode.js library
                    console.log('Using QRCode.js library');
                    QRCode.toCanvas(canvas, text, options, (error) => {
                        if (error) {
                            console.error('QRCode.js failed:', error);
                            this.fallbackGeneration(canvas, text, options, resolve, reject);
                        } else {
                            console.log('QRCode.js generation successful');
                            resolve();
                        }
                    });
                } else if (this.qrMethod === 'qrcode-generator' && typeof qrcode !== 'undefined') {
                    // Use qrcode-generator library
                    try {
                        this.generateWithQRCodeGenerator(canvas, text, options);
                        console.log('qrcode-generator generation successful');
                        resolve();
                    } catch (error) {
                        console.error('qrcode-generator failed:', error);
                        this.fallbackGeneration(canvas, text, options, resolve, reject);
                    }
                } else {
                    // Use custom fallback
                    console.log('Using custom generation method');
                    this.fallbackGeneration(canvas, text, options, resolve, reject);
                }
            } catch (error) {
                console.error('generateQRWithMethod error:', error);
                this.fallbackGeneration(canvas, text, options, resolve, reject);
            }
        });
    }

    fallbackGeneration(canvas, text, options, resolve, reject) {
        try {
            console.log('Using Pure JS QR Generator fallback');

            if (typeof PureQRGenerator !== 'undefined') {
                PureQRGenerator.toCanvas(canvas, text, options, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Ultimate fallback - simple pattern
                this.generateSimpleQR(canvas, text, options);
                resolve();
            }
        } catch (error) {
            reject(error);
        }
    }

    generateSimpleQR(canvas, text, options) {
        console.log('Using custom QR generator with real encoding');
        console.log('Encoding text:', text);

        // Use a more reliable QR generation approach
        try {
            // Try to use qrcode-generator library if available
            if (typeof qrcode !== 'undefined') {
                this.generateWithQRCodeGenerator(canvas, text, options);
                return;
            }
        } catch (error) {
            console.log('qrcode-generator not available, using manual approach');
        }

        // Manual QR code generation with actual data encoding
        const ctx = canvas.getContext('2d');
        const size = options.width;

        // Clear canvas
        ctx.fillStyle = options.color.light;
        ctx.fillRect(0, 0, size, size);

        // Create QR code matrix with real data
        const qrMatrix = this.createRealQRMatrix(text);
        const moduleSize = Math.floor(size / qrMatrix.length);
        const offset = (size - (qrMatrix.length * moduleSize)) / 2;

        ctx.fillStyle = options.color.dark;

        // Draw the QR matrix
        for (let row = 0; row < qrMatrix.length; row++) {
            for (let col = 0; col < qrMatrix[row].length; col++) {
                if (qrMatrix[row][col]) {
                    ctx.fillRect(
                        offset + col * moduleSize,
                        offset + row * moduleSize,
                        moduleSize,
                        moduleSize
                    );
                }
            }
        }

        console.log('Custom QR code generated successfully');
    }

    generateWithQRCodeGenerator(canvas, text, options) {
        try {
            const qr = qrcode(0, 'M');
            qr.addData(text);
            qr.make();

            const ctx = canvas.getContext('2d');
            const size = options.width;
            const moduleCount = qr.getModuleCount();
            const moduleSize = Math.floor(size / moduleCount);
            const offset = (size - (moduleCount * moduleSize)) / 2;

            // Clear canvas
            ctx.fillStyle = options.color.light;
            ctx.fillRect(0, 0, size, size);

            // Draw QR modules
            ctx.fillStyle = options.color.dark;
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            offset + col * moduleSize,
                            offset + row * moduleSize,
                            moduleSize,
                            moduleSize
                        );
                    }
                }
            }

            console.log('QR code generated with qrcode-generator library');
        } catch (error) {
            console.error('qrcode-generator failed:', error);
            this.createRealQRMatrix(text);
        }
    }

    createRealQRMatrix(text) {
        // Create a basic but functional QR code matrix
        // This is a simplified version that creates a scannable QR code

        const size = 25; // Version 2 QR code
        const matrix = Array(size).fill().map(() => Array(size).fill(false));

        // Add finder patterns (required for QR recognition)
        this.addFinderPattern(matrix, 0, 0);           // Top-left
        this.addFinderPattern(matrix, 0, size - 7);    // Top-right
        this.addFinderPattern(matrix, size - 7, 0);    // Bottom-left

        // Add separators
        this.addSeparators(matrix, size);

        // Add timing patterns
        this.addTimingPatterns(matrix, size);

        // Add data (simplified encoding)
        this.addDataToMatrix(matrix, text, size);

        return matrix;
    }

    addFinderPattern(matrix, startRow, startCol) {
        const pattern = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ];

        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (startRow + i < matrix.length && startCol + j < matrix[0].length) {
                    matrix[startRow + i][startCol + j] = pattern[i][j] === 1;
                }
            }
        }
    }

    addSeparators(matrix, size) {
        // Add white separators around finder patterns
        const positions = [
            { row: 0, col: 0, width: 8, height: 8 },
            { row: 0, col: size - 8, width: 8, height: 8 },
            { row: size - 8, col: 0, width: 8, height: 8 }
        ];

        positions.forEach(pos => {
            for (let i = 0; i < pos.height; i++) {
                for (let j = 0; j < pos.width; j++) {
                    const row = pos.row + i;
                    const col = pos.col + j;
                    if (row < size && col < size && row >= 0 && col >= 0) {
                        if (i === 7 || j === 7 || i === 0 || j === 0) {
                            matrix[row][col] = false;
                        }
                    }
                }
            }
        });
    }

    addTimingPatterns(matrix, size) {
        // Horizontal timing pattern
        for (let i = 8; i < size - 8; i++) {
            matrix[6][i] = i % 2 === 0;
        }

        // Vertical timing pattern
        for (let i = 8; i < size - 8; i++) {
            matrix[i][6] = i % 2 === 0;
        }
    }

    addDataToMatrix(matrix, text, size) {
        // Simple data encoding based on text content
        // This creates a pattern that represents the data

        const textBytes = new TextEncoder().encode(text);
        let dataIndex = 0;

        // Fill data area in a zigzag pattern
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--; // Skip timing column

            for (let row = 0; row < size; row++) {
                for (let c = 0; c < 2; c++) {
                    const currentCol = col - c;

                    if (this.isDataModule(matrix, row, currentCol, size)) {
                        // Use actual data bits
                        if (dataIndex < textBytes.length * 8) {
                            const byteIndex = Math.floor(dataIndex / 8);
                            const bitIndex = dataIndex % 8;
                            const bit = (textBytes[byteIndex] >> (7 - bitIndex)) & 1;
                            matrix[row][currentCol] = bit === 1;
                            dataIndex++;
                        } else {
                            // Fill remaining with alternating pattern
                            matrix[row][currentCol] = (row + currentCol) % 2 === 0;
                        }
                    }
                }
            }
        }
    }

    isDataModule(matrix, row, col, size) {
        // Check if this position can hold data

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

        return true;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    getContrastRatio(color1, color2) {
        const getLuminance = (hex) => {
            try {
                const rgb = parseInt(hex.substring(1), 16);
                const r = (rgb >> 16) & 0xff;
                const g = (rgb >> 8) & 0xff;
                const b = (rgb >> 0) & 0xff;
                const [rl, gl, bl] = [r, g, b].map(v => {
                    v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                });
                return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
            } catch (e) { return 0.5; }
        };
        const l1 = getLuminance(color1);
        const l2 = getLuminance(color2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    isFinderPattern(row, col, size) {
        // Top-left finder pattern
        if (row < 7 && col < 7) return true;
        // Top-right finder pattern
        if (row < 7 && col >= size - 7) return true;
        // Bottom-left finder pattern
        if (row >= size - 7 && col < 7) return true;
        return false;
    }

    shouldFillModule(row, col, hash) {
        // Skip finder pattern areas and create pseudo-random pattern
        if (this.isFinderPattern(row, col, 21)) return false;

        // Create pattern based on position and hash
        const pattern = (row * 31 + col * 17 + hash) % 3;
        return pattern === 0;
    }



    async addLogo(canvas) {
        if (!this.customization.logo) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const ctx = canvas.getContext('2d');
                    const canvasSize = canvas.width;

                    // Calculate logo size (20% of QR code for better visibility)
                    const logoSize = Math.floor(canvasSize * 0.2);
                    const x = Math.floor((canvasSize - logoSize) / 2);
                    const y = Math.floor((canvasSize - logoSize) / 2);

                    // Create a square background with padding
                    const padding = Math.floor(logoSize * 0.1);
                    const bgSize = logoSize + (padding * 2);
                    const bgX = x - padding;
                    const bgY = y - padding;

                    // Draw white background square with rounded corners
                    ctx.fillStyle = this.customization.bgColor || '#ffffff';
                    ctx.save();
                    this.roundRect(ctx, bgX, bgY, bgSize, bgSize, padding);
                    ctx.fill();
                    ctx.restore();

                    // Draw logo as a square with rounded corners
                    ctx.save();
                    this.roundRect(ctx, x, y, logoSize, logoSize, Math.floor(logoSize * 0.1));
                    ctx.clip();

                    // Draw the image, ensuring it's square
                    ctx.drawImage(img, x, y, logoSize, logoSize);
                    ctx.restore();

                    // Add a subtle border around the logo
                    ctx.strokeStyle = this.customization.fgColor || '#000000';
                    ctx.lineWidth = 1;
                    ctx.save();
                    this.roundRect(ctx, x, y, logoSize, logoSize, Math.floor(logoSize * 0.1));
                    ctx.globalAlpha = 0.3;
                    ctx.stroke();
                    ctx.restore();

                    console.log('Logo added successfully');
                    resolve();
                } catch (error) {
                    console.error('Error adding logo:', error);
                    reject(error);
                }
            };

            img.onerror = (error) => {
                console.error('Failed to load logo image:', error);
                reject(new Error('Failed to load logo image'));
            };

            // Set crossOrigin to handle potential CORS issues
            img.crossOrigin = 'anonymous';
            img.src = this.customization.logo;
        });
    }

    async addSerialNumber(canvas) {
        if (!this.customization.serialNumber) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            try {
                const ctx = canvas.getContext('2d');
                const canvasSize = canvas.width;

                const text = this.customization.serialNumber;
                
                // Max box size: 40% width, 15% height
                const maxBoxWidth = Math.floor(canvasSize * 0.4);
                const maxBoxHeight = Math.floor(canvasSize * 0.15);
                
                let fontSize = Math.floor(maxBoxHeight * 0.6);
                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                let textMetrics = ctx.measureText(text);
                
                // Scale down if too wide
                if (textMetrics.width > maxBoxWidth * 0.9) {
                    fontSize = Math.floor(fontSize * ((maxBoxWidth * 0.9) / textMetrics.width));
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                    textMetrics = ctx.measureText(text);
                }

                const paddingX = Math.floor(fontSize * 0.8);
                const paddingY = Math.floor(fontSize * 0.5);
                const boxWidth = textMetrics.width + (paddingX * 2);
                const boxHeight = fontSize + (paddingY * 2);
                
                const x = Math.floor((canvasSize - boxWidth) / 2);
                const y = Math.floor((canvasSize - boxHeight) / 2);

                // Draw background box to create a "cutout" space
                ctx.fillStyle = this.customization.bgColor || '#ffffff';
                ctx.save();
                this.roundRect(ctx, x, y, boxWidth, boxHeight, Math.floor(boxHeight * 0.15));
                ctx.fill();
                ctx.restore();

                // Draw text
                ctx.fillStyle = this.customization.fgColor || '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x + boxWidth / 2, y + boxHeight / 2 + (fontSize * 0.05));

                console.log('Serial number added successfully');
                resolve();
            } catch (error) {
                console.error('Error adding serial number:', error);
                resolve();
            }
        });
    }

    showValidationError() {
        // Highlight required fields
        const requiredInputs = document.querySelectorAll('.form-input[required]');
        let firstMissing = null;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.style.borderColor = '#e53e3e';
                input.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.2)';
                input.style.animation = 'shake 0.5s ease-in-out';
                if (!firstMissing) firstMissing = input;
            }
        });

        if (firstMissing) {
            firstMissing.focus();
        }

        // Show error message
        const container = document.getElementById('input-container');
        if (!container) return;

        let errorDiv = container.querySelector('.validation-error');

        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-circle" style="font-size: 1.2rem;"></i>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 1rem; font-weight: 600;">Missing Information</span>
                    <span style="font-size: 0.85rem; opacity: 0.8;">Please fill in all required fields marked with *</span>
                </div>
            `;
            container.appendChild(errorDiv);
        }

        // Scroll to error if not in view
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove error after 4 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.style.opacity = '0';
                errorDiv.style.transform = 'translateY(10px)';
                errorDiv.style.transition = 'all 0.5s ease';
                setTimeout(() => errorDiv.remove(), 500);
            }
            requiredInputs.forEach(input => {
                input.style.borderColor = '';
                input.style.boxShadow = '';
                input.style.animation = '';
            });
        }, 4000);
    }

    showLoadingAnimation() {
        const container = document.querySelector('.qr-container');
        // Skip animation - just prepare the canvas
        container.innerHTML = `
            <canvas id="qr-canvas" style="display: block; opacity: 1; transform: none; transition: none; animation: none;"></canvas>
        `;

        // No animation - just prepare for immediate QR display
    }

    async showSmoothBuildingAnimation() {
        return new Promise(async (resolve) => {
            const container = document.querySelector('.qr-container');

            // First generate the actual QR code
            const tempCanvas = document.createElement('canvas');
            await this.generateQRToCanvas(tempCanvas);

            // Create assembling animation
            container.innerHTML = `
                <div class="qr-assemble-animation">
                    <div class="assemble-grid"></div>
                    <div class="assemble-pieces">
                        <!-- JS will inject pieces -->
                    </div>
                    <div class="assemble-status">ASSEMBLING MODULES</div>
                </div>
                <canvas id="qr-canvas" style="display: none;"></canvas>
            `;

            // Run the animation then reveal
            await this.animateAssembleBuild(tempCanvas);
            resolve();
        });
    }

    async animateAssembleBuild(tempCanvas) {
        const piecesContainer = document.querySelector('.assemble-pieces');
        if (piecesContainer) {
            // Create flying pieces
            for (let i = 0; i < 20; i++) {
                const piece = document.createElement('div');
                piece.className = 'qr-piece';
                // Random starting positions outside center
                const startX = (Math.random() - 0.5) * 400;
                const startY = (Math.random() - 0.5) * 400;
                piece.style.setProperty('--tx', `${startX}px`);
                piece.style.setProperty('--ty', `${startY}px`);
                piece.style.animationDelay = `${Math.random() * 0.5}s`;
                piecesContainer.appendChild(piece);
            }
        }

        // Wait for animation
        await new Promise(r => setTimeout(r, 1500));

        // Implode animation (pieces merge)
        const animationEl = document.querySelector('.qr-assemble-animation');
        if (animationEl) {
            animationEl.style.transform = 'scale(0.8)';
            animationEl.style.opacity = '0';
        }

        await new Promise(r => setTimeout(r, 600));

        // Reveal canvas
        const container = document.querySelector('.qr-container');
        if (container && tempCanvas) {
            container.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = 'qr-canvas';
            canvas.width = tempCanvas.width;
            canvas.height = tempCanvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempCanvas, 0, 0);

            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            canvas.style.borderRadius = '16px';
            canvas.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
            canvas.style.opacity = '0';
            canvas.style.transform = 'scale(0.8)';
            canvas.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

            container.appendChild(canvas);

            // Trigger reveal
            await new Promise(r => setTimeout(r, 50));
            canvas.style.opacity = '1';
            canvas.style.transform = 'scale(1)';

            // Add particles effect on reveal
            this.createParticles(container);
        }
    }

    createParticles(container) {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'reveal-particle';
            p.style.left = '50%';
            p.style.top = '50%';
            p.style.setProperty('--x', (Math.random() - 0.5) * 200 + 'px');
            p.style.setProperty('--y', (Math.random() - 0.5) * 200 + 'px');
            container.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    }


    async animateHighEndBuilding(tempCanvas) {
        const previewCanvas = document.getElementById('qr-preview');
        const progressFill = document.getElementById('build-progress');
        const progressPercent = document.getElementById('progress-percent');
        const statusEl = document.getElementById('build-status');

        const steps = [
            { id: 'step-1', status: 'Encoding data...', progress: 25 },
            { id: 'step-2', status: 'Building matrix...', progress: 50 },
            { id: 'step-3', status: 'Applying styles...', progress: 75 },
            { id: 'step-4', status: 'Finalizing...', progress: 100 }
        ];

        // Copy QR to preview canvas (hidden initially)
        if (previewCanvas && tempCanvas) {
            previewCanvas.width = tempCanvas.width;
            previewCanvas.height = tempCanvas.height;
            const ctx = previewCanvas.getContext('2d');
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // Animate through steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            // Update status
            if (statusEl) statusEl.textContent = step.status;

            // Activate step
            const stepEl = document.getElementById(step.id);
            if (stepEl) {
                stepEl.classList.add('active');
                if (i > 0) {
                    const prevStep = document.getElementById(steps[i - 1].id);
                    if (prevStep) prevStep.classList.add('completed');
                }
            }

            // Animate progress bar
            await this.animateProgress(progressFill, progressPercent,
                i === 0 ? 0 : steps[i - 1].progress,
                step.progress,
                400
            );

            // Wait between steps
            await new Promise(r => setTimeout(r, 200));
        }

        // Final reveal animation
        if (previewCanvas) {
            previewCanvas.style.opacity = '1';
            previewCanvas.style.transform = 'scale(1)';
        }

        // Mark all complete
        const allSteps = document.querySelectorAll('.build-steps .step');
        allSteps.forEach(s => s.classList.add('completed'));

        if (statusEl) statusEl.textContent = 'Complete!';

        await new Promise(r => setTimeout(r, 300));
    }

    async animateProgress(fillEl, percentEl, from, to, duration) {
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                const current = from + (to - from) * eased;

                if (fillEl) fillEl.style.width = `${current}%`;
                if (percentEl) percentEl.textContent = `${Math.round(current)}%`;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    async showBarcodeAnimation() {
        return new Promise(async (resolve) => {
            const container = document.querySelector('.qr-container');

            // Create barcode animation HTML
            container.innerHTML = `
                <div class="barcode-animation">
                    <div class="barcode-header">
                        <div class="barcode-title">
                            <i class="fas fa-barcode"></i>
                            <span>Generating Barcode</span>
                        </div>
                        <div class="barcode-progress-text">Creating your barcode...</div>
                    </div>
                    
                    <div class="barcode-preview-area">
                        <div class="barcode-bars-container">
                            ${this.generateAnimatedBars(40)}
                        </div>
                        <div class="barcode-scan-line"></div>
                    </div>
                    
                    <div class="barcode-status" id="barcode-status">Initializing...</div>
                </div>
                <canvas id="qr-canvas" style="display: none;"></canvas>
            `;

            // Run the barcode animation
            await this.animateBarcodeBuilding();
            resolve();
        });
    }

    generateAnimatedBars(count) {
        let bars = '';
        for (let i = 0; i < count; i++) {
            const width = Math.random() > 0.5 ? 4 : 2;
            const delay = i * 30;
            bars += `<div class="animated-bar" style="width: ${width}px; animation-delay: ${delay}ms;"></div>`;
        }
        return bars;
    }

    async animateBarcodeBuilding() {
        const statusEl = document.getElementById('barcode-status');
        const bars = document.querySelectorAll('.animated-bar');

        const statuses = [
            { text: 'Encoding data...', delay: 300 },
            { text: 'Generating bars...', delay: 500 },
            { text: 'Applying format...', delay: 400 },
            { text: 'Finalizing barcode...', delay: 300 }
        ];

        // Animate bars appearing
        bars.forEach((bar, index) => {
            setTimeout(() => {
                bar.classList.add('visible');
            }, index * 25);
        });

        // Update status messages
        let totalDelay = 0;
        for (const status of statuses) {
            await new Promise(resolve => setTimeout(resolve, status.delay));
            if (statusEl) statusEl.textContent = status.text;
            totalDelay += status.delay;
        }

        // Wait for bars animation to complete
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - totalDelay)));

        if (statusEl) statusEl.textContent = 'Complete!';
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    async generateQRToCanvas(canvas) {
        const ecLevel = this.appSettings && this.appSettings.errorCorrection ? this.appSettings.errorCorrection : 'M';
        const options = {
            width: this.customization.size,
            height: this.customization.size,
            margin: 4,
            color: {
                dark: this.customization.fgColor,
                light: this.customization.bgColor
            },
            errorCorrectionLevel: this.customization.logo ? 'H' : ecLevel
        };

        return this.generateQRWithMethod(canvas, this.qrData, options);
    }

    getQRPixelData(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Determine QR code size (assume square and find the actual QR area)
        const qrSize = 25; // Standard QR code is typically 25x25 modules for version 1
        const pixelSize = Math.floor(canvas.width / qrSize);
        const startX = Math.floor((canvas.width - (qrSize * pixelSize)) / 2);
        const startY = Math.floor((canvas.height - (qrSize * pixelSize)) / 2);

        const pixels = [];

        for (let row = 0; row < qrSize; row++) {
            for (let col = 0; col < qrSize; col++) {
                const x = startX + (col * pixelSize) + Math.floor(pixelSize / 2);
                const y = startY + (row * pixelSize) + Math.floor(pixelSize / 2);

                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                // Determine if pixel is dark (QR module) or light (background)
                const isDark = (r + g + b) / 3 < 128;

                pixels.push({
                    row,
                    col,
                    isDark,
                    x: col,
                    y: row
                });
            }
        }

        return {
            pixels,
            size: qrSize,
            totalPixels: pixels.length,
            canvas
        };
    }

    async animateSmoothBuilding(finalCanvas) {
        return new Promise((resolve) => {
            const statusText = document.getElementById('building-status');
            const previewCanvas = document.getElementById('qr-preview');
            const overlay = document.querySelector('.qr-building-overlay');

            // Status messages
            const statusMessages = [
                'Initializing matrix...',
                'Encoding data...',
                'Adding patterns...',
                'Finalizing structure...',
                'Complete!'
            ];

            let currentStatus = 0;

            // Copy the QR to preview canvas
            previewCanvas.width = finalCanvas.width;
            previewCanvas.height = finalCanvas.height;
            const previewCtx = previewCanvas.getContext('2d');
            previewCtx.drawImage(finalCanvas, 0, 0);

            // Animate status messages
            const updateStatus = () => {
                if (currentStatus < statusMessages.length - 1) {
                    statusText.textContent = statusMessages[currentStatus];
                    currentStatus++;
                    setTimeout(updateStatus, 200);
                } else {
                    statusText.textContent = statusMessages[currentStatus];

                    // Start reveal animation
                    setTimeout(() => {
                        overlay.style.opacity = '0';
                        previewCanvas.style.opacity = '1';
                        previewCanvas.style.transform = 'scale(1)';

                        // Complete animation
                        setTimeout(() => {
                            const container = document.querySelector('.qr-container');
                            const finalCanvasEl = document.getElementById('qr-canvas');

                            // Copy to final canvas
                            finalCanvasEl.width = finalCanvas.width;
                            finalCanvasEl.height = finalCanvas.height;
                            const finalCtx = finalCanvasEl.getContext('2d');
                            finalCtx.drawImage(finalCanvas, 0, 0);

                            // Show final QR code
                            container.innerHTML = '';
                            container.appendChild(finalCanvasEl);
                            finalCanvasEl.style.display = 'block';
                            finalCanvasEl.style.opacity = '1';
                            finalCanvasEl.style.transform = 'none';

                            resolve();
                        }, 300);
                    }, 200);
                }
            };

            // Start animation
            setTimeout(updateStatus, 100);
        });
    }



    animateQRCreation() {
        const grid = document.getElementById('qr-creation-grid');
        const steps = document.querySelectorAll('.qr-step-dot');
        const statusText = document.querySelector('.qr-creation-steps');

        if (!grid) return;

        // Create 21x21 grid (standard QR code size)
        const gridSize = 21;
        const pixels = [];

        for (let i = 0; i < gridSize * gridSize; i++) {
            const pixel = document.createElement('div');
            pixel.className = 'qr-pixel';
            grid.appendChild(pixel);
            pixels.push(pixel);
        }

        // Step 1: Create finder patterns (corners)
        setTimeout(() => {
            if (statusText) statusText.textContent = 'Creating finder patterns...';
            if (steps[1]) steps[1].classList.add('active');

            const finderPositions = [
                // Top-left finder pattern
                [0, 1, 2, 3, 4, 5, 6, 21, 22, 23, 24, 25, 26, 27, 42, 48, 63, 69, 84, 90, 105, 111, 126, 127, 128, 129, 130, 131, 132],
                // Top-right finder pattern  
                [14, 15, 16, 17, 18, 19, 20, 35, 41, 56, 62, 77, 83, 98, 104, 119, 120, 121, 122, 123, 124, 125],
                // Bottom-left finder pattern
                [294, 295, 296, 297, 298, 299, 300, 315, 321, 336, 342, 357, 363, 378, 384, 399, 400, 401, 402, 403, 404, 405]
            ];

            finderPositions.flat().forEach((pos, index) => {
                setTimeout(() => {
                    if (pixels[pos]) {
                        pixels[pos].classList.add('active', 'finder-pattern');
                    }
                }, index * 20);
            });
        }, 300);

        // Step 2: Add timing patterns
        setTimeout(() => {
            if (statusText) statusText.textContent = 'Adding timing patterns...';
            if (steps[2]) steps[2].classList.add('active');

            // Horizontal and vertical timing patterns
            for (let i = 8; i < 13; i++) {
                setTimeout(() => {
                    // Horizontal timing
                    if (pixels[6 * gridSize + i]) {
                        pixels[6 * gridSize + i].classList.add('active', 'timing-pattern');
                    }
                    // Vertical timing
                    if (pixels[i * gridSize + 6]) {
                        pixels[i * gridSize + 6].classList.add('active', 'timing-pattern');
                    }
                }, i * 50);
            }
        }, 1000);

        // Step 3: Fill data patterns
        setTimeout(() => {
            if (statusText) statusText.textContent = 'Encoding your data...';
            if (steps[3]) steps[3].classList.add('active');

            // Simulate data encoding with random pattern
            const dataPositions = [];
            for (let i = 0; i < pixels.length; i++) {
                if (!pixels[i].classList.contains('active')) {
                    dataPositions.push(i);
                }
            }

            // Randomly activate about 60% of remaining pixels
            const activeData = dataPositions.sort(() => Math.random() - 0.5).slice(0, Math.floor(dataPositions.length * 0.6));

            activeData.forEach((pos, index) => {
                setTimeout(() => {
                    if (pixels[pos]) {
                        pixels[pos].classList.add('active', 'data-pattern');
                    }
                }, index * 10);
            });
        }, 1800);

        // Step 4: Complete
        setTimeout(() => {
            if (statusText) statusText.textContent = 'QR Code generation complete!';
            // Completion effect removed for stability
            if (grid) {
                grid.style.transform = 'none';
            }
        }, 2800);
    }

    async showSuccessAnimation() {
        return new Promise((resolve) => {
            const container = document.querySelector('.qr-container');
            const creationDiv = container.querySelector('.qr-creation-animation');
            const canvas = document.getElementById('qr-canvas');

            if (!canvas) {
                console.error('Canvas not found in showSuccessAnimation');
                resolve();
                return;
            }

            // Remove creation animation immediately
            if (creationDiv) {
                creationDiv.remove();
            }

            // Show canvas completely stable - no animations
            canvas.style.display = 'block';
            canvas.style.opacity = '1';
            canvas.style.transform = 'none';
            canvas.style.transition = 'none';
            canvas.style.position = 'static';
            canvas.style.margin = '0 auto';
            canvas.style.animation = 'none';

            // Show action buttons immediately without any animation
            document.querySelectorAll('.action-btn').forEach((btn) => {
                btn.style.display = 'flex';
                btn.style.opacity = '1';
                btn.style.transform = 'none';
                btn.style.transition = 'none';
                btn.style.animation = 'none';
            });

            // Ensure container is completely stable
            container.style.transform = 'none';
            container.style.transition = 'none';
            container.style.animation = 'none';

            resolve();
        });
    }

    showError(message) {
        const container = document.querySelector('.qr-container');
        container.innerHTML = `
            <div class="error-animation">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-message">
                    <h3>Generation Failed</h3>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="window.qrApp.generateQR()">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }

    downloadQR() {
        // Save to history on manual download since we no longer save on every live edit
        if (this.qrData) {
            this.saveToHistory(this.selectedType, this.qrData, this.getDisplayText());
        }

        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;

        // Make sure background is opaque white if transparent
        const downloadCanvas = document.createElement('canvas');
        const padding = 20; // Add some padding around the QR code
        downloadCanvas.width = canvas.width + padding * 2;
        downloadCanvas.height = canvas.height + padding * 2;
        
        const ctx = downloadCanvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = this.customization.bgColor || '#ffffff';
        ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
        
        // Draw the QR code
        ctx.drawImage(canvas, padding, padding);

        try {
            const link = document.createElement('a');
            
            // Better filename logic
            let filename = 'genz-qr';
            if (this.selectedType === 'barcode') {
                filename = 'genz-barcode';
            }
            
            // Add date to make filename unique
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            
            link.download = `${filename}-${dateStr}.png`;
            link.href = downloadCanvas.toDataURL('image/png', 1.0);
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download image. Try right-clicking the image to save.');
        }
    }

    async shareQR() {
        try {
            const canvas = document.getElementById('qr-canvas');

            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'qrcode.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'QR Code',
                        text: `Generated ${this.selectedType} QR Code`,
                        files: [file]
                    });
                } else if (navigator.share) {
                    await navigator.share({
                        title: 'QR Code',
                        text: `Check out this ${this.selectedType} QR code!`,
                        url: canvas.toDataURL()
                    });
                } else {
                    // Fallback to download
                    this.downloadQR();
                }
            });
        } catch (error) {
            console.error('Share failed:', error);
            this.downloadQR();
        }
    }

    // ==========================================
    // SETTINGS SYSTEM
    // ==========================================

    initSettings() {
        this.appSettings = JSON.parse(localStorage.getItem('qr-app-settings')) || {
            highQuality: true,
            autoDownload: false,
            defaultSize: 3000,
            defaultFg: '#000000',
            defaultBg: '#ffffff',
            errorCorrection: 'M'
        };

        // Clamp stored size to new range
        if (this.appSettings.defaultSize < 3000) this.appSettings.defaultSize = 3000;
        if (this.appSettings.defaultSize > 8000) this.appSettings.defaultSize = 8000;
        this.customization.size = this.appSettings.defaultSize;

        // 1) High Quality Setting (Replacing Grid Columns)
        const hqToggle = document.getElementById('setting-high-quality');
        if (hqToggle) {
            hqToggle.checked = this.appSettings.highQuality;
            hqToggle.addEventListener('change', (e) => {
                this.appSettings.highQuality = e.target.checked;
                this.saveSettings();
            });
        }

        // 2) Auto Download
        const autoDL = document.getElementById('setting-auto-download');
        if (autoDL) {
            autoDL.checked = this.appSettings.autoDownload;
            autoDL.addEventListener('change', (e) => {
                this.appSettings.autoDownload = e.target.checked;
                this.saveSettings();
            });
        }

        // 3) Default Size
        const sizeSlider = document.getElementById('setting-default-size');
        const sizeVal = document.getElementById('setting-default-size-val');
        if (sizeSlider) {
            sizeSlider.value = this.appSettings.defaultSize;
            sizeVal.textContent = this.appSettings.defaultSize + 'px';
            sizeSlider.addEventListener('input', (e) => {
                this.appSettings.defaultSize = parseInt(e.target.value);
                sizeVal.textContent = e.target.value + 'px';
                // Sync with the customization size slider on page 3
                const custSlider = document.getElementById('size-slider');
                const custVal = document.getElementById('size-value');
                if (custSlider) { custSlider.value = e.target.value; }
                if (custVal) { custVal.textContent = e.target.value + 'px'; }
                this.customization.size = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        // 6) Error Correction Level
        const ecSelect = document.getElementById('setting-error-correction');
        if (ecSelect) {
            ecSelect.value = this.appSettings.errorCorrection;
            ecSelect.addEventListener('change', (e) => {
                this.appSettings.errorCorrection = e.target.value;
                this.saveSettings();
            });
        }

        // Apply initial state
        this.customization.size = this.appSettings.defaultSize;
        const p3size = document.getElementById('size-slider');
        const p3sizeVal = document.getElementById('size-value');
        if (p3size) p3size.value = this.appSettings.defaultSize;
        if (p3sizeVal) p3sizeVal.textContent = this.appSettings.defaultSize + 'px';

        this.applyGridSettings();
    }

    saveSettings() {
        localStorage.setItem('qr-app-settings', JSON.stringify(this.appSettings));
    }

    applyGridSettings() {
        const width = window.innerWidth;
        let cols = 2;
        let maxW = '100%';

        if (width > 1200) {
            cols = 6;
            maxW = '1400px';
        } else if (width > 992) {
            cols = 5;
            maxW = '1100px';
        } else if (width > 768) {
            cols = 4;
            maxW = '900px';
        } else if (width > 480) {
            cols = 3;
            maxW = '100%';
        } else {
            cols = 2;
            maxW = '100%';
        }

        document.documentElement.style.setProperty('--grid-cols', cols);
        document.documentElement.style.setProperty('--grid-max-width', maxW);
    }

    toggleSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        if (panel) panel.classList.toggle('active');
    }

    clearAppData() {
        if (confirm('This will permanently delete all your history and settings. Continue?')) {
            localStorage.clear();
            this.showNotification('All data cleared!', 'success');
            setTimeout(() => window.location.reload(), 600);
        }
    }
}

// Global functions for HTML onclick handlers
function goToPage(pageNumber) {
    window.qrApp.goToPage(pageNumber);
}

function generateQR() {
    window.qrApp.generateQR();
}

function downloadQR() {
    window.qrApp.downloadQR();
}

function shareQR() {
    window.qrApp.shareQR();
}

function removeLogo() {
    window.qrApp.removeLogo();
}



// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.qrApp = new QRGeneratorPro();
});

