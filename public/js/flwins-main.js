/**
 * FL WINS - Main JavaScript Functionality
 * Handles navigation, dropdowns, and interactive elements
 */

class FLWINSApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupDropdowns();
        this.setupSmoothScrolling();
        this.setupAccessibility();
        this.setupLazyLoading();
        this.setupAuthentication();
    }

    /**
     * Mobile Menu Functionality
     */
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.flwins-mobile-menu-btn');
        const nav = document.querySelector('.flwins-nav');
        
        if (!mobileMenuBtn || !nav) return;

        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !nav.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                this.closeMobileMenu();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
                this.closeAllDropdowns();
            }
        });
    }

    toggleMobileMenu() {
        const mobileMenuBtn = document.querySelector('.flwins-mobile-menu-btn');
        const nav = document.querySelector('.flwins-nav');
        
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        nav.classList.toggle('active');
        
        // Update body scroll behavior
        document.body.style.overflow = !isExpanded ? 'hidden' : '';
    }

    closeMobileMenu() {
        const mobileMenuBtn = document.querySelector('.flwins-mobile-menu-btn');
        const nav = document.querySelector('.flwins-nav');
        
        if (!mobileMenuBtn || !nav) return;
        
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        nav.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Dropdown Menu Functionality
     */
    setupDropdowns() {
        const dropdownTriggers = document.querySelectorAll('.flwins-dropdown-trigger');
        
        dropdownTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDropdown(trigger);
            });

            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleDropdown(trigger);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.openDropdown(trigger);
                    this.focusFirstMenuItem(trigger);
                }
            });
        });

        // Setup dropdown menu item navigation
        const dropdownMenus = document.querySelectorAll('.flwins-dropdown-menu');
        dropdownMenus.forEach(menu => {
            const menuItems = menu.querySelectorAll('.flwins-dropdown-link');
            
            menuItems.forEach((item, index) => {
                item.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            this.focusNextMenuItem(menuItems, index);
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            this.focusPreviousMenuItem(menuItems, index);
                            break;
                        case 'Escape':
                            e.preventDefault();
                            this.closeDropdown(menu.closest('.flwins-nav-dropdown'));
                            break;
                        case 'Tab':
                            if (!e.shiftKey && index === menuItems.length - 1) {
                                this.closeDropdown(menu.closest('.flwins-nav-dropdown'));
                            }
                            break;
                    }
                });
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.flwins-nav-dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }

    toggleDropdown(trigger) {
        const dropdown = trigger.closest('.flwins-nav-dropdown');
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        
        // Close all other dropdowns first
        this.closeAllDropdowns();
        
        if (!isExpanded) {
            this.openDropdown(trigger);
        }
    }

    openDropdown(trigger) {
        const dropdown = trigger.closest('.flwins-nav-dropdown');
        trigger.setAttribute('aria-expanded', 'true');
        dropdown.setAttribute('aria-expanded', 'true');
    }

    closeDropdown(dropdown) {
        const trigger = dropdown.querySelector('.flwins-dropdown-trigger');
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.setAttribute('aria-expanded', 'false');
        trigger.focus();
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.flwins-nav-dropdown');
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.flwins-dropdown-trigger');
            trigger.setAttribute('aria-expanded', 'false');
            dropdown.setAttribute('aria-expanded', 'false');
        });
    }

    focusFirstMenuItem(trigger) {
        const dropdown = trigger.closest('.flwins-nav-dropdown');
        const firstMenuItem = dropdown.querySelector('.flwins-dropdown-link');
        if (firstMenuItem) {
            firstMenuItem.focus();
        }
    }

    focusNextMenuItem(menuItems, currentIndex) {
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems[nextIndex].focus();
    }

    focusPreviousMenuItem(menuItems, currentIndex) {
        const prevIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
        menuItems[prevIndex].focus();
    }

    /**
     * Smooth Scrolling for Internal Links
     */
    setupSmoothScrolling() {
        const internalLinks = document.querySelectorAll('a[href^="#"]');
        
        internalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    // Close mobile menu if open
                    this.closeMobileMenu();
                    
                    // Smooth scroll to target
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update focus for accessibility
                    target.focus();
                }
            });
        });
    }

    /**
     * Accessibility Enhancements
     */
    setupAccessibility() {
        // Add focus indicators for keyboard navigation
        this.setupFocusManagement();
        
        // Add ARIA live regions for dynamic content
        this.setupLiveRegions();
        
        // Handle reduced motion preference
        this.handleReducedMotion();
        
        // Setup skip links
        this.setupSkipLinks();
    }

    setupFocusManagement() {
        // Track focus changes for better visibility
        let focusedElement = null;
        
        document.addEventListener('focusin', (e) => {
            focusedElement = e.target;
        });
        
        document.addEventListener('focusout', (e) => {
            focusedElement = null;
        });
        
        // Handle focus trapping in mobile menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const mobileNav = document.querySelector('.flwins-nav.active');
                if (mobileNav) {
                    this.trapFocus(e, mobileNav);
                }
            }
        });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    setupLiveRegions() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'flwins-live-region';
        document.body.appendChild(liveRegion);
    }

    announce(message) {
        const liveRegion = document.getElementById('flwins-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    handleReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (prefersReducedMotion.matches) {
            document.documentElement.style.setProperty('scroll-behavior', 'auto');
        }
    }

    setupSkipLinks() {
        // Add skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'flwins-skip-link sr-only';
        skipLink.addEventListener('focus', () => {
            skipLink.classList.remove('sr-only');
        });
        skipLink.addEventListener('blur', () => {
            skipLink.classList.add('sr-only');
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Lazy Loading for Images
     */
    setupLazyLoading() {
        // Use Intersection Observer for lazy loading if supported
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without Intersection Observer
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    /**
     * Form Enhancement (for future use)
     */
    setupForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                }
            });
            
            // Real-time validation
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
            });
        });
    }

    validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        let isValid = true;
        let errorMessage = '';
        
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        } else if (field.type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address.';
        }
        
        this.updateFieldStatus(field, isValid, errorMessage);
        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    updateFieldStatus(field, isValid, errorMessage) {
        const errorId = `${field.id || field.name}-error`;
        let errorElement = document.getElementById(errorId);
        
        // Remove existing error styling
        field.classList.remove('error');
        field.removeAttribute('aria-describedby');
        
        if (errorElement) {
            errorElement.remove();
        }
        
        if (!isValid) {
            // Add error styling
            field.classList.add('error');
            field.setAttribute('aria-describedby', errorId);
            
            // Create error message element
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'flwins-field-error';
            errorElement.textContent = errorMessage;
            errorElement.setAttribute('role', 'alert');
            
            field.parentNode.appendChild(errorElement);
        }
    }

    /**
     * Analytics and Tracking (for future implementation)
     */
    trackEvent(category, action, label = null) {
        // Placeholder for analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
        
        console.log('Track Event:', { category, action, label });
    }

    /**
     * Performance Monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if ('performance' in window) {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                
                console.log('Page Load Time:', loadTime + 'ms');
                
                // Track performance if analytics is available
                this.trackEvent('Performance', 'Page Load Time', Math.round(loadTime / 100) * 100);
            }
        });
    }

    /**
     * Authentication State Management
     */
    async setupAuthentication() {
        try {
            console.log('Checking authentication status...');
            
            // Use our new auth status endpoint
            const response = await fetch('/api/auth/status', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const authData = await response.json();
                console.log('Auth response:', authData);
                
                if (authData.authenticated && authData.user) {
                    // User is authenticated
                    this.handleAuthenticatedUser(authData.user);
                } else {
                    // User is not authenticated
                    this.handleAnonymousUser();
                }
            } else {
                console.log('Auth endpoint returned error:', response.status);
                this.handleAnonymousUser();
            }
        } catch (error) {
            console.log('Authentication check failed, assuming anonymous user:', error);
            this.handleAnonymousUser();
        }
    }

    handleAuthenticatedUser(userInfo) {
        console.log('User authenticated:', userInfo);
        
        const anonymousActions = document.getElementById('anonymous-actions');
        const authenticatedActions = document.getElementById('authenticated-actions');
        const profileNameElement = document.getElementById('profile-name');

        if (anonymousActions) {
            anonymousActions.style.display = 'none';
            console.log('Hidden anonymous actions');
        }
        if (authenticatedActions) {
            authenticatedActions.style.display = 'flex';
            console.log('Shown authenticated actions');
        }
        
        if (profileNameElement) {
            const displayName = userInfo.name || userInfo.email || 'User';
            // Extract first name or part before @ for email
            const shortName = displayName.includes('@') ? 
                displayName.split('@')[0] : 
                displayName.split(' ')[0];
            profileNameElement.textContent = shortName;
            console.log('Set profile name to:', shortName);
        }

        // Setup profile dropdown
        this.setupProfileDropdown();
    }

    handleAnonymousUser() {
        console.log('User not authenticated, showing anonymous actions');
        
        const anonymousActions = document.getElementById('anonymous-actions');
        const authenticatedActions = document.getElementById('authenticated-actions');

        if (anonymousActions) {
            anonymousActions.style.display = 'flex';
            console.log('Shown anonymous actions');
        }
        if (authenticatedActions) {
            authenticatedActions.style.display = 'none';
            console.log('Hidden authenticated actions');
        }
    }

    setupProfileDropdown() {
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-menu');

        if (!profileBtn || !profileMenu) return;

        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', !isExpanded);
        });

        // Close profile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                profileBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

/**
 * Utility Functions
 */
const FLWINSUtils = {
    /**
     * Debounce function to limit the rate of function calls
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function to limit function execution
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Get element offset from top of document
     */
    getOffset(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    }
};

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = new FLWINSApp();
    
    // Make app instance globally available for debugging
    window.FLWINSApp = app;
    window.FLWINSUtils = FLWINSUtils;
    
    console.log('FL WINS application initialized successfully');
});