const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const emails = [process.env.ADMIN_EMAIL_GOOGLE];

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://p2-curriculum.herokuapp.com/google/callback"
}, function(accessToken, refreshToken, profile, done){
    const response = emails.includes(profile.emails[0].value);
    if(response){
        done(null, profile);
    } else {
        done(null, false);
    }
}))