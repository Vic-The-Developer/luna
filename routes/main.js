var express = require("express");
var router = express.Router();

var fs = require('fs');
var multer = require('multer');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var mongoose = require('mongoose');
var config = require('../config/database');
var passport = require('passport');
const moment = require('moment');
const randtoken = require("rand-token");
const { 
    v1: uuidv1,
    v4: uuidv4,
} = require('uuid')
const bcrypt = require('bcrypt');
const slugify = require('slugify');

const { check, body, validationResult } = require("express-validator");
const path = require("path");


//import database models
const Products = require('../models/it');
const Admin = require('../models/admin');
const { render } = require("ejs");


//home page

router.get('/', async (req, res) => {
    try {
      const rawCategories = await Products.distinct('prodCat');
      
      // Map each category to its slug
      const categories = rawCategories.map(cat => ({
        name: cat,
        slug: slugify(cat, { lower: true })
      }));

      //get products
      const products = await Products.find({});
  
      res.render('main/index', {
        categories,
        products,
        slugify
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});


//get products of a specific category
router.get('/category/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const allCats = await Products.distinct('prodCat');
  
      // Find matching category by comparing slugs
      const matchedCat = allCats.find(cat => slugify(cat, { lower: true }) === slug);
      if (!matchedCat) return res.status(404).send('Category not found');
  
      const products = await Products.find({ prodCat: matchedCat });
      res.render('main/shop', { products, category: matchedCat });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});




// Shop Page with Pagination
router.get('/shop', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const perPage = 9;
  
      const total = await Products.countDocuments();
      const products = await Products.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);

    const rawCategories = await Products.distinct('prodCat');
      
      // Map each category to its slug
      const categories = rawCategories.map(cat => ({
        name: cat,
        slug: slugify(cat, { lower: true })
      }));
  
      res.render('main/shop', {
        products,
        currentPage: page,
        totalPages: Math.ceil(total / perPage),
        slugify,
        categories
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});
  

//cart page
router.get('/cart', async (req, res)=>{
    try{
        const rawCategories = await Products.distinct('prodCat');
      
        // Map each category to its slug
        const categories = rawCategories.map(cat => ({
            name: cat,
            slug: slugify(cat, { lower: true })
        }));

        //get products
        const products = await Products.find({});

        res.render('main/cart', {
            products,
            categories
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
    
})

//contact page
router.get('/contact', async (req, res)=>{
    try {
        const rawCategories = await Products.distinct('prodCat');
      
        // Map each category to its slug
        const categories = rawCategories.map(cat => ({
            name: cat,
            slug: slugify(cat, { lower: true })
        }));

        res.render('main/contact', {
            categories
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
})

// Admin signup page
router.get('/signup', async (req, res) => {
    
    //include messages
    const infoMessage = req.flash('info')[0];

    //show login page
    res.render('main/signup', {
        infoMessage
    })
   
});

//Handle signup data
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Check if email exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
          req.flash('info', 'Admin with this email already exists.');
          return res.redirect('/signup');
      }

      // Hash password and save admin
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({ email, password: hashedPassword});
      await newAdmin.save();

      req.flash('info', 'New admin created successfully.');
      res.redirect('/login');
  } catch (err) {
      console.error(err);
      req.flash('info', 'An error occurred while creating admin.');
      res.redirect('/signup');
  }
});


// Admin login page
router.get('/login', async (req, res) => {
    
    //include messages
    const infoMessage = req.flash('info')[0];

    //show login page
    res.render('main/login', {
        infoMessage
    })
   
});

//handle login data
router.post('/login', [
  // Validate email and password
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
], (req, res, next) => {

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const infoMessage = errors.array().map(error => error.msg);
    req.flash('info', infoMessage);
    return res.redirect('/login');
  }

  // If validation passes, proceed to authentication (if details are correct Login)
  passport.authenticate('local', {
    successRedirect: '/admin/auth/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});


//send reset code to the email
router.post("/reset", (req, res) => {
  const emailSender = "webmailservices001@gmail.com"; // Your email
  const emailPass = "jiavpmqyfoauqbvw"; // router-specific password or email password
  var { email } = req.body;

  // Validate email
  if (!email) {
    req.flash("info", "Please provide a valid email address.");
    return res.redirect("/login");
  }

  // Function to send the email
  async function sendEmail(recipientEmail, resetCode) {
    try {
      // Nodemailer transporter
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // TLS enabled
        auth: {
          user: emailSender,
          pass: emailPass,
        },
      });

      // Email options
      let mailOptions = {
        from: emailSender,
        to: recipientEmail,
        subject: "Admin Password Reset Request - Shoe Store",
        html: `
          <p>You requested a password reset.</p>
          <p>Here is the reset code=${resetCode}</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      };

      let info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  // Find user/admin with the provided email
  Admin.findOne({ email: email }).exec(async (err, user) => {
    if (err) {
      console.error(err);
      req.flash("info", "An error occurred. Please try again.");
      return res.redirect("/login");
    }

    if (!user) {
      req.flash("info", "The provided email is not registered with us.");
      return res.redirect("/login");
    }

    // Generate a random reset code
    const resetCode = randtoken.generate(4); // A 4-character reset code

    // Send email with the reset code and reset link
    const emailSent = await sendEmail(email, resetCode);

    if (emailSent) {
      // Save reset code to the database for the user
      user.resetCode = resetCode;
      user.save((err) => {
        if (err) {
          console.error("Failed to save reset code:", err);
          req.flash("info", "Failed to process the reset request.");
          return res.redirect("/login");
        }

        req.flash("info", "Check Email for Reset Code and enter it here.");

        //include messages
        const infoMessage = req.flash('info')[0];

        return res.render('resetCode', {
            email,
            infoMessage
        })
      });
    } else {
      req.flash("info", "Failed to send the reset email. Try again later.");
      return res.redirect("/login");
    }
  });
});


// Check Reset Code
router.post('/reset-code', async (req, res) => {
  try {
      const { email, resetCode } = req.body;

      // Find the admin user by email
      const admin = await Admin.findOne({ email });

      if (!admin) {
        //include messages
        const infoMessage  = "Email not found. Please try again.";
          return res.status(404).render('resetCode', {
              infoMessage,
              email
          });
      }

      // Check if the reset code matches
      if (admin.resetCode !== resetCode) {
        //include messages
        const infoMessage  = "Invalid reset code. Please try again.";
          return res.status(400).render('resetCode', {
              infoMessage,
              email
          });
      }

      // If reset code is valid, render newPassword EJS page and pass the email
      //include messages
      const infoMessage = req.flash('info')[0];
      res.render('newPassword', { 
        email,
        infoMessage
      });

  } catch (err) {
      console.error(err);
      //include messages
      const infoMessage = "An error occurred while processing your request. Please try again.";
      res.status(500).render('resetCode', {
          infoMessage,
          email
      });
  }
});



//new password page
router.get('/new-password', (req, res)=>{

    //include messages
    const infoMessage = req.flash('info')[0];

    //show new password page
    res.render('main/newPassword', {
        infoMessage
    });
})

//process new password
router.post('/new-password', (req, res)=>{

    var email = req.body.email;
    var password = req.body.password;


    //if no password entered
    if (!password) {
    req.flash("info", "Invalid request. Missing reset code or password.");
    return res.redirect("/login"); // Redirect if input is invalid
    }

    // Step 1: Find the user by reset token
    Admin.findOne({ email: email }).exec((err, user) => {
    if (err) {
        req.flash("info", "An error occurred finding email. Please try again.");
        return res.redirect("/login");
    }


    // Step 2: Hash the new password
    const saltRounds = 10;
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) {
        console.error("Error generating salt:", err);
        req.flash("info", "An error occurred while processing your request.");
        return res.redirect("login");
        }

        bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            req.flash("info", "Failed to update password. Try again.");
            return res.redirect("/login");
        }

        // Step 3: Update password and remove reset token
        Admin.findOneAndUpdate(
            { email: user.email },
            { $set: { password: hash }, $unset: { resetCode: "" } },
            { new: true }
        ).exec((err, updatedUser) => {
            if (err) {
            console.error("Error updating password:", err);
            req.flash("info", "Failed to update your password.");
            return res.redirect("/login");
            }

            console.log("Password updated successfully for:", updatedUser.email);
            req.flash("info", "Your password has been reset successfully. Please Login!");
            res.redirect("/login"); // Redirect to login page
        });
        });
    });
    });
    
})

//Logout route
router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }

    req.flash('info', 'You are logged out!');
    res.redirect('/login');
  });
});

// Middleware to check if user is authenticated and not revoked
function isAuthenticated(req, res, next) {
  if (req.user) {
      if (req.user.role === "Revoked") {
        req.flash('info', 'Denied!! You have been revoked!')
          return res.redirect('/login');
      }
      return next();
  } else {
    req.flash('info', 'Please login!')
      res.redirect('/login');
  }
}

//Admin Dashboard (if logged in)
router.get('/admin/auth/dashboard', isAuthenticated, async (req, res)=>{

    //include messages
    const infoMessage = req.flash('info')[0];

    //fetch shoes data
    const prods = await Products.find();

    //display page
    res.render('main/dashboard', {
        prods,
        infoMessage
    });
})



// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'pics')); // Save in assets/uploads folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and GIF files are allowed.'));
    }
  }
});

// Allow up to 6 images in the form
router.post('/admin/add-product', isAuthenticated, upload.array('images', 6), async (req, res) => {
  try {
    const { prodName, prodDesc, prodCat, price, availability } = req.body;

    // Validate that at least 1 image and at most 6 are uploaded
    if (!req.files || req.files.length === 0 || req.files.length > 6) {
      return res.status(400).send('You must upload between 1 and 6 images.');
    }

    // Save image paths
    const imagePaths = req.files.map(file => `/pics/${file.filename}`);

    // Create product
    const newProduct = new Products({
      prodName,
      prodDesc,
      prodCat,
      price,
      availability: availability === 'true',
      images: imagePaths,
    });

    await newProduct.save();
    req.flash('info', 'Product added successfully');
    res.redirect('/admin/auth/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while adding the product.');
  }
});


// Edit product route
router.post('/admin/edit-product/:id', isAuthenticated, upload.array('images', 5), async (req, res) => {
    try {
      const productId = req.params.id;
  
      // Fetch the product to be updated
      const product = await Products.findById(productId); // Use your actual model name
      if (!product) {
        return res.status(404).send('Product not found.');
      }
  
      // Extract updated details from request body
      const { prodName, prodDesc, prodCat, price, availability } = req.body;
  
      // Update product fields
      product.prodName = prodName;
      product.prodDesc = prodDesc;
      product.prodCat = prodCat;
      product.price = price;
      product.availability = availability === 'true';
  
      // Handle uploaded images (optional)
      if (req.files && req.files.length > 0) {
        product.images = req.files.map(file => `/pics/${file.filename}`);
      }
  
      // Save updated product to the database
      await product.save();
  
      // Redirect with success message
      req.flash('info', 'Product edited successfully');
      res.redirect('/admin/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while editing the product.');
    }
});
  


// Delete Shoe
router.delete('/admin/delete-product/:id', isAuthenticated, async (req, res) => {
    try {
      const productId = req.params.id;
  
      // Find the product by ID
      const product = await Products.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      // Delete associated images from filesystem
        product.images.forEach(imagePath => {
            const filename = path.basename(imagePath); // e.g. 1234-randomname.jpg
            const fullPath = path.join(__dirname, 'pics', filename); // routes/pics/filename.jpg
    
            if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            }
        });
  
      // Delete the product from the database
      await Products.findByIdAndDelete(productId);
  
      res.json({ success: true, message: "Product successfully deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "An error occurred while deleting product" });
    }
  });



  
//product details page
router.get('/:cat/:desc/:id', async (req, res) => {
  try {
    const { id, cat } = req.params;

    // Validate if `id` is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid product ID');
    }

    const product = await Products.findById(id);
    if (!product) return res.status(404).send('Product not found');

    const expectedSlug = slugify(product.prodCat, { lower: true });
    if (expectedSlug !== cat) {
      return res.redirect(`/${expectedSlug}/${product._id}`);
    }

    res.render('main/product-details', { product });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;