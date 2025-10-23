/**
 * Profile Page JavaScript
 * Handles profile data loading and intake submission
 */

class ProfileManager {
    constructor() {
        this.form = document.getElementById('intake-form');
        this.toggleButton = document.getElementById('intake-form-toggle');
        this.cancelButton = document.getElementById('intake-form-cancel');
        this.readonlyName = document.getElementById('readonly-name');
        this.readonlyEmail = document.getElementById('readonly-email');
        this.displayNameElement = document.getElementById('profile-display-name');
        this.profile = null;
        if (this.toggleButton) {
            this.toggleButton.setAttribute('aria-expanded', 'false');
        }
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.setupEventHandlers();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                credentials: 'include',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.showError('Please sign in to view your profile.');
                    return;
                }
                const errorText = await response.text();
                console.error('Failed to load user profile', errorText);
                this.showError('Failed to load profile information.');
                return;
            }

            const data = await response.json();
            this.populateProfile(data.profile);
        } catch (error) {
            console.error('Profile loading error:', error);
            this.showError('Error loading profile information.');
        }
    }

    populateProfile(profileData = {}) {
        if (!profileData || typeof profileData !== 'object') {
            this.showError('Unable to display profile details.');
            return;
        }

        this.profile = profileData;

        const displayName = profileData.displayName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || profileData.email || 'User';
        const email = profileData.email || '';

        if (this.displayNameElement) {
            this.displayNameElement.textContent = displayName || 'User';
        }

        if (this.readonlyName) {
            this.readonlyName.value = displayName || 'Not available';
        }

        if (this.readonlyEmail) {
            this.readonlyEmail.value = email || 'Not available';
        }

        this.prefillIntakeForm(profileData);
    }

    prefillIntakeForm(profileData) {
        if (!this.form) {
            return;
        }

        const fields = {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            department: profileData.department,
            jobTitle: profileData.jobTitle,
            officeLocation: profileData.officeLocation,
            workPhone: profileData.workPhone || profileData.phone,
            address: profileData.address,
            city: profileData.city,
            state: profileData.state,
            zipCode: profileData.zipCode,
            phone: profileData.phone
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value ?? '';
            }
        });

        const emailInput = document.getElementById('email');
        if (emailInput) {
            if (profileData.email) {
                emailInput.setAttribute('readonly', 'readonly');
            } else {
                emailInput.removeAttribute('readonly');
            }
        }
    }

    setupEventHandlers() {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleIntakeForm());
        }

        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.toggleIntakeForm(false));
        }

        if (this.form) {
            this.form.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }
    }

    toggleIntakeForm(forceState) {
        if (!this.form || !this.toggleButton) {
            return;
        }

        const isHidden = this.form.hasAttribute('hidden');
        const shouldShow = typeof forceState === 'boolean' ? forceState : isHidden;

        if (shouldShow) {
            this.prefillIntakeForm(this.profile || {});
            this.form.removeAttribute('hidden');
            this.toggleButton.setAttribute('aria-expanded', 'true');
            this.toggleButton.textContent = 'Hide Common Intake Form';
        } else {
            this.form.setAttribute('hidden', 'hidden');
            this.toggleButton.setAttribute('aria-expanded', 'false');
            this.toggleButton.textContent = 'Open Common Intake Form';
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        if (!this.form) {
            return;
        }

        const formData = new FormData(this.form);
        const payload = {};

        for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                payload[key] = value.trim();
            }
        }

        try {
            const response = await fetch('/api/intake', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.showError(errorData.error || 'Failed to submit intake form.');
                return;
            }

            this.showSuccess('Intake form submitted successfully.');
            this.toggleIntakeForm(false);
        } catch (error) {
            console.error('Intake submission error:', error);
            this.showError('An unexpected error occurred while submitting the form.');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `flwins-notification flwins-notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});