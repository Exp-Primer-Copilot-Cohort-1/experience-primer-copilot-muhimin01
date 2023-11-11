// Create web server

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

const app = express();
// Use bodyParser to parse json
app.use(bodyParser.json());
// Use cors to make sure we can receive requests from other origins
app.use(cors());

// Store all comments in memory
const commentsByPostId = {};

// Create a route for handling post requests
app.post('/posts/:id/comments', async (req, res) => {
    // Generate a random id for the comment
    const commentId = randomBytes(4).toString('hex');
    // Get the content of the comment from the request body
    const { content } = req.body;
    // Get the id of the post the comment belongs to
    const postId = req.params.id;
    // Check if there is already a comment array for the post
    const comments = commentsByPostId[postId] || [];
    // Add the new comment to the array
    comments.push({ id: commentId, content, status: 'pending' });
    // Update the comments array with the new comment
    commentsByPostId[postId] = comments;
    // Send a comment created event to the event bus
    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: { id: commentId, content, postId, status: 'pending' },
    });
    // Send a response to the client
    res.status(201).send(comments);
});

// Create a route for handling get requests
app.get('/posts/:id/comments', (req, res) => {
    // Get the comments array from memory
    const comments = commentsByPostId[req.params.id] || [];
    // Send the comments array to the client
    res.send(comments);
});

// Create a route for handling post requests
app.post('/events', async (req, res) => {
    // Get the event from the request body
    const { type, data } = req.body;
    // Check if the event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get the comment id and status from the event data
        const { id, postId, status, content } = data;
        // Get the comments array from memory
        const comments = commentsByPostId[postId];
        // Find the comment in the array
        const comment = comments.find((comment) => {
            return comment.id === id;
        });
        // Update the comment status
        comment.status = status;
        // Send a comment updated event to the event bus
        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: { id, postId, status, content },
        });
    }
    // Send a response to the client
    res.send({});
});