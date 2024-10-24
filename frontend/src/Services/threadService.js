import { API, TOKEN_KEY, USER_KEY, THREAD_KEY, USER_DETAIL_KEY, THREAD_CACHE_KEY, threadTime } from '../config.js';
import { post, get, put, deleteRequest, showErrorMessage, formatDate, clearContainer } from '../helpers.js';
import { getProfile, setupProfileDetail } from './userService.js';
import { setupCommentSection } from './commentService.js';




//Thread Setup Functions
export function setupNewThread() {
    clearContainer("threadContainer");
    const template = document.getElementById("newThread");
    const clone = template.content.cloneNode(true);

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    const cancelButton = threadContainer.querySelector("#cancel");
    const postButton = threadContainer.querySelector("#post");

    cancelButton.addEventListener("click", () => {
        clearContainer("threadContainer");
    });

    postButton.addEventListener("click", () => {
        const threadTitle = threadContainer.querySelector("#newTitle").value;
        const radios = threadContainer.querySelectorAll('input[name="newVisibility"]');
        const threadContent = threadContainer.querySelector("#newContent").value;

        let threadVisibility;
        radios.forEach(radio => {
            if (radio.checked) {
                threadVisibility = radio.value === "true";
            }
        });

        if (threadTitle) {
            postButton.disabled = true;
            newThread(threadTitle, threadVisibility, threadContent)
                .then(threadId => {
                    fetchThread(threadId)
                        .then(response => { setupThreadDetail(response.threadDetails, response.authorDetails) })
                })
                .catch(error => {
                    console.error(error);
                    showErrorMessage(error, "newThreadError");
                })
                .finally(() => {
                    postButton.disabled = false;
                });
        } else {
            showErrorMessage("Thread's title can't be empty!", "newThreadError");
        }
    });
}

function setupEditThread(thread) {
    clearContainer("threadContainer");
    const template = document.getElementById("editThread");
    const clone = template.content.cloneNode(true);

    // Pre-populated fields based on the current thread data
    clone.querySelector("#editTitle").value = thread.title;
    clone.querySelector("#editContent").value = thread.content;
    const visibility = clone.querySelectorAll('input[name="editVisibility"]');
    visibility.forEach(radio => {
        if (radio.value === String(thread.isPublic)) {
            radio.checked = true;
        }
    });
    const status = clone.querySelectorAll('input[name="editStatus"]')
    status.forEach(radio => {
        if (radio.value === String(thread.lock)) {
            radio.checked = true;
        }
    });

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    const cancelButton = threadContainer.querySelector("#cancelEdit");
    const saveButton = threadContainer.querySelector("#saveEdit");

    cancelButton.addEventListener("click", () => {
        clearContainer("threadContainer");
    });

    saveButton.addEventListener("click", () => {
        const threadTitle = threadContainer.querySelector("#editTitle").value;
        const radios = threadContainer.querySelectorAll('input[name="editVisibility"]');
        const status = threadContainer.querySelectorAll('input[name="editStatus"]')
        const threadContent = threadContainer.querySelector("#editContent").value;

        let threadVisibility;
        radios.forEach(radio => {
            if (radio.checked) {
                threadVisibility = (radio.value === "true");
            }
        });

        let threadStatus;
        status.forEach(radio => {
            if (radio.checked) {
                threadStatus = (radio.value === "true");
            }
        });

        if (threadTitle) {
            saveButton.disabled = true;
            editThread(thread.id, threadTitle, threadVisibility, threadStatus, threadContent)
                .then(() => {
                    fetchThread(thread.id)
                        .then(response => { setupThreadDetail(response.threadDetails, response.authorDetails) })
                        .catch(error => {
                            console.error(error);
                        })
                })
                .catch(error => {
                    console.error(error);
                    showErrorMessage(error, "editThreadError");
                })
                .finally(() => {
                    saveButton.disabled = false;
                });
        } else {
            showErrorMessage("Thread's title can't be empty!", "editThreadError");
        }
    });
}

export function setupThreadDetail(thread, author) {
    clearContainer("threadContainer");
    var template = document.getElementById('showThread');
    var clone = template.content.cloneNode(true);

    // Insert thread's detail
    if (thread, author) {
        clone.querySelector('#threadTitle').textContent = thread.title;
        clone.querySelector('#threadId').textContent = `#${thread.id}`;
        if (author.image) {
            clone.querySelector('#authorAvatar').src = author.image;
        }
        const threadAuthor = clone.querySelector('.threadAuthor');
        threadAuthor.textContent = author.name;
        threadAuthor.id = author.id;
        clone.querySelector('#threadTime').textContent = formatDate(thread.createdAt);
        clone.querySelector('#threadContent').textContent = thread.content;
        clone.querySelector('#threadLikes').textContent = `${thread.likes.length}`;
        const lockClass = 'fa-lock';
        const unlockClass = 'fa-unlock';
        const status = clone.querySelector('#threadLock');
        status.classList.add(thread.lock ? lockClass : unlockClass);

        const threadContainer = document.getElementById("threadContainer");
        threadContainer.appendChild(clone);

        setupCommentSection(thread, JSON.parse(localStorage.getItem(USER_DETAIL_KEY)));
        setupThreadAction(thread);
        setupProfileView();
        let userKey = Number(localStorage.getItem(USER_KEY));
        handleLikeButton(thread, userKey);
        handleWatchButton(thread, userKey);
    }
}
function setupProfileView() {
    const threadContainer = document.querySelector("#threadContainer");
    const threadAuthor = threadContainer.querySelector(".threadAuthor");
    threadAuthor.addEventListener("click", () => {
        setupProfileDetail(threadAuthor.id)
    })
}
function setupThreadAction(thread) {
    if (toggleActionBox(thread.id)) {
        const editButton = document.querySelector("#editThreadButton");
        const deleteButton = document.querySelector("#deleteThreadButton");

        editButton.addEventListener("click", () => {
            if (thread.lock) {
                showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
                return;
            } else {
                setupEditThread(thread);
            }
        });

        deleteButton.addEventListener("click", () => {
            deleteThread(thread.id)
                .catch(error => {
                    console.error(error);
                });
        });
    }
}

export function getThreadList(start = 0) {
    return loadAllThreads()
        .then(threads => {
            const totalThreads = threads.length;
            const threadHeight = 100;
            let numberOfThreadsToLoad = Math.floor(window.innerHeight / threadHeight);
            if (start >= totalThreads) {
                console.log("No more threads to load.");
                return 0;
            }
            let loadAll = Math.min(totalThreads - start, numberOfThreadsToLoad);
            return loadThreads(start, loadAll)
                .then(fetchedThreads => {
                    fetchedThreads.forEach(thread => populateThreadList(thread));
                    return fetchedThreads.length;
                });
        });
}

export function populateThreadList(id, newThread = null) {
    fetchThread(id)
        .then(response => createThreadListItem(response.threadDetails, response.authorDetails, newThread))
        .catch(error => {
            console.error('Error displaying thread:', error);
        });
}

function createThreadListItem(thread, author, newThread) {
    const template = document.getElementById("threadListItemTemplate");
    const clone = template.content.cloneNode(true);

    const threadItem = clone.querySelector(".threadItem");
    threadItem.id = thread.id;
    clone.querySelector(".threadTitle").textContent = thread.title;
    clone.querySelector(".threadAuthor").textContent = `Posted by ${author.name}`;
    let likeString = thread.likes.length != 1 ? "likes" : "like";
    clone.querySelector(".threadTime").textContent = `${formatDate(thread.createdAt)} | ${thread.likes.length} ` + likeString;

    if (newThread) {
        const threadListContainer = document.getElementById("newThreadBox");
        threadListContainer.prepend(clone);
    }
    else {
        const threadListContainer = document.getElementById("threadList");
        threadListContainer.appendChild(clone);
    }


    threadItem.addEventListener('click', () => {
        fetchThread(thread.id)
            .then(response => {
                setupThreadDetail(response.threadDetails, response.authorDetails);
            })
            .catch(error => {
                console.error(error);
            });
    });
}

//Thread CRUD Operations
function newThread(title, isPublic, content) {
    return post(API + "/thread", { title, isPublic, content }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                const { id } = response;
                console.log(`Post ${id} new thread successfully!`);
                storeOwnedThread(id);
                populateThreadList(id, true);
                cacheThread(id);
                return id;
            } else {
                throw new Error(response.error);
            }
        });
}

function editThread(id, title, isPublic, lock, content) {
    return put(API + "/thread", { id, title, isPublic, lock, content }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                console.log(`Edit thread ${id} successfully!`);
                cacheThread(id);
                return id;
            } else {
                throw new Error(response.error);
            }
        });
}

function deleteThread(id) {
    return deleteRequest(API + "/thread", { id }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                console.log(`Delete thread ${id} successfully!`);
                removeOwnedThread(id);
                removeFromThreadList(id);
                clearContainer("threadContainer");

                // Invalidate the cache
                // invalidateThreadCache(id);

                // Fetch the latest thread and show it
                const latestThread = document.querySelector(".threadItem");
                console.log(latestThread);
                if (latestThread) {
                    fetchThread(latestThread.id)
                        .then(response => { setupThreadDetail(response.threadDetails, response.authorDetails); });
                }
            } else {
                throw new Error(response.error);
            }
        });
}


export function getThread(id) {
    return get(API + "/thread", { id }, localStorage.getItem(TOKEN_KEY))
        .then(data => {
            if (data) {
                return data;
            } else {
                throw new Error(data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching thread:', error);
            return null;
        });
}

function fetchThreads(start, expectedCount, allThreads) {
    return get(API + "/threads", { start }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (response.error) {
                throw new Error(response.error);
            } else if (response.length > 0) {
                allThreads.push(...response);
                const newStart = start + response.length;
                if (expectedCount !== undefined && allThreads.length >= expectedCount) {
                    return allThreads.slice(0, expectedCount);
                } else {
                    return fetchThreads(newStart, expectedCount, allThreads);
                }
            } else {
                return allThreads;
            }
        });
}

// Function to load a specific number of threads
function loadThreads(start, limit) {
    let allThreads = [];
    return fetchThreads(start, limit, allThreads);
}

// Function to load all available threads
export function loadAllThreads() {
    const start = 0;
    let allThreads = [];
    return fetchThreads(start, undefined, allThreads);
}



// Thread Interaction (Like, Watch)
function handleLikeButton(thread, userKey) {
    let likes = [];

    if (Array.isArray(thread.likes)) {
        likes = thread.likes;
    } else if (thread.likes && thread.likes.length > 0) {
        try {
            const parsedLikes = JSON.parse(thread.likes);
            likes = Array.isArray(parsedLikes) ? parsedLikes : [parsedLikes];
        } catch (error) {
            console.error("Error parsing likes:", error);
            likes = [];
        }
    }

    let liked = likes.includes(userKey);
    const likeButton = document.querySelector("#like");
    updateLikeButton(liked);

    likeButton.addEventListener("click", () => {
        if (thread.lock) {
            showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
            return;
        } else {
            const newLikedState = !liked;
            liked = newLikedState;
            updateLikeButton(liked);
            updateLikeNumber(thread, liked);

            likeThread(thread.id, liked)
                .catch(error => {
                    console.error(error);
                    liked = !newLikedState;
                    updateLikeButton(liked);
                    updateLikeNumber(thread, liked);
                });
        }
    });
}

function handleWatchButton(thread, userKey) {
    let watchees = [];

    if (Array.isArray(thread.watchees)) {
        watchees = thread.watchees;
    } else if (thread.watchees && thread.watchees.length > 0) {
        try {
            const parsedWatchees = JSON.parse(thread.watchees);
            watchees = Array.isArray(parsedWatchees) ? parsedWatchees : [parsedWatchees];
        } catch (error) {
            console.error("Error parsing watchees:", error);
            watchees = [];
        }
    }

    let watched = watchees.includes(userKey);
    const watchButton = document.querySelector("#watch");
    updateWatchButton(watched);

    watchButton.addEventListener("click", () => {
        const newWatchedState = !watched;
        watched = newWatchedState;
        updateWatchButton(watched);


        watchThread(thread.id, watched)
            .catch(error => {
                console.error("Error updating watch status:", error);
                watched = !newWatchedState;
                updateWatchButton(watched);
            });
    });
}

function updateLikeNumber(thread, liked) {
    let likeCount = parseInt(document.querySelector("#threadLikes").textContent);
    liked ? likeCount += 1 : likeCount -= 1;
    document.querySelector("#threadLikes").textContent = likeCount;

    const threadListItem = document.getElementById(thread.id);
    const threadTimeText = threadListItem.querySelector(`.threadTime`).textContent;

    const [datePart] = threadTimeText.split('|').map(part => part.trim());

    const newLikesText = likeCount === 1 ? `${likeCount} like` : `${likeCount} likes`;

    threadListItem.querySelector(`.threadTime`).textContent = `${datePart} | ${newLikesText}`;
}

function updateLikeButton(turnon) {
    const likeButton = document.querySelector("#like");
    if (turnon) {
        likeButton.classList.add("text-red-500");
    } else {
        likeButton.classList.remove("text-red-500");
    }
}

function updateWatchButton(turnon) {
    const watchButton = document.querySelector("#watch");
    if (turnon) {
        watchButton.classList.add("text-red-500");
    } else {
        watchButton.classList.remove("text-red-500");
    }
}

// Thread Interaction CRUD Operations
function likeThread(id, turnon) {
    return put(API + "/thread/like", { id, turnon }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                cacheThread(id);
                console.log(`Thread ${id} ${turnon ? "liked" : "unliked"} successfully!`);
            } else {
                throw new Error(response.error);
            }
        });
}

function watchThread(id, turnon) {
    return put(API + "/thread/watch", { id, turnon }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                cacheThread(id);
                console.log(`Thread ${id} ${turnon ? "watched" : "unwatched"} successfully!`);
            } else {
                throw new Error(response.error);
            }
        });
}

// Utility 
function toggleActionBox(threadId) {
    let ownedThreads = localStorage.getItem(THREAD_KEY);
    if (ownedThreads) {
        ownedThreads = JSON.parse(ownedThreads);
    } else {
        ownedThreads = [];
    }
    const actionBox = document.querySelector('.actionBox');

    return new Promise((resolve, reject) => {
        const userDetail = JSON.parse(localStorage.getItem(USER_DETAIL_KEY));
        if (ownedThreads.includes(threadId)) {
            actionBox.classList.remove("hidden");
            resolve(true);
        } else if (userDetail.admin) {
            actionBox.classList.remove("hidden");
            resolve(true);
        } else {
            getThread(threadId)
                .then(thread => {
                    if (thread.creatorId == userDetail.id) {
                        actionBox.classList.remove("hidden");
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                })
                .catch(error => {
                    console.error(error);
                    reject(error);
                });
        }
    });
}

function loadThreadCache() {
    const cachedData = localStorage.getItem(THREAD_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : {};
}

function saveThreadCache(cache) {
    localStorage.setItem(THREAD_CACHE_KEY, JSON.stringify(cache));
}

export function fetchThread(threadId) {
    const cache = loadThreadCache();

    // Fetch thread details from the server and update cache
    return getThread(threadId).then(threadDetails => {
        return getProfile(threadDetails.creatorId).then(authorDetails => {
            const threadData = { threadDetails, authorDetails };

            cache[threadId] = {
                ...threadData,
            };
            saveThreadCache(cache);

            return threadData;
        });
    }).catch(error => {
        if (error instanceof NetworkError) {
            if (cache[threadId]) {
                console.warn(`Network error, returning cached thread ${threadId}.`);
                saveThreadCache(cache);
                return cache[threadId];
            }
        }
        throw error;
    });
}

function cacheThread(threadId) {
    return getThread(threadId).then(threadDetails => {
        const cache = loadThreadCache();
        cache[threadId] = {
            threadDetails,
        };
        saveThreadCache(cache);
    });
}

function storeOwnedThread(threadId) {
    let ownedThread = [];
    let ownedThreads = localStorage.getItem(THREAD_KEY);
    if (ownedThreads) {
        ownedThreads = JSON.parse(ownedThreads);
    } else {
        ownedThreads = [];
    }
    if (!ownedThread.includes(threadId)) {
        ownedThread.push(threadId);
    }
    localStorage.setItem(THREAD_KEY, JSON.stringify(ownedThreads));
}

function removeOwnedThread(threadId) {
    let ownedThreads = localStorage.getItem(THREAD_KEY);
    if (ownedThreads) {
        ownedThreads = JSON.parse(ownedThreads);
    } else {
        ownedThreads = [];
    }
    const index = ownedThreads.indexOf(threadId);
    if (index !== -1) {
        ownedThreads.splice(index, 1);
        localStorage.setItem(THREAD_KEY, JSON.stringify(ownedThreads));
    }
}

function removeFromThreadList(id) {
    const thread = document.getElementById(id);
    if (thread) {
        thread.remove();
    }
}


