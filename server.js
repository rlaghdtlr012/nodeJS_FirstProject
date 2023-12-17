const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const { createServer } = require("http");
const { Server } = require("socket.io");
const server = createServer(app);
const io = new Server(server);
require("dotenv").config();

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const connectDB = require("./database.js");

app.use(passport.initialize());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "forum",
    }),
  })
);

let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(passport.session());

passport.use(
  new LocalStrategy(async (id, password, cb) => {
    let result = await db.collection("user").findOne({ username: id });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }
    const loginResult = password === result.password;
    if (loginResult) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번 불일치" });
    }
  })
);

server.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT} 에서 서버 실행중`);
});

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    done(null, result);
  });
});

function checkLogin(req, res, next) {
  if (!req.user) {
    res.send("로그인 하세요");
  }
  next();
}

// 여기 밑에있는 모든 API는 checkLogin 미들웨어가 적용된다~.
// app.use(checkLogin);
// 특정 url에 대한 미들웨어 적용
// app.use('/URL', checkLogin);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/news", (req, res) => {
  db.collection("post").insertOne({ title: "어쩌구" });
  res.sendFile(__dirname + "/index.html");
});

app.get("/list", async (req, res) => {
  const result = await db.collection("post").find().toArray();
  res.render(__dirname + "/pages/list.ejs", { posts: result });
});

app.get("/time", (req, res) => {
  res.render(__dirname + "/pages/time.ejs", { nowDate: new Date() });
});

app.get("/write", (req, res) => {
  res.render(__dirname + "/pages/write.ejs");
});

app.get("/login", (req, res) => {
  res.render(__dirname + "/pages/login.ejs");
});

app.post("/login", async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

app.get("/register", (req, res) => {
  res.render(__dirname + "/pages/register.ejs");
});

app.post("/register", async (req, res) => {
  // bcrypt.hash("암호화할 문자", 얼마나 꼬을건지)
  let hashedPassword = await bcrypt.hash(req.body.password, 10);
  await db
    .collection("user")
    .insertOne({ username: req.body.username, password: hashedPassword });
  res.redirect("/");
});

app.post("/add", async (req, res) => {
  try {
    if (!req.body.title) {
      res.send("님 제목 입력 안함");
    } else {
      await db.collection("post").insertOne({
        title: req.body.title,
        content: req.body.content,
        user: req.user._id,
        username: req.user.username,
      });
      res.redirect("/list");
    }
  } catch (e) {
    console.log(e);
    res.status(500).send("서버에러");
  }
});

app.get("/detail/:id", async (req, res) => {
  try {
    const result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(req.params.id) });
    const comment = await db
      .collection("comment")
      .find({
        parentId: new ObjectId(req.params.id),
      })
      .toArray();
    res.render(__dirname + "/pages/detail.ejs", {
      result: result,
      comment: comment,
    });
  } catch (e) {
    console.log(e);
    res.status(404).send("이상한 url 입력함");
  }
});

app.get("/edit/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render(__dirname + "/pages/edit.ejs", { result: result });
});

app.post("/edit/:id", async (req, res) => {
  await db
    .collection("post")
    .updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { title: req.body.title, content: req.body.content } }
    );

  res.redirect("/list");
});

app.post("/delete", async (req, res) => {
  await db.collection("post").deleteOne({
    _id: new ObjectId(req.body.id),
    user: new ObjectId(req.user._id),
  });
  res.send("삭제완료");
});

/**
 * 아래 :id를 사용한 api로 성능 대체
 */
// app.get("/list/1", async (req, res) => {
//   let posts = await db.collection("post").find().limit(5).toArray();
//   res.render(__dirname + "/pages/list.ejs", { posts: posts });
// });

// app.get("/list/2", async (req, res) => {
//   let posts = await db.collection("post").find().skip(5).limit(5).toArray();
//   res.render(__dirname + "/pages/list.ejs", { posts: posts });
// });

// app.get("/list/3", async (req, res) => {
//   let posts = await db.collection("post").find().skip(10).limit(5).toArray();
//   res.render(__dirname + "/pages/list.ejs", { posts: posts });
// });

app.get("/list/:id", async (req, res) => {
  let posts = await db
    .collection("post")
    .find()
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render(__dirname + "/pages/list.ejs", { posts: posts });
});

app.get("/list/next/:id", async (req, res) => {
  let posts = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render(__dirname + "/pages/list.ejs", { posts: posts });
});

app.use("/shop", require("./routes/shop.js"));

// index를 사용한 검색
// app.get("/search", async (req, res) => {
//   const posts = await db
//     .collection("post")
//     .find({ $text: { $search: req.query.val } }) // text 인덱스에서 req.query.val을 찾아줘
//     .toArray(); // 문자를 인덱스로 만들 경우, 띄어쓰기 단위로 인덱스를 만드는데, 한국어는 조사가 많이 들어가므로
//   // 인덱스를 만들 때, 웬만하면 숫자로 된 document를 인덱스로 만드는 것이 좋다.
//   res.render(__dirname + "/pages/search.ejs", { posts: posts });
//   console.log(posts);
// });

// search_index를 사용한 검색
app.get("/search", async (req, res) => {
  const searchCondition = [
    {
      $search: {
        index: "title_index",
        text: { query: req.query.val, path: "title" },
      },
    },
    {
      $sort: { _id: 1 }, // id 순으로 오름차순 정렬
    },
  ];
  const posts = await db
    .collection("post")
    .aggregate(searchCondition)
    .toArray();
  res.render(__dirname + "/pages/search.ejs", { posts: posts });
  console.log(posts);
});

app.post("/comment", async (req, res) => {
  await db
    .collection("comment")
    .insertOne({
      content: req.body.content,
      writeId: new ObjectId(req.user._id),
      writer: req.user.username,
      parentId: new ObjectId(req.body.parentId),
    })
    .then(res.redirect("back"))
    .catch((err) => {
      console.error(err);
    });
});

app.get("/chat/request", async (req, res) => {
  await db.collection("chatroom").insertOne({
    member: [req.user._id, new ObjectId(req.query.writerId)],
    date: new Date(),
  });
  res.redirect("/chat/list");
});

app.get("/chat/list", async (req, res) => {
  const result = await db
    .collection("chatroom")
    .find({
      member: req.user._id,
    })
    .toArray();
  res.render(__dirname + "/pages/chatList.ejs", { result: result });
});

app.get("/chat/detail/:id", async (req, res) => {
  const result = await db
    .collection("chatroom")
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render(__dirname + "/pages/chatdetail.ejs", { result: result });
});

// Server Sent Event(Server -> Client로 일방적으로 정보 전달) 응답을 보낼 때, header 정보 설정
app.get("/stream/list", (req, res) => {
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  setInterval(() => {
    // write 할 때, 템플릿 반드시 맞춰야함
    res.write("event: msg\n");
    res.write('data: {"a": "b"}\n\n');
  }, 2000);
});
io.on("connection", (socket) => {
  socket.on("age", (data) => {
    // 유저가 보낸 정보 key: value로 받아서 data에 저장
    console.log("유저가 보낸거 : ", data);
    io.emit("name", "kim"); // 받고나서 유저한테 다시 데이터 보냄
  });

  socket.on("ask-join", (data) => {
    // 유저를 특정 방으로 넣는 로직. 참고로 이 기능은 서버만 가능
    socket.join(data);
  });

  socket.on("message", (data) => {
    io.to(data.room).emit("broadcast", data.msg);
  });
});
