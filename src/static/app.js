document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutBtn = document.getElementById("logout-btn");
  const authRequiredMessage = document.getElementById("auth-required-message");
  const loginLink = document.getElementById("login-link");
  const closeModal = document.querySelector(".close");

  let isAuthenticated = false;

  // Check authentication status on load
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      isAuthenticated = data.authenticated;
      
      if (isAuthenticated) {
        userIcon.classList.remove("hidden");
        document.getElementById("user-info").textContent = `Logged in as: ${data.username}`;
        signupForm.classList.remove("hidden");
        authRequiredMessage.classList.add("hidden");
      } else {
        userIcon.classList.add("hidden");
        signupForm.classList.add("hidden");
        authRequiredMessage.classList.remove("hidden");
      }
      
      // Reload activities to show/hide delete buttons
      fetchActivities();
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  }

  // Show login modal
  function showLoginModal() {
    loginModal.classList.remove("hidden");
  }

  // Hide login modal
  function hideLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  }

  // Event listeners for login UI
  userIcon.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  loginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginModal();
  });

  closeModal.addEventListener("click", hideLoginModal);

  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      hideLoginModal();
    }
    if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          hideLoginModal();
          checkAuthStatus();
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Failed to login. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      userDropdown.classList.add("hidden");
      checkAuthStatus();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${isAuthenticated ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus();
});
