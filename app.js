//loading modules
const express = require("express");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const formidable = require("formidable");

//init the app
const app = express();

//setup bodyparser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//load helpers
const { requireLogin, ensureGuest } = require("./helpers/authhelper");

//load passports
require("./passport/local");
require("./passport/facebook");

//configuration for authentication
app.use(cookieParser());
app.use(
  session({
    secret: "mysecret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//load Files
const keys = require("./config/keys");

//make user as a global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

//load collections
const User = require("./models/user");
const Contact = require("./models/contact");
const Home = require("./models/home");

//connetc to MongoDB
mongoose
  .connect(
    keys.MongoDB,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    () => {
      console.log("MongoDB is connected..");
    }
  )
  .catch((err) => {
    console.log(err);
  });

//setup view engine - express-handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main",
  })
);

//set view engine
app.set("view engine", "handlebars");

//conect client side for css and js
app.use(express.static("public"));

//create a port
const port = process.env.PORT || 5000;

//handle home route
app.get("/", ensureGuest, (req, res) => {
  res.render("home", {
    title: "Home",
  });
});

//handle About route
app.get("/about", ensureGuest, (req, res) => {
  res.render("about", {
    title: "About",
  });
});

//handle Contacts route
app.get("/contact", requireLogin, (req, res) => {
  res.render("contact", {
    title: "Contact us",
  });
});

//submit contact form
app.post("/contact", requireLogin, (req, res) => {
  console.log(req.body);
  const newContact = {
    name: req.user._id,
    message: req.body.message,
  };
  new Contact(newContact).save((err, user) => {
    if (err) {
      throw err;
    } else {
      console.log("We received message from user", user);
    }
  });
});

//handle sign up route
app.get("/signup", ensureGuest, (req, res) => {
  res.render("signupForm", {
    title: "Register",
  });
});

app.post("/signup", ensureGuest, (req, res) => {
  console.log(req.body);
  let errors = [];
  if (req.body.password !== req.body.password2) {
    errors.push({ text: "Password does not match" });
  }
  if (req.body.password.length < 5) {
    errors.push({ text: "Password must be at least 5 characters" });
  }
  if (errors.length > 0) {
    res.render("signupForm", {
      errors: errors,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      password: req.body.password,
      password2: req.body.password2,
      email: req.body.email,
    });
  } else {
    User.findOne({ email: req.body.email }).then((user) => {
      if (user) {
        let errors = [];
        errors.push({ text: "Email already exists" });
        res.render("signupForm", {
          errors: errors,
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          password: req.body.password,
          password2: req.body.password2,
          email: req.body.email,
        });
      } else {
        //encrypt password
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(req.body.password, salt);

        const newUser = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          password: hash,
        };

        new User(newUser).save((err, user) => {
          if (err) {
            throw err;
          }
          if (user) {
            console.log("New user is created");
            let success = [];
            success.push({
              text: "You have created an account. You can login now.",
            });
            res.render("loginForm", {
              success: success,
            });
          }
        });
      }
    });
  }
});

app.get("/displayLoginForm", ensureGuest, (req, res) => {
  res.render("loginForm");
});

//authentication with email
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/loginErrors",
  })
);

//authentication with facebook
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
  })
);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/profile",
    failureRedirect: "/",
  })
);

//display profile
app.get("/profile", requireLogin, (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    res.render("profile", {
      firstname: user.firstname,
      lastname: user.lastname,
    });
  });
});

//dispaly login errors
app.get("/loginErrors", (req, res) => {
  let errors = [];
  errors.push({ text: "User is not found or password is wrong." });
  res.render("loginForm", {
    errors: errors,
  });
});

//list a home route
app.get("/listHome", requireLogin, (req, res) => {
  res.render("listHome");
});

app.post("/listHome", requireLogin, (req, res) => {
  const newHome = {
    owner: req.user._id,
    make: req.body.make,
    model: req.body.model,
    year: req.body.year,
    pricePerHour: req.body.pricePerHour,
    pricePerWeek: req.body.pricePerWeek,
  };
  new Home(newHome).save((err, home) => {
    if (err) {
      throw err;
    }
    if (home) {
      res.redirect("/showHomes");
    }
  });
});

app.get("/showHomes", requireLogin, (req, res) => {
  Home.find({})
    .populate("owner")
    .sort({ date: "desc" })
    .then((homes) => {
      res.render("showHomes", {
        homes: homes,
      });
    });
});

//logout
app.get("/logout", (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = false;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        req.logout();
        res.redirect("/");
      }
    });
  });
});

//Confirmation of connection to the port
app.listen(port, () => {
  console.log("Server is up on port " + port);
});
