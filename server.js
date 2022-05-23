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

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

//views의 이미지 사용코드
app.use("/img", express.static("img"));
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
// app.get("/login", function (요청, 응답) {
//   응답.render("login.ejs", { 사용자: 요청.user });
// });

//로그인 요청
// app.post(
//   "/login",
//   passport.authenticate("local", {
//     failureRedirect: "/login",
//   }),
//   function (요청, 응답) {
//     console.log("로그인 성공", 요청.user);
//     응답.render("home.ejs", { 사용자: 요청.user });
//   }
// );

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
// app.get("/mypage", 로그인확인, function (요청, 응답) {
//   console.log(요청.user);
//   응답.render("myPage.ejs", { 사용자: 요청.user });
// });

//홈화면
app.get("/", function (요청, 응답) {
  console.log(요청.user);
  응답.render("home.ejs", { 사용자: 요청.user });
});

//board화면
// app.get("/board/:id", function (요청, 응답) {
//   const { id } = 요청.params;
//   db.collection("board-count").findOne(
//     { name: "최근게시물번호" },
//     function (에러, 결과) {
//       var number = 결과.lastPost;
//       db.collection("board")
//         .find()
//         .toArray(function (err, result) {
//           console.log(result);
//           응답.render("Board.ejs", {
//             사용자: 요청.user,
//             게시물: result,
//             페이지: id - 1,
//             총게시물갯수: number - 1,
//           });
//         });
//     }
//   );
// });

// board-write 페이지 get 요청
// app.get("/board-write", function (요청, 응답) {
//   응답.render("Board-write.ejs", { 사용자: 요청.user });
// });

// board-write 페이지 post 요청
// app.post("/board-write", function (요청, 응답) {
//   db.collection("board-count").findOne(
//     {
//       name: "최근게시물번호",
//     },
//     function (에러, 결과) {
//       db.collection("board").insertOne(
//         {
//           _id: 결과.lastPost + 1,
//           Title: 요청.body.title,
//           Content: 요청.body.content,
//         },
//         function (에러, result) {
//           db.collection("board-count").updateOne(
//             { name: "최근게시물번호" },
//             { $inc: { lastPost: 1 } },
//             function (에러, 결과) {
//               응답.redirect("/board/1");
//             }
//           );
//         }
//       );
//     }
//   );
// });
// app.post("/board-write", function (요청, 응답) {
//   db.collection("board-count").findOne(
//     {
//       name: "최근게시물번호",
//     },
//     function (에러, 결과) {
//       db.collection("board").insertOne(
//         {
//           _id: 결과.lastPost + 1,
//           Title: 요청.body.title,
//           Content: 요청.body.content,
//         },
//         function (에러, result) {
//           db.collection("board-count").updateOne(
//             { name: "최근게시물번호" },
//             { $inc: { lastPost: 1 } },
//             function (에러, 결과) {
//               응답.redirect("/board/1");
//             }
//           );
//         }
//       );
//     }
//   );
// });

// app.get("/posts/:postnumber", function (요청, 응답) {
//   var { postnumber } = 요청.params;
//   postnumber = parseInt(postnumber);
//   db.collection("board").findOne({ _id: postnumber }, function (에러, 결과) {
//     console.log(결과, postnumber);
//     응답.render("Board-post.ejs", { 사용자: 요청.user, 게시물: 결과 });
//   });
// });

//notice 페이지
// app.get("/notice/:id", function (요청, 응답) {
//   const { id } = 요청.params;
//   db.collection("notice-count").findOne(
//     { name: "최근공지번호" },
//     function (에러, 결과) {
//       var number = 결과.lastPost;
//       db.collection("notice")
//         .find()
//         .toArray(function (err, result) {
//           var 마스터계정 = 0;
//           if (
//             요청.user != undefined &&
//             요청.user.email == "dlrkdgh11111@naver.com"
//           ) {
//             마스터계정 = 1;
//           }
//           응답.render("notice.ejs", {
//             사용자: 요청.user,
//             공지: result,
//             페이지: id - 1,
//             총공지갯수: number - 1,
//             마스터계정: 마스터계정,
//           });
//         });
//     }
//   );
// });

//notice write 페이지 get 요청
// app.get("/notice-write", function (요청, 응답) {
//   응답.render("Notice-write.ejs", { 사용자: 요청.user });
// });

//notice write 페이지 post 요청
// app.post("/notice-write", function (요청, 응답) {
//   db.collection("notice-count").findOne(
//     {
//       name: "최근공지번호",
//     },
//     function (에러, 결과) {
//       db.collection("notice").insertOne(
//         {
//           _id: 결과.lastPost + 1,
//           Title: 요청.body.title,
//           Content: 요청.body.content,
//         },
//         function (에러, result) {
//           db.collection("notice-count").updateOne(
//             { name: "최근공지번호" },
//             { $inc: { lastPost: 1 } },
//             function (에러, 결과) {
//               응답.redirect("/notice/1");
//             }
//           );
//         }
//       );
//     }
//   );
// });
//notie-post 페이지
// app.get("/noticeposts/:postnumber", function (요청, 응답) {
//   var { postnumber } = 요청.params;
//   postnumber = parseInt(postnumber);
//   db.collection("notice").findOne({ _id: postnumber }, function (에러, 결과) {
//     console.log(결과, postnumber);
//     응답.render("Notice-post.ejs", { 사용자: 요청.user, 공지: 결과 });
//   });
// });

//contact화면
// app.get("/contact", function (요청, 응답) {
//   console.log(요청.user);
//   응답.render("contact.ejs", { 사용자: 요청.user });
// });
//guidline화면
// app.get("/guidline", function (요청, 응답) {
//   console.log(요청.user);
//   응답.render("guidline.ejs", { 사용자: 요청.user });
// });
//회원가입페이지
// app.get("/signup", function (요청, 응답) {
//   응답.render("sign.ejs", { 사용자: 요청.user });
// });

// header-login에서 logout버튼으로 get 요청시
// app.get("/logout", function (요청, 응답) {
//   // 세션쿠기 connect.sid 를 없애고 home으로 get요청을 보낸다.
//   요청.session.destroy(function () {
//     응답.clearCookie("connect.sid");
//     응답.redirect("/");
//   });
// });

count = 0;

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
        console.log(결과);
        응답.render("chart.ejs", {
          그래프벤치데이터: 결과.그래프벤치데이터,
          피에프오네임: 결과.피에프오네임,
          피에프오웨이트: 결과.피에프오웨이트,
          메트릭스: 결과.메트릭스,
          그래프데이트: 결과.그래프데이트,
          그래프피에프오: 결과.그래프피에프오,
            요청값: 결과.요청값,
        });
        db.collection("sirius-return").deleteOne({
          _id: parameter,
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
      그래프벤치데이터: 요청.body.graph_bench,
      피에프오네임: 요청.body.pfo_name,
      피에프오웨이트: 요청.body.pfo_weight,
      메트릭스: 요청.body.metrics,
      그래프데이트: 요청.body.graph_date,
      그래프피에프오: 요청.body.graph_pfo,
        요청값: 요청.body.request_data,
    },
    function (에러, 결과) {
      console.log("--------포스트요청----------", parameter);
      응답.redirect("/");
    }
  );
});

// sirius post요청
app.post("/sirius", function (요청, 응답) {
    count++;
    요청.session.chart_id = count;
  db.collection("sirius-count").findOne({}, function (에러, 결과) {
    db.collection("sirius2").insertOne(
      {
        _id: 요청.session.chart_id,
        Type: 요청.body.type,
        RangeLeft: 요청.body.rangeL,
        RangeRight: 요청.body.rangeR,
        Factor: 요청.body.factor,
          RangeLeft2: 요청.body.rangeL2,
          RangeRight2: 요청.body.rangeR2,
          Factor2: 요청.body.factor2,
          RangeLeft3: 요청.body.rangeL3,
          RangeRight3: 요청.body.rangeR3,
          Factor3: 요청.body.factor3,
          computation: 요청.body.computation,
      },
      function (에러, result) {
        db.collection("sirius-count").updateOne(
          { name: "요청갯수" },
          { $inc: { lastInput: 1 } },
          function (에러, 결과) {
              요청.session.from_POST = true;
            응답.redirect("/sirius");
          }
        );
      }
    );
  });
});

//sirius화면
app.get("/sirius", function (요청, 응답) {
  if (요청.session.from_POST) {
      요청.session.from_POST = false;
  } else {
      요청.session.from_POST = false;
      요청.session.chart_id = count;
  }
  console.log(요청.session.chart_id);
  console.log('count 증가');
  응답.render("sirius.ejs", { 사용자: 요청.user, 개인: 요청.session.chart_id });
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
