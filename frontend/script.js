// API URL configuration - use relative path when served from Flask
const API_URL = '/api';

// Global state
let currentUser = null;
let currentPetId = null;

// Make functions globally accessible for dynamically generated HTML
window.deletePet = deletePet;
window.viewMedications = viewMedications;
window.showMedicationForm = showMedicationForm;
window.deleteMedication = deleteMedication;
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.register = register;
window.login = login;
window.logout = logout;
window.sendMessage = sendMessage;
window.checkAuthStatus = checkAuthStatus;
window.checkDashboardAuth = checkDashboardAuth;
window.showAddPetForm = showAddPetForm;
window.closeAddPetForm = closeAddPetForm;
window.showAddPostForm = showAddPostForm;
window.closeAddPostForm = closeAddPostForm;
window.closeMedicationForm = closeMedicationForm;

// ============ Authentication Check Functions ============

async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_URL}/current-user`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      currentUser = await response.json();
      updateAuthButton(true);
      showAuthenticatedContent();
    } else {
      currentUser = null;
      updateAuthButton(false);
      showUnauthenticatedContent();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    currentUser = null;
    updateAuthButton(false);
    showUnauthenticatedContent();
  }
}

async function checkDashboardAuth() {
  try {
    const response = await fetch(`${API_URL}/current-user`, {
      credentials: 'include',
    });
    
    const loadingSpinner = document.getElementById('loading-spinner');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (response.ok) {
      currentUser = await response.json();
      
      // Hide spinner, show dashboard
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      if (dashboardContent) dashboardContent.style.display = 'block';
      
      // Load dashboard data
      loadPets();
      loadCommunityPosts();
      
      // Update logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn && currentUser) {
        logoutBtn.textContent = `Logout (${currentUser.username})`;
      }
    } else {
      // Not authenticated - redirect to home
      showNotification('Please login to access the dashboard', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  } catch (error) {
    console.error('Dashboard auth check error:', error);
    showNotification('Error checking authentication', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
}

function showAuthenticatedContent() {
  // On index.html - show chat, hide login prompt
  const chatContainer = document.getElementById('chat-container');
  const loginPrompt = document.getElementById('login-prompt');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (chatContainer) chatContainer.style.display = 'block';
  if (loginPrompt) loginPrompt.style.display = 'none';
  if (dashboardLink) dashboardLink.style.display = 'inline';
}

function showUnauthenticatedContent() {
  // On index.html - hide chat, show login prompt
  const chatContainer = document.getElementById('chat-container');
  const loginPrompt = document.getElementById('login-prompt');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (chatContainer) chatContainer.style.display = 'none';
  if (loginPrompt) loginPrompt.style.display = 'flex';
  if (dashboardLink) dashboardLink.style.display = 'none';
}

function updateAuthButton(isLoggedIn) {
  const authBtn = document.getElementById('auth-btn');
  const dashboardLink = document.getElementById('dashboard-link');
  
  if (authBtn) {
    if (isLoggedIn && currentUser) {
      authBtn.textContent = `👤 ${currentUser.username}`;
      authBtn.onclick = () => window.location.href = 'dashboard.html';
      authBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
      authBtn.textContent = 'Login';
      authBtn.onclick = showAuthModal;
      authBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  }
  
  if (dashboardLink) {
    dashboardLink.style.display = isLoggedIn ? 'inline' : 'none';
    dashboardLink.href = 'dashboard.html';
  }
}

// ============ Authentication Functions ============

function showAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('auth-error').textContent = '';
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
    document.getElementById('auth-error').textContent = '';
  }
}

async function register() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const errorElement = document.getElementById('auth-error');
  
  if (!username || !email) {
    errorElement.textContent = 'Please provide both username and email';
    return;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorElement.textContent = 'Please enter a valid email address';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email }),
    });
    
    if (response.ok) {
      currentUser = await response.json();
      closeAuthModal();
      updateAuthButton(true);
      showAuthenticatedContent();
      showNotification('Registration successful! Welcome to PawCare AI! 🎉', 'success');
    } else {
      const error = await response.json();
      errorElement.textContent = error.error || 'Registration failed';
    }
  } catch (error) {
    console.error('Registration error:', error);
    errorElement.textContent = 'Network error. Please try again.';
  }
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const errorElement = document.getElementById('auth-error');
  
  if (!username) {
    errorElement.textContent = 'Please provide username';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username }),
    });
    
    if (response.ok) {
      currentUser = await response.json();
      closeAuthModal();
      updateAuthButton(true);
      showAuthenticatedContent();
      showNotification(`Welcome back, ${currentUser.username}! 👋`, 'success');
    } else {
      const error = await response.json();
      errorElement.textContent = error.error || 'User not found';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorElement.textContent = 'Network error. Please try again.';
  }
}

async function logout() {
  try {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    currentUser = null;
    showNotification('Logged out successfully. See you soon! 👋', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = 'index.html';
  }
}

// ============ Chat Functions ============

async function sendMessage() {
  // Check if user is logged in
  if (!currentUser) {
    showNotification('Please login to chat with PawCare AI 🔒', 'error');
    showAuthModal();
    return;
  }
  
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  appendMessage('user', message);
  input.value = '';
  input.disabled = true;
  
  // Show typing indicator
  const typingIndicator = appendTypingIndicator();

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });
    
    const data = await response.json();
    
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    if (response.ok) {
      appendMessage('ai', data.answer);
    } else {
      if (response.status === 401) {
        appendMessage('ai', 'Your session has expired. Please login again. 🔒');
        currentUser = null;
        updateAuthButton(false);
        showUnauthenticatedContent();
      } else {
        appendMessage('ai', data.answer || 'Sorry, I encountered an error. Please try again.');
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    if (typingIndicator) {
      typingIndicator.remove();
    }
    appendMessage('ai', 'Sorry, there was a network error. Please check your connection.');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function appendMessage(sender, text) {
  const chat = document.getElementById('chat-history');
  if (!chat) return;
  
  const msg = document.createElement('div');
  msg.className = sender === 'user' ? 'user-msg' : 'ai-msg';
  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function appendTypingIndicator() {
  const chat = document.getElementById('chat-history');
  if (!chat) return null;
  
  const indicator = document.createElement('div');
  indicator.className = 'ai-msg typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(indicator);
  chat.scrollTop = chat.scrollHeight;
  return indicator;
}

// ============ Pet Management Functions ============

async function loadPets() {
  try {
    const response = await fetch(`${API_URL}/pets`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        showNotification('Please login to view your pets', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
      return;
    }
    
    const pets = await response.json();
    const container = document.getElementById('pets-list');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (pets.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#999;">
          <p style="font-size:18px; margin-bottom:10px;">🐾 No pets yet!</p>
          <p>Add your first pet to get started with personalized care recommendations.</p>
        </div>
      `;
      return;
    }
    
    pets.forEach(pet => {
      const card = document.createElement('div');
      card.className = 'pet-card';
      card.innerHTML = `
        <h3>${escapeHtml(pet.name)} 🐾</h3>
        <p><strong>Species:</strong> ${escapeHtml(pet.species)}</p>
        <p><strong>Breed:</strong> ${escapeHtml(pet.breed) || 'N/A'}</p>
        <p><strong>Age:</strong> ${pet.age || 'N/A'} years</p>
        <p><strong>Weight:</strong> ${pet.weight || 'N/A'} kg</p>
        ${pet.medical_notes ? `<p><strong>Medical Notes:</strong> ${escapeHtml(pet.medical_notes)}</p>` : ''}
        ${pet.dietary_preferences ? `<p><strong>Diet:</strong> ${escapeHtml(pet.dietary_preferences)}</p>` : ''}
        <div class="pet-card-actions">
          <button class="btn-medications" onclick="viewMedications(${pet.id})">💊 Medications</button>
          <button class="btn-delete" onclick="deletePet(${pet.id})">🗑️ Delete</button>
        </div>
        <div id="medications-${pet.id}" class="medications-list" style="display:none;"></div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading pets:', error);
    showNotification('Failed to load pets', 'error');
  }
}

function showAddPetForm() {
  const modal = document.getElementById('add-pet-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeAddPetForm() {
  const modal = document.getElementById('add-pet-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('pet-form').reset();
  }
}

async function addPet(event) {
  event.preventDefault();
  
  const petData = {
    name: document.getElementById('pet-name').value.trim(),
    species: document.getElementById('pet-species').value.trim(),
    breed: document.getElementById('pet-breed').value.trim() || null,
    age: parseInt(document.getElementById('pet-age').value) || null,
    weight: parseFloat(document.getElementById('pet-weight').value) || null,
    medical_notes: document.getElementById('pet-medical').value.trim() || null,
    dietary_preferences: document.getElementById('pet-diet').value.trim() || null,
  };
  
  if (!petData.name || !petData.species) {
    showNotification('Name and species are required', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(petData),
    });
    
    if (response.ok) {
      closeAddPetForm();
      loadPets();
      showNotification(`${petData.name} added successfully! 🎉`, 'success');
    } else {
      const error = await response.json();
      showNotification(error.error || 'Failed to add pet', 'error');
    }
  } catch (error) {
    console.error('Add pet error:', error);
    showNotification('Network error', 'error');
  }
}

async function deletePet(petId) {
  if (!confirm('Are you sure you want to delete this pet? This will also delete all associated medications.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/pets/${petId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (response.ok) {
      loadPets();
      showNotification('Pet deleted successfully', 'success');
    } else {
      showNotification('Failed to delete pet', 'error');
    }
  } catch (error) {
    console.error('Delete pet error:', error);
    showNotification('Failed to delete pet', 'error');
  }
}

// ============ Medication Functions ============

async function viewMedications(petId) {
  const medContainer = document.getElementById(`medications-${petId}`);
  
  if (!medContainer) return;
  
  if (medContainer.style.display === 'block') {
    medContainer.style.display = 'none';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/pets/${petId}/medications`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const medications = await response.json();
      medContainer.innerHTML = '';
      
      if (medications.length === 0) {
        medContainer.innerHTML = '<p style="text-align:center; padding:10px; color:#999;">No medications added yet</p>';
      } else {
        medications.forEach(med => {
          const medItem = document.createElement('div');
          medItem.className = 'medication-item';
          medItem.innerHTML = `
            <div>
              <p style="font-weight:600; margin-bottom:5px;">${escapeHtml(med.name)}</p>
              ${med.dosage ? `<p style="font-size:13px;">Dosage: ${escapeHtml(med.dosage)}</p>` : ''}
              ${med.frequency ? `<p style="font-size:13px;">Frequency: ${escapeHtml(med.frequency)}</p>` : ''}
              ${med.time_of_day ? `<p style="font-size:13px;">Time: ${escapeHtml(med.time_of_day)}</p>` : ''}
              ${med.notes ? `<p style="font-size:13px; color:#666;">Notes: ${escapeHtml(med.notes)}</p>` : ''}
            </div>
            <button class="btn-delete" onclick="deleteMedication(${med.id}, ${petId})" style="align-self:center;">Delete</button>
          `;
          medContainer.appendChild(medItem);
        });
      }
      
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-primary';
      addBtn.textContent = '+ Add Medication';
      addBtn.style.marginTop = '10px';
      addBtn.style.width = '100%';
      addBtn.onclick = () => showMedicationForm(petId);
      medContainer.appendChild(addBtn);
      
      medContainer.style.display = 'block';
    } else {
      showNotification('Failed to load medications', 'error');
    }
  } catch (error) {
    console.error('Error loading medications:', error);
    showNotification('Failed to load medications', 'error');
  }
}

function showMedicationForm(petId) {
  currentPetId = petId;
  document.getElementById('medication-pet-id').value = petId;
  const modal = document.getElementById('add-medication-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeMedicationForm() {
  const modal = document.getElementById('add-medication-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('medication-form').reset();
    currentPetId = null;
  }
}

async function addMedication(event) {
  event.preventDefault();
  
  const petId = document.getElementById('medication-pet-id').value;
  const medData = {
    name: document.getElementById('med-name').value.trim(),
    dosage: document.getElementById('med-dosage').value.trim() || null,
    frequency: document.getElementById('med-frequency').value.trim() || null,
    time_of_day: document.getElementById('med-time').value.trim() || null,
    notes: document.getElementById('med-notes').value.trim() || null,
  };
  
  if (!medData.name) {
    showNotification('Medication name is required', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/pets/${petId}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(medData),
    });
    
    if (response.ok) {
      closeMedicationForm();
      viewMedications(parseInt(petId));
      showNotification('Medication added successfully! 💊', 'success');
    } else {
      const error = await response.json();
      showNotification(error.error || 'Failed to add medication', 'error');
    }
  } catch (error) {
    console.error('Add medication error:', error);
    showNotification('Failed to add medication', 'error');
  }
}

async function deleteMedication(medId, petId) {
  if (!confirm('Delete this medication?')) return;
  
  try {
    const response = await fetch(`${API_URL}/medications/${medId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (response.ok) {
      showNotification('Medication deleted', 'success');
      viewMedications(petId);
    } else {
      showNotification('Failed to delete medication', 'error');
    }
  } catch (error) {
    console.error('Delete medication error:', error);
    showNotification('Failed to delete medication', 'error');
  }
}

// ============ Community Functions ============

async function loadCommunityPosts() {
  try {
    const response = await fetch(`${API_URL}/community`);
    const posts = await response.json();
    
    const container = document.getElementById('community-posts');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (posts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:#999; padding:30px;">
          <p style="font-size:16px;">No posts yet. Be the first to share! 📝</p>
        </div>
      `;
      return;
    }
    
    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = `
        <h4>${escapeHtml(post.title)}
          <span class="post-type-badge post-type-${post.post_type}">${post.post_type}</span>
        </h4>
        <p>${escapeHtml(post.content)}</p>
        <small>By ${escapeHtml(post.author)} • ${new Date(post.created_at).toLocaleDateString()}</small>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading community posts:', error);
  }
}

function showAddPostForm() {
  if (!currentUser) {
    showNotification('Please login to post 🔒', 'error');
    showAuthModal();
    return;
  }
  const modal = document.getElementById('add-post-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeAddPostForm() {
  const modal = document.getElementById('add-post-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('post-form').reset();
  }
}

async function addCommunityPost(event) {
  event.preventDefault();
  
  const postData = {
    title: document.getElementById('post-title').value.trim(),
    content: document.getElementById('post-content').value.trim(),
    post_type: document.getElementById('post-type').value,
  };
  
  if (!postData.title || !postData.content) {
    showNotification('Title and content are required', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(postData),
    });
    
    if (response.ok) {
      closeAddPostForm();
      loadCommunityPosts();
      showNotification('Post shared successfully! 📣', 'success');
    } else {
      const error = await response.json();
      showNotification(error.error || 'Failed to create post', 'error');
    }
  } catch (error) {
    console.error('Add post error:', error);
    showNotification('Failed to create post', 'error');
  }
}

// ============ Utility Functions ============

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
    max-width: 350px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modals when clicking outside
window.onclick = function(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  .typing-indicator {
    display: flex;
    gap: 5px;
    padding: 15px 20px !important;
  }
  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #667eea;
    animation: typing 1.4s infinite;
  }
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
    30% { transform: translateY(-10px); opacity: 1; }
  }
`;
document.head.appendChild(style);

console.log('🐾 PawCare AI Frontend Loaded Successfully ✓');
