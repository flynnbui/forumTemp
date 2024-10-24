import { get, post, put, showErrorMessage } from "../helpers.js";
import { API, TOKEN_KEY, USER_DETAIL_KEY, USER_KEY } from "../config.js";
import { fetchProfile, setupProfileDetail } from "./userService.js";

let currentComment = null;
let currentParentCommentId = null;

export function setupCommentSection(thread) {
    loadAndRenderComments(thread);
    setupPostCommentForm(thread);
    setupEditCommentModal(thread);
    setupReplyCommentModal(thread);
}

// Comment Setup Functions
function loadAndRenderComments(thread) {
    return fetchComments(thread.id)
        .then(comments => {
            const commentTree = buildCommentTree(comments);
            return fetchUserProfiles(comments)
                .then(profiles => {
                    const profileMap = createProfileMap(profiles);
                    clearCommentBox();
                    commentTree.forEach(topLevelComment =>
                        renderComment(thread, topLevelComment, profileMap)
                    );
                });
        })
        .catch(error => {
            console.error("Failed to load and render comments", error);
        });
}

function renderComment(thread, comment, profileMap, parentElement = null) {
    const author = profileMap[comment.creatorId];
    const commentElement = createCommentElement(thread, comment, author);

    const container = parentElement
        ? parentElement.querySelector(".subCommentBox")
        : document.querySelector(".commentBox");

    container.appendChild(commentElement);

    comment.children.forEach(childComment =>
        renderComment(thread, childComment, profileMap, commentElement)
    );
}

function createCommentElement(thread, comment, author) {
    const isSubComment = comment.parentCommentId;
    const templateId = isSubComment ? "subComment" : "mainComment";
    const template = document.getElementById(templateId);
    const clone = template.content.cloneNode(true);

    const commentElement = clone.querySelector(`.${templateId}`);
    commentElement.id = comment.id;

    const authorClass = isSubComment ? ".subCommentAuthor" : ".commentAuthor";
    const timeClass = isSubComment ? ".subCommentTime" : ".commentTime";
    const contentClass = isSubComment ? ".subCommentContent" : ".commentContent";
    const authorAvatarClass = isSubComment ? ".subcommentIMG" : ".commentIMG";

    const authorElement = commentElement.querySelector(authorClass);
    authorElement.textContent = author.name;
    authorElement.id = author.id;

    const timeElement = commentElement.querySelector(timeClass);
    timeElement.textContent = formatCommentTime(comment.createdAt, comment.likes.length);

    const contentElement = commentElement.querySelector(contentClass);
    contentElement.textContent = comment.content;

    if (author.image) {
        const authorAvatar = commentElement.querySelector(authorAvatarClass);
        authorAvatar.src = author.image;
    }

    // Setup event handlers
    // addLikeButtonHandler(thread, comment, commentElement);
    editButtonHandler(thread, comment, commentElement);
    replyButtonHandler(thread, comment, commentElement);
    likeButtonHandler(thread, comment, commentElement);
    setupAuthorCommentProfile(authorElement);

    return commentElement;
}

function setupPostCommentForm(thread, parentCommentId = null) {
    const discussionForm = document.querySelector("#discussionForm");
    const postButton = discussionForm.querySelector(".postButton");

    postButton.addEventListener("click", (e) => {
        e.preventDefault();
        const commentInputField = discussionForm.querySelector("#commentInput");
        const commentInput = commentInputField.value.trim();
        if (thread.lock) {
            showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
            return;
        }
        if (!commentInput) {
            showErrorMessage("Comment cannot be empty.", "showThreadError");
            return;
        }
        postComment(commentInput, thread, parentCommentId)
            .then(() => {
                commentInputField.value = "";
            });

    })

}

function setupEditCommentModal(thread) {
    const editModal = document.getElementById("editCommentModal");
    const commentContent = document.getElementById("commentContent");
    const closeModalButton = document.getElementById("closeEditCommentModal");
    const saveButton = document.getElementById("saveCommentButton");

    // Close modal button event listener
    closeModalButton.addEventListener("click", () => {
        editModal.classList.add("hidden");
        editModal.classList.remove("flex");
    });

    saveButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentComment) {
            console.error("No comment selected for editing.");
            return;
        }
        const updatedContent = commentContent.value.trim();
        if (!updatedContent) {
            showErrorMessage("Comment content cannot be empty.", "showThreadError");
            return;
        }
        updateComment(currentComment, updatedContent, thread);
        editModal.classList.add("hidden");
        editModal.classList.remove("flex");
    });
}

function setupReplyCommentModal(thread) {
    const replyModal = document.getElementById("replyCommentModal");
    const replyContent = document.getElementById("replyContent");
    const replyCommentButton = document.getElementById("postReplyButton");
    const closeReplyModalButton = document.getElementById("closeReplyModal");

    // Close modal button event listener
    closeReplyModalButton.addEventListener("click", () => {
        replyModal.classList.add("hidden");
        replyModal.classList.remove("flex");
        replyContent.value = "";
    });

    // Form submission event listener
    replyCommentButton.addEventListener("click", (e) => {
        e.preventDefault();
        const replyText = replyContent.value.trim();

        if (!replyText) {
            showErrorMessage("Comment content cannot be empty.", "showThreadError");
            return;
        }
        postComment(replyText, thread, currentParentCommentId);
        replyModal.classList.add("hidden");
        replyModal.classList.remove("flex");
        replyContent.value = "";
    });
}

function editButtonHandler(thread, comment, commentElement) {
    const editButton = commentElement.querySelector(".editButton");
    const editModal = document.getElementById("editCommentModal");
    const commentContent = document.getElementById("commentContent");

    const currentUser = JSON.parse(localStorage.getItem(USER_DETAIL_KEY));
    if (currentUser.admin || currentUser.id == comment.creatorId) {
        editButton.classList.remove("hidden");
        editButton.addEventListener("click", () => {
            if (thread.lock) {
                showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
                return;
            }
            currentComment = comment;
            commentContent.value = currentComment.content;
            editModal.classList.remove("hidden");
            editModal.classList.add("flex");
        });
    } else {
        editButton.classList.add("hidden");
    }
}

function replyButtonHandler(thread, comment, commentElement) {
    const replyButton = commentElement.querySelector(".replyButton");
    const replyModal = document.getElementById("replyCommentModal");

    replyButton.addEventListener("click", () => {
        if (thread.lock) {
            showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
            return;
        }
        replyModal.classList.remove("hidden");
        replyModal.classList.add("flex");
        currentParentCommentId = comment.id;
    });
}

function likeButtonHandler(thread, comment, commentElement) {
    let likes = [];
    if (comment.likes && comment.likes.length > 0) {
        try {
            const parsedLikes = JSON.parse(comment.likes);
            likes = Array.isArray(parsedLikes) ? parsedLikes : [parsedLikes];
        } catch (error) {
            console.error("Error parsing likes:", error);
            likes = [];
        }
    }
    let userKey = Number(localStorage.getItem(USER_KEY));
    let liked = likes.includes(userKey);

    const likeButton = commentElement.querySelector(".likeButton");
    likeButton.textContent = liked ? "Unlike" : "Like";

    likeButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (thread.lock) {
            showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
            return;
        }
        const newLikedState = !liked;
        liked = newLikedState;
        likeComment(thread, comment, newLikedState)
            .catch((error) => {
                console.error("Error handling like/unlike:", error);
                liked = !liked;
            });
    })
}

function setupAuthorCommentProfile(authorElement) {
    authorElement.addEventListener("click", () => {
        setupProfileDetail(authorElement.id)
    })
}


// Comment CRUD Operations
function getComments(threadId) {
    return get(API + "/comments", { threadId: threadId }, localStorage.getItem(TOKEN_KEY));
}
function postComment(commentInput, thread, parentCommentId) {
    post(API + "/comment", { content: commentInput, threadId: thread.id, parentCommentId: parentCommentId }, localStorage.getItem(TOKEN_KEY))
        .then(() => {
            clearCommentBox();
            loadAndRenderComments(thread);
        })
        .catch(error => {
            console.error("Failed to post new comment", error);
            showErrorMessage(`Failed to post new comment ${error}`, "showThreadError");
        });
}
function updateComment(currentComment, updatedContent, thread) {
    put(API + "/comment", { id: currentComment.id, content: updatedContent }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                console.log(`Comment ${currentComment.id} updated successfully!`);
                clearCommentBox();
                loadAndRenderComments(thread);
            } else {
                throw new Error(response.error);
            }
        })
        .catch((error) => {
            console.error("Error updating comment:", error);
            showErrorMessage("Error updating comment:", error);
        });
}
function likeComment(thread, comment, turnon) {
    return put(API + "/comment/like", { id: comment.id, turnon: turnon }, localStorage.getItem(TOKEN_KEY))
        .then(response => {
            if (!response.error) {
                console.log(`Comment ${comment.id} ${turnon ? "liked" : "unliked"} successfully!`);
                clearCommentBox();
                loadAndRenderComments(thread);
            } else {
                throw new Error(response.error);
            }
        })
}


// Utility 
function fetchComments(threadId) {
    return getComments(threadId)
        .catch(error => {
            console.error("Failed to fetch comments", error);
            throw error;
        });
}

function fetchUserProfiles(comments) {
    const uniqueUserIds = [...new Set(comments.map(comment => comment.creatorId))];
    const profilePromises = uniqueUserIds.map(userId =>
        fetchProfile(userId)
            .catch(error => {
                console.error(`Failed to fetch profile for user ${userId}`, error);
                return null;
            })
    );
    return Promise.all(profilePromises);
}

function createProfileMap(profiles) {
    return profiles.reduce((map, profile) => {
        if (profile) {
            map[profile.id] = profile;
        }
        return map;
    }, {});
}

function buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    for (const comment of comments) {
        comment.children = [];
        commentMap.set(comment.id, comment);
    }

    for (const comment of comments) {
        if (comment.parentCommentId) {
            const parentComment = commentMap.get(comment.parentCommentId);
            if (parentComment) {
                parentComment.children.push(comment);
            } else {
                rootComments.push(comment);
            }
        } else {
            rootComments.push(comment);
        }
    }

    sortComments(rootComments);
    return rootComments;
}

function sortComments(commentsArray) {
    commentsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const comment of commentsArray) {
        if (comment.children.length > 0) {
            sortComments(comment.children);
        }
    }
}

function clearCommentBox() {
    const commentBox = document.querySelector(".commentBox");
    commentBox.replaceChildren();
}

function formatCommentTime(createdAt, likes) {
    const timeUnits = [
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 }
    ];

    const now = new Date();
    const commentTime = new Date(createdAt);
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    for (const { unit, seconds } of timeUnits) {
        if (diffInSeconds >= seconds) {
            const count = Math.floor(diffInSeconds / seconds);
            const timeString = `${count} ${unit}${count > 1 ? 's' : ''} ago`;
            return `${timeString} | ${likes} like${likes !== 1 ? 's' : ''}`;
        }
    }

    return `Just now | ${likes} like${likes !== 1 ? 's' : ''}`;
}





