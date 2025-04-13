// DOM Elements
const menuToggle = document.getElementById('menu-toggle');
const closeSidebar = document.getElementById('close-sidebar');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');

// Toggle sidebar on mobile
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
}

// Close sidebar with X button on mobile
if (closeSidebar) {
  closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
  });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  }
});

// Responsive adjustments
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    sidebar.classList.remove('active');
  }
});

// Add loading animation
function showLoading() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading...</p>
    </div>
  `;
  document.body.appendChild(loadingOverlay);
}

function hideLoading() {
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Add loading animation to links and forms
document.addEventListener('DOMContentLoaded', () => {
  // Add loading to navigation links
  const navLinks = document.querySelectorAll('.sidebar-nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (link.getAttribute('href') !== '#' && !link.getAttribute('href').startsWith('javascript:')) {
        showLoading();
      }
    });
  });

  // Add loading to forms
  const forms = document.querySelectorAll('form:not([data-no-loading])');
  forms.forEach(form => {
    form.addEventListener('submit', () => {
      showLoading();
    });
  });

  // Add loading to buttons with data-loading attribute
  const loadingButtons = document.querySelectorAll('button[data-loading], a.btn[data-loading]');
  loadingButtons.forEach(button => {
    button.addEventListener('click', () => {
      showLoading();
    });
  });
});

// Button animation
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
  button.addEventListener('click', function(e) {
    const x = e.clientX - e.target.getBoundingClientRect().left;
    const y = e.clientY - e.target.getBoundingClientRect().top;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    this.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});

// Task list horizontal scrolling
function scrollTasks(direction) {
  const taskList = document.querySelector('.task-list.horizontal');
  if (!taskList) return;

  const scrollAmount = 300; // Adjust scroll amount as needed
  const currentScroll = taskList.scrollLeft;

  if (direction === 'left') {
    taskList.scrollTo({
      left: currentScroll - scrollAmount,
      behavior: 'smooth'
    });
  } else {
    taskList.scrollTo({
      left: currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  }
}

// Show/hide scroll arrows based on scroll position
document.addEventListener('DOMContentLoaded', () => {
  const taskList = document.querySelector('.task-list.horizontal');
  const leftArrow = document.querySelector('.scroll-arrow.left');
  const rightArrow = document.querySelector('.scroll-arrow.right');

  if (taskList && leftArrow && rightArrow) {
    // Initial check
    checkScrollArrows();

    // Check on scroll
    taskList.addEventListener('scroll', checkScrollArrows);

    function checkScrollArrows() {
      // Hide left arrow if at the beginning
      if (taskList.scrollLeft <= 10) {
        leftArrow.style.opacity = '0.5';
        leftArrow.style.pointerEvents = 'none';
      } else {
        leftArrow.style.opacity = '1';
        leftArrow.style.pointerEvents = 'auto';
      }

      // Hide right arrow if at the end
      if (taskList.scrollLeft + taskList.clientWidth >= taskList.scrollWidth - 10) {
        rightArrow.style.opacity = '0.5';
        rightArrow.style.pointerEvents = 'none';
      } else {
        rightArrow.style.opacity = '1';
        rightArrow.style.pointerEvents = 'auto';
      }
    }
  }
});

// --- Add this function before the End Confirmation Modal Logic comment ---

function showDeleteConfirmation(buttonElement) {
  const projectId = buttonElement.getAttribute('data-project-id');
  const projectName = buttonElement.getAttribute('data-project-name');
  const formId = `delete-form-${projectId}`;
  const form = document.getElementById(formId);

  if (!form) {
    console.error(`Delete form with ID ${formId} not found!`);
    return;
  }

  const title = 'Delete Project';
  const message = `Are you sure you want to delete project: ${projectName}?`; // No need to escape here

  // Define the action to take on confirmation
  const onConfirmAction = () => {
    form.submit();
  };

  openConfirmationModal(title, message, onConfirmAction);
}

// --- Confirmation Modal Logic ---
const confirmationModal = document.getElementById('confirmationModal');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalMessage = document.getElementById('confirmationModalMessage');
const confirmActionButton = document.getElementById('confirmActionButton');

let confirmActionCallback = null; // To store the action to perform on confirm

function openConfirmationModal(title, message, onConfirm) {
  if (!confirmationModal || !confirmationModalTitle || !confirmationModalMessage || !confirmActionButton) {
    console.error('Confirmation modal elements not found!');
    return;
  }

  confirmationModalTitle.textContent = title || 'Confirm Action';
  confirmationModalMessage.textContent = message || 'Are you sure?';
  confirmActionCallback = onConfirm; // Store the callback function

  // Remove previous listener to avoid duplicates, then re-add
  const newConfirmButton = confirmActionButton.cloneNode(true);
  confirmActionButton.parentNode.replaceChild(newConfirmButton, confirmActionButton);
  newConfirmButton.addEventListener('click', handleConfirmAction);


  confirmationModal.style.display = 'block';
}

function closeConfirmationModal() {
  if (confirmationModal) {
    confirmationModal.style.display = 'none';
    confirmActionCallback = null; // Clear the callback
    // Ensure the event listener is removed from the potentially replaced button
    const currentConfirmButton = document.getElementById('confirmActionButton');
     if (currentConfirmButton) {
        currentConfirmButton.removeEventListener('click', handleConfirmAction);
     }
  }
}

function handleConfirmAction() {
  if (typeof confirmActionCallback === 'function') {
    confirmActionCallback(); // Execute the stored action
  }
  closeConfirmationModal(); // Close modal after action
}

// Close modal if user clicks outside the modal content
window.addEventListener('click', (event) => {
  if (event.target === confirmationModal) {
    closeConfirmationModal();
  }
});

// --- End Confirmation Modal Logic ---
