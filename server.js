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

var dataset={ metrics: [-0.2795, -0.0322, 0.3713, -0.448, -0.0614], 
  pfo_name: ["JYP Ent.", "NICE평가정보", "SK머티리얼즈", "SFA반도체", "고영", "동국제약", "동진쎄미켐", "동화기업", "리노공업", "삼천당제약", "LX세미콘", "에스에프에이", "엘앤에프", "오스템임플란트", "이오테크닉스", "컴투스", "티씨케이", "파라다이스", "포스코 ICT", "NHN한국사이버결제", "현대바이오", "메지온", "PI첨단소재", "콜마비앤에이치", "에스티팜", "원익IPS", "휴젤", "셀리버리", "천보", "메드팩토"], 
  pfo_weight: [0.0277, 0.0276, 0.0666, 0.0235, 0.0345, 0.0252, 0.0289, 0.0263, 0.049, 0.0238, 0.0344, 0.03, 0.0489, 0.0248, 0.0275, 0.0328, 0.0395, 0.0355, 0.0243, 0.0242, 0.0263, 0.0249, 0.026, 0.0308, 0.0418, 0.0487, 0.0494, 0.0321, 0.0329, 0.032],
  graph_date: ["201107", "201108", "201109", "201110", "201111", "201112", "201201", "201202", "201203", "201204", "201205", "201206", "201207", "201208", "201209", "201210", "201211", "201212", "201301", "201302", "201303", "201304", "201305", "201306", "201307", "201308", "201309", "201310", "201311", "201312", "201401", "201402", "201403", "201404", "201405", "201406", "201407", "201408", "201409", "201410", "201411", "201412", "201501", "201502", "201503", "201504", "201505", "201506", "201507", "201508", "201509", "201510", "201511", "201512", "201601", "201602", "201603", "201604", "201605", "201606", "201607", "201608", "201609", "201610", "201611", "201612", "201701", "201702", "201703", "201704", "201705", "201706", "201707", "201708", "201709", "201710", "201711", "201712", "201801", "201802", "201803", "201804", "201805", "201806", "201807", "201808", "201809", "201810", "201811", "201812", "201901", "201902", "201903", "201904", "201905", "201906", "201907", "201908", "201909", "201910", "201911", "201912", "202001", "202002", "202003", "202004", "202005", "202006", "202007", "202008", "202009", "202010", "202011", "202012", "202101", "202102", "202103", "202104", "202105", "202106"], 
  graph_pfo: [0.1046, -0.0628, -0.0617, 0.0346, -0.0396, -0.0457, 0.0177, 0.0069, -0.0486, -0.0683, -0.0615, 0.0182, -0.0398, 0.1125, 0.0082, -0.0299, -0.0327, -0.0071, 0.0004, 0.0752, 0.0317, 0.0323, 0.012, -0.0932, 0.0399, -0.0452, 0.0407, -0.0001, -0.0261, -0.0311, 0.0253, -0.0021, 0.0072, 0.0402, -0.0307, -0.0146, 0.0204, 0.0823, -0.0211, -0.036, -0.0331, -0.0277, 0.0823, 0.0101, -0.0109, -0.0187, 0.0247, 0.0812, -0.0883, -0.0692, -0.0642, -0.0053, 0.0497, -0.0209, -0.0294, -0.0357, -0.0143, -0.0073, -0.0045, -0.0496, 0.0147, -0.0682, 0.0137, -0.0895, -0.0417, 0.0404, -0.0285, 0.0373, 0.0665, 0.0017, 0.0417, -0.0098, -0.0177, 0.0224, 0.0447, 0.0923, 0.141, -0.013, 0.0874, -0.0605, 0.0279, -0.0366, 0.0248, -0.0667, -0.0237, 0.0604, -0.0368, -0.1507, 0.0289, -0.0467, 0.0135, 0.0456, -0.0613, -0.0419, -0.0844, -0.0045, -0.0651, -0.0238, 0.0076, 0.1396, -0.0928, 0.0777, -0.0725, -0.0367, -0.0139, 0.0468, 0.1063, 0.0693, 0.0731, 0.0092, -0.0423, -0.0752, 0.1027, 0.1125, -0.0806, -0.0306, 0.0288, 0.0101, -0.0493, 0.0475], 
  graph_bench: [0.023617, -0.084956, -0.065044, 0.056862, -0.027359, -0.011673, 0.046593, 0.02181, -0.019106, -0.035876, -0.035662, 0.010988, -0.007006, 0.029175, 0.02564, -0.028267, -0.002247, 0.012501, -0.006278, 0.017586, 4.9e-05, -0.008854, 0.017102, -0.049758, 0.030856, -0.013365, 0.029381, 0.001878, -0.006411, -0.003059, -0.015219, 0.009264, 0.005557, -0.004394, 0.002291, 0.008326, 0.024943, 0.011793, -0.010122, -0.026287, -0.003039, -0.029274, 0.02062, 0.021649, 0.018749, 0.041926, -0.002168, -0.002808, -0.014622, -0.033918, 0.001499, 0.003968, -0.006852, -0.013799, -0.009362, -0.010575, 0.027316, 0.009364, -0.008588, -0.020709, 0.015736, -0.01321, 0.006299, -0.029787, -0.01995, 0.015433, -0.006484, 0.013477, 0.013945, 0.007745, 0.047626, 0.0007, -0.005225, -0.008919, -0.019104, 0.025569, 0.01216, -0.00339, 0.043646, -0.04207, 0.004087, 0.0105, -0.021159, -0.030898, -0.013557, 0.00813, 0.013807, -0.105577, 0.036874, -0.015278, 0.035193, 0.002924, -0.016951, 0.015406, -0.052599, 0.013405, -0.049073, -0.019501, 0.019729, -0.001182, -0.003439, 0.020051, -0.035037, -0.045733, -0.07976, 0.084619, 0.029643, 0.003492, 0.03908, 0.02565, -0.005259, -0.0216, 0.073973, 0.0421, -0.000784, 0.002858, 0.021027, 0.019382, 0.01329, 0.019058]
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
        
        응답.render("chart.ejs",{그래프벤치데이터:dataset.graph_bench
          ,피에프오네임:dataset.pfo_name
        ,피에프오웨이트:dataset.pfo_weight
      ,메트릭스:dataset.metrics
    , 그래프데이트:dataset.graph_date
  , 그래프피에프오:dataset.graph_pfo}
        );
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
      응답.render("chart.ejs",{그래프벤치데이터:dataset.graph_bench
        ,피에프오네임:dataset.pfo_name
      ,피에프오웨이트:dataset.pfo_weight
    ,메트릭스:dataset.metrics
  , 그래프데이트:dataset.graph_date
, 그래프피에프오:dataset.graph_pfo});
    }
  );
});

// sirius post요청
app.post("/sirius", function (요청, 응답) {
  db.collection("sirius-count").findOne(
    {
      name: "요청갯수",
    },
    function (에러, 결과) {
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
    }
  );
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
