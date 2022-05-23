const inputLeft = document.getElementById("input-left");
const inputRight = document.getElementById("input-right");


const range = document.querySelector(".range");

const setLeftValue = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+inputRight.value - +value < 10) {
    _this.value = +inputRight.value - 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range.style.left = `${percent}%`;
};

const setRightValue = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+value - +inputLeft.value < 10) {
    _this.value = +inputLeft.value + 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range.style.right = `${100 - percent}%`;
};

if (inputLeft && inputRight) {
  inputLeft.addEventListener("input", setLeftValue);
  inputRight.addEventListener("input", setRightValue);
}

// 멀티팩터용 추가

const inputLeft2 = document.getElementById("input-left2");
const inputRight2 = document.getElementById("input-right2");


const range2 = document.querySelector(".range2");

const setLeftValue2 = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+inputRight2.value - +value < 10) {
    _this.value = +inputRight2.value - 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range2.style.left = `${percent}%`;
};

const setRightValue2 = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+value - +inputLeft2.value < 10) {
    _this.value = +inputLeft2.value + 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range2.style.right = `${100 - percent}%`;
};

if (inputLeft2 && inputRight2) {
  inputLeft2.addEventListener("input", setLeftValue2);
  inputRight2.addEventListener("input", setRightValue2);
}

// 3번째 추가

const inputLeft3 = document.getElementById("input-left3");
const inputRight3 = document.getElementById("input-right3");


const range3 = document.querySelector(".range3");

const setLeftValue3 = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+inputRight3.value - +value < 10) {
    _this.value = +inputRight3.value - 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range3.style.left = `${percent}%`;
};

const setRightValue3 = (e) => {
  const _this = e.target;
  const { value, min, max } = _this;

  if (+value - +inputLeft3.value < 10) {
    _this.value = +inputLeft3.value + 10;
  }

  const percent = ((+_this.value - +min) / (+max - +min)) * 100;

  range3.style.right = `${100 - percent}%`;
};

if (inputLeft3 && inputRight3) {
  inputLeft3.addEventListener("input", setLeftValue3);
  inputRight3.addEventListener("input", setRightValue3);
}