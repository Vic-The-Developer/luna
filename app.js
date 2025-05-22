/**
 * Define server
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Modules required to run server and handle data set-up
 */
var bodyParser = require('body-parser');
var config = require('./config/database');
var passport = require('passport');
var mongoose = require('mongoose');
const flash = require('connect-flash');

const path = require("path");
var cors = require('cors');
const corsOptions = {
    origin: ["http://localhost:5000"],
    credentials: true, 
    optionsSuccessStatus: 200,
    methods: "GET, PUT, DELETE, PATCH, POST"
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors(corsOptions));



// View engine setup (Show Pages with data from Database)
app.set('views', path.join(__dirname, '/pages'));
app.set('view engine', 'ejs');



// Connect to Database
mongoose.connect(config.database);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB')
});


/**
 * Session management
 */
const session = require('express-session');

app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
}));


//Login Management
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

//flash messages
app.use(flash());


// Set public folder (images)
app.use('/', express.static('assets/'));
app.use('/pics', express.static('routes/pics'))


//Set routes
const mainSite = require("./routes/main");
app.use("/", mainSite);



//Handle error 404 (To handle Pages not available)
app.all('/*\w', (req, res) => { 
    res.send("No page found")
});


//show server running status
app.listen(PORT, ()=>{
    console.log(`Server is running and listening on port ${PORT}`);
})
