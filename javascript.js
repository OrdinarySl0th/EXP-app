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
        this.experiences = experiences.map(exp => ({...exp, count: exp.count || 0}));
    }

    addExperience(amount, category) {
        const newExp = {id: Date.now().toString(), amount, category, count: 0};
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

    incrementCount(id) {
        const exp = this.experiences.find(exp => exp.id === id);
        if (exp) {
            exp.count = (exp.count || 0) + 1;
        }
    }

    getTopActivities(n = 3) {
        return this.experiences
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, n)
            .map(exp => exp.category);
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
    }, { merge: true })
    .catch(error => {
        console.error("Firestore save error:", error);
        throw error;
    });
}



// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
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

function login() {
    console.log("Login function called");
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
            console.log("Firebase authentication successful for user:", userCredential.user.uid);
            return loadUserData(userCredential.user);
        })
        .then((loadedUser) => {
            if (!loadedUser) {
                throw new Error("Failed to load user data");
            }
            currentUser = loadedUser;
            console.log("User data loaded successfully:", currentUser);
            return showDashboard();
        })
        .then(() => {
            console.log("Dashboard displayed successfully");
        })
        .catch((error) => {
            console.error("Login error:", error);
            let errorMessage = "Login failed. ";
            if (error.code) {
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
            } else {
                errorMessage += error.message || "An unexpected error occurred.";
            }
            showMessageModal("Error", errorMessage);
            showLogin(); // Ensure login form is displayed in case of error
        });
}

function register() {
    console.log("Register function called");
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    
    console.log("Attempting to register with username:", username);
    
    if (!username || !password) {
        console.error("Username or password is empty");
        showMessageModal("Error", "Username and password cannot be empty!");
        return;
    }

    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            console.log("User registered successfully:", userCredential.user.uid);
            return userCredential.user.updateProfile({
                displayName: username
            });
        })
        .then(() => {
            console.log("User profile updated successfully");
            showMessageModal("Success", "Registration successful! Please log in.");
            showLogin();
        })
        .catch((error) => {
            console.error("Registration error:", error.code, error.message);
            let errorMessage = "Registration failed. ";
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += "This email is already registered.";
                    break;
                case 'auth/invalid-email':
                    errorMessage += "Invalid email format.";
                    break;
                case 'auth/weak-password':
                    errorMessage += "Password is too weak.";
                    break;
                default:
                    errorMessage += error.message;
            }
            showMessageModal("Error", errorMessage);
        });
}

function logout() {
    console.log("Logout function called");
    firebase.auth().signOut()
        .then(() => {
            console.log('User signed out');
            currentUser = null;
            // Clear any cached data or reset application state here
            document.getElementById('mainContent').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
            console.log("Login form displayed after logout");
            // Clear any input fields or reset UI elements
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        })
        .catch((error) => {
            console.error('Logout error', error);
            showMessageModal("Error", 'An error occurred during logout. Please try again.');
        });
}

function loadUserData(user) {
    console.log("Loading user data for:", user.uid);
    
    return db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                console.log("Existing user document found:", data);
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
                const newUserData = {
                    uid: user.uid,
                    displayName: user.displayName,
                    experiences: [],
                    totalAccumulatedExp: 0,
                    friends: [],
                    friendRequests: []
                };
                
                // Create a new document in Firestore
                return db.collection('users').doc(user.uid).set(newUserData)
                    .then(() => {
                        console.log("New user document created successfully");
                        return {
                            ...newUserData,
                            tracker: new ExperienceTracker()
                        };
                    })
                    .catch((error) => {
                        console.error("Error creating new user document:", error);
                        throw error;
                    });
            }
        })
        .catch((error) => {
            console.error("Error loading user data:", error);
            throw error;
        });
}

function showDashboard() {
    console.log("showDashboard function called");
    return new Promise((resolve, reject) => {
        if (!currentUser) {
            console.error("No current user when trying to show dashboard");
            showMessageModal("Error", "An error occurred while loading your data. Please try logging in again.");
            reject(new Error("No current user"));
            return;
        }
        console.log("Current user:", currentUser);

        try {
            // supposed to display main content window
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            console.log("Main content display set to block");

            // Ensure user has an experiences array
            if (!currentUser.tracker || !currentUser.tracker.experiences) {
                console.log("Initializing experiences array for user");
                currentUser.tracker = new ExperienceTracker([]);
                saveUserData(currentUser).catch(error => {
                    console.error("Error saving initialized user data:", error);
                });
            }

            console.log("Before displayUserExperiences");
            displayUserExperiences();
            console.log("After displayUserExperiences");

            console.log("Before updateTotalExpDisplay");
            updateTotalExpDisplay();
            console.log("After updateTotalExpDisplay");

            console.log("Before displayFriendsList");
            displayFriendsList();
            console.log("After displayFriendsList");

            console.log("Dashboard displayed successfully");
            resolve();
        } catch (error) {
            console.error("Error in showDashboard:", error);
            showMessageModal("Error", "An error occurred while displaying the dashboard. Please try logging in again.");
            reject(error);
        }
    });
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
    console.log("displayUserExperiences function called");
    try {
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
        
        console.log("Number of experiences:", currentUser.tracker.experiences.length);
        
        if (currentUser.tracker.experiences.length === 0) {
            experienceContainer.innerHTML = '<p>No experiences added yet. Add your first experience above!</p>';
        } else {
            currentUser.tracker.experiences.forEach((exp) => {
                try {
                    const expElement = document.createElement('div');
                    expElement.innerHTML = `<input type="checkbox" class="experience-checkbox" data-id="${exp.id}"> ${exp.category}: ${exp.amount.toFixed(2)}`;
                    experienceContainer.appendChild(expElement);
                } catch (error) {
                    console.error("Error creating experience element:", error, exp);
                }
            });
        }
        console.log("Experiences displayed successfully");
    } catch (error) {
        console.error("Error in displayUserExperiences:", error);
    }
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
    console.log("calculateLevel called with totalExp:", totalExp, "experiences:", experiences);
    let level = 0;
    let expThreshold = calculateThreshold(experiences, level);
    
    // Prevent infinite loop by limiting iterations
    const MAX_ITERATIONS = 1000;
    let iterations = 0;
    
    while (totalExp >= expThreshold && iterations < MAX_ITERATIONS) {
        totalExp -= expThreshold;
        level++;
        expThreshold = calculateThreshold(experiences, level);
        iterations++;
    }
    
    if (iterations === MAX_ITERATIONS) {
        console.warn("Max iterations reached in calculateLevel. This might indicate an issue with the experience data.");
    }
    
    console.log("calculateLevel result:", level);
    return level;
}

function calculateThreshold(experiences, currentLevel) {
    console.log("calculateThreshold called with experiences:", experiences, "currentLevel:", currentLevel);
    const totalCheckboxes = experiences.length;
    const sumOfExperiences = experiences.reduce((sum, exp) => sum + exp.amount, 0);
    
    // If there are no experiences, return a default threshold
    if (totalCheckboxes === 0 || sumOfExperiences === 0) {
        console.log("No experiences or sum is zero, returning default threshold");
        return 100 * (currentLevel + 1);
    }
    
    const threshold = totalCheckboxes * sumOfExperiences * (currentLevel + 1);
    console.log("calculateThreshold result:", threshold);
    return threshold;
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
            currentUser.tracker.incrementCount(expId);
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
        displayUserExperiences();
        checkboxes.forEach(cb => cb.checked = false);
    }).catch((error) => {
        console.error("Error saving calculated experience:", error);
        showMessageModal("Error", "Failed to save the calculated experience. Please try again.");
    });
}

function calculateMaxExp(user) {
    console.log("calculateMaxExp called with user:", user);
    if (!user || !user.tracker || !user.tracker.experiences) {
        console.error("Invalid user object for maxExp calculation");
        return 100; // Default value if user data is invalid
    }

    const currentLevel = calculateLevel(user.totalAccumulatedExp, user.tracker.experiences);
    const maxExp = calculateThreshold(user.tracker.experiences, currentLevel);
    console.log("calculateMaxExp result:", maxExp);
    return maxExp;
}


function updateTotalExpDisplay() {
    console.log("updateTotalExpDisplay function called");
    try {
        if (!currentUser) {
            console.warn('No current user when updating exp display');
            return;
        }

        console.log("Calculating maxExp");
        const maxExp = calculateMaxExp(currentUser);
        console.log("maxExp calculated:", maxExp);

        console.log("Calculating currentLevel");
        const currentLevel = calculateLevel(currentUser.totalAccumulatedExp, currentUser.tracker.experiences);
        console.log("currentLevel calculated:", currentLevel);

        console.log("Calculating expForNextLevel");
        const expForNextLevel = calculateThreshold(currentUser.tracker.experiences, currentLevel);
        console.log("expForNextLevel calculated:", expForNextLevel);

        console.log("Calculating remainingExp");
        const remainingExp = Math.max(0, currentUser.totalAccumulatedExp - calculateThreshold(currentUser.tracker.experiences, currentLevel - 1));
        console.log("remainingExp calculated:", remainingExp);

        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            console.log("Updating progress bar");
            progressBar.max = Math.max(1, expForNextLevel); // Ensure max is at least 1
            progressBar.value = remainingExp;
        } else {
            console.warn("Progress bar element not found");
        }

        const totalExpDisplay = document.getElementById('totalExpDisplay');
        if (totalExpDisplay) {
            console.log("Updating total exp display");
            totalExpDisplay.textContent = `Total Experience: ${currentUser.totalAccumulatedExp} (Level ${currentLevel}, ${remainingExp}/${expForNextLevel})`;
        } else {
            console.warn("Total exp display element not found");
        }

        console.log("Total exp display updated successfully");
    } catch (error) {
        console.error("Error in updateTotalExpDisplay:", error);
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

function resetProgress() {
    showConfirmModal(
        "Are you sure you want to reset your progress? This will reset your total experience, level, and all activity check counts to zero. This action cannot be undone.",
        () => {
            currentUser.totalAccumulatedExp = 0;
            // Reset all activity counts to zero
            currentUser.tracker.experiences.forEach(exp => {
                exp.count = 0;
            });
            updateTotalExpDisplay();
            displayUserExperiences();
            saveUserData(currentUser)
                .then(() => {
                    showMessageModal("Success", "Progress reset successfully! All experience, levels, and activity counts have been set to zero.");
                })
                .catch((error) => {
                    console.error("Error resetting progress:", error);
                    showMessageModal("Error", "Failed to reset progress. Please try again.");
                });
        }
    );
}


// Function to show the reset confirmation modal
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
        displayFriendsList(); // Refresh the friends list
    })
    .catch((error) => {
        console.error('Error accepting friend request:', error);
        showMessageModal('Error', 'Failed to accept friend request. Please try again.');
    });
}

function displayFriendsList() {
    console.log("displayFriendsList function called");
    try {
        const friendsList = document.getElementById('friendsList');
        const friendRequestsList = document.getElementById('friendRequestsList');
        friendsList.innerHTML = '';
        friendRequestsList.innerHTML = '';

        if (!currentUser) {
            console.warn('No user data available');
            friendsList.innerHTML = '<p>No friends data available.</p>';
            friendRequestsList.innerHTML = '<p>No friend requests available.</p>';
            return;
        }

        // Display friends
        if (currentUser.friends && currentUser.friends.length > 0) {
            currentUser.friends.forEach(friendId => {
                db.collection('users').doc(friendId).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const friendData = doc.data();
                            const listItem = document.createElement('li');
                            const friendLevel = calculateLevel(friendData.totalAccumulatedExp, friendData.experiences);
                            const topActivities = new ExperienceTracker(friendData.experiences).getTopActivities();
                            listItem.innerHTML = `
                                <strong>${friendData.username}</strong> (Level ${friendLevel})
                                <br>Top activities: ${topActivities.join(', ')}
                            `;
                            friendsList.appendChild(listItem);
                        }
                    })
                    .catch((error) => {
                        console.error('Error getting friend data:', error);
                    });
            });
        } else {
            friendsList.innerHTML = '<p>No friends added yet.</p>';
        }

        // Display friend requests (unchanged)
        if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
            currentUser.friendRequests.forEach(requesterId => {
                db.collection('users').doc(requesterId).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const requesterData = doc.data();
                            const listItem = document.createElement('li');
                            listItem.textContent = `${requesterData.username} wants to be your friend`;
                            const acceptButton = document.createElement('button');
                            acceptButton.textContent = 'Accept';
                            acceptButton.onclick = () => acceptFriendRequest(requesterId);
                            listItem.appendChild(acceptButton);
                            friendRequestsList.appendChild(listItem);
                        }
                    })
                    .catch((error) => {
                        console.error('Error getting friend request data:', error);
                    });
            });
        } else {
            friendRequestsList.innerHTML = '<p>No pending friend requests.</p>';
        }

        console.log("Friends list and requests displayed successfully");
    } catch (error) {
        console.error("Error in displayFriendsList:", error);
    }
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
// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Unhandled error:", message, "at", source, ":", lineno, ":", colno);
    console.error("Error object:", error);
    showMessageModal("Error", "An unexpected error occurred. Please try refreshing the page.");
    return true;
};
