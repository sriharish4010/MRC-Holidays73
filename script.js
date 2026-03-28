/**
 * MRC HOLIDAYS - Interactive JavaScript Module
 * Vanilla ES6+ with accessibility and performance optimization
 * Testing: Unit tests located in tests/
 */

/* ==========================================
   GALLERY DATA
   ========================================== */

const galleryData = {
    bus: [],
    van: [
        {
            id: 1,
            title: 'Premium Bus - Exterior View',
            type: 'image',
            src: 'backside_bus.jpeg',
            description: 'Full view of our luxury coach',
        },
        {
            id: 2,
            title: 'Bus Interior Seating',
            type: 'image',
            src: 'normalinterior seat.jpeg',
            description: 'Comfortable and spacious seating',
        },
        {
            id: 3,
            title: 'Front Lighting Design',
            type: 'image',
            src: 'fronend lightning.jpeg',
            description: 'Modern front design with LED lighting',
        },
        {
            id: 4,
            title: 'Bus in Action',
            type: 'video',
            src: 'normal bustaning veiw.mp4',
            description: 'Bus performance and comfort',
        },
        {
            id: 5,
            title: 'Highway Driving',
            type: 'video',
            src: 'driving.mp4',
            description: 'Smooth and professional driving',
        },
        {
            id: 9,
            title: 'Bus Seating Configuration',
            type: 'image',
            src: 'backsideinterironseeat.jpeg',
            description: 'Rear seating layout inside the bus',
        },
        {
            id: 10,
            title: 'Bus Interior Lighting',
            type: 'image',
            src: 'lightning interinor seat.jpeg',
            description: 'Interior lighting and seating ambience inside the bus',
        },
        {
            id: 11,
            title: 'Bus Interior Showcase Video',
            type: 'video',
            src: 'disco.mp4',
            description: 'Interior ambience video from the bus setup',
        },
        {
            id: 12,
            title: 'Bus Event Ambience Video',
            type: 'video',
            src: 'diso2.mp4',
            description: 'Additional interior/event ambience captured in the bus',
        },
        {
            id: 13,
            title: 'Bus Coverage Video',
            type: 'video',
            src: 'WhatsApp Video 2026-03-11 at 2.18.09 PM.mp4',
            description: 'Recorded bus coverage footage',
        },
    ],
    car: [
        {
            id: 6,
            title: 'Van - Rear View',
            type: 'image',
            src: 'backside view van.jpeg',
            description: 'Spacious cargo area',
        },
        {
            id: 7,
            title: 'Van - Front View',
            type: 'image',
            src: 'front veiw of van.jpeg',
            description: 'Modern aerodynamic design',
        },
        {
            id: 8,
            title: 'Van Interior',
            type: 'image',
            src: 'interior van view .jpeg',
            description: 'Premium interior finishing',
        },
    ],
};

/* ==========================================
   STATE MANAGEMENT
   ========================================== */

const AppState = {
    currentCategory: 'bus',
    currentSlideIndex: 0,
    sliderTimer: null,
    sliderAutoPlayDelay: 10000, 
    allItems: [], // This will now store vehicles for the current category
    allVehicles: [], // Store all vehicles from API
    currentVehicleMedia: [], // Media for the currently active slider
    isDarkMode: localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme'),

    async init() {
        this.loadTheme();
        await this.fetchData();
    },

    async fetchData() {
        try {
            const resp = await fetch('https://mrc-holidays.onrender.com/api/vehicles');
            this.allVehicles = await resp.json();
            this.updateAllItems();
        } catch (err) {
            console.error('Failed to fetch vehicles:', err);
        }
    },

    updateAllItems() {
        // Filter vehicles by category (handle features.category or type prefix fallback)
        this.allItems = this.allVehicles.filter(v => {
            const cat = v.features?.category || (v.type || '').split(':')[0];
            return cat === this.currentCategory;
        });
        this.currentSlideIndex = 0;
    },

    loadTheme() {
        if (this.isDarkMode) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    },

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        this.loadTheme();
    },
};

/* ==========================================
   DOM ELEMENTS (Cached selectors for performance)
   ========================================== */

const DOM = {};

function syncDomReferences() {
    Object.assign(DOM, {
        mobileMenuToggle: document.getElementById('mobileMenuToggle'),
        navbarMenu: document.getElementById('navbarMenu'),
        themeToggle: document.getElementById('themeToggle'),
        galleryGrid: document.getElementById('galleryGrid'),
        galleryTabs: document.querySelectorAll('.tab-button'),
        modal: document.getElementById('galleryModal'),
        modalClose: document.getElementById('modalClose'),
        sliderImage: document.getElementById('sliderImage'),
        sliderVideo: document.getElementById('sliderVideo'),
        videoSource: document.getElementById('videoSource'),
        sliderPrev: document.getElementById('sliderPrev'),
        sliderNext: document.getElementById('sliderNext'),
        sliderCounter: document.getElementById('sliderCounter'),
        sliderTitle: document.getElementById('sliderTitle'),
        sliderDescription: document.getElementById('sliderDescription'),
        sliderIndicators: document.getElementById('sliderIndicators'),
        heroSection: document.getElementById('hero'),
    });

    return DOM;
}

syncDomReferences();

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */

const Utils = {
    /**
     * Create image element with error handling
     */
    createImage(src, alt) {
        const img = new Image();
        img.src = src;
        img.alt = alt;
        img.loading = 'lazy';
        return img;
    },

    /**
     * Debounce function for performance
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function for frequent events
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },

    /**
     * Safe DOM query
     */
    querySelector(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    },

    /**
     * Log with namespace
     */
    log(module, message, data = null) {
        console.log(`[${module}]`, message, data || '');
    },

    /**
     * Error logging
     */
    error(module, message, error = null) {
        console.error(`[${module}] ERROR:`, message, error || '');
    },
};

/* ==========================================
   THEME MANAGER
   ========================================== */

const ThemeManager = {
    init() {
        DOM.themeToggle?.addEventListener('click', () => this.toggle());
        this.updateToggleLabel();
    },

    toggle() {
        AppState.toggleTheme();
        this.updateToggleLabel();
        this.animateToggle();
        Utils.log('ThemeManager', 'Theme toggled', AppState.isDarkMode ? 'dark' : 'light');
    },

    updateToggleLabel() {
        if (!DOM.themeToggle) {
            return;
        }

        const icon = AppState.isDarkMode ? '☀️' : '🌙';
        const iconElement = document.createElement('span');
        iconElement.textContent = icon;
        DOM.themeToggle.replaceChildren(iconElement);
        DOM.themeToggle.setAttribute(
            'aria-label',
            `Switch to ${AppState.isDarkMode ? 'light' : 'dark'} mode`,
        );
    },

    animateToggle() {
        if (!DOM.themeToggle) {
            return;
        }

        DOM.themeToggle.style.animation = 'none';
        setTimeout(() => {
            DOM.themeToggle.style.animation = 'fadeIn 0.3s ease-in-out';
        }, 10);
    },
};

/* ==========================================
   NAVIGATION MANAGER
   ========================================== */

const NavigationManager = {
    init() {
        this.setupMobileMenu();
        this.setupSmoothScroll();
    },

    setupMobileMenu() {
        DOM.mobileMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
        });

        DOM.navbarMenu?.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                this.closeMobileMenu();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) {
                this.closeMobileMenu();
            }
        });
    },

    toggleMobileMenu() {
        const isActive = DOM.navbarMenu?.classList.toggle('active');
        DOM.mobileMenuToggle?.classList.toggle('active');
        DOM.mobileMenuToggle?.setAttribute('aria-expanded', String(Boolean(isActive)));
        Utils.log('Navigation', 'Mobile menu toggled');
    },

    closeMobileMenu() {
        DOM.navbarMenu?.classList.remove('active');
        DOM.mobileMenuToggle?.classList.remove('active');
        DOM.mobileMenuToggle?.setAttribute('aria-expanded', 'false');
    },

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    },
};

/* ==========================================
   SCROLL OBSERVER FOR ANIMATIONS
   ========================================== */

const ScrollObserver = {
    observer: null,

    init() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px',
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);

        // Observe all animatable elements
        document.querySelectorAll('.section-title, .service-card, .gallery-card').forEach((el) => {
            this.observer.observe(el);
        });

        Utils.log('ScrollObserver', 'Initialized');
    },
};

/* ==========================================
   GALLERY MANAGER
   ========================================== */

const GalleryManager = {
    init() {
        this.renderGalleryItems();
        this.setupTabListeners();
        Utils.log('GalleryManager', 'Initialized');
    },

    renderGalleryItems() {
        if (!DOM.galleryGrid) {
            return;
        }

        DOM.galleryGrid.innerHTML = '';
        AppState.allItems.forEach((item, index) => {
            const card = this.createGalleryCard(item, index);
            DOM.galleryGrid.appendChild(card);
        });
    },

    createGalleryCard(vehicle, index) {
        const card = document.createElement('button');
        card.className = 'gallery-card';
        card.type = 'button';
        card.setAttribute('aria-label', `View ${vehicle.name} Gallery`);

        // Use primary image or first available media
        const primaryMedia = vehicle.vehicle_media?.find(m => m.is_primary) || vehicle.vehicle_media?.[0];
        const mediaUrl = primaryMedia ? primaryMedia.url : 'backside_bus.jpeg'; // Fallback
        const isVideo = primaryMedia?.media_type === 'video';

        let mediaElement;
        if (!isVideo) {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = vehicle.name;
            img.loading = 'lazy';
            mediaElement = img;
        } else {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.setAttribute('aria-hidden', 'true');
            mediaElement = video;
        }

        const title = document.createElement('div');
        title.className = 'gallery-card-title';
        title.textContent = vehicle.name;

        const description = document.createElement('div');
        description.className = 'gallery-card-description';
        const cardTitle = document.createElement('span');
        cardTitle.className = 'card-title';
        cardTitle.textContent = vehicle.type.toUpperCase();

        const cardDescription = document.createElement('p');
        cardDescription.className = 'card-desc';
        cardDescription.textContent = vehicle.description || `Premium ${vehicle.category} service`;

        description.append(cardTitle, cardDescription);

        const mediaCount = vehicle.vehicle_media?.length || 0;
        if (mediaCount > 1) {
            const badge = document.createElement('div');
            badge.className = 'media-badge';
            badge.textContent = `+${mediaCount - 1} Media`;
            card.appendChild(badge);
        }

        card.appendChild(mediaElement);
        card.appendChild(title);
        card.appendChild(description);

        card.addEventListener('click', () => this.openVehicleGallery(vehicle));
        return card;
    },

    openVehicleGallery(vehicle) {
        AppState.currentVehicleMedia = vehicle.vehicle_media || [];
        if (AppState.currentVehicleMedia.length === 0) {
            alert('No photos or videos available for this vehicle yet.');
            return;
        }
        AppState.currentSlideIndex = 0;
        SliderManager.render();
        DOM.modal.classList.add('active');
        DOM.modal.setAttribute('aria-hidden', false);
        document.body.style.overflow = 'hidden';
    },

    setupTabListeners() {
        DOM.galleryTabs.forEach((tab) => {
            tab.addEventListener('click', (e) => {
                const selectedTab = e.currentTarget;
                const category = selectedTab.dataset.category;
                this.switchCategory(category, selectedTab);
            });

            // Keyboard support for tabs
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    const tabs = Array.from(DOM.galleryTabs);
                    const currentIndex = tabs.indexOf(e.target);
                    const nextIndex =
                        e.key === 'ArrowRight' ?
                            (currentIndex + 1) % tabs.length :
                            (currentIndex - 1 + tabs.length) % tabs.length;
                    tabs[nextIndex].click();
                    tabs[nextIndex].focus();
                }
            });
        });
    },

    switchCategory(category, tabElement) {
        AppState.currentCategory = category;
        AppState.updateAllItems();

        // Update active tab
        DOM.galleryTabs.forEach((tab) => {
            tab.classList.remove('active');
            tab.setAttribute('aria-pressed', 'false');
        });
        tabElement.classList.add('active');
        tabElement.setAttribute('aria-pressed', 'true');

        this.renderGalleryItems();
        Utils.log('GalleryManager', `Switched to category: ${category}`);
    },

    openModal(index) {
        AppState.currentSlideIndex = index;
        SliderManager.render();
        DOM.modal.classList.add('active');
        DOM.modal.setAttribute('aria-hidden', false);
        document.body.style.overflow = 'hidden';
        Utils.log('GalleryManager', `Modal opened at index ${index}`);
    },
};

/* ==========================================
   SLIDER MANAGER
   ========================================== */

const SliderManager = {
    init() {
        DOM.modalClose?.addEventListener('click', () => this.closeModal());
        DOM.sliderPrev?.addEventListener('click', () => this.prevSlide());
        DOM.sliderNext?.addEventListener('click', () => this.nextSlide());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!DOM.modal.classList.contains('active')) return;

            if (e.key === 'ArrowLeft') this.prevSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
            if (e.key === 'Escape') this.closeModal();
        });

        // Close on background click
        DOM.modal?.addEventListener('click', (e) => {
            if (e.target === DOM.modal) this.closeModal();
        });

        Utils.log('SliderManager', 'Initialized');
    },

    render() {
        const items = AppState.currentVehicleMedia;
        const item = items[AppState.currentSlideIndex];
        if (!item) return;

        this.displayMedia(item);
        
        const current = AppState.currentSlideIndex + 1;
        const total = items.length;
        DOM.sliderCounter.textContent = `${current} / ${total}`;

        this.updateIndicators(items);
        this.startAutoPlay();
    },

    displayMedia(item) {
        DOM.sliderImage?.classList.remove('active');
        DOM.sliderVideo?.classList.remove('active');

        if (item.media_type === 'image') {
            DOM.sliderImage.src = item.url;
            DOM.sliderImage.alt = item.title || 'Vehicle Image';
            DOM.sliderImage.classList.add('active');
        } else {
            DOM.videoSource.src = item.url;
            DOM.sliderVideo.load();
            DOM.sliderVideo.classList.add('active');
        }

        DOM.sliderTitle.textContent = item.title || 'Vehicle Media';
        if (DOM.sliderDescription) {
            DOM.sliderDescription.textContent = item.description || '';
        }
    },

    nextSlide() {
        const total = AppState.currentVehicleMedia.length;
        AppState.currentSlideIndex = (AppState.currentSlideIndex + 1) % total;
        this.render();
    },

    prevSlide() {
        const total = AppState.currentVehicleMedia.length;
        AppState.currentSlideIndex = (AppState.currentSlideIndex - 1 + total) % total;
        this.render();
    },

    updateIndicators(items) {
        if (!DOM.sliderIndicators) return;

        DOM.sliderIndicators.innerHTML = '';
        items.forEach((_, index) => {
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.className = 'indicator' + (index === AppState.currentSlideIndex ? ' active' : '');
            indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
            
            indicator.addEventListener('click', () => {
                AppState.currentSlideIndex = index;
                this.render();
            });

            DOM.sliderIndicators.appendChild(indicator);
        });
    },

    startAutoPlay() {
        this.stopAutoPlay(); // Clear existing timer
        AppState.sliderTimer = setTimeout(() => {
            this.nextSlide();
        }, AppState.sliderAutoPlayDelay);
    },

    stopAutoPlay() {
        if (AppState.sliderTimer) {
            clearTimeout(AppState.sliderTimer);
            AppState.sliderTimer = null;
        }
    },

    closeModal() {
        DOM.modal.classList.remove('active');
        DOM.modal.setAttribute('aria-hidden', true);
        document.body.style.overflow = 'auto';
        this.stopAutoPlay();

        // Cleanup video
        DOM.sliderVideo.pause();
        DOM.sliderVideo.currentTime = 0;

        Utils.log('SliderManager', 'Modal closed');
    },
};

/* ==========================================
   PERFORMANCE MONITORING
   ========================================== */

const PerformanceMonitor = {
    init() {
        if ('PerformanceObserver' in window) {
            try {
                // Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    const lcpValue = lastEntry?.renderTime || lastEntry?.loadTime;
                    if (Number.isFinite(lcpValue)) {
                        Utils.log('Performance', 'LCP', `${Math.round(lcpValue)} ms`);
                    }
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

                // First Input Delay
                const fidObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach((entry) => {
                        const fidValue = entry.processingStart - entry.startTime;
                        if (Number.isFinite(fidValue)) {
                            Utils.log('Performance', 'FID', `${Math.round(fidValue)} ms`);
                        }
                    });
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
            } catch (e) {
                Utils.error('PerformanceMonitor', 'Failed to initialize observers', e);
            }
        }
    },
};

/* ==========================================
   INTERACTIVE FEATURES MANAGER
   ========================================== */

const InteractiveFeatures = {
    init() {
        this.setupGalleryCardHovers();
        this.setupKeyboardShortcuts();
        this.setupSmoothImageZoom();
        Utils.log('InteractiveFeatures', 'Initialized');
    },

    setupGalleryCardHovers() {
        document.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.gallery-card');
            if (card) {
                card.style.filter = 'brightness(1.1)';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.gallery-card');
            if (card) {
                card.style.filter = 'brightness(1)';
            }
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!DOM.modal.classList.contains('active')) return;

            // Spacebar to play/pause video
            if (e.code === 'Space' && DOM.sliderVideo.classList.contains('active')) {
                e.preventDefault();
                if (DOM.sliderVideo.paused) {
                    DOM.sliderVideo.play();
                } else {
                    DOM.sliderVideo.pause();
                }
            }

            // 'I' for image info toggle
            if (e.key.toLowerCase() === 'i' && DOM.sliderDescription) {
                DOM.sliderDescription.hidden = !DOM.sliderDescription.hidden;
            }

            // 'F' for fullscreen
            if (e.key.toLowerCase() === 'f') {
                const sliderImg = DOM.sliderImage.classList.contains('active') ?
                    DOM.sliderImage :
                    DOM.sliderVideo;
                if (sliderImg.requestFullscreen) {
                    sliderImg.requestFullscreen();
                }
            }
        });
    },

    setupSmoothImageZoom() {
        DOM.sliderImage?.addEventListener('click', () => {
            DOM.sliderImage.classList.toggle('is-zoomed');
        });
    },
};

/* ==========================================
   APPLICATION INITIALIZATION
   ========================================== */

function initializeApp() {
    try {
        syncDomReferences();

        // Initialize state
        AppState.init();

        // Initialize managers
        ThemeManager.init();
        NavigationManager.init();
        GalleryManager.init();
        SliderManager.init();
        InteractiveFeatures.init();

        // Initialize observers
        ScrollObserver.init();
        PerformanceMonitor.init();

        // Set initial page title for accessibility
        document.title = 'MRC HOLIDAYS - Premium Vehicle Rental & Media Coverage';

        Utils.log('App', 'Application initialized successfully');
    } catch (error) {
        Utils.error('App', 'Failed to initialize application', error);
    }
}

const isTestEnvironment = typeof process !== 'undefined' && process.env.JEST_WORKER_ID;

if (!isTestEnvironment) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    window.addEventListener('beforeunload', () => {
        SliderManager.stopAutoPlay();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            SliderManager.stopAutoPlay();
        } else if (DOM.modal?.classList.contains('active')) {
            SliderManager.startAutoPlay();
        }
    });
}

export {
    AppState,
    DOM,
    GalleryManager,
    InteractiveFeatures,
    PerformanceMonitor,
    SliderManager,
    ThemeManager,
    Utils,
    galleryData,
    initializeApp,
    syncDomReferences,
};
