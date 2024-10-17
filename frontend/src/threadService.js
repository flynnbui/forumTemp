import { API } from './config.js';
import { TOKEN_KEY, USER_KEY, THREAD_KEY } from './config.js';
import { post, get, put, deleteRequest, showErrorMessage, formatDate } from './helpers.js';
import { getProfile } from './userService.js';


export function setupNewThread() {
    clearThreadContainer();
    const template = document.getElementById("newThread");
    const clone = template.content.cloneNode(true);

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    const cancelButton = threadContainer.querySelector("#cancel");
    const postButton = threadContainer.querySelector("#post");

    cancelButton.addEventListener("click", () => {
        clearThreadContainer();
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
                    return getThread(threadId);
                })
                .then(threadDetails => {
                    return getProfile(threadDetails.creatorId)
                        .then(authorDetails => {
                            setupThreadDetail(threadDetails, authorDetails);
                        });
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

function setupEditThread(threadId) {
    clearThreadContainer();
    const template = document.getElementById("editThread");
    const clone = template.content.cloneNode(true);

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);


    const cancelButton = threadContainer.querySelector("#cancelEdit");
    const saveButton = threadContainer.querySelector("#saveEdit");

    cancelButton.addEventListener("click", () => {
        clearThreadContainer();
    });

    saveButton.addEventListener("click", () => {
        const threadTitle = threadContainer.querySelector("#editTitle").value;
        const radios = threadContainer.querySelectorAll('input[name="editVisibility"]');
        const status = threadContainer.querySelectorAll('input[name="editStatus"]')
        const threadContent = threadContainer.querySelector("#editContent").value;

        let threadVisibility;
        radios.forEach(radio => {
            if (radio.checked) {
                threadVisibility = radio.value === "true";
            }
        });

        let threadStatus;
        status.forEach(radio => {
            if (radio.checked) {
                threadVisibility = radio.value === "true";
            }
        });

        if (threadTitle) {
            saveButton.disabled = true;
            editThread(threadId, threadTitle, threadVisibility, threadStatus, threadContent)
                .then(id => {
                    return getThread(threadId);
                })
                .then(threadDetails => {
                    return getProfile(threadDetails.creatorId)
                        .then(authorDetails => {
                            setupThreadDetail(threadDetails, authorDetails);
                        });
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

function setupThreadDetail(thread, author) {
    clearThreadContainer();
    var template = document.getElementById('showThread');
    var clone = template.content.cloneNode(true);

    // Insert thread's detail
    clone.querySelector('#threadTitle').textContent = thread.title;
    clone.querySelector('#threadId').textContent = `#${thread.id}`;
    clone.querySelector('#authorAvatar').src = author.image;
    clone.querySelector('#threadAuthor').textContent = author.name;
    clone.querySelector('#threadTime').textContent = formatDate(thread.createdAt);
    clone.querySelector('#threadContent').textContent = thread.content;

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    if (toggleActionBox(thread.id, localStorage.getItem(USER_KEY))) {
        const editButton = document.querySelector("#editThreadButton");
        const deleteButton = document.querySelector("#deleteThreadButton")
        //event listener for thread's interaction
        editButton.addEventListener("click", () => {
            console.log("edit's working")
            setupEditThread(thread.id);
        })

        deleteButton.addEventListener("click", () => {
            deleteThread(thread.id)
                .catch(error => {
                    console.error(error);
                });
        });
    }
        let userKey = Number(localStorage.getItem(USER_KEY));

        let likes = [];
        if (thread.likes && thread.likes.length > 0) {
            try {
                const parsedLikes = JSON.parse(thread.likes);
                likes = Array.isArray(parsedLikes) ? parsedLikes : [parsedLikes];
            } catch (error) {
                console.error("Failed to parse 'likes':", error);
                likes = [];
            }
        }
        let liked = likes.includes(userKey);
        const likeButton = document.querySelector("#like");
        toggleLike(liked);

        likeButton.addEventListener("click", () => {
            const newLikedState = !liked;
            liked = newLikedState;
            toggleLike(liked);

            likeThread(thread.id, liked)
                .catch(error => {
                    console.error("Error updating like status:", error);
                    liked = !newLikedState;
                    toggleLike(liked);
                });
        });


        let watchees = [];
        if (thread.watchees && thread.watchees.length > 0) {
            try {
                const parsedWatchees = JSON.parse(thread.watchees);
                watchees = Array.isArray(parsedWatchees) ? parsedWatchees : [parsedWatchees];
            } catch (error) {
                console.error("Failed to parse 'watchees':", error);
                watchees = [];
            }
        }
        let watched = watchees.includes(userKey);
        const watchButton = document.querySelector("#watch");
        toggleWatch(watched);
        watchButton.addEventListener("click", () => {
            const newWatchedState = !watched;
            watched = newWatchedState;
            toggleWatch(watched);

            watchThread(thread.id, watched)
                .catch(error => {
                    console.error("Error updating watch status:", error);
                    watched = !newWatchedState;
                    toggleWatch(watched);
                });
        });
}

    function newThread(title, isPublic, content) {
        return post(API + "/thread", { title, isPublic, content }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (!response.error) {
                    const { id } = response;
                    console.log(`Post ${id} new thread successfully!`);
                    storeOwnedThread(id);
                    populateThreadList(id, true);
                    return id;
                } else {
                    throw new Error(response.error);
                }
            })
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

    function editThread(id, title, isPublic, lock, content) {
        return put(API + "/thread", { id, title, isPublic, lock, content }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (!response.error) {
                    console.log(`Edit thread ${id} successfully!`);
                    return id;
                }
                else {
                    throw new Error(response.error);
                }
            })
    }

    function deleteThread(id) {
        return deleteRequest(API + "/thread", { id }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (!response.error) {
                    console.log(`Delete thread ${id} successfully!`);
                    removeOwnedThread(id);
                    removeFromThreadList(id);
                    clearThreadContainer();
                    return id;
                } else {
                    throw new Error(response.error);
                }
            })
    }
    function removeFromThreadList(id) {
        const thread = document.getElementById(id);
        if (thread) {
            thread.remove();
        }
    }


    function toggleActionBox(threadId, userId) {
        let ownedThreads = localStorage.getItem(THREAD_KEY);
        if (ownedThreads) {
            ownedThreads = JSON.parse(ownedThreads);
        } else {
            ownedThreads = [];
        }
        const actionBox = document.querySelector('.actionBox');

        return new Promise((resolve, reject) => {
            if (ownedThreads.includes(threadId)) {
                actionBox.classList.remove("hidden");
                resolve(true);
            } else {
                getThread(threadId)
                    .then(thread => {
                        if (thread.creatorId == userId) {
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

    function toggleLike(turnon) {
        const likeButton = document.querySelector("#like");
        if (turnon) {
            likeButton.classList.add("text-red-500");
        } else {
            likeButton.classList.remove("text-red-500");
        }
    }

    function toggleWatch(turnon) {
        const watchButton = document.querySelector("#watch");
        if (turnon) {
            watchButton.classList.add("text-red-500");
        } else {
            watchButton.classList.remove("text-red-500");
        }
    }

    function likeThread(id, turnon) {
        return put(API + "/thread/like", { id, turnon }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (!response.error) {
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
                    console.log(`Thread ${id} ${turnon ? "watched" : "unwatched"} successfully!`);
                } else {
                    throw new Error(response.error);
                }
            });
    }

    export function getThread(id) {
        console.log(`Getting thread ${id}`)
        return get(API + "/thread", { id: id }, localStorage.getItem('token'))
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

    export function populateThreadList(id, newThread = null) {
        getThread(id)
            .then(thread => {
                if (!thread) {
                    return Promise.reject('Failed to retrieve thread');
                }
                return getProfile(thread.creatorId).then(author => {
                    if (!author) {
                        return Promise.reject(thread.error);
                    }
                    createThreadListItem(thread, author, newThread);
                });
            })
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

        const threadListContainer = newThread ? document.getElementById("newThreadBox") : document.getElementById("threadList");
        threadListContainer.appendChild(clone);

        //Handle view thread event
        threadItem.addEventListener('click', () => {
            getThread(threadItem.id)
                .then(thread => {
                    return thread;
                })
                .then(threadDetails => {
                    return getProfile(threadDetails.creatorId)
                        .then(authorDetails => {
                            setupThreadDetail(threadDetails, authorDetails);
                        })
                })
                .catch(error => {
                    console.error(error);
                })
        })
    }

    export function getThreadList(start) {
        return get(API + "/threads", { start }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (response.error) {
                    throw new Error(response.error);
                } else {
                    if (response.length > 0) {
                        response.forEach(thread => {
                            populateThreadList(thread);
                        });
                        return response.length;
                    }
                }
            });
    }

    export function clearThreadContainer() {
        const threadContainer = document.getElementById("threadContainer");
        threadContainer.replaceChildren();
    }