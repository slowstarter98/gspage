require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
// 건수 추가 부분
var count = 0;

//
app.set("view engine", "ejs");

//views의 이미지 사용코드

app.use(express.static("views"));

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
  // db 이름도 자동으로 생성된다 몽고db 계정만 연결하면 다 만들어준다.
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
  //inser 함수 자체가 db에 클러스터 만들어준다. 따로 몽고가서 만들 필요 ㄴㄴ
  db.collection("login").findOne(
    {
      email: 요청.body.email,
    },
    function (에러, 결과) {
      //db에 이메일이 없다면
      if (결과 === null) {
        //비밀번호 유효성 검사------------
        var pw = 요청.body.password;
        var num = pw.search(/[0-9]/g);
        var eng = pw.search(/[a-z]/gi);
        var spe = pw.search(/[`+-~!@@#$%^&*|₩₩₩'₩";:₩/?]/gi);

        if (pw.length < 8 || pw.length > 20) {
          응답.send(
            "<script>alert('8자리 ~ 20자리 이내로 입력해주세요.');location.href='/signup';</script>"
          );
          return false;
        } else if (pw.search(/\s/) != -1) {
          응답.send(
            "<script>alert('비밀번호는 공백 없이 입력해주세요.');location.href='/signup';</script>"
          );
          return false;
        } else if (num < 0 || eng < 0 || spe < 0) {
          응답.send(
            "<script>alert('영문,숫자, 특수문자를 혼합하여 입력해주세요.');location.href='/signup';</script>"
          );
          return false;
        }

        //비밀번호 유호성 검사 통과----------------
        else {
          db.collection("login").insertOne(
            {
              email: 요청.body.email,
              password: createHashedPassword(요청.body.password),
            },
            function (에러, 결과) {
              console.log("db에 전송 완료");
              응답.redirect("/login");
            }
          );
        }
      }
      //db에 이미 있다면
      else {
        응답.send(
          "<script>alert('이미 존재하는 이메일입니다.');location.href='/signup';</script>"
        );
      }
    }
  );
});

// 로그인 및 마이페이지-----------------------------------
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const flash = require("connect-flash");
const { isNativeError } = require("util/types");
const { fstat } = require("fs");
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
    failureRedirect: "/login",
  }),
  function (요청, 응답) {
    console.log("로그인 성공", 요청.user);
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
          //에러
          if (에러) return done(에러);
          // 이메일 존재하지 않을 때
          if (결과 == null) {
            console.log("이메일 틀림");
            return done(null, false, { message: "이메일을 확인해주세요" });
          }
          // 로긍니 성공
          else if (createHashedPassword(입력한비번) == 결과.password) {
            return done(null, 결과);
          }

          //비밀번호를 틀렸을 때
          else {
            console.log("비번 틀림");
            return done(null, false, { message: "비밀번호를 확인해주세요" });
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
app.get("/mypage", 로그인확인, function (요청, 응답) {
  console.log(요청.user);
  응답.render("myPage.ejs", { 사용자: 요청.user });
});

//홈화면
app.get("/", function (요청, 응답) {
  console.log(요청.user);
  응답.render("home.ejs", { 사용자: 요청.user });
});

//board화면
app.get("/board/:id", function (요청, 응답) {
  const { id } = 요청.params;
  db.collection("board-count").findOne(
    { name: "최근게시물번호" },
    function (에러, 결과) {
      var number = 결과.lastPost;
      db.collection("board")
        .find()
        .toArray(function (err, result) {
          console.log(result);
          응답.render("Board.ejs", {
            사용자: 요청.user,
            게시물: result,
            페이지: id - 1,
            총게시물갯수: number - 1,
          });
        });
    }
  );
});

// board-write 페이지 get 요청
app.get("/board-write", function (요청, 응답) {
  응답.render("Board-write.ejs", { 사용자: 요청.user });
});

// board-write 페이지 post 요청
app.post("/board-write", function (요청, 응답) {
  db.collection("board-count").findOne(
    {
      name: "최근게시물번호",
    },
    function (에러, 결과) {
      db.collection("board").insertOne(
        {
          _id: 결과.lastPost + 1,
          Title: 요청.body.title,
          Content: 요청.body.content,
        },
        function (에러, result) {
          db.collection("board-count").updateOne(
            { name: "최근게시물번호" },
            { $inc: { lastPost: 1 } },
            function (에러, 결과) {
              응답.redirect("/board/1");
            }
          );
        }
      );
    }
  );
});
app.post("/board-write", function (요청, 응답) {
  db.collection("board-count").findOne(
    {
      name: "최근게시물번호",
    },
    function (에러, 결과) {
      db.collection("board").insertOne(
        {
          _id: 결과.lastPost + 1,
          Title: 요청.body.title,
          Content: 요청.body.content,
        },
        function (에러, result) {
          db.collection("board-count").updateOne(
            { name: "최근게시물번호" },
            { $inc: { lastPost: 1 } },
            function (에러, 결과) {
              응답.redirect("/board/1");
            }
          );
        }
      );
    }
  );
});

app.get("/posts/:postnumber", function (요청, 응답) {
  var { postnumber } = 요청.params;
  postnumber = parseInt(postnumber);
  db.collection("board").findOne({ _id: postnumber }, function (에러, 결과) {
    console.log(결과, postnumber);
    응답.render("Board-post.ejs", { 사용자: 요청.user, 게시물: 결과 });
  });
});

//notice 페이지
app.get("/notice/:id", function (요청, 응답) {
  const { id } = 요청.params;
  db.collection("notice-count").findOne(
    { name: "최근공지번호" },
    function (에러, 결과) {
      var number = 결과.lastPost;
      db.collection("notice")
        .find()
        .toArray(function (err, result) {
          var 마스터계정 = 0;
          if (
            요청.user != undefined &&
            요청.user.email == "dlrkdgh11111@naver.com"
          ) {
            마스터계정 = 1;
          }
          응답.render("notice.ejs", {
            사용자: 요청.user,
            공지: result,
            페이지: id - 1,
            총공지갯수: number - 1,
            마스터계정: 마스터계정,
          });
        });
    }
  );
});

//notice write 페이지 get 요청
app.get("/notice-write", function (요청, 응답) {
  응답.render("Notice-write.ejs", { 사용자: 요청.user });
});

//notice write 페이지 post 요청
app.post("/notice-write", function (요청, 응답) {
  db.collection("notice-count").findOne(
    {
      name: "최근공지번호",
    },
    function (에러, 결과) {
      db.collection("notice").insertOne(
        {
          _id: 결과.lastPost + 1,
          Title: 요청.body.title,
          Content: 요청.body.content,
        },
        function (에러, result) {
          db.collection("notice-count").updateOne(
            { name: "최근공지번호" },
            { $inc: { lastPost: 1 } },
            function (에러, 결과) {
              응답.redirect("/notice/1");
            }
          );
        }
      );
    }
  );
});
//notie-post 페이지
app.get("/noticeposts/:postnumber", function (요청, 응답) {
  var { postnumber } = 요청.params;
  postnumber = parseInt(postnumber);
  db.collection("notice").findOne({ _id: postnumber }, function (에러, 결과) {
    console.log(결과, postnumber);
    응답.render("Notice-post.ejs", { 사용자: 요청.user, 공지: 결과 });
  });
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

count = 0;

var dataset = {
  metrics: [-0.2922, -0.034, 0.4213, -0.4886, -0.0488],
  pfo_name: [
    "CJ ENM",
    "JYP Ent.",
    "NICE평가정보",
    "SK머티리얼즈",
    "고영",
    "동진쎄미켐",
    "리노공업",
    "셀트리온제약",
    "LX세미콘",
    "씨젠",
    "에스에프에이",
    "HLB",
    "엘앤에프",
    "제넥신",
    "컴투스",
    "케이엠더블유",
    "티씨케이",
    "파라다이스",
    "알테오젠",
    "콜마비앤에이치",
    "에스티팜",
    "원익IPS",
    "휴젤",
    "셀트리온헬스케어",
    "스튜디오드래곤",
    "펄어비스",
    "셀리버리",
    "에코프로비엠",
    "천보",
    "메드팩토",
  ],
  pfo_weight: [
    0.0403, 0.0156, 0.0156, 0.0376, 0.0195, 0.0163, 0.0277, 0.0566, 0.0194,
    0.0393, 0.0169, 0.0406, 0.0276, 0.028, 0.0185, 0.0241, 0.0223, 0.0201,
    0.0342, 0.0174, 0.0236, 0.0275, 0.0279, 0.2085, 0.0327, 0.0446, 0.0181,
    0.0428, 0.0186, 0.0181,
  ],
  graph_date: [
    "201107",
    "201108",
    "201109",
    "201110",
    "201111",
    "201112",
    "201201",
    "201202",
    "201203",
    "201204",
    "201205",
    "201206",
    "201207",
    "201208",
    "201209",
    "201210",
    "201211",
    "201212",
    "201301",
    "201302",
    "201303",
    "201304",
    "201305",
    "201306",
    "201307",
    "201308",
    "201309",
    "201310",
    "201311",
    "201312",
    "201401",
    "201402",
    "201403",
    "201404",
    "201405",
    "201406",
    "201407",
    "201408",
    "201409",
    "201410",
    "201411",
    "201412",
    "201501",
    "201502",
    "201503",
    "201504",
    "201505",
    "201506",
    "201507",
    "201508",
    "201509",
    "201510",
    "201511",
    "201512",
    "201601",
    "201602",
    "201603",
    "201604",
    "201605",
    "201606",
    "201607",
    "201608",
    "201609",
    "201610",
    "201611",
    "201612",
    "201701",
    "201702",
    "201703",
    "201704",
    "201705",
    "201706",
    "201707",
    "201708",
    "201709",
    "201710",
    "201711",
    "201712",
    "201801",
    "201802",
    "201803",
    "201804",
    "201805",
    "201806",
    "201807",
    "201808",
    "201809",
    "201810",
    "201811",
    "201812",
    "201901",
    "201902",
    "201903",
    "201904",
    "201905",
    "201906",
    "201907",
    "201908",
    "201909",
    "201910",
    "201911",
    "201912",
    "202001",
    "202002",
    "202003",
    "202004",
    "202005",
    "202006",
    "202007",
    "202008",
    "202009",
    "202010",
    "202011",
    "202012",
    "202101",
    "202102",
    "202103",
    "202104",
    "202105",
    "202106",
  ],
  graph_pfo: [
    110.39, 104.66, 98.51, 98.8, 94.66, 91.12, 92.97, 92.18, 89.0, 82.19, 78.36,
    78.44, 74.98, 83.01, 82.57, 79.96, 77.18, 76.67, 76.53, 82.02, 84.28, 81.52,
    83.83, 78.08, 86.48, 78.49, 81.6, 81.16, 78.79, 75.77, 78.77, 79.29, 78.89,
    82.58, 80.14, 78.57, 77.7, 84.6, 83.94, 79.43, 76.15, 73.5, 79.63, 84.09,
    84.7, 86.36, 85.79, 92.07, 86.99, 83.96, 77.86, 78.02, 83.19, 80.9, 84.46,
    77.96, 78.91, 77.33, 77.43, 73.74, 75.75, 72.53, 73.59, 68.55, 65.3, 68.77,
    67.97, 69.52, 70.38, 70.82, 74.74, 77.77, 77.82, 79.92, 87.29, 96.48,
    107.63, 110.89, 131.65, 132.41, 129.07, 118.98, 119.21, 122.22, 105.59,
    115.31, 114.85, 90.63, 96.77, 94.37, 94.43, 96.87, 91.13, 90.84, 77.71,
    74.22, 68.25, 63.3, 64.71, 72.92, 65.85, 70.61, 66.95, 65.77, 69.07, 70.61,
    77.04, 83.53, 82.49, 84.47, 80.34, 74.64, 83.65, 93.05, 85.11, 77.86, 77.31,
    69.08, 67.41, 70.78,
  ],
  graph_bench: [
    102.36, 93.67, 87.57, 92.55, 90.02, 88.97, 93.11, 95.15, 93.33, 89.98,
    86.77, 87.72, 87.11, 89.65, 91.95, 89.35, 89.15, 90.26, 89.7, 91.28, 91.28,
    90.47, 92.02, 87.44, 90.14, 88.93, 91.55, 91.72, 91.13, 90.85, 89.47, 90.3,
    90.8, 90.4, 90.61, 91.36, 93.64, 94.75, 93.79, 91.32, 91.04, 88.38, 90.2,
    92.15, 93.88, 97.82, 97.6, 97.33, 95.91, 92.65, 92.79, 93.16, 92.52, 91.25,
    90.39, 89.44, 91.88, 92.74, 91.94, 90.04, 91.46, 90.25, 90.82, 88.11, 86.35,
    87.69, 87.12, 88.29, 89.52, 90.22, 94.51, 94.58, 94.09, 93.25, 91.46, 93.8,
    94.94, 94.62, 98.75, 94.6, 94.98, 95.98, 93.95, 91.05, 89.81, 90.54, 91.79,
    82.1, 85.13, 83.83, 86.78, 87.03, 85.56, 86.88, 82.31, 83.41, 79.32, 77.77,
    79.3, 79.21, 78.94, 80.52, 77.7, 74.15, 68.23, 74.01, 76.2, 76.47, 79.45,
    81.49, 81.06, 79.31, 85.18, 88.77, 88.7, 88.95, 90.82, 92.58, 93.81, 95.6,
  ],
};
//iframe 로딩화면
app.get("/chart/:parameter", function (요청, 응답) {
  var { parameter } = 요청.params;
  parameter = parseInt(parameter);
  db.collection("sirius-return").findOne(
    {
      _id: parameter,
    },

    function (에러, 결과) {
      if (결과 == undefined) {
        응답.render("loading.ejs", { 현재개인: parameter });
        console.log(parameter, "-----로딩화면---------");
      } else {
        console.log(parameter, "@@@@차트화면@@@@@");

        응답.render("chart.ejs", {
          그래프벤치데이터: dataset.graph_bench,
          피에프오네임: dataset.pfo_name,
          피에프오웨이트: dataset.pfo_weight,
          메트릭스: dataset.metrics,
          그래프데이트: dataset.graph_date,
          그래프피에프오: dataset.graph_pfo,
        });
      }
    }
  );
});

//iframe post요청
app.post("/chart/:parameter", function (요청, 응답) {
  var { parameter } = 요청.params;
  parameter = parseInt(parameter);

  db.collection("sirius-return").insertOne(
    {
      _id: parameter,
    },

    function (에러, 결과) {
      console.log("--------포스트요청----------", parameter);
      응답.render("chart.ejs", {
        그래프벤치데이터: dataset.graph_bench,
        피에프오네임: dataset.pfo_name,
        피에프오웨이트: dataset.pfo_weight,
        메트릭스: dataset.metrics,
        그래프데이트: dataset.graph_date,
        그래프피에프오: dataset.graph_pfo,
      });
    }
  );
});

// sirius post요청
app.post("/sirius", function (요청, 응답) {
  db.collection("sirius-count").findOne({}, function (에러, 결과) {
    db.collection("sirius").insertOne(
      {
        _id: count--,
        Type: 요청.body.type,
        RangeLeft: 요청.body.rangeL,
        RangeRight: 요청.body.rangeR,
        Factor: 요청.body.factor,
      },
      function (에러, result) {
        db.collection("sirius-count").updateOne(
          { name: "요청갯수" },
          { $inc: { lastInput: 1 } },
          function (에러, 결과) {
            응답.redirect("/sirius");
          }
        );
      }
    );
  });
});

//sirius화면
app.get("/sirius", function (요청, 응답) {
  console.log(요청.user);
  count++;
  응답.render("sirius.ejs", { 사용자: 요청.user, 개인: count });
});

function 로그인확인(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.send(
      "<script>alert('로그인을 하지 않았습니다.');location.href='/';</script>"
    );
  }
}
