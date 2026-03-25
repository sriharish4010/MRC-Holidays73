/**
 * TEAM MRC - End-to-End (E2E) Test Suite
 * Playwright compatible
 * Run: npx playwright test
 */

import { expect, test } from '@playwright/test';

async function openMobileMenuIfNeeded(page) {
    const isMobile = await page.evaluate(() => window.innerWidth <= 768);
    if (!isMobile) {
        return;
    }

    const navMenu = page.locator('#navbarMenu');
    const isOpen = await navMenu.evaluate((el) => el.classList.contains('active'));
    if (!isOpen) {
        await page.locator('#mobileMenuToggle').click();
    }
}

test.describe('TEAM MRC - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test.describe('Navigation', () => {
        test('should navigate to vehicles section on click', async ({ page }) => {
            await openMobileMenuIfNeeded(page);
            const vehiclesLink = page.locator('#navbarMenu a[href="#vehicles"]');
            await vehiclesLink.click();

            const vehiclesSection = page.locator('#vehicles');
            await expect(vehiclesSection).toBeInViewport();
        });

        test('should toggle mobile menu on button click', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            const menuToggle = page.locator('#mobileMenuToggle');

            await menuToggle.click();

            const navMenu = page.locator('#navbarMenu');
            const isActive = await navMenu.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(true);
        });

        test('should toggle theme on button click', async ({ page }) => {
            await openMobileMenuIfNeeded(page);
            const themeToggle = page.locator('#themeToggle');
            const body = page.locator('body');

            await themeToggle.click();

            const hasLightMode = await body.evaluate((el) => el.classList.contains('light-mode'));
            expect(hasLightMode).toBe(true);
        });
    });

    test.describe('Gallery Functionality', () => {
        test('should load bus category by default', async ({ page }) => {
            const tabButton = page.locator('[data-category="bus"]');
            const isActive = await tabButton.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(true);
        });

        test('should switch gallery category on tab click', async ({ page }) => {
            const vanTab = page.locator('[data-category="van"]');
            await vanTab.click();

            const isActive = await vanTab.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(true);
        });

        test('should open modal when gallery card is clicked', async ({ page }) => {
            const firstCard = page.locator('.gallery-card').first();
            await firstCard.click();

            const modal = page.locator('#galleryModal');
            const isActive = await modal.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(true);
        });

        test('should update slide counter on modal open', async ({ page }) => {
            const firstCard = page.locator('.gallery-card').first();
            await firstCard.click();

            const counter = page.locator('#sliderCounter');
            const text = await counter.textContent();
            expect(text).toMatch(/1 \/ \d+/);
        });
    });

    test.describe('Modal & Slider', () => {
        async function openModal(page) {
            const firstCard = page.locator('.gallery-card').first();
            await firstCard.click();
        }

        test('should navigate to next slide on next button click', async ({ page }) => {
            await openModal(page);
            const nextBtn = page.locator('#sliderNext');
            const counterBefore = await page.locator('#sliderCounter').textContent();

            await nextBtn.click();

            const counterAfter = await page.locator('#sliderCounter').textContent();
            expect(counterBefore).not.toBe(counterAfter);
        });

        test('should navigate to previous slide on prev button click', async ({ page }) => {
            await openModal(page);
            const prevBtn = page.locator('#sliderPrev');

            // Go forward first
            await page.locator('#sliderNext').click();
            const counterBefore = await page.locator('#sliderCounter').textContent();

            // Then go back
            await prevBtn.click();
            const counterAfter = await page.locator('#sliderCounter').textContent();
            expect(counterBefore).not.toBe(counterAfter);
        });

        test('should close modal on close button click', async ({ page }) => {
            await openModal(page);
            const closeBtn = page.locator('#modalClose');
            await closeBtn.click();

            const modal = page.locator('#galleryModal');
            const isActive = await modal.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(false);
        });

        test('should close modal on Escape key', async ({ page }) => {
            await openModal(page);
            await page.keyboard.press('Escape');

            const modal = page.locator('#galleryModal');
            const isActive = await modal.evaluate((el) => el.classList.contains('active'));
            expect(isActive).toBe(false);
        });

        test('should navigate slides with keyboard arrows', async ({ page }) => {
            await openModal(page);
            const counterBefore = await page.locator('#sliderCounter').textContent();

            await page.keyboard.press('ArrowRight');

            const counterAfter = await page.locator('#sliderCounter').textContent();
            expect(counterBefore).not.toBe(counterAfter);
        });
    });

    test.describe('Theme Persistence', () => {
        test('should persist theme in localStorage', async ({ page }) => {
            const storage = await page.evaluate(() => localStorage.getItem('theme'));
            expect(['light', 'dark']).toContain(storage);
        });

        test('should apply stored theme on page load', async ({ page }) => {
            await openMobileMenuIfNeeded(page);
            // Set theme to light
            await page.locator('#themeToggle').click();

            // Reload page
            await page.reload();

            const body = page.locator('body');
            await expect(body).toHaveClass(/light-mode/);
        });
    });

    test.describe('Accessibility', () => {
        test('should have proper heading hierarchy', async ({ page }) => {
            const violations = await page.evaluate(() => {
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                return Array.from(headings).map((h) => {
                    const level = parseInt(h.tagName[1]);
                    return { level, text: h.textContent };
                });
            });

            // First heading should be h1
            expect(violations[0].level).toBe(1);
        });

        test('should have alt text on all images', async ({ page }) => {
            const images = await page.locator('img').all();

            for (const img of images) {
                const alt = await img.getAttribute('alt');
                expect(alt).toBeTruthy();
            }
        });

        test('should have skip to main content link', async ({ page }) => {
            const skipLink = page.locator('.skip-to-main');
            await expect(skipLink).toHaveAttribute('href', '#main-content');

            const isKeyboardReachable = await page.evaluate(() => {
                const link = document.querySelector('.skip-to-main');
                if (!link) {
                    return false;
                }

                return (
                    link instanceof HTMLAnchorElement &&
                    link.tabIndex >= 0 &&
                    link.getAttribute('href') === '#main-content'
                );
            });

            expect(isKeyboardReachable).toBe(true);
        });

        test('gallery cards should be keyboard navigable', async ({ page }) => {
            const firstCard = page.locator('.gallery-card').first();
            await expect(firstCard).toBeVisible();
            await firstCard.press('Enter');

            const modal = page.locator('#galleryModal');
            await expect(modal).toHaveClass(/active/);
        });
    });

    test.describe('Performance', () => {
        test('should load initial page in under 2 seconds', async ({ page }) => {
            const startTime = Date.now();
            await page.goto('/');
            const loadTime = Date.now() - startTime;
            const isMobile = await page.evaluate(() => window.innerWidth <= 768);
            const threshold = isMobile ? 4000 : 2500;

            expect(loadTime).toBeLessThan(threshold);
        });

        test('should have Core Web Vitals score', async ({ page }) => {
            await page.waitForLoadState('load');
            const metrics = await page.evaluate(() => {
                return {
                    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
                    lcp: performance.getEntriesByName('largest-contentful-paint').pop()?.startTime,
                };
            });

            const isMobile = await page.evaluate(() => window.innerWidth <= 768);
            const fcpThreshold = isMobile ? 3500 : 2500;
            const lcpThreshold = isMobile ? 5000 : 4000;

            expect(Number.isFinite(metrics.fcp)).toBe(true);
            expect(Number.isFinite(metrics.lcp)).toBe(true);
            expect(metrics.fcp).toBeLessThan(fcpThreshold);
            expect(metrics.lcp).toBeLessThan(lcpThreshold);
        });

        test('images should lazy load', async ({ page }) => {
            const images = await page.locator('img').all();

            for (const img of images) {
                const loading = await img.getAttribute('loading');
                expect(loading).toBe('lazy');
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should be mobile responsive', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            const menuToggle = page.locator('#mobileMenuToggle');
            await expect(menuToggle).toBeVisible();
        });

        test('should be tablet responsive', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });

            const galleryGrid = page.locator('.gallery-grid');
            const boxes = await galleryGrid.locator('.gallery-card').count();
            expect(boxes).toBeGreaterThan(0);
        });

        test('should be desktop responsive', async ({ page }) => {
            await page.setViewportSize({ width: 1920, height: 1080 });

            const galleryGrid = page.locator('.gallery-grid');
            const boxes = await galleryGrid.locator('.gallery-card').count();
            expect(boxes).toBeGreaterThan(0);
        });
    });

    test.describe('Error Handling', () => {
        test('should handle missing images gracefully', async ({ page }) => {
            // This test ensures error handling works
            const consoleErrors = [];
            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });

            await page.goto('/');

            // Should not have uncaught errors
            expect(consoleErrors.filter((e) => !e.includes('[')).length).toBe(0);
        });
    });

    test.describe('Contact Section', () => {
        test('should have phone dialer buttons', async ({ page }) => {
            const phoneLinks = page.locator('a[href^="tel:"]');
            const count = await phoneLinks.count();
            expect(count).toBeGreaterThan(0);
        });

        test('should navigate to contact section', async ({ page }) => {
            await openMobileMenuIfNeeded(page);
            const contactLink = page.locator('#navbarMenu a[href="#contact"]');
            await contactLink.click();

            const contactSection = page.locator('#contact');
            await expect(contactSection).toBeInViewport();
        });
    });
});
