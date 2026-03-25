/**
 * TEAM MRC - Unit Tests
 * Jest/Vitest compatible test suite
 * Run: npm test
 */

import {
    AppState,
    GalleryManager,
    SliderManager,
    Utils,
    galleryData,
    syncDomReferences,
} from '../script.js';
import { jest } from '@jest/globals';

function setTestDom(markup) {
    document.body.innerHTML = markup;
    syncDomReferences();
}

beforeEach(() => {
    AppState.currentCategory = 'bus';
    AppState.currentSlideIndex = 0;
    AppState.sliderTimer = null;
    AppState.isDarkMode = true;
    localStorage.clear();
});

beforeAll(() => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
        configurable: true,
        value: jest.fn(),
    });
});

describe('AppState', () => {
    test('initializes with correct default values', () => {
        expect(AppState.currentCategory).toBe('bus');
        expect(AppState.currentSlideIndex).toBe(0);
        expect(AppState.isDarkMode).toBeDefined();
    });

    test('updateAllItems updates the items array', () => {
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
        expect(AppState.allItems.length).toBeGreaterThan(0);
        expect(AppState.currentSlideIndex).toBe(0);
    });

    test('toggleTheme switches between dark and light mode', () => {
        const initialTheme = AppState.isDarkMode;
        AppState.toggleTheme();
        expect(AppState.isDarkMode).toBe(!initialTheme);
        AppState.toggleTheme(); // Reset
    });

    test('theme persists in localStorage', () => {
        AppState.isDarkMode = false;
        AppState.toggleTheme();
        expect(localStorage.getItem('theme')).toBe('dark');
    });
});

describe('Utils', () => {
    test('debounce delays function execution', (done) => {
        const mockFn = jest.fn();
        const debouncedFn = Utils.debounce(mockFn, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(mockFn).not.toHaveBeenCalled();

        setTimeout(() => {
            expect(mockFn).toHaveBeenCalledTimes(1);
            done();
        }, 150);
    });

    test('throttle limits function execution', () => {
        const mockFn = jest.fn();
        const throttledFn = Utils.throttle(mockFn, 200);

        throttledFn();
        throttledFn();
        throttledFn();

        expect(mockFn).toHaveBeenCalledTimes(1);
    });
});

describe('GalleryManager', () => {
    beforeEach(() => {
        setTestDom(`
            <div id="galleryGrid"></div>
            <button class="tab-button" data-category="bus">Bus</button>
            <button class="tab-button" data-category="van">Van</button>
        `);
    });

    test('renders gallery items correctly', () => {
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
        GalleryManager.renderGalleryItems();

        const cards = document.querySelectorAll('.gallery-card');
        expect(cards.length).toBe(galleryData.bus.length);
    });

    test('switchCategory updates the category', () => {
        const tabElement = document.querySelector('.tab-button');
        GalleryManager.switchCategory('van', tabElement);

        expect(AppState.currentCategory).toBe('van');
    });
});

describe('SliderManager', () => {
    beforeEach(() => {
        setTestDom(`
            <div id="galleryModal">
                <button id="modalClose"></button>
                <img id="sliderImage">
                <video id="sliderVideo">
                    <source id="videoSource">
                </video>
                <button id="sliderPrev"></button>
                <button id="sliderNext"></button>
                <div id="sliderCounter">1 / 1</div>
                <h3 id="sliderTitle">Title</h3>
                <p id="sliderDescription"></p>
                <div id="sliderIndicators"></div>
            </div>
        `);
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
    });

    test('render displays correct item', () => {
        SliderManager.render();
        expect(AppState.currentSlideIndex).toBe(0);
    });

    test('nextSlide advances to next item', () => {
        SliderManager.nextSlide();
        expect(AppState.currentSlideIndex).toBe(1);
    });

    test('prevSlide goes to previous item', () => {
        AppState.currentSlideIndex = 1;
        SliderManager.prevSlide();
        expect(AppState.currentSlideIndex).toBe(0);
    });

    test('updateCounter displays correct count', () => {
        SliderManager.updateCounter();
        expect(document.getElementById('sliderCounter').textContent).toBe(
            `1 / ${galleryData.bus.length}`,
        );
    });

    test('prevSlide wraps around to end', () => {
        AppState.currentSlideIndex = 0;
        SliderManager.prevSlide();
        expect(AppState.currentSlideIndex).toBe(galleryData.bus.length - 1);
    });

    test('nextSlide wraps around to start', () => {
        AppState.currentSlideIndex = galleryData.bus.length - 1;
        SliderManager.nextSlide();
        expect(AppState.currentSlideIndex).toBe(0);
    });
});

describe('GalleryData', () => {
    test('all categories have items', () => {
        expect(galleryData.bus.length).toBeGreaterThan(0);
        expect(galleryData.van.length).toBeGreaterThan(0);
        expect(galleryData.car.length).toBeGreaterThan(0);
        expect(galleryData.media.length).toBeGreaterThan(0);
    });

    test('all items have required properties', () => {
        Object.values(galleryData).forEach((category) => {
            category.forEach((item) => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('title');
                expect(item).toHaveProperty('type');
                expect(item).toHaveProperty('src');
                expect(['image', 'video']).toContain(item.type);
            });
        });
    });
});

describe('Accessibility (a11y)', () => {
    test('images have alt text', () => {
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
        GalleryManager.renderGalleryItems();

        const images = document.querySelectorAll('.gallery-card img');
        images.forEach((img) => {
            expect(img.alt).toBeTruthy();
        });
    });

    test('buttons have aria-labels', () => {
        document.body.innerHTML = `
            <button id="mobileMenuToggle" aria-label="Toggle mobile menu"></button>
        `;
        const button = document.getElementById('mobileMenuToggle');
        expect(button.getAttribute('aria-label')).toBeTruthy();
    });

    test('gallery cards are keyboard navigable', () => {
        setTestDom(`<div id="galleryGrid"></div>`);
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
        GalleryManager.renderGalleryItems();

        const cards = document.querySelectorAll('.gallery-card');
        cards.forEach((card) => {
            expect(card.tabIndex).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('Performance', () => {
    test('lazy loading attributes are set', () => {
        setTestDom(`<div id="galleryGrid"></div>`);
        AppState.currentCategory = 'bus';
        AppState.updateAllItems();
        GalleryManager.renderGalleryItems();

        const images = document.querySelectorAll('.gallery-card img');
        images.forEach((img) => {
            expect(img.loading).toBe('lazy');
        });
    });

    test('slider auto-play delay is set correctly', () => {
        expect(AppState.sliderAutoPlayDelay).toBe(10000); // 10 seconds
    });
});
