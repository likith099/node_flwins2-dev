/**
 * Profile Page JavaScript
 * Handles profile data loading and form submission
 */

class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.setupFormHandlers();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.populateProfile(data.profile, data.claims, data.graph);
            } else if (response.status === 401) {
                console.warn('User not authenticated when loading profile');
                this.showError('Please sign in to view your profile.');
            } else {
                const errorText = await response.text();
                console.error('Failed to load user profile', errorText);
                this.showError('Failed to load profile information');
            }
        } catch (error) {
            console.error('Profile loading error:', error);
            this.showError('Error loading profile information');
        }
    }

    populateProfile(profileData = {}, claims = [], graphProfile = null) {
        if (!profileData || typeof profileData !== 'object') {
            console.error('Invalid profile data received');
            this.showError('Unable to display profile details.');
            return;
        }

        this.claims = claims;
        this.graphProfile = graphProfile;

        const displayName = profileData.displayName || profileData.email || 'User';
        const displayNameElement = document.getElementById('profile-display-name');
        if (displayNameElement) {
            displayNameElement.textContent = displayName;
        }

        const fieldsToReset = ['firstName', 'lastName', 'department', 'jobTitle', 'officeLocation', 'workPhone', 'address', 'city', 'state', 'zipCode', 'phone'];
        fieldsToReset.forEach((field) => this.setFieldValue(field, ''));

        this.setFieldValue('firstName', profileData.firstName);
        this.setFieldValue('lastName', profileData.lastName);
        this.setFieldValue('email', profileData.email);
        this.setFieldValue('department', profileData.department);
        this.setFieldValue('jobTitle', profileData.jobTitle);
        this.setFieldValue('officeLocation', profileData.officeLocation);
        this.setFieldValue('workPhone', profileData.workPhone || profileData.phone);
        this.setFieldValue('address', profileData.address);
        this.setFieldValue('city', profileData.city);
        this.setFieldValue('state', profileData.state);
        this.setFieldValue('zipCode', profileData.zipCode);
        this.setFieldValue('phone', profileData.phone);

        // Pre-fill editable phone field with work phone if available
        const editablePhone = document.getElementById('phone');
        if (editablePhone && profileData.phone && !editablePhone.value) {
            editablePhone.value = profileData.phone;
        }

        // Load additional profile data from local storage or API
        this.loadAdditionalInfo({
            address: profileData.address,
            city: profileData.city,
            state: profileData.state,
            zipCode: profileData.zipCode,
            phone: editablePhone?.value || profileData.phone
        });
    }

    setFieldValue(fieldId, value) {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = value ?? '';
        }
    }

    loadAdditionalInfo(defaultValues = {}) {
        // Apply default values provided (e.g., from Azure profile)
        if (defaultValues && typeof defaultValues === 'object') {
            if (defaultValues.address !== undefined) {
                this.setFieldValue('address', defaultValues.address);
            }
            if (defaultValues.city !== undefined) {
                this.setFieldValue('city', defaultValues.city);
            }
            if (defaultValues.state !== undefined) {
                this.setFieldValue('state', defaultValues.state);
            }
            if (defaultValues.zipCode !== undefined) {
                this.setFieldValue('zipCode', defaultValues.zipCode);
            }
            if (defaultValues.phone !== undefined) {
                this.setFieldValue('phone', defaultValues.phone);
            }
        }

        // Load additional profile information from localStorage
        const savedProfile = localStorage.getItem('flwins-profile');
        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                if (profile.address) this.setFieldValue('address', profile.address);
                if (profile.city) this.setFieldValue('city', profile.city);
                if (profile.state) this.setFieldValue('state', profile.state);
                if (profile.zipCode) this.setFieldValue('zipCode', profile.zipCode);
                if (profile.phone) this.setFieldValue('phone', profile.phone);
            } catch (error) {
                console.error('Error loading saved profile data:', error);
            }
        }
    }

    setupFormHandlers() {
        const form = document.getElementById('profile-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const profileData = {
            firstName: formData.get('firstName')?.trim() || '',
            lastName: formData.get('lastName')?.trim() || '',
            department: formData.get('department')?.trim() || '',
            jobTitle: formData.get('jobTitle')?.trim() || '',
            officeLocation: formData.get('officeLocation')?.trim() || '',
            workPhone: formData.get('workPhone')?.trim() || '',
            address: formData.get('address')?.trim() || '',
            city: formData.get('city')?.trim() || '',
            state: formData.get('state')?.trim() || '',
            zipCode: formData.get('zipCode')?.trim() || '',
            phone: formData.get('phone')?.trim() || ''
        };

        const payload = {};
        Object.entries(profileData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                payload[key] = value;
            }
        });

        try {
            // Save to localStorage (since Azure AD fields are read-only)
            localStorage.setItem('flwins-profile', JSON.stringify({
                address: profileData.address,
                city: profileData.city,
                state: profileData.state,
                zipCode: profileData.zipCode,
                phone: profileData.phone
            }));

            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.showSuccess('Profile updated successfully!');
                await this.loadUserProfile();
            } else {
                const errorData = await response.json().catch(() => ({}));
                this.showError(errorData.message || errorData.error || 'Failed to update profile on server.');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showError('Error updating profile. Changes saved locally.');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `flwins-notification flwins-notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
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

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize profile manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});