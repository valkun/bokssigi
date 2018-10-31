'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * GET /api/books
 *
 * Retrieve a page of books (up to ten at a time).
 */
router.get('/login', (req, res) => {
    var sess;
    sess = req.session;

    var username = req.query.username;
    var password = req.query.password;
    var result = {};
    var users = {'valkun':{'name': require('./config').get('USER_ID'), 'password':require('./config').get('USER_PASSWORD')}};
    if(!users[username]){
        // USERNAME NOT FOUND
        result["success"] = 0;
        result["error"] = "not found";
        res.json(result);
        return;
    }

    if(users[username]["password"] == password){
        result["success"] = 1;
        sess.username = username;
        sess.name = users[username]["name"];
        res.redirect('/');

    }else{
        result["success"] = 0;
        result["error"] = "incorrect";
        res.json(result);
    }
});

router.get('/logout', function(req, res){
    var sess = req.session;
    if(sess.username){
        req.session.destroy(function(err){
            if(err){
                console.log(err);
            }else{
                res.redirect('/');
            }
        })
    }else{
        res.redirect('/');
    }
})

module.exports = router;