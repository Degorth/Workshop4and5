import {readDocument, writeDocument, addDocument} from './database.js';

/**
 * Emulates how a REST call is *asynchronous* -- it calls your function back
 * some time in the future with data.
 */
function emulateServerReturn(data, cb) {
  setTimeout(() => {
    cb(data);
  }, 4);
}

function getFeedItemSync(feedItemId) {
  var feedItem = readDocument('feedItems', feedItemId);
  feedItem.likeCounter = feedItem.likeCounter.map((id) => readDocument('users', id));
  feedItem.contents.author = readDocument('users', feedItem.contents.author);
  feedItem.comments.forEach((comment) => {
    comment.author = readDocument('users', comment.author);
  });
  return feedItem;
}

export function getFeedData(user, cb) {
  var userData = readDocument('users', user);
  var feedData = readDocument('feeds', userData.feed);
  feedData.contents = feedData.contents.map(getFeedItemSync);
  emulateServerReturn(feedData, cb);
}

export function postStatusUpdate(user, location, contents, cb) {
  // Unix time
  var time = new Date().getTime();
  // database will add id
  var newStatusUpdate = {
    "likeCounter": [],
    "type": "statusUpdate",
    "contents": {
      "author": user,
      "postDate": time,
      "location": location,
      "contents": contents
    },
    //comments on the post
    "comments": []
  };

  //Add the update to the database, returns update with ID
  newStatusUpdate = addDocument('feedItems', newStatusUpdate);

  //Add the update reference to the front of the feed
  var userData = readDocument('users', user);
  var feedData = readDocument('feeds', userData.feed);
  feedData.contents.unshift(newStatusUpdate._id);

  //Update feeds
  writeDocument('feeds', feedData);

  //Return the object
  emulateServerReturn(newStatusUpdate, cb);
}

export function postComment(feedItemId, author, contents, cb) {
  //read the document, update embedded object, update doc in database
  var feedItem = readDocument('feedItems', feedItemId);
  feedItem.comments.push({
    "author": author,
    "contents": contents,
    "postDate": new Date().getTime()
  });
  writeDocument('feedItem', feedItem);
  //return resolved feed item for render
  emulateServerReturn(getFeedItemSync(feedItemId), cb);
}

export function likeFeedItem(feedItemId, userId, cb) {
  var feedItem = readDocument('feedItems', feedItemId);
  feedItem.likeCounter.push(userId);
  writeDocument('feedItems', feedItem);
  emulateServerReturn(feedItem.likeCounter.map((userId) =>
    readDocument('users', userId)), cb);
}

export function unlikeFeedItem(feedItemId, userId, cb) {
  var feedItem = readDocument('feedItems', feedItemId);
  if (userId !== -1) {
    feedItem.likeCounter.splice(userId, 1);
    writeDocument('feedItems', feedItem);
  }
  emulateServerReturn(feedItem.likeCounter.map((userId) =>
    readDocument('users', userId)), cb);
}
