var express     = require("express"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
      User      = require("./models/users"),
    bodyParser  = require("body-parser"),
    LocalStrategy = require("passport-local"),
    speakeasy   = require('speakeasy'),
     QRCode     = require('qrcode'),
     path       = require("path"),
     flash      = require("connect-flash"),
     ethers     = require("ethers"),
     Wallet     = ethers.Wallet,
     Wallets    = require("./models/wallets"),
     Recaptcha  = require('express-recaptcha').Recaptcha,
     request    = require('request'),
    pssportLocalMongoose = require("passport-local-mongoose"); 
  
// import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' });
    
mongoose.connect(process.env.DATABASE, {useNewUrlParser: true});
var auth = false;
var app = express();

//Recaptcha 
var recaptcha = new Recaptcha(process.env.SITE_KEY, process.env.CAPTCHA_KEY);

app.use(require("express-session")({
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.set('view engine','ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());

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

app.get("/home", isAuthen , function(req, res) {
   res.render("home"); 
});

app.get("/signup",recaptcha.middleware.render, function(req, res) {
    res.render('signup', { 
         captcha:res.recaptcha 
    });
});

app.get("/otp",isLoggedIn, function(req, res) {
    res.render("otp");
});

app.get('/wallet/new',isAuthen,function(req, res) {
   res.render("walletNew"); 
});

app.get('/wallets',isAuthen, function(req, res) {
    Wallets.find({uid:res.locals.currentUser._id}, function(err,wallets){
       if(err){
           console.log(err);
       } 
       else{
           res.render("wallets",{wallets:wallets});
       }
    });
});

var secret;
//Signup logic
app.post("/signup",recaptcha.middleware.verify, function(req,res){
    // Google recaptcha
    if (!req.recaptcha.error){
    // success code
       //2 Factor Auth using speakeasy
 secret = speakeasy.generateSecret();
 // Returns an object with secret.ascii, secret.hex, and secret.base32.
 // Also returns secret.otpauth_url, which we'll use later.
 User.two_factor_temp_secret = secret.base32;
 // Get the data URL of the authenticator URL
     User.register(new User({username: req.body.username, secret:secret.base32}), req.body.password, function(err,user){
         if(err){
             console.log(err)
                 return res.render("signup");
             }
             passport.authenticate("local")(req, res, function(){
                res.redirect("/token"); 
             });
     });
    }
else{
    // error code
    req.flash("error","Please select the captcha");
    res.redirect("/signup");
}
   
 
});

//Login Logic
app.post("/login",passport.authenticate("local",
{
  successRedirect: "/otp",
  failureRedirect: "/"
}),function(req,res){ 
});

//Logout
app.get("/logout",function(req,res){
    auth= false;
   req.logout();
   res.redirect("/");
});

function isLoggedIn(req,res,next){

  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/");
}


app.get('/token',isLoggedIn, function(req, res) {
QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
  if(err){
      console.log(err);
  }
  // Display this data URL to the user in an <img> tag
  // Example:
  res.render('token',{url:data_url});
});
});
//OTP verification
app.post('/tokenverify',function(req,res){
   var otp = req.body.otp
   var base32secret = User.two_factor_temp_secret;
   var verified = speakeasy.totp.verify({ secret: base32secret,
                                       encoding: 'base32',
                                       token: otp });
     if(verified){
         auth = true;
         res.locals.currentUser.auth= true;
         res.redirect("/home");
     }
     else{
         res.redirect('/signup');
     }
});

app.post('/otp',function(req,res){
    var otp = req.body.otp
    var base32secret = res.locals.currentUser.secret;
    var verified = speakeasy.totp.verify({ secret: base32secret,
                                           encoding: 'base32',
                                            token: otp });

if(verified){
        auth = true;
         res.redirect("/home");
     }
     else{
         req.logout();
         res.redirect('/');
     }
});


function isAuthen(req,res,next){

    if(typeof(req.session.passport) !== 'undefined'){
        if(auth){
        return next();    
        }
        else {
            res.redirect("/otp");
        }
    }
    else {
        req.logout();
        res.redirect('/');
    }
}


app.post('/wallet/new',isAuthen,function(req, res) {
var wallet = Wallet.createRandom();
var walletnew = new Wallets({
    privateKey : wallet.privateKey,
 address : wallet.address,
 mnemonic : wallet.mnemonic,
 uid : res.locals.currentUser._id,
 name: req.body.name
});
Wallets.create(walletnew, function(err,wallet){
   if(err){
       res.render("walletNew");
   }else{
       res.redirect('/wallets');
   }
   
});
});
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("server started");
});