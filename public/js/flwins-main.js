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
        
        // Setup authentication with delay to ensure DOM is ready
        setTimeout(() => this.setupAuthentication(), 100);
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
     * Authentication State Management - Simplified
     */
    async setupAuthentication() {
        console.log('🔐 Starting simple authentication check...');
        
        try {
            // Try the direct Azure endpoint first - this is most reliable
            const response = await fetch('/.auth/me', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (response.ok) {
                const authData = await response.json();
                console.log('✅ Azure auth response:', authData);
                
                if (authData && authData.length > 0 && authData[0].user_id) {
                    // User is authenticated
                    const userInfo = authData[0];
                    const user = {
                        id: userInfo.user_id,
                        name: this.extractUserName(userInfo),
                        email: this.extractUserEmail(userInfo)
                    };
                    console.log('👤 Extracted user info:', user);
                    this.handleAuthenticatedUser(user);
                    return;
                }
            }
            
            // If that didn't work, try our custom endpoint
            console.log('🔍 Trying custom auth endpoint...');
            const customResponse = await fetch('/api/auth/status', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (customResponse.ok) {
                const customData = await customResponse.json();
                console.log('✅ Custom auth response:', customData);
                
                if (customData.authenticated && customData.user) {
                    this.handleAuthenticatedUser(customData.user);
                    return;
                }
            }
        } catch (error) {
            console.log('❌ Authentication check failed:', error);
        }
        
        // Default to anonymous user
        console.log('👤 No authentication found, showing anonymous user');
        this.handleAnonymousUser();
    }

    extractUserName(userInfo) {
        if (!userInfo.user_claims) return userInfo.user_id;
        
        // Try different claim types for name
        const nameClaims = [
            'name',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
            'http://schemas.microsoft.com/identity/claims/displayname',
            'preferred_username'
        ];
        
        for (const claimType of nameClaims) {
            const claim = userInfo.user_claims.find(c => c.typ === claimType);
            if (claim && claim.val) {
                return claim.val;
            }
        }
        
        return userInfo.user_id;
    }

    extractUserEmail(userInfo) {
        if (!userInfo.user_claims) return null;
        
        const emailClaims = [
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            'email',
            'upn'
        ];
        
        for (const claimType of emailClaims) {
            const claim = userInfo.user_claims.find(c => c.typ === claimType);
            if (claim && claim.val) {
                return claim.val;
            }
        }
        
        return null;
    }

    handleAuthenticatedUser(userInfo) {
        console.log('✅ AUTHENTICATED USER DETECTED:', userInfo);
        
        // Get DOM elements
        const anonymousActions = document.getElementById('anonymous-actions');
        const authenticatedActions = document.getElementById('authenticated-actions');
        const profileNameElement = document.getElementById('profile-name');

        // Show/hide appropriate actions
        if (anonymousActions) {
            anonymousActions.style.display = 'none';
            console.log('✅ Hidden Sign In/Create Account buttons');
        }
        
        if (authenticatedActions) {
            authenticatedActions.style.display = 'flex';
            console.log('✅ Shown Profile button');
        }
        
        // Set profile name
        if (profileNameElement) {
            const displayName = userInfo.name || userInfo.email || userInfo.id || 'User';
            const shortName = displayName.includes('@') ? 
                displayName.split('@')[0] : 
                displayName.split(' ')[0];
            profileNameElement.textContent = shortName;
            console.log('✅ Profile name set to:', shortName);
        }

        // Setup profile dropdown
        this.setupProfileDropdown();
    }

    handleAnonymousUser() {
        console.log('❌ ANONYMOUS USER - showing sign in options');
        
        const anonymousActions = document.getElementById('anonymous-actions');
        const authenticatedActions = document.getElementById('authenticated-actions');

        if (anonymousActions) {
            anonymousActions.style.display = 'flex';
            console.log('✅ Shown Sign In/Create Account buttons');
        }
        
        if (authenticatedActions) {
            authenticatedActions.style.display = 'none';
            console.log('✅ Hidden Profile button');  
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

    // Manual authentication refresh for debugging
    async refreshAuthentication() {
        console.log('🔄 Manual authentication refresh triggered...');
        await this.setupAuthentication();
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
    console.log('🚀 DOM loaded, initializing FL WINS application...');
    
    const app = new FLWINSApp();
    
    // Make app instance globally available for debugging
    window.FLWINSApp = app;
    window.FLWINSUtils = FLWINSUtils;
    
    // Make auth functions globally available for testing
    window.refreshAuth = () => app.refreshAuthentication();
    window.checkAuth = () => app.setupAuthentication();
    
    console.log('✅ FL WINS application initialized successfully');
    console.log('💡 Debug commands available:');
    console.log('- window.refreshAuth() - Manually refresh authentication');
    console.log('- window.checkAuth() - Check authentication now');
    console.log('- window.FLWINSApp - Access to main app instance');
    
    // Also try authentication check immediately after a short delay
    setTimeout(() => {
        console.log('🔄 Running immediate auth check...');
        app.setupAuthentication();
    }, 500);
});