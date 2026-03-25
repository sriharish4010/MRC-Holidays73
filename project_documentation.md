# TEAM MRC - Project Documentation

## Project Overview
**TEAM MRC** is a premium travel and event services platform specializing in vehicle rentals and media coverage. The website serves as a digital portfolio for their fleet, including buses, vans, and executive cars, as well as their tour package services.

---

## Technical Stack
- **Structure:** HTML5
- **Styling:** Vanilla CSS3 (Custom properties, animations, glassmorphism)
- **Logic:** Vanilla JavaScript (ES6+)
- **Responsive Design:** Mobile-first approach with intersection observers for scroll animations.

---

## Architecture & File Structure
```text
TEAM-MRC--main/
├── index.html          # Main landing page and gallery logic
├── j.css               # Core styling and animation definitions
├── README.md           # Basic project readme
└── [Media Assets]      # Images (.jpeg, .jpg) and Videos (.mp4)
```

---

## Core Features

### 1. Dynamic Hero Section
- **Video Background:** High-impact background video with a dark overlay.
- **Cinematic Effects:** Custom CSS animations for **Rain** and **Lightning** to create a moody, premium atmosphere.
- **Micro-Animations:** Fade-in and slide-up effects triggered on scroll.

### 2. Interactive Vehicle Gallery
- **Grid Layout:** Categorized cards for Bus, Van, Car, and Media.
- **Modal Slider:** A custom-built fullscreen media viewer.
- **Auto-Slide:** Gallery modal automatically transitions every **10 seconds**. Timer resets on user interaction (manual clicks).
- **Video Support:** seamless switching between image and video content within the slider.

### 3. User Experience (UX)
- **Theme Toggle:** Dynamic light/dark mode switcher with a smooth flash transition effect.
- **Mobile Optimized:** Fully responsive navigation bar with a glassmorphism blur effect and a slide-out mobile menu.
- **Performance:** Efficient media handling using `object-fit` to ensure consistent visual presentation.

### 4. Direct Booking Integration
- **Contact Profiles:** Dedicated cards for Fleet and Booking managers with one-click phone dialer buttons (`tel:` links).

---

## Key Maintenance Highlights
- **Gallery Data:** Managed via the `galleryData` object in [index.html](file:///d:/project/harish/TEAM-MRC--main/index.html). To update photos, simply modify the `items` array for the relevant category.
- **Theme Styles:** Managed via CSS variables in [j.css](file:///d:/project/harish/TEAM-MRC--main/j.css) (:root and body.light-mode).
- **Animations:** All scroll animations use the class-based `.visible` trigger system handled via an Intersection Observer in [index.html](file:///d:/project/harish/TEAM-MRC--main/index.html).

---

## Verification & Testing
- ✅ **Responsive:** Tested across desktop and mobile breakpoints.
- ✅ **Theming:** Verified light/dark mode persistence via localStorage.
- ✅ **Performance:** Analyzed slider logic to ensure proper resource cleanup (stopping videos and clearing timers) on modal close.
