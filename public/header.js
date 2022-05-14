// dashboard 반응형
const dashBtn = document.querySelector(".DashBoard");
const underdash = document.querySelector(".under-DashBoard");
dashBtn.addEventListener("click", () => {
  underdash.classList.toggle("active");
});

// login 팝업창 반응형
const obutton = document.querySelector(".obutton");
const xbutton = document.querySelector(".xbutton");
const loginbox = document.querySelector(".login-box");

loginbox.classList.toggle("active");

xbutton.addEventListener("click", () => {
  loginbox.classList.toggle("active");
});
obutton.addEventListener("click", () => {
  loginbox.classList.toggle("active");
});
