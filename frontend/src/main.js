import { TOKEN_KEY } from './config.js';
import { login, logout, register } from './authService.js'
import { setupNewThread, getThreadList } from './threadService.js';
import { showPage, showErrorMessage, formatDate } from './helpers.js';
console.log("Let's go!");

let start = 0;

function isSession() {
    if (localStorage.getItem(TOKEN_KEY)) {
        showPage("forumPage");
        //   getThreadList();
    }
    else {
        showPage("loginPage");
    }
}
function setupLoginPage() {
    const loginForm = document.getElementById("loginForm");
    // Toggle between login and register pages
    document.querySelector("a[href='#register']").addEventListener("click", () => {
        showPage('registerPage');
    });
    // Handle login form submission
    loginForm.addEventListener('submit', (e) => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        login(email, password)
            .catch(error => {
                console.error('Error logging in:', error);
                showErrorMessage(`${error.message}`, "loginError");
            });
        e.preventDefault();
    });

}
function setupRegisterPage() {
    const registerForm = document.getElementById("registerForm");

    // Toggle between login and register pages
    document.querySelector("a[href='#login']").addEventListener("click", (event) => {
        event.preventDefault();
        showPage('loginPage');
    });
    // Handle register form submission
    registerForm.addEventListener('submit', (e) => {
        const email = document.getElementById('registerEmail').value;
        const name = document.getElementById('registerName').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        register(email, name, password, confirmPassword)
            .catch(error => {
                console.error('Error signing up:', error);
                showErrorMessage(`${error.message}`, "registerError");
            })
        e.preventDefault();
    })
}


function setupForumPage() {
    //Logout button
    const logoutButton = document.getElementById("logout");
    logoutButton.addEventListener('click', logout);

    //Add button
    document.querySelectorAll(".add").forEach(button => {
        button.addEventListener('click', () => {
            setupNewThread();
        });
    });

    // Get thread list
    getThreadList(start);
}






document.addEventListener("DOMContentLoaded", function () {
    isSession();
    setupLoginPage();
    setupRegisterPage();
    setupForumPage();
});
