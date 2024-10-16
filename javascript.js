// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBtRsXupKN0ZBot8kAumYX0NRNm9DE6czo",
    authDomain: "levelup-8b1fa.firebaseapp.com",
    databaseURL: "https://levelup-8b1fa-default-rtdb.firebaseio.com",
    projectId: "levelup-8b1fa",
    storageBucket: "levelup-8b1fa.appspot.com",
    messagingSenderId: "271893990172",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

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

    getTopActivities(count = 3) {
        const activityCounts = {};
        this.experiences.forEach(exp => {
            activityCounts[exp.category] = (activityCounts[exp.category] || 0) + 1;
        });
        
        return Object.entries(activityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([category, _]) => category);
    }
}

let currentUser = null;

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('userProfile').style.display = 'none';
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
                    profilePictureUrl: data.profilePictureUrl || 'placeholder.jpg',
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
                    profilePictureUrl: 'placeholder.jpg',
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


function initializeProfilePicture() {
    document.getElementById('uploadProfilePicture').addEventListener('click', () => {
        document.getElementById('profilePictureInput').click();
    });

    document.getElementById('profilePictureInput').addEventListener('change', uploadProfilePicture);
    document.getElementById('removeProfilePicture').addEventListener('click', removeProfilePicture);
}

function uploadProfilePicture(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
        showMessageModal('Error', 'Please upload a valid image file (JPEG, PNG, or GIF).');
        return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessageModal('Error', 'Please upload an image smaller than 5MB.');
        return;
    }

    const storageRef = storage.ref(`profile_pictures/${currentUser.uid}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            // You can add a progress indicator here if you want
        }, 
        (error) => {
            console.error('Upload failed:', error);
            showMessageModal('Error', 'Failed to upload image. Please try again.');
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                updateProfilePicture(downloadURL);
            });
        }
    );
}

function updateProfilePicture(imageUrl) {
    currentUser.profilePictureUrl = imageUrl;
    document.getElementById('profilePicture').src = imageUrl;
    
    db.collection('users').doc(currentUser.uid).update({
        profilePictureUrl: imageUrl
    }).then(() => {
        showMessageModal('Success', 'Profile picture updated successfully!');
        // Refresh the friends list to show the updated profile picture
        displayFriendsList();
    }).catch((error) => {
        console.error('Error updating profile picture URL:', error);
        showMessageModal('Error', 'Failed to update profile picture. Please try again.');
    });
}


function removeProfilePicture() {
    const defaultImageUrl = 'placeholder.jpg';
    updateProfilePicture(defaultImageUrl);

    // Remove the image from Firebase Storage
    const storageRef = storage.ref(`profile_pictures/${currentUser.uid}`);
    storageRef.delete().catch((error) => {
        console.error('Error removing profile picture from storage:', error);
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
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('userProfile').style.display = 'block';
            console.log("User profile display set to block");

            document.getElementById('profileUsername').textContent = currentUser.displayName;
            document.getElementById('profilePicture').src = currentUser.profilePictureUrl;

            if (!currentUser.tracker || !currentUser.tracker.experiences) {
                console.log("Initializing experiences array for user");
                currentUser.tracker = new ExperienceTracker([]);
                saveUserData(currentUser).catch(error => {
                    console.error("Error saving initialized user data:", error);
                });
            }

            displayUserExperiences();
            updateTotalExpDisplay();
            displayFriendsList();
            initializeProfilePicture();

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
    document.getElementById('userProfile').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('userProfile').style.display = 'none';
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
        const maxColumns = 3;
        const maxPerColumn = 10;
        const experiences = currentUser.tracker.experiences;
        const columnCount = Math.min(maxColumns, Math.ceil(experiences.length / maxPerColumn));

        for (let i = 0; i < columnCount; i++) {
            const column = document.createElement('div');
            column.className = 'experience-column';
            
            const startIndex = i * maxPerColumn;
            const endIndex = Math.min((i + 1) * maxPerColumn, experiences.length);
            
            for (let j = startIndex; j < endIndex; j++) {
                const exp = experiences[j];
                const expElement = document.createElement('div');
                expElement.className = 'experience-item';
                expElement.innerHTML = `
                    <input type="checkbox" class="experience-checkbox" data-id="${exp.id}">
                    <label>${exp.category}: ${exp.amount.toFixed(2)}</label>
                `;
                column.appendChild(expElement);
            }
            
            experienceContainer.appendChild(column);
        }
    }
    console.log("Experiences displayed successfully");
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
                            listItem.className = 'friend-item';
                            const friendLevel = calculateLevel(friendData.totalAccumulatedExp, friendData.experiences);
                            const friendTracker = new ExperienceTracker(friendData.experiences);
                            const topActivities = friendTracker.getTopActivities(3);
                            
                            let friendContent = '<div class="friend-info">';
                            
                            if (friendData.profilePictureUrl && friendData.profilePictureUrl !== 'placeholder.jpg') {
                                friendContent += `<img src="${friendData.profilePictureUrl}" alt="${friendData.username}" class="friend-profile-pic">`;
                            }
                            
                            friendContent += `
                                <div class="friend-details">
                                    <strong>${friendData.username}</strong> (Level ${friendLevel})
                                    <br>Top activities: ${topActivities.join(', ') || 'None'}
                                </div>
                            </div>`;
                            
                            listItem.innerHTML = friendContent;
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
