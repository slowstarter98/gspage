require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use("/public", express.static("public"));

const methodeOverride = require("method-override");
app.use(methodeOverride("_method"));

// 사용 DB
var db;
// db연결
const MongoClient = require("mongodb").MongoClient;
MongoClient.connect(process.env.DB_URL, (error, client) => {
  if (error) {
    return console.log(error);
  }
  db = client.db("gspage");
  app.listen(process.env.PORT, function () {
    console.log("listening on 8080  + MongoDB - gspage 접속완료");
  });
});

//암호화
const createHashedPassword = (password) => {
  return crypto.createHash("sha512").update(password).digest("base64");
};

//회원가입요청
app.post("/signup", function (요청, 응답) {
  db.collection("login").insertOne(
    {
      email: 요청.body.email,
      password: createHashedPassword(요청.body.password),
    },
    function (에러, 결과) {
      console.log("db에 전송 완료");
      응답.redirect("/");
    }
  );
});

// 로그인 및 마이페이지-----------------------------------
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀번호코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

//로그인페이지
app.get("/login", function (요청, 응답) {
  응답.render("login.ejs", { 사용자: 요청.user });
});

//로그인 요청
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (요청, 응답) {
    console.log("로그인 성공");
    응답.render("home.ejs", { 사용자: 요청.user });
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: true,
      passReqToCallback: false,
    },
    function (입력이메일, 입력한비번, done) {
      db.collection("login").findOne(
        { email: 입력이메일 },
        function (에러, 결과) {
          console.log("로그인 요청 보낸거 확인.", 결과);

          if (에러) return done(에러);

          if (결과 == null)
            return done(null, false, { message: "존재하지않는 아이디요" });
          else if (createHashedPassword(입력한비번) == 결과.password) {
            return done(null, 결과);
          } else {
            console.log("비번 틀림");
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

//세션생성 정확히는 user.email을 이용한 암호화된 세션쿠키를 생성
passport.serializeUser(function (user, done) {
  done(null, user.email);
});

// 이 코드 아래에 주소요청들을 써주는 이유

// 이 코드가 위에 암호화한 세션을 해석해서
// 올바른 세션쿠키가 있는 경우 요청.user에
// 저어어어 위에서 db를 통해 찾은 정보를 넣어주기 때문에
// 이거 없으면 로그인 했는지 안했는지
// 확인할 값(아래에서는 사용자:요청.user)이 없어져서
// 로그인 했는지 안했는지 html에서는 확인을 못함.

passport.deserializeUser(function (이메일, done) {
  db.collection("login").findOne({ email: 이메일 }, function (에러, 결과) {
    done(null, 결과);
  });
});

//마이페이지
app.get("/mypage", 로그인했니, function (요청, 응답) {
  console.log(요청.user);
  응답.render("myPage.ejs", { 사용자: 요청.user });
});

//홈화면
app.get("/", function (요청, 응답) {
  console.log(요청.user);
  응답.render("home.ejs", { 사용자: 요청.user });
});
//notice화면
app.get("/notice", function (요청, 응답) {
  console.log(요청.user);
  응답.render("notice.ejs", { 사용자: 요청.user });
});
//board화면
app.get("/board", function (요청, 응답) {
  console.log(요청.user);
  응답.render("Board.ejs", { 사용자: 요청.user });
});
//contact화면
app.get("/contact", function (요청, 응답) {
  console.log(요청.user);
  응답.render("contact.ejs", { 사용자: 요청.user });
});
//guidline화면
app.get("/guidline", function (요청, 응답) {
  console.log(요청.user);
  응답.render("guidline.ejs", { 사용자: 요청.user });
});
//회원가입페이지
app.get("/signup", function (요청, 응답) {
  응답.render("sign.ejs", { 사용자: 요청.user });
});

// header-login에서 logout버튼으로 get 요청시
app.get("/logout", function (요청, 응답) {
  // 세션쿠기 connect.sid 를 없애고 home으로 get요청을 보낸다.
  요청.session.destroy(function () {
    응답.clearCookie("connect.sid");
    응답.redirect("/");
  });
});

function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.send("로그인 안하셨는디?");
  }
}
