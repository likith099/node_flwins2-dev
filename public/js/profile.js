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
            const response = await fetch('/api/profile');
            
            if (response.ok) {
                const data = await response.json();
                this.populateProfile(data.user);
            } else {
                console.error('Failed to load user profile');
                this.showError('Failed to load profile information');
            }
        } catch (error) {
            console.error('Profile loading error:', error);
            this.showError('Error loading profile information');
        }
    }

    populateProfile(userInfo) {
        if (!userInfo || !userInfo.user_claims) {
            console.error('Invalid user info received');
            return;
        }

        const claims = userInfo.user_claims;
        
        // Extract user information from claims
        const nameClaim = this.findClaim(claims, ['name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']);
        const emailClaim = this.findClaim(claims, ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'email']);
        const givenNameClaim = this.findClaim(claims, ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname', 'given_name']);
        const surnameClaim = this.findClaim(claims, ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname', 'family_name']);
        const departmentClaim = this.findClaim(claims, ['department', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/department']);

        // Populate display name
        const displayName = nameClaim?.val || emailClaim?.val || 'User';
        document.getElementById('profile-display-name').textContent = displayName;

        // Populate form fields
        document.getElementById('firstName').value = givenNameClaim?.val || '';
        document.getElementById('lastName').value = surnameClaim?.val || '';
        document.getElementById('email').value = emailClaim?.val || '';
        document.getElementById('department').value = departmentClaim?.val || '';

        // Load additional profile data from local storage or API
        this.loadAdditionalInfo();
    }

    findClaim(claims, claimTypes) {
        for (const claimType of claimTypes) {
            const claim = claims.find(c => c.typ === claimType);
            if (claim) return claim;
        }
        return null;
    }

    loadAdditionalInfo() {
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