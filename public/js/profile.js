/**
 * Profile Page JavaScript
 * Handles profile data loading and intake submission
 */

class ProfileManager {
  constructor() {
    this.form = document.getElementById("intake-form");
    this.toggleButton = document.getElementById("intake-form-toggle");
    this.cancelButton = document.getElementById("intake-form-cancel");
    this.readonlyName = document.getElementById("readonly-name");
    this.readonlyEmail = document.getElementById("readonly-email");
    this.displayNameElement = document.getElementById("profile-display-name");
    this.profile = null;
    if (this.toggleButton) {
      this.toggleButton.setAttribute("aria-expanded", "false");
    }
    this.init();
  }

  async init() {
    await this.loadUserProfile();
    this.setupEventHandlers();
  }

  async loadUserProfile() {
    try {
      const response = await fetch("/api/profile", {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.showError("Please sign in to view your profile.");
          return;
        }
        const errorText = await response.text();
        console.error("Failed to load user profile", errorText);
        this.showError("Failed to load profile information.");
        return;
      }

      const data = await response.json();
      this.populateProfile(data.profile);
    } catch (error) {
      console.error("Profile loading error:", error);
      this.showError("Error loading profile information.");
    }
  }

  populateProfile(profileData = {}) {
    if (!profileData || typeof profileData !== "object") {
      this.showError("Unable to display profile details.");
      return;
    }

    this.profile = profileData;

    const displayName =
      profileData.displayName ||
      `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
      profileData.email ||
      "User";
    const email = profileData.email || "";

    if (this.displayNameElement) {
      this.displayNameElement.textContent = displayName || "User";
    }

    if (this.readonlyName) {
      this.readonlyName.value = displayName || "Not available";
    }

    if (this.readonlyEmail) {
      this.readonlyEmail.value = email || "Not available";
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
      phone: profileData.phone,
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value ?? "";
      }
    });

    const emailInput = document.getElementById("email");
    if (emailInput) {
      if (profileData.email) {
        emailInput.setAttribute("readonly", "readonly");
      } else {
        emailInput.removeAttribute("readonly");
      }
    }
  }

  setupEventHandlers() {
    if (this.toggleButton) {
      this.toggleButton.addEventListener("click", () =>
        this.toggleIntakeForm()
      );
    }

    if (this.cancelButton) {
      this.cancelButton.addEventListener("click", () =>
        this.toggleIntakeForm(false)
      );
    }

    if (this.form) {
      this.form.addEventListener("submit", (event) =>
        this.handleFormSubmit(event)
      );
    }
  }

  toggleIntakeForm(forceState) {
    if (!this.form || !this.toggleButton) {
      return;
    }

    const isHidden = this.form.hasAttribute("hidden");
    const shouldShow = typeof forceState === "boolean" ? forceState : isHidden;

    if (shouldShow) {
      this.prefillIntakeForm(this.profile || {});
      this.form.removeAttribute("hidden");
      this.toggleButton.setAttribute("aria-expanded", "true");
      this.toggleButton.textContent = "Hide Common Intake Form";
    } else {
      this.form.setAttribute("hidden", "hidden");
      this.toggleButton.setAttribute("aria-expanded", "false");
      this.toggleButton.textContent = "Open Common Intake Form";
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
      if (typeof value === "string") {
        payload[key] = value.trim();
      }
    }

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.showError(errorData.error || "Failed to submit intake form.");
        return;
      }

      const data = await response.json().catch(() => ({}));
      this.showSuccess("Intake form submitted successfully.");

        // Surface Graph account creation result if available
        if (data && data.accountCreation) {
          const ac = data.accountCreation;
          if (ac.created) {
            const upn = ac.userPrincipalName || "user";
            this.showSuccess(`Account created in Entra ID: ${upn}`);
          } else if (ac.invited) {
            const email = ac.invitedEmail || "user";
            this.showSuccess(`Invitation sent to: ${email}`);
            if (ac.inviteRedeemUrl) {
              this.showSuccess(`Redeem link: ${ac.inviteRedeemUrl}`);
            }
          } else if (ac.error) {
            this.showError(`Account creation failed: ${ac.error}`);
          }
        }

        // Show EFSMOD deep link if available
        if (data && data.efsmodeInvite && data.efsmodeInvite.deepLink) {
          this.renderEfmodLink(data.efsmodeInvite.deepLink);
        }

      // Keep the form visible so the link appears under the submit button
      // Hide only if no deep link returned
      if (!(data && data.efsmodeInvite && data.efsmodeInvite.deepLink)) {
        this.toggleIntakeForm(false);
      }
    } catch (error) {
      console.error("Intake submission error:", error);
      this.showError("An unexpected error occurred while submitting the form.");
    }
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `flwins-notification flwins-notification-${type}`;
    notification.textContent = message;

    // Compute top offset so the notification appears below any fixed header/navbar
    const header = document.querySelector(".flwins-header");
    const topOffset = header ? header.getBoundingClientRect().bottom + 12 : 20;

    notification.style.position = "fixed";
    notification.style.top = `${topOffset}px`;
    notification.style.right = "20px";
    notification.style.backgroundColor =
      type === "success" ? "#10b981" : "#ef4444";
    notification.style.color = "white";
    notification.style.padding = "12px 24px";
    notification.style.borderRadius = "8px";
    notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    // Use a very large z-index to ensure it sits above navbars and other site chrome
    notification.style.zIndex = "2147483647";
    notification.style.maxWidth = "400px";
    notification.style.transform = "translateX(100%)";
    notification.style.transition = "transform 0.3s ease";

    // Accessibility: treat as an ARIA status/alert
    notification.setAttribute("role", "status");
    notification.setAttribute(
      "aria-live",
      type === "success" ? "polite" : "assertive"
    );

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  renderEfmodLink(url) {
    try {
      let slot = document.getElementById('efsmode-deeplink');
      // Fallback container if placeholder is missing
      const container = slot || document.getElementById('intake-form')?.parentElement || document.body;
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'efsmode-deeplink';
        slot.style.marginTop = '12px';
        container.appendChild(slot);
      }
      slot.innerHTML = '';
      const title = document.createElement('div');
      title.textContent = 'Continue in EFSMOD:';
      title.style.fontWeight = '600';
      title.style.marginBottom = '8px';
      const a = document.createElement('a');
      a.href = url;
      a.textContent = 'Open School Readiness Form in EFSMOD';
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      a.style.color = '#2563eb';
      slot.appendChild(title);
      slot.appendChild(a);
    } catch (e) {
      console.warn('Failed to render EFSMOD link:', e);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ProfileManager();
});
