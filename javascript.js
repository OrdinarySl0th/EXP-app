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

console.log("Application starting...");

// Classes
class ExperienceTracker {
    constructor(experiences = []) {
        this.experiences = experiences;
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

function saveUserData(user) {
    if (!user || !user.uid) {
        console.error("Invalid user object passed to saveUserData");
        return Promise.reject(new Error("Invalid user object"));
    }
    console.log("Saving user data:", user);
    return db.collection('users').doc(user.uid).set({
        username: user.displayName,
        experiences: user.tracker.experiences,
        totalAccumulatedExp: user.totalAccumulatedExp,
        friends: user.friends,
        friendRequests: user.friendRequests
    }, { merge: true })  // Use merge: true to update fields without overwriting the entire document
    .catch(error => {
        console.error("Firestore save error:", error);
        throw error;  // Re-throw the error to be caught by the calling function
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
    document.getElementById('resetbarbutton').addEventListener('click', resetProgress);
    document.getElementById('sendFriendRequest').addEventListener('click', sendFriendRequest);

    // Making sure the Exp input values are between 0 - 5
    const newExpValueInput = document.getElementById('newExpValue');
    if (newExpValueInput) {
        newExpValueInput.addEventListener('input', function() {
            let value = parseFloat(this.value);
            if (isNaN(value)) {
                this.setCustomValidity('Please enter a number between 0 and 5');
            } else if (value < 0) {
                this.setCustomValidity('The minimum experience value is 0');
            } else if (value > 5) {
                this.setCustomValidity('The maximum experience value is 5');
            } else if (value.toFixed(2) !== this.value && this.value.includes('.')) {} 
            else {
                this.setCustomValidity('');
            }
        });
    }
});

let currentUser = null;

firebase.auth().onAuthStateChanged(function(user) {
    console.log("Auth state changed. User:", user ? user.uid : "No user");
    if (user) {
        console.log("User is signed in, loading user data...");
        loadUserData(user).then((loadedUser) => {
            console.log("User data loaded:", loadedUser);
            currentUser = loadedUser;
            showDashboard();
        }).catch((error) => {
            console.error("Error loading user data:", error);
            showMessageModal("Error", "Failed to load user data. Please try logging in again.");
        });
    } else {
        console.log("No user signed in, showing login form");
        currentUser = null;
        showLogin();
    }
});

// User management functions
function register() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    if (!username || !password) {
        showMessageModal("Error", "Username and password cannot be empty!");
        return;
    }
    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            showMessageModal("Success", "Registration successful! Please log in.");
            showLogin();
        })
        .catch((error) => {
            showMessageModal("Error", "Registration failed: " + error.message);
        });
}

// ... (previous code remains the same)

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log("Attempting login for username:", username);
    
    if (!username || !password) {
        console.error("Username or password is empty");
        showMessageModal("Error", "Please enter both username and password.");
        return;
    }

    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            console.log("Login successful for user:", userCredential.user.uid);
            return loadUserData(userCredential.user);
        })
        .then((loadedUser) => {
            if (!loadedUser) {
                throw new Error("Failed to load user data");
            }
            currentUser = loadedUser;
            console.log("User data loaded:", currentUser);
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
            showMessageModal("Error", errorMessage);
        });
}

function loadUserData(user) {
    console.log("Loading user data for:", user.uid);
    return db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            console.log("Firestore data:", data);
            return {
                uid: user.uid,
                displayName: user.displayName || data.username,
                tracker: new ExperienceTracker(data.experiences || []),
                totalAccumulatedExp: data.totalAccumulatedExp || 0,
                friends: data.friends || [],
                friendRequests: data.friendRequests || []
            };
        } else {
            console.log("No user document found, creating new user data");
            return {
                uid: user.uid,
                displayName: user.displayName,
                tracker: new ExperienceTracker(),
                totalAccumulatedExp: 0,
                friends: [],
                friendRequests: []
            };
        }
    });
}

function showDashboard() {
    console.log("Showing dashboard for user:", currentUser);
    if (!currentUser) {
        console.error("No current user when trying to show dashboard");
        showMessageModal("Error", "An error occurred while loading your data. Please try logging in again.");
        return;
    }
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    displayUserExperiences();
    updateTotalExpDisplay();
    displayFriendsList();
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
                showMessageModal("Error", 'An error occurred during logout. Please try again.');
            });
    } else {
        console.log('No user is currently logged in');
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    }
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
    if (!currentUser || !currentUser.uid) {
        console.error("No user is currently logged in");
        showMessageModal("Error", "Please log in to add an experience.");
        return;
    }
    console.log("Current user:", currentUser);

    const expName = document.getElementById('newExpName').value.trim();
    let expValue = parseFloat(document.getElementById('newExpValue').value);
    console.log("Input values:", expName, expValue);

    if (!expName) {
        showMessageModal("Error", "Please enter a valid experience name.");
        return;
    }

    // Enforce min and max values
    if (isNaN(expValue) || expValue < 0) {
        expValue = 0;
    } else if (expValue > 5) {
        expValue = 5;
    }
    console.log("Adding new experience to tracker");
    const newExp = currentUser.tracker.addExperience(expValue, expName);
    console.log("New experience added:", newExp);

    console.log("Attempting to save user data");
    saveUserData(currentUser)
        .then(() => {
            console.log("User data saved successfully");
            displayUserExperiences();
            updateTotalExpDisplay();
            document.getElementById('newExpName').value = '';
            document.getElementById('newExpValue').value = '';
            showMessageModal("Success", `Added new experience: ${expName} with value ${expValue}`);
        })
        .catch((error) => {
            console.error("Error saving user data:", error);
            showMessageModal("Error", `Failed to save the new experience: ${error.message}`);
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
        showMessageModal("Error", 'Please select exactly one experience to edit.');
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
                updateTotalExpDisplay();
            }).catch((error) => {
                console.error("Error saving edited experience:", error);
                showMessageModal("Error", "Failed to save the edited experience. Please try again.");
            });
        }
    }
}
function deleteSelectedExperiences() {
    const selectedCheckboxes = document.querySelectorAll('.experience-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showMessageModal("Error", 'Please select at least one experience to delete.');
        return;
    }
    showConfirmModal('Are you sure you want to delete the selected experience(s)?', () => {
        selectedCheckboxes.forEach(checkbox => {
            const expId = checkbox.getAttribute('data-id');
            currentUser.tracker.deleteExperience(expId);
        })});
        saveUserData(currentUser).then(() => {
            displayUserExperiences();
            updateTotalExpDisplay();
        }).catch((error) => {
            console.error("Error saving after deleting experiences:", error);
            showMessageModal("Error", "Failed to delete the selected experiences. Please try again.");
        });
}

function calculateLevel(totalExp, experiences) {
    let level = 0;
    let expThreshold = calculateThreshold(experiences, level);
        
    while (totalExp >= expThreshold) {
        totalExp -= expThreshold;
        level++;
        expThreshold = calculateThreshold(experiences, level);
    }
        
    return level;
}

function calculateThreshold(experiences, currentLevel) {
    const totalCheckboxes = experiences.length;
    const sumOfExperiences = experiences.reduce((sum, exp) => sum + exp.amount, 0);
    return totalCheckboxes * sumOfExperiences * (currentLevel + 1);
}

function calcExp() {
    if (!currentUser) {
        console.error("No user is currently logged in");
        showMessageModal("Error", "Please log in to calculate experience.");
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
    const previousLevel = calculateLevel(currentUser.totalAccumulatedExp, currentUser.tracker.experiences);
    currentUser.totalAccumulatedExp += finalExp;

    saveUserData(currentUser).then(() => {
        const newLevel = calculateLevel(currentUser.totalAccumulatedExp, currentUser.tracker.experiences);
        if (newLevel > previousLevel) {
            showLevelUpModal(newLevel);
        }
        updateTotalExpDisplay();
        checkboxes.forEach(cb => cb.checked = false);
    }).catch((error) => {
        console.error("Error saving calculated experience:", error);
        showMessageModal("Error", "Failed to save the calculated experience. Please try again.");
    });
}

function calculateMaxExp(user) {
    if (!user || !user.tracker || !user.tracker.experiences) {
        console.error("Invalid user object for maxExp calculation");
        return 100; // Default value if user data is invalid
    }

    const currentLevel = calculateLevel(user.totalAccumulatedExp, user.tracker.experiences);
    return calculateThreshold(user.tracker.experiences, currentLevel);
}


function updateTotalExpDisplay() {
    if (!currentUser) {
        console.warn('No current user when updating exp display');
        return;
    }

    const maxExp = calculateMaxExp(currentUser);
    const currentLevel = calculateLevel(currentUser.totalAccumulatedExp, currentUser.tracker.experiences);
    const expForNextLevel = calculateThreshold(currentUser.tracker.experiences, currentLevel);
    const remainingExp = currentUser.totalAccumulatedExp - calculateThreshold(currentUser.tracker.experiences, currentLevel - 1);

    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.max = expForNextLevel;
        progressBar.value = remainingExp;
    }

    document.getElementById('totalExpDisplay').textContent = `Total Experience: ${currentUser.totalAccumulatedExp} (Level ${currentLevel}, ${remainingExp}/${expForNextLevel})`;
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

function resetProgress() {
    if (confirm("Are you sure you want to reset your progress? This action cannot be undone.")) {
        currentUser.totalAccumulatedExp = 0;
        updateTotalExpDisplay();
        saveUserData(currentUser)
            .then(() => {
                alert("Progress reset successfully!");
            })
            .catch((error) => {
                console.error("Error resetting progress:", error);
                alert("Failed to reset progress. Please try again.");
            });
    }
}


// Function to show the reset confirmation modal
function showResetConfirmModal() {
    const modal = document.getElementById('resetConfirmModal');
    modal.style.display = 'block';

    document.getElementById('confirmReset').onclick = function() {
        modal.style.display = 'none';
        performReset();
    };

    document.getElementById('cancelReset').onclick = function() {
        modal.style.display = 'none';
    };
}

// Function to perform the actual reset
function performReset() {
    currentUser.totalAccumulatedExp = 0;
    updateTotalExpDisplay();
    saveUserData(currentUser)
        .then(() => {
            showMessageModal('Success', 'Progress reset successfully!');
        })
        .catch((error) => {
            console.error("Error resetting progress:", error);
            showMessageModal('Error', 'Failed to reset progress. Please try again.');
        });
}

// Function to show the message modal
function showMessageModal(title, message) {
    const modal = document.getElementById('messageModal');
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageText').textContent = message;
    modal.style.display = 'block';

    document.getElementById('closeMessageModal').onclick = function() {
        modal.style.display = 'none';
    };
}

// Updated resetProgress function
function resetProgress() {
    showConfirmModal("Are you sure you want to reset your progress? This action cannot be undone.", () => {
        currentUser.totalAccumulatedExp = 0;
        updateTotalExpDisplay();
        saveUserData(currentUser)
            .then(() => {
                showMessageModal("Success", "Progress reset successfully!");
            })
            .catch((error) => {
                console.error("Error resetting progress:", error);
                showMessageModal("Error", "Failed to reset progress. Please try again.");
            });
    });
}

// Add these new functions for friend management
function sendFriendRequest() {
    const friendEmail = document.getElementById('friendEmail')?.value.trim();
    if (!friendEmail) {
        showMessageModal('Error', 'Please enter a valid email address.');
        return;
    }

    console.log(`Attempting to send friend request to: ${friendEmail}`);

    db.collection('users').where('username', '==', friendEmail).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                console.log('User not found');
                showMessageModal('Error', 'User not found.');
                return;
            }
            const friendDoc = querySnapshot.docs[0];
            const friendId = friendDoc.id;
            console.log(`Found user with ID: ${friendId}`);

            if (friendId === currentUser.uid) {
                showMessageModal('Error', 'You cannot send a friend request to yourself.');
                return;
            }
            if (currentUser.friends.includes(friendId)) {
                showMessageModal('Error', 'This user is already your friend.');
                return;
            }
            if (currentUser.friendRequests.includes(friendId)) {
                showMessageModal('Error', 'You have already sent a friend request to this user.');
                return;
            }

            // Add the request to the friend's friendRequests array
            return db.collection('users').doc(friendId).update({
                friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        })
        .then(() => {
            console.log('Friend request sent successfully');
            showMessageModal('Success', 'Friend request sent successfully.');
            document.getElementById('friendEmail').value = '';
        })
        .catch((error) => {
            console.error('Error sending friend request:', error);
            showMessageModal('Error', 'Failed to send friend request. Please try again.');
        });
}

function acceptFriendRequest(friendId) {
    // Add friend to current user's friends list
    currentUser.friends.push(friendId);
    // Remove friend request
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id !== friendId);

    // Update current user's document
    db.collection('users').doc(currentUser.uid).update({
        friends: firebase.firestore.FieldValue.arrayUnion(friendId),
        friendRequests: currentUser.friendRequests
    })
    .then(() => {
        // Add current user to friend's friends list
        return db.collection('users').doc(friendId).update({
            friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
    })
    .then(() => {
        showMessageModal('Success', 'Friend request accepted.');
        refreshFriendData();
    })
    .catch((error) => {
        console.error('Error accepting friend request:', error);
        showMessageModal('Error', 'Failed to accept friend request. Please try again.');
    });
}

function displayFriendsList() {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';
    currentUser.friends.forEach(friendId => {
        db.collection('users').doc(friendId).get()
            .then((doc) => {
                if (doc.exists) {
                    const friendData = doc.data();
                    const listItem = document.createElement('li');
                    listItem.textContent = friendData.username;
                    friendsList.appendChild(listItem);
                }
            })
            .catch((error) => {
                console.error('Error getting friend data:', error);
            });
    });
}

function showMessageModal(title, message) {
    const modal = document.getElementById('messageModal');
    const titleElement = document.getElementById('messageTitle');
    const textElement = document.getElementById('messageText');
    const closeButton = document.getElementById('closeMessageModal');

    titleElement.textContent = title;
    textElement.textContent = message;
    modal.style.display = 'block';

    closeButton.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmAction');
    const cancelButton = document.getElementById('cancelAction');

    messageElement.textContent = message;
    modal.style.display = 'block';

    confirmButton.onclick = function() {
        modal.style.display = 'none';
        onConfirm();
    };

    cancelButton.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}
