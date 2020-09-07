//time to require all the modules I need!
const express = require("express");
const app = express();

const handlebars = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

//require the files I need
const bc = require("./bc");
const db = require("./db");
app.use(express.static("./public"));

//middleware cookie
app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

//middleware handlebars
app.engine("handlebars", handlebars());
app.set("view engine", "handlebars");

//middleware for urlencoded requested bodies --> browser will automatically generate one when a post happens
//middleware will parse it and I can access it with using req.body
app.use(
    express.urlencoded({
        extended: false,
    })
);

//middleware to protect against csrf: place it after cookie-session and after app.use(express.urlencoded)
app.use(csurf());
//deal with my token for csurf --> forms
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

///middleware for errors
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: err,
    });
});
////////////////////////////////ROOT ROUTE //////////////////////////////////////
app.get("/", (req, res) => {
    //console.log("get request to root route happend!!!");
    res.redirect("/petition");
});

////////////////////////////////PETITION ROUTE //////////////////////////////////////
app.get("/petition", (req, res) => {
    //console.log("get request to petition route happend!!!");

    if (!req.session.signed) {
        res.render("petition", {
            layout: "main",
        });
    } else {
        res.redirect("/signed");
    } //closes if-else-cookie
});

app.post("/petition", (req, res) => {
    console.log("req.body: ", req.body);
    //console.log("req.body: ", req.body);
    let firstname = req.body.firstname;
    //console.log(firstname);
    let lastname = req.body.lastname;
    //console.log(lastname);
    let sign = req.body.signature;
    //console.log(sign);
    let userId;

    db.addSigner(firstname, lastname, sign)
        .then((id) => {
            //console.log(id);
            //console.log(id.rows[0]);#
            //console.log(id.rows[0].id);
            //store id in variable
            userId = id.rows[0].id;
            //console.log(thisSign);
            //console.log("req.session: ", req.session);
            //set signature as cookie
            req.session.id = userId;
            //console.log("req.session: ", req.session);
            //set general cookie
            req.session.signed = "signed!";
            console.log("req.session: ", req.session);
            res.redirect("/signed");
        })
        .catch((err) => {
            res.render("petition", {
                error: "Ooops, something went wrong! Please sign again.",
            });
            console.log("err in addSigner: ", err);
        });

    //console.log("req.session: ", req.session);

    //console.log("req.session after adding something: ", req.session);
});

////////////////////////////////SIGNED ROUTE //////////////////////////////////////

app.get("/signed", (req, res) => {
    //console.log("get request to signed route happend!!!");
    //res.render("signed", {});
    db.getSignature(req.session.id)
        .then(({ rows }) => {
            //console.log(rows);
            let sign = rows[0].sign;
            //console.log(sign);
            //console.log(typeof rows);
            //console.log(typeof sign);

            res.render("signed", {
                sign,
            });
        })
        .catch((err) => {
            console.log("err in getSignature: ", err);
        });
    /*
    db.getTable()
        .then(({ rows }) => {
            for (let i = 0; i < rows.length; i++) {
                console.log("rows: ", rows);
                console.log("id: ", rows[i].id);
                console.log("firstname: ", rows[i].firstname);
                console.log("lastname: ", rows[i].lastname);
                console.log("signature: ", rows[i].sign);
            }
        })
        .catch((err) => {
            console.log("err in getSigners: ", err);
        });
        */
});

////////////////////////////////SIGNERS ROUTE //////////////////////////////////////
app.get("/signers", (req, res) => {
    //console.log("get request to signers route happend!!!");

    db.getSigners()
        .then(({ rows }) => {
            res.render("signers", {
                rows: rows,
            });
            //console.log("data: ", rows);
        })
        .catch((err) => {
            console.log("err in getSigners: ", err);
        });
});

/////////////////////////////////protecting from iframe///////////////////////////////

app.use(function (req, res, next) {
    res.setHeader("x-frame-options", "deny");
    next();
});

//////////////////registration//////////////////////////////////////
app.get("/register", (req, res) => {
    console.log("get request to registration route happend!!!");
    res.render("register", {
        layout: "main",
    });
});

app.post("/register", (req, res) => {
    console.log("post request to registration route happend!!!");
    //console.log("req.body: ", req.body);
    let first = req.body.name;
    //console.log(firstname);
    let last = req.body.last;
    //console.log(lastname);
    let email = req.body.email;
    //console.log(sign);
    let password = req.body.password;

    if (first === "" || last === "" || email === "" || password === "") {
        res.render("register", {
            error: "Oh, something went wrong! Please try again :) ",
        });
    } else {
        console.log("req.body: ", req.body);
        //console.log(req.body.password);

        bc.hash(req.body.password).then((salted) => {
            console.log("salted: ", salted);
            db.register(req.body.name, req.body.last, req.body.email, salted)
                .then(({ rows }) => {
                    console.log("rows: ", rows);
                })
                .catch((err) => {
                    console.log("err in register: ", err);
                });
        });
    }

    //console.log("req.session: ", req.session);

    //console.log("req.session after adding something: ", req.session);
});

app.listen(8080, () => console.log("petition server is running :)"));
