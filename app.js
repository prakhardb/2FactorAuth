var express     = require("express"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
      User      = require("./models/users"),
    bodyParser  = require("body-parser"),
    LocalStrategy = require("passport-local"),
    speakeasy   = require('speakeasy'),
     QRCode     = require('qrcode'),
    pssportLocalMongoose = require("passport-local-mongoose"); 
  
    
mongoose.connect("mongodb://prakhar:prakhar123@ds125841.mlab.com:25841/2fa-auth",{ useNewUrlParser: true });


var app = express();

app.use(require("express-session")({
    secret:"this is so beautiful",
    resave: false,
    saveUninitialized: false
}));

app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extende: true }));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function(req,res, next){
  res.locals.currentUser = req.user;
  next();
});

app.get("/",function(req, res){
    res.render("login");
});

app.get("/home", isLoggedIn , function(req, res) {
   res.render("home"); 
});

app.get("/signup", function(req, res) {
   res.render("signup"); 
});

//Signup logic
app.post("/signup", function(req,res){
    User.register(new User({username: req.body.username}), req.body.password, function(err,user){
        if(err){
            console.log(err)
                return res.render("signup");
            }
            passport.authenticate("local")(req, res, function(){
               res.redirect("/token"); 
            });
    });
});

//Login Logic
app.post("/login",passport.authenticate("local",
{
  successRedirect: "/home",
  failureRedirect: "/"
}),function(req,res){ 
});

//Logout
app.get("/logout",function(req,res){
   req.logout();
   res.redirect("/");
});

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/");
}

//2 Factor Auth using speakeasy
var secret = speakeasy.generateSecret();
// Returns an object with secret.ascii, secret.hex, and secret.base32.
// Also returns secret.otpauth_url, which we'll use later.
User.two_factor_temp_secret = secret.base32;
console.log(User.two_factor_temp_secret);
// Get the data URL of the authenticator URL
app.get('/token', function(req, res) {
QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
  if(err){
      console.log(err);
  }
  // Display this data URL to the user in an <img> tag
  // Example:
  res.render('token',{url:data_url});
});
});


app.listen(process.env.PORT, process.env.IP, function(){
    console.log("server started");
});