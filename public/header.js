const dashBtn = document.querySelector(".DashBoard");
const underdash = document.querySelector(".under-DashBoard");

dashBtn.addEventListener("click", () => {
  underdash.classList.toggle("active");
});
