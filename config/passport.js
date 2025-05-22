var LocalStrategy = require('passport-local').Strategy;

const bcrypt = require('bcrypt');
const User = require('../models/admin');


module.exports = function (passport) {

    passport.use('local',new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true 
        }, function (req, username, password, done) {

        User.findOne({email: username}, function (err, user) {
            if (err)
                console.log(err);

            if (!user) {
                req.flash('success', 'No user found!');
                return done(null, false, {message: 'No user found!'});
            }

            bcrypt.compare(password, user.password, function (err, isMatch) {
                if (err)
                    console.log(err);

                if (isMatch) {
                    req.flash('success', "Logged in Successfully!")
                    return done(null, user);
                } else {
                    req.flash('success', 'Wrong password!');
                    return done(null, false, {message: 'Wrong password.'});
                }
            });
        });

    }));

   
    passport.serializeUser(function (user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {

        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

}