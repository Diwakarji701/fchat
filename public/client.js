const socket = io();

const textarea = document.getElementById('textarea');
const messageArea = document.getElementById('messageArea');
const sendBtn = document.getElementById('sendBtn');
const startCallBtn = document.getElementById('startCall');
const shareScreenBtn = document.getElementById('shareScreen');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;
let peerConnection;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// ========== Chat ========== //
sendBtn.addEventListener('click', () => {
  const message = textarea.value.trim();
  if (message) {
    appendMessage(`You: ${message}`);
    socket.emit('message', message);
    textarea.value = '';
  }
});

socket.on('message', (message) => {
  appendMessage(`Peer: ${message}`);
});

function appendMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.textContent = message;
  messageArea.appendChild(messageDiv);
  messageArea.scrollTop = messageArea.scrollHeight;
}

// ========== Media Access Helper ========== //
async function getLocalStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = stream;
    return stream;
  } catch (error) {
    console.error('Error accessing media devices.', error);
    alert('Unable to access your camera/mic. Please check permissions.');
  }
}

// ========== Call Setup ========== //
startCallBtn.addEventListener('click', async () => {
  localStream = await getLocalStream();
  if (!localStream) return;

  createPeerConnection();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
});

socket.on('offer', async (offer) => {
  localStream = await getLocalStream();
  if (!localStream) return;

  createPeerConnection();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate) => {
  if (!peerConnection) {
    console.warn('ICE candidate received but peerConnection not yet created.');
    return;
  }
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (e) {
    console.error('Error adding ICE candidate', e);
  }
});

// ========== Peer Connection ========== //
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(event.track);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };
}

// ========== Screen Sharing ========== //
shareScreenBtn.addEventListener('click', async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');

    if (sender) {
      sender.replaceTrack(screenTrack);

      screenTrack.onended = () => {
        sender.replaceTrack(localStream.getVideoTracks()[0]);
      };
    }
  } catch (err) {
    console.error('Error sharing screen:', err);
  }
});
