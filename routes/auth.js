const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// @desc    Login as guest
// @route   GET /auth/guest
router.get('/guest', async (req, res) => {
  try {
    // Generate a unique ID for the guest user
    const guestId = uuidv4().substring(0, 8);

    // Create a temporary guest user with a unique email
    const guestUser = await User.create({
      displayName: `Guest-${guestId}`,
      firstName: 'Guest',
      lastName: 'User',
      email: `guest-${guestId}@planr-temp.com`, // Add a unique email to avoid duplicate key errors
      isGuest: true
    });

    // Log in the guest user
    req.login(guestUser, (err) => {
      if (err) {
        console.error('Error logging in guest:', err);
        return res.redirect('/login');
      }
      return res.redirect('/');
    });
  } catch (err) {
    console.error('Error creating guest account:', err);
    res.redirect('/login');
  }
});

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

module.exports = router;
