const router = require("express").Router();
const connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB 연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });
router.get("/shirts", (req, res) => {
  res.send("셔츠파는 페이지임");
});

router.get("/pants", (req, res) => {
  res.send("바지파는 페이지임");
});

module.exports = router;
