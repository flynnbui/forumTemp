import { API, TOKEN_KEY, USER_DETAIL_KEY, USER_KEY } from '../config.js';
import { get, clearContainer, formatDate, fileToDataUrl, put } from '../helpers.js';
import { NetworkError } from '../Exceptions/NetworkError.js';
import { loadAllThreads, fetchThread, setupThreadDetail } from './threadService.js';

const cacheKey = 'profileCache';


// Load cache from localStorage
function loadCache() {
    const cachedData = localStorage.getItem(cacheKey);
    return cachedData ? JSON.parse(cachedData) : {};
}

// Save the cache back to localStorage
function saveCache(cache) {
    localStorage.setItem(cacheKey, JSON.stringify(cache));
}

// Fetch profile from server and update cache
export function fetchProfile(userId) {
    const cache = loadCache();

    return getProfile(userId).then(profile => {
        cache[userId] = {
            profile: profile,
        };
        saveCache(cache);
        return profile;
    }).catch(error => {
        if (error instanceof NetworkError) {
            // If a network error occurs, return cache
            if (cache[userId]) {
                console.warn(`Network error, returning cached profile for user ${userId}.`);
                return cache[userId].profile;
            }
        }
        throw error;
    });
}

export function getProfile(userId, token = localStorage.getItem('token')) {
    return get(API + "/user", { userId }, token)
        .then(data => {
            if (data) {
                return data;
            } else {
                throw new Error("No profile found for the given ID");
            }
        })
        .catch(error => {
            console.error(`Failed to fetch profile for user ${userId}:`, error);
            throw error;
        });
}

export function setupProfileDetail(profileId) {
    clearContainer("threadContainer");
    fetchProfile(profileId)
        .then(profile => {
            var template = document.getElementById("showProfile");
            var clone = template.content.cloneNode(true);

            if (profile.image) {
                clone.querySelector('#profileAvatar').src = profile.image;
            }
            clone.querySelector('#profileName').textContent = profile.name;
            clone.querySelector('#profileEmail').textContent = profile.email;
            clone.querySelector('.currentRole').textContent = profile.admin ? "Admin" : "User";

            const threadContainer = document.getElementById("threadContainer");

            //Make sure that thread container is empty
            if (threadContainer.hasChildNodes()) {
                threadContainer.replaceChildren();
            }

            threadContainer.appendChild(clone);
            if (profile.threadsWatching.length > 0) {
                populateWatchList(profile.threadsWatching);
            }
            populateOwnedThread(profile);
            setupEditButton(profile);
        })

}

function setupEditButton(profile) {
    const editProfileModal = document.getElementById("editProfileModal");
    const editProfileButton = document.querySelector(".editProfileButton");
    const closeModalButton = document.getElementById("closeEditProfileModal");
    const saveModalButton = document.getElementById("saveProfileButton");
    const currentUser = JSON.parse(localStorage.getItem(USER_DETAIL_KEY));
    const isCurrentUser = profile.id == localStorage.getItem(USER_KEY);
    const isAdmin = currentUser.admin;

    // Setup UI based on roles
    document.getElementById("userRole").disabled = !isAdmin;
    document.getElementById("editUserName").disabled = !isCurrentUser;
    document.getElementById("editUserEmail").disabled = !isCurrentUser;
    document.getElementById("editUserPassword").disabled = !isCurrentUser;
    document.getElementById("editUserImage").disabled = !isCurrentUser;

    // Populate fields
    document.getElementById("userRole").value = profile.admin;
    document.getElementById("editUserName").value = profile.name;
    document.getElementById("editUserEmail").value = profile.email;

    editProfileButton.classList.toggle("hidden", !isCurrentUser && !isAdmin);
    editProfileButton.classList.add("flex");

    // Update modal visibility
    editProfileButton.removeEventListener("click", editProfileButton.clickHandler);
    editProfileButton.clickHandler = () => {
        editProfileModal.classList.remove("hidden");
        editProfileModal.classList.add("flex");
    };
    editProfileButton.addEventListener("click", editProfileButton.clickHandler);

    closeModalButton.addEventListener("click", () => {
        editProfileModal.classList.add("hidden");
        editProfileModal.classList.remove("flex");
    });

    saveModalButton.removeEventListener("click", saveModalButton.clickHandler);
    saveModalButton.clickHandler = (e) => {
        e.preventDefault();
        handleSaveProfile(profile, isCurrentUser, isAdmin)
            .then(() => {
                editProfileModal.classList.add("hidden");
                editProfileModal.classList.remove("flex");
                setupProfileDetail(profile.id);
            });
    };
    saveModalButton.addEventListener("click", saveModalButton.clickHandler);
}


function handleSaveProfile(profile, isCurrentUser, isAdmin) {
    const userEmail = isCurrentUser ? document.getElementById("editUserEmail").value : null;
    const userPassword = isCurrentUser ? document.getElementById("editUserPassword").value : null;
    const userName = isCurrentUser ? document.getElementById("editUserName").value : null;
    const userImage = isCurrentUser ? document.getElementById("editUserImage").files[0] : null;
    const userRole =  document.getElementById("userRole").value;

    const shouldUpdateRole = isAdmin && userRole != profile.admin;

    if (userImage) {
        return fileToDataUrl(userImage)
            .then(imageDataUrl => saveProfileChanges(userEmail, userPassword, userName, imageDataUrl, profile, userRole, shouldUpdateRole));
    } else {
        return saveProfileChanges(userEmail, userPassword, userName, null, profile, userRole, shouldUpdateRole);
    }
}


function saveProfileChanges(userEmail, userPassword, userName, imageDataUrl, profile, userRole, shouldUpdateRole) {
    // Perform profile updates if there are any changes
    const hasProfileUpdates = userEmail || userPassword || userName || imageDataUrl;

    const updateProfile = hasProfileUpdates ? editProfile(userEmail, userPassword, userName, imageDataUrl) : Promise.resolve();

    return updateProfile.then(() => {
        if (shouldUpdateRole) {
            return roleEdit(profile.id, userRole);
        }
    });
}


function editProfile(email, password, name, image) {
    return put(API + "/user", { email, password, name, image }, localStorage.getItem(TOKEN_KEY))
        .catch(error => {
            console.error("Failed to update profile:", error);
        });
}


function roleEdit(userId, turnon) {
    return put(API + "/user/admin", { userId, turnon }, localStorage.getItem(TOKEN_KEY))
        .catch(error => {
            console.error(error);
        });
}


function getOwnedThread(profile) {
    let ownedThreads = [];
    return loadAllThreads()
        .then(threads => {
            const fetchPromises = threads.map(threadId => {
                return fetchThread(threadId)
                    .then(response => {
                        if (response.authorDetails.id === profile.id) {
                            ownedThreads.push(response);
                        }
                    });
            });
            return Promise.all(fetchPromises).then(() => ownedThreads);
        })
        .catch(error => { console.error(error); });
}

function populateWatchList(watchList) {
    clearContainer("watchThreadBox");
    watchList.forEach(threadId => {
        fetchThread(threadId)
            .then(thread => {
                const item = createProfileThreadItem(thread.threadDetails, thread.authorDetails);
                const watchThreadBox = document.querySelector("#watchThreadBox");
                watchThreadBox.appendChild(item);
            })
            .catch(error => {
                console.error('Error displaying thread in watchBox:', error);
            });
    });
}

function populateOwnedThread(profile) {
    clearContainer("ownedThreadBox");
    getOwnedThread(profile)
        .then(ownedThreads => {
            ownedThreads.forEach(thread => {
                const item = createProfileThreadItem(thread.threadDetails, thread.authorDetails);
                const ownedThreadBox = document.querySelector("#ownedThreadBox");
                ownedThreadBox.appendChild(item);
            });
        })
        .catch(error => {
            console.error("Error populating owned threads:", error);
        });
}

function createProfileThreadItem(thread, author) {
    var template = document.getElementById("profileThreadItem");
    var clone = template.content.cloneNode(true);

    const threadItem = clone.querySelector(".profileThreadItem");
    threadItem.id = thread.id;

    clone.querySelector('.profileThreadTitle').textContent = thread.title;
    clone.querySelector('.profileThreadAuthor').textContent = author.name;
    let likeString = thread.likes.length != 1 ? "likes" : "like";
    clone.querySelector(".profileThreadTime").textContent = `${formatDate(thread.createdAt)} | ${thread.likes.length} ` + likeString;

    threadItem.addEventListener('click', () => {
        fetchThread(thread.id)
            .then(response => {
                setupThreadDetail(response.threadDetails, response.authorDetails);
            })
            .catch(error => {
                console.error(error);
            });
    });

    return threadItem;
}
