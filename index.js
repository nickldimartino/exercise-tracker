const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// Add Mongoose and Schema from Mongoose
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Connect the MongoDB specified in the secrets section
// This would normally be in the .env folder
mongoose.connect(process.env.MONGO_URI);

// Create the User Schema and model it
const UserSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

// Create the Exercise Schema and model it
const ExerciseSchema = new Schema({
  userId: { 
    type: String, 
    required: true 
  },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors())
app.use(express.static('public'))

// Allow access to the body of a request
// Extended 'true' means the body will have types other than strings
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST route to create a new user
// Async is used to give the process time to save()
app.post('/api/users', async (req, rsp) => {
  // create new user object with User schema and save the username
  // req.body can be used due to urlencoded being added above and it gets form data
  const userObj = new User({
    username: req.body.username
  });

  // try to save the new user object, or throw an error
  // await is used to make the program wait until it saves. Adding this requires the callback to use 'async'
  try {
    const user = await userObj.save();
    rsp.json(user);
  } catch (err) {
    console.log(err);
  }
});

// GET route to return all users
// Async is used to give the process time to find() and select()
app.get('/api/users', async (req, rsp) => {
  // add all the users' usernames and id to the users variable
  const users = await User.find({}).select("_id username");

  // if there are no users, respond with 'no users'
  // else respond with all the users
  if (!users) {
    rsp.send("no users");
  } else {
    rsp.json(users);
  }
});

// POST route to change the exercise data
// Async is used to give the process time to findById() and save()
app.post('/api/users/:_id/exercises', async (req, rsp) => {
  // Save the id from the request URL parameters
  // req.params retrieves the route parameter :_id
  const id = req.params._id;

  // req.body retrieves the form data for the 3 variables
  const { description, duration, date } = req.body;

  // try to change the exercise data or throw an error
  try {
    // get the user by id
    const user = await User.findById(id);

    // if there is no user, respond with "no user"
    // else change the exercise data
    if (!user) {
      rsp.send("could not find user");
    } else {
      // create a new object from the exercise schema given request info
      // the date will be the given request date or set to the current data
      const exerciseObj = new Exercise({
        userId: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });

      // save the new exercise data
      const exercise = await exerciseObj.save();

      // respond with the new exercise data
      rsp.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      });
    }
  } catch (err) {
    rsp.send("there was an error");
  }
});

// GET route to retrieve the exercise logs
// Async is used to give the process time to find() and limit()
app.get('/api/users/:_id/logs', async (req, rsp) => {
  // req.query saves the request URL queries "from, to, and limit"
  const { from, to, limit} = req.query;

  // req.params saves the request URL parameter _id
  const id = req.params._id;

  // save the user using it's id
  const user = await User.findById(id);

  // if the user does not exist, respond with "no user" and exit the function
  if (!user) {
    rsp.send("could not find user");
    return;
  }

  // create a new date object
  let dateObj = {};

  // if 'from' exists in the request URL, create a new date using 'from'
  if (from) {
    dateObj["$gte"] = new Date(from);
  }

  // if 'to' exists in the request URL, create a new date using 'to'
  if (to) {
    dateObj["$lte"] = new Date(to);  
  }

  // create a filter obj using the user id
  let filter = {
    userId: id
  }

  // if 'from' or 'to' exists in the request URL, set the users date to the created dateObj 
  if (from || to) {
    filter.date = dateObj;  
  }

  // search the Exercise schema for the user id and limit the result by the received limit (or 500 for null)
  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  // create the log array by mapping through the form data and getting the respective info
  const log = exercises.map(i => ({
    description: i.description,
    duration: i.duration,
    date: i.date.toDateString()
  }));

  // respond with the username, id, number of exercises (count), and log of data
  rsp.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
});

// Given
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
