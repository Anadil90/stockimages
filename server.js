//packages.....................................>
const express = require('express'),
bodyParser = require('body-parser'),
    multer = require('multer'),
      path = require('path'),
  passport = require('passport'), 
  mongoose = require('mongoose'),
    crypto = require('crypto'), 
     flash = require('connect-flash');


   

const  gridfsStorage  = require('multer-gridfs-storage'),
 gridfsStream = require('gridfs-stream'),
     override = require('method-override'),

        localStrategy = require('passport-local'),
passportLocalMongoose = require('passport-local-mongoose');
// execute express 
const app = express();
// .........................................................>

// import modules 
const user = require('./models/users');
const Inbox = require("./models/contact");

app.set('view engine', 'ejs')
app.use(express.static('./public'))
app.use(override('_method'))  
app.use(bodyParser.json(), bodyParser.urlencoded({extended: true}));

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost:27017/imgs');
const conn = mongoose.createConnection('mongodb://localhost:27017/imgs-fileDB');


// passport setup ................................................>

// express session midleware
app.use(require('express-session')({
	secret: 'img',
	resave: false,
	saveUninitialized: false
}));

// inititate passport 
app.use(passport.initialize());
app.use(passport.session());
// set up new passport local strategy
passport.use(new localStrategy(user.authenticate()));
// serialization process 
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
// .........................................................................>

// main middleware
app.use(flash());

app.use(function(req, res, next){
  res.locals.loggedInUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  next()
});


// initialize Gridfs 
let gfs;
// Initiate Gridfs stream
conn.once('open', function(){
 gfs = gridfsStream(conn.db, mongoose.mongo);
 gfs.collection('upload')
})

// STORAGE ENGINE 
// Create storage engine
const storage = new gridfsStorage({
url: 'mongodb://localhost:27017/imgs-fileDB',
file: (req, file) => {
 return new Promise((resolve) => {
   
   crypto.randomBytes(16, (err, buf) => {
     if (err) {
       return reject(err);
     }

    //  identify the uploader  
     uploaderIdentity = '';
     const loggedUser = req.user;
     
     if(!loggedUser){
       uploaderIdentity = 'guest';
     }else{
       uploaderIdentity = req.user.username
     }

    //  image name
     const filename = buf.toString('hex') + path.extname(file.originalname);
     const fileInfo = {
       filename: filename,
       bucketName: 'upload',
       metadata: {
        uploaderId: uploaderIdentity,
        
        }
      
     };
      resolve(fileInfo);
    });
 });
}
});
const upload = multer({storage})

// ROUTES
// LANDING.................................................................>
app.get('/', (req, res) => {
  
   
  gfs.files.find().toArray((err, files)  => {
    // check all files in the DB
    if (!files || files.length === 0) {
      res.render('landing', {files: false});
    }else{
      files.map(file => {
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/jpg/png'){
          file.isImage = true
        }else{
          file.isImage = false
        }
      });
      res.render('landing', {files: files});
    }
    // check if content type is image 
    if(files.contentType === 'image/jpeg' || files.contentType === 'img/png/jpg') {
      // read file output to browser 
      const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else{
        
      }
    })
    
  });
//  ..........................................................................................>

// UPLOAD IMAGE..............................................................>
// file upload form
app.get('/uploads', (req, res) => {
    res.render('upload');
});


    
  // upload file to DB
app.post('/uploads', upload.single('file'), (req, res) => {
    res.redirect('/')
});
// .............................................................................................>

// GET FILES...........................................................>
// fetch all files from DB
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files)  => {
    // check all files in the DB
    if (!files || files.length === 0) {
        return res.status(404).json({
        err: 'No files exist'
      });
    }
    return res.json(files);
  });
});

// fetch a single file from DB 
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    // check if file exists in the DB
    if (!file || file.length === 0) {
      return res.status(404).json({
      err: 'No files exist'
    });
  }
  return res.json(file);
  })
});
// ..............................................................................>

// GET IMAGE..................................................................>
// fetch a single file from DB 
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    // check if file exists in the DB
    if (!file || file.length === 0) {
      return res.status(404).json({
      err: 'No files exist'
    });
  }
  // check if mimetype is image 
  if(file.contentType === 'image/jpeg' || file.contentType === 'img/png/jpg') {
    // read file output to browser 
    const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else{
      res.status(404).json({
      err: 'File is not an image'
      });
    }
  })
});
// ....................................................................................>
 
// DOWNLOAD....................................................................>
// download single image file 
app.get('/download/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
      // set content type to match file type 
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
    // read data stream from gridfs
    let readstream = gfs.createReadStream({
      filename: req.params.filename
    });
    //error handling, e.g. file does not exist
    readstream.on('error', function (err) {
      console.log('An error occurred!', err);
      throw err;
    });
    readstream.pipe(res);
  });
});
// ..................................................................................>

// LOGIN.................................................> 
// login form 
app.get('/login', (req, res) => {
  res.render('login');
});

// handle login process
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}), function(req, res){
 
});
// .............................................................>

// LOGOUT.............................................>
app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/');
});
// ................................................................>

// REGISTER...................................................> 
// show login form 
app.get('/register', (req, res) => {
  res.render('register');
})
// ...................................................................>




// handle user registration 
app.post('/register', (req, res) => {
 
  let firstName = req.body.firstName,
       lastName = req.body.lastName,
       username = req.body.username,
       password = req.body.password,
          email = req.body.email;
  
  // create new user 
  const newUser = new user({
    firstName: firstName,
    lastName: lastName,
    username: username,
    password: password,
    email: email
  })
  
  if(req.body.adminCode === "isAdmin123") {
    newUser.isAdmin = true
  }
  // register new user 
  user.register(newUser, req.body.password, (err, user) => {
    if(err){
      console.log(err.message);
      return res.redirect('/register');
    }
    
    // log in new user 
    passport.authenticate('local')(req, res, function() {
      console.log('user registered');
      res.redirect('/');
    });
  });
});
// ...............................................................................>

// IMAGE DETAILS........................................................................>
// show more information about images
app.get('/image/:id/more', (req, res) => {
  gfs.files.find().toArray((err, files)  => {
    // check all files in the DB
    if (!files || files.length === 0) {
      res.render('image_more.ejs', {files: false});
    }else{
      files.map(file => {
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/jpg/png'){
          file.isImage = true
        }else{
          file.isImage = false
        }
      });
      res.render('image_more.ejs', {files: files, image: req.params.id});
    }
    // check if mimetype is image 
    if(files.contentType === 'image/jpeg' || files.contentType === 'img/png/jpg') {
      // read file output to browser 
      const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else{
        
      }
    })  
 
});
// ..........................................................................................>

// LIKE IMAGE............................................................>
app.post('/like/:image', (req, res) => {
  
  if(!"<%=loggedInUser%>" || req.user == null){
   
    return res.redirect('back')
  }else{
    user.findOne({username: req.user.username}, (err, foundUser) => {
      if(err){
        console.log('no user')
      }else{
        let likedImage = {
          image: req.image,
          username: foundUser.username
        }
        
        
        // user.liked.push(likedImage)
        // user.save(err, saved => {
        //   if(err){
        //     console.log('unable to save to DB')
        //   }else{
        //     console.log('image liked! data saved to DB', saved)
        //   }
        // })
      }
    })
  }
});
// ................................................................................>


// CONTACT............................................>
// show contact form
app.get("/contact", (req, res) => {
      res.render("contact");
});

// post data to DB
app.post("/post-message", (req, res) => {

  user.find({username: "Administrator"}, (err, admin) => {
    if(err || !admin) {
      req.flash("error", "cannot send message")
    }
    else {
    // save message to DB
    const name =  req.body.name,
         email =  req.body.email,
       message =  req.body.message
    

     Inbox.create({
      name: name,
      email: email,
      message: message
    })
    
    console.log("message saved!")
    
    }
  })


  
});
// ...........................................................>

// // INBOX............................................................>
app.get('/messages', (req, res) => {
  // find all messages and pass to template
  Inbox.find((err, message) => {
      if(err || !message) {
        req.flash("error", "unable to fetch messages")
        res.render("contact")
      }else {
        res.render("inbox", {message: message})
        console.log(message)
      }
      
    })
  

})
// // ........................................................................>

const PORT = 3000 
app.listen(PORT, () => {
    console.log('server started...')
})