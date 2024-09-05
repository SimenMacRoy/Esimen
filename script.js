// script.js

// Function to handle active state for top tabs
const tabs = document.querySelectorAll('.tab-item');
tabs.forEach(tab => {
    tab.addEventListener('click', function () {
        // Remove 'active' class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add 'active' class to the clicked tab
        this.classList.add('active');
    });
});

// Function to handle active state for bottom navigation
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(nav => {
    nav.addEventListener('click', function () {
        // Remove 'active' class from all nav items
        navItems.forEach(n => n.classList.remove('active'));
        // Add 'active' class to the clicked nav item
        this.classList.add('active');
    });
});
