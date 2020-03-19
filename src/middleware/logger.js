module.exports = function logger (req, res, next) {
  console.log('Request recieved: ' + req.url);
}