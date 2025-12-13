const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidPassword = (password) => password && password.length >= 6;
const isValidUsername = (username) => username && username.trim() !== '';
module.exports = {
  isValidEmail,
  isValidPassword,
  isValidUsername
};
