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
                console.error('Failed to load user profile');
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

        const displayName = profileData.displayName || profileData.email || 'User';
        const displayNameElement = document.getElementById('profile-display-name');
        if (displayNameElement) {
            displayNameElement.textContent = displayName;
        }

        this.setFieldValue('firstName', profileData.firstName);
        this.setFieldValue('lastName', profileData.lastName);
        this.setFieldValue('email', profileData.email);
        this.setFieldValue('department', profileData.department);
        this.setFieldValue('jobTitle', profileData.jobTitle);
        this.setFieldValue('officeLocation', profileData.officeLocation);
        this.setFieldValue('workPhone', profileData.phone);

        // Pre-fill editable phone field with work phone if available
        const editablePhone = document.getElementById('phone');
        if (editablePhone && profileData.phone && !editablePhone.value) {
            editablePhone.value = profileData.phone;
        }

        // Save claims for potential future use
        this.claims = claims;
        this.graphProfile = graphProfile;

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
            element.value = value || '';
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
                document.getElementById('address').value = profile.address || '';
                document.getElementById('city').value = profile.city || '';
                document.getElementById('state').value = profile.state || '';
                document.getElementById('zipCode').value = profile.zipCode || '';
                document.getElementById('phone').value = profile.phone || '';
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
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode'),
            phone: formData.get('phone')
        };

        try {
            // Save to localStorage (since Azure AD fields are read-only)
            localStorage.setItem('flwins-profile', JSON.stringify(profileData));
            
            // Optional: Send to server for additional processing
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                this.showSuccess('Profile updated successfully!');
            } else {
                this.showError('Failed to update profile on server, but changes saved locally.');
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