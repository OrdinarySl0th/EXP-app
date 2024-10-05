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
let currentUser = null;
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
    document.getElementById('sendFriendRequestButton').addEventListener('click', sendFriendRequest);
    document.getElementById('logoutButton').addEventListener('click', logout);

    auth.onAuthStateChanged(function(user) {
        if (user) {
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
            showLogin();
        }
    });
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
    auth.signInWithEmailAndPassword(email, password)
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
    auth.signOut().then(() => {
        console.log("User signed out successfully");
        currentUser = null;
        showLogin();
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
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

// Experience functions
function addNewExperience() {
    const expName = document.getElementById('newExpName').value.trim();
    const expValue = parseFloat(document.getElementById('newExpValue').value);
    if (!expName || isNaN(expValue)) {
        alert("Please enter a valid experience name and value.");
        return;
    }
    const newExp = currentUser.tracker.addExperience(expValue, expName);
    saveUserData(currentUser).then(() => {
        displayUserExperiences();
        document.getElementById('newExpName').value = '';
        document.getElementById('newExpValue').value = '';
    });
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
    const checkboxes = document.querySelectorAll('#experienceContainer input[type="checkbox"]:checked');
    let totalExp = 0;
    checkboxes.forEach(cb => {
        const expId = cb.getAttribute('data-id');
        const experience = currentUser.tracker.experiences.find(exp => exp.id === expId);
        totalExp += experience.amount;
    });
    const totalChecked = checkboxes.length;
    const finalExp = totalExp * totalChecked;
    const previousExp = currentUser.totalAccumulatedExp;
    currentUser.totalAccumulatedExp += finalExp;
    saveUserData(currentUser).then(() => {
        checkLevelUp(previousExp, currentUser.totalAccumulatedExp);
        updateTotalExpDisplay();
        checkboxes.forEach(cb => cb.checked = false);
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
        const modal = document.getElementById('levelUpModal');
        const newLevelSpan = document.getElementById('newLevel');
        newLevelSpan.textContent = currentLevel;
        modal.style.display = 'block';

        const closeButton = document.getElementById('closeModal');
        closeButton.onclick = function() {
            modal.style.display = 'none';
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }
}

// Friend functions
function sendFriendRequest() {
    const friendUsername = document.getElementById('friendUsername').value.trim();
    if (friendUsername && friendUsername !== currentUser.displayName) {
        db.collection('users').where('username', '==', friendUsername).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const friendDoc = querySnapshot.docs[0];
                    const friendData = friendDoc.data();
                    if (!friendData.friendRequests.includes(currentUser.displayName)) {
                        friendData.friendRequests.push(currentUser.displayName);
                        return friendDoc.ref.update({ friendRequests: friendData.friendRequests });
                    }
                }
            })
            .then(() => {
                alert(`Friend request sent to ${friendUsername}`);
                document.getElementById('friendUsername').value = '';
            })
            .catch((error) => {
                console.error("Error sending friend request: ", error);
                alert('Failed to send friend request. Please try again.');
            });
    } else {
        alert('Invalid username or user not found.');
    }
}

function displayFriendRequests() {
    const requestsContainer = document.getElementById('friendRequests');
    requestsContainer.innerHTML = '<h3>Friend Requests</h3>';
    if (currentUser.friendRequests.length === 0) {
        requestsContainer.innerHTML += '<p>No pending friend requests.</p>';
    } else {
        currentUser.friendRequests.forEach(username => {
            const requestElement = document.createElement('div');
            requestElement.innerHTML = `
                <p>${username} wants to be your friend</p>
                <button onclick="acceptFriendRequest('${username}')">Accept</button>
                <button onclick="rejectFriendRequest('${username}')">Reject</button>
            `;
            requestsContainer.appendChild(requestElement);
        });
    }
}

function acceptFriendRequest(username) {
    currentUser.friendRequests = currentUser.friendRequests.filter(req => req !== username);
    currentUser.friends.push(username);
    saveUserData(currentUser).then(() => {
        db.collection('users').where('username', '==', username).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const friendDoc = querySnapshot.docs[0];
                    const friendData = friendDoc.data();
                    friendData.friends.push(currentUser.displayName);
                    return friendDoc.ref.update({ friends: friendData.friends });
                }
            })
            .then(() => {
                displayFriendRequests();
                displayFriendsList();
            });
    });
}

function rejectFriendRequest(username) {
    currentUser.friendRequests = currentUser.friendRequests.filter(req => req !== username);
    saveUserData(currentUser).then(() => {
        displayFriendRequests();
    });
}

function displayFriendsList() {
    const friendsListContainer = document.getElementById('friendsList');
    friendsListContainer.innerHTML = '<h3>Friends</h3>';
    if (currentUser.friends.length === 0) {
        friendsListContainer.innerHTML += '<p>You have no friends yet. Send some friend requests!</p>';
    } else {
        currentUser.friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.textContent = friend;
            friendsListContainer.appendChild(friendElement);
        });
    }
}
