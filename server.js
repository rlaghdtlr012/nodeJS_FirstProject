const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(express.urlencoded({extended: true})) 

app.listen(8080, function(){

});

app.get('/write', function(req, res){
    res.sendFile(__dirname + '/main.html');
});

//어떤 사람이 /add 경로로 POST 요청을 하면.. ~~하게 해주세요
app.post('/add', function(req, res){
    res.send('전송완료');
    console.log(req.body.title);
    console.log(req.body.date);
    // db에 영구 저장하기 위한 명령어 필요
})