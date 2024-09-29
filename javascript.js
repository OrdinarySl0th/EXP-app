// User management system
const users = {};

class ExperienceTracker {
    constructor() {
        this.experiences = [];
    }

    addExperience(amount, category) {
        this.experiences.push({amount, category});
    }

    totalExperience(selectedExperience) {
        return selectedExperience.reduce((sum, exp) => sum + exp.amount, 0);
    }
}

class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.tracker = new ExperienceTracker();
        this.totalAccumulatedExp = 0;
    }

    addExperience(amount, category) {
        this.tracker.addExperience(amount, category);
    }
}

// Initialize default users
users['user1'] = new User('user1', 'password');
users['user2'] = new User('user2', 'password2');

let currentUser = null;
const maxExp = 13392;

document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to buttons
    document.getElementById('loginButton').addEventListener('click', login);
    document.getElementById('registerButton').addEventListener('click', showRegister);
    document.getElementById('backToLoginButton').addEventListener('click', showLogin);
    document.getElementById('registerSubmitButton').addEventListener('click', register);
    document.getElementById('addExperienceButton').addEventListener('click', addNewExperience);
    document.getElementById('calcExpButton').addEventListener('click', calcExp);

    // Hide main content and register form initially
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
});

function addNewExperience() {
    const expName = document.getElementById('newExpName').value.trim();
    const expValue = parseFloat(document.getElementById('newExpValue').value);
    if (!expName || isNaN(expValue)) {
        alert("Please enter a valid experience name and value.");
        return;
    }
    currentUser.addExperience(expValue, expName);
    displayUserExperiences();
    updateExpenseCheckboxes();
    document.getElementById('newExpName').value = '';
    document.getElementById('newExpValue').value = '';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

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


function displayUserExperiences() {
    const experienceContainer = document.getElementById('experienceContainer');
    experienceContainer.innerHTML = '';

    if (currentUser.tracker.experiences.length === 0) {
        experienceContainer.innerHTML = '<p>No experiences added yet. Add your first experience above!</p>';
    } else {
        currentUser.tracker.experiences.forEach(exp => {
            const expElement = document.createElement('div');
            expElement.textContent = `${exp.category}: ${exp.amount} exp`;
            experienceContainer.appendChild(expElement);
        });
    }
}

function clearExperiencesFromUI() {
    // Implementation to clear experiences from the UI
    // This will depend on your specific UI structure
    const experienceContainer = document.getElementById('experienceContainer');
    if (experienceContainer) {
        experienceContainer.innerHTML = '';
    }
}

function displayExperienceInUI(experience) {
    const experienceContainer = document.getElementById('experienceContainer');
    if (experienceContainer) {
        const expElement = document.createElement('div');
        expElement.textContent = `${experience.category}: ${experience.amount} exp`;
        experienceContainer.appendChild(expElement);
    }
}

function showDashboard() {
    console.log('showDashboard function called');
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.getElementById('mainContent');
    
    if (loginForm && mainContent) {
        console.log('Hiding login form and showing main content');
        loginForm.style.display = 'none';
        mainContent.style.display = 'block';
        displayUserExperiences();
        updateExpenseCheckboxes();
        updateTotalExpDisplay();
    } else {
        console.error('Required elements not found: loginForm or mainContent');
    }
}

function logout() {
    currentUser = null;
    clearExperiencesFromUI();
    document.getElementById('dashboard').style.display = 'none';
    showLogin();
}


function updateExpenseCheckboxes() {
    const checkboxContainer = document.getElementById('checkboxes');
    if (!checkboxContainer) {
        console.error('Checkbox container not found');
        return;
    }
    checkboxContainer.innerHTML = '';
    currentUser.tracker.experiences.forEach((exp, index) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `exp-${index}`;
        checkbox.value = exp.amount;
        const label = document.createElement('label');
        label.htmlFor = `exp-${index}`;
        label.textContent = `${exp.category} (${exp.amount} exp)`;
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(document.createElement('br'));
    });
    console.log('Checkboxes updated'); // Debug log
}

function calcExp() {
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]:checked');
    const selectedExperience = Array.from(checkboxes).map(cb => ({amount: parseFloat(cb.value)}));
    const baseExp = currentUser.tracker.totalExperience(selectedExperience);
    const newExp = checkboxes.length * baseExp;
    currentUser.totalAccumulatedExp += newExp;
    updateTotalExpDisplay();
    checkboxes.forEach(cb => cb.checked = false);
}

function updateTotalExpDisplay() {
    const levels = Math.floor(currentUser.totalAccumulatedExp / maxExp);
    const remainingExp = currentUser.totalAccumulatedExp % maxExp;
    const progressBar = document.getElementById('progressBar');
    progressBar.value = remainingExp;
    document.getElementById('totalExpDisplay').textContent = `Total Experience: ${currentUser.totalAccumulatedExp} (Level ${levels}, ${remainingExp}/${maxExp})`;
}
