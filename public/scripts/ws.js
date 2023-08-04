const socket = io();
let socketId = null;

socket.on('connect', function() {
 console.log('Connected', socket.id);
 socketId = socket.id;
});
socket.on('progress', function(data) {
    console.log('progress', data);
    statusEl.querySelector('.step').textContent = `Step: ${data.step}`;
    statusEl.querySelector('.percentage').textContent = `${data.progress}%`;
    statusEl.querySelector('.progress')
    .style.setProperty('--progress', data.progress + '%');
});
socket.on('exception', function(data) {
  console.log('event', data);
});
socket.on('disconnect', function() {
  console.log('Disconnected');
});