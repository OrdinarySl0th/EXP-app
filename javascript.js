// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDVzWNYl124OuuN6Cxy8xPJKZYCoNHUEZ8",
    authDomain: "levelup-8b1fa.firebaseapp.com",
    databaseURL: "https://levelup-8b1fa-default-rtdb.firebaseio.com",
    projectId: "levelup-8b1fa",
    storageBucket: "levelup-8b1fa.appspot.com",
    messagingSenderId: "271893990172",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let maxExp = 100;

// Classes
class ExperienceTracker {
    constructor() {
        this.experiences = [];
    }

    addExperience(amount, category) {
        const newExp = {id: Date.now().toString(), amount, category};
        this.experiences.push(newExp);
        return newExp;
    }

    editExperience(id, newAmount, newCategory) {
        const expIndex = this.experiences.findIndex(exp => exp.id === id);
        if (expIndex !== -1) {
            this.experiences[expIndex].amount = newAmount;
            this.experiences[expIndex].category = newCategory;
            return this.experiences[expIndex];
        }
        return null;
    }

    deleteExperience(id) {
        this.experiences = this.experiences.filter(exp => exp.id !== id);
    }
}

// Firebase functions
function saveUserData(user) {
    return db.collection('users').doc(user.uid).set({
        username: user.displayName,
        experiences: user.tracker.experiences,
        totalAccumulatedExp: user.totalAccumulatedExp,
        friends: user.friends,
        friendRequests: user.friendRequests
    });
}

function loadUserData(user) {
    return db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            user.tracker.experiences = data.experiences || [];
            user.totalAccumulatedExp = data.totalAccumulatedExp || 0;
            user.friends = data.friends || [];
            user.friendRequests = data.friendRequests || [];
        }
        return user;
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginButton').addEventListener('click', login);
    document.getElementById('registerButton').addEventListener('click', showRegister);
    document.getElementById('backToLoginButton').addEventListener('click', showLogin);
    document.getElementById('registerSubmitButton').addEventListener('click', register);
    document.getElementById('addExperienceButton').addEventListener('click', addNewExperience);
    document.getElementById('calcExpButton').addEventListener('click', calcExp);
    document.getElementById('editButton').addEventListener('click', editSelectedExperience);
    document.getElementById('deleteButton').addEventListener('click', deleteSelectedExperiences);
    document.getElementById('logoutButton').addEventListener('click', logout);
    })

let currentUser = null;

auth.onAuthStateChanged(function(user) {
    if (user) {
        if (!currentUser) {
            currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                tracker: new ExperienceTracker(),
                totalAccumulatedExp: 0,
                friends: [],
                friendRequests: []
            };
            loadUserData(currentUser).then(() => {
                showDashboard();
            });
        } else if (currentUser.uid !== user.uid) {
            // User has changed, reload data
            currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                tracker: new ExperienceTracker(),
                totalAccumulatedExp: 0,
                friends: [],
                friendRequests: []
            };
            loadUserData(currentUser).then(() => {
                showDashboard();
            });
        } else {
            // User is the same, just show dashboard
            showDashboard();
        }
    } else {
        currentUser = null;
        showLogin();
    }
});

// User management functions
function register() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    if (!username || !password) {
        alert("Username and password cannot be empty!");
        return;
    }
    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            alert("Registration successful! Please log in.");
            showLogin();
        })
        .catch((error) => {
            alert("Registration failed: " + error.message);
        });
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log("Attempting login for username:", username);
    
    if (!username || !password) {
        console.error("Username or password is empty");
        alert("Please enter both username and password.");
        return;
    }
    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            console.log("Login successful for user:", userCredential.user.uid);
            showDashboard();
        })
        .catch((error) => {
            console.error("Login error:", error.code, error.message);
            let errorMessage = "Login failed. ";
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage += "No user found with this username.";
                    break;
                case 'auth/wrong-password':
                    errorMessage += "Incorrect password.";
                    break;
                case 'auth/invalid-email':
                    errorMessage += "Invalid username format.";
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

function logout() {
    if (currentUser) {
        saveUserData(currentUser)
            .then(() => {
                return firebase.auth().signOut();
            })
            .then(() => {
                console.log('User signed out');
                currentUser = null;
                document.getElementById('mainContent').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
            })
            .catch((error) => {
                console.error('Logout error', error);
                alert('An error occurred during logout. Please try again.');
            });
    } else {
        console.log('No user is currently logged in');
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    }
}

function showDashboard() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    displayUserExperiences();
    updateTotalExpDisplay();
    displayFriendsList();
    displayFriendRequests();
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Add Experience functions
function addNewExperience() {
    console.log("addNewExperience function called");
    if (!currentUser) {
        console.error("No user is currently logged in");
        alert("Please log in to add an experience.");
        return;
    }

    const expName = document.getElementById('newExpName').value.trim();
    const expValue = parseFloat(document.getElementById('newExpValue').value);
    console.log("Input values:", expName, expValue);

    if (!expName || isNaN(expValue)) {
        alert("Please enter a valid experience name and value.");
        return;
    }

    const newExp = currentUser.tracker.addExperience(expValue, expName);
    console.log("New experience added:", newExp);

    // Immediately display the new experience
    const experienceContainer = document.getElementById('experienceContainer');
    if (experienceContainer) {
        const expElement = document.createElement('div');
        expElement.innerHTML = `<input type="checkbox" class="experience-checkbox" data-id="${newExp.id}"> ${newExp.category}: ${newExp.amount}`;
        experienceContainer.appendChild(expElement);
    }

    saveUserData(currentUser)
        .then(() => {
            console.log("User data saved successfully");
            document.getElementById('newExpName').value = '';
            document.getElementById('newExpValue').value = '';
        })
        .catch((error) => {
            console.error("Error saving user data:", error);
            alert("Failed to save the new experience. Please try again.");
        });
}
function displayUserExperiences() {
    console.log("Displaying user experiences");
    const experienceContainer = document.getElementById('experienceContainer');
    if (!experienceContainer) {
        console.error("Experience container not found");
        return;
    }
    experienceContainer.innerHTML = '';
    if (!currentUser || !currentUser.tracker || !currentUser.tracker.experiences) {
        console.error("User data is not properly initialized");
        experienceContainer.innerHTML = '<p>Error loading experiences. Please try logging out and back in.</p>';
        return;
    }
    if (currentUser.tracker.experiences.length === 0) {
        experienceContainer.innerHTML = '<p>No experiences added yet. Add your first experience above!</p>';
    } else {
        currentUser.tracker.experiences.forEach((exp) => {
            const expElement = document.createElement('div');
            expElement.innerHTML = `<input type="checkbox" class="experience-checkbox" data-id="${exp.id}"> ${exp.category}: ${exp.amount}`;
            experienceContainer.appendChild(expElement);
        });
    }
    console.log("Experiences displayed:", currentUser.tracker.experiences.length);
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
        const updatedExp = currentUser.tracker.editExperience(expId, parseFloat(newAmount), newCategory);
        if (updatedExp) {
            saveUserData(currentUser).then(() => {
                displayUserExperiences();
            });
        }
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
            currentUser.tracker.deleteExperience(expId);
        });
        saveUserData(currentUser).then(() => {
            displayUserExperiences();
        });
    }
}

function calcExp() {
    if (!currentUser) {
        console.error("No user is currently logged in");
        alert("Please log in to calculate experience.");
        return;
    }

    const checkboxes = document.querySelectorAll('#experienceContainer input[type="checkbox"]:checked');
    let totalExp = 0;
    checkboxes.forEach(cb => {
        const expId = cb.getAttribute('data-id');
        const experience = currentUser.tracker.experiences.find(exp => exp.id === expId);
        if (experience) {
            totalExp += experience.amount;
        }
    });
    const totalChecked = checkboxes.length;
    const finalExp = totalExp * totalChecked;
    const previousExp = currentUser.totalAccumulatedExp;
    currentUser.totalAccumulatedExp += finalExp;
    saveUserData(currentUser).then(() => {
        checkLevelUp(previousExp, currentUser.totalAccumulatedExp);
        updateTotalExpDisplay();
        checkboxes.forEach(cb => cb.checked = false);
    }).catch((error) => {
        console.error("Error saving user data:", error);
        alert("Failed to save the calculated experience. Please try again.");
    });
}

function updateTotalExpDisplay() {
    if (maxExp <= 0) {
        console.warn('maxExp is not properly set. Setting it to a default value of 100.');
        maxExp = 100;
    }

    const currentLevel = Math.floor(currentUser.totalAccumulatedExp / maxExp);
    const remainingExp = currentUser.totalAccumulatedExp % maxExp;

    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.value = Math.min(Math.max(remainingExp, 0), maxExp);
    }

    document.getElementById('totalExpDisplay').textContent = `Total Experience: ${currentUser.totalAccumulatedExp} (Level ${currentLevel}, ${remainingExp}/${maxExp})`;
}

function checkLevelUp(previousExp, currentExp) {
    const previousLevel = Math.floor(previousExp / maxExp);
    const currentLevel = Math.floor(currentExp / maxExp);
    if (currentLevel > previousLevel) {
        showLevelUpModal(currentLevel);
    }
}
function showLevelUpModal(level) {
    const modal = document.getElementById('levelUpModal');
    const newLevelSpan = document.getElementById('newLevel');
    newLevelSpan.textContent = level;
    modal.style.display = 'block';

    // Close the modal when the close button is clicked
    const closeButton = document.getElementById('closeModal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    }

    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}
