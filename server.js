const express = require("express");
const crypto = require("crypto");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use("/public", express.static("public"));

const methodeOverride = require("method-override");
app.use(methodeOverride("_method"));

// 포트번호
var port = 8080;
// 사용 DB
var db;
// db연결
const MongoClient = require("mongodb").MongoClient;
MongoClient.connect(
  "mongodb+srv://forrest:gump98@cluster0.fg476.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  (error, client) => {
    if (error) {
      return console.log(error);
    }
    db = client.db("gspage");
    app.listen(port, function () {
      console.log("listening on 8080  + MongoDB - gspage 접속완료");
    });
  }
);

//홈화면
app.get("/", function (요청, 응답) {
  응답.render("home.ejs");
});
//notice화면
app.get("/notice", function (요청, 응답) {
  응답.render("notice.ejs");
});
//board화면
app.get("/board", function (요청, 응답) {
  응답.render("Board.ejs");
});
//contact화면
app.get("/contact", function (요청, 응답) {
  응답.render("contact.ejs");
});
//guidline화면
app.get("/guidline", function (요청, 응답) {
  응답.render("guidline.ejs");
});
//회원가입페이지
app.get("/signup", function (요청, 응답) {
  응답.render("sign.ejs");
});

//회원가입요청
app.post("/signup", function (요청, 응답) {
  //암호화
  const createHashedPassword = (요청) => {
    return crypto
      .createHash("sha512")
      .update(요청.body.password)
      .digest("base64");
  };

  db.collection("login").insertOne(
    { email: 요청.body.email, password: createHashedPassword(요청) },
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
  응답.render("login.ejs");
});

//로그인 요청
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (요청, 응답) {
    console.log("성공");
    응답.redirect("/");
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
          console.log("여기까진 한다.");
          if (에러) return done(에러);
          if (!결과)
            return done(null, false, { message: "존재하지않는 아이디요" });

          if (입력한비번 == 결과.password) {
            return done(null, 결과);
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

//세션생성
passport.serializeUser(function (user, done) {
  done(null, user.email);
});

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

function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.send("로그인 안하셨는디?");
  }
}
