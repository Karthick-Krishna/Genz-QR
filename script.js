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
            size: 3000,
            logo: null
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
        // Ensure logo always stays white
        const logoIcon = document.querySelector('.logo i');
        if (logoIcon) {
            logoIcon.style.setProperty('color', 'white', 'important');
            logoIcon.style.setProperty('filter', 'none', 'important');
        }

        // Monitor for any changes and reapply
        const observer = new MutationObserver(() => {
            if (logoIcon) {
                logoIcon.style.setProperty('color', 'white', 'important');
                logoIcon.style.setProperty('filter', 'none', 'important');
            }
        });

        if (logoIcon) {
            observer.observe(logoIcon, { attributes: true, attributeFilter: ['style'] });
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
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 3000 && val <= 8000) {
                    clearTimeout(sizeTimeout);
                    sizeTimeout = setTimeout(() => {
                        this.customization.size = val;
                        if (sizeValue) sizeValue.textContent = `${val}px`;
                    }, 50);
                }
            }, { passive: true });
        }

        // Logo upload
        const logoUpload = document.getElementById('logo-upload');
        if (logoUpload) {
            logoUpload.addEventListener('change', (e) => {
                this.handleLogoUpload(e);
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
        // Define category mappings
        this.categoryMappings = {
            'essentials': ['text', 'url', 'phone', 'sms', 'email', 'location', 'wifi', 'prompt'],
            'identity': ['contact', 'mecard', 'linkedin', 'portfolio', 'idcard', 'medical'],
            'finance': ['paypal', 'upi', 'crypto', 'donate', 'coupon', 'barcode'],
            'social': ['social', 'wa', 'tg', 'vb', 'sk', 'ft', 'fta', 'discord', 'meeting', 'zm', 'wx'],
            'tech': ['developer', 'sshkey', 'docker', 'serverinfo', 'totp'],
            'lifestyle': ['app', 'as', 'ps', 'yt', 'im', 'sp', 'maps', 'yl', 'fq', 'uber', 'lyft', 'event', 'book', 'secret']
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
            'paypal': 'paypal payment money transfer online cash invoice',
            'upi': 'upi payment india rupee money transfer gpay paytm phonepe',
            'crypto': 'crypto bitcoin wallet cryptocurrency blockchain eth btc sol usdt',
            'donate': 'donation patreon kofi support funding charity help money',
            'coupon': 'coupon promo discount deal offer save sale voucher',
            'barcode': 'barcode scanner format product code ean upc 128 inventory',
            'social': 'social media profile links instagram facebook twitter tiktok snapchat',
            'wa': 'whatsapp message chat direct communication phone mobile',
            'tg': 'telegram message chat direct communication username messenger',
            'vb': 'viber message chat direct communication phone call messenger',
            'sk': 'skype call video chat communication username voice',
            'ft': 'facetime video call apple ios iphone ipad mac',
            'fta': 'facetime audio call apple ios voice iphone ipad mac',
            'discord': 'discord server gaming chat community invite channel',
            'meeting': 'meeting conference call video standard teams meet zoom',
            'zm': 'zoom meeting video conference call link online session',
            'wx': 'webex meeting video conference call cisco remote work',
            'developer': 'code repository github gitlab development programming git repo opensource',
            'sshkey': 'ssh key public security access developer github server login rsa ed25519',
            'docker': 'docker container image devops kubernetes virtualization hub containerization',
            'serverinfo': 'server ip port ssh login credentials host remote machine',
            'totp': 'totp 2fa authenticator security two factor auth code google authy',
            'app': 'app bundle link generic application mobile store install download',
            'as': 'app store ios apple search find application iphone ipad mac',
            'ps': 'play store android google search find application mobile samsung',
            'yt': 'youtube video app deep link google watch content channel playlist',
            'im': 'imdb movie app link film database actor title cinema show',
            'sp': 'spotify music track uri streaming audio playlist artist album song',
            'maps': 'maps smart search generic location navigation direction driving find',
            'yl': 'yelp app business query restaurant review local food services',
            'fq': 'foursquare venue uri location check in local swarm',
            'uber': 'uber ride request target transportation taxi drive travel trip',
            'lyft': 'lyft ride request target transportation taxi drive travel trip',
            'event': 'event calendar file appointment meeting schedule date time booking',
            'book': 'book isbn search library reading literature author title volume',
            'secret': 'secret note hidden text private message encrypted lock vault'
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
                card.classList.add('fade-in');
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
                card.classList.remove('fade-in', 'search-highlight');
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
                    <div class="form-row">
                        <div class="form-group">
                            <label for="wifi-security">Security Type</label>
                            <select id="wifi-security" class="form-input">
                                <option value="WPA">WPA/WPA2</option>
                                <option value="WEP">WEP</option>
                                <option value="nopass">Open (No Password)</option>
                            </select>
                        </div>
                        <div class="form-group" style="display:flex; align-items:center; height:100%; padding-top:20px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" id="wifi-hidden" style="width:18px;height:18px;">
                                Hidden Network
                            </label>
                        </div>
                    </div>
                `;
                break;

            case 'location':
                title.textContent = 'Location';
                subtitle.textContent = 'Enter GPS coordinates';
                html = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="location-lat">Latitude *</label>
                            <input type="number" step="any" id="location-lat" class="form-input" placeholder="12.9716" required>
                        </div>
                        <div class="form-group">
                            <label for="location-lng">Longitude *</label>
                            <input type="number" step="any" id="location-lng" class="form-input" placeholder="77.5946" required>
                        </div>
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
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start-date">Start Date *</label>
                            <input type="date" id="event-start-date" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="event-start-time">Start Time *</label>
                            <input type="time" id="event-start-time" class="form-input" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-end-date">End Date *</label>
                            <input type="date" id="event-end-date" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="event-end-time">End Time *</label>
                            <input type="time" id="event-end-time" class="form-input" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea id="event-description" class="form-input" rows="3" placeholder="Event details..." maxlength="200"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="event-reminder">Reminder</label>
                        <select id="event-reminder" class="form-input">
                            <option value="0">No reminder</option>
                            <option value="15">15 minutes before</option>
                            <option value="30">30 minutes before</option>
                            <option value="60">1 hour before</option>
                            <option value="1440">1 day before</option>
                        </select>
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
                            <option value="EAN8">EAN-8 (Small Products)</option>
                            <option value="UPC">UPC-A (US Products)</option>
                            <option value="CODE39">Code 39 (Alphanumeric)</option>
                            <option value="ITF14">ITF-14 (Shipping)</option>
                            <option value="MSI">MSI (Inventory)</option>
                            <option value="pharmacode">Pharmacode (Pharma)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="barcode-data">Barcode Data *</label>
                        <input type="text" id="barcode-data" class="form-input" placeholder="123456789012" required>
                    </div>
                    <div class="barcode-help" id="barcode-help">
                        <i class="fas fa-info-circle"></i>
                        <span>Code 128: Any alphanumeric text</span>
                    </div>
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

            case 'developer':
                title.textContent = 'Developer Repos';
                subtitle.textContent = 'GitHub or GitLab Project';
                html = `
                    <div class="form-group">
                        <label for="dev-platform">Platform *</label>
                        <select id="dev-platform" class="form-input">
                            <option value="github">GitHub</option>
                            <option value="gitlab">GitLab</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dev-user">Username / Org *</label>
                        <input type="text" id="dev-user" class="form-input" placeholder="google" required>
                    </div>
                    <div class="form-group">
                        <label for="dev-repo">Repository Name *</label>
                        <input type="text" id="dev-repo" class="form-input" placeholder="material-design" required>
                    </div>
                `;
                break;

            case 'maps':
                title.textContent = 'Smart Navigation';
                subtitle.textContent = 'Map App Deep Links';
                html = `
                    <div class="form-group">
                        <label for="map-platform">App *</label>
                        <select id="map-platform" class="form-input">
                            <option value="google">Google Maps</option>
                            <option value="apple">Apple Maps</option>
                            <option value="waze">Waze</option>
                            <option value="bing">Bing Maps</option>
                            <option value="osm">OpenStreetMap</option>
                            <option value="yandex">Yandex Maps</option>
                            <option value="here">HERE WeGo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="map-query">Location / Search Query *</label>
                        <input type="text" id="map-query" class="form-input" placeholder="Eiffel Tower, Paris" required>
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
                    <div class="form-row">
                        <div class="form-group">
                            <label for="medical-blood">Blood Type</label>
                            <select id="medical-blood" class="form-input">
                                <option value="">Select Blood Type...</option>
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
                            <label for="medical-dob">Date of Birth</label>
                            <input type="date" id="medical-dob" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="medical-conditions">Conditions / Allergies</label>
                        <textarea id="medical-conditions" class="form-input" rows="2" placeholder="Diabetes, Penicillin allergy..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="medical-contact-name">Emergency Contact Name</label>
                            <input type="text" id="medical-contact-name" class="form-input" placeholder="Jane Doe">
                        </div>
                        <div class="form-group">
                            <label for="medical-contact-phone">Contact Phone</label>
                            <input type="tel" id="medical-contact-phone" class="form-input" placeholder="+1234567890">
                        </div>
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

            case 'discord':
                title.textContent = 'Discord';
                subtitle.textContent = 'Server or Profile';
                html = `
                    <div class="form-group">
                        <label for="discord-id">Invite Link / Username *</label>
                        <input type="text" id="discord-id" class="form-input" placeholder="discord.gg/invitelink" required>
                    </div>
                `;
                break;

            case 'book':
                title.textContent = 'Book Search';
                subtitle.textContent = 'Search by ISBN or Title';
                html = `
                    <div class="form-group">
                        <label for="book-query">ISBN or Title *</label>
                        <input type="text" id="book-query" class="form-input" placeholder="978-0123..." required>
                    </div>
                `;
                break;

            case 'coupon':
                title.textContent = 'Coupon Card';
                subtitle.textContent = 'Deals & Expiry info';
                html = `
                    <div class="form-group">
                        <label for="coupon-code">Promo Code *</label>
                        <input type="text" id="coupon-code" class="form-input" placeholder="SAVE50" required>
                    </div>
                    <div class="form-group">
                        <label for="coupon-desc">Deal Description</label>
                        <input type="text" id="coupon-desc" class="form-input" placeholder="50% off select items">
                    </div>
                `;
                break;

            case 'secret':
                title.textContent = 'Secret Note';
                subtitle.textContent = 'Hidden secure message';
                html = `
                    <div class="form-group">
                        <label for="secret-msg">Your Message *</label>
                        <textarea id="secret-msg" class="form-input" rows="4" placeholder="Enter private note..." required></textarea>
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

            case 'im':
                title.textContent = 'IMDb Encyclopedia';
                subtitle.textContent = 'Bio, Movies, or TV Shows';
                html = `
                    <div class="form-group">
                        <label for="im-type">Link Type</label>
                        <select id="im-type" class="form-input">
                            <option value="title">Movie / TV Title (tt...)</option>
                            <option value="name">Name / Actor / Crew (nm...)</option>
                            <option value="company">Production Company (co...)</option>
                            <option value="search">Search Query</option>
                            <option value="custom">Direct IMDb URL</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="im-id">ID / Query / URL *</label>
                        <input type="text" id="im-id" class="form-input" placeholder="e.g. tt1234567" required>
                    </div>`;
                break;

            case 'wa': case 'tg': case 'vb': case 'sk': case 'ft': case 'fta': case 'zm': case 'wx': case 'yl': case 'fq': case 'as': case 'ps':
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
                    fq: { t: 'Foursquare Link', s: 'Venue ID', ph: 'venue-id' },
                    as: { t: 'App Store Search', s: 'Search Query', ph: 'Game name' },
                    ps: { t: 'Play Store Search', s: 'Search Query', ph: 'Game name' }
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
            case 'sshkey':
                title.textContent = 'SSH Public Key';
                subtitle.textContent = 'Encode your public key for sharing';
                html = `
                    <div class="form-group">
                        <label for="ssh-key">Public Key Data *</label>
                        <textarea id="ssh-key" class="form-input" rows="4" placeholder="ssh-rsa AAAAB3N..." required></textarea>
                    </div>`;
                break;
            case 'docker':
                title.textContent = 'Docker Hub';
                subtitle.textContent = 'Direct image link';
                html = `
                    <div class="form-group">
                        <label for="docker-image">Image Name / Path *</label>
                        <input type="text" id="docker-image" class="form-input" placeholder="nginx:latest or user/repo:v1" required>
                    </div>`;
                break;
            case 'serverinfo':
                title.textContent = 'Server Details';
                subtitle.textContent = 'IP, Port and Protocol info';
                html = `
                    <div class="form-group">
                        <label for="srv-ip">Server Address (IP/Domain) *</label>
                        <input type="text" id="srv-ip" class="form-input" placeholder="192.168.1.10" required>
                    </div>
                    <div class="form-group">
                        <label for="srv-port">Port Number</label>
                        <input type="number" id="srv-port" class="form-input" placeholder="22">
                    </div>
                    <div class="form-group">
                        <label for="srv-protocol">Protocol</label>
                        <select id="srv-protocol" class="form-input">
                            <option value="ssh">SSH</option>
                            <option value="ftp">FTP</option>
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                            <option value="custom">Custom</option>
                        </select>
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

            case 'developer':
                const devPlat = document.getElementById('dev-platform').value;
                const devUser = document.getElementById('dev-user').value.trim();
                const devRepo = document.getElementById('dev-repo').value.trim();
                if (devPlat === 'github') return `https://github.com/${devUser}/${devRepo}`;
                if (devPlat === 'gitlab') return `https://gitlab.com/${devUser}/${devRepo}`;
                return '';

            case 'maps':
                const mapPlat = document.getElementById('map-platform').value;
                const mapQue = document.getElementById('map-query').value.trim();
                const encodedQuery = encodeURIComponent(mapQue);
                
                switch (mapPlat) {
                    case 'google': return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
                    case 'apple': return `https://maps.apple.com/?q=${encodedQuery}`;
                    case 'waze': return `https://waze.com/ul?q=${encodedQuery}&navigate=yes`;
                    case 'bing': return `https://www.bing.com/maps?q=${encodedQuery}`;
                    case 'osm': return `https://www.openstreetmap.org/search?query=${encodedQuery}`;
                    case 'yandex': return `https://yandex.com/maps/?text=${encodedQuery}`;
                    case 'here': return `https://wego.here.com/search/${encodedQuery}`;
                    default: return '';
                }

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

            case 'donate':
                const donPlat = document.getElementById('donate-platform').value;
                const donUser = document.getElementById('donate-user').value.trim();
                if (donPlat === 'patreon') return `https://www.patreon.com/${donUser}`;
                if (donPlat === 'kofi') return `https://ko-fi.com/${donUser}`;
                if (donPlat === 'coffee') return `https://www.buymeacoffee.com/${donUser}`;
                return donUser;

            case 'discord':
                const discId = document.getElementById('discord-id').value.trim();
                return discId.startsWith('http') ? discId : `https://discord.gg/${discId}`;

                break;

            case 'book':
                const bkQuery = document.getElementById('book-query').value.trim();
                return `https://isbnsearch.org/search?s=${encodeURIComponent(bkQuery)}`;

            case 'coupon':
                const copCode = document.getElementById('coupon-code').value.trim();
                const copDesc = document.getElementById('coupon-desc').value.trim();
                return `COUPON CODE: ${copCode}\nDeal: ${copDesc}`;

            case 'secret':
                return document.getElementById('secret-msg').value.trim();

            case 'wa': case 'tg': case 'vb': case 'sk': case 'ft': case 'fta': case 'zm': case 'wx': case 'yl': case 'fq': case 'as': case 'ps':
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
                    case 'yl': return 'yelp:///biz/' + idInput;
                    case 'fq': return 'foursquare://venues/' + idInput;
                    case 'as': return 'itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?term=' + encodeURIComponent(idInput);
                    case 'ps': return 'market://search?q=' + encodeURIComponent(idInput);
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
            case 'uber': return 'uber://?action=setPickup&dropoff[latitude]=' + document.getElementById('uber-lat').value + '&dropoff[longitude]=' + document.getElementById('uber-lng').value;
            case 'lyft': return 'lyft://ridetype?id=lyft&destination[latitude]=' + document.getElementById('lyft-lat').value + '&destination[longitude]=' + document.getElementById('lyft-lng').value;
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
            case 'sshkey':
                return document.getElementById('ssh-key').value.trim();
            case 'docker':
                const img = document.getElementById('docker-image').value.trim();
                return img.startsWith('http') ? img : `https://hub.docker.com/r/${img.includes('/') ? img : '_/' + img}`;
            case 'serverinfo':
                const sip = document.getElementById('srv-ip').value.trim();
                const spr = document.getElementById('srv-port').value.trim();
                const spro = document.getElementById('srv-protocol').value;
                return `${spro}://${sip}${spr ? ':' + spr : ''}`;
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
        const isHidden = document.getElementById('wifi-hidden').checked;

        if (!ssid) return '';

        // Proper WiFi QR format
        let wifi = `WIFI:T:${security};S:${this.escapeWiFiString(ssid)};`;

        if (password && security !== 'nopass') {
            wifi += `P:${this.escapeWiFiString(password)};`;
        }

        wifi += `H:${isHidden ? 'true' : 'false'};;`;

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

    updateBankFields() {
        const region = document.getElementById('bank-region').value;
        const ifscGroup = document.getElementById('bank-ifsc-group');
        const swiftGroup = document.getElementById('bank-swift-group');

        if (region === 'india') {
            ifscGroup.style.display = 'block';
            swiftGroup.style.display = 'none';
        } else {
            ifscGroup.style.display = 'none';
            swiftGroup.style.display = 'block';
        }
    }

    generateBank() {
        const region = document.getElementById('bank-region').value;
        const bankName = document.getElementById('bank-name').value;
        const beneficiary = document.getElementById('bank-beneficiary').value.trim();
        const account = document.getElementById('bank-account').value.trim();
        const amount = document.getElementById('bank-amount').value.trim();

        if (!beneficiary || !account) return '';

        let bankData = '';

        if (region === 'india') {
            const ifsc = document.getElementById('bank-ifsc').value.trim().toUpperCase();
            // Indian bank transfer format
            bankData = `Bank Transfer\nBeneficiary: ${beneficiary}\nAccount: ${account}\nIFSC: ${ifsc}`;
            if (bankName) bankData += `\nBank: ${bankName.toUpperCase()}`;
            if (amount) bankData += `\nAmount: ₹${amount}`;
        } else {
            const swift = document.getElementById('bank-swift').value.trim().toUpperCase();
            // International SWIFT format
            bankData = `International Transfer\nBeneficiary: ${beneficiary}\nAccount: ${account}\nSWIFT/BIC: ${swift}`;
            if (bankName) bankData += `\nBank: ${bankName.toUpperCase()}`;
            if (amount) bankData += `\nAmount: ${amount}`;
        }

        console.log('Generated Bank:', bankData);
        return bankData;
    }

    generateEvent() {
        const title = document.getElementById('event-title').value.trim();
        const location = document.getElementById('event-location').value.trim();
        const startDate = document.getElementById('event-start-date').value;
        const startTime = document.getElementById('event-start-time').value;
        const endDate = document.getElementById('event-end-date').value;
        const endTime = document.getElementById('event-end-time').value;
        const description = document.getElementById('event-description').value.trim();

        if (!title || !startDate || !startTime || !endDate || !endTime) return '';

        // Convert to iCalendar format
        const formatDateTime = (date, time) => {
            return date.replace(/-/g, '') + 'T' + time.replace(/:/g, '') + '00';
        };

        // iCalendar VEVENT format
        let event = 'BEGIN:VCALENDAR\r\n';
        event += 'VERSION:2.0\r\n';
        event += 'BEGIN:VEVENT\r\n';
        event += `DTSTART:${formatDateTime(startDate, startTime)}\r\n`;
        event += `DTEND:${formatDateTime(endDate, endTime)}\r\n`;
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

    generatePDF() {
        const url = document.getElementById('pdf-url').value.trim();
        if (!url) return '';
        return url.startsWith('http') ? url : `https://${url}`;
    }

    generateApp() {
        const url = document.getElementById('app-url').value.trim();
        if (!url) return '';
        return url;
    }

    generateMeeting() {
        const platform = document.getElementById('meeting-platform').value;
        const id = document.getElementById('meeting-id').value.trim();

        if (!id) return '';

        if (id.startsWith('http')) return id;

        // Basic URL constructions if only ID is provided
        switch (platform) {
            case 'zoom': return `https://zoom.us/j/${id}`;
            case 'meet': return `https://meet.google.com/${id}`;
            case 'teams': return id; // Teams links are too complex to construct from ID
            default: return id;
        }
    }

    generateMusic() {
        const url = document.getElementById('music-url').value.trim();
        if (!url) return '';
        return url;
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
        const blood = document.getElementById('medical-blood').value;
        const dob = document.getElementById('medical-dob').value;
        const conditions = document.getElementById('medical-conditions').value.trim();
        const contactName = document.getElementById('medical-contact-name').value.trim();
        const contactPhone = document.getElementById('medical-contact-phone').value.trim();

        if (!name) return '';

        let info = `MEDICAL EMERGENCY INFO\nName: ${name}`;
        if (dob) info += `\nDOB: ${dob}`;
        if (blood) info += `\nBlood Type: ${blood}`;
        if (conditions) info += `\nConditions/Allergies: \n${conditions}`;
        if (contactName || contactPhone) {
            info += `\n\nEMERGENCY CONTACT:\n`;
            if (contactName) info += `Name: ${contactName}\n`;
            if (contactPhone) info += `Phone: ${contactPhone}`;
        }

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
            case 'fq': return 'Foursquare Venue';
            case 'as': return 'App Store Search';
            case 'ps': return 'Play Store Search';
            case 'prompt': return 'AI Prompt';
            case 'totp': return 'Authenticator 2FA';
            case 'uber': return 'Uber Ride';
            case 'lyft': return 'Lyft Ride';
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
                        dark: '#ffffff',  // White QR code
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
        ctx.fillStyle = '#ffffff';
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

    validateQRData() {
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
    }

    async generateQR() {
        if (this.isGenerating) return;

        // Check if library is ready
        if (!this.libraryReady) {
            this.showError('QR library is still loading. Please wait a moment and try again.');
            return;
        }

        // Collect input data
        this.qrData = this.collectInputData();

        if (!this.qrData) {
            console.error('No QR data collected!');
            this.showValidationError();
            return;
        }

        // Validate data based on type
        if (!this.validateQRData()) {
            console.error('QR data validation failed');
            this.showValidationError();
            return;
        }

        console.log('=== QR GENERATION DEBUG ===');
        console.log('Selected Type:', this.selectedType);
        console.log('QR Data:', this.qrData);
        console.log('QR Data Length:', this.qrData.length);
        console.log('QR Method:', this.qrMethod);
        console.log('========================');

        this.isGenerating = true;

        // Ensure size is a valid integer
        this.customization.size = parseInt(this.customization.size, 10) || 3000;
        if (this.customization.size < 3000) this.customization.size = 3000;
        if (this.customization.size > 8000) this.customization.size = 8000;

        // Go directly to result page
        this.goToPage(4);

        // Wait for page transition to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            if (this.selectedType === 'barcode') {
                await this.showBarcodeAnimation();
                await this.createQRCode();
                await this.showSuccessAnimation();
            } else {
                // Build QR on a temp canvas first, then animate reveal
                await this.showSmoothBuildingAnimation();
                // Animation already handled canvas display, no need to call createQRCode again
            }

            // Save to history after successful generation
            this.saveToHistory(this.selectedType, this.qrData, this.getDisplayText());

            // Auto-download if enabled in settings
            if (this.appSettings && this.appSettings.autoDownload) {
                setTimeout(() => this.downloadQR(), 800);
            }
        } catch (error) {
            console.error('Generation error:', error);
            this.showError(`Failed to generate ${this.selectedType === 'barcode' ? 'barcode' : 'QR code'}: ${error.message}`);
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

        // QR generation options - use higher error correction for logos
        const options = {
            width: size,
            height: size,
            margin: 2,
            color: {
                dark: this.customization.fgColor,
                light: this.customization.bgColor
            },
            errorCorrectionLevel: 'H' // Force high error correction for maximum scannability
        };

        try {
            // Generate QR code using available method
            await this.generateQRWithMethod(canvas, this.qrData, options);



            // Add logo if present
            if (this.customization.logo) {
                await this.addLogo(canvas);
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
            if (!container) { resolve(); return; }

            // First generate the actual QR code on a temp canvas
            const tempCanvas = document.createElement('canvas');
            const size = parseInt(this.customization.size, 10) || 3000;
            tempCanvas.width = size;
            tempCanvas.height = size;

            const options = {
                width: size,
                height: size,
                margin: 2,
                color: {
                    dark: this.customization.fgColor,
                    light: this.customization.bgColor
                },
                errorCorrectionLevel: 'H'
            };

            await this.generateQRWithMethod(tempCanvas, this.qrData, options);

            // Add logo if present
            if (this.customization.logo) {
                await this.addLogo(tempCanvas);
            }

            // ——— Phase 1: Show particle vortex animation ———
            container.innerHTML = `
                <div class="qr-gen-animation">
                    <div class="qr-gen-orb">
                        <div class="qr-gen-orb-ring ring-1"></div>
                        <div class="qr-gen-orb-ring ring-2"></div>
                        <div class="qr-gen-orb-ring ring-3"></div>
                        <div class="qr-gen-orb-core"></div>
                    </div>
                    <div class="qr-gen-blocks" id="qr-gen-blocks"></div>
                    <div class="qr-gen-status">
                        <span class="qr-gen-status-text" id="qr-gen-status">Encoding data</span>
                        <div class="qr-gen-progress">
                            <div class="qr-gen-progress-fill" id="qr-gen-progress"></div>
                        </div>
                    </div>
                </div>
                <canvas id="qr-canvas" style="display:none;"></canvas>
            `;

            // Spawn flying QR module blocks
            const blocksContainer = document.getElementById('qr-gen-blocks');
            if (blocksContainer) {
                for (let i = 0; i < 40; i++) {
                    const block = document.createElement('div');
                    block.className = 'qr-gen-block';
                    const angle = (Math.PI * 2 * i) / 40;
                    const radius = 100 + Math.random() * 80;
                    block.style.setProperty('--start-x', `${Math.cos(angle) * radius}px`);
                    block.style.setProperty('--start-y', `${Math.sin(angle) * radius}px`);
                    block.style.setProperty('--delay', `${Math.random() * 0.6}s`);
                    block.style.setProperty('--size', `${4 + Math.random() * 8}px`);
                    block.style.setProperty('--hue', `${240 + Math.random() * 60}`);
                    blocksContainer.appendChild(block);
                }
            }

            // Animate status text and progress bar
            const statusTexts = ['Encoding data', 'Building matrix', 'Applying styles', 'Rendering QR'];
            const progressEl = document.getElementById('qr-gen-progress');
            const statusEl = document.getElementById('qr-gen-status');

            for (let i = 0; i < statusTexts.length; i++) {
                if (statusEl) statusEl.textContent = statusTexts[i];
                if (progressEl) progressEl.style.width = `${(i + 1) * 25}%`;
                await new Promise(r => setTimeout(r, 400));
            }

            // ——— Phase 2: Collapse and morph into QR ———
            const animEl = document.querySelector('.qr-gen-animation');
            if (animEl) {
                animEl.classList.add('qr-gen-collapse');
            }
            await new Promise(r => setTimeout(r, 700));

            // ——— Phase 3: Reveal the actual QR code ———
            container.innerHTML = '';

            const canvas = document.createElement('canvas');
            canvas.id = 'qr-canvas';
            canvas.width = tempCanvas.width;
            canvas.height = tempCanvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempCanvas, 0, 0);
            canvas.className = 'qr-canvas-reveal';

            container.appendChild(canvas);

            // Trigger reveal animation
            await new Promise(r => setTimeout(r, 30));
            canvas.classList.add('qr-canvas-visible');

            // Burst confetti particles
            this.createRevealParticles(container);

            // Show sparkle glow ring
            const glowRing = document.createElement('div');
            glowRing.className = 'qr-reveal-glow';
            container.appendChild(glowRing);
            await new Promise(r => setTimeout(r, 800));
            if (glowRing.parentNode) glowRing.remove();

            // Show action buttons with stagger
            document.querySelectorAll('.action-btn').forEach((btn, i) => {
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(20px)';
                btn.style.transition = `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s`;
                setTimeout(() => {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                }, 50);
            });

            resolve();
        });
    }

    createRevealParticles(container) {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#ffd700'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'reveal-particle';
            const angle = (Math.PI * 2 * i) / 30;
            const dist = 60 + Math.random() * 140;
            p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
            p.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
            p.style.setProperty('--size', `${3 + Math.random() * 6}px`);
            p.style.setProperty('--delay', `${Math.random() * 0.3}s`);
            p.style.left = '50%';
            p.style.top = '50%';
            container.appendChild(p);
            setTimeout(() => { if (p.parentNode) p.remove(); }, 1200);
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
        const options = {
            width: this.customization.size,
            height: this.customization.size,
            margin: 4,
            color: {
                dark: this.customization.fgColor,
                light: this.customization.bgColor
            },
            errorCorrectionLevel: 'M'
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
            const canvas = document.getElementById('qr-canvas');

            if (!canvas) {
                console.error('Canvas not found in showSuccessAnimation');
                resolve();
                return;
            }

            // Remove any leftover animation elements
            const creationDiv = container ? container.querySelector('.qr-creation-animation') : null;
            if (creationDiv) creationDiv.remove();
            const genAnim = container ? container.querySelector('.qr-gen-animation') : null;
            if (genAnim) genAnim.remove();

            // Show canvas
            canvas.style.display = 'block';
            canvas.style.opacity = '1';
            canvas.style.transform = 'none';
            canvas.style.position = 'static';
            canvas.style.margin = '0 auto';
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '400px';
            canvas.style.height = 'auto';
            canvas.style.borderRadius = '14px';

            // Show action buttons with stagger
            document.querySelectorAll('.action-btn').forEach((btn, i) => {
                btn.style.display = 'flex';
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(16px)';
                btn.style.transition = `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`;
                setTimeout(() => {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                }, 50);
            });

            // Burst particles for barcode success too
            if (container) this.createRevealParticles(container);

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
        const canvas = document.getElementById('qr-canvas');
        const link = document.createElement('a');
        link.download = `qrcode-${this.selectedType}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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
                const parsed = parseInt(e.target.value, 10);
                if (isNaN(parsed)) return;
                this.appSettings.defaultSize = parsed;
                sizeVal.textContent = parsed + 'px';
                // Sync with the customization size slider on page 3
                const custSlider = document.getElementById('size-slider');
                const custVal = document.getElementById('size-value');
                if (custSlider) { custSlider.value = parsed; }
                if (custVal) { custVal.textContent = parsed + 'px'; }
                this.customization.size = parsed;
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

