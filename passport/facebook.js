const passport = require("passport");
const facebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/user");
const keys = require("../config/keys");

//fetch user ID
passport.serializeUser((user, done) => {
  done(null.user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  new facebookStrategy(
    {
      clientID: keys.FBAppID,
      clientSecret: keys.FBAppSECRET,
      callbackURL: "http://localhost:5000/auth/facebook/callback",
      profileFields: ["email", "name", "displayname"],
    },
    (accessToken, refreshToken, profile, done) => {
      console.log(profile);

      //save user data
      User.findOne({ facebook: profile.id }, (err, user) => {
        if (err) {
          return done(err);
        }
        if (user) {
          return done(null, user);
        } else {
          const newUser = {
            facebook: profile.id,
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            email: profile.emails[0].value,
          };
          new User(newUser).save((err, user) => {
            if (err) {
              return done(err);
            }
            if (user) {
              return done(null, user);
            }
          });
        }
      });
    }
  )
);
