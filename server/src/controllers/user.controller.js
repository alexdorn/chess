import express from 'express';
import bcrypt from 'bcrypt';

import { addUser, findUser, getMatchHistory, io } from '../model.js';
import { addUserDB, deleteUsersOnlineDB, getUsersDB, getUsersOnlineDB } from '../firestore.js';

export const userRouter = express.Router();
const SALT_ROUNDS = 10;

userRouter.post('/signUp', (req, res) => {
  const success = addUser(req.body.username);
  if (!success) {
    res.sendStatus(404);
    return;
  }
  bcrypt.hash(req.body.username, SALT_ROUNDS, (_, hash) => {
    addUserDB(req.body.username, hash);
    req.session.userID = req.body.username;
    res.status(200).json({ success });
  });
});

userRouter.put('/signOut', (req, res) => {
  const userSigningOut = findUser(req.session.userID);
  if (userSigningOut) {
    userSigningOut.socket.conn.close();
    deleteUsersOnlineDB(userSigningOut.name);
    io.emit('userOnlineUpdate', userSigningOut.name, false);
  }
  req.session.destroy();
  if (!userSigningOut) res.sendStatus(404);
  res.status(200).end();
});

userRouter.get('/matchHistory/:userId', (req, res) => {
  const userId = req.params.userId.trim();
  res.status(200).json({ matchHistory: getMatchHistory(userId) });
});

userRouter.get('/userOnlineInitialize', async (req, res) => {
  const onlineUsers = await getUsersOnlineDB();
  res.status(200).json({ onlineUsers });
});

userRouter.get('/leaderboard', async (req, res) => {
  const users = await getUsersDB();
  const userToExperienceScore = users.map(user => [user.username, user.experience]);
  const sortedLeaderboard = userToExperienceScore.sort(([, a], [, b]) => b - a);
  res.status(200).json({ sortedLeaderboard });
});
