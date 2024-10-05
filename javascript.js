// Global variables
const users = {};
let currentUser = null;
let maxExp = 100; // Initialize with a default value

// Classes
class ExperienceTracker {
    constructor() {
        this.experiences = [];
    }

    addExperience(amount, category) {
        this.experiences.push({id: Date.now().toString(), amount, category});
    }

    totalExperience(selectedExperience) {
        return selectedExperience.reduce((sum, exp) => sum + exp.amount, 0);
    }

    editExperience(id, newAmount, newCategory) {
        const expIndex = this.experiences.findIndex(exp => exp.id === id);
        if (expIndex !== -1) {
            this.experiences[expIndex].amount = newAmount;
            this.experiences[expIndex].category = newCategory;
        }
    }
}

class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.tracker = new ExperienceTracker();
        this.totalAccumulatedExp = 0;
        this.loadUserData();
    }

    addExperience(amount, category) {
        this.tracker.addExperience(amount, category);
        this.saveUserData();
    }

    editExperience(id, newAmount, newCategory) {
        this.tracker.editExperience(id, newAmount, newCategory);
        this.saveUserData();
    }

    saveUserData() {
        localStorage.setItem(`user_${this.username}`, JSON.stringify({
            experiences: this.tracker.experiences,
            totalAccumulatedExp: this.totalAccumulatedExp
        }));
    }

    loadUserData() {
        const userData = localStorage.getItem(`user_${this.username}`);
        if (userData) {
            const parsedData = JSON.parse(userData);
            this.tracker.experiences = parsedData.experiences;
            this.totalAccumulatedExp = parsedData.totalAccumulatedExp;
        }
    }
}

// Initialization functions
function initializeUsers() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        Object.keys(parsedUsers).forEach(username => {
            users[username] = new User(username, parsedUsers[username].password);
        });
    } else {
        users['user1'] = new User('user1', 'password');
        users['user2'] = new User('user2', 'password2');
        saveUsers();
    }
}

function saveUsers() {
    const usersData = {};
    Object.keys(users).forEach(username => {
        usersData[username] = { password: users[username].password };
    });
    localStorage.setItem('users', JSON.stringify(usersData));
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeUsers();
    document.getElementById('loginButton').addEventListener('click', login);
    document.getElementById('registerButton').addEventListener('click', showRegister);
    document.getElementById('backToLoginButton').addEventListener('click', showLogin);
    document.getElementById('registerSubmitButton').addEventListener('click', register);
    document.getElementById('addExperienceButton').addEventListener('click', addNewExperience);
    document.getElementById('calcExpButton').addEventListener('click', calcExp);
    document.getElementById('editButton').addEventListener('click', editSelectedExperience);
    document.getElementById('deleteButton').addEventListener('click', deleteSelectedExperiences);
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
});

// Experience functions
function addNewExperience() {
    const expName = document.getElementById('newExpName').value.trim();
    const expValue = parseFloat(document.getElementById('newExpValue').value);
    if (!expName || isNaN(expValue)) {
        alert("Please enter a valid experience name and value.");
        return;
    }
    currentUser.addExperience(expValue, expName);
    displayUserExperiences();
    document.getElementById('newExpName').value = '';
    document.getElementById('newExpValue').value = '';
}

function displayUserExperiences() {
    const experienceContainer = document.getElementById('experienceContainer');
    experienceContainer.innerHTML = '';
    if (currentUser.tracker.experiences.length === 0) {
        experienceContainer.innerHTML = '<p>No experiences added yet. Add your first experience above!</p>';
    } else {
        currentUser.tracker.experiences.forEach((exp) => {
            const expElement = document.createElement('div');
            expElement.innerHTML = `<input type="checkbox" class="experience-checkbox" data-id="${exp.id}"> ${exp.category}: ${exp.amount}`;
            experienceContainer.appendChild(expElement);
        });
    }
}

function editSelectedExperience() {
    const selectedCheckboxes = document.querySelectorAll('.experience-checkbox:checked');
    if (selectedCheckboxes.length !== 1) {
        alert('Please select exactly one experience to edit.');
        return;
    }
    const expId = selectedCheckboxes[0].getAttribute('data-id');
    const experience = currentUser.tracker.experiences.find(exp => exp.id === expId);
    const newCategory = prompt('Enter new category:', experience.category);
    const newAmount = prompt('Enter new amount:', experience.amount);
    if (newCategory !== null && newAmount !== null) {
        currentUser.editExperience(expId, parseFloat(newAmount), newCategory);
        displayUserExperiences();
    }
}

function deleteSelectedExperiences() {
    const selectedCheckboxes = document.querySelectorAll('.experience-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one experience to delete.');
        return;
    }
    if (confirm('Are you sure you want to delete the selected experience(s)?')) {
        selectedCheckboxes.forEach(checkbox => {
            const expId = checkbox.getAttribute('data-id');
            currentUser.tracker.experiences = currentUser.tracker.experiences.filter(exp => exp.id !== expId);
        });
        currentUser.saveUserData();
        displayUserExperiences();
    }
}

// User management functions
function register() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    if (!username || !password) {
        alert("Username and password cannot be empty!");
        return;
    }
    if (users[username]) {
        alert("Username already exists! Please choose a different username.");
        return;
    }
    users[username] = new User(username, password);
    saveUsers();
    alert("Registration successful! Please log in.");
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    showLogin();
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (users[username] && users[username].password === password) {
        currentUser = users[username];
        showDashboard();
    } else {
        alert("Invalid username or password!");
    }
}

function showDashboard() {
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.getElementById('mainContent');
    if (loginForm && mainContent) {
        loginForm.style.display = 'none';
        mainContent.style.display = 'block';
        displayUserExperiences();
        updateTotalExpDisplay();
    } else {
        console.error('Required elements not found: loginForm or mainContent');
    }
}

function calcExp() {
    const checkboxes = document.querySelectorAll('#experienceContainer input[type="checkbox"]:checked');
    let totalExp = 0;
    checkboxes.forEach(cb => {
        const expId = cb.getAttribute('data-id');
        const experience = currentUser.tracker.experiences.find(exp => exp.id === expId);
        totalExp += experience.amount;
    });
    const totalChecked = checkboxes.length;
    const finalExp = totalExp * totalChecked;
    currentUser.totalAccumulatedExp += finalExp;
    currentUser.saveUserData();
    updateTotalExpDisplay();
    checkboxes.forEach(cb => cb.checked = false);
}

function exp7days() {
    const totalboxes = document.querySelectorAll('#experienceContainer input[type="checkbox"]');
    let exp1day = 0;
    currentUser.tracker.experiences.forEach(experience => {
        exp1day += experience.amount * totalboxes.length;
    });
    const exp7day = exp1day * 7;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.max = maxExp;
    }
}

function updateTotalExpDisplay() {
    if (maxExp <= 0) {
        console.warn('maxExp is not properly set. Setting it to a default value of 100.');
        maxExp = 100;
    }
    const levels = Math.floor(currentUser.totalAccumulatedExp / maxExp);
    const remainingExp = currentUser.totalAccumulatedExp % maxExp;
    const progressBar = document.getElementById('progressBar');
    progressBar.value = Math.min(Math.max(remainingExp, 0), maxExp);
    document.getElementById('totalExpDisplay').textContent = `Total Experience: ${currentUser.totalAccumulatedExp} (Level ${levels}, ${remainingExp}/${maxExp})`;
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}
